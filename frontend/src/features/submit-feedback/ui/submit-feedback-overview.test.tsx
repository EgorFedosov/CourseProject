import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabsStateProvider } from '../../../app/providers/tabs-state-provider'
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
      <TabsStateProvider>
        <SubmitFeedbackOverview />
      </TabsStateProvider>
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
      refetch: vi.fn(),
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

    mockMutateAsync.mockResolvedValue({
      status: 'accepted',
      message: 'Corrections saved',
      case_id: 'case-7',
    })

    const { container } = renderFeature()

    const checkIdInput = container.querySelector<HTMLInputElement>('#feedback-check-id')
    expect(checkIdInput).not.toBeNull()
    fireEvent.change(checkIdInput as HTMLInputElement, { target: { value: 'check-42' } })

    const loadButton = container.querySelector<HTMLButtonElement>('.feedback-check-id-form button[type="submit"]')
    expect(loadButton).not.toBeNull()
    fireEvent.click(loadButton as HTMLButtonElement)

    const typeSelect = container.querySelector<HTMLSelectElement>('#feedback-final-type')
    const semesterInput = container.querySelector<HTMLInputElement>('#feedback-final-semester')
    const commentInput = container.querySelector<HTMLTextAreaElement>('#feedback-teacher-comment')
    const submitButton = container.querySelector<HTMLButtonElement>('.feedback-actions__submit')
    expect(typeSelect).not.toBeNull()
    expect(semesterInput).not.toBeNull()
    expect(commentInput).not.toBeNull()
    expect(submitButton).not.toBeNull()

    fireEvent.change(typeSelect as HTMLSelectElement, { target: { value: 'LAB_REPORT' } })
    fireEvent.change(semesterInput as HTMLInputElement, { target: { value: '4' } })
    fireEvent.change(commentInput as HTMLTextAreaElement, { target: { value: 'Комментарий' } })
    fireEvent.click(submitButton as HTMLButtonElement)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      check_id: 'check-42',
      final_type: 'LAB_REPORT',
      final_semester: 4,
      confirmed_violations: ['RULE-1'],
      rejected_violations: [],
      teacher_comment: 'Комментарий',
    })
  })

  it('keeps entered values when submit fails', async () => {
    mockUseReportQuery.mockImplementation((checkId: string | null) => {
      if (checkId === 'check-77') {
        return {
          data: {
            check_id: 'check-77',
            overall_status: 'REPORT_READY',
            determined_type: 'LAB_REPORT',
            determined_semester: 4,
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

    mockMutateAsync.mockRejectedValue(
      new ApiClientError('HTTP_ERROR', 'Backend validation failed', {
        endpoint: '/feedback/corrections',
        method: 'POST',
        statusCode: 422,
      }),
    )

    const { container } = renderFeature()

    const checkIdInput = container.querySelector<HTMLInputElement>('#feedback-check-id')
    const loadButton = container.querySelector<HTMLButtonElement>('.feedback-check-id-form button[type="submit"]')
    expect(checkIdInput).not.toBeNull()
    expect(loadButton).not.toBeNull()

    fireEvent.change(checkIdInput as HTMLInputElement, { target: { value: 'check-77' } })
    fireEvent.click(loadButton as HTMLButtonElement)

    const typeSelect = container.querySelector<HTMLSelectElement>('#feedback-final-type')
    const semesterInput = container.querySelector<HTMLInputElement>('#feedback-final-semester')
    const commentInput = container.querySelector<HTMLTextAreaElement>('#feedback-teacher-comment')
    const rejectInput = container.querySelector<HTMLInputElement>('input[type="radio"][value="rejected"]')
    const submitButton = container.querySelector<HTMLButtonElement>('.feedback-actions__submit')
    expect(typeSelect).not.toBeNull()
    expect(semesterInput).not.toBeNull()
    expect(commentInput).not.toBeNull()
    expect(rejectInput).not.toBeNull()
    expect(submitButton).not.toBeNull()

    fireEvent.change(typeSelect as HTMLSelectElement, { target: { value: 'COURSE_WORK_REPORT' } })
    fireEvent.change(semesterInput as HTMLInputElement, { target: { value: '6' } })
    fireEvent.change(commentInput as HTMLTextAreaElement, { target: { value: 'Ручная проверка' } })
    fireEvent.click(rejectInput as HTMLInputElement)
    fireEvent.click(submitButton as HTMLButtonElement)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect((typeSelect as HTMLSelectElement).value).toBe('COURSE_WORK_REPORT')
    expect((semesterInput as HTMLInputElement).value).toBe('6')
    expect((commentInput as HTMLTextAreaElement).value).toBe('Ручная проверка')
  })
})
