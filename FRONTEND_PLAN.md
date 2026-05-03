# Frontend Implementation Plan (расширенный)

## 0. Основание плана
План опирается на `README.md` разделы:  
`2` (роли и границы MVP), `3.1` (frontend стек), `5` (pipeline и статусы), `9` (API контракт), `10` (frontend архитектура), `12` (SOLID/GRASP), `13-15` (NFR/безопасность/тестирование), `17` (DoD), `20` (не нарушать контракты).

## 1. Принципы, которые нельзя нарушать
- Каждый backend endpoint должен иметь явный экран или явное пользовательское действие.
- Запрещены “скрытые” API-вызовы без UI-поведения.
- Компоненты UI не содержат бизнес-правил проверки документов.
- Runtime-валидация API-ответов обязательна (Zod).
- Весь пользовательский путь обязателен и прозрачен: `upload -> analysis -> report -> feedback -> rules`.

## 2. Матрица обязательной синхронизации API -> UI

| Endpoint | UI модуль/страница | Что пользователь должен увидеть |
|---|---|---|
| `GET /api/v1/health` | App Shell | Статус доступности backend/neo4j |
| `POST /api/v1/documents/upload` | `UploadPage` | Успех/ошибка загрузки + `document_id` |
| `POST /api/v1/analyses/start` | `AnalysisPage` | Старт проверки + `check_id` |
| `GET /api/v1/analyses/{check_id}` | `AnalysisPage` | Текущий статус/прогресс/ошибка |
| `GET /api/v1/reports/{check_id}` | `ReportPage` | Тип/семестр/правила/нарушения/итог |
| `POST /api/v1/feedback/corrections` | `FeedbackPage` | Подтверждение отправки правок |

## 3. Последовательные этапы (логичные и завершённые)

| № | Этап | Вход этапа | Выход этапа | Commit name |
|---|---|---|---|---|
| 1 | Каркас приложения и модульная архитектура | Текущее состояние: frontend отсутствует как рабочее SPA | React+TS+Vite каркас, App Shell, роутинг, структура `pages/features/entities/shared`, базовая навигация | `chore(frontend): bootstrap app shell routing and module structure` |
| 2 | Типизированный API слой | Каркас SPA + backend-контракты из README | `axios` client, Zod-схемы, query/mutation hooks для всех endpoint-ов, централизованная обработка ошибок | `feat(api): add typed backend client with zod contracts` |
| 3 | Загрузка документа | API upload hook + базовый роутинг | Полноценный `UploadPage`: выбор файла, валидация, отправка `POST /documents/upload`, сохранение `document_id` | `feat(upload): implement document upload flow and validation` |
| 4 | Запуск анализа и мониторинг | Наличие `document_id` после загрузки | `AnalysisPage`: запуск `POST /analyses/start`, polling `GET /analyses/{id}`, отображение статусов pipeline | `feat(analysis): implement start flow and live status tracking` |
| 5 | Отчёт и результат проверки | `check_id` и готовый отчёт backend | `ReportPage` с полным отображением структуры отчёта без потери полей | `feat(report): implement complete report visualization` |
| 6 | Интерфейс правок преподавателя | Данные отчёта и violations | `FeedbackPage`: форма корректировок и `POST /feedback/corrections` | `feat(feedback): implement teacher corrections submission flow` |
| 7 | Rules Inspector и трассировка правил | Отчёт и applied requirements | `RulesViewPage` + навигация к нему, явное соответствие rule-данных backend и UI | `feat(rules): add applied-rules inspector and endpoint coverage ui` |
| 8 | Глобальная устойчивость UX | Все основные страницы и переходы | Единые loading/error/empty/success состояния, health-индикатор, обработка recoverable ошибок без потери контекста | `chore(frontend): harden ux states tests and quality gates` |

## 4. Детальная реализация по этапам

### Этап 1. Каркас приложения и модульная архитектура
**Что реализуем**
- Инициализация SPA (`React 18 + TypeScript + Vite`).
- Router и страницы:
  - `UploadPage`
  - `AnalysisPage`
  - `ReportPage`
  - `FeedbackPage`
  - `RulesViewPage`
- App Shell:
  - верхняя навигация;
  - глобальные уведомления;
  - контейнер основного контента.

**Нюансы**
- Архитектурно отделить:
  - UI-компоненты;
  - feature-hooks/services;
  - shared-утилиты.
- Избегать логики API прямо в JSX.

**Критерий приёмки**
- Приложение запускается локально.
- Все страницы доступны по роутам.

---

### Этап 2. Типизированный API слой
**Что реализуем**
- `axios` инстанс с базовым URL `/api/v1`.
- Контрактные Zod-схемы:
  - health;
  - upload;
  - analysis start/status;
  - report;
  - feedback.
