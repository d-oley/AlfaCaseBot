import json
import logging
import os
import re
import time
import uuid
from contextvars import ContextVar
from pathlib import Path
from typing import Any

import httpx
import joblib
import langdetect
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from llm_service import OPENROUTER_API_KEY, evaluate_solution
from logging_utils import configure_numbered_file_logging


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "best_model.joblib"
MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", str(DEFAULT_MODEL_PATH))).expanduser()
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
CHECK_COOKIE_PATH = os.getenv("CHECK_COOKIE_PATH", "/api/text/v1/checkCookie")
TOXIC_PATH = os.getenv("TOXIC_PATH", "/api/text/v1/processViolation")
SAVE_RATING_PATH = os.getenv("SAVE_RATING_PATH", "/api/text/v1/addScore")
CASE_PATH_TEMPLATE = os.getenv("CASE_PATH_TEMPLATE", "/api/text/v1/cases/{case_id}/prompt")
BACKEND_TIMEOUT = float(os.getenv("BACKEND_TIMEOUT", "10"))
TRUST_ENV_PROXIES = os.getenv("ML_TRUST_ENV_PROXIES", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
LOG_LEVEL = os.getenv("ML_LOG_LEVEL", "INFO").upper()
APP_LOG_FILE = Path(__file__).resolve().parent / "logs" / "app.log"
APP_FILE_LOGGING_DISABLED = os.getenv("ML_DISABLE_APP_FILE_LOGGING", "").lower() in {
    "1",
    "true",
    "yes",
}

SUCCESS_MSG = "Ответ принят."
TOXIC_MSG = "Обнаружены недопустимые формулировки 😠😠😠. После 3 таких сообщений ваш аккаунт будет заблокирован!!!"
SESSION_ERROR_MESSAGES = {"Please login first", "Session expired"}


def parse_cors_origins() -> list[str]:
    configured = os.getenv(
        "ML_CORS_ORIGINS",
        "https://alfacasebot.it-networking.ru,http://localhost:8081,http://127.0.0.1:8081,http://localhost:8080,http://127.0.0.1:8080",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
LOGGER = logging.getLogger("ml.app")

if not APP_FILE_LOGGING_DISABLED:
    app_log_path = configure_numbered_file_logging(
        LOG_LEVEL,
        os.getenv("ML_APP_LOG_FILE", str(APP_LOG_FILE)),
    )
    if app_log_path:
        LOGGER.info("app_log_file path=%s", app_log_path)
    else:
        LOGGER.warning("app_log_file_unavailable requested_path=%s", APP_LOG_FILE)


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1)
    case_id: int = Field(
        gt=0,
        validation_alias=AliasChoices("case_id", "caseId"),
        serialization_alias="case_id",
    )


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    llm_configured: bool


REQUEST_ID: ContextVar[str] = ContextVar("request_id", default="-")


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "status": "error",
        "code": code,
        "message": message,
        "details": details or {},
    }


def success_payload(is_toxic: bool, confidence: float | None = None, details=None):
    return {
        "status": "success",
        "is_toxic": is_toxic,
        "confidence": confidence,
        "details": details or {},
    }


def elapsed_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)


def truncate_log(value: Any, limit: int = 200) -> str:
    text = str(value)
    return text if len(text) <= limit else f"{text[:limit]}..."


def current_request_id() -> str:
    return REQUEST_ID.get()


