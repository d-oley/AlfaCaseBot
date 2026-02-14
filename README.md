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

### 2) Запустить dev-сервер
```bash
npm run serve
```

После запуска открыть:
- `http://localhost:8080`

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

По умолчанию фронтенд обращается к:
- `http://localhost:8080`

Если делаем другой адрес, задаем переменную окружения `VUE_APP_API_BASE_URL`.

Пример для **Windows PowerShell**:
```powershell
$env:VUE_APP_API_BASE_URL="http://localhost:8080"
npm run serve
```

---

## Запуск через Docker (gpt inspired инструкция (^人^))

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

### Вариант 2: через Docker Compose (рекомендуется)

Запуск:
```bash
docker compose up --build -d
```

Остановка:
```bash
docker compose down
```

---

## Структура Docker-файлов

- `Dockerfile` — multi-stage сборка (Node -> Nginx)
- `nginx.conf` — конфигурация Nginx для SPA
- `docker-compose.yml` — удобный запуск контейнера
- `.dockerignore` — исключения из docker-контекста

---
