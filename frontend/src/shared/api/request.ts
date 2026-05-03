import type { ZodType } from 'zod'
import { apiClient } from './client'
import { fromContractError, toApiClientError } from './error'

interface RequestConfig<TResponse, TRequest = unknown> {
  endpoint: string
  method: 'GET' | 'POST'
  responseSchema: ZodType<TResponse>
  data?: TRequest
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

export const requestWithContract = async <TResponse, TRequest = unknown>(
  config: RequestConfig<TResponse, TRequest>,
): Promise<TResponse> => {
  try {
    const response = await apiClient.request({
      url: config.endpoint,
      method: config.method,
      data: config.data,
      params: config.params,
      headers: config.headers,
    })

    const parsed = config.responseSchema.safeParse(response.data)
    if (!parsed.success) {
      throw fromContractError(config.endpoint, config.method, parsed.error)
    }

    return parsed.data
  } catch (error) {
    throw toApiClientError(error, config.endpoint, config.method)
  }
}
