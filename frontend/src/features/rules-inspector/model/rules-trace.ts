import type { ReportResponse } from '../../../shared/api/contracts/report'
import { formatCategory, formatRuleTitle, formatSeverity } from '../../../shared/model/localization'

export type RuleTraceStatus = 'satisfied' | 'violated'

export interface RuleTraceItem {
  code: string
  title: string
  category: string
  severity: string
  status: RuleTraceStatus
  evidence: string[]
}

const fallbackValue = 'Не указано'
const knownRuleFallbackMeta: Record<string, { category: string; severity: string }> = {
  'REQ-INTRO-001': { category: 'structure', severity: 'high' },
  'REQ-CONCLUSION-001': { category: 'structure', severity: 'high' },
  'REQ-FONT-001': { category: 'formatting', severity: 'medium' },
}

export const buildRulesTrace = (report: ReportResponse | undefined): RuleTraceItem[] => {
  if (!report) {
    return []
  }

  return report.applied_rules.map((rule) => {
    const evidence = report.violations
      .filter((violation) => violation.code === rule.code)
      .map((violation) => violation.message)
    const fallbackMeta = knownRuleFallbackMeta[rule.code]

    return {
      code: rule.code,
      title: formatRuleTitle(rule.code, rule.title ?? fallbackValue),
      category: formatCategory(rule.category ?? fallbackMeta?.category ?? fallbackValue),
      severity: formatSeverity(rule.severity ?? fallbackMeta?.severity ?? fallbackValue),
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
