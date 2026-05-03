# Backend Implementation Plan (расширенный)

## 0. Основание плана
План составлен по `README.md` и охватывает разделы:  
`2` (цели/границы), `3.2` (backend стек), `4` (архитектура), `5` (pipeline + статусы), `6` (Neo4j модель), `7` (правила), `8` (AI/CorrectionCase), `9` (API контракт), `12` (SOLID/GRASP), `13-15` (NFR/безопасность/тесты), `17` (DoD), `20` (ограничения реализации).

## 1. Принципы, которые нельзя нарушать
- API versioning: все endpoint-ы только в `/api/v1`.
- Бизнес-правила не хардкодятся в контроллерах и не зависят от UI.
- Критичные проверки всегда детерминированные (AI только вспомогательный слой).
- Fallback при недоступности AI обязателен (`rule-only`).
- Любое изменение backend-контракта требует синхронного обновления frontend-плана.

## 2. Протокол синхронизации Backend <-> Frontend

| Backend endpoint | Backend обязан вернуть | Frontend обязан отобразить |
|---|---|---|
| `GET /health` | `api_status`, `neo4j_status`, опционально `ai_status` | Индикатор доступности сервиса |
| `POST /documents/upload` | `document_id`, `filename`, `format`, `status=UPLOADED` | Результат загрузки и переход к запуску анализа |
| `POST /analyses/start` | `check_id`, `status=ANALYZING` | Запуск анализа и старт мониторинга |
| `GET /analyses/{check_id}` | `status`, `progress`, `error?` | Текущий этап pipeline и ошибки |
| `GET /reports/{check_id}` | Полный отчёт: type, semester, rules, violations, recommendations, overall_status | Полная визуализация отчёта без скрытых полей |
| `POST /feedback/corrections` | Подтверждение сохранения `CorrectionCase` | Подтверждение отправки правок преподавателя |

## 3. Последовательные этапы (логичные и завершённые)

| № | Этап | Вход этапа | Выход этапа | Commit name |
|---|---|---|---|---|
| 1 | Каркас backend и инженерная база | Текущее состояние: backend отсутствует как рабочий сервис | Запускаемый FastAPI-каркас, Clean Architecture директории, `GET /health`, конфиг/env, единая модель ошибок | `chore(backend): bootstrap clean architecture skeleton and health endpoint` |
| 2 | Neo4j Knowledge Base слой | Каркас сервиса + описание сущностей/связей из README | Cypher constraints/indexes/seeds, порты и репозитории чтения/записи БЗ, успешная инициализация графа | `feat(neo4j): add knowledge graph schema seeds and repositories` |
| 3 | Модуль загрузки и регистрации документов | База и storage paths из env | Рабочий `POST /documents/upload`, валидация файла, сохранение в ФС, регистрация `Document` в Neo4j, статус `UPLOADED` | `feat(documents): implement upload endpoint and file storage` |
| 4 | Унифицированный парсинг PDF/DOCX | Загруженный документ и путь к файлу | `DocumentParserService` + канонический DTO (текст, разделы, метаданные, признаки), обработка ошибок парсинга | `feat(parsing): add pdf-docx parsers and normalized document dto` |
| 5 | Классификация документа и выбор требований | DTO документа + seed-правила БЗ | Определение типа и семестра, выбор активных требований, корректные статусы `TYPE_DETERMINED` и `SEMESTER_DETERMINED` | `feat(classification): implement type-semester detection and rule selection` |
| 6 | Rule engine и генерация отчёта | Определённый тип/семестр + набор требований | Детерминированная проверка, `Violation` list, итоговый отчёт, переход `REQUIREMENTS_CHECKED` -> `REPORT_READY` | `feat(checker): implement deterministic requirement engine and report builder` |
| 7 | API анализа и оркестратор pipeline | Готовые сервисы upload/parse/classify/check/report | Рабочие endpoint-ы `POST /analyses/start`, `GET /analyses/{id}`, `GET /reports/{id}`, полная оркестрация и фиксированные переходы статусов | `feat(analyses): wire orchestrator with start-status-report api` |
| 8 | Feedback и AI-адаптация | Рабочий основной pipeline и отчёты | `POST /feedback/corrections`, сохранение `CorrectionCase`, retrieval похожих кейсов, AI prompt builder, строгий JSON parser, fallback при AI-error | `feat(feedback): add correction cases retrieval and ai adaptation` |
| 9 | Качество, тестирование, операционная готовность | Полный функционал backend по контракту README | Unit/Integration/Contract тесты, линт/типизация, стабилизированные ошибки, эксплуатационные инструкции | `chore(backend): add tests quality gates and operational docs` |

