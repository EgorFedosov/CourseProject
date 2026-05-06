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

  it('keeps submit button disabled when file is missing', () => {
    const { container } = renderFeature()
    const submitButton = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(submitButton).not.toBeNull()
    expect(submitButton).toBeDisabled()
  })

  it('renders analysis link after successful upload', async () => {
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

    const submitButton = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(submitButton).not.toBeNull()
    fireEvent.click(submitButton as HTMLButtonElement)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    const analysisLink = container.querySelector<HTMLAnchorElement>('a[href="/analysis?document_id=doc-1"]')
    expect(analysisLink).not.toBeNull()
  })
})
