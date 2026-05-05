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
    if (error.traceId) {
      return `${error.message} (trace_id: ${error.traceId})`
    }

    return error.message
  }

  return 'Не удалось загрузить отчёт.'
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
      missing.push('determined_type')
    }

    if (typeof reportQuery.data.determined_semester !== 'number') {
      missing.push('determined_semester')
    }

    return missing.length > 0 ? `Отчёт неполный: отсутствуют поля ${missing.join(', ')}.` : null
  }, [reportQuery.data])

  return (
    <PageCard title="ReportPage" description="Точка входа для GET /api/v1/reports/{check_id} через typed hook useReportQuery.">
      <form className="report-check-id-form" onSubmit={submitCheckId}>
        <label htmlFor="report-check-id">check_id</label>
        <div className="report-check-id-form__controls">
          <input
            id="report-check-id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setCheckIdInput(event.target.value)}
            placeholder="Введите check_id для загрузки отчёта"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Загрузить отчёт'}
          </button>
        </div>
      </form>

      {!activeCheckId ? (
        <StatePanel tone="empty" title="Ожидание check_id" message="Укажите check_id, чтобы получить отчёт и перейти к feedback/rules." />
      ) : null}

      {activeCheckId && reportQuery.isLoading ? (
        <StatePanel tone="loading" title="Получение отчёта" message={`Запрашиваем GET /api/v1/reports/${activeCheckId}.`} />
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
        <section className="report-summary" aria-label="Сводка отчёта">
          <h2>Сводка отчёта</h2>
          <p>overall_status: {reportQuery.data.overall_status}</p>
          <p>determined_type: {reportQuery.data.determined_type ?? 'not determined'}</p>
          <p>
            determined_semester:{' '}
            {typeof reportQuery.data.determined_semester === 'number' ? reportQuery.data.determined_semester : 'not determined'}
          </p>
          <p>applied_rules: {reportQuery.data.applied_rules.length}</p>
          <p>violations: {reportQuery.data.violations.length}</p>
          <p>recommendations: {reportQuery.data.recommendations.length}</p>

          {incompleteReportReason ? <StatePanel tone="empty" title="Неполный отчёт" message={incompleteReportReason} /> : null}

          <section className="report-linked-flows" aria-label="Связанные переходы">
            <h3>Переходы</h3>
            <div>
              <Link to={feedbackRoute}>Открыть FeedbackPage</Link>
              <Link to={rulesRoute}>Открыть RulesViewPage</Link>
            </div>
          </section>
        </section>
      ) : null}
    </PageCard>
  )
}
