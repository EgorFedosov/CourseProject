import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ReportViewOverview } from './report-view-overview'

describe('ReportViewOverview', () => {
  afterEach(() => {
    cleanup()
  })

  it('builds navigation link to rules page with optional check_id', () => {
    render(
      <MemoryRouter>
        <ReportViewOverview />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Открыть RulesViewPage' })
    expect(link).toHaveAttribute('href', '/rules')

    fireEvent.change(screen.getByLabelText('check_id для трассировки правил'), {
      target: { value: 'check-777' },
    })

    expect(link).toHaveAttribute('href', '/rules?check_id=check-777')
  })
})
