# Intelligent Document Checker

Понятное описание проекта: что это, как работает сейчас, зачем нужен Neo4j, как пользоваться 5 вкладками интерфейса и как устроен код.

## 1) Что это за система

`Intelligent Document Checker` — это веб-приложение для проверки учебных документов (PDF/DOCX) по формальным требованиям.

Система делает полный цикл:
1. Принимает файл.
2. Запускает проверку.
3. Показывает статус и прогресс.
4. Отдает отчет по проверке.
5. Позволяет преподавателю отправить правки.
6. Сохраняет правки как кейсы, чтобы AI мог использовать их в следующих анализах.

Ключевая идея: нормативные правила хранятся в графовой БД (`Neo4j`), а API и UI работают поверх них.

---

## 2) Важно: текущее состояние реализации

Чтобы не было ложных ожиданий, это текущий факт по коду:

1. Пайплайн анализа уже рабочий по API и состояниям (`ANALYZING -> ... -> REPORT_READY`).
2. Выбор правил из Neo4j уже работает.
3. Отчеты, статусы, правки преподавателя и сохранение correction cases уже работают.
4. AI-адаптация подключаемая (через `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`) и имеет fallback в `RULE_ONLY`.
5. Проверка требований уже реализована детерминированно для базовых условий:
- обязательные разделы (`required_section`);
- правило шрифта (`font_rule`).

Отчет `compliant` теперь формируется только если нарушения не обнаружены по примененным правилам.

---

## 3) Технологический стек

### Frontend
- React 18 + TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- Zod
- Vitest + Testing Library

### Backend
- Python 3.12
- FastAPI
- Pydantic v2
- Neo4j Python Driver
- HTTPX + Tenacity (для внешнего AI API)

### Data / Infra
- Neo4j для базы знаний и результатов проверки
- Локальное файловое хранилище для загруженных документов (`backend/storage/documents`)

---

## 4) Ключевые идентификаторы

1. `document_id` — ID загруженного документа.
2. `check_id` — ID конкретного запуска анализа.
3. `case_id` — ID кейса правок преподавателя (`CorrectionCase`).

Обычно поток такой: сначала получаем `document_id`, потом по нему запускаем анализ и получаем `check_id`, дальше по `check_id` читаем статус/отчет/правила и отправляем правки.

---

## 5) Как работает система по шагам

1. `POST /api/v1/documents/upload`
- Загружает файл.
- Сохраняет файл на диск.
- Создает узел `Document` в Neo4j.

2. `POST /api/v1/analyses/start`
- Создает `Check` и связывает его с `Document`.
- Запускает фоновой pipeline.

3. Фоновый pipeline
- `parse(document_id)`
- `detect_document_type(...)`
- `detect_semester(...)`
- `select_rules(...)`
- `check_requirements(...)`
- `build_report(...)`

4. `GET /api/v1/analyses/{check_id}`
- Возвращает текущий статус и прогресс.

5. `GET /api/v1/reports/{check_id}`
- Возвращает итоговый отчет.

6. `POST /api/v1/feedback/corrections`
- Сохраняет правки преподавателя как `CorrectionCase`.
- Опционально вызывает AI-адаптацию и возвращает `ai_mode` (`ADAPTED` или `RULE_ONLY`).

### 5.1 Что именно сейчас делает `parse()` (важно)
Парсинг в `backend/app/infrastructure/pipeline/deterministic_pipeline.py` работает по реальному файлу, который был загружен на этапе `POST /documents/upload`.

Технически:
1. `parse()` принимает `document_id`.
2. По `document_id` читается запись `Document` из Neo4j (`get_document_by_id.cypher`) и берется `storage_path`.
3. Дальше вызывается `UnifiedDocumentParser`:
- для `docx`: извлекаются текст, абзацы/заголовки, шрифты и размеры;
- для `pdf`: извлекаются текст, возможные заголовки, шрифты и размеры (PyMuPDF; fallback через pypdf).
4. В `ParsedDocument.features` сохраняются:
- `tokens`, `length`, `sections`, `sections_normalized`;
- `dominant_font_family`, `dominant_font_size`;
- исходные `font_families`, `font_sizes`.

