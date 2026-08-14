import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    easy: { label: 'Mudah', variant: 'success' },
    medium: { label: 'Sedang', variant: 'warning' },
    hard: { label: 'Sulit', variant: 'danger' },
  }
  const config = map[difficulty] ?? { label: difficulty, variant: 'default' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    active: { label: 'Aktif', variant: 'success' },
    draft: { label: 'Draf', variant: 'default' },
    inactive: { label: 'Nonaktif', variant: 'warning' },
    expired: { label: 'Kadaluarsa', variant: 'danger' },
    submitted: { label: 'Selesai', variant: 'info' },
    in_progress: { label: 'Berlangsung', variant: 'purple' },
  }
  const config = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
