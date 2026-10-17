# Сервис оценки AlfaCaseBot

Сервис принимает решение кейса, проверяет его и передаёт результат Java-серверу. Код приложения лежит в `api/`, данные и ноутбуки для обучения - в `training/`, сохранённые модели - в `artifacts/`. Команды ниже выполняются из каталога `ml`.

## Запуск

Нужен Python и зависимости из соответствующего файла. Базовый вариант оценивает все пять критериев через OpenRouter:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn api.llm_only_app:app --host 127.0.0.1 --port 5000
```

Смешанный вариант использует RuBERT Tiny2 для эффективности, логики и полноты; проверка фактов, оригинальность и итоговый отзыв остаются за OpenRouter:

```powershell
pip install -r requirements-hybrid.txt
uvicorn api.hybrid_app:app --host 127.0.0.1 --port 5000
```

До запуска задайте `ML_SERVICE_TOKEN` и `OPENROUTER_API_KEY` в окружении процесса. Первый должен совпадать с токеном Java. Если нужен поиск для проверки фактов, задайте `SERPER_API_KEY`. По умолчанию Java ожидается на `http://localhost:8080`; другой адрес задаётся через `BACKEND_BASE_URL`. Сервис не загружает `.env` автоматически.

Для смешанного варианта в `artifacts/rubert_tiny2_multitask/` нужны `rubert_tiny2_multitask.pt`, `config.json` и `tokenizer/`. Путь можно изменить через `TINY2_ARTIFACT_DIR`, устройство - через `TINY2_DEVICE` (по умолчанию `cpu`). Весов Tiny2 нет в Git. Обоим вариантам нужен `artifacts/best_censor_model.joblib`.

Проверить запуск можно по `http://localhost:5000/health`; описание запросов открывается на `http://localhost:5000/docs`.

## Как проходит оценка

`POST /evaluate` принимает текст решения и `case_id` (также поддерживается `caseId`). Сервис проверяет пользовательскую cookie и получает данные кейса из Java. Для смешанного варианта требуется полное условие в `fullDescription`. Эталонное решение используется только для оценки оригинальности и не возвращается участнику. Затем сервис сохраняет оценку и отзыв в Java.

Итог складывается из пяти оценок: проверка фактов - 20%, оригинальность - 25%, эффективность - 25%, логика - 15%, полнота - 15%. Если необходимые данные или модель недоступны, результат не сохраняется. Для связи с Java используется `X-ML-Service-Token`; не передавайте его в браузерные переменные `VUE_APP_*`.

Изменить адреса и поведение можно переменными `CASE_PATH_TEMPLATE`, `PERFECT_SOLUTION_PATH_TEMPLATE`, `PUBLIC_CASE_PATH_TEMPLATE`, `BACKEND_TIMEOUT`, `OPENROUTER_MODEL`, `OPENROUTER_URL`, `PUBLIC_SITE_URL`, `ML_CORS_ORIGINS` и `ML_TRUST_ENV_PROXIES`. Их значения по умолчанию находятся в `api/llm_only_app.py`, `api/hybrid_app.py` и `api/llm_service.py`.

## Обучение и проверки

Ноутбуки в `training/` показывают подготовку данных и сравнение моделей. Для отдельного окружения обучения установите `training/requirements.txt`. Запускайте ноутбуки из каталога `training`, чтобы относительные пути к данным и артефактам работали правильно. Обучение не требуется для обычного запуска сервиса с готовыми моделями.

Тесты находятся в `tests/`; запустить их можно командой `python -m pytest tests`.
