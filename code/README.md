# Сайт AlfaCaseBot

Сайт написан на Vue 3. Команды ниже выполняются из каталога `code`.

## Запуск на компьютере

Нужны Node.js 18 или новее и npm.

```powershell
npm install
npm run serve
```

Откройте `http://localhost:8081`. По умолчанию сайт отправляет запросы к Java на `http://localhost:8080`, к сервису оценки на `http://localhost:5000`, а за файлами кейсов - на `http://localhost:333`. Если они работают на других адресах, задайте `BACKEND_PROXY_TARGET`, `ML_PROXY_TARGET` и `CASE_ASSET_PROXY_TARGET` до запуска. Пример переменных есть в `.env.example`.

Чтобы посмотреть сайт без этих сервисов, запустите `npm run serve:mock`. Используются примерные кейсы и профиль из `src/mocks/mockData.json`.

Другие команды:

- `npm run lint` - проверить исходники;
- `npm run build` - собрать сайт в `dist`;
- `npm run serve:public` - собрать сайт и запустить сервер на порту 8081 для публичного туннеля, без автоматической перезагрузки страницы.

Для публичного адреса укажите `PUBLIC_HOSTNAME`. Если нужен ручной контроль перезагрузки, задайте `DEV_SERVER_HMR=false`. Эти параметры используются сервером разработки. Они не попадают в браузерный код.

## Запуск в Docker

`docker-compose.yml` запускает сайт и смешанную оценку: RuBERT Tiny2 выставляет баллы за эффективность, логику и полноту; OpenRouter оценивает остальные критерии и формирует отзыв. Java и хранилище файлов запускаются отдельно.

Перед запуском положите веса `rubert_tiny2_multitask.pt`, `config.json` и каталог `tokenizer` в `../ml/artifacts/rubert_tiny2_multitask/`. Также нужен `../ml/artifacts/best_censor_model.joblib`. Веса Tiny2 в Git не хранятся. Задайте `ML_SERVICE_TOKEN` (тот же, что у Java) и `OPENROUTER_API_KEY`. Для поиска при проверке фактов задайте `SERPER_API_KEY`.

```powershell
$env:ML_SERVICE_TOKEN="значение-как-в-Java"
$env:OPENROUTER_API_KEY="ваш-ключ"
docker compose up --build -d
```

Сайт будет доступен на `http://localhost:8081`, проверка сервиса оценки - на `http://localhost:5000/health`. По умолчанию контейнеры обращаются к Java по `host.docker.internal:999`, а к её файловому прокси - по `host.docker.internal:2479`. Для других адресов задайте `BACKEND_UPSTREAM` и `ASSET_UPSTREAM` в формате `хост:порт`.

Остановка: `docker compose down`.
