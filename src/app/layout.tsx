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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('tryout_theme') || 'light';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen dark:bg-gray-900 dark:text-gray-100 transition-colors">
        <I18nProvider>
          <ToastProvider />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
