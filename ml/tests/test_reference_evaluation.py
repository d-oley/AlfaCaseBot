import importlib
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx

with patch.dict(os.environ, {"ML_DISABLE_APP_FILE_LOGGING": "1"}):
    with patch("joblib.load", return_value={"vectorizer": None, "model": None, "threshold": 0.5}):
        app = importlib.import_module("api.llm_only_app")
llm = importlib.import_module("api.llm_service")


class ReferenceFlowTests(unittest.IsolatedAsyncioTestCase):
    async def run_flow(self, reference_status=200, reference_data=None):
        if reference_data is None:
            reference_data = {"caseId": 7, "perfectSolution": "private reference"}
        backend = AsyncMock(side_effect=[
            (200, {"success": True}, None),
            (200, {"active": True, "completed": False}, None),
            (200, {"promptContextEn": "case context"}, None),
            (reference_status, reference_data, None),
            (200, {"active": True, "completed": False}, None),
            (200, {"success": True}, None),
        ])
        with patch.multiple(app, ML_SERVICE_TOKEN="test-secret", OPENROUTER_API_KEY="test-key"):
            with patch.object(app, "backend_request", backend), patch.object(
                app, "analyze_text", return_value={"status": "success", "is_toxic": False}
            ), patch.object(app, "evaluate_solution", return_value={
                "status": "evaluated", "final_score": 80, "message": "review", "stages": {}
            }) as evaluate:
                response = await app.evaluate(
                    app.EvaluateRequest(text="submission", case_id=7),
                    SimpleNamespace(headers={"Cookie": "token=user"},
                                    app=SimpleNamespace(state=SimpleNamespace(evaluator=evaluate))),
                )
        return response, backend, evaluate

    async def test_reference_reaches_llm_and_is_not_returned_or_saved(self):
        response, backend, evaluate = await self.run_flow()
        self.assertEqual(response.status_code, 200)
        evaluate.assert_called_once_with("submission", "case context", "private reference")
        call = backend.call_args_list[3]
        self.assertEqual(call.args[0], "/api/text/v1/cases/7/perfectSolution")
        self.assertEqual(call.kwargs, {"method": "GET", "cookie": "token=user"})
        self.assertNotIn("private reference", response.body.decode())
        self.assertNotIn("private reference", json.dumps(backend.call_args_list[5].kwargs))

    async def test_failed_reference_never_evaluates_or_saves(self):
        for status, data, expected in [(403, {}, 502), (404, {}, 502), (200, {}, 422),
                                       (200, {"perfectSolution": "  "}, 422),
                                       (200, {"perfectSolution": 123}, 422)]:
            with self.subTest(status=status, data=data):
                response, backend, evaluate = await self.run_flow(status, data)
                self.assertEqual(response.status_code, expected)
                evaluate.assert_not_called()
                self.assertEqual(backend.await_count, 4)

    async def test_inactive_or_completed_case_never_evaluates_or_saves(self):
        for state, code in [({"active": False, "completed": False}, "CASE_NOT_STARTED"),
                            ({"active": False, "completed": True}, "CASE_COMPLETED")]:
            with self.subTest(state=state):
                backend = AsyncMock(side_effect=[
                    (200, {"success": True}, None),
                    (200, state, None),
                ])
                evaluate = AsyncMock()
                with patch.multiple(app, ML_SERVICE_TOKEN="test-secret", OPENROUTER_API_KEY="test-key"), \
                     patch.object(app, "backend_request", backend), \
                     patch.object(app, "evaluate_solution", evaluate):
                    response = await app.evaluate(
                        app.EvaluateRequest(text="submission", case_id=7),
                        SimpleNamespace(headers={"Cookie": "token=user"},
                                        app=SimpleNamespace(state=SimpleNamespace(evaluator=evaluate))),
                    )
                self.assertEqual(response.status_code, 409)
                self.assertEqual(json.loads(response.body)["code"], code)
                evaluate.assert_not_awaited()
                self.assertEqual(backend.await_count, 2)

    async def test_reference_request_has_service_token_and_cookie(self):
        def handler(request):
            self.assertEqual(request.headers["X-ML-Service-Token"], "test-secret")
            self.assertEqual(request.headers["Cookie"], "token=user")
            return httpx.Response(200, json={"perfectSolution": "reference"})

        client = httpx.AsyncClient
        with patch.object(app, "ML_SERVICE_TOKEN", "test-secret"), patch.object(
            httpx, "AsyncClient", side_effect=lambda **kwargs: client(
                **kwargs, transport=httpx.MockTransport(handler)
            )
        ):
            status, data, _ = await app.backend_request(
                "/api/text/v1/cases/7/perfectSolution", method="GET", cookie="token=user"
            )
        self.assertEqual(status, 200)
        self.assertEqual(data["perfectSolution"], "reference")


class OriginalityTests(unittest.TestCase):
    def test_reference_only_goes_to_originality_and_feedback_uses_scores(self):
        calls = []

        def fake_llm(messages, **kwargs):
            calls.append((kwargs["operation_name"], json.dumps(messages)))
            return json.dumps({"score": 80, "feedback_ru": "review", "message_ru": "summary"})

        with patch.object(llm, "call_llm", side_effect=fake_llm), patch.object(
            llm, "evaluate_fact_checking", return_value=(80, "review")
        ):
            result = llm.evaluate_solution("submission", "context", "private reference")
        self.assertEqual(result["final_score"], 80)
        self.assertEqual(result["message"], "summary")
        self.assertEqual([name for name, prompt in calls if "private reference" in prompt],
                         ["originality_evaluation"])
        feedback = next(prompt for name, prompt in calls if name == "feedback_generation")
        self.assertNotIn("review", feedback)

    def test_failed_originality_does_not_return_default_score(self):
        for response in [None, "invalid", '{"score": 101}', '{}']:
            with self.subTest(response=response), patch.object(llm, "call_llm", return_value=response):
                with self.assertRaises(RuntimeError):
                    llm.evaluate_originality("submission", "context", "reference")

    def test_feedback_failure_has_neutral_fallback(self):
        with patch.object(llm, "call_llm", return_value=None):
            self.assertIn("80", llm.generate_feedback_message(80, {"originality": {"score": 80}}))


if __name__ == "__main__":
    unittest.main()
