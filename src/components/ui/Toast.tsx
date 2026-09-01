'use client'

// Configurable Toast provider with react-hot-toast, fade-out on click/dismiss
import { Toaster, ToastIcon, resolveValue, toast as hotToast, type ToastPosition } from 'react-hot-toast'
import React, { useEffect, useState } from 'react'

export function ToastProvider() {
  const [position, setPosition] = useState<ToastPosition>('top-right')

  useEffect(() => {
    const saved = localStorage.getItem('tryout_toast_position') as ToastPosition | null
    if (saved) setPosition(saved)

    function handlePositionChange(e: Event) {
      const customEvent = e as CustomEvent<ToastPosition>
      if (customEvent.detail) setPosition(customEvent.detail)
    }

    window.addEventListener('toast-position-changed', handlePositionChange)
    return () => window.removeEventListener('toast-position-changed', handlePositionChange)
  }, [])

  return (
    <Toaster
      position={position}
      gutter={8}
      toastOptions={{
        duration: 4000,
        // Custom styles applied via className prop below
      }}
    >
      {(t) => (
        <div
          onClick={() => hotToast.dismiss(t.id)}
          title="Klik untuk menutup notifikasi"
          style={{ maxWidth: '380px' }}
          className={[
            'group flex items-center gap-3 px-4 py-3 cursor-pointer select-none',
            'rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'border border-gray-200/80 dark:border-gray-700/80 shadow-lg',
            'hover:scale-[1.03] active:scale-[0.98]',
            // react-hot-toast sets t.visible=false BEFORE removing —
            // this gives us the fade-out window
            'transition-all duration-300',
            t.visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2 pointer-events-none',
          ].join(' ')}
        >
          <ToastIcon toast={t} />
          <p className="text-sm font-medium pr-2 leading-snug flex-1">
            {resolveValue(t.message, t)}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              hotToast.dismiss(t.id)
            }}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5 rounded flex-shrink-0"
            aria-label="Tutup notifikasi"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </Toaster>
  )
}

export const toast = {
  success: (msg: string) => hotToast.success(msg),
  error: (msg: string) => hotToast.error(msg),
  loading: (msg: string) => hotToast.loading(msg),
  dismiss: (id?: string) => hotToast.dismiss(id),
  promise: hotToast.promise,
}
