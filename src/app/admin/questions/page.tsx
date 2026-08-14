'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { DifficultyBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { toast } from '@/components/ui/Toast'
import { QuestionForm, type QuestionPayload } from '@/components/admin/questions/QuestionForm'
import { QuestionPreview } from '@/components/admin/questions/QuestionPreview'
import { CsvImport } from '@/components/admin/questions/CsvImport'
import { downloadCsv, formatDate } from '@/lib/utils'
import type { Category, Question } from '@/types/database'

const PAGE_SIZE = 20

type QuestionWithCategory = Question & { categories: Category }

export default function QuestionsPage() {
  const supabase = createClient()

  const [questions, setQuestions] = useState<QuestionWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [page, setPage] = useState(1)

  // Dialogs
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<QuestionWithCategory | null>(null)
  const [previewTarget, setPreviewTarget] = useState<QuestionWithCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuestionWithCategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }, [supabase])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('questions')
      .select('*, categories(*)', { count: 'exact' })

    if (search) {
      query = query.ilike('question', `%${search}%`)
    }
    if (filterCategory) query = query.eq('category_id', filterCategory)
    if (filterGrade) query = query.eq('grade', parseInt(filterGrade))
    if (filterDifficulty) query = query.eq('difficulty', filterDifficulty)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    setQuestions((data as QuestionWithCategory[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, search, filterCategory, filterGrade, filterDifficulty, page])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => {
    setPage(1)
  }, [search, filterCategory, filterGrade, filterDifficulty])
  useEffect(() => { loadQuestions() }, [loadQuestions])

  async function handleCreate(payload: QuestionPayload) {
    setSaving(true)
    const { error } = await supabase.from('questions').insert(payload)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Soal berhasil ditambahkan')
      setShowCreate(false)
      loadQuestions()
    }
    setSaving(false)
  }

  async function handleEdit(payload: QuestionPayload) {
    if (!editTarget) return
    setSaving(true)
    const { error } = await supabase
      .from('questions')
      .update(payload)
      .eq('id', editTarget.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Soal berhasil diperbarui')
      setEditTarget(null)
      loadQuestions()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus. Soal mungkin digunakan oleh tryout.')
    } else {
      toast.success('Soal berhasil dihapus')
      setDeleteTarget(null)
      loadQuestions()
    }
    setDeleting(false)
  }

  function handleExport() {
    if (questions.length === 0) { toast.error('Tidak ada data untuk diekspor'); return }
    const header = 'category,grade,difficulty,question,image_url,option_a,option_b,option_c,option_d,correct_answer,explanation'
    const rows = questions.map((q) =>
      [
        `"${q.categories?.name ?? ''}"`,
        q.grade,
        q.difficulty,
        `"${q.question.replace(/"/g, '""')}"`,
        q.image_url ?? '',
        `"${q.option_a}"`,
        `"${q.option_b}"`,
        `"${q.option_c}"`,
        `"${q.option_d}"`,
        q.correct_answer,
        `"${q.explanation.replace(/"/g, '""')}"`,
      ].join(',')
    )
    downloadCsv([header, ...rows].join('\n'), 'bank-soal.csv')
  }

  const gradeOptions = Array.from({ length: 13 }, (_, i) => ({
    value: String(i + 1),
    label: `Kelas ${i + 1}`,
  }))

  return (
    <div>
      <PageHeader
        title="Bank Soal"
        description={`${total.toLocaleString('id-ID')} soal tersedia`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCsvImport(true)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            >
              Impor CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Ekspor
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Tambah Soal
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari pertanyaan..."
          className="flex-1"
        />
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Semua Kategori"
          className="w-full sm:w-44"
        />
        <Select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          options={gradeOptions}
          placeholder="Semua Kelas"
          className="w-full sm:w-36"
        />
        <Select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          options={[
            { value: 'easy', label: 'Mudah' },
            { value: 'medium', label: 'Sedang' },
            { value: 'hard', label: 'Sulit' },
          ]}
          placeholder="Semua Kesulitan"
          className="w-full sm:w-40"
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="w-8">#</TableHeader>
            <TableHeader>Pertanyaan</TableHeader>
            <TableHeader>Kategori</TableHeader>
            <TableHeader>Kelas</TableHeader>
            <TableHeader>Kesulitan</TableHeader>
            <TableHeader>Jwb Benar</TableHeader>
            <TableHeader>Dibuat</TableHeader>
            <TableHeader className="w-28">Aksi</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : questions.length === 0 ? (
            <TableEmpty colSpan={8} message="Tidak ada soal" />
          ) : (
            questions.map((q, i) => (
              <TableRow key={q.id}>
                <TableCell className="text-gray-400 text-xs">
                  {(page - 1) * PAGE_SIZE + i + 1}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-gray-900" title={q.question}>
                    {q.question}
                  </p>
                  {q.image_url && (
                    <span className="text-xs text-blue-500 mt-0.5 block">📷 Ada gambar</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-600">{q.categories?.name}</span>
                </TableCell>
                <TableCell className="text-gray-600">{q.grade}</TableCell>
                <TableCell>
                  <DifficultyBadge difficulty={q.difficulty} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    {q.correct_answer}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-gray-400">{formatDate(q.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Preview */}
                    <button
                      onClick={() => setPreviewTarget(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Pratinjau"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => setEditTarget(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {total > PAGE_SIZE && (
        <div className="mt-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Tambah Soal" size="xl">
        <QuestionForm
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          saving={saving}
        />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Soal"
        size="xl"
      >
        {editTarget && (
          <QuestionForm
            categories={categories}
            initial={editTarget}
            onSave={handleEdit}
            onCancel={() => setEditTarget(null)}
            saving={saving}
          />
        )}
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        title="Pratinjau Soal"
        size="lg"
      >
        {previewTarget && <QuestionPreview question={previewTarget} />}
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Soal"
        message="Hapus soal ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={deleting}
      />

      {/* CSV Import Dialog */}
      <Dialog
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        title="Impor Soal dari CSV"
        size="xl"
      >
        <CsvImport
          categories={categories}
          onImportComplete={() => {
            setShowCsvImport(false)
            loadQuestions()
          }}
          onCancel={() => setShowCsvImport(false)}
        />
      </Dialog>
    </div>
  )
}
