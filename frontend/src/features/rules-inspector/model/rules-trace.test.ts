import { describe, expect, it } from 'vitest'
import { buildRulesTrace, getUnmappedViolationCodes } from './rules-trace'

describe('rules-trace model', () => {
  it('maps applied rules to violated or satisfied states', () => {
    const trace = buildRulesTrace({
      check_id: 'check-1',
      overall_status: 'REPORT_READY',
      applied_rules: [
        { code: 'RULE-1', title: 'Title 1' },
        { code: 'RULE-2', title: 'Title 2' },
      ],
      violations: [
        { code: 'RULE-2', message: 'Mismatch found' },
      ],
      recommendations: [],
    })

    expect(trace).toHaveLength(2)
    expect(trace[0].status).toBe('satisfied')
    expect(trace[1].status).toBe('violated')
    expect(trace[1].evidence).toEqual(['Mismatch found'])
  })

  it('collects violation codes that are missing in applied_rules', () => {
    const codes = getUnmappedViolationCodes({
      check_id: 'check-2',
      overall_status: 'REPORT_READY',
      applied_rules: [{ code: 'RULE-3' }],
      violations: [
        { code: 'RULE-3', message: 'Mapped' },
        { code: 'RULE-X', message: 'Not mapped' },
      ],
      recommendations: [],
    })

    expect(codes).toEqual(['RULE-X'])
  })
})