Что это значит на практике:
1. Пайплайн читает фактическое содержимое PDF/DOCX, а не только идентификатор документа.
2. Разделы и шрифтовые признаки используются в проверках требований.
3. При отсутствии парсера/данных включается безопасный fallback, чтобы анализ не падал на ровном месте.

### 5.2 Откуда берутся правила и как они выбираются
Правила берутся из Neo4j, не из hardcode в frontend/backend-роутах.

Выбор правил делает `select_rules()` -> `RuleReadRepository` -> запрос:
`neo4j/queries/get_rules_by_type_and_semester.cypher`.

Правило попадет в проверку только если одновременно выполняется:
1. `Requirement.is_active = true`.
2. Есть связь `(:Requirement)-[:APPLIES_TO_TYPE]->(:DocumentType {code: ...})`.
3. Есть связь `(:Requirement)-[:APPLIES_TO_SEMESTER]->(:Semester {number: ...})`.

Именно поэтому важны не только поля правила, но и связи в графе.

### 5.3 Как сейчас идет сама проверка требований
`check_requirements(parsed_document, requirements)` применяет rule-engine к каждому правилу из Neo4j:

1. `required_section`:
- проверяет наличие обязательного раздела (например, `introduction`, `conclusion`);
- учитывает нормализованные заголовки и текстовые совпадения;
- если раздел отсутствует, создаёт `Violation` с evidence.

2. `font_rule`:
- берёт доминирующее семейство и размер шрифта из признаков документа;
- сравнивает с требованием (например, `Times New Roman`, `14`);
- при расхождении формирует `Violation` с деталями expected/actual.

По результату:
1. если нарушения есть, `overall_status = partially_compliant`;
2. если нарушений нет, `overall_status = compliant`;
3. рекомендации формируются для каждого применённого правила.

### 5.4 Как добавить или изменить правила в БЗ (Neo4j)
Есть два рабочих способа.

Способ A: через seed-файл (рекомендуется для репозитория)
1. Откройте `neo4j/data/seed_requirements.cypher`.
2. Добавьте/обновите `MERGE (r:Requirement {code: ...})` с нужными полями:
- `title`
- `category`
- `severity`
- `condition_json`
- `message_template`
- `recommendation`
- `version`
- `is_active`
3. Добавьте связи правила к типу документа и семестру:
- `MERGE (r)-[:APPLIES_TO_TYPE]->(type)`
- `MERGE (r)-[:APPLIES_TO_SEMESTER]->(semester)`
4. Примените изменения:
- либо перезапустите backend с `NEO4J_INIT_ON_STARTUP=true`,
- либо вручную выполните:
```bash
cd backend
python -m app.infrastructure.neo4j.init_graph
```

Способ B: вручную через Neo4j Browser
Можно выполнить Cypher напрямую в БД. Пример:
```cypher
MERGE (r:Requirement {code: "REQ-EXAMPLE-001"})
SET r.title = "Example requirement",
    r.category = "structure",
    r.severity = "high",
    r.condition_json = "{\"type\":\"required_section\",\"section\":\"abstract\"}",
    r.message_template = "Document must contain an abstract section.",
    r.recommendation = "Add abstract section before introduction.",
    r.version = "1.0.0",
    r.is_active = true

WITH r
MATCH (dt:DocumentType {code: "COURSE_PROJECT_NOTE"})
MATCH (s:Semester {number: 4})
MERGE (r)-[:APPLIES_TO_TYPE]->(dt)
MERGE (r)-[:APPLIES_TO_SEMESTER]->(s);
```

### 5.5 Как выключить правило без удаления
Лучше не удалять правило, а деактивировать:
```cypher
MATCH (r:Requirement {code: "REQ-EXAMPLE-001"})
SET r.is_active = false;
```
После этого правило перестанет участвовать в выборке.

