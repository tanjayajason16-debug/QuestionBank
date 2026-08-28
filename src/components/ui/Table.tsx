import React from 'react'
import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-colors', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 transition-colors">
      {children}
    </thead>
  )
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 transition-colors">{children}</tbody>
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      className={cn(
        'bg-white dark:bg-gray-900 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHeader({
  children,
  className,
  sortable,
  sorted,
  direction,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  sortable?: boolean
  sorted?: boolean
  direction?: 'asc' | 'desc'
  onClick?: () => void
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap',
        sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
        className
      )}
      onClick={onClick}
      scope="col"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          <span className="text-gray-400 dark:text-gray-500">
            {sorted ? (direction === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        )}
      </span>
    </th>
  )
}

export function TableCell({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', className)} colSpan={colSpan}>
      {children}
    </td>
  )
}

export function TableEmpty({
  colSpan,
  message = 'Tidak ada data',
}: {
  colSpan: number
  message?: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
          <svg
            className="h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">{message}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}
