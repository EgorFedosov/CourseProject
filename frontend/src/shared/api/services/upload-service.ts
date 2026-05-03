import { uploadRequestSchema, uploadResponseSchema, type UploadRequest, type UploadResponse } from '../contracts/upload'
import { fromRequestContractError } from '../error'
import { requestWithContract } from '../request'

export const uploadDocument = async (request: UploadRequest): Promise<UploadResponse> => {
  const parsedRequest = uploadRequestSchema.safeParse(request)
  if (!parsedRequest.success) {
    throw fromRequestContractError('/documents/upload', 'POST', parsedRequest.error)
  }

  const formData = new FormData()
  formData.append('file', parsedRequest.data.file)

  return requestWithContract({
    endpoint: '/documents/upload',
    method: 'POST',
    data: formData,
    responseSchema: uploadResponseSchema,
  })
}
