import { useQuery } from '@tanstack/react-query'
import { apiQueryKeys } from '../query-keys'
import { getReport } from '../services/report-service'

export const useReportQuery = (checkId: string | null) => {
  return useQuery({
    queryKey: apiQueryKeys.report(checkId ?? 'missing'),
    queryFn: () => getReport(checkId as string),
    enabled: Boolean(checkId),
    retry: false,
  })
}
