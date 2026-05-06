import { useHealthQuery } from '../../../shared/api'
import { ApiClientError } from '../../../shared/api/error'
import { resolveHealthTone } from '../model/health-status-tone'

const StatusDot = ({ tone }: { tone: 'success' | 'warning' | 'error' }) => {
  return <span className={`health-dot health-dot--${tone}`} aria-hidden="true" />
}

export const HealthStatusBadge = () => {
  const healthQuery = useHealthQuery()

  if (healthQuery.isLoading) {
    return (
      <div className="health-badge" aria-live="polite">
        <StatusDot tone="warning" />
        <span>Проверка сервера...</span>
      </div>
    )
  }

  if (healthQuery.error) {
    return (
      <div className="health-badge" aria-live="polite">
        <StatusDot tone="error" />
        <span>Сервер недоступен</span>
        <button
          type="button"
          className="health-badge__retry"
          onClick={() => {
            void healthQuery.refetch()
          }}
        >
          Повторить
        </button>
      </div>
    )
  }

  if (!healthQuery.data) {
    return (
      <div className="health-badge" aria-live="polite">
        <StatusDot tone="warning" />
        <span>Сервер недоступен</span>
      </div>
    )
  }

  return (
    <div className="health-badge" aria-live="polite">
      <StatusDot tone="success" />
      <span>Сервер в норме</span>
    </div>
  )
}
