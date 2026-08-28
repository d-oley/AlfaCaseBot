import json
import logging
import os
import re
import time
import requests
from typing import Dict, List, Optional, Tuple

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_URL = os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1/chat/completions").strip()
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://alfacasebot.it-networking.ru").strip()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "").strip()

LOGGER = logging.getLogger("ml.llm")
TRUST_ENV_PROXIES = os.getenv("ML_TRUST_ENV_PROXIES", "false").strip().lower() in {"1", "true", "yes", "on"}


# Веса для расчета финальной оценки
WEIGHTS = {
    "fact_check": 0.2,      # w1: вес факт-чекинга
    "originality": 0.25,    # w2: вес оригинальности
    "effectiveness": 0.25,  # w3: вес эффективности
    "logic": 0.15,          # w4: вес логичности
    "completeness": 0.15    # w5: вес завершенности
}


def elapsed_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)


def truncate_log(value: str, limit: int = 200) -> str:
    return value if len(value) <= limit else f"{value[:limit]}..."


def serialize_log_payload(payload, limit: int = 4000) -> str:
    if isinstance(payload, (dict, list)):
        raw_text = json.dumps(payload, ensure_ascii=False)
    else:
        raw_text = str(payload)
    return truncate_log(raw_text, limit)


def extract_json_text(raw_text: str) -> str:
    if raw_text is None:
        raise ValueError("JSON payload is empty")

    text = str(raw_text).strip()
    if not text:
        raise ValueError("JSON payload is empty")

    fenced_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced_match:
        text = fenced_match.group(1).strip()

    if text.lower().startswith("json"):
        text = text[4:].strip()

    start_positions = [index for index in (text.find("{"), text.find("[")) if index != -1]
    if not start_positions:
        return text

    start_index = min(start_positions)
    candidate = text[start_index:].strip()

    for closing_char in ("}", "]"):
        end_index = candidate.rfind(closing_char)
        if end_index != -1:
            cropped = candidate[: end_index + 1].strip()
            if cropped:
                return cropped

    return candidate


def parse_json_payload(raw_text: str):
    return json.loads(extract_json_text(raw_text))


def log_proxy_hint(exc: Exception, operation_name: str) -> None:
    if "Missing dependencies for SOCKS support" in str(exc):
        LOGGER.error(
            "proxy_configuration_error operation=%s hint=%s",
            operation_name,
            "Обнаружен SOCKS proxy без поддержки PySocks. Установите `pip install pysocks` или уберите proxy-переменные окружения перед запуском.",
        )


def log_stage_payload(stage_name: str, payload) -> None:
    LOGGER.info(
        "llm_stage_payload stage=%s payload=%s",
        stage_name,
        serialize_log_payload(payload, 2000),
    )


def create_http_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = TRUST_ENV_PROXIES
    return session


def call_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    operation_name: str = "unknown",
) -> Optional[str]:
    """
    Вызов OpenRouter LLM API с заданными сообщениями
    
    Args:
        messages: Список словарей сообщений с 'role' и 'content'
        temperature: Температура сэмплирования (0.0 до 1.0)
    
    Returns:
        Текст ответа LLM или None при ошибке
    """
    if not OPENROUTER_API_KEY:
        LOGGER.warning("openrouter_request_skipped operation=%s reason=missing_api_key", operation_name)
        return None

    started_at = time.perf_counter()
    try:
        LOGGER.info(
            "openrouter_request_started operation=%s model=%s temperature=%s messages=%s",
            operation_name,
            DEFAULT_MODEL,
            temperature,
            serialize_log_payload(messages, 5000),
        )
        response = create_http_session().post(
            url=OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": PUBLIC_SITE_URL,
                "X-Title": "AlfaCaseBot",
            },
            json={
                "model": DEFAULT_MODEL,
                "messages": messages,
                "temperature": temperature
            },
            timeout=60
        )
        
        if response.status_code != 200:
            LOGGER.warning(
                "openrouter_request_failed operation=%s model=%s status=%s duration_ms=%.2f body=%s",
                operation_name,
                DEFAULT_MODEL,
                response.status_code,
                elapsed_ms(started_at),
                truncate_log(response.text, 2000),
            )
            return None
        
        response_dict = response.json()
        content = response_dict.get("choices", [{}])[0].get("message", {}).get("content")
        LOGGER.info(
            "openrouter_request_completed operation=%s model=%s duration_ms=%.2f content_length=%s content=%s",
            operation_name,
            DEFAULT_MODEL,
            elapsed_ms(started_at),
            len(content) if content else 0,
            truncate_log(content or "", 2000),
        )
        return content
    
    except Exception as e:
        log_proxy_hint(e, operation_name)
        LOGGER.exception(
            "openrouter_request_exception operation=%s model=%s duration_ms=%.2f",
            operation_name,
            DEFAULT_MODEL,
            elapsed_ms(started_at),
        )
        return None



