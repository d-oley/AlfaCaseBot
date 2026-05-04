import json
import os
import re
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

import joblib
import langdetect
from flask import Flask, jsonify, request


app = Flask(__name__)

MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "baseline.joblib"
BACK_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
CHECK_PATH = os.getenv("CHECK_COOKIE_PATH", "/api/text/v1/checkCookie")
TOXIC_PATH = os.getenv("TOXIC_PATH", "/api/text/v1/processViolation")
SAVE_PATH = os.getenv("SAVE_RATING_PATH", "/api/text/v1/addScore")
TIMEOUT = float(os.getenv("BACKEND_TIMEOUT", "10"))

SUCCESS_MSG = "Ответ принят."
TOXIC_MSG = "Обнаружены недопустимые формулировки 😠😠😠. После 3 таких сообщений ваш аккаунт будет заблокирован!!!"


def error_resp(code, msg, details=None):
    return {"status": "error", "code": code, "message": msg, "details": details or {}}

def success_resp(toxic, conf=None, details=None):
    return {"status": "success", "is_toxic": toxic, "confidence": conf, "details": details or {}}


def load_model():
    try:
        data = joblib.load(MODEL_PATH)
        return data["vectorizer"], data["model"], data["threshold"]
    except FileNotFoundError:
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
    except:
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
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"raw": raw_text}


def back_req(path, method="POST", body=None, cookie=""):
    hdrs = {"Accept": "application/json"}
    data = None
    if body:
        hdrs["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if cookie:
        hdrs["Cookie"] = cookie
    
    req = urllib_request.Request(f"{BACK_URL}{path}", data=data, headers=hdrs, method=method)
    try:
        with urllib_request.urlopen(req, timeout=TIMEOUT) as r:
            return r.getcode(), parse_json(r.read().decode().strip())
    except urllib_error.HTTPError as e:
        return e.code, parse_json(e.read().decode().strip())
    except urllib_error.URLError as e:
        raise RuntimeError(f"Backend error: {e.reason}") from e

def back_msg(d):
    return d.get("errorText") or d.get("message") or ""

def back_ok(d):
    return d.get("success") is True


def llm_stub(text, case_id):
    return {"rating": 0, "status": "stub", "meta": {"case_id": case_id, "text": text[:200]}}


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": MODEL is not None})


@app.post("/evaluate")
def evaluate():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text")
    case_id = payload.get("case_id") or payload.get("caseId")
    cookie = request.headers.get("Cookie", "").strip()

    if not isinstance(text, str) or not text.strip():
        return jsonify(error_resp("INVALID_INPUT", "Требуется поле text")), 400

    if case_id in (None, ""):
        return jsonify(error_resp("INVALID_INPUT", "Требуется case_id")), 400

    if not cookie:
        return jsonify(error_resp("UNAUTHORIZED", "Требуется cookie")), 401

    try:
        status, data = back_req(CHECK_PATH, method="GET", cookie=cookie)
    except RuntimeError as e:
        return jsonify(error_resp("BACKEND_UNAVAILABLE", str(e))), 502

    if status != 200:
        return jsonify(error_resp("AUTH_FAILED", "Сессия не проверена")), 502

    if not back_ok(data):
        return jsonify(error_resp("UNAUTHORIZED", "Сессия недействительна")), 401

    result = analyze_text(text)
    if result["status"] == "error":
        return jsonify(result), 400 if result["code"] != "MODEL_NOT_FOUND" else 500

    if result["is_toxic"]:
        try:
            status, data = back_req(TOXIC_PATH, cookie=cookie)
        except RuntimeError as e:
            return jsonify(error_resp("BACKEND_UNAVAILABLE", str(e))), 502

        if status != 200 or not back_ok(data):
            return jsonify(error_resp("MARK_TOXIC_FAILED", "Не удалось сохранить")), 502

        return jsonify({
            "status": "toxic",
            "message": TOXIC_MSG,
            "case_id": case_id,
            "toxicity": {"confidence": result.get("confidence"), "details": result.get("details", {})},
        }), 400

    llm = llm_stub(text, case_id)
    try:
        status, data = back_req(SAVE_PATH, body={
            "caseId": case_id,
            "rating": llm["rating"],
        }, cookie=cookie)
    except RuntimeError as e:
        return jsonify(error_resp("BACKEND_UNAVAILABLE", str(e))), 502

    if status not in (200, 201, 204):
        return jsonify(error_resp("SAVE_RATING_FAILED", "Не удалось сохранить рейтинг")), 502

    return jsonify({
        "status": "accepted",
        "message": SUCCESS_MSG,
        "case_id": case_id,
        "rating": llm["rating"],
        "llm": llm,
    })


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
