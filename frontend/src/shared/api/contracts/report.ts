import { z } from 'zod'

const ruleSchema = z
  .object({
    code: z.string().min(1),
    title: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    severity: z.string().min(1).optional(),
  })
  .passthrough()

const violationSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    severity: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
  })
  .passthrough()

const recommendationSchema = z.union([
  z.string().min(1),
  z
    .object({
      code: z.string().min(1).optional(),
      message: z.string().min(1),
    })
    .passthrough(),
])

export const reportResponseSchema = z
  .object({
    check_id: z.string().min(1).optional(),
    overall_status: z.string().min(1),
    determined_type: z.string().min(1).optional(),
    determined_semester: z.number().int().positive().optional(),
    applied_rules: z.array(ruleSchema),
    violations: z.array(violationSchema),
    recommendations: z.array(recommendationSchema),
    summary: z.string().min(1).optional(),
  })
  .passthrough()

export type ReportResponse = z.infer<typeof reportResponseSchema>
