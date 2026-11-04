"""оценка через локальную модель и языковую модель"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from . import llm_service
from .llm_only_app import backend_request, create_app


ARTIFACT_DIR = Path(os.getenv("TINY2_ARTIFACT_DIR", str(
    Path(__file__).resolve().parent.parent / "artifacts" / "rubert_tiny2_multitask"
)))
PUBLIC_CASE_PATH_TEMPLATE = os.getenv("PUBLIC_CASE_PATH_TEMPLATE", "/api/v1/cases/{case_id}")


async def load_case_text(case_id, cookie):
    status, data, _ = await backend_request(
        PUBLIC_CASE_PATH_TEMPLATE.format(case_id=case_id), method="GET", cookie=cookie
    )
    text = data.get("fullDescription")
    if status != 200 or not isinstance(text, str) or not text.strip():
        raise RuntimeError("Full case description is unavailable")
    return text.strip()


def evaluate_hybrid(user_solution, case_context, perfect_solution, *, case_text, predictor):
    # сначала проверяем локальную модель, затем отправляем платные запросы
    predicted = predictor.predict(case_text, user_solution)
    fact_score, fact_feedback = llm_service.evaluate_fact_checking(user_solution, case_context)
    originality_score, originality_feedback = llm_service.evaluate_originality(
        user_solution, case_context, perfect_solution
    )
    stages = {
        "fact_check": {"score": fact_score, "feedback": fact_feedback},
        "originality": {"score": originality_score, "feedback": originality_feedback},
    }
    for name in ("effectiveness", "logic", "completeness"):
        stages[name] = {"score": predicted[name], "feedback": ""}

    weighted_scores = []
    for name, result in stages.items():
        weighted_scores.append(llm_service.WEIGHTS[name] * result["score"])
    total = round(sum(weighted_scores), 1)

    message = llm_service.generate_feedback_message(total, stages)
    return {
        "status": "evaluated",
        "stages": stages,
        "final_score": total,
        "message": message,
    }


@asynccontextmanager
async def lifespan(application):
    from functools import partial
    from .tiny2_service import Tiny2Predictor

    # без совместимых весов сервис не запускается
    predictor = Tiny2Predictor(ARTIFACT_DIR, os.getenv("TINY2_DEVICE", "cpu"))
    application.state.evaluator = partial(evaluate_hybrid, predictor=predictor)
    yield


def not_started(*args, **kwargs):
    raise RuntimeError("Hybrid model has not been initialized")


app = create_app(not_started, title="AlfaCaseBot Hybrid API", lifespan=lifespan,
                 case_text_loader=load_case_text)
