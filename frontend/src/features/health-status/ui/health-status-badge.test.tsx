import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../shared/api/error'
import { HealthStatusBadge } from './health-status-badge'

const mockRefetch = vi.fn()
const mockUseHealthQuery = vi.fn()

vi.mock('../../../shared/api', () => ({
  useHealthQuery: () => mockUseHealthQuery(),
}))

describe('HealthStatusBadge', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows backend unavailable state and allows retry', () => {
    mockUseHealthQuery.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new ApiClientError('NETWORK_ERROR', 'Network down', {
        endpoint: '/health',
        method: 'GET',
      }),
      refetch: mockRefetch,
    })

    render(<HealthStatusBadge />)

    expect(screen.getByText('Backend status: Network down')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })
})
