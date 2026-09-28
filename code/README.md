# AlfaCaseBot Frontend

Фронтенд проекта **AlfaCaseBot** на Vue 3.

## Что нужно для запуска

- `Node.js` 18+ (рекомендуется 20)
- `npm`
- `Docker` и `Docker Compose`

---

## Быстрый старт (локально)

### 1) Установить зависимости
```bash
npm install
```

### 2) Запустить dev-сервер (в папке code)
```bash
npm run serve
```

После запуска открыть:
- `http://localhost:8081`

---

## Основные команды

### Запуск в режиме разработки
```bash
npm run serve
```

### Сборка production-версии
```bash
npm run build
```

### Публичный запуск через Cloudflare Tunnel

```bash
npm run serve:public
```

Команда собирает production-версию и запускает её на порту `8081` без HMR,
WebSocket и автоматических перезагрузок. `/api`, `/evaluate` и `/storage`
проксируются так же, как при локальной разработке.

### Проверка линтером
```bash
npm run lint
```

---

## Настройка URL backend API

По умолчанию dev-сервер фронта:
- запускается на `http://localhost:8081`
- проксирует запросы `/api/*` на backend `http://localhost:8080`
- проксирует запросы `/evaluate` на FastAPI service `http://localhost:5000`

Если сервисы запущены на других адресах, задайте:
- `BACKEND_PROXY_TARGET` (адрес Java для Node-прокси)
- `ML_PROXY_TARGET` (адрес FastAPI для Node-прокси)
- `CASE_ASSET_PROXY_TARGET` (адрес файлового сервиса для Node-прокси)
- `VUE_APP_CASE_ASSET_BASE_URL` (same-origin путь файлов, обычно `/storage/alfa-cases`)
- `PUBLIC_HOSTNAME` (публичный hostname, разрешённый dev-сервером)
- `DEV_SERVER_HMR` (`false` для публичного туннеля, чтобы исключить циклы reload)

Переменные адресов прокси не имеют префикса `VUE_APP_`, чтобы внутренние адреса
сервисов не попадали в JavaScript браузера.

Пример для **Windows PowerShell**:
```powershell
$env:BACKEND_PROXY_TARGET="http://77.75.8.78:999"
$env:ML_PROXY_TARGET="http://127.0.0.1:8000"
$env:CASE_ASSET_PROXY_TARGET="http://77.75.8.78:2479"
$env:VUE_APP_CASE_ASSET_BASE_URL="/storage/alfa-cases"
$env:PUBLIC_HOSTNAME="alfacasebot.it-networking.ru"
$env:DEV_SERVER_HMR="false"
npm run serve
```

---

## Запуск через Docker

### Вариант 1: через `docker build` + `docker run`

Собрать образ:
```bash
docker build -t alfacasebot-frontend .
```

Запустить контейнер:
```bash
docker run --rm --add-host host.docker.internal:host-gateway -p 8080:80 alfacasebot-frontend
```

При таком отдельном запуске Java API, прокси к MinIO и ML должны быть доступны на хосте через порты `999`, `2479` и `5000` соответственно. При других адресах передайте контейнеру `BACKEND_UPSTREAM`, `ASSET_UPSTREAM` и `ML_UPSTREAM` через `-e`.

Открыть в браузере:
- `http://localhost:8080`

### Вариант 2: через Docker Compose

Compose запускает frontend и гибридный ML: RuBERT Tiny2 оценивает три критерия локально, а OpenRouter используется для остальных. Java-backend, PostgreSQL, Redis и MinIO запускаются отдельно. По умолчанию Java доступна на хосте через порт `999`, а её прокси к MinIO — через порт `2479` (как в `Alfa-case5-backend/main/docker-compose.yml`). Если адреса другие, задайте `BACKEND_UPSTREAM` и `ASSET_UPSTREAM` в формате `хост:порт`. Имя `host.docker.internal` добавлено для Linux через `host-gateway`.

Перед сборкой проверьте наличие `../ml/artifacts/rubert_tiny2_multitask/rubert_tiny2_multitask.pt`, `config.json`, каталога `tokenizer` и `../ml/artifacts/best_censor_model.joblib`. Checkpoint Tiny2 локальный и не входит в Git: без него сборка образа не создаст работающий гибридный сервис. Секрет `ML_SERVICE_TOKEN` должен совпадать с Java; для LLM нужен `OPENROUTER_API_KEY`. `SERPER_API_KEY` нужен для поиска при фактчекинге.

Запуск:
```bash
$env:OPENROUTER_API_KEY="your-key"
$env:ML_SERVICE_TOKEN="same-token-as-java"
docker compose up --build -d
```

Остановка:
```bash
docker compose down
```

Проверка:

- frontend: `http://localhost:8081`
- FastAPI Swagger: `http://localhost:5000/docs`
- FastAPI health-check: `http://localhost:5000/health`

Compose ожидает успешной загрузки обеих локальных моделей и настройки OpenRouter, прежде чем запустить frontend. Порт ML опубликован только на `127.0.0.1`; браузер обращается к нему через frontend. При сборке на этом же сервере потребуется дополнительное место для Docker-кеша и образов.


