import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'

vi.mock('../../shared/api', () => ({
  useHealthQuery: () => ({
    isLoading: false,
    error: null,
    data: {
      api_status: 'alive',
      neo4j_status: 'alive',
      ai_status: 'unavailable',
    },
  }),
}))

describe('App routing', () => {
  afterEach(() => {
    cleanup()
  })

  const routeCases: Array<{ path: string; heading: string }> = [
    { path: '/upload', heading: 'UploadPage' },
    { path: '/analysis', heading: 'AnalysisPage' },
    { path: '/report', heading: 'ReportPage' },
    { path: '/feedback', heading: 'FeedbackPage' },
    { path: '/rules', heading: 'RulesViewPage' },
  ]

  it.each(routeCases)('renders $path route', ({ path, heading }) => {
    window.history.pushState({}, '', path)
    render(<App />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('smoke navigates full chain upload -> analysis -> report -> feedback -> rules', () => {
    window.history.pushState({}, '', '/upload')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'UploadPage' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Analysis' }))
    expect(screen.getByRole('heading', { name: 'AnalysisPage' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Report' }))
    expect(screen.getByRole('heading', { name: 'ReportPage' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Feedback' }))
    expect(screen.getByRole('heading', { name: 'FeedbackPage' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Rules' }))
    expect(screen.getByRole('heading', { name: 'RulesViewPage' })).toBeInTheDocument()
  })
})
