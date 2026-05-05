import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StartAnalysisOverview } from './start-analysis-overview'

const mockStartMutateAsync = vi.fn()
const mockUseStartAnalysisMutation = vi.fn()
const mockUseAnalysisStatusQuery = vi.fn()

vi.mock('../../../shared/api/hooks/use-start-analysis-mutation', () => ({
  useStartAnalysisMutation: () => mockUseStartAnalysisMutation(),
}))

vi.mock('../../../shared/api/hooks/use-analysis-status-query', () => ({
  useAnalysisStatusQuery: (checkId: string | null) => mockUseAnalysisStatusQuery(checkId),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/analysis']}>
      <StartAnalysisOverview />
    </MemoryRouter>,
  )
}

describe('StartAnalysisOverview', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseStartAnalysisMutation.mockReturnValue({
      isPending: false,
      mutateAsync: mockStartMutateAsync,
    })

    mockUseAnalysisStatusQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it('shows report link when analysis status is REPORT_READY', async () => {
    mockUseAnalysisStatusQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-ready') {
        return {
          data: {
            status: 'REPORT_READY',
            progress: 100,
          },
          error: null,
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(),
        }
      }

      return {
        data: undefined,
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }
    })

    mockStartMutateAsync.mockResolvedValue({
      check_id: 'check-ready',
      status: 'ANALYZING',
    })

    renderFeature()

    fireEvent.change(screen.getByLabelText('document_id'), {
      target: { value: 'doc-77' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Запустить анализ' }))

    await waitFor(() => {
      expect(screen.getByText('Отчёт готов')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Перейти к ReportPage' })).toHaveAttribute('href', '/report?check_id=check-ready')
  })

  it('handles ERROR status with recoverable state', async () => {
    const refetch = vi.fn()

    mockUseAnalysisStatusQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-error') {
        return {
          data: {
            status: 'ERROR',
            error: 'AI provider unavailable',
          },
          error: null,
          isLoading: false,
          isFetching: false,
          refetch,
        }
      }

      return {
        data: undefined,
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }
    })

    mockStartMutateAsync.mockResolvedValue({
      check_id: 'check-error',
      status: 'ANALYZING',
    })

    renderFeature()

    fireEvent.change(screen.getByLabelText('document_id'), {
      target: { value: 'doc-99' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Запустить анализ' }))

    await waitFor(() => {
      expect(screen.getByText('Анализ завершился с ошибкой')).toBeInTheDocument()
      expect(screen.getByText('AI provider unavailable')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Повторить запрос статуса' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
