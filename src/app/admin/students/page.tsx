'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { Student } from '@/types/database'

type StudentWithCount = Student & {
  attempt_count: number
  latest_code?: string | null
  latest_exam?: string | null
  latest_score?: number | null
  latest_status?: string | null
}

type GroupedCode = {
  code: string
  examTitle: string
  students: StudentWithCount[]
}

type SortField = 'created_at' | 'full_name' | 'school' | 'class'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'table' | 'grouped'

const PAGE_SIZE = 25

export default function StudentsPage() {
  const supabase = createClient()

  const [students, setStudents] = useState<StudentWithCount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // View mode: 'table' or 'grouped' (Group by Access Code)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterSchool, setFilterSchool] = useState('')
  const [schoolsList, setSchoolsList] = useState<string[]>([])

  // Selection state (Gmail-style)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  // Delete dialogs
  const [deleteTarget, setDeleteTarget] = useState<StudentWithCount | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch unique school list
  const loadSchools = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('school')
      .order('school')
    if (data) {
      const unique = Array.from(new Set(data.map((d) => d.school).filter(Boolean)))
      setSchoolsList(unique)
    }
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,nis.ilike.%${search}%,school.ilike.%${search}%,class.ilike.%${search}%`
      )
    }

    if (filterSchool) {
      query = query.eq('school', filterSchool)
    }

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, from + PAGE_SIZE - 1)

    if (data) {
      const ids = data.map((s) => s.id)
      
      // Fetch attempts with access codes and exam titles for visible students
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select(`
          student_id, status, score, created_at,
          access_codes(code),
          exams(title)
        `)
        .in('student_id', ids)
        .order('created_at', { ascending: false })

      const countMap = new Map<string, number>()
      const latestAttemptMap = new Map<
        string,
        { code: string; exam: string; score: number | null; status: string }
      >()

      attemptsData?.forEach((a: any) => {
        countMap.set(a.student_id, (countMap.get(a.student_id) ?? 0) + 1)
        if (!latestAttemptMap.has(a.student_id)) {
          latestAttemptMap.set(a.student_id, {
            code: a.access_codes?.code ?? 'Tanpa Kode',
            exam: a.exams?.title ?? '-',
            score: a.score,
            status: a.status,
          })
        }
      })

      const enriched: StudentWithCount[] = data.map((s) => {
        const latest = latestAttemptMap.get(s.id)
        return {
          ...s,
          attempt_count: countMap.get(s.id) ?? 0,
          latest_code: latest?.code ?? 'Belum ada kode',
          latest_exam: latest?.exam ?? '-',
          latest_score: latest?.score ?? null,
          latest_status: latest?.status ?? null,
        }
      })

      setStudents(enriched)

      // By default expand all active groups in grouped mode
      const codes = new Set(enriched.map((s) => s.latest_code || 'Belum ada kode'))
      setExpandedCodes(codes)
    }

    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, search, filterSchool, sortBy, sortOrder, page])

  useEffect(() => { loadSchools() }, [loadSchools])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [search, filterSchool, sortBy, sortOrder])

  useEffect(() => { load() }, [load])

  // Column sort click handler
  function handleHeaderSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Header checkbox indeterminate state
  const visibleIds = students.map((s) => s.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const next = new Set(selectedIds)
      visibleIds.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      visibleIds.forEach((id) => next.add(id))
      setSelectedIds(next)
    }
  }

  function toggleSelectOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Toggle single group collapse
  function toggleGroup(code: string) {
    const next = new Set(expandedCodes)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    setExpandedCodes(next)
  }

  // Toggle select all in a group
  function toggleSelectGroup(groupStudents: StudentWithCount[]) {
    const groupIds = groupStudents.map((s) => s.id)
    const allInGroupSelected = groupIds.every((id) => selectedIds.has(id))
    const next = new Set(selectedIds)

    if (allInGroupSelected) {
      groupIds.forEach((id) => next.delete(id))
    } else {
      groupIds.forEach((id) => next.add(id))
    }
    setSelectedIds(next)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error(`Gagal menghapus siswa: ${error.message}`)
    } else {
      toast.success('Data siswa berhasil dihapus')
      const next = new Set(selectedIds)
      next.delete(deleteTarget.id)
      setSelectedIds(next)
      setDeleteTarget(null)
      load()
      loadSchools()
    }
    setDeleting(false)
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setDeleting(true)
    const ids = Array.from(selectedIds)

    const BATCH_SIZE = 50
    let hasError = false
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', batch)
      if (error) {
        hasError = true
        toast.error(`Gagal menghapus sebagian siswa: ${error.message}`)
        break
      }
    }

    if (!hasError) {
      toast.success(`${ids.length} siswa berhasil dihapus`)
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      load()
      loadSchools()
    }
    setDeleting(false)
  }

  // Group students by access code
  const groupedData: GroupedCode[] = React.useMemo(() => {
    const map = new Map<string, GroupedCode>()
    students.forEach((s) => {
      const codeKey = s.latest_code || 'Tanpa Kode Akses'
      if (!map.has(codeKey)) {
        map.set(codeKey, {
          code: codeKey,
          examTitle: s.latest_exam || '-',
          students: [],
        })
      }
      map.get(codeKey)!.students.push(s)
    })
    return Array.from(map.values())
  }, [students])

  function renderSortIcon(field: SortField) {
    if (sortBy !== field) {
      return <span className="text-gray-300 ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
    }
    return <span className="text-primary-600 ml-1 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div>
      <PageHeader
        title="Siswa"
        description={`${total.toLocaleString('id-ID')} siswa terdaftar`}
        actions={
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Daftar Tabel
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white text-primary-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Grup Kode Akses
            </button>
          </div>
        }
      />

      {/* Bulk Action Bar (Gmail style) */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium text-primary-900">
              siswa terpilih
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              onClick={() => setShowBulkDeleteConfirm(true)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              Hapus {selectedIds.size} Siswa
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, NIS, sekolah, kelas..."
          className="flex-1"
        />

        <Select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          options={schoolsList.map((s) => ({ value: s, label: s }))}
          placeholder="Semua Sekolah"
          className="w-full sm:w-48"
        />

        <Select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-') as [SortField, SortOrder]
            setSortBy(field)
            setSortOrder(order)
          }}
          options={[
            { value: 'created_at-desc', label: 'Terdaftar: Terbaru' },
            { value: 'created_at-asc', label: 'Terdaftar: Terlama' },
            { value: 'full_name-asc', label: 'Nama: A → Z' },
            { value: 'full_name-desc', label: 'Nama: Z → A' },
            { value: 'school-asc', label: 'Sekolah: A → Z' },
            { value: 'school-desc', label: 'Sekolah: Z → A' },
            { value: 'class-asc', label: 'Kelas: A → Z' },
            { value: 'class-desc', label: 'Kelas: Z → A' },
          ]}
          className="w-full sm:w-52"
        />
      </div>

      {/* VIEW MODE 1: GROUPED BY ACCESS CODE (COLLAPSIBLE) */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border p-6">
              <TableSkeleton rows={4} cols={6} />
            </div>
          ) : groupedData.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Belum ada data siswa
            </div>
          ) : (
            groupedData.map((group) => {
              const isExpanded = expandedCodes.has(group.code)
              const groupIds = group.students.map((s) => s.id)
              const allInGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id))
              const someInGroupSelected = groupIds.some((id) => selectedIds.has(id)) && !allInGroupSelected

              return (
                <div
                  key={group.code}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Collapsible Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer select-none transition-colors border-b border-gray-100"
                    onClick={() => toggleGroup(group.code)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Group Checkbox */}
                      <input
                        type="checkbox"
                        checked={allInGroupSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someInGroupSelected
                        }}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelectGroup(group.students)
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        title="Pilih semua siswa di grup ini"
                      />

                      <button
                        type="button"
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-transform"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-primary-600' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm bg-primary-100 text-primary-800 px-2.5 py-1 rounded-lg border border-primary-200">
                          {group.code}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {group.examTitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">
                        {group.students.length} Siswa
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      <Table>
                        <TableHead>
                          <TableRow className="bg-gray-50/40 text-xs">
                            <TableHeader className="w-10"></TableHeader>
                            <TableHeader>Nama Siswa</TableHeader>
                            <TableHeader>Sekolah</TableHeader>
                            <TableHeader>Kelas</TableHeader>
                            <TableHeader>NIS</TableHeader>
                            <TableHeader>Email</TableHeader>
                            <TableHeader>Nilai Terakhir</TableHeader>
                            <TableHeader>Terdaftar</TableHeader>
                            <TableHeader className="w-16">Aksi</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.students.map((s) => {
                            const isSelected = selectedIds.has(s.id)
                            return (
                              <TableRow
                                key={s.id}
                                className={isSelected ? 'bg-primary-50/40 hover:bg-primary-50/60' : undefined}
                              >
                                <TableCell className="w-10">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectOne(s.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                  />
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium text-gray-900 text-sm">{s.full_name}</span>
                                </TableCell>
                                <TableCell className="text-gray-600 text-xs">{s.school}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                                    {s.class}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.nis}</code>
                                </TableCell>
                                <TableCell className="text-gray-500 text-xs">{s.email ?? '-'}</TableCell>
                                <TableCell>
                                  {s.latest_score !== null && s.latest_score !== undefined ? (
                                    <span className="font-bold text-gray-900 text-sm">
                                      {s.latest_score}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">{formatDate(s.created_at)}</TableCell>
                                <TableCell>
                                  <button
                                    onClick={() => setDeleteTarget(s)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Hapus Siswa"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* VIEW MODE 2: STANDARD TABLE */
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-10">
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  title="Pilih semua di halaman ini"
                />
              </TableHeader>
              <TableHeader>
                <button
                  type="button"
                  onClick={() => handleHeaderSort('full_name')}
                  className="group flex items-center font-semibold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wider"
                >
                  Nama {renderSortIcon('full_name')}
                </button>
              </TableHeader>
              <TableHeader>
                <button
                  type="button"
                  onClick={() => handleHeaderSort('school')}
                  className="group flex items-center font-semibold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wider"
                >
                  Sekolah {renderSortIcon('school')}
                </button>
              </TableHeader>
              <TableHeader>
                <button
                  type="button"
                  onClick={() => handleHeaderSort('class')}
                  className="group flex items-center font-semibold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wider"
                >
                  Kelas {renderSortIcon('class')}
                </button>
              </TableHeader>
              <TableHeader>NIS/NISN</TableHeader>
              <TableHeader>Kode Akses</TableHeader>
              <TableHeader>Percobaan</TableHeader>
              <TableHeader>
                <button
                  type="button"
                  onClick={() => handleHeaderSort('created_at')}
                  className="group flex items-center font-semibold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wider"
                >
                  Terdaftar {renderSortIcon('created_at')}
                </button>
              </TableHeader>
              <TableHeader className="w-20">Aksi</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} cols={9} />
            ) : students.length === 0 ? (
              <TableEmpty colSpan={9} message="Belum ada data siswa" />
            ) : (
              students.map((s) => {
                const isSelected = selectedIds.has(s.id)
                return (
                  <TableRow
                    key={s.id}
                    className={isSelected ? 'bg-primary-50/40 hover:bg-primary-50/60' : undefined}
                  >
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(s.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{s.full_name}</span>
                    </TableCell>
                    <TableCell className="text-gray-600">{s.school}</TableCell>
                    <TableCell className="text-gray-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                        {s.class}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.nis}</code>
                    </TableCell>
                    <TableCell>
                      {s.latest_code && s.latest_code !== 'Belum ada kode' ? (
                        <span className="font-mono text-xs font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-200">
                          {s.latest_code}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-700">{s.attempt_count}</span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">{formatDate(s.created_at)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Siswa"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}

      {/* Single Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Siswa"
        message={`Hapus data siswa "${deleteTarget?.full_name}"? Semua riwayat ujian siswa ini juga akan ikut terhapus.`}
        confirmLabel="Hapus Siswa"
        loading={deleting}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Siswa Terpilih`}
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.size} siswa yang dipilih beserta riwayat ujian mereka? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={`Hapus ${selectedIds.size} Siswa`}
        loading={deleting}
      />
    </div>
  )
}
