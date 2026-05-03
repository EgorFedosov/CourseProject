import { z } from 'zod'

export const pipelineStatusSchema = z.enum([
  'NOT_UPLOADED',
  'UPLOADED',
  'ANALYZING',
  'TYPE_DETERMINED',
  'SEMESTER_DETERMINED',
  'REQUIREMENTS_CHECKED',
  'REPORT_READY',
  'ERROR',
])

export const backendErrorSchema = z
  .object({
    code: z.string().min(1).optional(),
    message: z.string().min(1).optional(),
    details: z.unknown().optional(),
    trace_id: z.string().min(1).optional(),
  })
  .passthrough()
