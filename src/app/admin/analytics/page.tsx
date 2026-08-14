'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/LoadingSpinner'

type OverallStats = {
  total_questions: number
  total_exams: number
  total_students: number
  total_attempts: number
  avg_score: number
  pass_rate: number
}

type ExamStats = {
  avg_score: number | null
  highest_score: number | null
  lowest_score: number | null
  pass_rate: number | null
  avg_duration_minutes: number | null
  total_attempts: number
  question_stats: {
    order_index: number
    question_id: string
    question_preview: string
    total_answers: number
    correct_answers: number
    correct_percentage: number | null
  }[]
}

export default function AnalyticsPage() {
  const supabase = createClient()

  const [overallStats, setOverallStats] = useState<OverallStats | null>(null)
  const [exams, setExams] = useState<{ id: string; title: string }[]>([])
  const [selectedExam, setSelectedExam] = useState('')
  const [examStats, setExamStats] = useState<ExamStats | null>(null)
  const [loadingOverall, setLoadingOverall] = useState(true)
  const [loadingExam, setLoadingExam] = useState(false)

  useEffect(() => {
    async function loadOverall() {
      const [
        { count: questions },
        { count: examsCount },
        { count: students },
        { count: attempts },
      ] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      ])

      const { data: scoreData } = await supabase
        .from('attempts')
        .select('score, passed')
        .eq('status', 'submitted')
        .not('score', 'is', null)

      const avg_score =
        scoreData && scoreData.length > 0
          ? Math.round(scoreData.reduce((acc, a) => acc + (a.score ?? 0), 0) / scoreData.length)
          : 0
      const pass_rate =
        scoreData && scoreData.length > 0
          ? Math.round((scoreData.filter((a) => a.passed).length / scoreData.length) * 100)
          : 0

      setOverallStats({
        total_questions: questions ?? 0,
        total_exams: examsCount ?? 0,
        total_students: students ?? 0,
        total_attempts: attempts ?? 0,
        avg_score,
        pass_rate,
      })
      setLoadingOverall(false)
    }

    async function loadExams() {
      const { data } = await supabase
        .from('exams')
        .select('id,title')
        .order('title')
      setExams(data ?? [])
    }

    loadOverall()
    loadExams()
  }, [supabase])

  const loadExamStats = useCallback(async (examId: string) => {
    if (!examId) { setExamStats(null); return }
    setLoadingExam(true)

    const { data } = await supabase.rpc('get_exam_analytics', { p_exam_id: examId })
    setExamStats(data as ExamStats)
    setLoadingExam(false)
  }, [supabase])

  useEffect(() => { loadExamStats(selectedExam) }, [selectedExam, loadExamStats])

  function difficultyBar(pct: number | null) {
    const p = pct ?? 0
    let color = 'bg-green-400'
    if (p < 40) color = 'bg-red-400'
    else if (p < 70) color = 'bg-yellow-400'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">{p}%</span>
      </div>
    )
  }

  if (loadingOverall) return <PageLoader label="Memuat analitik..." />

  const sortedByDifficulty = examStats?.question_stats
    ? [...examStats.question_stats].sort((a, b) => (a.correct_percentage ?? 100) - (b.correct_percentage ?? 100))
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Analitik" description="Statistik platform tryout" />

      {/* Overall stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Platform</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Soal" value={(overallStats?.total_questions ?? 0).toLocaleString('id-ID')} color="blue"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Total Tryout" value={(overallStats?.total_exams ?? 0).toLocaleString('id-ID')} color="purple"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
          <StatCard label="Total Siswa" value={(overallStats?.total_students ?? 0).toLocaleString('id-ID')} color="green"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard label="Percobaan Selesai" value={(overallStats?.total_attempts ?? 0).toLocaleString('id-ID')} color="yellow"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Rata-rata Nilai" value={`${overallStats?.avg_score ?? 0}%`} color="blue"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          />
          <StatCard label="Tingkat Kelulusan" value={`${overallStats?.pass_rate ?? 0}%`} color="green"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
        </div>
      </div>

      {/* Per-tryout analytics */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Analitik Per Tryout</h2>
        <Select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          options={exams.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Pilih tryout..."
          className="mb-4 max-w-sm"
        />

        {!selectedExam && (
          <div className="py-10 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
            Pilih tryout untuk melihat analitik detail
          </div>
        )}

        {loadingExam && (
          <div className="py-10 text-center text-sm text-gray-400">Memuat...</div>
        )}

        {!loadingExam && examStats && selectedExam && (
          <div className="space-y-5">
            {/* Exam summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Total Percobaan', value: examStats.total_attempts, unit: '' },
                { label: 'Rata-rata Nilai', value: examStats.avg_score ?? '-', unit: '%' },
                { label: 'Nilai Tertinggi', value: examStats.highest_score ?? '-', unit: '%' },
                { label: 'Nilai Terendah', value: examStats.lowest_score ?? '-', unit: '%' },
                { label: 'Tingkat Lulus', value: examStats.pass_rate ?? '-', unit: '%' },
              ].map((item) => (
                <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">
                    {item.value}{item.unit}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Question analysis */}
            {examStats.question_stats && examStats.question_stats.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Analisis Per Soal</h3>
                  <span className="text-xs text-gray-400">{examStats.question_stats.length} soal</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto scrollbar-thin">
                  {examStats.question_stats.map((qs) => (
                    <div key={qs.question_id} className="px-5 py-3 flex items-center gap-4">
                      <span className="w-8 text-xs font-bold text-gray-400 flex-shrink-0">
                        #{qs.order_index}
                      </span>
                      <p className="text-sm text-gray-700 flex-1 truncate" title={qs.question_preview}>
                        {qs.question_preview}
                      </p>
                      <div className="w-40 flex-shrink-0">
                        {difficultyBar(qs.correct_percentage)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Most difficult questions */}
                {sortedByDifficulty.length > 0 && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-red-50">
                    <p className="text-xs font-semibold text-red-700 mb-2">
                      3 Soal Paling Sulit
                    </p>
                    <div className="space-y-1">
                      {sortedByDifficulty.slice(0, 3).map((qs) => (
                        <div key={qs.question_id} className="flex items-center gap-2 text-xs text-red-700">
                          <span className="font-bold">#{qs.order_index}</span>
                          <span className="flex-1 truncate">{qs.question_preview}</span>
                          <span className="font-bold">{qs.correct_percentage ?? 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
