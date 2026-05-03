# Интеллектуальная система автоматической проверки студенческих работ

## 0. Обобщённо (верхний уровень)

Это веб-приложение для автоматической проверки учебных документов (`DOCX`, `PDF`), где ядром является база знаний на `Neo4j`.

Система делает полный цикл:

1. Принимает документ от студента или преподавателя.
2. Извлекает текст и структуру (разделы, заголовки, метаданные).
3. Определяет тип документа и предполагаемый семестр.
4. Подбирает из базы знаний нужные требования.
5. Проверяет документ на соответствие правилам.
6. Формирует отчёт с нарушениями, критичностью и рекомендациями.
7. Сохраняет правки преподавателя и использует их в следующих проверках через AI API (без локального обучения модели).

Базовый принцип:  
**жёсткие требования проверяются детерминированно правилами из БЗ**,  
**AI используется как вспомогательный слой для нечетких случаев и объяснений**.

---

## 1. Контекст и соответствие `data.md`

Данный `README` фиксирует реализацию, согласованную с материалами из `data.md` и UML/PNG-диаграмм:

- `uml/1.puml` — use-case.
- `uml/2.puml` — ER-представление сущностей.
- `uml/3.puml` — диаграмма состояний документа.
- `uml/4.puml` — компонентная диаграмма.
- `uml/5.puml` — high-level архитектура.
- `uml/6.puml` — sequence.
- `png/diagram_01_architecture_high_level.png.png` ... `png/diagram_06_state_diagram.png`.

Ключевые требования из `data.md`, которые обязательно закрывает реализация:

1. Поддержка `PDF/DOCX`.
2. Классификация документа (тип + семестр).
3. Выбор правил на основе типа/семестра/контекста.
4. Проверка структуры и оформления.
5. Отчёт с нарушениями и рекомендациями.
6. БЗ как отдельный расширяемый слой.
7. Графовая модель знаний (`Neo4j`, `Cypher`).
8. Разделение нормативных знаний и результатов проверки.
9. Возможность улучшать качество без переобучения локальной модели.

---

## 2. Цели, границы, роли

## 2.1 Цель

Создать интеллектуальную систему, где основной ценностью является формализованная база знаний для автоматической проверки студенческих работ.

## 2.2 Границы MVP

В MVP обязательно:

1. Загрузка и хранение `PDF/DOCX`.
2. Извлечение текста и структуры.
3. Определение типа документа.
4. Определение семестра (включая кейс `КП4`/4 семестр).
5. Проверка обязательных разделов и части правил оформления.
6. Генерация отчёта.
7. Сохранение преподавательских правок как `CorrectionCase`.
8. Подмешивание похожих исправленных кейсов в AI-промпт.

Вне MVP:

1. Полноценный антиплагиат.
2. Сложный ML pipeline с локальным training.
3. Полнофункциональный распределённый микросервисный кластер.

## 2.3 Пользовательские роли

1. `Студент`:
   - загружает документ;
   - запускает анализ;
   - смотрит отчёт.
2. `Преподаватель`:
   - запускает/перезапускает анализ;
   - подтверждает и исправляет результат;
   - формирует итоговую оценку соответствия.
3. `Администратор/методист`:
   - редактирует правила в БЗ;
   - управляет версиями требований.

---

## 3. Полный стек и библиотеки

## 3.1 Frontend (React)

- `React 18 + TypeScript`
- `Vite`
- `React Router`
- `TanStack Query` (серверное состояние)
- `Zustand` (UI-состояние)
- `React Hook Form + Zod` (формы и валидация)
- `Axios` (HTTP-клиент)
- `MUI` (базовый UI kit)
- `Vitest + Testing Library` (тесты)
- `ESLint + Prettier`

## 3.2 Backend (Python)

