import { z } from 'zod'
import { pipelineStatusSchema } from './common'

export const startAnalysisRequestSchema = z.object({
  document_id: z.string().min(1),
  requested_by: z.string().min(1),
})

export const startAnalysisResponseSchema = z
  .object({
    check_id: z.string().min(1),
    status: z.literal('ANALYZING'),
  })
  .passthrough()

export const analysisStatusResponseSchema = z
  .object({
    status: pipelineStatusSchema,
    progress: z.number().min(0).max(100).optional(),
    error: z.string().min(1).optional(),
  })
  .passthrough()

export type StartAnalysisRequest = z.infer<typeof startAnalysisRequestSchema>
export type StartAnalysisResponse = z.infer<typeof startAnalysisResponseSchema>
export type AnalysisStatusResponse = z.infer<typeof analysisStatusResponseSchema>
