import { useMutation } from '@tanstack/react-query'
import { uploadDocument } from '../services/upload-service'

export const useUploadMutation = () => {
  return useMutation({
    mutationFn: uploadDocument,
    retry: false,
  })
}
