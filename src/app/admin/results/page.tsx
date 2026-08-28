'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv, formatDate, formatDuration } from '@/lib/utils'

type AttemptRow = {
  id: string
  score: number | null
  correct_count: number | null
  wrong_count: number | null
  unanswered_count: number | null
  passed: boolean | null
  submitted_at: string | null
  started_at: string
  status: string
  total_questions: number
  students: {
    full_name: string
    school: string
    class: string
    nis: string
  }
  exams: { title: string }
}

const PAGE_SIZE = 25

export default function ResultsPage() {
  const supabase = createClient()

  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [exams, setExams] = useState<{ id: string; title: string }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [filterResult, setFilterResult] = useState('')
  const [filterSchool, setFilterSchool] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('attempts')
      .select(`
        id, score, correct_count, wrong_count, unanswered_count,
        passed, submitted_at, started_at, status, total_questions,
        students(full_name, school, class, nis),
        exams(title)
      `, { count: 'exact' })
      .eq('status', 'submitted')

    if (filterExam) query = query.eq('exam_id', filterExam)
    if (filterResult === 'passed') query = query.eq('passed', true)
    if (filterResult === 'failed') query = query.eq('passed', false)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query
      .order('submitted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    let rows = (data as AttemptRow[]) ?? []

    // Client-side filter for search & school (names aren't indexed)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.students?.full_name?.toLowerCase().includes(q) ||
          r.students?.nis?.toLowerCase().includes(q)
      )
    }
    if (filterSchool) {
      rows = rows.filter((r) =>
        r.students?.school?.toLowerCase().includes(filterSchool.toLowerCase())
      )
    }

    setAttempts(rows)
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, filterExam, filterResult, search, filterSchool, page])

  useEffect(() => {
    supabase.from('exams').select('id,title').eq('status', 'active').order('title')
      .then(({ data }) => setExams(data ?? []))
  }, [supabase])

  useEffect(() => { setPage(1) }, [search, filterExam, filterResult, filterSchool])
  useEffect(() => { load() }, [load])

  function handleExport() {
    if (attempts.length === 0) { toast.error('Tidak ada data'); return }
    const header = 'nama,sekolah,kelas,nis,tryout,nilai,benar,salah,tidak_dijawab,waktu,lulus,submit_at'
    const rows = attempts.map((a) => {
      const duration = a.submitted_at
        ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
        : 0
      return [
        `"${a.students?.full_name ?? ''}"`,
        `"${a.students?.school ?? ''}"`,
        `"${a.students?.class ?? ''}"`,
        a.students?.nis ?? '',
        `"${a.exams?.title ?? ''}"`,
        a.score ?? '',
        a.correct_count ?? '',
        a.wrong_count ?? '',
        a.unanswered_count ?? '',
        formatDuration(duration),
        a.passed ? 'Lulus' : 'Tidak Lulus',
        a.submitted_at ? formatDate(a.submitted_at) : '',
      ].join(',')
    })
    downloadCsv([header, ...rows].join('\n'), 'hasil-tryout.csv')
  }

  function durationLabel(a: AttemptRow) {
    if (!a.submitted_at) return '-'
    const secs = Math.round(
      (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000
    )
    return formatDuration(secs)
  }

  return (
    <div>
      <PageHeader
        title="Hasil Tryout"
        description={`${total.toLocaleString('id-ID')} percobaan selesai`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
            Ekspor CSV
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / NIS..." className="flex-1 min-w-0" />
        <SearchInput value={filterSchool} onChange={setFilterSchool} placeholder="Filter sekolah..." className="w-full sm:w-44" />
        <Select
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
          options={exams.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Semua Tryout"
          className="w-full sm:w-52"
        />
        <Select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          options={[
            { value: 'passed', label: 'Lulus' },
            { value: 'failed', label: 'Tidak Lulus' },
          ]}
          placeholder="Semua Hasil"
          className="w-full sm:w-36"
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Siswa</TableHeader>
            <TableHeader>Tryout</TableHeader>
            <TableHeader>Nilai</TableHeader>
            <TableHeader>Benar</TableHeader>
            <TableHeader>Salah</TableHeader>
            <TableHeader>Tdk Jwb</TableHeader>
            <TableHeader>Waktu</TableHeader>
            <TableHeader>Hasil</TableHeader>
            <TableHeader>Submit</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={6} cols={9} />
          ) : attempts.length === 0 ? (
            <TableEmpty colSpan={9} message="Belum ada hasil" />
          ) : (
            attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.students?.full_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {a.students?.school} · {a.students?.class} · {a.students?.nis}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 max-w-[160px]">
                    {a.exams?.title}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-base font-bold text-gray-900 dark:text-white">{a.score ?? '-'}%</span>
                </TableCell>
                <TableCell className="text-green-700 dark:text-green-400 font-medium">{a.correct_count ?? '-'}</TableCell>
                <TableCell className="text-red-600 dark:text-red-400 font-medium">{a.wrong_count ?? '-'}</TableCell>
                <TableCell className="text-gray-500 dark:text-gray-400">{a.unanswered_count ?? '-'}</TableCell>
                <TableCell className="text-xs text-gray-500 dark:text-gray-400">{durationLabel(a)}</TableCell>
                <TableCell>
                  <Badge variant={a.passed ? 'success' : 'danger'}>
                    {a.passed ? 'Lulus' : 'Tidak Lulus'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-400 dark:text-gray-500">{formatDate(a.submitted_at)}</TableCell>
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
