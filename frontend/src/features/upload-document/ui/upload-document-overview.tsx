import { type FormEvent, type DragEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api/error'
import { useUploadMutation } from '../../../shared/api/hooks/use-upload-mutation'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'

const formatError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    // UX-only change: hide trace_id from users, show only user-friendly message
    return error.message
  }

  return 'Не удалось загрузить документ.'
}

export const UploadDocumentOverview = () => {
  const uploadMutation = useUploadMutation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ documentId: string; filename: string } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      setErrorMessage(null)
    }
  }

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
    <PageCard title="Загрузка документа" description="">
      <form className="upload-form" onSubmit={submitUpload}>
        {/* UX-only change: improved drag-drop zone with visual feedback */}
        <div
          className={`upload-drop-zone ${dragActive ? 'upload-drop-zone--active' : ''} ${selectedFile ? 'upload-drop-zone--file-selected' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="upload-file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null)
              setErrorMessage(null)
            }}
            className="upload-drop-zone__input"
          />

          <div className="upload-drop-zone__content">
            {selectedFile ? (
              <>
                <div className="upload-drop-zone__icon">✓</div>
                <label htmlFor="upload-file-input" className="upload-drop-zone__label">
                  <strong>{selectedFile.name}</strong>
                  <span>Готов к анализу. Нажмите, чтобы выбрать другой файл.</span>
                </label>
              </>
            ) : (
              <>
                <div className="upload-drop-zone__icon">📄</div>
                <label htmlFor="upload-file-input" className="upload-drop-zone__label">
                  <strong>Загрузите документ</strong>
                  <span>Перетащите PDF или DOCX сюда, или нажмите для выбора</span>
                </label>
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={uploadMutation.isPending || !selectedFile}
          className="upload-form__submit"
        >
          {uploadMutation.isPending ? 'Загрузка...' : 'Начать анализ'}
        </button>
      </form>

      {uploadMutation.isPending ? (
        <StatePanel tone="loading" title="Загрузка документа" message="Документ загружается, подождите." />
      ) : null}

      {errorMessage ? (
        <StatePanel
          tone="error"
          title="Ошибка загрузки"
          message={errorMessage}
          actionLabel={selectedFile ? 'Попробовать ещё раз' : undefined}
          onAction={selectedFile ? retryUpload : undefined}
        />
      ) : null}

      {uploadResult ? (
        <StatePanel tone="success" title="Документ загружен" message={`Файл «${uploadResult.filename}» загружен. Переходим к анализу...`}>
          <Link className="state-panel__link" to={analysisRoute}>
            Перейти к анализу
          </Link>
        </StatePanel>
      ) : null}
    </PageCard>
  )
}
