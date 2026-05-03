import {
  analysisStatusResponseSchema,
  startAnalysisRequestSchema,
  startAnalysisResponseSchema,
  type AnalysisStatusResponse,
  type StartAnalysisRequest,
  type StartAnalysisResponse,
} from '../contracts/analysis'
import { fromRequestContractError } from '../error'
import { requestWithContract } from '../request'

export const startAnalysis = async (
  request: StartAnalysisRequest,
): Promise<StartAnalysisResponse> => {
  const parsedRequest = startAnalysisRequestSchema.safeParse(request)
  if (!parsedRequest.success) {
    throw fromRequestContractError('/analyses/start', 'POST', parsedRequest.error)
  }

  return requestWithContract({
    endpoint: '/analyses/start',
    method: 'POST',
    data: parsedRequest.data,
    responseSchema: startAnalysisResponseSchema,
  })
}

export const getAnalysisStatus = async (checkId: string): Promise<AnalysisStatusResponse> => {
  return requestWithContract({
    endpoint: `/analyses/${checkId}`,
    method: 'GET',
    responseSchema: analysisStatusResponseSchema,
  })
}