def search_internet(query: str) -> str:
    """
    Поиск информации через Serper.dev (Google Search API)
    Бесплатно 2500 запросов/мес
    """
    if not SERPER_API_KEY:
        LOGGER.info("serper_request_skipped reason=missing_api_key")
        return ""

    started_at = time.perf_counter()
    try:
        LOGGER.info(
            "serper_request_started query=%s",
            truncate_log(query, 500),
        )
        response = create_http_session().post(
            "https://google.serper.dev/search",
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "q": query,
                "gl": "ru",  # Россия
                "hl": "ru",  # Русский язык
                "num": 3      # Количество результатов
            },
            timeout=10
        )
        
        if response.status_code != 200:
            LOGGER.warning(
                "serper_request_failed status=%s duration_ms=%.2f query=%s",
                response.status_code,
                elapsed_ms(started_at),
                truncate_log(query, 120),
            )
            return ""
        
        data = response.json()
        
        # Собираем информацию из разных источников
        snippets = []
        
        # Knowledge Graph (если есть)
        if data.get("knowledgeGraph"):
            kg = data["knowledgeGraph"]
            title = kg.get("title", "")
            desc = kg.get("description", "")
            if title or desc:
                snippets.append(f"{title}: {desc}")
        
        # обычные результаты
        for result in data.get("organic", [])[:3]:
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            date = result.get("date", "")
            date_str = f" ({date})" if date else ""
            snippets.append(f"{title}{date_str}: {snippet}")
        
        # избранный ответ
        if data.get("answerBox"):
            ab = data["answerBox"]
            if ab.get("snippet"):
                snippets.insert(0, f"{ab.get('title', '')}: {ab['snippet']}")
        
        LOGGER.info(
            "serper_request_completed duration_ms=%.2f query=%s snippets=%s",
            elapsed_ms(started_at),
            truncate_log(query, 120),
            len(snippets),
        )
        return "\n".join(snippets) if snippets else ""
        
    except Exception as e:
        log_proxy_hint(e, "serper_search")
        LOGGER.exception(
            "serper_request_exception duration_ms=%.2f query=%s",
            elapsed_ms(started_at),
            truncate_log(query, 120),
        )
        return ""


def evaluate_fact_checking(user_solution: str, case_context: str) -> Tuple[float, str]:
    """ Проверка фактов с поиском через Serper.dev"""
    
    # извлекаем проверяемые утверждения
    extraction_prompt = f"""Extract verifiable claims to fact-check via Google. Focus on numbers, stats, company data, dates, laws, market figures.

Case: {case_context}
Solution: {user_solution}

Return JSON: {{"queries": ["query1"]}}. Empty list if nothing to check."""

    extraction_response = call_llm(
        [{"role": "user", "content": extraction_prompt}], 
        temperature=0.1,
        operation_name="fact_check_query_extraction",
    )
    
    # поиск
    internet_context = ""
    try:
        queries = parse_json_payload(extraction_response).get("queries", [])
        LOGGER.info("fact_check_queries_generated count=%s", min(len(queries), 3))
        for query in queries[:3]:
            result = search_internet(query)
            if result:
                internet_context += f"\nQuery: {query}\n{result}\n"
    except Exception:
        LOGGER.warning("fact_check_query_parsing_failed, using fallback search")
        internet_context = search_internet(user_solution[:200]) or ""
    
    # Проверка фактов
    evaluation_prompt = f"""You are an expert evaluator. Check the user's solution for factual accuracy.

Case Context:
{case_context}

User Solution:
{user_solution}

Web Search Results:
{internet_context or "No search data available"}

Task: Evaluate factual accuracy. Check for:
1. Factual errors or incorrect data
2. Unsubstantiated claims without evidence
3. Misunderstanding of the case requirements
4. Incorrect industry facts or market data

Compare claims with web search results. If data insufficient to verify, don't penalize.

Respond in JSON format:
{{
    "score": <0-100>,
    "issues": ["issue1", "issue2"],
    "feedback_ru": "Краткий отзыв на русском о фактической точности"
}}

Be strict but fair. Only penalize clear factual errors."""

    response = call_llm(
        [{"role": "user", "content": evaluation_prompt}], 
        temperature=0.3,
        operation_name="fact_check_evaluation",
    )
    
    if not response:
        return 70.0, "Не удалось проверить факты"
    
    try:
        result = parse_json_payload(response)
        score = float(result.get("score", 70))
        feedback = result.get("feedback_ru", "")
        log_stage_payload("fact_check", result)
        
        issues = result.get("issues", [])
        if issues:
            LOGGER.info("fact_check_issues_detected count=%s", len(issues))
        
        return score, feedback
    except Exception:
        LOGGER.warning(
            "fact_check_result_parsing_failed raw=%s",
            truncate_log(response, 2000),
        )
        return 70.0, "Проверка фактов завершена с ошибкой"
    


