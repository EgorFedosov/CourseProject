import { type ReactNode } from 'react'

interface PageCardProps {
  title: string
  description?: string
  children?: ReactNode
}

export const PageCard = ({ title, description, children }: PageCardProps) => {
  return (
    <section className="page-card animate__animated animate__fadeInUp animate__faster">
      <header className="page-card__header">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      {children ? <div className="page-card__body">{children}</div> : null}
    </section>
  )
}