### 5.6 Что важно проверить после изменения правил
1. Новое правило видно в `GET /reports/{check_id}` в `applied_rules`.
2. На вкладке `Правила` оно отображается в списке.
3. Если правило не видно, обычно проблема в одной из трех причин:
- `is_active = false`
- нет связи к нужному `DocumentType`
- нет связи к нужному `Semester`

---

## 6) Статусы анализа и прогресс

Backend использует статусы:

1. `ANALYZING` (10%)
2. `TYPE_DETERMINED` (35%)
3. `SEMESTER_DETERMINED` (55%)
4. `REQUIREMENTS_CHECKED` (85%)
5. `REPORT_READY` (100%)
6. `ERROR` (100%)

Frontend на вкладке «Анализ» опрашивает статус в реальном времени (polling) и показывает прогресс автоматически.

---

## 7) API (краткий справочник)

Префикс всех endpoint: `/api/v1`

1. `GET /health`
- Проверка доступности API/Neo4j/AI.
- Ответ: `api_status`, `neo4j_status`, `ai_status`.

2. `POST /documents/upload`
- Multipart с полем `file`.
- Ответ: `document_id`, `filename`, `format`, `status=UPLOADED`.

3. `POST /analyses/start`
- Тело: `document_id`, `requested_by`.
- Ответ: `check_id`, `status`.

4. `GET /analyses/{check_id}`
- Ответ: `check_id`, `status`, `progress`, `error`.

5. `GET /reports/{check_id}`
- Ответ: `overall_status`, `determined_type`, `determined_semester`, `applied_rules`, `violations`, `recommendations`, `summary`.
- Если отчет еще не готов: `409 REPORT_NOT_READY`.

6. `POST /feedback/corrections`
- Тело: `check_id`, `final_type`, `final_semester`, `confirmed_violations`, `rejected_violations`, `teacher_comment`.
- Ответ: `case_id`, `status=SAVED`, `ai_mode`, `ai_suggestion` (опционально).

### Формат ошибок
Все ошибки приводятся к единому виду:
- `code`
- `message`
- `details`
- `trace_id`

Также используется заголовок `X-Trace-Id`.

---

## 8) Зачем здесь Neo4j и что в нее пишется

### Почему графовая БД
Neo4j выбрана потому что в проекте много связей:
- правило относится к типу документа,
- правило относится к семестру,
- проверка использует набор правил,
- отчет принадлежит проверке,
- correction case связан с типом/семестром.

Такие связи в графе проще хранить и обходить, чем в разрозненных таблицах.

### Что хранится в Neo4j

Нормативные данные:
1. `DocumentType`
2. `Semester`
3. `Requirement`

Операционные данные:
1. `Document`
2. `Check`
3. `Report`
4. `CorrectionCase`

Ключевые связи:
1. `Requirement -[:APPLIES_TO_TYPE]-> DocumentType`
2. `Requirement -[:APPLIES_TO_SEMESTER]-> Semester`
3. `Check -[:FOR_DOCUMENT]-> Document`
4. `Check -[:USED_REQUIREMENT]-> Requirement`
5. `Report -[:FOR_CHECK]-> Check`
6. `CorrectionCase -[:RELATES_TO_TYPE]-> DocumentType` (если найден)
7. `CorrectionCase -[:RELATES_TO_SEMESTER]-> Semester` (если найден)

---

## 9) Интерфейс: 5 вкладок и зачем каждая

В верхней навигации ровно 5 вкладок:

1. `Загрузить` (`/upload`)
- Выбор PDF/DOCX.
- Отправка файла на backend.
- Получение `document_id`.
- Переход к анализу.

2. `Анализ` (`/analysis`)
- Запуск проверки (`document_id`, `requested_by`).
- Отслеживание этапов и процента готовности.
- Переход к отчету после `REPORT_READY`.

3. `Отчёт` (`/report`)
- Просмотр сводки проверки по `check_id`.
- Тип документа, семестр, число правил, нарушения, рекомендации.
- Переход к правкам и правилам.