- TanStack Query hooks:
  - queries: health, status, report;
  - mutations: upload, start analysis, submit feedback.

**Нюансы**
- Runtime-валидация всех ответов.
- Унифицированная ошибка для UI (чтобы не дублировать разбор в каждом экране).
- Retry-политика только там, где безопасно (например, status polling).

**Критерий приёмки**
- Каждый endpoint вызывается только через typed layer.
- Ошибки контракта ловятся и отображаются корректно.

---

### Этап 3. Загрузка документа
**Что реализуем**
- Upload-форму с `React Hook Form + Zod`.
- Клиентские проверки:
  - форматы: PDF/DOCX;
  - лимит размера.
- Вызов `POST /documents/upload`.
- Сохранение `document_id` в state (серверный/локальный контекст) для следующих этапов.

**Нюансы**
- Обязательно показывать:
  - progress/loader;
  - причину ошибки;
  - успешный результат.
- Запрет запуска анализа до успешной загрузки.

**Критерий приёмки**
- Пользователь не может перейти в `AnalysisPage` без валидного `document_id`.

---

### Этап 4. Запуск анализа и мониторинг
**Что реализуем**
- Кнопку запуска анализа (`POST /analyses/start`).
- Polling `GET /analyses/{check_id}`.
- Визуализацию статусов:
  - `ANALYZING`
  - `TYPE_DETERMINED`
  - `SEMESTER_DETERMINED`
  - `REQUIREMENTS_CHECKED`
  - `REPORT_READY`
  - `ERROR`
- Автопереход к отчёту на `REPORT_READY`.

**Нюансы**
- Polling останавливается на финальном состоянии.
- При ошибке пользователь видит конкретное сообщение и действие “повторить”.
- `check_id` сохраняется для перезагрузки страницы и восстановления состояния.

**Критерий приёмки**
- Этапы pipeline прозрачно отображаются в UI и совпадают с backend-статусами.

---

### Этап 5. Отчёт и результат проверки
**Что реализуем**
- Получение данных `GET /reports/{check_id}`.
- Рендер секций:
  - определённый тип и семестр;
  - итоговый статус;
  - применённые правила;
  - нарушения с severity/category;
  - рекомендации.

**Нюансы**
- Нельзя терять поля из ответа backend.
- Если часть данных опциональна, UI должен корректно показывать fallback, а не падать.
- Дать пользователю явные переходы к feedback/rules.

**Критерий приёмки**
- Отчёт полностью отражает backend-данные.

---

### Этап 6. Интерфейс правок преподавателя
**Что реализуем**
- Форму с полями:
  - `final_type`
  - `final_semester`
  - `confirmed_violations`
  - `rejected_violations`
  - `teacher_comment`
- Отправку на `POST /feedback/corrections`.
- Экранное подтверждение результата.

**Нюансы**
- Валидация формы соответствует backend-контракту.
- Защита от double-submit.
- При ошибке отправки введённые данные не теряются.

**Критерий приёмки**
- Преподаватель может отправить правки из UI в один непрерывный сценарий.

---

### Этап 7. Rules Inspector и трассировка правил
**Что реализуем**
- `RulesViewPage`:
  - список применённых требований;
  - статус выполнения/нарушения;
  - привязка к evidence из отчёта (если есть).
- Явные точки входа на экран правил.

**Нюансы**
- Если отдельного endpoint для правил нет, данные берутся из `GET /reports/{check_id}`.
- Для каждого backend endpoint должен быть видимый UI flow.

**Критерий приёмки**
- Нет “невидимых” API сценариев.
- Пользователь может проверить, какие правила применялись.

---

### Этап 8. Глобальная устойчивость UX и качество
**Что реализуем**
- Единый UI-паттерн для состояний:
  - loading;
  - empty;
  - error;
  - success.
- Health-индикатор в App Shell (`GET /health`).
- Тестирование:
  - unit (hooks/utils);
  - component (upload/analysis/report/feedback);
  - smoke e2e (основная цепочка).

**Нюансы**
- Обработать сценарии:
  - backend недоступен;
  - анализ завершился `ERROR`;
  - неполный отчёт.
- Базовая доступность интерфейса: labels, focus, keyboard.

**Критерий приёмки**
- Полный путь пользователя стабилен и предсказуем.
- Ключевые сценарии покрыты тестами.

## 5. Политика коммитов и отчёта агента
- После завершения этапа агент делает **ровно один** коммит с названием из таблицы.
- После коммита агент присылает краткий отчёт:
  - этап и что реализовано;
  - какие проверки запущены и их результат;
  - совпадение входа/выхода с планом;
  - риски/отклонения (или явное “отклонений нет”);
  - SHA коммита.

