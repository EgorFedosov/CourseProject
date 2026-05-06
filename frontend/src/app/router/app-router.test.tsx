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
    { path: '/upload', heading: 'Загрузка документа' },
    { path: '/analysis', heading: 'Проверка документа' },
    { path: '/report', heading: 'Отчёт' },
    { path: '/feedback', heading: 'Проверка и корректировка результата' },
    { path: '/rules', heading: 'Правила' },
  ]

  it.each(routeCases)('renders $path route', ({ path, heading }) => {
    window.history.pushState({}, '', path)
    render(<App />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('smoke navigates full chain upload -> analysis -> report -> feedback -> rules', () => {
    window.history.pushState({}, '', '/upload')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Загрузка документа' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Анализ' }))
    expect(screen.getByRole('heading', { name: 'Проверка документа' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Отчёт' }))
    expect(screen.getByRole('heading', { name: 'Отчёт' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Правки' }))
    expect(
      screen.getByRole('heading', { name: 'Проверка и корректировка результата' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Правила' }))
    expect(screen.getByRole('heading', { name: 'Правила' })).toBeInTheDocument()
  })
})
