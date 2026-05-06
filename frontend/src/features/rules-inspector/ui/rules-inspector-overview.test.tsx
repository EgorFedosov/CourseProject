import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabsStateProvider } from '../../../app/providers/tabs-state-provider'
import { ApiClientError } from '../../../shared/api/error'
import { RulesInspectorOverview } from './rules-inspector-overview'

const mockUseReportQuery = vi.fn()

vi.mock('../../../shared/api/hooks/use-report-query', () => ({
  useReportQuery: (checkId: string | null) => mockUseReportQuery(checkId),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/rules']}>
      <TabsStateProvider>
        <RulesInspectorOverview />
      </TabsStateProvider>
    </MemoryRouter>,
  )
}

describe('RulesInspectorOverview', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReportQuery.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it('renders rules trace and endpoint coverage from report data', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-101') {
        return {
          data: {
            check_id: 'check-101',
            overall_status: 'REPORT_READY',
            applied_rules: [
              { code: 'RULE-1', title: 'Title 1', category: 'STRUCTURE', severity: 'LOW' },
              { code: 'RULE-2', title: 'Title 2', category: 'CONTENT', severity: 'HIGH' },
            ],
            violations: [
              { code: 'RULE-2', message: 'Section is missing', severity: 'HIGH', category: 'CONTENT' },
              { code: 'RULE-9', message: 'Legacy mismatch' },
            ],
            recommendations: [],
          },
          error: null,
          isFetching: false,
          refetch: vi.fn(),
        }
      }

      return {
        data: undefined,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      }
    })

    renderFeature()

    expect(screen.getByRole('heading', { name: 'Применённые правила' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Идентификатор проверки'), {
      target: { value: 'check-101' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Показать правила' }))

    await waitFor(() => {
      expect(screen.getByText('RULE-1')).toBeInTheDocument()
      expect(screen.getByText('RULE-2')).toBeInTheDocument()
    })

    expect(screen.getByText('Без нарушений')).toBeInTheDocument()
    expect(screen.getByText('Есть нарушение')).toBeInTheDocument()
    expect(screen.getByText('Section is missing')).toBeInTheDocument()
    expect(screen.getByText('RULE-9')).toBeInTheDocument()
  })

  it('shows backend error when report query fails', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'bad-check') {
        return {
          data: undefined,
          error: new ApiClientError('HTTP_ERROR', 'Report not found', {
            endpoint: '/reports/bad-check',
            method: 'GET',
            statusCode: 404,
          }),
          isFetching: false,
          refetch: vi.fn(),
        }
      }

      return {
        data: undefined,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      }
    })

    renderFeature()

    fireEvent.change(screen.getByLabelText('Идентификатор проверки'), {
      target: { value: 'bad-check' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Показать правила' }))

    await waitFor(() => {
      expect(screen.getByText('Данные не найдены.')).toBeInTheDocument()
    })
  })
})
