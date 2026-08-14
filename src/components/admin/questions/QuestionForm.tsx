'use client'

import React, { useState } from 'react'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Category, Question } from '@/types/database'
import Image from 'next/image'

interface QuestionFormProps {
  categories: Category[]
  initial?: Partial<Question>
  onSave: (data: QuestionPayload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export interface QuestionPayload {
  category_id: string
  grade: number
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  image_url: string | null
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
]

const ANSWER_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

export function QuestionForm({ categories, initial, onSave, onCancel, saving }: QuestionFormProps) {
  const [form, setForm] = useState({
    category_id: initial?.category_id ?? '',
    grade: initial?.grade?.toString() ?? '',
    difficulty: initial?.difficulty ?? 'medium',
    question: initial?.question ?? '',
    image_url: initial?.image_url ?? '',
    option_a: initial?.option_a ?? '',
    option_b: initial?.option_b ?? '',
    option_c: initial?.option_c ?? '',
    option_d: initial?.option_d ?? '',
    correct_answer: initial?.correct_answer ?? 'A',
    explanation: initial?.explanation ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imageError, setImageError] = useState(false)

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.category_id) e.category_id = 'Pilih kategori'
    if (!form.grade) e.grade = 'Kelas wajib diisi'
    if (!form.question.trim()) e.question = 'Pertanyaan wajib diisi'
    if (!form.option_a.trim()) e.option_a = 'Opsi A wajib diisi'
    if (!form.option_b.trim()) e.option_b = 'Opsi B wajib diisi'
    if (!form.option_c.trim()) e.option_c = 'Opsi C wajib diisi'
    if (!form.option_d.trim()) e.option_d = 'Opsi D wajib diisi'
    if (!form.explanation.trim()) e.explanation = 'Penjelasan wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSave({
      category_id: form.category_id,
      grade: parseInt(form.grade),
      difficulty: form.difficulty as 'easy' | 'medium' | 'hard',
      question: form.question.trim(),
      image_url: form.image_url.trim() || null,
      option_a: form.option_a.trim(),
      option_b: form.option_b.trim(),
      option_c: form.option_c.trim(),
      option_d: form.option_d.trim(),
      correct_answer: form.correct_answer as 'A' | 'B' | 'C' | 'D',
      explanation: form.explanation.trim(),
    })
  }

  const gradeOptions = Array.from({ length: 13 }, (_, i) => ({
    value: String(i + 1),
    label: `Kelas ${i + 1}`,
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Select
            label="Kategori"
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih kategori"
            error={errors.category_id}
            required
          />
        </div>
        <Select
          label="Kelas"
          value={form.grade}
          onChange={(e) => set('grade', e.target.value)}
          options={gradeOptions}
          placeholder="Pilih kelas"
          error={errors.grade}
          required
        />
      </div>

      <Select
        label="Tingkat Kesulitan"
        value={form.difficulty}
        onChange={(e) => set('difficulty', e.target.value)}
        options={DIFFICULTY_OPTIONS}
        required
      />

      <Textarea
        label="Pertanyaan"
        value={form.question}
        onChange={(e) => set('question', e.target.value)}
        placeholder="Tulis pertanyaan di sini..."
        error={errors.question}
        required
        rows={3}
      />

      <Input
        label="URL Gambar (opsional)"
        value={form.image_url}
        onChange={(e) => { set('image_url', e.target.value); setImageError(false) }}
        placeholder="https://example.com/gambar.jpg"
      />

      {form.image_url && !imageError && (
        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <Image
            src={form.image_url}
            alt="Pratinjau gambar"
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            unoptimized
          />
        </div>
      )}
      {form.image_url && imageError && (
        <p className="text-xs text-red-500">Gagal memuat gambar. Periksa URL.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Opsi A" value={form.option_a} onChange={(e) => set('option_a', e.target.value)} error={errors.option_a} required />
        <Input label="Opsi B" value={form.option_b} onChange={(e) => set('option_b', e.target.value)} error={errors.option_b} required />
        <Input label="Opsi C" value={form.option_c} onChange={(e) => set('option_c', e.target.value)} error={errors.option_c} required />
        <Input label="Opsi D" value={form.option_d} onChange={(e) => set('option_d', e.target.value)} error={errors.option_d} required />
      </div>

      <Select
        label="Jawaban Benar"
        value={form.correct_answer}
        onChange={(e) => set('correct_answer', e.target.value)}
        options={ANSWER_OPTIONS}
        required
      />

      <Textarea
        label="Penjelasan"
        value={form.explanation}
        onChange={(e) => set('explanation', e.target.value)}
        placeholder="Jelaskan mengapa jawaban ini benar..."
        error={errors.explanation}
        required
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Batal
        </Button>
        <Button type="submit" loading={saving}>
          {initial?.id ? 'Simpan Perubahan' : 'Tambah Soal'}
        </Button>
      </div>
    </form>
  )
}
