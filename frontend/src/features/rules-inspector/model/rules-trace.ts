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
  'REQ-ABSTRACT-001': { category: 'structure', severity: 'medium' },
  'REQ-METHODOLOGY-001': { category: 'structure', severity: 'medium' },
  'REQ-RESULTS-001': { category: 'structure', severity: 'medium' },
  'REQ-REFERENCES-001': { category: 'structure', severity: 'medium' },
  'REQ-LAB-INTRO-001': { category: 'structure', severity: 'high' },
  'REQ-LAB-EQUIPMENT-001': { category: 'structure', severity: 'high' },
  'REQ-LAB-RESULTS-001': { category: 'structure', severity: 'high' },
  'REQ-LAB-CONCLUSION-001': { category: 'structure', severity: 'high' },
  'REQ-LAB-FONT-001': { category: 'formatting', severity: 'medium' },
  'REQ-CW-INTRO-001': { category: 'structure', severity: 'high' },
  'REQ-CW-ANALYSIS-001': { category: 'structure', severity: 'high' },
  'REQ-CW-CONCLUSION-001': { category: 'structure', severity: 'high' },
  'REQ-CW-REFERENCES-001': { category: 'structure', severity: 'medium' },
  'REQ-CW-FONT-001': { category: 'formatting', severity: 'medium' },
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
