'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatTimer } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ExamQuestion {
  index: number
  id: string
  question: string
  image_url: string | null
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[]
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  is_flagged: boolean
}

interface AttemptInfo {
  id: string
  exam_title: string
  started_at: string
  expires_at: string
  total_questions: number
  student_name: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.id as string

  const [attempt, setAttempt] = useState<AttemptInfo | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const saveQueueRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSubmitLock = useRef(false)

  // ── Load attempt ──────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/tryout/attempt/${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'ALREADY_SUBMITTED') {
          router.replace(`/tryout/exam/${attemptId}/result`)
          return
        }
        if (data.error === 'ATTEMPT_EXPIRED') {
          handleAutoSubmit()
          return
        }
        if (data.error) { setError(data.error); setLoading(false); return }
        setAttempt(data.attempt)
        setQuestions(data.questions)
        const secs = Math.max(
          0,
          Math.floor((new Date(data.attempt.expires_at).getTime() - Date.now()) / 1000)
        )
        setSecondsLeft(secs)
        setLoading(false)
      })
  }, [attemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Server-controlled countdown ──────────────────────────
  useEffect(() => {
    if (loading || !attempt) return

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (!autoSubmitLock.current) {
            autoSubmitLock.current = true
            handleAutoSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave ──────────────────────────────────────────────
  const saveAnswer = useCallback(
    async (questionId: string, selectedAnswer: 'A' | 'B' | 'C' | 'D' | null, isFlagged: boolean) => {
      setSaveStatus('saving')
      try {
        const res = await fetch(`/api/tryout/attempt/${attemptId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_flagged: isFlagged,
          }),
        })
        if (res.status === 409) {
          router.replace(`/tryout/exam/${attemptId}/result`)
          return
        }
        if (res.status === 410) {
          handleAutoSubmit()
          return
        }
        setSaveStatus(res.ok ? 'saved' : 'error')
      } catch {
        setSaveStatus('error')
      }
    },
    [attemptId, router] // eslint-disable-line react-hooks/exhaustive-deps
  )

  function scheduleAutoSave(questionId: string, answer: 'A' | 'B' | 'C' | 'D' | null, flagged: boolean) {
    // Debounce: cancel previous save for this question
    const existing = saveQueueRef.current.get(questionId)
    if (existing) clearTimeout(existing)
    const t = setTimeout(() => {
      saveAnswer(questionId, answer, flagged)
      saveQueueRef.current.delete(questionId)
    }, 400)
    saveQueueRef.current.set(questionId, t)
  }

  // ── Select answer ─────────────────────────────────────────
  function selectAnswer(optionKey: 'A' | 'B' | 'C' | 'D') {
    setQuestions((prev) => {
      const next = [...prev]
      next[current] = { ...next[current], selected_answer: optionKey }
      scheduleAutoSave(next[current].id, optionKey, next[current].is_flagged)
      return next
    })
  }

  // ── Toggle flag ───────────────────────────────────────────
  function toggleFlag() {
    setQuestions((prev) => {
      const next = [...prev]
      const q = next[current]
      const newFlag = !q.is_flagged
      next[current] = { ...q, is_flagged: newFlag }
      scheduleAutoSave(q.id, q.selected_answer, newFlag)
      return next
    })
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    setShowSubmit(false)
    const res = await fetch(`/api/tryout/attempt/${attemptId}/submit`, { method: 'POST' })
    if (res.ok) {
      router.replace(`/tryout/exam/${attemptId}/result`)
    } else {
      const d = await res.json()
      if (d.error === 'ALREADY_SUBMITTED') {
        router.replace(`/tryout/exam/${attemptId}/result`)
      }
    }
    setSubmitting(false)
  }

  async function handleAutoSubmit() {
    setAutoSubmitted(true)
    // Flush any pending saves first
    for (const [, t] of saveQueueRef.current) clearTimeout(t)
    saveQueueRef.current.clear()

    await fetch(`/api/tryout/attempt/${attemptId}/submit`, { method: 'POST' })
    setTimeout(() => router.replace(`/tryout/exam/${attemptId}/result`), 3000)
  }

  // ── Derived stats ─────────────────────────────────────────
  const answered = questions.filter((q) => q.selected_answer !== null).length
  const flagged = questions.filter((q) => q.is_flagged).length
  const unanswered = questions.length - answered
  const q = questions[current]

  const timerColor =
    secondsLeft > 300
      ? 'text-gray-700'
      : secondsLeft > 60
      ? 'text-orange-600'
      : 'text-red-600 animate-pulse'

  if (loading) return <PageLoader label="Memuat soal..." />
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button onClick={() => router.push('/tryout')} className="text-primary-600 underline text-sm">
          Kembali ke Beranda
        </button>
      </div>
    </div>
  )

  if (autoSubmitted) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-800">Waktu Habis!</p>
        <p className="text-sm text-gray-500 mt-2">Jawaban Anda sedang dikumpulkan otomatis...</p>
      </div>
    </div>
  )

  if (!q) return null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate hidden sm:block">
              {attempt?.exam_title}
            </h1>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Soal {current + 1} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Save status */}
            <span className={cn('text-xs', saveStatus === 'saving' ? 'text-gray-400' : saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'error' ? 'text-red-500' : 'text-transparent')}>
              {saveStatus === 'saving' ? '⟳ Menyimpan...' : saveStatus === 'saved' ? '✓ Tersimpan' : saveStatus === 'error' ? '✗ Gagal' : '.'}
            </span>

            {/* Timer */}
            <div className={cn('flex items-center gap-1.5 font-mono font-bold text-sm', timerColor)}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTimer(secondsLeft)}
            </div>

            <Button
              size="sm"
              onClick={() => setShowSubmit(true)}
              disabled={submitting}
              loading={submitting}
            >
              Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 flex flex-col lg:flex-row gap-5">
        {/* Question panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            {/* Question header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                  {current + 1}
                </span>
                <span className="text-xs text-gray-400">dari {questions.length}</span>
              </div>
              <button
                onClick={toggleFlag}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  q.is_flagged
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 text-gray-500 hover:border-yellow-400 hover:text-yellow-600'
                )}
              >
                <svg className="w-3.5 h-3.5" fill={q.is_flagged ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                {q.is_flagged ? 'Ditandai' : 'Tandai'}
              </button>
            </div>

            {/* Question text */}
            <p className="text-gray-900 text-base leading-relaxed mb-5">{q.question}</p>

            {/* Image */}
            {q.image_url && !imageErrors.has(q.id) && (
              <div className="relative mb-5 h-48 w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <Image
                  src={q.image_url}
                  alt="Gambar soal"
                  fill
                  className="object-contain"
                  onError={() => setImageErrors((prev) => new Set(prev).add(q.id))}
                  unoptimized
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt) => {
                const selected = q.selected_answer === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => selectAnswer(opt.key)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      selected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
                    )}
                  >
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors',
                      selected
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 text-gray-500'
                    )}>
                      {opt.key}
                    </span>
                    <span className={cn('text-sm leading-relaxed', selected ? 'text-primary-800 font-medium' : 'text-gray-700')}>
                      {opt.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>}
            >
              Sebelumnya
            </Button>
            <Button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
            >
              Selanjutnya
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Button>
          </div>
        </div>

        {/* Side panel: question navigator */}
        <aside className="w-full lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sticky top-20">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{answered}</p>
                <p className="text-xs text-gray-400">Dijawab</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-400">{unanswered}</p>
                <p className="text-xs text-gray-400">Belum</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-500">{flagged}</p>
                <p className="text-xs text-gray-400">Ditandai</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary-500 inline-block" /> Dipilih</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block" /> Ditandai</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qn, i) => (
                <button
                  key={qn.id}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-8 w-full rounded text-xs font-medium border transition-colors',
                    i === current
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : qn.is_flagged
                      ? 'border-yellow-400 bg-yellow-100 text-yellow-700'
                      : qn.selected_answer
                      ? 'border-green-400 bg-green-100 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-primary-300'
                  )}
                  aria-label={`Soal ${i + 1}`}
                  aria-current={i === current ? 'true' : undefined}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Submit button in sidebar */}
            <Button
              className="w-full mt-4"
              size="sm"
              onClick={() => setShowSubmit(true)}
              disabled={submitting}
            >
              Kumpulkan
            </Button>
          </div>
        </aside>
      </main>

      {/* Submit confirm dialog */}
      <Dialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        title="Kumpulkan Tryout?"
        size="sm"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-bold text-gray-900 text-lg">{questions.length}</p>
              <p className="text-xs text-gray-400">Total Soal</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="font-bold text-green-700 text-lg">{answered}</p>
              <p className="text-xs text-green-500">Dijawab</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="font-bold text-red-600 text-lg">{unanswered}</p>
              <p className="text-xs text-red-400">Belum</p>
            </div>
          </div>
          {unanswered > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs">
              ⚠ Masih ada {unanswered} soal yang belum dijawab.
            </div>
          )}
          <p>Yakin ingin mengumpulkan jawaban?</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowSubmit(false)}>Batal</Button>
          <Button onClick={handleSubmit} loading={submitting}>Kumpulkan</Button>
        </div>
      </Dialog>
    </div>
  )
}
