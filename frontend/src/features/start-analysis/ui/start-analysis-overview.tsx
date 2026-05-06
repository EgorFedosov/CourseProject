import { type FormEvent, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTabsState } from '../../../app/providers/tabs-state-provider'
import { ApiClientError } from '../../../shared/api/error'
import { useAnalysisStatusQuery } from '../../../shared/api/hooks/use-analysis-status-query'
import { useStartAnalysisMutation } from '../../../shared/api/hooks/use-start-analysis-mutation'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'

const resolveParam = (params: URLSearchParams, key: string): string => {
  return params.get(key)?.trim() ?? ''
}

const formatError = (error: unknown, fallback: string): string => {
  if (error instanceof ApiClientError) {
    // UX-only change: hide trace_id from users, show only user-friendly message
    return error.message
  }

  return fallback
}

const getPipelineStages = (status?: string): Array<{ id: string; name: string; active: boolean; completed: boolean }> => {
  // UX-only change: show analysis pipeline stages
  const stages = [
    { id: 'init', name: 'Инициализация', active: false, completed: false },
    { id: 'classify', name: 'Классификация', active: false, completed: false },
    { id: 'validate', name: 'Проверка', active: false, completed: false },
    { id: 'report', name: 'Формирование отчета', active: false, completed: false },
  ]

  switch (status) {
    case 'REPORT_READY':
      return stages.map((s) => ({ ...s, completed: true }))
    case 'ANALYZING':
      // Show all stages as in-progress (active means current or in-progress)
      return stages.map((s, idx) => ({
        ...s,
        active: idx < stages.length - 1,
        completed: idx < 1,
      }))
    default:
      return stages
  }
}

