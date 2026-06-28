import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}
interface CardHeaderProps {
  title: string
  action?: React.ReactNode
  subtitle?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>
}

export function CardHeader({ title, action, subtitle }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ children }: CardProps) {
  return <div className="card-body">{children}</div>
}