- `Python 3.12`
- `FastAPI`
- `Uvicorn`
- `Pydantic v2`
- `python-multipart` (upload)
- `neo4j` (официальный драйвер)
- `pdfplumber` + `PyMuPDF` (PDF parsing)
- `python-docx` (DOCX parsing)
- `RapidFuzz` (нечеткое сопоставление заголовков и шаблонов)
- `httpx` (вызов AI API)
- `tenacity` (retry/timeout/circuit-like обработка внешнего API)
- `orjson` (быстрый JSON)
- `pytest + pytest-asyncio + httpx` (тесты)
- `ruff + black + mypy` (качество кода)

## 3.3 Данные и инфраструктура

- `Neo4j`:
  - хранение нормативных знаний;
  - хранение результатов проверок;
  - хранение `CorrectionCase` для адаптации.
- Хранилище файлов:
  - локальная ФС (`storage/documents`, `storage/reports`) для MVP.
- AI API:
  - один провайдер на бесплатном тарифе (например, Gemini API на free tier с лимитами).

---

## 4. Архитектура системы

## 4.1 High-level слои

1. `Слой интерфейса` (React SPA).
2. `Серверный слой` (FastAPI, оркестрация анализа).
3. `Интеллектуальный контур` (type/semester/rule-check/report).
4. `Слой БЗ` (`Neo4j`).
5. `Слой хранения артефактов` (документы/отчёты).
6. `Слой интеграции AI API`.

Это полностью соответствует структуре из `data.md`:

- загрузка;
- анализ;
- определение типа;
- определение семестра;
- проверка требований;
- формирование отчёта;
- база знаний;
- хранилище документов и результатов.

## 4.2 Ключевые backend модули

1. `UploadService`:
   - валидирует файл;
   - присваивает `document_id`;
   - сохраняет файл в `storage/documents`.
2. `DocumentParserService`:
   - извлекает текст, заголовки, структуру, метаданные;
   - приводит результат к каноническому DTO.
3. `DocumentTypeService`:
   - определяет тип документа;
   - учитывает правила/признаки из Neo4j и AI подсказку.
4. `SemesterService`:
   - определяет семестр;
   - учитывает `КП4`/шаблоны титула/структурные признаки.
5. `RuleSelectionService`:
   - выбирает релевантные требования по типу+семестру.
6. `RequirementCheckService`:
   - запускает детерминированные проверки;
   - формирует список нарушений.
7. `ReportService`:
   - собирает итоговый отчёт;
   - выставляет итоговый статус: `соответствует/частично/не соответствует`.
8. `FeedbackService`:
   - принимает правки преподавателя;
   - сохраняет `CorrectionCase` в Neo4j.
9. `AiAssistantService`:
   - получает похожие кейсы;
   - формирует prompt;
   - вызывает AI API;
   - возвращает строго структурированный JSON.
10. `AnalysisOrchestrator`:
    - координирует весь пайплайн.

---

## 5. Полный сценарий обработки документа

## 5.1 Основной pipeline

1. Пользователь загружает файл.
2. `UploadService` сохраняет файл и создает карточку документа.
3. Пользователь запускает анализ.
4. `AnalysisOrchestrator` запускает парсинг.
5. После парсинга вызывается `DocumentTypeService`.
6. Затем вызывается `SemesterService`.
7. `RuleSelectionService` достает правила из Neo4j.
8. `RequirementCheckService` проверяет документ.
9. `ReportService` формирует отчёт.
10. Результаты сохраняются в Neo4j и в `storage/reports`.
11. UI получает статус и показывает отчёт.

## 5.2 Состояния документа (из диаграммы состояний)

1. `NOT_UPLOADED`
2. `UPLOADED`
3. `ANALYZING`
4. `TYPE_DETERMINED`
5. `SEMESTER_DETERMINED`
6. `REQUIREMENTS_CHECKED`
7. `REPORT_READY`
8. `ERROR`

Переходы ошибок:

