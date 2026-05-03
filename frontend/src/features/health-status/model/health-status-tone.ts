export const healthStatusTone = {
  healthy: 'success',
  degraded: 'warning',
  down: 'error',
} as const

export type HealthStatusTone = (typeof healthStatusTone)[keyof typeof healthStatusTone]

export const resolveHealthTone = (apiStatus: string, neo4jStatus: string): HealthStatusTone => {
  const normalizedApiStatus = apiStatus.toLowerCase()
  const normalizedNeo4jStatus = neo4jStatus.toLowerCase()

  if (normalizedApiStatus.includes('down') || normalizedNeo4jStatus.includes('down')) {
    return healthStatusTone.down
  }

  if (normalizedApiStatus.includes('degraded') || normalizedNeo4jStatus.includes('degraded')) {
    return healthStatusTone.degraded
  }

  return healthStatusTone.healthy
}
