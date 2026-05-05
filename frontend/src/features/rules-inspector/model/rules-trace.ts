import type { ReportResponse } from '../../../shared/api/contracts/report'

export type RuleTraceStatus = 'satisfied' | 'violated'

export interface RuleTraceItem {
  code: string
  title: string
  category: string
  severity: string
  status: RuleTraceStatus
  evidence: string[]
}

const fallbackValue = 'n/a'

export const buildRulesTrace = (report: ReportResponse | undefined): RuleTraceItem[] => {
  if (!report) {
    return []
  }

  return report.applied_rules.map((rule) => {
    const evidence = report.violations
      .filter((violation) => violation.code === rule.code)
      .map((violation) => violation.message)

    return {
      code: rule.code,
      title: rule.title ?? fallbackValue,
      category: rule.category ?? fallbackValue,
      severity: rule.severity ?? fallbackValue,
      status: evidence.length > 0 ? 'violated' : 'satisfied',
      evidence,
    }
  })
}

export const getUnmappedViolationCodes = (report: ReportResponse | undefined): string[] => {
  if (!report) {
    return []
  }

  const appliedCodes = new Set(report.applied_rules.map((rule) => rule.code))
  const unmapped = report.violations
    .filter((violation) => !appliedCodes.has(violation.code))
    .map((violation) => violation.code)

  return Array.from(new Set(unmapped))
}
