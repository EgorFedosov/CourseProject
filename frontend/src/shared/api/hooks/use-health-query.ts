import { useQuery } from '@tanstack/react-query'
import { apiQueryKeys } from '../query-keys'
import { getHealth } from '../services/health-service'

export const useHealthQuery = () => {
  return useQuery({
    queryKey: apiQueryKeys.health,
    queryFn: getHealth,
    staleTime: 30_000,
    retry: false,
  })
}
