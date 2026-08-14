import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatCard } from '@/components/ui/Card'
import { PageHeader } from '@/components/admin/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getStats() {
  const db = createAdminClient()

  const [
    { count: questions },
    { count: exams },
    { count: students },
    { count: attempts },
  ] = await Promise.all([
    db.from('questions').select('*', { count: 'exact', head: true }),
    db.from('exams').select('*', { count: 'exact', head: true }),
    db.from('students').select('*', { count: 'exact', head: true }),
    db.from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
  ])

  const { data: scoreData } = await db
    .from('attempts')
    .select('score, passed')
    .eq('status', 'submitted')
    .not('score', 'is', null)

  const avgScore =
    scoreData && scoreData.length > 0
      ? Math.round(scoreData.reduce((acc, a) => acc + (a.score ?? 0), 0) / scoreData.length)
      : 0

  const passRate =
    scoreData && scoreData.length > 0
      ? Math.round((scoreData.filter((a) => a.passed).length / scoreData.length) * 100)
      : 0

  return {
    questions: questions ?? 0,
    exams: exams ?? 0,
    students: students ?? 0,
    attempts: attempts ?? 0,
    avgScore,
    passRate,
  }
}

async function getRecentAttempts() {
  const db = createAdminClient()
  const { data } = await db
    .from('attempts')
    .select(`
      id, score, passed, submitted_at, status,
      students ( full_name, school, class ),
      exams ( title )
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(10)

  return data ?? []
}

export default async function AdminDashboard() {
  const [stats, recentAttempts] = await Promise.all([getStats(), getRecentAttempts()])

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan platform tryout" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Soal"
          value={stats.questions.toLocaleString('id-ID')}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Tryout"
          value={stats.exams.toLocaleString('id-ID')}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Total Siswa"
          value={stats.students.toLocaleString('id-ID')}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Percobaan Selesai"
          value={stats.attempts.toLocaleString('id-ID')}
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Rata-rata Nilai"
          value={`${stats.avgScore}%`}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label="Tingkat Kelulusan"
          value={`${stats.passRate}%`}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Recent Attempts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Percobaan Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          {recentAttempts.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Belum ada percobaan
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Siswa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tryout</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nilai</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAttempts.map((attempt: any) => (
                  <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{attempt.students?.full_name}</p>
                        <p className="text-xs text-gray-400">{attempt.students?.school} · {attempt.students?.class}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{attempt.exams?.title}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{attempt.score ?? '-'}%</td>
                    <td className="px-4 py-3">
                      <Badge variant={attempt.passed ? 'success' : 'danger'}>
                        {attempt.passed ? 'Lulus' : 'Tidak Lulus'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(attempt.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
