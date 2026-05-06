import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadDocumentOverview } from './upload-document-overview'

const mockMutateAsync = vi.fn()
const mockUseUploadMutation = vi.fn()

vi.mock('../../../shared/api/hooks/use-upload-mutation', () => ({
  useUploadMutation: () => mockUseUploadMutation(),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <UploadDocumentOverview />
    </MemoryRouter>,
  )
}

describe('UploadDocumentOverview', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseUploadMutation.mockReturnValue({
      isPending: false,
      mutateAsync: mockMutateAsync,
    })
  })

  it('shows validation message when file is missing', async () => {
    renderFeature()

    fireEvent.click(screen.getByRole('button', { name: 'Загрузить документ' }))

    await waitFor(() => {
      expect(screen.getByText('Выберите PDF или DOCX перед отправкой.')).toBeInTheDocument()
    })
  })

  it('renders success state and analysis link after upload', async () => {
    mockMutateAsync.mockResolvedValue({
      document_id: 'doc-1',
      filename: 'report.pdf',
      format: 'pdf',
      status: 'UPLOADED',
    })

    renderFeature()

    const file = new File(['test-content'], 'report.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Документ (PDF или DOCX)'), {
      target: { files: [file] },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Загрузить документ' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Перейти к анализу' })).toBeInTheDocument()
    })

    expect(screen.getByText('Документ загружен')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Перейти к анализу' })).toHaveAttribute('href', '/analysis?document_id=doc-1')
  })
})
