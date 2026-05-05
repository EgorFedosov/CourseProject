import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api/error'
import { useUploadMutation } from '../../../shared/api/hooks/use-upload-mutation'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'

const formatError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.traceId) {
      return `${error.message} (trace_id: ${error.traceId})`
    }

    return error.message
  }

  return 'Не удалось загрузить документ.'
}

export const UploadDocumentOverview = () => {
  const uploadMutation = useUploadMutation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ documentId: string; filename: string } | null>(null)

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (uploadMutation.isPending) {
      return
    }

    if (!selectedFile) {
      setErrorMessage('Выберите PDF или DOCX перед отправкой.')
      return
    }

    setErrorMessage(null)
    setUploadResult(null)

    try {
      const response = await uploadMutation.mutateAsync({ file: selectedFile })
      setUploadResult({
        documentId: response.document_id,
        filename: response.filename,
      })
    } catch (error) {
      setErrorMessage(formatError(error))
    }
  }

  const retryUpload = async () => {
    if (!selectedFile || uploadMutation.isPending) {
      return
    }

    setErrorMessage(null)

    try {
      const response = await uploadMutation.mutateAsync({ file: selectedFile })
      setUploadResult({
        documentId: response.document_id,
        filename: response.filename,
      })
    } catch (error) {
      setErrorMessage(formatError(error))
    }
  }

  const analysisRoute = uploadResult ? `/analysis?document_id=${encodeURIComponent(uploadResult.documentId)}` : '/analysis'

  return (
    <PageCard title="UploadPage" description="Точка входа для POST /api/v1/documents/upload через typed hook useUploadMutation.">
      <form className="upload-form" onSubmit={submitUpload}>
        <label htmlFor="upload-file-input">Документ (PDF или DOCX)</label>
        <input
          id="upload-file-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null)
          }}
        />
        <button type="submit" disabled={uploadMutation.isPending}>
          {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить документ'}
        </button>
      </form>

      {uploadMutation.isPending ? (
        <StatePanel tone="loading" title="Загрузка документа" message="Файл отправляется в backend, подождите завершения операции." />
      ) : null}

      {errorMessage ? (
        <StatePanel
          tone="error"
          title="Ошибка загрузки"
          message={errorMessage}
          actionLabel={selectedFile ? 'Повторить загрузку' : undefined}
          onAction={selectedFile ? retryUpload : undefined}
        />
      ) : null}

      {uploadResult ? (
        <StatePanel tone="success" title="Документ загружен" message={`Файл: ${uploadResult.filename}. document_id: ${uploadResult.documentId}.`}>
          <Link className="state-panel__link" to={analysisRoute}>
            Перейти к AnalysisPage
          </Link>
        </StatePanel>
      ) : null}

      {!uploadMutation.isPending && !errorMessage && !uploadResult ? (
        <StatePanel tone="empty" title="Ожидание файла" message="Выберите документ для запуска дальнейшего pipeline: upload -> analysis -> report." />
      ) : null}
    </PageCard>
  )
}
