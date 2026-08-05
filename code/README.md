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
- `VUE_APP_BACKEND_PROXY_TARGET` (для локальной разработки через proxy)
- `VUE_APP_ML_PROXY_TARGET` (для локальной разработки через proxy)
- или `VUE_APP_API_BASE_URL` (для прямого обращения без proxy)
- или `VUE_APP_ML_API_BASE_URL` (для прямого обращения к Python service)
- `VUE_APP_CASE_ASSET_BASE_URL` (базовый URL MinIO для PDF и JPEG, например `http://IP:333/alfa-cases`)

Пример для **Windows PowerShell**:
```powershell
$env:VUE_APP_API_BASE_URL="http://localhost:8080"
$env:VUE_APP_ML_API_BASE_URL="http://localhost:5000"
$env:VUE_APP_CASE_ASSET_BASE_URL="http://localhost:333/alfa-cases"
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


