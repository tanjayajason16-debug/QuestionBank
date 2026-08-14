import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/context'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Platform Tryout Online',
  description: 'Platform ujian dan tryout online modern',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <I18nProvider>
          <ToastProvider />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
