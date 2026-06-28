interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
  status?: string
}

import React from 'react'

export function Badge({ children, variant, status }: BadgeProps) {
  if (status) {
    return <span className={`status-badge status-${status}`}>{children}</span>
  }
  return <span className={`badge badge-${variant ?? 'secondary'}`}>{children}</span>
}
