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
        <span>Backend status: checking...</span>
      </div>
    )
  }

  if (healthQuery.error) {
    const error = healthQuery.error instanceof ApiClientError ? healthQuery.error.message : 'Health check failed'

    return (
      <div className="health-badge" aria-live="polite">
        <StatusDot tone="error" />
        <span>Backend status: {error}</span>
      </div>
    )
  }

  if (!healthQuery.data) {
    return (
      <div className="health-badge" aria-live="polite">
        <StatusDot tone="warning" />
        <span>Backend status: unavailable</span>
      </div>
    )
  }

  const tone = resolveHealthTone(healthQuery.data.api_status, healthQuery.data.neo4j_status)

  return (
    <div className="health-badge" aria-live="polite">
      <StatusDot tone={tone} />
      <span>
        Backend: {healthQuery.data.api_status} | Neo4j: {healthQuery.data.neo4j_status}
        {healthQuery.data.ai_status ? ` | AI: ${healthQuery.data.ai_status}` : ''}
      </span>
    </div>
  )
}
