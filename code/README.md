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
$env:CASE_ASSET_PROXY_TARGET="http://77.75.8.78:333"
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
docker run --rm -p 8080:80 alfacasebot-frontend
```

Открыть в браузере:
- `http://localhost:8080`

### Вариант 2: через Docker Compose

Compose запускает frontend и ML. Java-backend должен быть доступен на хосте по `http://localhost:8080`; уже запущенный PostgreSQL-контейнер compose не изменяет.

Запуск:
```bash
$env:OPENROUTER_API_KEY="your-key"
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


