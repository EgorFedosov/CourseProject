import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api/error'
import { useReportQuery } from '../../../shared/api/hooks/use-report-query'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'

const resolveCheckId = (params: URLSearchParams): string => {
  return params.get('check_id')?.trim() ?? ''
}

const formatError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    // UX-only change: hide trace_id from users, show only user-friendly message
    return error.message
  }

  return 'Не удалось загрузить отчёт.'
}

const formatOverallStatus = (status: string): { text: string; tone: 'success' | 'warning' | 'error' } => {
  // UX-only change: user-friendly status formatting
  switch (status) {
    case 'REPORT_READY':
      return { text: 'Проверка завершена', tone: 'success' }
    case 'ANALYZING':
      return { text: 'В процессе', tone: 'warning' }
    case 'UPLOADED':
      return { text: 'Загружен', tone: 'warning' }
    case 'NOT_UPLOADED':
      return { text: 'Не загружен', tone: 'error' }
    case 'ERROR':
      return { text: 'Ошибка', tone: 'error' }
    default:
      return { text: status, tone: 'warning' }
  }
}

export const ReportViewOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkIdInput, setCheckIdInput] = useState(() => resolveCheckId(searchParams))
  const [activeCheckId, setActiveCheckId] = useState<string | null>(() => {
    const initial = resolveCheckId(searchParams)
    return initial.length > 0 ? initial : null
  })

  const reportQuery = useReportQuery(activeCheckId)

  const submitCheckId = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = checkIdInput.trim()
    if (normalized.length === 0) {
      return
    }

    setActiveCheckId(normalized)
    setSearchParams({ check_id: normalized })
  }

  const feedbackRoute = activeCheckId ? `/feedback?check_id=${encodeURIComponent(activeCheckId)}` : '/feedback'
  const rulesRoute = activeCheckId ? `/rules?check_id=${encodeURIComponent(activeCheckId)}` : '/rules'

  const incompleteReportReason = useMemo(() => {
    if (!reportQuery.data) {
      return null
    }

    const missing: string[] = []
    if (!reportQuery.data.determined_type) {
      missing.push('тип документа')
    }

    if (typeof reportQuery.data.determined_semester !== 'number') {
      missing.push('семестр')
    }

    return missing.length > 0 ? `Отчёт неполный: отсутствуют поля ${missing.join(', ')}.` : null
  }, [reportQuery.data])

  const overallStatusInfo = useMemo(() => {
    return reportQuery.data ? formatOverallStatus(reportQuery.data.overall_status) : null
  }, [reportQuery.data?.overall_status])

  return (
    <PageCard title="Отчёт" description="">
      <form className="report-check-id-form" onSubmit={submitCheckId}>
        <label htmlFor="report-check-id">ID проверки</label>
        <div className="report-check-id-form__controls">
          <input
            id="report-check-id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setCheckIdInput(event.target.value)}
            placeholder="Введите ID проверки"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Показать отчёт'}
          </button>
        </div>
      </form>

      {!activeCheckId ? (
        <StatePanel tone="empty" title="Введите ID проверки" message="Укажите ID проверки, чтобы увидеть отчёт." />
      ) : null}

      {activeCheckId && reportQuery.isLoading ? (
        <StatePanel tone="loading" title="Загружаем отчёт" message="Пожалуйста, подождите." />
      ) : null}

      {reportQuery.error ? (
        <StatePanel
          tone="error"
          title="Отчёт недоступен"
          message={formatError(reportQuery.error)}
          actionLabel="Повторить запрос"
          onAction={() => {
            void reportQuery.refetch()
          }}
        />
      ) : null}

      {reportQuery.data ? (
        <>
          {/* UX-only change: improved report summary layout with better hierarchy */}
          <section className="report-summary" aria-label="Сводка отчёта">
            {/* Overall status as dominant visual element */}
            <div className={`report-summary__status report-summary__status--${overallStatusInfo?.tone}`}>
              <span className="report-summary__status-icon">
                {overallStatusInfo?.tone === 'success' ? '✓' : overallStatusInfo?.tone === 'error' ? '✕' : '!'}
              </span>
              <div>
                <strong className="report-summary__status-text">{overallStatusInfo?.text}</strong>
                {incompleteReportReason ? <small>{incompleteReportReason}</small> : null}
              </div>
            </div>

            {/* Document metadata */}
            <div className="report-summary__grid">
              <div className="report-summary__field">
                <label>Тип документа</label>
                <strong>{reportQuery.data.determined_type ?? '—'}</strong>
              </div>
              <div className="report-summary__field">
                <label>Семестр</label>
                <strong>
                  {typeof reportQuery.data.determined_semester === 'number' ? reportQuery.data.determined_semester : '—'}
                </strong>
              </div>
              <div className="report-summary__field">
                <label>Применено правил</label>
                <strong>{reportQuery.data.applied_rules.length}</strong>
              </div>
            </div>

            {/* Issues summary */}
            {reportQuery.data.violations.length > 0 || reportQuery.data.recommendations.length > 0 ? (
              <div className="report-summary__issues">
                {reportQuery.data.violations.length > 0 ? (
                  <div className="report-summary__issue-card report-summary__issue-card--violations">
                    <strong>{reportQuery.data.violations.length}</strong>
                    <span>Нарушений найдено</span>
                  </div>
                ) : null}
                {reportQuery.data.recommendations.length > 0 ? (
                  <div className="report-summary__issue-card report-summary__issue-card--recommendations">
                    <strong>{reportQuery.data.recommendations.length}</strong>
                    <span>Рекомендаций</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="report-summary__no-issues">
                <strong>Все проверки пройдены ✓</strong>
                <span>Нарушений и рекомендаций не найдено</span>
              </div>
            )}
          </section>

          {/* Next steps */}
          <section className="report-linked-flows" aria-label="Следующие шаги">
            <h3>Следующие шаги</h3>
            <div className="report-linked-flows__actions">
              <Link to={feedbackRoute} className="report-linked-flows__link">
                📝 Перейти к правкам
              </Link>
              <Link to={rulesRoute} className="report-linked-flows__link">
                📖 Посмотреть правила
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </PageCard>
  )
}
