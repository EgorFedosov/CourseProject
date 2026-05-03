import { reportResponseSchema, type ReportResponse } from '../contracts/report'
import { requestWithContract } from '../request'

export const getReport = async (checkId: string): Promise<ReportResponse> => {
  return requestWithContract({
    endpoint: `/reports/${checkId}`,
    method: 'GET',
    responseSchema: reportResponseSchema,
  })
}
