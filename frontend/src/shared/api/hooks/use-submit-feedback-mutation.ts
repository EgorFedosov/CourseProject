import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '../services/feedback-service'

export const useSubmitFeedbackMutation = () => {
  return useMutation({
    mutationFn: submitFeedback,
    retry: false,
  })
}
