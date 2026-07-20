import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import app as ml_app


class MlApiTestCase(unittest.TestCase):
    def setUp(self):
        self.api_key_patcher = patch.object(ml_app, "OPENROUTER_API_KEY", "test-api-key")
        self.api_key_patcher.start()
        self.addCleanup(self.api_key_patcher.stop)
        self.client = TestClient(ml_app.app)

    def test_health_reports_model_state(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertIn("model_loaded", response.json())
        self.assertTrue(response.json()["llm_configured"])
        self.assertTrue(response.headers.get("x-request-id"))

    def test_evaluate_requires_cookie(self):
        response = self.client.post(
            "/evaluate",
            json={"text": "Подробное решение кейса", "case_id": 1},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    @patch.object(ml_app, "evaluate_with_llm")
    @patch.object(ml_app, "analyze_text")
    @patch.object(ml_app, "backend_request", new_callable=AsyncMock)
    def test_evaluate_saves_complete_java_solution(
        self,
        backend_request,
        analyze_text,
        evaluate_with_llm,
    ):
        backend_request.side_effect = [
            (200, {"success": True, "errorText": ""}, None),
            (200, {"success": True, "errorText": ""}, None),
        ]
        analyze_text.return_value = {
            "status": "success",
            "is_toxic": False,
            "confidence": 0.05,
            "details": {},
        }
        evaluate_with_llm.return_value = {
            "rating": 82,
            "status": "evaluated",
            "stages": {"logic": {"score": 82}},
            "message": "Хорошее решение",
            "meta": {"case_id": 2, "text_length": 24},
        }

        response = self.client.post(
            "/evaluate",
            headers={"Cookie": "token=test-token"},
            json={"text": "Подробное решение кейса", "caseId": 2},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rating"], 82)
        save_call = backend_request.await_args_list[1]
        self.assertEqual(
            save_call.kwargs["body"],
            {
                "caseId": 2,
                "rating": 82,
                "solutionText": "Подробное решение кейса",
                "solutionResponse": "Хорошее решение",
            },
        )

    @patch.object(ml_app, "analyze_text")
    @patch.object(ml_app, "backend_request", new_callable=AsyncMock)
    def test_ban_cookie_is_forwarded(self, backend_request, analyze_text):
        backend_request.side_effect = [
            (200, {"success": True, "errorText": ""}, None),
            (
                200,
                {"success": False, "errorText": "Пользователь заблокирован"},
                "token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
            ),
        ]
        analyze_text.return_value = {
            "status": "success",
            "is_toxic": True,
            "confidence": 0.99,
            "details": {"toxic_count": 1},
        }

        response = self.client.post(
            "/evaluate",
            headers={"Cookie": "token=test-token"},
            json={"text": "Токсичный текст для проверки", "case_id": 3},
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(response.json()["user_banned"])
        self.assertIn("Max-Age=0", response.headers["set-cookie"])

    @patch.object(ml_app, "evaluate_with_llm")
    @patch.object(ml_app, "analyze_text")
    @patch.object(ml_app, "backend_request", new_callable=AsyncMock)
    def test_backend_business_error_is_not_reported_as_saved(
        self,
        backend_request,
        analyze_text,
        evaluate_with_llm,
    ):
        backend_request.side_effect = [
            (200, {"success": True, "errorText": ""}, None),
            (200, {"success": False, "errorText": "Invalid request"}, None),
        ]
        analyze_text.return_value = {
            "status": "success",
            "is_toxic": False,
            "confidence": 0.01,
            "details": {},
        }
        evaluate_with_llm.return_value = {
            "rating": 70,
            "status": "evaluated",
            "stages": {},
            "message": "Ответ",
            "meta": {},
        }

        response = self.client.post(
            "/evaluate",
            headers={"Cookie": "token=test-token"},
            json={"text": "Подробное решение кейса", "case_id": 4},
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["code"], "SAVE_RATING_FAILED")


if __name__ == "__main__":
    unittest.main()
