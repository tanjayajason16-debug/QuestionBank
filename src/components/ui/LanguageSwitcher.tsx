'use client'

import React from 'react'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n()

  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      <button
        onClick={() => setLocale('id')}
        className={cn(
          'px-2 py-1 rounded font-medium transition-colors',
          locale === 'id'
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-500 hover:text-gray-700'
        )}
        aria-pressed={locale === 'id'}
      >
        ID
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLocale('en')}
        className={cn(
          'px-2 py-1 rounded font-medium transition-colors',
          locale === 'en'
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-500 hover:text-gray-700'
        )}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  )
}
