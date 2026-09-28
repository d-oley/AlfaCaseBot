import unittest
import json
from functools import partial
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

# Reuse the import with model loading disabled for HTTP unit tests.
from test_reference_evaluation import app as llm_app
from api import hybrid_app, llm_service


class HybridScoringTests(unittest.TestCase):
    def test_sources_weights_and_final_feedback(self):
        predictor = Mock()
        predictor.predict.return_value = {"effectiveness": 60, "logic": 40, "completeness": 20}
        with patch.object(llm_service, "evaluate_fact_checking", return_value=(100, "facts")) as fact, \
             patch.object(llm_service, "evaluate_originality", return_value=(80, "originality")) as orig, \
             patch.object(llm_service, "generate_feedback_message", return_value="feedback") as feedback, \
             patch.object(llm_service, "evaluate_effectiveness") as unused:
            result = hybrid_app.evaluate_hybrid("answer", "LLM context", "reference",
                                                case_text="full case", predictor=predictor)
        predictor.predict.assert_called_once_with("full case", "answer")
        fact.assert_called_once_with("answer", "LLM context")
        orig.assert_called_once_with("answer", "LLM context", "reference")
        unused.assert_not_called()
        self.assertEqual(result["final_score"], 64)
        feedback.assert_called_once_with(64, result["stages"])
        self.assertEqual(result["message"], "feedback")

    def test_model_failure_does_not_fallback_to_llm(self):
        predictor = Mock()
        predictor.predict.side_effect = RuntimeError("model failed")
        with patch.object(llm_service, "evaluate_fact_checking") as fact:
            with self.assertRaises(RuntimeError):
                hybrid_app.evaluate_hybrid("answer", "context", "reference",
                                           case_text="full case", predictor=predictor)
        fact.assert_not_called()

    def test_apps_have_independent_evaluators(self):
        self.assertIsNot(llm_app.app, hybrid_app.app)
        self.assertIs(llm_app.app.state.evaluator, llm_service.evaluate_solution)
        self.assertIs(hybrid_app.app.state.evaluator, hybrid_app.not_started)


class HybridCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_http_flow_saves_hybrid_score(self):
        predictor = Mock()
        predictor.predict.return_value = {"effectiveness": 60, "logic": 40, "completeness": 20}
        loader = AsyncMock(return_value="full case")
        application = llm_app.create_app(
            partial(hybrid_app.evaluate_hybrid, predictor=predictor), case_text_loader=loader
        )
        backend = AsyncMock(side_effect=[
            (200, {"success": True}, None),
            (200, {"active": True, "completed": False}, None),
            (200, {"promptContextEn": "context"}, None),
            (200, {"perfectSolution": "reference"}, None),
            (200, {"active": True, "completed": False}, None),
            (200, {"success": True}, None),
        ])
        with patch.multiple(llm_app, ML_SERVICE_TOKEN="test", OPENROUTER_API_KEY="test"), \
             patch.object(llm_app, "backend_request", backend), \
             patch.object(llm_app, "analyze_text", return_value={"status": "success", "is_toxic": False}), \
             patch.object(llm_service, "evaluate_fact_checking", return_value=(100, "facts")), \
             patch.object(llm_service, "evaluate_originality", return_value=(80, "originality")), \
             patch.object(llm_service, "generate_feedback_message", return_value="feedback"):
            response = await llm_app.evaluate(llm_app.EvaluateRequest(text="answer", case_id=7),
                SimpleNamespace(app=application, headers={"Cookie": "token=user"}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.body)["rating"], 64)
        self.assertEqual(backend.call_args.kwargs["body"]["rating"], 64)
        loader.assert_awaited_once_with(7, "token=user")
        predictor.predict.assert_called_once_with("full case", "answer")

    async def test_full_case_text_is_loaded_server_side(self):
        backend = AsyncMock(return_value=(200, {"fullDescription": "full case"}, None))
        with patch.object(hybrid_app, "backend_request", backend):
            self.assertEqual(await hybrid_app.load_case_text(7, "token=user"), "full case")
        backend.assert_awaited_once_with("/api/v1/cases/7", method="GET", cookie="token=user")

    async def test_missing_full_text_is_not_replaced_by_summary(self):
        with patch.object(hybrid_app, "backend_request", AsyncMock(
            return_value=(200, {"description": "summary"}, None)
        )):
            with self.assertRaises(RuntimeError):
                await hybrid_app.load_case_text(7, "token=user")
