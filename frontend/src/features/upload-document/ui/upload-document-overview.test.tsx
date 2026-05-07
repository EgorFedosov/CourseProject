import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabsStateProvider } from '../../../app/providers/tabs-state-provider'
import { UploadDocumentOverview } from './upload-document-overview'

const mockMutateAsync = vi.fn()
const mockUseUploadMutation = vi.fn()

vi.mock('../../../shared/api/hooks/use-upload-mutation', () => ({
  useUploadMutation: () => mockUseUploadMutation(),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <TabsStateProvider>
        <UploadDocumentOverview />
      </TabsStateProvider>
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

  it('does not render manual start analysis button', () => {
    const { queryByRole } = renderFeature()
    expect(queryByRole('button', { name: 'Начать анализ' })).toBeNull()
  })

  it('uploads automatically after file selection and renders analysis link', async () => {
    mockMutateAsync.mockResolvedValue({
      document_id: 'doc-1',
      filename: 'report.pdf',
      format: 'pdf',
      status: 'UPLOADED',
    })

    const { container } = renderFeature()

    const file = new File(['test-content'], 'report.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    const analysisLink = container.querySelector<HTMLAnchorElement>('a[href="/analysis?document_id=doc-1"]')
    expect(analysisLink).not.toBeNull()
  })
})