def generate_typical_solution(case_context: str) -> str:
    """
    Генерирует типичное/стандартное решение для кейса для сравнения
    Используется для оценки оригинальности
    """
    prompt = f"""Generate a typical, standard solution for this case. This should represent what an average participant would propose.

Case Context:
{case_context}

Provide a brief typical solution (3-5 key points) that represents common, expected approaches."""

    messages = [{"role": "user", "content": prompt}]
    response = call_llm(messages, temperature=0.5, operation_name="typical_solution_generation")
    LOGGER.info(
        "typical_solution_payload content=%s",
        truncate_log(response or "Typical solution: Standard approach with common industry practices.", 2000),
    )
    
    return response or "Typical solution: Standard approach with common industry practices."


def evaluate_originality(user_solution: str, case_context: str, typical_solution: str) -> Tuple[float, str]:
    """
    Этап 2: Оценка оригинальности/нетипичности
    Сравнивает решение пользователя с типичным для оценки креативности
    
    Returns:
        (оценка 0-100, отзыв на русском)
    """
    prompt = f"""You are an expert evaluator. Assess the originality of the user's solution.

Case Context:
{case_context}

Typical Solution (for reference):
{typical_solution}

User Solution:
{user_solution}

Task: Evaluate how original and creative the solution is compared to typical approaches.

Consider:
1. Novel ideas or unique perspectives
2. Creative problem-solving approaches
3. Thinking beyond standard solutions
4. Innovative application of concepts

Respond in JSON format:
{{
    "score": <0-100>,
    "unique_aspects": ["aspect1", "aspect2", ...],
    "feedback_ru": "Отзыв на русском об оригинальности решения"
}}

Give high scores for genuinely creative approaches, but don't penalize practical standard solutions too harshly."""

    messages = [{"role": "user", "content": prompt}]
    response = call_llm(messages, temperature=0.7, operation_name="originality_evaluation")
    
    if not response:
        return 75.0, "Не удалось оценить оригинальность"
    
    try:
        result = parse_json_payload(response)
        log_stage_payload("originality", result)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except Exception:
        LOGGER.warning(
            "originality_result_parsing_failed raw=%s",
            truncate_log(response, 2000),
        )
        return 75.0, "Оценка оригинальности завершена"


def evaluate_effectiveness(user_solution: str, case_context: str) -> Tuple[float, str]:
    """
    Этап 3: Оценка эффективности решения
    Оценивает насколько хорошо решение достигает бизнес-целей
    
    Returns:
        (оценка 0-100, отзыв на русском)
    """
    prompt = f"""You are an expert evaluator. Assess the effectiveness of the user's solution.

Case Context:
{case_context}

User Solution:
{user_solution}

Task: Evaluate how effectively the solution addresses the case objectives and business goals.

Consider:
1. Alignment with stated business objectives
2. Potential impact and value creation
3. Feasibility and practicality
4. Resource efficiency
5. Scalability potential

Respond in JSON format:
{{
    "score": <0-100>,
    "strengths": ["strength1", "strength2", ...],
    "weaknesses": ["weakness1", "weakness2", ...],
    "feedback_ru": "Отзыв на русском об эффективности решения"
}}"""

    messages = [{"role": "user", "content": prompt}]
    response = call_llm(messages, temperature=0.5, operation_name="effectiveness_evaluation")
    
    if not response:
        return 75.0, "Не удалось оценить эффективность"
    
    try:
        result = parse_json_payload(response)
        log_stage_payload("effectiveness", result)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except Exception:
        LOGGER.warning(
            "effectiveness_result_parsing_failed raw=%s",
            truncate_log(response, 2000),
        )
        return 75.0, "Оценка эффективности завершена"