export const StartAnalysisOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    analysis,
    setAnalysis,
    lastDocumentId,
    lastCheckId,
    setLastCheckId,
  } = useTabsState()
  const { documentId, requestedBy, activeCheckId, startError } = analysis

  const startMutation = useStartAnalysisMutation()
  const statusQuery = useAnalysisStatusQuery(activeCheckId)

  useEffect(() => {
    const restoredDocumentId = resolveParam(searchParams, 'document_id')
    const restoredCheckId = resolveParam(searchParams, 'check_id')

    setAnalysis((current) => {
      let changed = false
      let next = current

      if (current.documentId.length === 0) {
        const fallbackDocumentId = restoredDocumentId || lastDocumentId || ''
        if (fallbackDocumentId.length > 0) {
          next = { ...next, documentId: fallbackDocumentId }
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
  }, [lastCheckId, lastDocumentId, searchParams, setAnalysis])

  // UX-only change: compute pipeline stages based on status
  const pipelineStages = useMemo(
    () => getPipelineStages(statusQuery.data?.status),
    [statusQuery.data?.status]
  )

  const startAnalysis = async () => {
    if (startMutation.isPending) {
      return
    }

    const normalizedDocumentId = documentId.trim()
    const normalizedRequestedBy = requestedBy.trim()

    if (normalizedDocumentId.length === 0 || normalizedRequestedBy.length === 0) {
      setAnalysis((current) => ({
        ...current,
        startError: 'Укажите document_id и requested_by перед запуском анализа.',
      }))
      return
    }

    setAnalysis((current) => ({ ...current, startError: null }))

    try {
      const response = await startMutation.mutateAsync({
        document_id: normalizedDocumentId,
        requested_by: normalizedRequestedBy,
      })

      setAnalysis((current) => ({
        ...current,
        documentId: normalizedDocumentId,
        requestedBy: normalizedRequestedBy,
        activeCheckId: response.check_id,
        startError: null,
      }))
      setLastCheckId(response.check_id)
      setSearchParams({
        document_id: normalizedDocumentId,
        check_id: response.check_id,
      })
    } catch (error) {
      setAnalysis((current) => ({
        ...current,
        startError: formatError(error, 'Не удалось запустить анализ.'),
      }))
    }
  }

  const submitStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await startAnalysis()
  }

  const reportRoute = activeCheckId ? `/report?check_id=${encodeURIComponent(activeCheckId)}` : '/report'

  return (
    <PageCard title="Проверка документа" description="">
      {/* UX-only change: improved form layout and messaging */}
      <form className="analysis-form" onSubmit={submitStart}>
        {!activeCheckId ? (
          <>
            <label htmlFor="analysis-document-id">ID документа</label>
            <input
              id="analysis-document-id"
              type="text"
              value={documentId}
              onChange={(event) => setAnalysis((current) => ({ ...current, documentId: event.target.value }))}
              placeholder="Введите ID документа"
              autoComplete="off"
            />

            <label htmlFor="analysis-requested-by">Запрашивает</label>
            <input
              id="analysis-requested-by"
              type="text"
              value={requestedBy}
              onChange={(event) => setAnalysis((current) => ({ ...current, requestedBy: event.target.value }))}
              placeholder="Например, ваш email"
              autoComplete="off"
            />
          </>
        ) : null}

        {!activeCheckId ? (
          <button type="submit" disabled={startMutation.isPending}>
            {startMutation.isPending ? 'Запуск...' : 'Запустить анализ'}
          </button>
        ) : null}
      </form>

      {startMutation.isPending ? (
        <StatePanel tone="loading" title="Анализ запускается" message="Проверка документа начата, подождите." />
      ) : null}

      {startError ? (
        <StatePanel tone="error" title="Ошибка запуска" message={startError} actionLabel="Повторить запуск" onAction={startAnalysis} />
      ) : null}

      {!activeCheckId && !startError && !startMutation.isPending ? (
        <StatePanel tone="empty" title="Готово к проверке" message="Укажите параметры и запустите анализ, чтобы получить результат." />
      ) : null}

      {activeCheckId && statusQuery.isLoading ? (
        <StatePanel tone="loading" title="Получаем статус" message="Проверяем состояние проверки..." />
      ) : null}

      {activeCheckId && statusQuery.error ? (
        <StatePanel
          tone="error"
          title="Статус недоступен"
          message={formatError(statusQuery.error, 'Не удалось получить статус проверки.')}
          actionLabel="Повторить"
          onAction={() => {
            void statusQuery.refetch()
          }}
        />
      ) : null}

      {statusQuery.data && statusQuery.data.status === 'ERROR' ? (
        <StatePanel
          tone="error"
          title="Анализ завершился с ошибкой"
          message={statusQuery.data.error ?? 'Произошла ошибка в процессе проверки.'}
          actionLabel="Повторить"
          onAction={() => {
            void statusQuery.refetch()
          }}
        />
      ) : null}

      {statusQuery.data && statusQuery.data.status !== 'ERROR' ? (
        <>
          {/* UX-only change: show pipeline progress */}
          <section className="analysis-pipeline" aria-label="Этапы анализа">
            <h2>Этапы проверки</h2>
            <div className="analysis-pipeline__stages">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.id}
                  className={`analysis-pipeline__stage ${stage.completed ? 'analysis-pipeline__stage--completed' : ''} ${stage.active ? 'analysis-pipeline__stage--active' : ''}`}
                >
                  <div className="analysis-pipeline__stage-icon">
                    {stage.completed ? '✓' : stage.active ? '●' : '○'}
                  </div>
                  <div className="analysis-pipeline__stage-label">{stage.name}</div>
                </div>
              ))}
            </div>
          </section>

          <StatePanel
            tone={statusQuery.data.status === 'REPORT_READY' ? 'success' : 'loading'}
            title={statusQuery.data.status === 'REPORT_READY' ? 'Отчёт готов' : 'Анализ выполняется'}
            message={
              statusQuery.data.status === 'REPORT_READY'
                ? 'Готово к просмотру отчёта.'
                : typeof statusQuery.data.progress === 'number'
                ? `Идёт проверка — ${statusQuery.data.progress}% готово.`
                : 'Идёт проверка, подождите.'
            }
          >
            {statusQuery.data.status === 'REPORT_READY' ? (
              <Link className="state-panel__link" to={reportRoute}>
                Открыть отчёт
              </Link>
            ) : null}
          </StatePanel>
        </>
      ) : null}
    </PageCard>
  )
}