- неподдерживаемый формат;
- ошибка парсинга;
- тип/семестр не определён;
- ошибка проверки требований;
- ошибка AI API (не критична, пайплайн должен продолжаться по rule-only пути).

---

## 6. Модель знаний и данных (Neo4j)

## 6.1 Принцип разделения знаний

1. `Нормативные знания` (статические):
   - типы документов;
   - семестры;
   - требования;
   - шаблоны интерпретации.
2. `Операционные данные` (динамические):
   - загруженные документы;
   - проверки;
   - нарушения;
   - отчёты;
   - correction cases.

## 6.2 Узлы графа

1. `DocumentType`
   - `code`, `name`, `description`.
2. `Semester`
   - `number`, `title`, `markers_json`.
3. `Requirement`
   - `code`, `title`, `category`, `severity`, `condition_json`, `message_template`, `recommendation`, `version`, `is_active`.
4. `Document`
   - `document_id`, `filename`, `format`, `sha256`, `uploaded_at`, `author`, `group`, `discipline`.
5. `Check`
   - `check_id`, `started_at`, `finished_at`, `status`.
6. `Violation`
   - `violation_id`, `code`, `message`, `severity`, `evidence_json`, `confidence`.
7. `Report`
   - `report_id`, `overall_status`, `summary`, `generated_at`, `path`.
8. `CorrectionCase`
   - `case_id`, `doc_features_json`, `predicted_type`, `final_type`, `predicted_semester`, `final_semester`, `predicted_violations_json`, `final_violations_json`, `teacher_comment`, `created_at`.

## 6.3 Связи графа

1. `(Document)-[:HAS_TYPE]->(DocumentType)`
2. `(Document)-[:HAS_SEMESTER]->(Semester)`
3. `(Requirement)-[:APPLIES_TO_TYPE]->(DocumentType)`
4. `(Requirement)-[:APPLIES_TO_SEMESTER]->(Semester)`
5. `(Check)-[:FOR_DOCUMENT]->(Document)`
6. `(Check)-[:USED_REQUIREMENT]->(Requirement)`
7. `(Check)-[:FOUND]->(Violation)`
8. `(Violation)-[:VIOLATES]->(Requirement)`
9. `(Report)-[:FOR_CHECK]->(Check)`
10. `(CorrectionCase)-[:RELATES_TO_TYPE]->(DocumentType)`
11. `(CorrectionCase)-[:RELATES_TO_SEMESTER]->(Semester)`

## 6.4 Индексы и ограничения (обязательно)

1. Уникальные ID:
   - `Document.document_id`
   - `Requirement.code`
   - `Check.check_id`
   - `Report.report_id`
   - `CorrectionCase.case_id`
2. Индексы:
   - `DocumentType.code`
   - `Semester.number`
   - `Requirement.is_active`
   - `Violation.code`

---

## 7. Бизнес-правила проверки

## 7.1 Виды знаний (как в `data.md`)

1. Декларативные:
   - обязательные части документа.
2. Структурные:
   - порядок и вложенность разделов.
3. Процедурные:
   - условия вида `если X, то нарушение Y`.
4. Ограничения:
   - допустимые шрифты, поля, интервалы, объём.
5. Интерпретационные:
   - шаблоны сообщений и рекомендаций.

## 7.2 Формат правила в БЗ

Каждое правило хранится как запись:

1. `code` (уникальный идентификатор).
2. `title` (читаемое название).
3. `category` (`structure`, `formatting`, `metadata`, `volume`, `references`).
4. `severity` (`low`, `medium`, `high`, `critical`).
5. `condition_json` (машинное условие).
6. `message_template` (текст нарушения).
7. `recommendation` (как исправить).
8. `version`.
9. `is_active`.

## 7.3 Логика итогового статуса

1. `соответствует`:
   - нет `high/critical`;
   - количество `medium` ниже порога.
2. `частично соответствует`:
   - есть `medium/high`, но нет блокирующих.