def evaluate_logic(user_solution: str, case_context: str) -> Tuple[float, str]:
    """
    Этап 4: Оценка логичности и причинно-следственных связей
    Проверяет логическую последовательность и связи причин-эффектов
    
    Returns:
        (оценка 0-100, отзыв на русском)
    """
    prompt = f"""You are an expert evaluator. Assess the logical consistency of the user's solution.

Case Context:
{case_context}

User Solution:
{user_solution}

Task: Evaluate the logical structure and cause-effect relationships in the solution.

Consider:
1. Logical flow and coherence
2. Clear cause-effect relationships
3. Consistency of arguments
4. Absence of logical contradictions
5. Sound reasoning

Respond in JSON format:
{{
    "score": <0-100>,
    "logic_issues": ["issue1", "issue2", ...],
    "feedback_ru": "Отзыв на русском о логичности решения"
}}"""

    messages = [{"role": "user", "content": prompt}]
    response = call_llm(messages, temperature=0.3, operation_name="logic_evaluation")
    
    if not response:
        return 80.0, "Не удалось оценить логичность"
    
    try:
        result = parse_json_payload(response)
        log_stage_payload("logic", result)
        return float(result.get("score", 80)), result.get("feedback_ru", "")
    except Exception:
        LOGGER.warning(
            "logic_result_parsing_failed raw=%s",
            truncate_log(response, 2000),
        )
        return 80.0, "Оценка логичности завершена"


def evaluate_completeness(user_solution: str, case_context: str) -> Tuple[float, str]:
    """
    Stage 5: Completeness evaluation
    Checks if the solution covers all required aspects and has tangible results
    
    Returns:
        (score 0-100, feedback_ru)
    """
    prompt = f"""You are an expert evaluator. Assess the completeness of the user's solution.

Case Context:
{case_context}

User Solution:
{user_solution}

Task: Evaluate how complete and comprehensive the solution is.

Consider:
1. Coverage of all required components from case context
2. Presence of tangible, actionable results
3. Sufficient level of detail
4. Addressing all target audience needs
5. Complete end-to-end solution

Respond in JSON format:
{{
    "score": <0-100>,
    "covered_aspects": ["aspect1", "aspect2", ...],
    "missing_aspects": ["missing1", "missing2", ...],
    "feedback_ru": "Отзыв на русском о полноте решения"
}}"""

    messages = [{"role": "user", "content": prompt}]
    response = call_llm(messages, temperature=0.4, operation_name="completeness_evaluation")
    
    if not response:
        return 75.0, "Не удалось оценить полноту"
    
    try:
        result = parse_json_payload(response)
        log_stage_payload("completeness", result)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except Exception:
        LOGGER.warning(
            "completeness_result_parsing_failed raw=%s",
            truncate_log(response, 2000),
        )
        return 75.0, "Оценка полноты завершена"


def generate_feedback_message(final_score: float, stage_results: Dict) -> str:
    """
    Generate encouraging feedback message with hints (not explicit errors)
    According to requirements: "мы не выписываем конкретные ошибки. мы намекаем!!"
    
    Returns:
        Feedback message in Russian
    """
    # Determine overall tone based on score
    if final_score >= 90:
        opening = "Отличная работа! 🎉"
    elif final_score >= 80:
        opening = "Хорошее решение! 👍"
    elif final_score >= 70:
        opening = "Неплохо, но есть куда расти! 💪"
    elif final_score >= 60:
        opening = "Это начало, продолжайте развивать идею! 🌱"
    else:
        opening = "Интересные мысли, но стоит углубиться! 🤔"
    
    # Collect hints from different stages
    hints = []
    
    # Fact-checking hints
    fact_score = stage_results.get("fact_check", {}).get("score", 70)
    if fact_score < 80:
        hints.append("Возможно, стоит ещё раз проверить некоторые данные и факты")
    
    # Originality hints
    orig_score = stage_results.get("originality", {}).get("score", 75)
    if orig_score < 75:
        hints.append("Подумайте о более нестандартных подходах к решению задачи")
    
    # Effectiveness hints
    eff_score = stage_results.get("effectiveness", {}).get("score", 75)
    if eff_score < 75:
        hints.append("Обратите внимание на практическую реализуемость и бизнес-ценность")
    
    # Logic hints
    logic_score = stage_results.get("logic", {}).get("score", 80)
    if logic_score < 80:
        hints.append("Проверьте логическую последовательность аргументов")
    
    # Completeness hints
    compl_score = stage_results.get("completeness", {}).get("score", 75)
    if compl_score < 75:
        hints.append("Возможно, некоторые аспекты задачи требуют более детальной проработки")
    
    # Build final message
    message_parts = [opening]
    
    if hints:
        message_parts.append("\n\nНа что стоит обратить внимание:")
        for hint in hints[:3]:  # Limit to 3 hints
            message_parts.append(f"• {hint}")
    else:
        message_parts.append("\n\nВаше решение выглядит сбалансированным и продуманным!")
    
    message_parts.append("\n\nПродолжайте развивать свои навыки решения кейсов! 🚀")
    
    return "\n".join(message_parts)


