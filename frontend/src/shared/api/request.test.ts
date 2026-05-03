import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiClient } from './client'
import { ApiClientError } from './error'
import { requestWithContract } from './request'

describe('requestWithContract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns typed data when response matches zod schema', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      data: {
        id: 'abc',
      },
    })

    const response = await requestWithContract({
      endpoint: '/test',
      method: 'GET',
      responseSchema: z.object({ id: z.string().min(1) }),
    })

    expect(response.id).toBe('abc')
  })

  it('throws CONTRACT_ERROR when response shape is invalid', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      data: {
        missingId: true,
      },
    })

    await expect(
      requestWithContract({
        endpoint: '/test',
        method: 'GET',
        responseSchema: z.object({ id: z.string().min(1) }),
      }),
    ).rejects.toMatchObject({
      code: 'CONTRACT_ERROR',
    } satisfies Partial<ApiClientError>)
  })

  it('maps axios-style http errors to ApiClientError', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: {
        status: 500,
        data: {
          message: 'Internal error',
          code: 'INTERNAL_ERROR',
        },
      },
    })

    await expect(
      requestWithContract({
        endpoint: '/test',
        method: 'GET',
        responseSchema: z.object({ id: z.string().min(1) }),
      }),
    ).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      statusCode: 500,
      message: 'Internal error',
    } satisfies Partial<ApiClientError>)
  })
})
