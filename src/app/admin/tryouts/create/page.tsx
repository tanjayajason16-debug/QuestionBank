'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { TryoutForm, type TryoutFormPayload } from '@/components/admin/tryouts/TryoutForm'
import { QuestionSelector } from '@/components/admin/tryouts/QuestionSelector'
import { toast } from '@/components/ui/Toast'
import type { Category } from '@/types/database'

type Step = 'form' | 'questions'

export default function CreateTryoutPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('form')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [createdExamId, setCreatedExamId] = useState<string | null>(null)
  const [examConfig, setExamConfig] = useState<TryoutFormPayload | null>(null)

  useEffect(() => {
    supabase.from('categories').select('*').order('name')
      .then(({ data }) => setCategories(data ?? []))
  }, [supabase])

  async function handleFormSave(payload: TryoutFormPayload) {
    setSaving(true)
    const { data, error } = await supabase
      .from('exams')
      .insert(payload)
      .select()
      .single()

    if (error || !data) {
      toast.error(error?.message ?? 'Gagal membuat tryout')
      setSaving(false)
      return
    }

    setCreatedExamId(data.id)
    setExamConfig(payload)
    setSaving(false)
    setStep('questions')
    toast.success('Tryout dibuat. Sekarang pilih soal.')
  }

  function handleQuestionsDone() {
    toast.success('Tryout berhasil disimpan lengkap!')
    router.push('/admin/tryouts')
  }

  return (
    <div>
      <PageHeader
        title="Buat Tryout"
        description={step === 'form' ? 'Langkah 1: Konfigurasi tryout' : 'Langkah 2: Pilih soal'}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {[
          { n: 1, label: 'Konfigurasi', key: 'form' },
          { n: 2, label: 'Pilih Soal', key: 'questions' },
        ].map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-2 ${step === s.key ? 'text-primary-700' : step === 'questions' && s.key === 'form' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                step === s.key
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : step === 'questions' && s.key === 'form'
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {step === 'questions' && s.key === 'form' ? '✓' : s.n}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
            {i === 0 && <div className="flex-1 h-0.5 bg-gray-200 max-w-12" />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
        {step === 'form' && (
          <TryoutForm
            categories={categories}
            onSave={handleFormSave}
            onCancel={() => router.push('/admin/tryouts')}
            saving={saving}
          />
        )}
        {step === 'questions' && createdExamId && examConfig && (
          <QuestionSelector
            examId={createdExamId}
            categoryId={examConfig.category_id}
            targetCount={examConfig.question_count}
            mode={examConfig.selection_mode}
            onDone={handleQuestionsDone}
          />
        )}
      </div>
    </div>
  )
}
