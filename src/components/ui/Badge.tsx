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
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50',
    success: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-800/50',
    warning: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 border border-yellow-200/50 dark:border-yellow-800/50',
    danger: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/50',
    info: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50',
    purple: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50',
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