def logged_response(
    payload: dict[str, Any],
    status_code=200,
    event_name="response",
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    LOGGER.info(
        "ml_response event=%s request_id=%s status=%s payload=%s",
        event_name,
        current_request_id(),
        status_code,
        truncate_log(json.dumps(payload, ensure_ascii=False), 2000),
    )
    return JSONResponse(payload, status_code=status_code, headers=headers)


def load_model():
    try:
        data = joblib.load(MODEL_PATH)
        LOGGER.info(
            "toxicity_model_loaded path=%s threshold=%s",
            MODEL_PATH,
            data.get("threshold"),
        )
        return data["vectorizer"], data["model"], data["threshold"]
    except (FileNotFoundError, KeyError, ValueError, TypeError):
        LOGGER.exception("toxicity_model_load_failed path=%s", MODEL_PATH)
        return None, None, None


VECTORIZER, MODEL, THRESHOLD = load_model()


def split_into_sentences(text: str) -> list[str]:
    if not isinstance(text, str):
        return []

    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def check_language(text: str):
    if not text or len(text.strip()) < 3:
        return False, error_payload("INVALID_INPUT", "Текст слишком короткий")
    try:
        if langdetect.detect(text) != "ru":
            return False, error_payload("UNSUPPORTED_LANGUAGE", "Пишите на русском")
    except Exception:
        LOGGER.exception("language_detection_failed text_length=%s", len(text))
        return False, error_payload("LANGUAGE_ERROR", "Ошибка определения языка")
    return True, None


def analyze_text(text: str) -> dict[str, Any]:
    if MODEL is None or VECTORIZER is None or THRESHOLD is None:
        return error_payload("MODEL_NOT_FOUND", "Модель не загружена")

    ok, validation_error = check_language(text)
    if not ok:
        return validation_error

    sentences = split_into_sentences(text)
    if not sentences:
        return error_payload("NO_CONTENT", "Текст пуст")

    vectors = VECTORIZER.transform(sentences)
    sentence_scores = MODEL.predict_proba(vectors)[:, 1]

    toxic_examples = []
    max_confidence = float(sentence_scores.max())
    for index, (sentence, score) in enumerate(zip(sentences, sentence_scores)):
        confidence = float(score)
        if confidence >= THRESHOLD:
            toxic_examples.append(
                {"index": index, "text": sentence, "confidence": round(confidence, 4)}
            )

    details = {"total": len(sentences)}
    if toxic_examples:
        details.update({"toxic_count": len(toxic_examples), "examples": toxic_examples})
        return success_payload(True, round(max_confidence, 4), details)
    return success_payload(False, round(max_confidence, 4), details)


def parse_backend_response(response: httpx.Response) -> dict[str, Any]:
    if not response.content:
        return {}
    try:
        payload = response.json()
        return payload if isinstance(payload, dict) else {"data": payload}
    except (json.JSONDecodeError, ValueError):
        return {"raw": response.text}


async def backend_request(
    path: str,
    method: str = "POST",
    body: dict[str, Any] | None = None,
    cookie: str = "",
) -> tuple[int, dict[str, Any], str | None]:
    headers = {"Accept": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    started_at = time.perf_counter()

    try:
        async with httpx.AsyncClient(
            base_url=BACKEND_BASE_URL,
            timeout=BACKEND_TIMEOUT,
            trust_env=TRUST_ENV_PROXIES,
        ) as client:
            response = await client.request(method, path, json=body, headers=headers)
    except httpx.RequestError as exc:
        LOGGER.error(
            "backend_request_unavailable request_id=%s method=%s path=%s duration_ms=%.2f reason=%s",
            current_request_id(),
            method,
            path,
            elapsed_ms(started_at),
            exc,
        )
        raise RuntimeError("Backend недоступен") from exc

    payload = parse_backend_response(response)
    log_method = LOGGER.info if response.is_success else LOGGER.warning
    log_method(
        "backend_request_completed request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        current_request_id(),
        method,
        path,
        response.status_code,
        elapsed_ms(started_at),
    )
    return response.status_code, payload, response.headers.get("set-cookie")


def backend_message(payload: dict[str, Any]) -> str:
    return str(payload.get("errorText") or payload.get("message") or "").strip()


def backend_success(payload: dict[str, Any]) -> bool:
    return payload.get("success") is True


def is_session_error(payload: dict[str, Any]) -> bool:
    return backend_message(payload) in SESSION_ERROR_MESSAGES


def evaluate_with_llm(text: str, case_id: int, case_context: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    LOGGER.info(
        "llm_evaluation_started request_id=%s case_id=%s text_length=%s",
        current_request_id(),
        case_id,
        len(text),
    )
    result = evaluate_solution(text, case_context)
    rating = max(0, min(100, round(float(result.get("final_score", 70)))))
    response = {
        "rating": rating,
        "status": result.get("status", "evaluated"),
        "stages": result.get("stages", {}),
        "message": result.get("message", SUCCESS_MSG),
        "meta": {"case_id": case_id, "text_length": len(text)},
    }
    LOGGER.info(
        "llm_evaluation_completed request_id=%s case_id=%s status=%s rating=%s duration_ms=%.2f",
        current_request_id(),
        case_id,
        response["status"],
        response["rating"],
        elapsed_ms(started_at),
    )
    return response


app = FastAPI(
    title="AlfaCaseBot ML API",
    version="1.0.0",
    description="Проверка токсичности и LLM-оценка решений кейсов.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Cookie", "X-Auth-Cookie", "X-Request-ID"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", "").strip() or uuid.uuid4().hex[:12]
    token = REQUEST_ID.set(request_id)
    started_at = time.perf_counter()
    LOGGER.info(
        "request_started request_id=%s method=%s path=%s remote_addr=%s",
        request_id,
        request.method,
        request.url.path,
        request.client.host if request.client else "-",
    )
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        LOGGER.info(
            "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms(started_at),
        )
        return response
    finally:
        REQUEST_ID.reset(token)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_request: Request, exc: RequestValidationError):
    errors = [
        {
            "field": ".".join(str(part) for part in error.get("loc", []) if part != "body"),
            "message": error.get("msg", "Invalid value"),
        }
        for error in exc.errors()
    ]
    return logged_response(
        error_payload("INVALID_INPUT", "Некорректные данные запроса", {"errors": errors}),
        422,
        "request_validation_failed",
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "llm_configured": bool(OPENROUTER_API_KEY),
    }


@app.post("/evaluate")
async def evaluate(payload: EvaluateRequest, request: Request):
    text = payload.text.strip()
    case_id = payload.case_id
    if not text:
        return logged_response(error_payload("INVALID_INPUT", "Требуется поле text"), 400)

    cookie = (
        request.headers.get("X-Auth-Cookie", "").strip()
        or request.headers.get("Cookie", "").strip()
    )
    if not cookie:
        return logged_response(
            error_payload("UNAUTHORIZED", "Требуется cookie"),
            401,
            "evaluate_missing_cookie",
        )

    try:
        status, auth_data, _ = await backend_request(CHECK_COOKIE_PATH, method="GET", cookie=cookie)
    except RuntimeError:
        return logged_response(
            error_payload("BACKEND_UNAVAILABLE", "Backend недоступен"),
            502,
            "evaluate_auth_backend_unavailable",
        )

    if status != 200:
        return logged_response(
            error_payload("AUTH_FAILED", "Сессия не проверена"),
            502,
            "evaluate_auth_failed",
        )
    if not backend_success(auth_data):
        return logged_response(
            error_payload("UNAUTHORIZED", backend_message(auth_data) or "Сессия недействительна"),
            401,
            "evaluate_session_invalid",
        )

    toxicity = await run_in_threadpool(analyze_text, text)
    if toxicity["status"] == "error":
        status_code = 500 if toxicity["code"] == "MODEL_NOT_FOUND" else 400
        return logged_response(toxicity, status_code, "evaluate_validation_failed")

    if toxicity["is_toxic"]:
        try:
            status, violation_data, set_cookie = await backend_request(TOXIC_PATH, cookie=cookie)
        except RuntimeError:
            return logged_response(
                error_payload("BACKEND_UNAVAILABLE", "Backend недоступен"),
                502,
                "evaluate_toxic_backend_unavailable",
            )
        if status != 200:
            return logged_response(
                error_payload("MARK_TOXIC_FAILED", "Не удалось сохранить нарушение"),
                502,
                "evaluate_toxic_mark_failed",
            )
        if is_session_error(violation_data):
            return logged_response(
                error_payload("UNAUTHORIZED", backend_message(violation_data)),
                401,
                "evaluate_session_expired",
            )

        user_banned = not backend_success(violation_data)
        response = {
            "status": "toxic",
            "message": backend_message(violation_data) if user_banned else TOXIC_MSG,
            "case_id": case_id,
            "user_banned": user_banned,
            "toxicity": {
                "confidence": toxicity.get("confidence"),
                "details": toxicity.get("details", {}),
            },
        }
        response_headers = {"set-cookie": set_cookie} if set_cookie else None
        return logged_response(response, 400, "evaluate_toxic_detected", response_headers)

    if not OPENROUTER_API_KEY:
        return logged_response(
            error_payload("LLM_NOT_CONFIGURED", "Не задан OPENROUTER_API_KEY"),
            503,
            "evaluate_llm_not_configured",
        )

    try:
        case_path = CASE_PATH_TEMPLATE.format(case_id=case_id)
        case_status, case_data, _ = await backend_request(case_path, method="GET", cookie=cookie)
    except (KeyError, ValueError):
        LOGGER.exception("case_path_template_invalid template=%s", CASE_PATH_TEMPLATE)
        return logged_response(
            error_payload("CASE_API_CONFIG_ERROR", "Некорректно настроен адрес кейсов"),
            500,
            "evaluate_case_config_failed",
        )
    except RuntimeError:
        return logged_response(
            error_payload("BACKEND_UNAVAILABLE", "Backend недоступен"),
            502,
            "evaluate_case_backend_unavailable",
        )

    if case_status == 404:
        return logged_response(
            error_payload("CASE_NOT_FOUND", "Кейс не найден"),
            404,
            "evaluate_case_not_found",
        )
    if case_status != 200:
        return logged_response(
            error_payload("CASE_LOAD_FAILED", "Не удалось загрузить условие кейса"),
            502,
            "evaluate_case_load_failed",
        )

    case_context = str(case_data.get("promptContextEn") or "").strip()
    if not case_context:
        return logged_response(
            error_payload("CASE_CONTEXT_MISSING", "Для кейса не задан контекст проверки"),
            422,
            "evaluate_case_context_missing",
        )

    try:
        llm_result = await run_in_threadpool(evaluate_with_llm, text, case_id, case_context)
    except Exception:
        LOGGER.exception("llm_evaluation_failed request_id=%s case_id=%s", current_request_id(), case_id)
        return logged_response(
            error_payload("EVALUATION_FAILED", "Не удалось оценить решение"),
            502,
            "evaluate_llm_failed",
        )
    if llm_result["status"] == "error":
        return logged_response(
            error_payload("EVALUATION_FAILED", llm_result["message"]),
            502,
            "evaluate_llm_failed",
        )

    save_body = {
        "caseId": case_id,
        "rating": llm_result["rating"],
        "solutionText": text,
        "solutionResponse": llm_result["message"] or SUCCESS_MSG,
    }
    try:
        status, save_data, _ = await backend_request(
            SAVE_RATING_PATH,
            body=save_body,
            cookie=cookie,
        )
    except RuntimeError:
        return logged_response(
            error_payload("BACKEND_UNAVAILABLE", "Backend недоступен"),
            502,
            "evaluate_save_backend_unavailable",
        )

    if status != 200 or not backend_success(save_data):
        if is_session_error(save_data):
            return logged_response(
                error_payload("UNAUTHORIZED", backend_message(save_data)),
                401,
                "evaluate_save_session_expired",
            )
        return logged_response(
            error_payload(
                "SAVE_RATING_FAILED",
                backend_message(save_data) or "Не удалось сохранить результат",
            ),
            502,
            "evaluate_save_failed",
        )

    response = {
        "status": "accepted",
        "message": llm_result["message"] or SUCCESS_MSG,
        "case_id": case_id,
        "rating": llm_result["rating"],
        "evaluation": {
            "stages": llm_result.get("stages", {}),
            "final_score": llm_result["rating"],
        },
        "llm_meta": llm_result.get("meta", {}),
    }
    return logged_response(response, 200, "evaluate_completed")
