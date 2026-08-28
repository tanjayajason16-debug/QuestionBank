import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-gray-900 dark:text-gray-100 transition-colors',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 pb-3 border-b border-gray-100 dark:border-gray-800', className)}>
      {title && <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      {children}
    </div>
  )
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('space-y-3', className)}>{children}</div>
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
}

export function StatCard({ label, value, icon, color = 'blue' }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/60 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
  }

  return (
    <Card className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
      {icon && (
        <div className={cn('p-3 rounded-xl flex-shrink-0 transition-colors', colors[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </Card>
  )
}
