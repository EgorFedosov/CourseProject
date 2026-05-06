import { describe, expect, it } from 'vitest'
import { analysisStatusResponseSchema } from './analysis'

describe('analysisStatusResponseSchema', () => {
  it('accepts null error from backend status payload', () => {
    const parsed = analysisStatusResponseSchema.safeParse({
      check_id: 'check-123',
      status: 'ANALYZING',
      progress: 10,
      error: null,
    })

    expect(parsed.success).toBe(true)
  })
})