3. `не соответствует`:
   - есть `critical` или превышены пороги по ключевым требованиям.

---

## 8. AI API и “обучение” без локального обучения

## 8.1 Важное определение

В этой архитектуре нет локального переобучения весов модели.  
Используется **адаптация через память исправленных кейсов**:

1. Сохраняем исправления преподавателя в граф.
2. Достаём похожие кейсы.
3. Передаём их в prompt.
4. Получаем более точный ответ AI.

Это API-only подход без затрат на серверы/тренировку.

## 8.2 Где AI реально используется

1. Подсказка типа документа в нечетких случаях.
2. Подсказка семестра при неоднозначной структуре.
3. Генерация объяснения “почему это нарушение”.
4. Нормализация текста рекомендаций.

## 8.3 Где AI не используется

1. Детерминированная проверка обязательных правил.
2. Вычисление итогового статуса соответствия.
3. Применение критичных нормативов.

## 8.4 Алгоритм адаптации через `CorrectionCase`

1. После отчёта преподаватель отправляет правки.
2. Backend создает `CorrectionCase`.
3. Для нового документа:
   - рассчитываются признаки (`doc_features_json`);
   - ищутся похожие `CorrectionCase` (top-k, обычно `k=5`);
   - кейсы добавляются в prompt как few-shot память.
4. Ответ AI объединяется с rule-engine результатом.

## 8.5 Пример признаков документа

1. наличие ключей (`КП4`, `пояснительная записка`, и т.д.);
2. список разделов в порядке;
3. количество страниц;
4. наличие обязательных блоков;
5. метаданные титула.

## 8.6 Контракт ответа AI

AI обязан вернуть JSON:

```json
{
  "predicted_type": "COURSE_PROJECT_NOTE",
  "type_confidence": 0.87,
  "predicted_semester": 4,
  "semester_confidence": 0.91,
  "explanations": [
    "Обнаружен маркер КП4 на титульном листе"
  ],
  "risk_flags": []
}
```

---

## 9. API backend (контракт)

Префикс: `/api/v1`

## 9.1 Upload

`POST /documents/upload`

- `multipart/form-data`, поле `file`.
- Ответ:
  - `document_id`
  - `filename`
  - `format`
  - `status=UPLOADED`

## 9.2 Start analysis

`POST /analyses/start`

- Тело:
  - `document_id`
  - `requested_by`
- Ответ:
  - `check_id`
  - `status=ANALYZING`

## 9.3 Analysis status

`GET /analyses/{check_id}`

- Возвращает:
  - текущий статус;
  - прогресс;
  - ошибки (если есть).

## 9.4 Report

`GET /reports/{check_id}`

- Возвращает структуру отчёта:
  - определённый тип;
  - определённый семестр;
  - применённые правила;
  - нарушения;
  - рекомендации;
  - итог.

## 9.5 Feedback (исправления преподавателя)

`POST /feedback/corrections`

- Тело:
  - `check_id`
  - `final_type`
  - `final_semester`
  - `confirmed_violations`
  - `rejected_violations`
  - `teacher_comment`
- Эффект:
  - создаётся `CorrectionCase`;
  - увеличивается качество последующих подсказок AI.

## 9.6 Health

`GET /health`

- проверяет:
  - API alive;
  - доступность Neo4j;
  - доступность AI API (опционально).

---

## 10. Frontend архитектура (React)

## 10.1 Страницы

1. `UploadPage`
2. `AnalysisPage` (статусы и прогресс)
3. `ReportPage` (итог + нарушения)
4. `FeedbackPage` (правки преподавателя)
5. `RulesViewPage` (просмотр применённых правил)

## 10.2 Feature-модули

1. `features/upload-document`
2. `features/start-analysis`
3. `features/analysis-status`
4. `features/report-view`
5. `features/submit-feedback`
6. `features/rules-inspector`

## 10.3 Принципы фронтенда