## 4. Детальная реализация по этапам

### Этап 1. Каркас backend и инженерная база
**Что реализуем**
- Папки и слои:
  - `api/v1/routes`
  - `application/{use_cases,dto,ports}`
  - `domain/{entities,value_objects,services,repositories}`
  - `infrastructure/{neo4j,parsers,storage,reporting,ai}`
  - `core/{config,logging,errors}`
- `main.py` с инициализацией приложения и router-prefix `/api/v1`.
- `GET /health`.

**Контракты и форматы**
- Единый JSON формат ошибок (например: `code`, `message`, `details`, `trace_id`).
- Health-ответ стабилен и пригоден для фронта.

**Нюансы**
- Конфиг только через env.
- Никакой доменной логики в route handlers.
- Логирование без чувствительных данных.

**Критерий приёмки**
- API запускается локально.
- `GET /api/v1/health` отвечает 200 и содержит обязательные поля статуса.

---

### Этап 2. Neo4j Knowledge Base слой
**Что реализуем**
- `constraints.cypher`, `indexes.cypher`.
- Seed-скрипты:
  - `seed_document_types.cypher`
  - `seed_semesters.cypher`
  - `seed_requirements.cypher`
- Репозитории:
  - чтение правил по type/semester;
  - запись check/violations/report;
  - запись и выборка correction cases.

**Контракты и форматы**
- Узлы/связи соответствуют `README` разделу `6`.
- Rule-поле `condition_json` обрабатывается как машиночитаемый критерий проверки.

**Нюансы**
- Seed-операции идемпотентны.
- Уникальные ограничения обязательны для `document_id`, `requirement.code`, `check_id`, `report_id`, `case_id`.

**Критерий приёмки**
- БД поднимается и инициализируется без ручной правки.
- Чтение правил по конкретному type/semester возвращает релевантный набор.

---

### Этап 3. Модуль загрузки и регистрации документов
**Что реализуем**
- Endpoint `POST /documents/upload`.
- Проверки:
  - extension (`pdf`, `docx`);
  - MIME;
  - размер (по `MAX_UPLOAD_MB`);
  - санитизация имени.
- Сохранение в `storage/documents`.
- Создание `Document` в графе и статус `UPLOADED`.

**Контракты и форматы**
- Ответ строго: `document_id`, `filename`, `format`, `status`.
- Ошибки 4xx: невалидный формат/размер.

**Нюансы**
- Hash документа (`sha256`) сохраняется.
- Нельзя выполнять или интерпретировать содержимое документа как код.

**Критерий приёмки**
- Корректные PDF/DOCX загружаются.
- Невалидные файлы блокируются предсказуемо и с понятной ошибкой.

---

### Этап 4. Унифицированный парсинг PDF/DOCX
**Что реализуем**
- Интерфейс `DocumentParser`.
- Реализации:
  - `PdfParser` (`pdfplumber`/`PyMuPDF`);
  - `DocxParser` (`python-docx`).
- Нормализация результата в единый DTO:
  - `raw_text`;
  - `sections[]` (title/order/level);
  - `metadata` (title page markers, author hints и т.п.);
  - `features` для classifier и AI.

**Контракты и форматы**
- DTO детерминированный и одинаковый для обеих реализаций.
- Ошибка парсинга приводит к управляемому `ERROR` в анализе.

**Нюансы**
- Не смешивать parsing и доменную интерпретацию.
- `RapidFuzz` использовать только как инструмент нормализации/сопоставления, а не как источник бизнес-решения.

**Критерий приёмки**
- Для PDF и DOCX формируется единый DTO без ручных веток в downstream сервисах.

---

### Этап 5. Классификация документа и выбор требований
**Что реализуем**
- `DocumentTypeService`.
- `SemesterService`.
- `RuleSelectionService`.
- Логика источника решения:
  - сначала детерминированные признаки;
  - AI подсказка только для неясных случаев.