4. `Правки` (`/feedback`)
- Загрузка отчета по `check_id`.
- Подтверждение/отклонение нарушений.
- Коррекция типа/семестра.
- Отправка teacher feedback.

5. `Правила` (`/rules`)
- Показывает примененные правила и их статус.
- Показывает, по каким правилам есть evidence нарушений.
- Удобно для аудита отчета.

---

## 10) Архитектура проекта по папкам

```text
CourseProject/
  backend/
    app/
      api/v1/routes/            # HTTP-роуты FastAPI
      application/
        dto/                    # контракты данных
        ports/                  # интерфейсы зависимостей
        use_cases/              # бизнес-сценарии
      domain/
        entities/               # сущности предметной области
        value_objects/          # статусы и VO
      infrastructure/
        ai/                     # интеграция с AI провайдером
        neo4j/                  # клиент, репозитории, инициализация графа
        pipeline/               # реализация пайплайна анализа
        storage/                # локальное файловое хранилище
      core/                     # конфиг, логирование, ошибки
    storage/documents/          # физические загруженные файлы

  frontend/
    src/
      app/                      # роутер, shell, providers
      pages/                    # страницы (5 вкладок)
      features/                 # фичи вкладок
      shared/api/               # typed API-клиент, контракты, hooks
      shared/ui/                # переиспользуемые UI-компоненты

  neo4j/
    schema/                     # constraints + indexes
    data/                       # seed-данные
    queries/                    # cypher-запросы репозиториев
```

---

## 11) Как запустить локально

### Шаг 1. Neo4j
В репозитории нет `docker-compose.yml`, поэтому Neo4j можно поднять любым способом:

1. Neo4j Desktop / Aura
2. или Docker вручную, например:

```bash
docker run --name neo4j-courseproject \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  -d neo4j:5
```

### Шаг 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Проверьте `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` в `.env`.

### Шаг 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

По умолчанию frontend проксирует `/api` на `http://127.0.0.1:8000`.

---

## 12) Что чаще всего сбивает с толку

1. Почему отчет «чистый», даже если документ явно плохой?
- Обычно это означает одно из двух:
- документ действительно прошёл проверку по применённым правилам;
- правило не попало в выборку (например, неактивно или не связано с нужным типом/семестром в Neo4j).

2. Почему `GET /reports/{check_id}` иногда дает ошибку?
- Если pipeline не дошел до `REPORT_READY`, backend вернет `409 REPORT_NOT_READY`.

3. Почему health показывает проблемы с Neo4j?
- Нет конфигурации или нет подключения к `bolt://...`.

4. AI обязателен?
- Нет. Без AI система работает в `RULE_ONLY` режиме.

---

## 13) Куда смотреть в коде в первую очередь

Если хотите быстро понять проект, начните с этих файлов:

Backend:
1. `backend/app/main.py`
2. `backend/app/api/v1/routes/*.py`
3. `backend/app/application/use_cases/start_analysis.py`
4. `backend/app/infrastructure/pipeline/deterministic_pipeline.py`
5. `backend/app/infrastructure/neo4j/repositories/*.py`

Frontend:
1. `frontend/src/app/router/app-router.tsx`
2. `frontend/src/entities/navigation/model/navigation-routes.ts`
3. `frontend/src/features/upload-document/ui/upload-document-overview.tsx`
4. `frontend/src/features/start-analysis/ui/start-analysis-overview.tsx`
5. `frontend/src/features/report-view/ui/report-view-overview.tsx`
6. `frontend/src/features/submit-feedback/ui/submit-feedback-overview.tsx`
7. `frontend/src/features/rules-inspector/ui/rules-inspector-overview.tsx`

Neo4j:
1. `neo4j/schema/*`
2. `neo4j/data/*`
3. `neo4j/queries/*`

---

## 14) Резюме

Система уже даёт сквозной сценарий `upload -> analysis -> report -> feedback -> rules` с сохранением данных в Neo4j и понятным UI.

Текущая реализация уже включает рабочий разбор PDF/DOCX, базовый rule-engine и полностью доступный пользовательский поток в UI.
