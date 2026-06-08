# AlfaCaseBot ML Service - README

## Описание

ML-сервис для оценки решений кейсов с использованием LLM (Large Language Model).

## Компоненты системы

### 1. `case_contexts.py`
Система контекстов для каждого кейса. Содержит подробное описание требований, целей и критериев оценки для всех 7 кейсов.

**Как добавить новый кейс:**
```python
from case_contexts import add_case_context

add_case_context(
    case_id=8,
    title="Название кейса",
    context="Подробный контекст кейса..."
)
```

### 2. `llm_service.py`
Многоэтапная система оценки решений с использованием LLM:

**Этапы оценки:**
1. **Факт-чекинг** (вес 0.2) - проверка фактической точности
2. **Оригинальность** (вес 0.25) - оценка нетипичности решения
3. **Эффективность** (вес 0.25) - оценка бизнес-ценности
4. **Логичность** (вес 0.15) - проверка причинно-следственных связей
5. **Завершенность** (вес 0.15) - полнота решения

**Финальная оценка:**
```
score = 0.2*fact + 0.25*orig + 0.25*eff + 0.15*logic + 0.15*compl
```

**Генерация обратной связи:**
- Система НЕ указывает конкретные ошибки
- Даёт наводящие подсказки (hints)
- Мотивирует на улучшение

### 3. `app.py`
Flask API для интеграции с фронтендом и бэкендом.

**Основные endpoint'ы:**
- `GET /health` - проверка работоспособности
- `POST /evaluate` - оценка решения кейса

## Установка

```bash
cd alfacasebot/ml
pip install -r requirements.txt
```

## Конфигурация

Установите переменную окружения с API-ключом OpenRouter:
```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

Или измените ключ в `llm_service.py` (не рекомендуется для production).

## Запуск

```bash
python app.py
```

Сервис будет доступен на `http://localhost:5000`

## Пример использования API

### Запрос
```bash
curl -X POST http://localhost:5000/evaluate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "text": "Моё решение кейса...",
    "case_id": 6
  }'
```

### Ответ (успех)
```json
{
  "status": "accepted",
  "message": "Хорошее решение! 👍\n\nНа что стоит обратить внимание:...",
  "case_id": 6,
  "rating": 78,
  "evaluation": {
    "stages": {
      "fact_check": {"score": 82, "feedback": "..."},
      "originality": {"score": 75, "feedback": "..."},
      "effectiveness": {"score": 80, "feedback": "..."},
      "logic": {"score": 78, "feedback": "..."},
      "completeness": {"score": 76, "feedback": "..."}
    },
    "final_score": 78
  }
}
```

### Ответ (токсичность)
```json
{
  "status": "toxic",
  "message": "Обнаружены недопустимые формулировки...",
  "case_id": 6,
  "user_banned": false
}
```

## Архитектура оценки

```
User Solution
     ↓
[Toxicity Check] → если токсично → отклонено
     ↓
[LLM Evaluation] → 5 этапов параллельно
     ↓
  ├─ Fact Checking (weight: 0.20)
  ├─ Originality (weight: 0.25)
  ├─ Effectiveness (weight: 0.25)
  ├─ Logic (weight: 0.15)
  └─ Completeness (weight: 0.15)
     ↓
[Weighted Score Calculation]
     ↓
[Hint Generation] → мягкие подсказки
     ↓
Final Response
```

## Настройка весов оценки

Веса можно изменить в `llm_service.py`:
```python
WEIGHTS = {
    "fact_check": 0.2,
    "originality": 0.25,
    "effectiveness": 0.25,
    "logic": 0.15,
    "completeness": 0.15
}
```

## Экономия токенов

1. **Промпты на английском** - более эффективное использование токенов
2. **Финальный ответ на русском** - для пользователя
3. **Структурированный JSON output** - легко парсится
4. **Температура настроена** - баланс между креативностью и стабильностью
5. **Используется gpt-4o-mini** - экономичная модель

## Интеграция с фронтендом

Фронтенд отправляет решение через `evaluateCaseSolution()` в `authApi.js`.
Ответ отображается в чате на `CaseChatPage.vue` с рейтингом и обратной связью.

## Безопасность

1. Проверка cookie через бэкенд Java
2. Проверка токсичности перед LLM оценкой
3. Ограничение по времени запросов (timeout: 60s)
4. Обработка ошибок на всех этапах
