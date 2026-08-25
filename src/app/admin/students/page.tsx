'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { Student } from '@/types/database'

type StudentWithCount = Student & { attempt_count: number }

type SortField = 'created_at' | 'full_name' | 'school' | 'class'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE = 25

export default function StudentsPage() {
  const supabase = createClient()

  const [students, setStudents] = useState<StudentWithCount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  // Fetch unique school list for filter dropdown
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
      // Fetch attempt counts for visible students
      const ids = data.map((s) => s.id)
      const { data: counts } = await supabase
        .from('attempts')
        .select('student_id')
        .in('student_id', ids)
        .eq('status', 'submitted')

      const countMap = new Map<string, number>()
      counts?.forEach((a) => countMap.set(a.student_id, (countMap.get(a.student_id) ?? 0) + 1))

      setStudents(data.map((s) => ({ ...s, attempt_count: countMap.get(s.id) ?? 0 })))
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

  // Helper render sort arrow
  function renderSortIcon(field: SortField) {
    if (sortBy !== field) {
      return (
        <span className="text-gray-300 ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ↕
        </span>
      )
    }
    return (
      <span className="text-primary-600 ml-1 font-bold text-xs">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  return (
    <div>
      <PageHeader
        title="Siswa"
        description={`${total.toLocaleString('id-ID')} siswa terdaftar`}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
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
            <TableHeader>Email</TableHeader>
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
                  <TableCell className="text-gray-500 text-sm">{s.email ?? '-'}</TableCell>
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
