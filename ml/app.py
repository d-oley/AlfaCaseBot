import json
import logging
import os
import re
import time
import uuid
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

import joblib
import langdetect
from flask import Flask, g, jsonify, request
from flask_cors import CORS

from case_contexts import get_case_context
from llm_service import evaluate_solution, parse_json_payload
from logging_utils import configure_numbered_file_logging


app = Flask(__name__)


CORS(app, 
     origins=["http://localhost:8081", "http://localhost:8080"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Cookie", "X-Auth-Cookie"],
     methods=["GET", "POST", "OPTIONS"],
     automatic_options=True)

MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "baseline.joblib"
BACK_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
CHECK_PATH = os.getenv("CHECK_COOKIE_PATH", "/api/text/v1/checkCookie")
TOXIC_PATH = os.getenv("TOXIC_PATH", "/api/text/v1/processViolation")
SAVE_PATH = os.getenv("SAVE_RATING_PATH", "/api/text/v1/addScore")
TIMEOUT = float(os.getenv("BACKEND_TIMEOUT", "10"))
LOG_LEVEL = os.getenv("ML_LOG_LEVEL", "INFO").upper()
APP_LOG_FILE = Path(__file__).resolve().parent / "logs" / "app.log"
APP_FILE_LOGGING_DISABLED = os.getenv("ML_DISABLE_APP_FILE_LOGGING", "").lower() in {
    "1",
    "true",
    "yes",
}

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



SUCCESS_MSG = "Ответ принят."
TOXIC_MSG = "Обнаружены недопустимые формулировки 😠😠😠. После 3 таких сообщений ваш аккаунт будет заблокирован!!!"


def error_resp(code, msg, details=None):
    return {"status": "error", "code": code, "message": msg, "details": details or {}}

def success_resp(toxic, conf=None, details=None):
    return {"status": "success", "is_toxic": toxic, "confidence": conf, "details": details or {}}


def elapsed_ms(started_at):
    return round((time.perf_counter() - started_at) * 1000, 2)


def truncate_log(value, limit=200):
    text = str(value)
    return text if len(text) <= limit else f"{text[:limit]}..."


def current_request_id():
    return getattr(g, "request_id", "-")


def log_response_payload(event_name, payload, status_code):
    LOGGER.info(
        "ml_response event=%s request_id=%s status=%s payload=%s",
        event_name,
        current_request_id(),
        status_code,
        truncate_log(json.dumps(payload, ensure_ascii=False), 2000),
    )


def jsonify_logged(payload, status_code=200, event_name="response"):
    log_response_payload(event_name, payload, status_code)
    return jsonify(payload), status_code


def load_model():
    try:
        data = joblib.load(MODEL_PATH)
        LOGGER.info(
            "toxicity_model_loaded path=%s threshold=%s",
            MODEL_PATH,
            data.get("threshold"),
        )
        return data["vectorizer"], data["model"], data["threshold"]
    except FileNotFoundError:
        LOGGER.error("toxicity_model_missing path=%s", MODEL_PATH)
        return None, None, None


VECTORIZER, MODEL, THRESHOLD = load_model()


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[^a-zа-яё0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def check_language(text):
    if not text or len(text.strip()) < 3:
        return False, error_resp("INVALID_INPUT", "Текст слишком короткий")
    try:
        if langdetect.detect(text) != "ru":
            return False, error_resp("UNSUPPORTED_LANGUAGE", "Пишите на русском")
    except Exception:
        LOGGER.exception("language_detection_failed text_length=%s", len(text))
        return False, error_resp("LANGUAGE_ERROR", "Ошибка определения языка")
    return True, None


def analyze_text(text):
    if not MODEL:
        return error_resp("MODEL_NOT_FOUND", "Модель не загружена")
    
    ok, err = check_language(text)
    if not ok:
        return err
    
    sents = [clean_text(p) for p in re.split(r"(?<=[.!?])\s+", text)]
    sents = [s for s in sents if len(s) > 2]
    
    if not sents:
        return error_resp("NO_CONTENT", "Текст пуст")
    
    toxic = []
    max_conf = 0.0
    
    for i, s in enumerate(sents):
        vec = VECTORIZER.transform([s])
        conf = float(MODEL.predict_proba(vec)[0, 1])
        max_conf = max(max_conf, conf)
        
        if conf >= THRESHOLD:
            toxic.append({"index": i, "text": s, "confidence": round(conf, 4)})
    
    if toxic:
        return success_resp(True, round(max_conf, 4), {"toxic_count": len(toxic), "total": len(sents), "examples": toxic})
    
    return success_resp(False, round(max_conf, 4), {"total": len(sents)})


def parse_json(raw_text):
    if not raw_text:
        return {}

    try:
        return parse_json_payload(raw_text)
    except (TypeError, ValueError, json.JSONDecodeError):
        return {"raw": raw_text}


def back_req(path, method="POST", body=None, cookie=""):
    hdrs = {"Accept": "application/json"}
    data = None
    started_at = time.perf_counter()
    if body:
        hdrs["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if cookie:
        hdrs["Cookie"] = cookie
    
    req = urllib_request.Request(f"{BACK_URL}{path}", data=data, headers=hdrs, method=method)
    try:
        with urllib_request.urlopen(req, timeout=TIMEOUT) as r:
            status_code = r.getcode()
            response_data = parse_json(r.read().decode().strip())
            LOGGER.info(
                "backend_request_completed request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
                current_request_id(),
                method,
                path,
                status_code,
                elapsed_ms(started_at),
            )
            return status_code, response_data
    except urllib_error.HTTPError as e:
        response_data = parse_json(e.read().decode().strip())
        LOGGER.warning(
            "backend_request_failed request_id=%s method=%s path=%s status=%s duration_ms=%.2f message=%s",
            current_request_id(),
            method,
            path,
            e.code,
            elapsed_ms(started_at),
            truncate_log(back_msg(response_data) or response_data),
        )
        return e.code, response_data
    except urllib_error.URLError as e:
        LOGGER.error(
            "backend_request_unavailable request_id=%s method=%s path=%s duration_ms=%.2f reason=%s",
            current_request_id(),
            method,
            path,
            elapsed_ms(started_at),
            e.reason,
        )
        raise RuntimeError(f"Backend error: {e.reason}") from e

def back_msg(d):
    return d.get("errorText") or d.get("message") or ""

def back_ok(d):
    return d.get("success") is True


def llm_request(text, case_id):
    started_at = time.perf_counter()
    try:
        LOGGER.info(
            "llm_evaluation_started request_id=%s case_id=%s text_length=%s",
            current_request_id(),
            case_id,
            len(text),
        )
        case_info = get_case_context(case_id)
        case_context = case_info.get("context", "")
        
        evaluation_result = evaluate_solution(text, case_context)
        
        final_score = evaluation_result.get("final_score", 70)
        response_data = {
            "rating": round(final_score),
            "status": evaluation_result.get("status", "evaluated"),
            "stages": evaluation_result.get("stages", {}),
            "message": evaluation_result.get("message", "Оценка завершена"),
            "meta": {
                "case_id": case_id,
                "text_length": len(text)
            }
        }
        log_response_payload("llm_pipeline_result", response_data, 200)
        LOGGER.info(
            "llm_evaluation_completed request_id=%s case_id=%s status=%s rating=%s duration_ms=%.2f",
            current_request_id(),
            case_id,
            response_data["status"],
            response_data["rating"],
            elapsed_ms(started_at),
        )
        
        return response_data
    except Exception as e:
        LOGGER.exception(
            "llm_evaluation_failed request_id=%s case_id=%s duration_ms=%.2f",
            current_request_id(),
            case_id,
            elapsed_ms(started_at),
        )
        return {
            "rating": 70,
            "status": "error",
            "message": "Произошла ошибка при оценке решения. Попробуйте ещё раз.",
            "meta": {"case_id": case_id, "error": str(e)}
        }


@app.before_request
def log_request_started():
    g.request_id = request.headers.get("X-Request-ID", "").strip() or uuid.uuid4().hex[:12]
    g.request_started_at = time.perf_counter()
    LOGGER.info(
        "request_started request_id=%s method=%s path=%s remote_addr=%s",
        g.request_id,
        request.method,
        request.path,
        request.headers.get("X-Forwarded-For", request.remote_addr),
    )


@app.after_request
def log_request_completed(response):
    started_at = getattr(g, "request_started_at", None)
    duration_ms = elapsed_ms(started_at) if started_at is not None else 0.0
    response.headers["X-Request-ID"] = current_request_id()
    LOGGER.info(
        "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        current_request_id(),
        request.method,
        request.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.get("/health")
def health():
    LOGGER.debug("health_check request_id=%s model_loaded=%s", current_request_id(), MODEL is not None)
    return jsonify_logged({"status": "ok", "model_loaded": MODEL is not None}, event_name="health")

@app.post("/evaluate")
def evaluate():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text")
    case_id = payload.get("case_id") or payload.get("caseId")
    cookie = request.headers.get("X-Auth-Cookie", "").strip() or request.headers.get("Cookie", "").strip()

    if not isinstance(text, str) or not text.strip():
        LOGGER.warning("evaluate_invalid_text request_id=%s", current_request_id())
        return jsonify_logged(error_resp("INVALID_INPUT", "Требуется поле text"), 400, "evaluate_invalid_text")

    if case_id in (None, ""):
        LOGGER.warning("evaluate_missing_case_id request_id=%s", current_request_id())
        return jsonify_logged(error_resp("INVALID_INPUT", "Требуется case_id"), 400, "evaluate_missing_case_id")

    if not cookie:
        LOGGER.warning("evaluate_missing_cookie request_id=%s case_id=%s", current_request_id(), case_id)
        return jsonify_logged(error_resp("UNAUTHORIZED", "Требуется cookie"), 401, "evaluate_missing_cookie")

    LOGGER.info(
        "evaluate_received request_id=%s case_id=%s text_length=%s text=%s",
        current_request_id(),
        case_id,
        len(text),
        truncate_log(text, 1000),
    )

    try:
        status, data = back_req(CHECK_PATH, method="GET", cookie=cookie)
    except RuntimeError as e:
        LOGGER.warning(
            "evaluate_auth_backend_unavailable request_id=%s case_id=%s error=%s",
            current_request_id(),
            case_id,
            e,
        )
        return jsonify_logged(error_resp("BACKEND_UNAVAILABLE", str(e)), 502, "evaluate_auth_backend_unavailable")

    if status != 200:
        LOGGER.warning(
            "evaluate_auth_failed request_id=%s case_id=%s status=%s",
            current_request_id(),
            case_id,
            status,
        )
        return jsonify_logged(error_resp("AUTH_FAILED", "Сессия не проверена"), 502, "evaluate_auth_failed")

    if not back_ok(data):
        LOGGER.warning(
            "evaluate_session_invalid request_id=%s case_id=%s",
            current_request_id(),
            case_id,
        )
        return jsonify_logged(error_resp("UNAUTHORIZED", "Сессия недействительна"), 401, "evaluate_session_invalid")

    result = analyze_text(text)
    if result["status"] == "error":
        LOGGER.warning(
            "evaluate_validation_failed request_id=%s case_id=%s code=%s",
            current_request_id(),
            case_id,
            result.get("code"),
        )
        return jsonify_logged(
            result,
            400 if result["code"] != "MODEL_NOT_FOUND" else 500,
            "evaluate_validation_failed",
        )

    if result["is_toxic"]:
        try:
            status, data = back_req(TOXIC_PATH, cookie=cookie)
        except RuntimeError as e:
            LOGGER.warning(
                "evaluate_toxic_backend_unavailable request_id=%s case_id=%s error=%s",
                current_request_id(),
                case_id,
                e,
            )
            return jsonify_logged(error_resp("BACKEND_UNAVAILABLE", str(e)), 502, "evaluate_toxic_backend_unavailable")

        if status != 200:
            LOGGER.warning(
                "evaluate_toxic_mark_failed request_id=%s case_id=%s status=%s",
                current_request_id(),
                case_id,
                status,
            )
            return jsonify_logged(error_resp("MARK_TOXIC_FAILED", "Не удалось сохранить"), 502, "evaluate_toxic_mark_failed")

        user_banned = not back_ok(data)
        toxic_message = data.get("errorText") or TOXIC_MSG if user_banned else TOXIC_MSG
        LOGGER.warning(
            "evaluate_toxic_detected request_id=%s case_id=%s confidence=%s toxic_count=%s user_banned=%s",
            current_request_id(),
            case_id,
            result.get("confidence"),
            result.get("details", {}).get("toxic_count"),
            user_banned,
        )

        return jsonify_logged({
            "status": "toxic",
            "message": toxic_message,
            "case_id": case_id,
            "user_banned": user_banned,
            "toxicity": {"confidence": result.get("confidence"), "details": result.get("details", {})},
        }, 400, "evaluate_toxic_detected")

    llm = llm_request(text, case_id)
    
    try:
        status, data = back_req(SAVE_PATH, body={
            "caseId": case_id,
            "rating": llm["rating"],
        }, cookie=cookie)
    except RuntimeError as e:
        LOGGER.warning(
            "evaluate_save_backend_unavailable request_id=%s case_id=%s rating=%s error=%s",
            current_request_id(),
            case_id,
            llm.get("rating"),
            e,
        )
        return jsonify_logged(error_resp("BACKEND_UNAVAILABLE", str(e)), 502, "evaluate_save_backend_unavailable")

    if status not in (200, 201, 204):
        LOGGER.warning(
            "evaluate_save_failed request_id=%s case_id=%s rating=%s status=%s",
            current_request_id(),
            case_id,
            llm.get("rating"),
            status,
        )
        return jsonify_logged(error_resp("SAVE_RATING_FAILED", "Не удалось сохранить рейтинг"), 502, "evaluate_save_failed")

    LOGGER.info(
        "evaluate_completed request_id=%s case_id=%s rating=%s llm_status=%s",
        current_request_id(),
        case_id,
        llm["rating"],
        llm.get("status"),
    )

    return jsonify_logged({
        "status": "accepted",
        "message": llm.get("message", SUCCESS_MSG),
        "case_id": case_id,
        "rating": llm["rating"],
        "evaluation": {
            "stages": llm.get("stages", {}),
            "final_score": llm["rating"]
        },
        "llm_meta": llm.get("meta", {})
    }, 200, "evaluate_completed")


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
