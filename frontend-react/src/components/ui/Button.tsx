import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({ variant = 'primary', size, loading, children, disabled, className = '', ...props }: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <button {...props} disabled={disabled || loading} className={cls}>
      {loading ? 'Carregando...' : children}
    </button>
  )
}
