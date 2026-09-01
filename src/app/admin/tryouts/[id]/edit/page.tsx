'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { TryoutForm, type TryoutFormPayload } from '@/components/admin/tryouts/TryoutForm'
import { QuestionSelector } from '@/components/admin/tryouts/QuestionSelector'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import type { Category, Exam } from '@/types/database'

export default function EditTryoutPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [exam, setExam] = useState<Exam | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('exams').select('*').eq('id', id).single(),
      supabase.from('categories').select('*').order('name'),
    ]).then(([examRes, catRes]) => {
      setExam(examRes.data)
      setCategories(catRes.data ?? [])
      setLoading(false)
    })
  }, [id, supabase])

  async function handleSave(payload: TryoutFormPayload) {
    setSaving(true)
    const { error } = await supabase
      .from('exams')
      .update(payload)
      .eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Tryout berhasil diperbarui')
      router.push('/admin/tryouts')
    }
    setSaving(false)
  }

  if (loading) return <PageLoader label="Memuat tryout..." />
  if (!exam) return <div className="text-center py-12 text-gray-500">Tryout tidak ditemukan</div>

  return (
    <div>
      <PageHeader
        title="Edit Tryout"
        description={exam.title}
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowQuestions(!showQuestions)}>
            {showQuestions ? 'Lihat Konfigurasi' : 'Edit Soal'}
          </Button>
        }
      />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 lg:p-6 transition-colors">
        {!showQuestions ? (
          <TryoutForm
            categories={categories}
            initial={exam}
            onSave={handleSave}
            onCancel={() => router.push('/admin/tryouts')}
            saving={saving}
          />
        ) : (
          <QuestionSelector
            examId={exam.id}
            categoryId={exam.category_id}
            targetCount={exam.question_count}
            mode={exam.selection_mode}
            onDone={() => {
              setShowQuestions(false)
              toast.success('Pilihan soal diperbarui')
            }}
          />
        )}
      </div>
    </div>
  )
}
