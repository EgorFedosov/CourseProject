import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../shared/api/error'
import { ReportViewOverview } from './report-view-overview'

const mockUseReportQuery = vi.fn()

vi.mock('../../../shared/api/hooks/use-report-query', () => ({
  useReportQuery: (checkId: string | null) => mockUseReportQuery(checkId),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/report']}>
      <ReportViewOverview />
    </MemoryRouter>,
  )
}

describe('ReportViewOverview', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseReportQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it('renders report summary and linked flows for selected check_id', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-500') {
        return {
          data: {
            check_id: 'check-500',
            overall_status: 'REPORT_READY',
            determined_type: 'LAB_REPORT',
            applied_rules: [{ code: 'RULE-1' }],
            violations: [{ code: 'RULE-2', message: 'Mismatch' }],
            recommendations: ['Fix issue'],
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

    renderFeature()

    fireEvent.change(screen.getByLabelText('check_id'), {
      target: { value: 'check-500' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить отчёт' }))

    await waitFor(() => {
      expect(screen.getByText('overall_status: REPORT_READY')).toBeInTheDocument()
    })

    expect(screen.getByText('determined_type: LAB_REPORT')).toBeInTheDocument()
    expect(screen.getByText('violations: 1')).toBeInTheDocument()
    expect(screen.getByText('Отчёт неполный: отсутствуют поля determined_semester.')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Открыть FeedbackPage' })).toHaveAttribute('href', '/feedback?check_id=check-500')
    expect(screen.getByRole('link', { name: 'Открыть RulesViewPage' })).toHaveAttribute('href', '/rules?check_id=check-500')
  })

  it('shows backend error and retry action', async () => {
    const refetch = vi.fn()

    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'bad-check') {
        return {
          data: undefined,
          error: new ApiClientError('HTTP_ERROR', 'Report endpoint failed', {
            endpoint: '/reports/bad-check',
            method: 'GET',
            statusCode: 500,
          }),
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

    renderFeature()

    fireEvent.change(screen.getByLabelText('check_id'), {
      target: { value: 'bad-check' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить отчёт' }))

    await waitFor(() => {
      expect(screen.getByText('Report endpoint failed')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Повторить запрос' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
