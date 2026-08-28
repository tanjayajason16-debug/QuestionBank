'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  HelpCircle,
  Tag,
  ClipboardList,
  KeyRound,
  Users,
  BarChart3,
  PieChart,
  Settings2,
  LogOut,
  FileText,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { translations } from '@/lib/i18n/translations'
import { signOut } from '@/app/admin/actions'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface NavItem {
  href: string
  labelKey: keyof typeof translations['id']['nav']
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    labelKey: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/admin/questions',
    labelKey: 'questionBank',
    icon: <HelpCircle className="w-5 h-5" />,
  },
  {
    href: '/admin/categories',
    labelKey: 'categories',
    icon: <Tag className="w-5 h-5" />,
  },
  {
    href: '/admin/tryouts',
    labelKey: 'tryouts',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    href: '/admin/access-codes',
    labelKey: 'accessCodes',
    icon: <KeyRound className="w-5 h-5" />,
  },
  {
    href: '/admin/students',
    labelKey: 'students',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/admin/results',
    labelKey: 'results',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    href: '/admin/analytics',
    labelKey: 'analytics',
    icon: <PieChart className="w-5 h-5" />,
  },
  {
    href: '/admin/settings',
    labelKey: 'settings',
    icon: <Settings2 className="w-5 h-5" />,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Platform Tryout</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin" aria-label="Navigasi admin">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className={cn(isActive(item.href) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500')}>
                  {item.icon}
                </span>
                {t.nav[item.labelKey]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <LanguageSwitcher className="px-3 py-1" />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t.nav.logout}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 h-14">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">Platform Tryout</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-gray-900 h-full shadow-2xl">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
