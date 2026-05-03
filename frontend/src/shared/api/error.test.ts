import { describe, expect, it } from 'vitest'
import { ApiClientError, shouldRetryStatusQuery } from './error'

describe('shouldRetryStatusQuery', () => {
  it('retries on network errors before retry limit', () => {
    const networkError = new ApiClientError('NETWORK_ERROR', 'network down', {
      endpoint: '/analyses/test',
      method: 'GET',
    })

    expect(shouldRetryStatusQuery(0, networkError)).toBe(true)
    expect(shouldRetryStatusQuery(1, networkError)).toBe(true)
    expect(shouldRetryStatusQuery(2, networkError)).toBe(false)
  })

  it('retries on 5xx http errors and skips 4xx', () => {
    const serverError = new ApiClientError('HTTP_ERROR', 'server error', {
      endpoint: '/analyses/test',
      method: 'GET',
      statusCode: 503,
    })

    const clientError = new ApiClientError('HTTP_ERROR', 'bad request', {
      endpoint: '/analyses/test',
      method: 'GET',
      statusCode: 400,
    })

    expect(shouldRetryStatusQuery(0, serverError)).toBe(true)
    expect(shouldRetryStatusQuery(0, clientError)).toBe(false)
  })
})
