import { useQuery } from '@tanstack/react-query'
import type { AnalysisStatusResponse } from '../contracts/analysis'
import { shouldRetryStatusQuery } from '../error'
import { apiQueryKeys } from '../query-keys'
import { getAnalysisStatus } from '../services/analysis-service'

const STATUS_POLL_INTERVAL_MS = 1500
const TERMINAL_STATUSES = new Set<AnalysisStatusResponse['status']>(['REPORT_READY', 'ERROR'])

export const useAnalysisStatusQuery = (checkId: string | null) => {
  return useQuery({
    queryKey: apiQueryKeys.analysisStatus(checkId ?? 'missing'),
    queryFn: () => getAnalysisStatus(checkId as string),
    enabled: Boolean(checkId),
    retry: (failureCount, error) => shouldRetryStatusQuery(failureCount, error),
    refetchInterval: (query) => {
      const status = (query.state.data as AnalysisStatusResponse | undefined)?.status
      if (status && TERMINAL_STATUSES.has(status)) {
        return false
      }

      return STATUS_POLL_INTERVAL_MS
    },
    refetchIntervalInBackground: true,
  })
}
