import { type ReactNode } from 'react'

type StateTone = 'loading' | 'empty' | 'error' | 'success'

interface StatePanelProps {
  tone: StateTone
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

export const StatePanel = ({ tone, title, message, actionLabel, onAction, children }: StatePanelProps) => {
  return (
    <section className={`state-panel state-panel--${tone}`} role="status" aria-live="polite">
      <div className="state-panel__content">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>

      {children}

      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
