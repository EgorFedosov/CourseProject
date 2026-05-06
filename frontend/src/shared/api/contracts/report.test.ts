import { describe, expect, it } from 'vitest'
import { reportResponseSchema } from './report'

describe('reportResponseSchema', () => {
  it('accepts null legacy optional fields from backend', () => {
    const parsed = reportResponseSchema.safeParse({
      check_id: 'check-123',
      overall_status: 'compliant',
      determined_type: 'COURSE_PROJECT_NOTE',
      determined_semester: 4,
      applied_rules: [
        {
          code: 'REQ-001',
          title: null,
          category: null,
          severity: null,
        },
      ],
      violations: [],
      recommendations: [],
      summary: null,
    })

    expect(parsed.success).toBe(true)
  })
})
