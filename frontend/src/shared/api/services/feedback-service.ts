import {
  submitFeedbackRequestSchema,
  submitFeedbackResponseSchema,
  type SubmitFeedbackRequest,
  type SubmitFeedbackResponse,
} from '../contracts/feedback'
import { fromRequestContractError } from '../error'
import { requestWithContract } from '../request'

export const submitFeedback = async (
  request: SubmitFeedbackRequest,
): Promise<SubmitFeedbackResponse> => {
  const parsedRequest = submitFeedbackRequestSchema.safeParse(request)
  if (!parsedRequest.success) {
    throw fromRequestContractError('/feedback/corrections', 'POST', parsedRequest.error)
  }

  return requestWithContract({
    endpoint: '/feedback/corrections',
    method: 'POST',
    data: parsedRequest.data,
    responseSchema: submitFeedbackResponseSchema,
  })
}