1. Компоненты без бизнес-логики.
2. Бизнес-логика в хуках и service-слое.
3. API-схемы типизированы через `zod` + TS-интерфейсы.
4. UI состояние и серверное состояние разделены.

---

## 11. Целевая структура репозитория

```text
CourseProject/
  README.md
  data.md
  uml/
    1.puml
    2.puml
    3.puml
    4.puml
    5.puml
    6.puml
  png/
    diagram_01_architecture_high_level.png.png
    diagram_02_use_case.png
    diagram_03_sequence_diagram.png
    diagram_04_component_diagram.png
    diagram_05_er_model.png
    diagram_06_state_diagram.png
  backend/
    app/
      main.py
      api/
        v1/
          routes/
            health.py
            documents.py
            analyses.py
            reports.py
            feedback.py
      core/
        config.py
        logging.py
        errors.py
      domain/
        entities/
        value_objects/
        services/
        repositories/
      application/
        dto/
        use_cases/
        ports/
      infrastructure/
        neo4j/
          client.py
          repositories/
        ai/
          gateway.py
          prompt_builder.py
        parsers/
          docx_parser.py
          pdf_parser.py
        storage/
          file_storage.py
        reporting/
          report_builder.py
      tests/
    pyproject.toml
  frontend/
    src/
      app/
      pages/
      features/
      entities/
      shared/
    package.json
    vite.config.ts
  neo4j/
    schema/
      constraints.cypher
      indexes.cypher
    data/
      seed_document_types.cypher
      seed_semesters.cypher
      seed_requirements.cypher
    queries/
      get_rules_by_type_and_semester.cypher
      save_check.cypher
      save_violations.cypher
      save_report.cypher
      get_similar_correction_cases.cypher
    import/
```

---

## 12. SOLID, GRASP, Clean Architecture

## 12.1 SOLID

1. `SRP`:
   - парсер, классификатор, валидатор, репортер разнесены.
2. `OCP`:
   - новые правила/проверки добавляются через новые классы и записи БЗ без переписывания ядра.
3. `LSP`:
   - `PdfParser` и `DocxParser` взаимозаменяемы через общий интерфейс `DocumentParser`.
4. `ISP`:
   - отдельные интерфейсы: `RuleReadRepository`, `CheckWriteRepository`, `FeedbackRepository`.
5. `DIP`:
   - use cases зависят от портов (интерфейсов), а не от конкретного Neo4j/AI клиента.

## 12.2 GRASP

1. `Controller`:
   - REST route вызывает соответствующий use case.
2. `Information Expert`:
   - `RequirementCheckService` отвечает за применение правил, потому что владеет контекстом проверок.
3. `Low Coupling`:
   - AI сервис изолирован через `AiGateway`.
4. `High Cohesion`:
   - один модуль = одна зона ответственности.
5. `Pure Fabrication`:
   - `PromptBuilder` как отдельный технический класс.
6. `Protected Variations`:
   - провайдер AI можно заменить, не меняя бизнес-слой.

## 12.3 Чистый код

1. Имена доменных сущностей совпадают с предметной областью.
2. Никакой бизнес-логики в контроллерах.
3. Никаких магических строк; только enum/константы.
4. Явные DTO между слоями.
5. 100% typed публичные функции backend/frontend.

---

## 13. Нефункциональные требования

1. Производительность:
   - MVP-анализ документа до ~3 МБ: до 20–40 сек.
2. Надежность:
   - при недоступности AI API система не падает, переходит в rule-only режим.
3. Согласованность:
   - все статусы проверки фиксируются атомарно.
4. Расширяемость:
   - новые типы документов/семестры/правила добавляются через БЗ.
5. Поддерживаемость:
   - линтеры, тесты, единые coding standards.

---

## 14. Безопасность и работа с данными