def evaluate_solution(user_solution: str, case_context: str) -> Dict:
    """
    Main evaluation function that runs all stages and calculates final score
    
    Args:
        user_solution: User's solution text
        case_context: Case context description
    
    Returns:
        Dict with evaluation results including score, stage details, and feedback
    """
    results = {
        "status": "evaluated",
        "stages": {},
        "final_score": 0,
        "message": ""
    }
    started_at = time.perf_counter()
    LOGGER.info(
        "evaluation_started text_length=%s context_length=%s user_solution=%s",
        len(user_solution or ""),
        len(case_context or ""),
        truncate_log(user_solution or "", 3000),
    )
    
    try:
        # Stage 1: Fact-checking
        fact_score, fact_feedback = evaluate_fact_checking(user_solution, case_context)
        results["stages"]["fact_check"] = {
            "score": fact_score,
            "feedback": fact_feedback
        }
        LOGGER.info(
            "evaluation_stage_completed stage=fact_check score=%s feedback=%s",
            fact_score,
            truncate_log(fact_feedback, 1000),
        )
        
        # Stage 2: Originality (with typical solution generation)
        typical_solution = generate_typical_solution(case_context)
        orig_score, orig_feedback = evaluate_originality(user_solution, case_context, typical_solution)
        results["stages"]["originality"] = {
            "score": orig_score,
            "feedback": orig_feedback
        }
        LOGGER.info(
            "evaluation_stage_completed stage=originality score=%s feedback=%s",
            orig_score,
            truncate_log(orig_feedback, 1000),
        )
        
        # Stage 3: Effectiveness
        eff_score, eff_feedback = evaluate_effectiveness(user_solution, case_context)
        results["stages"]["effectiveness"] = {
            "score": eff_score,
            "feedback": eff_feedback
        }
        LOGGER.info(
            "evaluation_stage_completed stage=effectiveness score=%s feedback=%s",
            eff_score,
            truncate_log(eff_feedback, 1000),
        )
        
        # Stage 4: Logic
        logic_score, logic_feedback = evaluate_logic(user_solution, case_context)
        results["stages"]["logic"] = {
            "score": logic_score,
            "feedback": logic_feedback
        }
        LOGGER.info(
            "evaluation_stage_completed stage=logic score=%s feedback=%s",
            logic_score,
            truncate_log(logic_feedback, 1000),
        )
        
        # Stage 5: Completeness
        compl_score, compl_feedback = evaluate_completeness(user_solution, case_context)
        results["stages"]["completeness"] = {
            "score": compl_score,
            "feedback": compl_feedback
        }
        LOGGER.info(
            "evaluation_stage_completed stage=completeness score=%s feedback=%s",
            compl_score,
            truncate_log(compl_feedback, 1000),
        )
        
        # Calculate final weighted score: w1*x1 + w2*x2 + w3*x3 + w4*x4 + w5*x5
        final_score = (
            WEIGHTS["fact_check"] * fact_score +
            WEIGHTS["originality"] * orig_score +
            WEIGHTS["effectiveness"] * eff_score +
            WEIGHTS["logic"] * logic_score +
            WEIGHTS["completeness"] * compl_score
        )
        
        results["final_score"] = round(final_score, 1)
        
        results["message"] = generate_feedback_message(final_score, results["stages"])
        log_stage_payload("ml_final_evaluation", results)
        LOGGER.info(
            "evaluation_completed final_score=%s duration_ms=%.2f",
            results["final_score"],
            elapsed_ms(started_at),
        )
        
    except Exception as e:
        LOGGER.exception("evaluation_failed duration_ms=%.2f", elapsed_ms(started_at))
        results["status"] = "error"
        results["final_score"] = 70.0
        results["message"] = "Произошла ошибка при оценке. Попробуйте ещё раз."
    
    return results
