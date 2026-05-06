import { submitFeedbackRequestSchema, type SubmitFeedbackRequest } from '../../../shared/api/contracts/feedback'
import type { ReportResponse } from '../../../shared/api/contracts/report'

export type ViolationDecision = 'confirmed' | 'rejected'

export type ViolationDecisionMap = Record<string, ViolationDecision>

export interface FeedbackDraft {
  checkId: string
  finalType: string
  finalSemester: string
  teacherComment: string
}

export interface FeedbackPayloadResult {
  success: boolean
  payload?: SubmitFeedbackRequest
  message?: string
}

export const getUniqueViolationCodes = (report: ReportResponse | undefined): string[] => {
  if (!report) {
    return []
  }

  return Array.from(new Set(report.violations.map((item) => item.code)))
}

export const buildFeedbackPayload = (
  draft: FeedbackDraft,
  report: ReportResponse | undefined,
  decisions: ViolationDecisionMap,
): FeedbackPayloadResult => {
  const checkId = draft.checkId.trim()
  if (checkId.length === 0) {
    return { success: false, message: 'Укажите идентификатор проверки перед отправкой правок.' }
  }

  const semester = Number(draft.finalSemester)
  if (!Number.isInteger(semester) || semester <= 0) {
    return { success: false, message: 'Семестр должен быть положительным целым числом.' }
  }

  const violationCodes = getUniqueViolationCodes(report)
  const confirmedViolations: string[] = []
  const rejectedViolations: string[] = []

  for (const violationCode of violationCodes) {
    const decision = decisions[violationCode] ?? 'confirmed'
    if (decision === 'confirmed') {
      confirmedViolations.push(violationCode)
      continue
    }

    if (decision === 'rejected') {
      rejectedViolations.push(violationCode)
    }
  }

  const parsedPayload = submitFeedbackRequestSchema.safeParse({
    check_id: checkId,
    final_type: draft.finalType.trim(),
    final_semester: semester,
    confirmed_violations: confirmedViolations,
    rejected_violations: rejectedViolations,
    teacher_comment: draft.teacherComment,
  })

  if (!parsedPayload.success) {
    return { success: false, message: 'Данные формы не прошли проверку.' }
  }

  return {
    success: true,
    payload: parsedPayload.data,
  }
}
