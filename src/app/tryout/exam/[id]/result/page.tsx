'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AnswerReview {
  index: number
  question_id: string
  question: string
  image_url: string | null
  options: { key: string; text: string }[]
  selected_answer: string | null
  correct_answer: string
  is_correct: boolean | null
  explanation: string
}

interface ResultData {
  attempt_id: string
  exam_title: string
  score: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  total_questions: number
  passing_score: number
  passed: boolean
  submitted_at: string
  time_used_seconds: number
  show_explanations: boolean
  student: { full_name: string; school: string; class: string; nis: string }
  answers: AnswerReview[] | null
}

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.id as string

  const [result, setResult] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Poll until result is ready (in case we arrive before grading completes)
    let attempts = 0
    const poll = async () => {
      const res = await fetch(`/api/tryout/attempt/${attemptId}/result`)
      if (res.status === 400 && attempts < 5) {
        attempts++
        setTimeout(poll, 1500)
        return
      }
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Terjadi kesalahan')
        setLoading(false)
        return
      }
      const data = await res.json()
      setResult(data)
      setLoading(false)
    }
    poll()
  }, [attemptId])

  if (loading) return <PageLoader label="Memuat hasil..." />

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <Button onClick={() => router.push('/tryout')}>Kembali ke Beranda</Button>
      </div>
    </div>
  )

  if (!result) return null

  const scoreColor =
    result.passed
      ? 'text-green-600'
      : 'text-red-600'

  const scoreRing =
    result.passed
      ? 'border-green-400 bg-green-50'
      : 'border-red-400 bg-red-50'

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className={cn('px-6 py-5 text-center border-b', result.passed ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
            <p className="text-sm text-gray-500 mb-1">{result.exam_title}</p>
            <h1 className="text-lg font-bold text-gray-900">Tryout Selesai</h1>
          </div>

          <div className="p-6 text-center">
            {/* Big score circle */}
            <div className={cn('inline-flex items-center justify-center w-32 h-32 rounded-full border-4 mb-4', scoreRing)}>
              <div>
                <p className={cn('text-4xl font-black leading-none', scoreColor)}>
                  {Math.round(result.score ?? 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">dari 100</p>
              </div>
            </div>

            <div className={cn('inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-5', result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {result.passed ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> LULUS</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> TIDAK LULUS</>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Benar', value: result.correct_count, color: 'text-green-700 bg-green-50' },
                { label: 'Salah', value: result.wrong_count, color: 'text-red-600 bg-red-50' },
                { label: 'Tdk Dijawab', value: result.unanswered_count, color: 'text-gray-500 bg-gray-50' },
                { label: 'Nilai Lulus', value: `${result.passing_score}%`, color: 'text-blue-700 bg-blue-50' },
              ].map((s) => (
                <div key={s.label} className={cn('rounded-xl p-3', s.color.split(' ')[1])}>
                  <p className={cn('text-2xl font-bold', s.color.split(' ')[0])}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Time used */}
            <p className="text-xs text-gray-400 mb-5">
              Waktu: {formatDuration(result.time_used_seconds)}
            </p>

            {/* Student info */}
            <div className="text-left bg-gray-50 rounded-xl p-4 mb-5 text-sm">
              <p className="font-semibold text-gray-800">{result.student?.full_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {result.student?.school} · {result.student?.class} · {result.student?.nis}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {result.show_explanations && result.answers && (
                <Button
                  variant="outline"
                  onClick={() => setShowReview(!showReview)}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                >
                  {showReview ? 'Sembunyikan' : 'Tinjau Jawaban'}
                </Button>
              )}
              <Button onClick={() => router.push('/tryout')}>
                Kembali ke Beranda
              </Button>
            </div>
          </div>
        </div>

        {/* Answer Review */}
        {showReview && result.answers && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 px-1">Tinjauan Jawaban</h2>
            {result.answers.map((a) => (
              <AnswerCard
                key={a.question_id}
                answer={a}
                imageError={imageErrors.has(a.question_id)}
                onImageError={() => setImageErrors((prev) => new Set(prev).add(a.question_id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnswerCard({
  answer: a,
  imageError,
  onImageError,
}: {
  answer: AnswerReview
  imageError: boolean
  onImageError: () => void
}) {
  const isUnanswered = a.selected_answer === null
  const isCorrect = a.is_correct === true

  const statusConfig = isUnanswered
    ? { label: 'Tidak Dijawab', color: 'border-gray-200 bg-gray-50', badge: 'bg-gray-100 text-gray-600' }
    : isCorrect
    ? { label: 'Benar', color: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-700' }
    : { label: 'Salah', color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-600' }

  return (
    <div className={cn('rounded-xl border p-4 sm:p-5', statusConfig.color)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold text-gray-500">Soal {a.index}</span>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig.badge)}>
          {statusConfig.label}
        </span>
      </div>

      {/* Question */}
      <p className="text-gray-900 text-sm leading-relaxed mb-3">{a.question}</p>

      {/* Image */}
      {a.image_url && !imageError && (
        <div className="relative mb-3 h-36 w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
          <Image src={a.image_url} alt="Gambar soal" fill className="object-contain" onError={onImageError} unoptimized />
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 mb-3">
        {a.options.map((opt) => {
          const isSelected = a.selected_answer === opt.key
          const isCorrectOpt = a.correct_answer === opt.key
          return (
            <div
              key={opt.key}
              className={cn(
                'flex items-start gap-2.5 p-2.5 rounded-lg border text-sm',
                isCorrectOpt
                  ? 'border-green-400 bg-green-50'
                  : isSelected && !isCorrectOpt
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <span className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                isCorrectOpt
                  ? 'bg-green-500 text-white'
                  : isSelected && !isCorrectOpt
                  ? 'bg-red-400 text-white'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {opt.key}
              </span>
              <span className={cn(
                isCorrectOpt ? 'text-green-800 font-medium' : isSelected && !isCorrectOpt ? 'text-red-700' : 'text-gray-700'
              )}>
                {opt.text}
              </span>
              {isCorrectOpt && (
                <svg className="w-4 h-4 text-green-600 ml-auto flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isSelected && !isCorrectOpt && (
                <svg className="w-4 h-4 text-red-500 ml-auto flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {/* Your answer vs correct */}
      {!isUnanswered && !isCorrect && (
        <div className="flex gap-4 text-xs mb-3">
          <div>
            <p className="text-gray-400">Jawaban kamu</p>
            <p className="font-bold text-red-600">{a.selected_answer}</p>
          </div>
          <div>
            <p className="text-gray-400">Jawaban benar</p>
            <p className="font-bold text-green-600">{a.correct_answer}</p>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-700 mb-1">Penjelasan</p>
        <p className="text-xs text-amber-800 leading-relaxed">{a.explanation}</p>
      </div>
    </div>
  )
}
