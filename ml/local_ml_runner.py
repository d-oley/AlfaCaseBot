import argparse
import json
import logging
import os
import sys
import time
import uuid
from pathlib import Path

os.environ.setdefault("ML_DISABLE_APP_FILE_LOGGING", "1")

from app import SUCCESS_MSG, TOXIC_MSG, analyze_text, elapsed_ms, truncate_log
from case_contexts import CASE_CONTEXTS, get_case_context
from llm_service import evaluate_solution
from logging_utils import configure_numbered_file_logging


LOG_LEVEL = os.getenv("ML_LOG_LEVEL", "INFO").upper()
LOG_FILE = Path(__file__).resolve().parent / "logs" / "local_ml_runner.log"

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
LOGGER = logging.getLogger("ml.local_runner")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Локальный запуск ML-пайплайна без сайта и backend."
    )
    parser.add_argument("--case-id", type=int, help="ID кейса для оценки")
    parser.add_argument("--text", help="Текст решения кейса")
    parser.add_argument("--text-file", help="Путь к файлу с текстом решения")
    parser.add_argument(
        "--list-cases",
        action="store_true",
        help="Показать доступные кейсы и завершиться",
    )
    parser.add_argument(
        "--log-level",
        default=LOG_LEVEL,
        help="Уровень логирования: DEBUG, INFO, WARNING, ERROR",
    )
    parser.add_argument(
        "--log-file",
        default=str(LOG_FILE),
        help="Базовый путь к файлу логов; для каждого запуска будет создан отдельный файл с номером",
    )
    return parser.parse_args()

def configure_file_logging(log_level, log_file):
    return configure_numbered_file_logging(log_level, log_file)


def read_text(args):
    if args.text:
        return args.text
    if args.text_file:
        with open(args.text_file, "r", encoding="utf-8") as file_obj:
            return file_obj.read()

    LOGGER.info("text_input_mode=stdin")
    return sys.stdin.read().strip()


def print_cases():
    for case_id, case_info in CASE_CONTEXTS.items():
        print(f"{case_id}: {case_info['title']}")


def log_payload(event_name, payload, request_id):
    LOGGER.info(
        "local_ml_payload event=%s request_id=%s payload=%s",
        event_name,
        request_id,
        truncate_log(json.dumps(payload, ensure_ascii=False), 4000),
    )


def build_toxic_response(case_id, toxicity_result):
    return {
        "status": "toxic",
        "message": TOXIC_MSG,
        "case_id": case_id,
        "user_banned": False,
        "toxicity": {
            "confidence": toxicity_result.get("confidence"),
            "details": toxicity_result.get("details", {}),
        },
    }


def build_success_response(case_id, text, evaluation_result):
    final_score = evaluation_result.get("final_score", 70)
    return {
        "status": "accepted",
        "message": evaluation_result.get("message", SUCCESS_MSG),
        "case_id": case_id,
        "rating": round(final_score),
        "evaluation": {
            "stages": evaluation_result.get("stages", {}),
            "final_score": round(final_score),
        },
        "llm_meta": {
            "case_id": case_id,
            "text_length": len(text),
            "status": evaluation_result.get("status", "evaluated"),
        },
    }


def main():
    args = parse_args()
    log_path = configure_file_logging(args.log_level, args.log_file)
    if log_path:
        LOGGER.info("local_ml_log_file path=%s", log_path)
    else:
        LOGGER.warning("local_ml_log_file_unavailable requested_path=%s", args.log_file)

    if args.list_cases:
        print_cases()
        return 0

    if args.case_id is None:
        raise SystemExit("--case-id обязателен, если не указан --list-cases")

    text = read_text(args)
    if not text:
        raise SystemExit("Нужен текст: передай --text, --text-file или stdin")

    request_id = uuid.uuid4().hex[:12]
    started_at = time.perf_counter()
    LOGGER.info(
        "local_ml_run_started request_id=%s case_id=%s text_length=%s",
        request_id,
        args.case_id,
        len(text),
    )
    LOGGER.info(
        "local_ml_input request_id=%s case_id=%s text=%s",
        request_id,
        args.case_id,
        truncate_log(text, 2000),
    )

    case_info = get_case_context(args.case_id)
    LOGGER.info(
        "local_ml_case_loaded request_id=%s case_id=%s title=%s context_length=%s",
        request_id,
        args.case_id,
        case_info.get("title"),
        len(case_info.get("context", "")),
    )

    toxicity_result = analyze_text(text)
    log_payload("toxicity_result", toxicity_result, request_id)
    if toxicity_result["status"] == "error":
        print(json.dumps(toxicity_result, ensure_ascii=False, indent=2))
        return 1

    if toxicity_result["is_toxic"]:
        response_payload = build_toxic_response(args.case_id, toxicity_result)
        log_payload("final_response", response_payload, request_id)
        print(json.dumps(response_payload, ensure_ascii=False, indent=2))
        LOGGER.info(
            "local_ml_run_completed request_id=%s case_id=%s status=toxic duration_ms=%.2f",
            request_id,
            args.case_id,
            elapsed_ms(started_at),
        )
        return 0

    evaluation_result = evaluate_solution(text, case_info.get("context", ""))
    log_payload("evaluation_result", evaluation_result, request_id)

    response_payload = build_success_response(args.case_id, text, evaluation_result)
    log_payload("final_response", response_payload, request_id)
    print(json.dumps(response_payload, ensure_ascii=False, indent=2))
    LOGGER.info(
        "local_ml_run_completed request_id=%s case_id=%s status=%s rating=%s duration_ms=%.2f",
        request_id,
        args.case_id,
        evaluation_result.get("status", "evaluated"),
        response_payload["rating"],
        elapsed_ms(started_at),
    )
    return 0 if evaluation_result.get("status") != "error" else 1


if __name__ == "__main__":
    raise SystemExit(main())
