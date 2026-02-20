# Устройство и использование

## Компоненты
- API (`FastAPI`) принимает запросы и управляет жизненным циклом ingestion.
- Worker (`Taskiq`) обрабатывает документы в фоне.
- PostgreSQL хранит метаданные документов, групп и ingestion-задач.
- Qdrant хранит векторный индекс чанков.
- Redis используется как брокер очередей.
- LLM/Embeddings provider выбирается через `LLM_PROVIDER` (`ollama`, `lmstudio` или `openai`).

## Основной поток данных
1. Создание группы документов.
2. Загрузка файлов (`upload`) или архива (`zip`).
3. Постановка ingestion-задачи в очередь.
4. Парсинг и чанкование текста.
5. Индексация в Qdrant и сохранение статуса в PostgreSQL.
6. Поиск/чат/генерация черновика поверх извлечённого контекста.

## API (базовый префикс: `/v1`)
Все endpoints требуют заголовок:
```http
X-API-Key: <ваш API_KEY>
```

Ключевые методы:
- `POST /v1/groups` — создать группу
- `GET /v1/groups` — список групп
- `POST /v1/groups/{group_id}/ingestions/upload` — загрузка файлов
- `POST /v1/groups/{group_id}/ingestions/zip` — загрузка ZIP
- `GET /v1/ingestions/{ingestion_id}` — статус ingestion
- `POST /v1/search` — семантический поиск
- `POST /v1/chat` — ответ с цитатами
- `POST /v1/drafts/generate` — генерация черновика
- `GET /v1/documents/{document_id}` — метаданные документа
- `GET /v1/health` — проверка API/БД

## Минимальный сценарий использования
1. Создайте группу: `POST /v1/groups`.
2. Загрузите документы в эту группу.
3. Дождитесь статуса `completed` у ingestion.
4. Выполните `POST /v1/search` или `POST /v1/chat`.
5. При необходимости сгенерируйте черновик через `POST /v1/drafts/generate`.
