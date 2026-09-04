'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'

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

// ─── Download helpers (lazy-loaded so bundle stays light) ──────────────────
async function downloadAsPng(element: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function downloadAsPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = 210 // A4 width mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  const pdf = new jsPDF({
    orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // If taller than one A4 page, split across pages
  const pageHeight = pdf.internal.pageSize.getHeight()
  let yOffset = 0
  while (yOffset < imgHeight) {
    pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight)
    yOffset += pageHeight
    if (yOffset < imgHeight) pdf.addPage()
  }

  pdf.save(filename)
}

// ─── Result card (also rendered as the download target) ───────────────────
function ResultCard({
  result,
  printRef,
}: {
  result: ResultData
  printRef: React.RefObject<HTMLDivElement>
}) {
  const passed = result.passed
  const submittedDate = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '-'

  return (
    <div
      ref={printRef}
      id="result-download-card"
      className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header banner */}
      <div
        className={cn(
          'px-6 py-5 text-center',
          passed
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : 'bg-gradient-to-r from-red-500 to-rose-600'
        )}
      >
        <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-1">
          Hasil Tryout
        </p>
        <h1 className="text-white text-lg font-bold leading-snug">
          {result.exam_title}
        </h1>
      </div>

      <div className="p-6">
        {/* Score circle + pass/fail */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={cn(
              'w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center mb-3',
              passed
                ? 'border-green-400 bg-green-50'
                : 'border-red-400 bg-red-50'
            )}
          >
            <span
              className={cn(
                'text-4xl font-black leading-none',
                passed ? 'text-green-600' : 'text-red-600'
              )}
            >
              {Math.round(result.score ?? 0)}
            </span>
            <span className="text-xs text-gray-400 mt-1">dari 100</span>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold',
              passed
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            {passed ? '✓ LULUS' : '✗ TIDAK LULUS'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Benar', value: result.correct_count, bg: 'bg-green-50', text: 'text-green-700' },
            { label: 'Salah', value: result.wrong_count, bg: 'bg-red-50', text: 'text-red-600' },
            { label: 'Kosong', value: result.unanswered_count, bg: 'bg-gray-50', text: 'text-gray-500' },
            { label: 'Nilai Lulus', value: `${result.passing_score}%`, bg: 'bg-blue-50', text: 'text-blue-700' },
          ].map((s) => (
            <div key={s.label} className={cn('rounded-xl p-3 text-center', s.bg)}>
              <p className={cn('text-xl font-bold', s.text)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Details row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-5 px-1">
          <span>{result.total_questions} soal</span>
          <span>Waktu: {formatDuration(result.time_used_seconds)}</span>
          <span>{submittedDate}</span>
        </div>

        {/* Student info */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100">
          <p className="font-bold text-gray-800 text-base">{result.student?.full_name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-gray-500 text-xs">
            <span>🏫 {result.student?.school}</span>
            <span>📚 Kelas {result.student?.class}</span>
            <span>🪪 NIS: {result.student?.nis}</span>
          </div>
        </div>

        {/* Footer watermark */}
        <p className="text-center text-xs text-gray-300 mt-4">
          Platform Tryout Online
        </p>
      </div>
    </div>
  )
}

// ─── Download button group ─────────────────────────────────────────────────
function DownloadButtons({
  result,
  printRef,
}: {
  result: ResultData
  printRef: React.RefObject<HTMLDivElement>
}) {
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null)

  const filename = `hasil-${result.student?.full_name?.replace(/\s+/g, '-').toLowerCase()}-${result.exam_title?.replace(/\s+/g, '-').toLowerCase()}`

  async function handleDownload(type: 'png' | 'pdf') {
    if (!printRef.current) return
    setDownloading(type)
    try {
      if (type === 'png') {
        await downloadAsPng(printRef.current, `${filename}.png`)
        toast.success('Hasil berhasil diunduh sebagai gambar PNG!')
      } else {
        await downloadAsPdf(printRef.current, `${filename}.pdf`)
        toast.success('Hasil berhasil diunduh sebagai PDF!')
      }
    } catch {
      toast.error('Gagal mengunduh. Coba lagi.')
    }
    setDownloading(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
        Unduh Hasil
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* PNG */}
        <button
          onClick={() => handleDownload('png')}
          disabled={!!downloading}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
            'border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-400',
            downloading === 'png' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
            {downloading === 'png' ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-violet-700">PNG</p>
            <p className="text-xs text-violet-500">Gambar</p>
          </div>
        </button>

        {/* PDF */}
        <button
          onClick={() => handleDownload('pdf')}
          disabled={!!downloading}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
            'border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-400',
            downloading === 'pdf' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            {downloading === 'pdf' ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-rose-700">PDF</p>
            <p className="text-xs text-rose-500">Dokumen</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.id as string
  const printRef = useRef<HTMLDivElement>(null)

  const [result, setResult] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Result card — also used as download target */}
        <ResultCard result={result} printRef={printRef} />

        {/* Download buttons */}
        <DownloadButtons result={result} printRef={printRef} />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {result.show_explanations && result.answers && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReview(!showReview)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            >
              {showReview ? 'Sembunyikan Tinjauan' : 'Tinjau Jawaban'}
            </Button>
          )}
          <Button className="flex-1" onClick={() => router.push('/tryout')}>
            Kembali ke Beranda
          </Button>
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

// ─── Answer card ───────────────────────────────────────────────────────────
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
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold text-gray-500">Soal {a.index}</span>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig.badge)}>
          {statusConfig.label}
        </span>
      </div>

      <p className="text-gray-900 text-sm leading-relaxed mb-3">{a.question}</p>

      {a.image_url && !imageError && (
        <div className="relative mb-3 h-36 w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
          <Image src={a.image_url} alt="Gambar soal" fill className="object-contain" onError={onImageError} unoptimized />
        </div>
      )}

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
                isCorrectOpt ? 'bg-green-500 text-white'
                : isSelected && !isCorrectOpt ? 'bg-red-400 text-white'
                : 'bg-gray-100 text-gray-500'
              )}>
                {opt.key}
              </span>
              <span className={cn(
                isCorrectOpt ? 'text-green-800 font-medium'
                : isSelected && !isCorrectOpt ? 'text-red-700'
                : 'text-gray-700'
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

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-700 mb-1">Penjelasan</p>
        <p className="text-xs text-amber-800 leading-relaxed">{a.explanation}</p>
      </div>
    </div>
  )
}
