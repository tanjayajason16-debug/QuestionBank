'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { generateAccessCode, downloadCsv, formatDate, formatDateOnly } from '@/lib/utils'
import type { AccessCode, Exam } from '@/types/database'

type CodeWithExam = AccessCode & { exams: Exam }

type FilterType = 'all' | 'unused' | 'used' | 'disabled'

const PAGE_SIZE = 25

export default function AccessCodesPage() {
  const supabase = createClient()

  const [codes, setCodes] = useState<CodeWithExam[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')

  // Generate dialog
  const [showGenerate, setShowGenerate] = useState(false)
  const [genForm, setGenForm] = useState({
    exam_id: '',
    count: '10',
    prefix: '',
    max_usage: '1',
    expires_at: '',
  })
  const [genErrors, setGenErrors] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

  // Action dialogs
  const [disableTarget, setDisableTarget] = useState<CodeWithExam | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CodeWithExam | null>(null)
  const [actioning, setActioning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('access_codes')
      .select('*, exams(id,title)', { count: 'exact' })

    if (search) query = query.ilike('code', `%${search}%`)
    if (filterExam) query = query.eq('exam_id', filterExam)
    if (filterType === 'unused') query = query.eq('usage_count', 0).eq('is_active', true)
    if (filterType === 'used') query = query.gt('usage_count', 0)
    if (filterType === 'disabled') query = query.eq('is_active', false)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    setCodes((data as CodeWithExam[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, search, filterExam, filterType, page])

  useEffect(() => {
    supabase.from('exams').select('id,title').order('title').then(({ data }) => setExams(data ?? []))
  }, [supabase])

  useEffect(() => { setPage(1) }, [search, filterExam, filterType])
  useEffect(() => { load() }, [load])

  function validateGenForm(): boolean {
    const e: Record<string, string> = {}
    if (!genForm.exam_id) e.exam_id = 'Pilih tryout'
    const count = parseInt(genForm.count)
    if (!genForm.count || isNaN(count) || count < 1 || count > 500) e.count = 'Jumlah harus 1–500'
    const mu = parseInt(genForm.max_usage)
    if (!genForm.max_usage || isNaN(mu) || mu < 1) e.max_usage = 'Maks penggunaan minimal 1'
    setGenErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleGenerate() {
    if (!validateGenForm()) return
    setGenerating(true)

    const count = parseInt(genForm.count)
    const max_usage = parseInt(genForm.max_usage)
    const expires_at = genForm.expires_at
      ? new Date(genForm.expires_at).toISOString()
      : null

    // Generate unique codes
    const payload = []
    const used = new Set<string>()
    let attempts = 0

    while (payload.length < count && attempts < count * 5) {
      const code = generateAccessCode(genForm.prefix)
      if (!used.has(code)) {
        used.add(code)
        payload.push({
          exam_id: genForm.exam_id,
          code,
          max_usage,
          expires_at,
        })
      }
      attempts++
    }

    // Batch insert
    const BATCH = 100
    let inserted = 0
    for (let i = 0; i < payload.length; i += BATCH) {
      const { error } = await supabase
        .from('access_codes')
        .insert(payload.slice(i, i + BATCH))
      if (!error) inserted += Math.min(BATCH, payload.length - i)
    }

    toast.success(`${inserted} kode berhasil dibuat`)
    setShowGenerate(false)
    setGenForm({ exam_id: '', count: '10', prefix: '', max_usage: '1', expires_at: '' })
    load()
    setGenerating(false)
  }

  async function handleDisable() {
    if (!disableTarget) return
    setActioning(true)
    const { error } = await supabase
      .from('access_codes')
      .update({ is_active: false })
      .eq('id', disableTarget.id)
    if (error) { toast.error(error.message) } else {
      toast.success('Kode dinonaktifkan')
      setDisableTarget(null)
      load()
    }
    setActioning(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActioning(true)
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast.error(error.message) } else {
      toast.success('Kode dihapus')
      setDeleteTarget(null)
      load()
    }
    setActioning(false)
  }

  function handleExport() {
    if (codes.length === 0) { toast.error('Tidak ada data'); return }
    const header = 'code,exam,max_usage,usage_count,expires_at,is_active'
    const rows = codes.map((c) =>
      [
        c.code,
        `"${c.exams?.title ?? ''}"`,
        c.max_usage,
        c.usage_count,
        c.expires_at ? formatDateOnly(c.expires_at) : '',
        c.is_active ? 'Ya' : 'Tidak',
      ].join(',')
    )
    downloadCsv([header, ...rows].join('\n'), 'kode-akses.csv')
  }

  function codeBadge(code: CodeWithExam) {
    if (!code.is_active) return <Badge variant="danger">Nonaktif</Badge>
    if (code.usage_count >= code.max_usage) return <Badge variant="warning">Habis</Badge>
    if (code.expires_at && new Date(code.expires_at) < new Date()) return <Badge variant="danger">Kadaluarsa</Badge>
    if (code.usage_count > 0) return <Badge variant="info">Terpakai</Badge>
    return <Badge variant="success">Aktif</Badge>
  }

  return (
    <div>
      <PageHeader
        title="Kode Akses"
        description={`${total.toLocaleString('id-ID')} kode`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
              Ekspor CSV
            </Button>
            <Button size="sm" onClick={() => setShowGenerate(true)}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
              Buat Kode
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari kode..." className="flex-1" />
        <Select
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
          options={exams.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Semua Tryout"
          className="w-full sm:w-52"
        />
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-white">
          {(['all', 'unused', 'used', 'disabled'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterType === f ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {{ all: 'Semua', unused: 'Belum', used: 'Terpakai', disabled: 'Nonaktif' }[f]}
            </button>
          ))}
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Kode</TableHeader>
            <TableHeader>Tryout</TableHeader>
            <TableHeader>Penggunaan</TableHeader>
            <TableHeader>Kadaluarsa</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Dibuat</TableHeader>
            <TableHeader className="w-24">Aksi</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : codes.length === 0 ? (
            <TableEmpty colSpan={7} message="Belum ada kode akses" />
          ) : (
            codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <code className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    {code.code}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-600 truncate max-w-[180px] block" title={code.exams?.title}>
                    {code.exams?.title}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${code.usage_count >= code.max_usage ? 'text-red-600' : 'text-gray-700'}`}>
                    {code.usage_count} / {code.max_usage}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {code.expires_at ? formatDateOnly(code.expires_at) : '∞'}
                </TableCell>
                <TableCell>{codeBadge(code)}</TableCell>
                <TableCell className="text-xs text-gray-400">{formatDate(code.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {code.is_active && (
                      <button
                        onClick={() => setDisableTarget(code)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                        title="Nonaktifkan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(code)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onClose={() => setShowGenerate(false)} title="Buat Kode Akses" size="md">
        <div className="space-y-4">
          <Select
            label="Tryout"
            value={genForm.exam_id}
            onChange={(e) => setGenForm({ ...genForm, exam_id: e.target.value })}
            options={exams.map((e) => ({ value: e.id, label: e.title }))}
            placeholder="Pilih tryout"
            error={genErrors.exam_id}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jumlah Kode"
              type="number"
              value={genForm.count}
              onChange={(e) => setGenForm({ ...genForm, count: e.target.value })}
              min={1}
              max={500}
              error={genErrors.count}
              required
              hint="Maks 500 sekaligus"
            />
            <Input
              label="Prefiks (opsional)"
              value={genForm.prefix}
              onChange={(e) => setGenForm({ ...genForm, prefix: e.target.value.toUpperCase() })}
              placeholder="contoh: MAT8"
              maxLength={8}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Maks Penggunaan"
              type="number"
              value={genForm.max_usage}
              onChange={(e) => setGenForm({ ...genForm, max_usage: e.target.value })}
              min={1}
              error={genErrors.max_usage}
              required
              hint="Per kode"
            />
            <Input
              label="Kadaluarsa"
              type="date"
              value={genForm.expires_at}
              onChange={(e) => setGenForm({ ...genForm, expires_at: e.target.value })}
              hint="Kosongkan = tidak ada batas"
            />
          </div>
          {genForm.prefix && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              Contoh kode: <code className="font-mono font-bold">{genForm.prefix.toUpperCase()}-XXXXX</code>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowGenerate(false)}>Batal</Button>
          <Button onClick={handleGenerate} loading={generating}>
            Buat {genForm.count || 0} Kode
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={handleDisable}
        title="Nonaktifkan Kode"
        message={`Nonaktifkan kode "${disableTarget?.code}"? Siswa tidak dapat menggunakan kode ini.`}
        confirmLabel="Nonaktifkan"
        variant="primary"
        loading={actioning}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kode"
        message={`Hapus kode "${deleteTarget?.code}"?`}
        confirmLabel="Hapus"
        loading={actioning}
      />
    </div>
  )
}
