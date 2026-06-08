import json
import os
import requests
from typing import Dict, List, Optional, Tuple
from config import OPENROUTER_API_KEY, OPENROUTER_URL, DEFAULT_MODEL, SERPER_API_KEY


# Веса для расчета финальной оценки
WEIGHTS = {
    "fact_check": 0.2,      # w1: вес факт-чекинга
    "originality": 0.25,    # w2: вес оригинальности
    "effectiveness": 0.25,  # w3: вес эффективности
    "logic": 0.15,          # w4: вес логичности
    "completeness": 0.15    # w5: вес завершенности
}


def call_llm(messages: List[Dict[str, str]], temperature: float = 0.7) -> Optional[str]:
    """
    Вызов OpenRouter LLM API с заданными сообщениями
    
    Args:
        messages: Список словарей сообщений с 'role' и 'content'
        temperature: Температура сэмплирования (0.0 до 1.0)
    
    Returns:
        Текст ответа LLM или None при ошибке
    """
    try:
        response = requests.post(
            url=OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://alfacasebot.local",
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
            print(f"LLM API error: {response.status_code} - {response.text}")
            return None
        
        response_dict = response.json()
        content = response_dict.get("choices", [{}])[0].get("message", {}).get("content")
        return content
    
    except Exception as e:
        print(f"LLM request exception: {e}")
        return None



def search_internet(query: str) -> str:
    """
    Поиск информации через Serper.dev (Google Search API)
    Бесплатно 2500 запросов/мес
    """
    try:
        response = requests.post(
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
            print(f"Serper API error: {response.status_code}")
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
        
        return "\n".join(snippets) if snippets else ""
        
    except Exception as e:
        print(f"Search error: {e}")
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
        temperature=0.1
    )
    
    # поиск
    internet_context = ""
    try:
        queries = json.loads(extraction_response).get("queries", [])
        for query in queries[:3]:
            result = search_internet(query)
            if result:
                internet_context += f"\nQuery: {query}\n{result}\n"
    except:
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
        temperature=0.3
    )
    
    if not response:
        return 70.0, "Не удалось проверить факты"
    
    try:
        result = json.loads(response)
        score = float(result.get("score", 70))
        feedback = result.get("feedback_ru", "")
        
        issues = result.get("issues", [])
        if issues:
            print(f"Fact-check issues: {issues}")
        
        return score, feedback
    except:
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
    response = call_llm(messages, temperature=0.5)
    
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
    response = call_llm(messages, temperature=0.7)
    
    if not response:
        return 75.0, "Не удалось оценить оригинальность"
    
    try:
        result = json.loads(response)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except:
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
    response = call_llm(messages, temperature=0.5)
    
    if not response:
        return 75.0, "Не удалось оценить эффективность"
    
    try:
        result = json.loads(response)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except:
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
    response = call_llm(messages, temperature=0.3)
    
    if not response:
        return 80.0, "Не удалось оценить логичность"
    
    try:
        result = json.loads(response)
        return float(result.get("score", 80)), result.get("feedback_ru", "")
    except:
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
    response = call_llm(messages, temperature=0.4)
    
    if not response:
        return 75.0, "Не удалось оценить полноту"
    
    try:
        result = json.loads(response)
        return float(result.get("score", 75)), result.get("feedback_ru", "")
    except:
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
    
    try:
        # Stage 1: Fact-checking
        fact_score, fact_feedback = evaluate_fact_checking(user_solution, case_context)
        results["stages"]["fact_check"] = {
            "score": fact_score,
            "feedback": fact_feedback
        }
        
        # Stage 2: Originality (with typical solution generation)
        typical_solution = generate_typical_solution(case_context)
        orig_score, orig_feedback = evaluate_originality(user_solution, case_context, typical_solution)
        results["stages"]["originality"] = {
            "score": orig_score,
            "feedback": orig_feedback
        }
        
        # Stage 3: Effectiveness
        eff_score, eff_feedback = evaluate_effectiveness(user_solution, case_context)
        results["stages"]["effectiveness"] = {
            "score": eff_score,
            "feedback": eff_feedback
        }
        
        # Stage 4: Logic
        logic_score, logic_feedback = evaluate_logic(user_solution, case_context)
        results["stages"]["logic"] = {
            "score": logic_score,
            "feedback": logic_feedback
        }
        
        # Stage 5: Completeness
        compl_score, compl_feedback = evaluate_completeness(user_solution, case_context)
        results["stages"]["completeness"] = {
            "score": compl_score,
            "feedback": compl_feedback
        }
        
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
        
    except Exception as e:
        print(f"Evaluation error: {e}")
        results["status"] = "error"
        results["final_score"] = 70.0
        results["message"] = "Произошла ошибка при оценке. Попробуйте ещё раз."
    
    return results
