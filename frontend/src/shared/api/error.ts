import axios from 'axios'
import { z } from 'zod'
import { backendErrorSchema } from './contracts/common'

export type ApiErrorCode = 'NETWORK_ERROR' | 'HTTP_ERROR' | 'CONTRACT_ERROR' | 'UNKNOWN_ERROR'

export interface ApiErrorMeta {
  endpoint: string
  method: string
  statusCode?: number
  details?: unknown
  traceId?: string
}

export class ApiClientError extends Error {
  readonly code: ApiErrorCode
  readonly endpoint: string
  readonly method: string
  readonly statusCode?: number
  readonly details?: unknown
  readonly traceId?: string

  constructor(code: ApiErrorCode, message: string, meta: ApiErrorMeta) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.endpoint = meta.endpoint
    this.method = meta.method
    this.statusCode = meta.statusCode
    this.details = meta.details
    this.traceId = meta.traceId
  }
}

const fallbackBackendErrorSchema = z
  .object({
    detail: z.string().min(1),
  })
  .passthrough()

const parseBackendMessage = (data: unknown): { message: string; details?: unknown; traceId?: string } => {
  const standardized = backendErrorSchema.safeParse(data)
  if (standardized.success) {
    return {
      message: standardized.data.message ?? standardized.data.code ?? 'Backend request failed',
      details: standardized.data.details,
      traceId: standardized.data.trace_id,
    }
  }

  const fallback = fallbackBackendErrorSchema.safeParse(data)
  if (fallback.success) {
    return {
      message: fallback.data.detail,
      details: fallback.data,
    }
  }

  return {
    message: 'Backend request failed',
    details: data,
  }
}

export const toApiClientError = (error: unknown, endpoint: string, method: string): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const parsed = parseBackendMessage(error.response.data)
      return new ApiClientError('HTTP_ERROR', parsed.message, {
        endpoint,
        method,
        statusCode: error.response.status,
        details: parsed.details,
        traceId: parsed.traceId,
      })
    }

    return new ApiClientError('NETWORK_ERROR', error.message || 'Network error', {
      endpoint,
      method,
      details: error.toJSON?.() ?? undefined,
    })
  }

  return new ApiClientError('UNKNOWN_ERROR', 'Unexpected API error', {
    endpoint,
    method,
    details: error,
  })
}

export const fromContractError = (
  endpoint: string,
  method: string,
  cause: z.ZodError,
): ApiClientError => {
  return new ApiClientError('CONTRACT_ERROR', 'Response contract validation failed', {
    endpoint,
    method,
    details: cause.issues,
  })
}

export const fromRequestContractError = (
  endpoint: string,
  method: string,
  cause: z.ZodError,
): ApiClientError => {
  return new ApiClientError('CONTRACT_ERROR', 'Request payload validation failed', {
    endpoint,
    method,
    details: cause.issues,
  })
}

export const shouldRetryStatusQuery = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 2) {
    return false
  }

  if (!(error instanceof ApiClientError)) {
    return false
  }

  if (error.code === 'NETWORK_ERROR') {
    return true
  }

  if (error.code === 'HTTP_ERROR' && typeof error.statusCode === 'number') {
    return error.statusCode >= 500
  }

  return false
}

const hasCyrillic = (value: string): boolean => /[А-Яа-яЁё]/.test(value)

export const toUserFacingMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof ApiClientError)) {
    return fallback
  }

  if (hasCyrillic(error.message)) {
    return error.message
  }

  if (error.code === 'NETWORK_ERROR') {
    return 'Сервер недоступен. Проверьте подключение и повторите попытку.'
  }

  if (error.code === 'CONTRACT_ERROR') {
    return 'Сервис вернул неожиданный ответ. Повторите запрос.'
  }

  if (error.code === 'HTTP_ERROR') {
    if (error.statusCode === 404) {
      return 'Данные не найдены.'
    }
    if (error.statusCode === 409) {
      return 'Операция пока недоступна. Попробуйте позже.'
    }
    if (error.statusCode === 413) {
      return 'Размер файла превышает допустимый лимит.'
    }
    if (error.statusCode === 400) {
      return 'Проверьте корректность введённых данных.'
    }
    if (typeof error.statusCode === 'number' && error.statusCode >= 500) {
      return 'Произошла ошибка сервера. Повторите попытку позже.'
    }
  }

  return fallback
}
