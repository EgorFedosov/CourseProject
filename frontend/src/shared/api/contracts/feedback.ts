import { z } from 'zod'

export const submitFeedbackRequestSchema = z.object({
  check_id: z.string().min(1),
  final_type: z.string().min(1),
  final_semester: z.number().int().positive(),
  confirmed_violations: z.array(z.string().min(1)),
  rejected_violations: z.array(z.string().min(1)),
  teacher_comment: z.string(),
})

export const submitFeedbackResponseSchema = z
  .object({
    status: z.string().min(1),
    message: z.string().min(1).optional(),
    case_id: z.string().min(1).optional(),
  })
  .passthrough()

export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackRequestSchema>
export type SubmitFeedbackResponse = z.infer<typeof submitFeedbackResponseSchema>
