import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnalysisStatusTimeline } from '../../analysis-status/ui/analysis-status-timeline'
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
    if (error.traceId) {
      return `${error.message} (trace_id: ${error.traceId})`
    }

    return error.message
  }

  return fallback
}

export const StartAnalysisOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentId, setDocumentId] = useState(() => resolveParam(searchParams, 'document_id'))
  const [requestedBy, setRequestedBy] = useState('teacher@course.local')
  const [activeCheckId, setActiveCheckId] = useState<string | null>(() => {
    const restored = resolveParam(searchParams, 'check_id')
    return restored.length > 0 ? restored : null
  })
  const [startError, setStartError] = useState<string | null>(null)

  const startMutation = useStartAnalysisMutation()
  const statusQuery = useAnalysisStatusQuery(activeCheckId)

  const startAnalysis = async () => {
    if (startMutation.isPending) {
      return
    }

    const normalizedDocumentId = documentId.trim()
    const normalizedRequestedBy = requestedBy.trim()

    if (normalizedDocumentId.length === 0 || normalizedRequestedBy.length === 0) {
      setStartError('Укажите document_id и requested_by перед запуском анализа.')
      return
    }

    setStartError(null)

    try {
      const response = await startMutation.mutateAsync({
        document_id: normalizedDocumentId,
        requested_by: normalizedRequestedBy,
      })

      setActiveCheckId(response.check_id)
      setSearchParams({
        document_id: normalizedDocumentId,
        check_id: response.check_id,
      })
    } catch (error) {
      setStartError(formatError(error, 'Не удалось запустить анализ.'))
    }
  }

  const submitStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await startAnalysis()
  }

  const reportRoute = activeCheckId ? `/report?check_id=${encodeURIComponent(activeCheckId)}` : '/report'

  return (
    <PageCard
      title="AnalysisPage"
      description="Точки входа для POST /api/v1/analyses/start (useStartAnalysisMutation) и GET /api/v1/analyses/{check_id} (useAnalysisStatusQuery)."
    >
      <form className="analysis-form" onSubmit={submitStart}>
        <label htmlFor="analysis-document-id">document_id</label>
        <input
          id="analysis-document-id"
          type="text"
          value={documentId}
          onChange={(event) => setDocumentId(event.target.value)}
          placeholder="document_id после upload"
          autoComplete="off"
        />

        <label htmlFor="analysis-requested-by">requested_by</label>
        <input
          id="analysis-requested-by"
          type="text"
          value={requestedBy}
          onChange={(event) => setRequestedBy(event.target.value)}
          placeholder="teacher@course.local"
          autoComplete="off"
        />

        <button type="submit" disabled={startMutation.isPending}>
          {startMutation.isPending ? 'Запуск...' : 'Запустить анализ'}
        </button>
      </form>

      <AnalysisStatusTimeline />

      {startMutation.isPending ? (
        <StatePanel tone="loading" title="Старт анализа" message="Backend запускает pipeline проверки документа." />
      ) : null}

      {startError ? (
        <StatePanel tone="error" title="Ошибка запуска" message={startError} actionLabel="Повторить запуск" onAction={startAnalysis} />
      ) : null}

      {!activeCheckId && !startError && !startMutation.isPending ? (
        <StatePanel tone="empty" title="Ожидание запуска" message="Запустите анализ, чтобы получить check_id и статус pipeline." />
      ) : null}

      {activeCheckId && statusQuery.isLoading ? (
        <StatePanel tone="loading" title="Получение статуса" message={`Проверяем текущий status для check_id: ${activeCheckId}.`} />
      ) : null}

      {activeCheckId && statusQuery.error ? (
        <StatePanel
          tone="error"
          title="Статус недоступен"
          message={formatError(statusQuery.error, 'Не удалось получить статус анализа.')}
          actionLabel="Повторить запрос статуса"
          onAction={() => {
            void statusQuery.refetch()
          }}
        />
      ) : null}

      {statusQuery.data && statusQuery.data.status === 'ERROR' ? (
        <StatePanel
          tone="error"
          title="Анализ завершился с ошибкой"
          message={statusQuery.data.error ?? 'Pipeline вернул статус ERROR без подробностей.'}
          actionLabel="Повторить запрос статуса"
          onAction={() => {
            void statusQuery.refetch()
          }}
        />
      ) : null}

      {statusQuery.data && statusQuery.data.status !== 'ERROR' ? (
        <StatePanel
          tone={statusQuery.data.status === 'REPORT_READY' ? 'success' : 'loading'}
          title={statusQuery.data.status === 'REPORT_READY' ? 'Отчёт готов' : 'Анализ выполняется'}
          message={`status: ${statusQuery.data.status}${typeof statusQuery.data.progress === 'number' ? `, progress: ${statusQuery.data.progress}%` : ''}`}
        >
          {statusQuery.data.status === 'REPORT_READY' ? (
            <Link className="state-panel__link" to={reportRoute}>
              Перейти к ReportPage
            </Link>
          ) : null}
        </StatePanel>
      ) : null}
    </PageCard>
  )
}
