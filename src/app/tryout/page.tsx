'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useI18n } from '@/lib/i18n/context'

interface FormState {
  full_name: string
  school: string
  class: string
  nis: string
  email: string
  access_code: string
}

const empty: FormState = {
  full_name: '',
  school: '',
  class: '',
  nis: '',
  email: '',
  access_code: '',
}

export default function TryoutLandingPage() {
  const { t } = useI18n()
  const router = useRouter()

  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [loading, setLoading] = useState(false)

  const set = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.full_name.trim()) e.full_name = t.errors.requiredField
    if (!form.school.trim()) e.school = t.errors.requiredField
    if (!form.class.trim()) e.class = t.errors.requiredField
    if (!form.nis.trim()) e.nis = t.errors.requiredField
    if (!form.access_code.trim()) e.access_code = t.errors.requiredField
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = t.errors.invalidEmail
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/tryout/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.access_code.trim().toUpperCase(),
        student: {
          full_name: form.full_name.trim(),
          school: form.school.trim(),
          class: form.class.trim(),
          nis: form.nis.trim(),
          email: form.email.trim() || null,
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msgMap: Record<string, string> = {
        INVALID_CODE: t.errors.invalidCode,
        EXPIRED_CODE: t.errors.expiredCode,
        DISABLED_CODE: t.errors.disabledCode,
        USAGE_LIMIT: t.errors.usageLimitReached,
        INACTIVE_EXAM: t.errors.inactiveTryout,
        EXPIRED_EXAM: t.errors.expiredTryout,
        NOT_STARTED: t.errors.notStartedTryout,
      }
      toast.error(msgMap[data.code] ?? t.errors.serverError)
      setLoading(false)
      return
    }

    // Navigate to exam instructions
    router.push(`/tryout/exam/${data.attempt_id}/instructions`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.landing.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.landing.subtitle}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label={t.landing.fullName}
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder={t.landing.fullNamePlaceholder}
              error={errors.full_name}
              required
              autoComplete="name"
              autoFocus
            />
            <Input
              label={t.landing.school}
              value={form.school}
              onChange={(e) => set('school', e.target.value)}
              placeholder={t.landing.schoolPlaceholder}
              error={errors.school}
              required
              autoComplete="organization"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t.landing.class}
                value={form.class}
                onChange={(e) => set('class', e.target.value)}
                placeholder={t.landing.classPlaceholder}
                error={errors.class}
                required
              />
              <Input
                label={t.landing.nis}
                value={form.nis}
                onChange={(e) => set('nis', e.target.value)}
                placeholder={t.landing.nisPlaceholder}
                error={errors.nis}
                required
              />
            </div>
            <Input
              label={t.landing.email}
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder={t.landing.emailPlaceholder}
              error={errors.email}
              autoComplete="email"
            />

            <div className="pt-2 border-t border-gray-100">
              <Input
                label={t.landing.accessCode}
                value={form.access_code}
                onChange={(e) => set('access_code', e.target.value.toUpperCase())}
                placeholder={t.landing.accessCodePlaceholder}
                error={errors.access_code}
                required
                className="font-mono text-lg tracking-widest uppercase"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              {loading ? t.landing.validating : t.landing.startButton}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
