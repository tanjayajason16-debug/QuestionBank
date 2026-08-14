'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import type { Student } from '@/types/database'

type StudentWithCount = Student & { attempt_count: number }

const PAGE_SIZE = 25

export default function StudentsPage() {
  const supabase = createClient()

  const [students, setStudents] = useState<StudentWithCount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,nis.ilike.%${search}%,school.ilike.%${search}%`
      )
    }

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query
      .order('created_at', { ascending: false })
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
  }, [supabase, search, page])

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader
        title="Siswa"
        description={`${total.toLocaleString('id-ID')} siswa terdaftar`}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, NIS, atau sekolah..." className="max-w-sm" />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Nama</TableHeader>
            <TableHeader>Sekolah</TableHeader>
            <TableHeader>Kelas</TableHeader>
            <TableHeader>NIS/NISN</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Percobaan</TableHeader>
            <TableHeader>Terdaftar</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : students.length === 0 ? (
            <TableEmpty colSpan={7} message="Belum ada siswa" />
          ) : (
            students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <span className="font-medium text-gray-900">{s.full_name}</span>
                </TableCell>
                <TableCell className="text-gray-600">{s.school}</TableCell>
                <TableCell className="text-gray-600">{s.class}</TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.nis}</code>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{s.email ?? '-'}</TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-gray-700">{s.attempt_count}</span>
                </TableCell>
                <TableCell className="text-xs text-gray-400">{formatDate(s.created_at)}</TableCell>
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
    </div>
  )
}