1. Ограничение размеров/форматов файлов.
2. Проверка MIME и расширения.
3. Санитизация имен файлов.
4. Исключение выполнения загружаемого контента.
5. Секреты только через env.
6. Логи без чувствительных данных.
7. Для AI API отправлять не полный документ, а минимальный набор признаков и релевантные фрагменты.

---

## 15. Тестирование

## 15.1 Backend

1. Unit:
   - парсеры;
   - определение типа/семестра;
   - rule engine;
   - report builder.
2. Integration:
   - FastAPI + Neo4j test graph.
3. Contract tests:
   - проверка JSON-контрактов ответов API.

## 15.2 Frontend

1. Unit:
   - утилиты, hooks.
2. Component:
   - формы upload/feedback.
3. E2E (по возможности):
   - upload -> analysis -> report -> feedback.

## 15.3 Набор тестовых документов

1. Корректный `КП4`.
2. Документ без введения.
3. Документ без заключения.
4. Документ с нарушением структуры.
5. Неподдерживаемый формат.

---

## 16. Пошаговый план реализации

## Этап 1. Каркас проекта

1. Создать `backend/`, `frontend/`, `neo4j/`.
2. Поднять базовый FastAPI и React.
3. Подключить Neo4j и health-check.

## Этап 2. База знаний

1. Создать схему, ограничения, индексы.
2. Заполнить seed-данные типов/семестров/правил.
3. Реализовать репозитории чтения/записи.

## Этап 3. Базовый pipeline

1. Upload + хранение документа.
2. Парсинг PDF/DOCX.
3. Определение типа/семестра.
4. Rule-check.
5. Формирование отчёта.

## Этап 4. Frontend UX

1. Страницы upload/analysis/report.
2. Статусы обработки и обработка ошибок.

## Этап 5. AI адаптация

1. Интеграция с одним AI API.
2. `CorrectionCase` и retrieval похожих кейсов.
3. Prompt builder + строгий JSON output parser.

## Этап 6. Качество

1. Тесты.
2. Линтеры.
3. Документация API и эксплуатационные инструкции.

---

## 17. Definition of Done

Проект считается готовым, когда:

1. Анализирует `DOCX` и `PDF`.
2. Определяет тип и семестр.
3. Проверяет обязательные требования из БЗ.
4. Формирует детальный отчёт.
5. Позволяет преподавателю отправить правки.
6. Использует правки в следующих анализах через few-shot память.
7. Содержит тесты ключевых сценариев.
8. Проходит линтеры и статическую типизацию.

---

## 18. Переменные окружения

```env
APP_ENV=dev
APP_HOST=0.0.0.0
APP_PORT=8000

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

FILE_STORAGE_PATH=./storage/documents
REPORT_STORAGE_PATH=./storage/reports
MAX_UPLOAD_MB=20

AI_PROVIDER=gemini
AI_API_KEY=your_api_key
AI_MODEL=your_free_tier_model_name
AI_TIMEOUT_SECONDS=30
AI_MAX_RETRIES=2
```

---

## 19. Команды запуска (локально)

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Neo4j (варианты)

1. Локально через Desktop/Server.
2. Neo4j Aura Free (без локальной установки БД).

---

## 20. Что важно не нарушать при реализации

1. Не смешивать бизнес-логику и инфраструктуру.
2. Не хардкодить правила в коде, хранить их в БЗ.
3. Не полагаться на AI в критичных проверках.
4. Не хранить чувствительные данные в логах.
5. Не ломать контракты API между frontend и backend.

---

## 21. Результат

Этот документ является полноценным blueprint для реализации системы из `data.md` с учетом выбранного стека `React + Python + Neo4j + AI API`.

После сборки по данному плану команда получает:

1. Управляемую базу знаний.
2. Прозрачный и воспроизводимый процесс проверки.
3. Масштабируемую архитектуру без дорогой инфраструктуры.
4. Улучшаемое качество ответов за счет `CorrectionCase` без локального обучения модели.

