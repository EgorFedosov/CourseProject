import { z } from 'zod'

export const healthResponseSchema = z
  .object({
    api_status: z.string().min(1),
    neo4j_status: z.string().min(1),
    ai_status: z.string().min(1).optional(),
  })
  .passthrough()

export type HealthResponse = z.infer<typeof healthResponseSchema>
