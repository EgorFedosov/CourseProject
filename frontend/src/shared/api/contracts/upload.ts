import { z } from 'zod'

export const uploadResponseSchema = z
  .object({
    document_id: z.string().min(1),
    filename: z.string().min(1),
    format: z.string().regex(/^(pdf|docx)$/i),
    status: z.literal('UPLOADED'),
  })
  .passthrough()

export const uploadRequestSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, { message: 'file must not be empty' }),
})

export type UploadRequest = z.infer<typeof uploadRequestSchema>
export type UploadResponse = z.infer<typeof uploadResponseSchema>
