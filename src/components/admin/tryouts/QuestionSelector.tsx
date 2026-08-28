'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Input'
import { DifficultyBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { Category, Question } from '@/types/database'

type QuestionWithCategory = Question & { categories: Category }

interface QuestionSelectorProps {
  examId: string
  categoryId: string
  targetCount: number
  mode: 'manual' | 'random'
  onDone: () => void
}

const PAGE_SIZE = 15

export function QuestionSelector({ examId, categoryId, targetCount, mode, onDone }: QuestionSelectorProps) {
  const supabase = createClient()

  const [questions, setQuestions] = useState<QuestionWithCategory[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [availableForRandom, setAvailableForRandom] = useState(0)

  // Load already-selected question IDs for this exam
  useEffect(() => {
    supabase
      .from('exam_questions')
      .select('question_id')
      .eq('exam_id', examId)
      .then(({ data }) => {
        if (data) setSelected(new Set(data.map((r) => r.question_id)))
      })
  }, [examId, supabase])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('questions')
      .select('*, categories(*)', { count: 'exact' })
      .eq('category_id', categoryId)

    if (search) query = query.ilike('question', `%${search}%`)
    if (filterDifficulty) query = query.eq('difficulty', filterDifficulty)
    if (filterGrade) query = query.eq('grade', parseInt(filterGrade))

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    setQuestions((data as QuestionWithCategory[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, categoryId, search, filterDifficulty, filterGrade, page])

  // For random mode: count available questions
  useEffect(() => {
    if (mode === 'random') {
      supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .then(({ count }) => setAvailableForRandom(count ?? 0))
    }
  }, [mode, categoryId, supabase])

  useEffect(() => { loadQuestions() }, [loadQuestions])
  useEffect(() => { setPage(1) }, [search, filterDifficulty, filterGrade])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= targetCount) {
          toast.error(`Maksimal ${targetCount} soal`)
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  async function handleRandomSelect() {
    if (availableForRandom < targetCount) {
      toast.error(
        `Tidak cukup soal. Tersedia: ${availableForRandom}, dibutuhkan: ${targetCount}. Tambahkan ${targetCount - availableForRandom} soal lagi.`
      )
      return
    }

    setSaving(true)
    // Fetch all matching question IDs
    const { data } = await supabase
      .from('questions')
      .select('id')
      .eq('category_id', categoryId)

    if (!data) { setSaving(false); return }

    // Shuffle and pick targetCount
    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, targetCount)
    setSelected(new Set(shuffled.map((q) => q.id)))
    setSaving(false)
    toast.success(`${targetCount} soal dipilih secara acak`)
  }

  async function handleSave() {
    if (mode === 'manual' && selected.size !== targetCount) {
      toast.error(`Pilih tepat ${targetCount} soal. Dipilih: ${selected.size}`)
      return
    }
    if (mode === 'random' && selected.size === 0) {
      toast.error('Klik "Pilih Acak" terlebih dahulu')
      return
    }

    setSaving(true)
    // Delete existing selections
    await supabase.from('exam_questions').delete().eq('exam_id', examId)

    // Insert new selections
    const ids = Array.from(selected)
    const payload = ids.map((questionId, i) => ({
      exam_id: examId,
      question_id: questionId,
      order_index: i + 1,
    }))

    const { error } = await supabase.from('exam_questions').insert(payload)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`${ids.length} soal berhasil disimpan`)
      onDone()
    }
    setSaving(false)
  }

  const gradeOptions = Array.from({ length: 13 }, (_, i) => ({
    value: String(i + 1),
    label: `Kelas ${i + 1}`,
  }))

  const isComplete = selected.size === targetCount

  return (
    <div className="space-y-4 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Pilih Soal{' '}
            <span className={cn(
              'font-bold',
              isComplete ? 'text-green-600 dark:text-green-400' : selected.size > targetCount ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'
            )}>
              {selected.size} / {targetCount}
            </span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {mode === 'manual'
              ? 'Pilih soal secara manual dari daftar di bawah'
              : 'Klik "Pilih Acak" atau pilih manual'}
          </p>
        </div>

        {mode === 'random' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Tersedia: {availableForRandom}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRandomSelect}
              loading={saving}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Pilih Acak
            </Button>
          </div>
        )}
      </div>

      {/* Insufficient warning */}
      {mode === 'random' && availableForRandom < targetCount && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-sm text-red-700 dark:text-red-300">
          Soal tidak cukup. Tersedia: <strong>{availableForRandom}</strong>, dibutuhkan: <strong>{targetCount}</strong>.
          Tambahkan <strong>{targetCount - availableForRandom}</strong> soal lagi ke bank soal.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari soal..." className="flex-1 min-w-0" />
        <Select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          options={[{ value: 'easy', label: 'Mudah' }, { value: 'medium', label: 'Sedang' }, { value: 'hard', label: 'Sulit' }]}
          placeholder="Kesulitan"
          className="w-32"
        />
        <Select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          options={gradeOptions}
          placeholder="Kelas"
          className="w-28"
        />
      </div>

      {/* Question list */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
        <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Memuat soal...</div>
          ) : questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Tidak ada soal</div>
          ) : (
            questions.map((q) => {
              const isSelected = selected.has(q.id)
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleSelect(q.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 dark:hover:bg-primary-950/80'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-xs text-gray-400 dark:text-gray-500">Kelas {q.grade}</span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Menampilkan {questions.length} dari {total} soal tersedia
        </p>
        <Button onClick={handleSave} loading={saving} disabled={selected.size === 0}>
          Simpan Pilihan Soal
        </Button>
      </div>
    </div>
  )
}
