import { healthResponseSchema, type HealthResponse } from '../contracts/health'
import { requestWithContract } from '../request'

export const getHealth = async (): Promise<HealthResponse> => {
  return requestWithContract({
    endpoint: '/health',
    method: 'GET',
    responseSchema: healthResponseSchema,
  })
}
