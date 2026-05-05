import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api/error'
import { useReportQuery } from '../../../shared/api/hooks/use-report-query'
import { PageCard } from '../../../shared/ui/page-card'
import { buildRulesTrace, getUnmappedViolationCodes } from '../model/rules-trace'

const resolveCheckId = (searchParams: URLSearchParams): string => {
  return searchParams.get('check_id')?.trim() ?? ''
}

const formatError = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof ApiClientError) {
    if (error.traceId) {
      return `${error.message} (trace_id: ${error.traceId})`
    }

    return error.message
  }

  return fallbackMessage
}

export const RulesInspectorOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkIdInput, setCheckIdInput] = useState(() => resolveCheckId(searchParams))
  const [activeCheckId, setActiveCheckId] = useState<string | null>(() => {
    const initialCheckId = resolveCheckId(searchParams)
    return initialCheckId.length > 0 ? initialCheckId : null
  })

  const reportQuery = useReportQuery(activeCheckId)
  const tracedRules = buildRulesTrace(reportQuery.data)
  const unmappedViolations = getUnmappedViolationCodes(reportQuery.data)

  const handleLoadRules = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCheckId = checkIdInput.trim()
    if (normalizedCheckId.length === 0) {
      return
    }

    setActiveCheckId(normalizedCheckId)
    setSearchParams({ check_id: normalizedCheckId })
  }

  const resolvedReportRoute = activeCheckId ? `/report?check_id=${encodeURIComponent(activeCheckId)}` : '/report'

  return (
    <PageCard
      title="RulesViewPage"
      description="Экран трассировки applied_rules из GET /api/v1/reports/{check_id} и явного соответствия правилам/нарушениям."
    >
      <form className="rules-check-id-form" onSubmit={handleLoadRules}>
        <label htmlFor="rules-check-id">check_id</label>
        <div className="rules-check-id-form__controls">
          <input
            id="rules-check-id"
            name="check_id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setCheckIdInput(event.target.value)}
            placeholder="Введите check_id для трассировки правил"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Показать правила'}
          </button>
        </div>
      </form>

      <section className="rules-endpoint-coverage" aria-label="Endpoint coverage">
        <h2>Endpoint Coverage UI</h2>
        <ul>
          <li>
            <code>GET /api/v1/reports/{'{check_id}'}</code> - источник <code>applied_rules</code> и <code>violations</code>.
          </li>
          <li>
            <code>/rules</code> - визуальная трассировка правила к evidence в отчете.
          </li>
        </ul>
        <p>
          Связанный flow отчёта:{' '}
          <Link to={resolvedReportRoute}>перейти в ReportPage{activeCheckId ? ` (${activeCheckId})` : ''}</Link>
        </p>
      </section>

      {reportQuery.error ? <p className="rules-error">{formatError(reportQuery.error, 'Не удалось получить данные отчёта.')}</p> : null}

      {reportQuery.data ? (
        <section className="rules-trace" aria-label="Трассировка правил">
          <h2>Трассировка правил</h2>
          {tracedRules.length === 0 ? <p>Backend вернул пустой список applied_rules для выбранного check_id.</p> : null}
          <ul>
            {tracedRules.map((rule) => (
              <li key={rule.code} className={`rules-trace-item rules-trace-item--${rule.status}`}>
                <header>
                  <strong>{rule.code}</strong>
                  <span>{rule.status === 'violated' ? 'violation found' : 'satisfied'}</span>
                </header>
                <p>title: {rule.title}</p>
                <p>category: {rule.category}</p>
                <p>severity: {rule.severity}</p>
                {rule.evidence.length > 0 ? (
                  <div>
                    <p>evidence:</p>
                    <ul>
                      {rule.evidence.map((message) => (
                        <li key={`${rule.code}-${message}`}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>evidence: not found</p>
                )}
              </li>
            ))}
          </ul>

          {unmappedViolations.length > 0 ? (
            <div className="rules-warning">
              <p>Есть нарушения без соответствующего applied_rule кода:</p>
              <ul>
                {unmappedViolations.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <p>Введите check_id и загрузите отчёт, чтобы увидеть applied_rules и их трассировку.</p>
      )}
    </PageCard>
  )
}
