import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../shared/api/error'
import { SubmitFeedbackOverview } from './submit-feedback-overview'

const mockUseReportQuery = vi.fn()
const mockMutateAsync = vi.fn()
const mockUseSubmitFeedbackMutation = vi.fn()

vi.mock('../../../shared/api/hooks/use-report-query', () => ({
  useReportQuery: (checkId: string | null) => mockUseReportQuery(checkId),
}))

vi.mock('../../../shared/api/hooks/use-submit-feedback-mutation', () => ({
  useSubmitFeedbackMutation: () => mockUseSubmitFeedbackMutation(),
}))

const renderFeature = () => {
  return render(
    <MemoryRouter initialEntries={['/feedback']}>
      <SubmitFeedbackOverview />
    </MemoryRouter>,
  )
}

describe('SubmitFeedbackOverview', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseReportQuery.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
    })

    mockUseSubmitFeedbackMutation.mockReturnValue({
      isPending: false,
      mutateAsync: mockMutateAsync,
    })
  })

  it('submits teacher corrections using report violations', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-42') {
        return {
          data: {
            check_id: 'check-42',
            overall_status: 'REPORT_READY',
            determined_type: 'LAB_REPORT',
            determined_semester: 4,
            applied_rules: [],
            violations: [
              {
                code: 'RULE-1',
                message: 'Formatting issue',
                severity: 'MEDIUM',
                category: 'FORMAT',
              },
            ],
            recommendations: [],
          },
          error: null,
          isFetching: false,
        }
      }

      return {
        data: undefined,
        error: null,
        isFetching: false,
      }
    })

    mockMutateAsync.mockResolvedValue({
      status: 'accepted',
      message: 'Corrections saved',
      case_id: 'case-7',
    })

    renderFeature()

    fireEvent.change(screen.getByLabelText('check_id'), {
      target: { value: 'check-42' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить отчёт' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('LAB_REPORT')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('teacher_comment'), {
      target: { value: 'Подтверждаю замечание.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить правки' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      check_id: 'check-42',
      final_type: 'LAB_REPORT',
      final_semester: 4,
      confirmed_violations: ['RULE-1'],
      rejected_violations: [],
      teacher_comment: 'Подтверждаю замечание.',
    })

    expect(screen.getByText(/Правки отправлены:/)).toBeInTheDocument()
  })

  it('keeps entered values when submit fails', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-77') {
        return {
          data: {
            check_id: 'check-77',
            overall_status: 'REPORT_READY',
            applied_rules: [],
            violations: [
              {
                code: 'RULE-2',
                message: 'Wrong semester',
              },
            ],
            recommendations: [],
          },
          error: null,
          isFetching: false,
        }
      }

      return {
        data: undefined,
        error: null,
        isFetching: false,
      }
    })

    mockMutateAsync.mockRejectedValue(
      new ApiClientError('HTTP_ERROR', 'Backend validation failed', {
        endpoint: '/feedback/corrections',
        method: 'POST',
        statusCode: 422,
      }),
    )

    renderFeature()

    fireEvent.change(screen.getByLabelText('check_id'), {
      target: { value: 'check-77' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить отчёт' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Отправить правки' })).toBeEnabled()
    })

    fireEvent.change(screen.getByLabelText('final_type'), {
      target: { value: 'MANUAL_OVERRIDE' },
    })
    fireEvent.change(screen.getByLabelText('final_semester'), {
      target: { value: '6' },
    })
    fireEvent.change(screen.getByLabelText('teacher_comment'), {
      target: { value: 'Требуется ручная проверка.' },
    })

    fireEvent.click(screen.getByLabelText('Отклонить'))
    fireEvent.click(screen.getByRole('button', { name: 'Отправить правки' }))

    await waitFor(() => {
      expect(screen.getByText('Backend validation failed')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('MANUAL_OVERRIDE')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Требуется ручная проверка.')).toBeInTheDocument()
  })
})