**Контракты и форматы**
- Фиксация промежуточных статусов:
  - `TYPE_DETERMINED`
  - `SEMESTER_DETERMINED`
- Возвращаемые поля сохраняются для отчёта (объяснения, confidence опционально).

**Нюансы**
- Для кейса `КП4` приоритет у явных маркеров из документа.
- Если AI недоступен или вернул невалидный JSON, анализ продолжается rule-only.

**Критерий приёмки**
- На тестовых документах тип/семестр определяются стабильно и воспроизводимо.

---

### Этап 6. Rule engine и генерация отчёта
**Что реализуем**
- `RequirementCheckService`:
  - применение `condition_json`;
  - формирование `Violation`.
- `ReportService`:
  - определение `overall_status` (`соответствует/частично/не соответствует`);
  - агрегация нарушений и рекомендаций;
  - сохранение отчёта.

**Контракты и форматы**
- `GET /reports/{check_id}` обязан вернуть:
  - determined type/semester;
  - applied rules;
  - violations;
  - recommendations;
  - overall status.

**Нюансы**
- Критичные и high-severity правила не зависят от AI.
- Пояснения AI допускаются как дополнительное поле, но не как источник финального статуса.

**Критерий приёмки**
- Отчёт покрывает все поля, требуемые фронтом.
- Статус отчёта вычисляется по правилам README без ручных “исключений”.

---

### Этап 7. API анализа и оркестратор pipeline
**Что реализуем**
- `POST /analyses/start`:
  - принимает `document_id`, `requested_by`;
  - создаёт `check_id`;
  - переводит в `ANALYZING`.
- `GET /analyses/{check_id}`:
  - `status`, `progress`, `error?`.
- Оркестратор:
  - parse -> type -> semester -> rules -> check -> report.

**Контракты и форматы**
- Статусы строго из перечня README (`5.2`).
- Переходы между статусами фиксируются в БЗ.

**Нюансы**
- Идемпотентность: повторный запрос статуса не меняет данные.
- Повторный старт анализа должен быть либо запрещён чёткой ошибкой, либо работать по формально описанному сценарию re-run.

**Критерий приёмки**
- Полный сценарий upload->start->status->report проходит без ручного вмешательства.

---

### Этап 8. Feedback и AI-адаптация
**Что реализуем**
- `POST /feedback/corrections`:
  - `check_id`, `final_type`, `final_semester`, `confirmed_violations`, `rejected_violations`, `teacher_comment`.
- Сохранение `CorrectionCase`.
- Retrieval похожих кейсов (`top-k`).
- Prompt builder + strict JSON parser для AI.

**Контракты и форматы**
- AI response contract (из README 8.6) валидируется перед использованием.
- Любое отклонение AI-ответа не ломает pipeline.

**Нюансы**
- В AI отправлять только признаки и релевантные фрагменты, не полный документ.
- Добавить timeout/retry/backoff через `tenacity`.

**Критерий приёмки**
- Правки преподавателя сохраняются и участвуют в последующих AI-подсказках.
- При недоступном AI система продолжает работать и формирует отчёт.

---

### Этап 9. Качество, тестирование, операционная готовность
**Что реализуем**
- Тесты:
  - unit: parser/classifier/rule engine/report builder;
  - integration: API + Neo4j;
  - contract: структура ответов endpoint-ов.
- Инженерные стандарты:
  - `ruff`, `black`, `mypy`;
  - минимальный CI-пайплайн или эквивалентный локальный quality script.
- Документация:
  - команды запуска;
  - env;
  - сценарии диагностики ошибок.

**Контракты и форматы**
- Все публичные backend DTO и response-models типизированы и покрыты тестами.

**Нюансы**
- Отдельный тест-кейс: `AI unavailable`.
- Отдельный тест-кейс: невалидный файл upload.

**Критерий приёмки**
- Основные сценарии проходят стабильно.
- Линтер/типизация/тесты выполняются без критичных ошибок.

## 5. Политика коммитов и отчёта агента
- После завершения этапа агент обязан сделать **ровно один** коммит с названием из таблицы.
- После коммита агент обязан прислать короткий отчёт:
  - этап и его цель;
  - что реализовано;
  - какие проверки запущены и их результат;
  - совпадение входа/выхода с планом;
  - нюансы/риски/отклонения (или явное “отклонений нет”);
  - SHA коммита.

