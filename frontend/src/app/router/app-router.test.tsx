import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../App'

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
})
