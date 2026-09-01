'use client'

import React, { useState } from 'react'
import { Input, Textarea, Select, Checkbox } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Category, Exam } from '@/types/database'

export interface TryoutFormPayload {
  title: string
  description: string | null
  category_id: string
  grade: number
  question_count: number
  duration_minutes: number
  passing_score: number
  selection_mode: 'manual' | 'random'
  randomize_questions: boolean
  randomize_answers: boolean
  show_explanations: boolean
  allow_retake: boolean
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'active' | 'inactive' | 'expired'
}

interface TryoutFormProps {
  categories: Category[]
  initial?: Partial<Exam>
  onSave: (data: TryoutFormPayload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

const QUESTION_COUNT_PRESETS = [5, 10, 20, 25, 30, 40, 50, 75, 100]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

export function TryoutForm({ categories, initial, onSave, onCancel, saving }: TryoutFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category_id: initial?.category_id ?? '',
    grade: initial?.grade?.toString() ?? '',
    question_count: initial?.question_count?.toString() ?? '40',
    duration_minutes: initial?.duration_minutes?.toString() ?? '60',
    passing_score: initial?.passing_score?.toString() ?? '70',
    selection_mode: initial?.selection_mode ?? 'manual',
    randomize_questions: initial?.randomize_questions ?? false,
    randomize_answers: initial?.randomize_answers ?? false,
    show_explanations: initial?.show_explanations ?? true,
    allow_retake: initial?.allow_retake ?? false,
    start_date: initial?.start_date ? initial.start_date.substring(0, 16) : '',
    end_date: initial?.end_date ? initial.end_date.substring(0, 16) : '',
    status: initial?.status ?? 'draft',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customCount, setCustomCount] = useState(
    !QUESTION_COUNT_PRESETS.includes(initial?.question_count ?? 40)
  )

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Judul wajib diisi'
    if (!form.category_id) e.category_id = 'Pilih kategori'
    if (!form.grade) e.grade = 'Kelas wajib diisi'
    const qc = parseInt(form.question_count)
    if (!form.question_count || isNaN(qc) || qc < 1) e.question_count = 'Jumlah soal tidak valid'
    const dur = parseInt(form.duration_minutes)
    if (!form.duration_minutes || isNaN(dur) || dur < 1) e.duration_minutes = 'Durasi tidak valid'
    const ps = parseInt(form.passing_score)
    if (isNaN(ps) || ps < 0 || ps > 100) e.passing_score = 'Nilai kelulusan harus 0–100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id,
      grade: parseInt(form.grade),
      question_count: parseInt(form.question_count),
      duration_minutes: parseInt(form.duration_minutes),
      passing_score: parseInt(form.passing_score),
      selection_mode: form.selection_mode as 'manual' | 'random',
      randomize_questions: form.randomize_questions,
      randomize_answers: form.randomize_answers,
      show_explanations: form.show_explanations,
      allow_retake: form.allow_retake,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      status: form.status as 'draft' | 'active' | 'inactive' | 'expired',
    })
  }

  const gradeOptions = Array.from({ length: 13 }, (_, i) => ({
    value: String(i + 1),
    label: `Kelas ${i + 1}`,
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Informasi Dasar</h3>
        <Input
          label="Judul"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="contoh: Matematika SMP - Paket 01"
          error={errors.title}
          required
          autoFocus
        />
        <Textarea
          label="Deskripsi (opsional)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Deskripsi tryout..."
          rows={2}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Kategori"
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih kategori"
            error={errors.category_id}
            required
          />
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
          label="Status"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={STATUS_OPTIONS}
          required
        />
      </section>

      {/* Exam Config */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Konfigurasi Ujian</h3>

        {/* Question count */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Jumlah Soal <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { set('question_count', String(n)); setCustomCount(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  !customCount && form.question_count === String(n)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400 dark:bg-gray-800'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomCount(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                customCount
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400 dark:bg-gray-800'
              }`}
            >
              Kustom
            </button>
          </div>
          {customCount && (
            <Input
              type="number"
              value={form.question_count}
              onChange={(e) => set('question_count', e.target.value)}
              placeholder="Masukkan jumlah soal"
              min={1}
              error={errors.question_count}
            />
          )}
          {errors.question_count && !customCount && (
            <p className="text-xs text-red-600">{errors.question_count}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Durasi (menit)"
            type="number"
            value={form.duration_minutes}
            onChange={(e) => set('duration_minutes', e.target.value)}
            min={1}
            error={errors.duration_minutes}
            required
          />
          <Input
            label="Nilai Kelulusan (%)"
            type="number"
            value={form.passing_score}
            onChange={(e) => set('passing_score', e.target.value)}
            min={0}
            max={100}
            error={errors.passing_score}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Mode Pemilihan Soal</label>
          <div className="flex gap-4">
            {[
              { value: 'manual', label: 'Manual', desc: 'Pilih soal sendiri' },
              { value: 'random', label: 'Acak', desc: 'Sistem memilih otomatis' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  form.selection_mode === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:bg-gray-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="selection_mode"
                  value={opt.value}
                  checked={form.selection_mode === opt.value}
                  onChange={(e) => set('selection_mode', e.target.value)}
                  className="mt-0.5 text-primary-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Options */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Opsi Tambahan</h3>
        <Checkbox
          label="Acak urutan soal"
          description="Urutan soal berbeda untuk setiap siswa"
          checked={form.randomize_questions}
          onChange={(e) => set('randomize_questions', e.target.checked)}
        />
        <Checkbox
          label="Acak urutan pilihan jawaban"
          description="Opsi A–D diacak untuk setiap siswa"
          checked={form.randomize_answers}
          onChange={(e) => set('randomize_answers', e.target.checked)}
        />
        <Checkbox
          label="Tampilkan penjelasan setelah submit"
          description="Siswa dapat melihat penjelasan jawaban"
          checked={form.show_explanations}
          onChange={(e) => set('show_explanations', e.target.checked)}
        />
        <Checkbox
          label="Izinkan pengulangan"
          description="Siswa dapat mengulang tryout ini"
          checked={form.allow_retake}
          onChange={(e) => set('allow_retake', e.target.checked)}
        />
      </section>

      {/* Schedule */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Jadwal (opsional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal Mulai"
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
          <Input
            label="Tanggal Selesai"
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Batal
        </Button>
        <Button type="submit" loading={saving}>
          {initial?.id ? 'Simpan Perubahan' : 'Lanjut: Pilih Soal'}
        </Button>
      </div>
    </form>
  )
}
