import { type FormEvent, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTabsState } from '../../../app/providers/tabs-state-provider'
import { toUserFacingMessage } from '../../../shared/api/error'
import { useReportQuery } from '../../../shared/api/hooks/use-report-query'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'
import { buildRulesTrace, getUnmappedViolationCodes } from '../model/rules-trace'

const resolveCheckId = (searchParams: URLSearchParams): string => {
  return searchParams.get('check_id')?.trim() ?? ''
}

const formatError = (error: unknown, fallbackMessage: string): string => {
  return toUserFacingMessage(error, fallbackMessage)
}

export const RulesInspectorOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    rules,
    setRules,
    lastCheckId,
    setLastCheckId,
  } = useTabsState()
  const { checkIdInput, activeCheckId } = rules

  const reportQuery = useReportQuery(activeCheckId)
  const tracedRules = buildRulesTrace(reportQuery.data)
  const unmappedViolations = getUnmappedViolationCodes(reportQuery.data)

  useEffect(() => {
    const restoredCheckId = resolveCheckId(searchParams)

    setRules((current) => {
      let changed = false
      let next = current

      if (current.checkIdInput.trim().length === 0) {
        const fallbackInput = restoredCheckId || lastCheckId || ''
        if (fallbackInput.length > 0) {
          next = { ...next, checkIdInput: fallbackInput }
          changed = true
        }
      }

      if (!current.activeCheckId) {
        const fallbackCheckId = restoredCheckId || lastCheckId
        if (fallbackCheckId) {
          next = { ...next, activeCheckId: fallbackCheckId }
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [lastCheckId, searchParams, setRules])

  const handleLoadRules = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCheckId = checkIdInput.trim()
    if (normalizedCheckId.length === 0) {
      return
    }

    setRules((current) => ({
      ...current,
      checkIdInput: normalizedCheckId,
      activeCheckId: normalizedCheckId,
    }))
    setLastCheckId(normalizedCheckId)
    setSearchParams({ check_id: normalizedCheckId })
  }

  const resolvedReportRoute = activeCheckId ? `/report?check_id=${encodeURIComponent(activeCheckId)}` : '/report'

  return (
    <PageCard title="Правила" description="">
      <form className="rules-check-id-form" onSubmit={handleLoadRules}>
        <label htmlFor="rules-check-id">Идентификатор проверки</label>
        <div className="rules-check-id-form__controls">
          <input
            id="rules-check-id"
            name="check_id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setRules((current) => ({ ...current, checkIdInput: event.target.value }))}
            placeholder="Введите идентификатор проверки"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Показать правила'}
          </button>
        </div>
      </form>

      <section className="rules-endpoint-coverage" aria-label="Информация">
        <h2>Применённые правила</h2>
        <p>Здесь показаны правила, которые были найдены в отчёте, и их статус.</p>
        <p>
          Связанный отчёт:{' '}
          <Link to={resolvedReportRoute}>открыть отчёт{activeCheckId ? ` (${activeCheckId})` : ''}</Link>
        </p>
      </section>

      {!activeCheckId && !reportQuery.isFetching ? (
        <StatePanel tone="empty" title="Введите идентификатор проверки" message="Укажите идентификатор проверки, чтобы загрузить информацию о правилах." />
      ) : null}

      {reportQuery.isFetching ? <StatePanel tone="loading" title="Загрузка правил" message="Получаем данные о правилах и нарушениях." /> : null}

      {reportQuery.error ? (
        <StatePanel
          tone="error"
          title="Ошибка загрузки"
          message={formatError(reportQuery.error, 'Не удалось получить данные отчёта.')}
          actionLabel="Повторить запрос"
          onAction={() => {
            void reportQuery.refetch()
          }}
        />
      ) : null}

      {reportQuery.data ? (
        <section className="rules-trace" aria-label="Состояние правил">
          <h2>Состояние правил</h2>
          {tracedRules.length === 0 ? (
            <StatePanel tone="empty" title="Правил не найдено" message="В отчёте нет правил для выбранного идентификатора проверки." />
          ) : (
            <ul>
              {tracedRules.map((rule) => (
                <li key={rule.code} className={`rules-trace-item rules-trace-item--${rule.status}`}>
                  <header>
                    <strong>{rule.code}</strong>
                    <span>{rule.status === 'violated' ? 'Есть нарушение' : 'Без нарушений'}</span>
                  </header>
                  <p>Название: {rule.title}</p>
                  <p>Категория: {rule.category}</p>
                  <p>Серьёзность: {rule.severity}</p>
                  {rule.evidence.length > 0 ? (
                    <div>
                      <p>Найдены доказательства:</p>
                      <ul>
                        {rule.evidence.map((message) => (
                          <li key={`${rule.code}-${message}`}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>Доказательств не найдено</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {unmappedViolations.length > 0 ? (
            <div className="rules-warning">
              <p>Найдены нарушения без сопоставленного правила:</p>
              <ul>
                {unmappedViolations.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </PageCard>
  )
}

