import { useQuery } from '@tanstack/react-query'
import { apiQueryKeys } from '../query-keys'
import { shouldRetryStatusQuery } from '../error'
import { getAnalysisStatus } from '../services/analysis-service'

export const useAnalysisStatusQuery = (checkId: string | null) => {
  return useQuery({
    queryKey: apiQueryKeys.analysisStatus(checkId ?? 'missing'),
    queryFn: () => getAnalysisStatus(checkId as string),
    enabled: Boolean(checkId),
    retry: (failureCount, error) => shouldRetryStatusQuery(failureCount, error),
  })
}
