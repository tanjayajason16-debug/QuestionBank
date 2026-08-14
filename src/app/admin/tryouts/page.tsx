'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { formatDateOnly } from '@/lib/utils'
import type { Exam, Category } from '@/types/database'

type ExamWithCategory = Exam & { categories: Category }

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'expired', label: 'Kadaluarsa' },
]

export default function TryoutsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [exams, setExams] = useState<ExamWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ExamWithCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('exams')
      .select('*, categories(*)')
      .order('created_at', { ascending: false })

    if (search) query = query.ilike('title', `%${search}%`)
    if (filterStatus) query = query.eq('status', filterStatus)

    const { data } = await query
    setExams((data as ExamWithCategory[]) ?? [])
    setLoading(false)
  }, [supabase, search, filterStatus])

  useEffect(() => { load() }, [load])

  async function handleDuplicate(exam: ExamWithCategory) {
    // Fetch exam questions
    const { data: eqs } = await supabase
      .from('exam_questions')
      .select('question_id, order_index')
      .eq('exam_id', exam.id)

    const { data: newExam, error } = await supabase
      .from('exams')
      .insert({
        title: `${exam.title} (Salinan)`,
        description: exam.description,
        category_id: exam.category_id,
        grade: exam.grade,
        question_count: exam.question_count,
        duration_minutes: exam.duration_minutes,
        passing_score: exam.passing_score,
        selection_mode: exam.selection_mode,
        randomize_questions: exam.randomize_questions,
        randomize_answers: exam.randomize_answers,
        show_explanations: exam.show_explanations,
        allow_retake: exam.allow_retake,
        status: 'draft',
      })
      .select()
      .single()

    if (error || !newExam) { toast.error('Gagal menduplikat tryout'); return }

    if (eqs && eqs.length > 0) {
      await supabase.from('exam_questions').insert(
        eqs.map((eq) => ({ exam_id: newExam.id, question_id: eq.question_id, order_index: eq.order_index }))
      )
    }

    toast.success('Tryout berhasil diduplikat')
    load()
  }

  async function handleToggleStatus(exam: ExamWithCategory) {
    const next = exam.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('exams')
      .update({ status: next })
      .eq('id', exam.id)
    if (error) { toast.error(error.message); return }
    toast.success(next === 'active' ? 'Tryout diaktifkan' : 'Tryout dinonaktifkan')
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('exams').delete().eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus. Tryout mungkin memiliki percobaan aktif.')
    } else {
      toast.success('Tryout berhasil dihapus')
      setDeleteTarget(null)
      load()
    }
    setDeleting(false)
  }

  return (
    <div>
      <PageHeader
        title="Tryout"
        description="Kelola ujian dan tryout"
        actions={
          <Button
            onClick={() => router.push('/admin/tryouts/create')}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          >
            Buat Tryout
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari tryout..." className="flex-1" />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={STATUS_OPTIONS}
          placeholder="Semua Status"
          className="w-full sm:w-40"
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Judul</TableHeader>
            <TableHeader>Kategori</TableHeader>
            <TableHeader>Soal</TableHeader>
            <TableHeader>Durasi</TableHeader>
            <TableHeader>Nilai Lulus</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Tanggal</TableHeader>
            <TableHeader className="w-36">Aksi</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : exams.length === 0 ? (
            <TableEmpty colSpan={8} message="Belum ada tryout" />
          ) : (
            exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-[200px]" title={exam.title}>{exam.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exam.selection_mode === 'random' ? '🎲 Acak' : '✋ Manual'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-600">{exam.categories?.name}</span>
                </TableCell>
                <TableCell className="font-medium">{exam.question_count}</TableCell>
                <TableCell>{exam.duration_minutes} mnt</TableCell>
                <TableCell>{exam.passing_score}%</TableCell>
                <TableCell><StatusBadge status={exam.status} /></TableCell>
                <TableCell className="text-xs text-gray-400">
                  {exam.start_date ? formatDateOnly(exam.start_date) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/admin/tryouts/${exam.id}/edit`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(exam)}
                      className={`p-1.5 rounded-lg transition-colors ${exam.status === 'active' ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                      title={exam.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {exam.status === 'active' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDuplicate(exam)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      title="Duplikat"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(exam)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Tryout"
        message={`Hapus tryout "${deleteTarget?.title}"? Semua kode akses akan ikut dihapus.`}
        confirmLabel="Hapus"
        loading={deleting}
      />
    </div>
  )
}
