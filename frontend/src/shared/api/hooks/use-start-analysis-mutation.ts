import { useMutation } from '@tanstack/react-query'
import { startAnalysis } from '../services/analysis-service'

export const useStartAnalysisMutation = () => {
  return useMutation({
    mutationFn: startAnalysis,
    retry: false,
  })
}
