# AlfaCaseBot ML API

FastAPI-сервис проверяет решение на токсичность, оценивает его через LLM и сохраняет результат в Java-backend.

## Запуск

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

После запуска доступны:

- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/docs`
- OpenAPI: `http://localhost:5000/openapi.json`
- health-check: `GET http://localhost:5000/health`

Для Docker:

```powershell
docker build -t alfacasebot-ml .
docker run --rm -p 5000:5000 `
  -e BACKEND_BASE_URL=http://host.docker.internal:8080 `
  -e OPENROUTER_API_KEY=your-key `
  alfacasebot-ml
```

## Переменные окружения

| Переменная | Значение по умолчанию | Назначение |
|---|---|---|
| `ML_MODEL_PATH` | `artifacts/best_model.joblib` | Путь к joblib-артефакту модели токсичности |
| `BACKEND_BASE_URL` | `http://localhost:8080` | Java-backend |
| `CASE_PATH_TEMPLATE` | `/api/v1/cases/{case_id}` | Шаблон запроса контекста кейса из Java |
| `BACKEND_TIMEOUT` | `10` | timeout запросов к backend, секунд |
| `OPENROUTER_API_KEY` | пусто | ключ OpenRouter |
| `OPENROUTER_URL` | `https://openrouter.ai/api/v1/chat/completions` | URL OpenRouter |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | модель оценки |
| `SERPER_API_KEY` | пусто | ключ факт-чекинга Serper |
| `ML_CORS_ORIGINS` | localhost на портах 8080/8081 | разрешённые origin через запятую |
| `ML_TRUST_ENV_PROXIES` | `false` | использовать proxy из окружения |
| `ML_LOG_LEVEL` | `INFO` | уровень логирования |

Секреты читаются только из окружения. `config.py` и `.env*` исключены из Docker context.

## API

### `GET /health`

```json
{
  "status": "ok",
  "model_loaded": true,
  "llm_configured": true
}
```

Без `OPENROUTER_API_KEY` health-check остаётся доступным, а попытка оценки возвращает HTTP 503 с кодом `LLM_NOT_CONFIGURED`; фиктивная оценка в backend не сохраняется.

### `POST /evaluate`

Сервис принимает `case_id` и совместимый alias `caseId`. Cookie `token` должна прийти от браузера в заголовке `Cookie`; для серверных клиентов также поддержан `X-Auth-Cookie`.

```json
{
  "text": "Моё решение кейса...",
  "case_id": 6
}
```

Успешный ответ:

```json
{
  "status": "accepted",
  "message": "Хорошее решение!",
  "case_id": 6,
  "rating": 78,
  "evaluation": {
    "stages": {},
    "final_score": 78
  },
  "llm_meta": {
    "case_id": 6,
    "text_length": 24
  }
}
```

Перед оценкой FastAPI вызывает `GET /api/text/v1/checkCookie`, затем получает `promptContextEn` через `GET /api/v1/cases/{case_id}`. После оценки он отправляет в Java `POST /api/text/v1/addScore` со всеми обязательными полями:

```json
{
  "caseId": 6,
  "rating": 78,
  "solutionText": "Моё решение кейса...",
  "solutionResponse": "Хорошее решение!"
}
```

При токсичности вызывается `POST /api/text/v1/processViolation`. Если backend блокирует пользователя и удаляет cookie, заголовок `Set-Cookie` передаётся браузеру.

## Локальный запуск пайплайна

Оценку без сайта и backend можно запустить так:

```powershell
python local_ml_runner.py --case-id 6 --text "Текст решения"
```

Локальный runner использует те же функции токсичности и LLM, что и FastAPI.
