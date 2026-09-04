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

// ─── Download helpers ──────────────────────────────────────────────────────
async function downloadAsPng(element: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 794, // A4-ish width in px at 96dpi
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
    windowWidth: 794,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdfWidth = 210 // A4 mm
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageHeight = pdf.internal.pageSize.getHeight()

  let yOffset = 0
  while (yOffset < pdfHeight) {
    pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight)
    yOffset += pageHeight
    if (yOffset < pdfHeight) pdf.addPage()
  }

  pdf.save(filename)
}

// ─── Hidden printable document (full: summary + every Q&A) ────────────────
function PrintDocument({
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

  const hasAnswers = result.show_explanations && result.answers && result.answers.length > 0

  return (
    <div
      ref={printRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '794px',           // ~A4 at 96dpi
        background: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '13px',
        color: '#111827',
        padding: '32px',
        boxSizing: 'border-box',
      }}
      aria-hidden="true"
    >
      {/* ── HEADER BANNER ── */}
      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
        background: passed ? 'linear-gradient(135deg,#16a34a,#059669)' : 'linear-gradient(135deg,#dc2626,#e11d48)',
      }}>
        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Hasil Tryout
          </p>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {result.exam_title}
          </h1>
        </div>
      </div>

      {/* ── SCORE + STATS ── */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
        {/* Score circle */}
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%',
          border: `4px solid ${passed ? '#4ade80' : '#f87171'}`,
          background: passed ? '#f0fdf4' : '#fff1f2',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '36px', fontWeight: 900, color: passed ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
            {Math.round(result.score ?? 0)}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>dari 100</span>
        </div>

        <div style={{ flex: 1 }}>
          {/* Pass/fail badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 14px', borderRadius: '999px',
            background: passed ? '#dcfce7' : '#fee2e2',
            color: passed ? '#15803d' : '#b91c1c',
            fontWeight: 700, fontSize: '13px', marginBottom: '12px',
          }}>
            {passed ? '✓ LULUS' : '✗ TIDAK LULUS'}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {[
              { label: 'Benar', value: result.correct_count, bg: '#f0fdf4', color: '#15803d' },
              { label: 'Salah', value: result.wrong_count, bg: '#fff1f2', color: '#b91c1c' },
              { label: 'Kosong', value: result.unanswered_count, bg: '#f9fafb', color: '#6b7280' },
              { label: 'Nilai Lulus', value: `${result.passing_score}%`, bg: '#eff6ff', color: '#1d4ed8' },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── META ROW ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '11px', color: '#9ca3af',
        borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6',
        padding: '8px 0', marginBottom: '16px',
      }}>
        <span>{result.total_questions} soal</span>
        <span>Waktu: {formatDuration(result.time_used_seconds)}</span>
        <span>{submittedDate}</span>
      </div>

      {/* ── STUDENT INFO ── */}
      <div style={{
        background: '#f9fafb', border: '1px solid #e5e7eb',
        borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
      }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
          {result.student?.full_name}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
          <span>🏫 {result.student?.school}</span>
          <span>📚 Kelas {result.student?.class}</span>
          <span>🪪 NIS: {result.student?.nis}</span>
        </div>
      </div>

      {/* ── QUESTIONS & ANSWERS ── */}
      {hasAnswers && (
        <>
          <div style={{
            fontSize: '14px', fontWeight: 700, color: '#111827',
            borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px',
          }}>
            Tinjauan Jawaban ({result.answers!.length} soal)
          </div>

          {result.answers!.map((a) => {
            const isUnanswered = a.selected_answer === null
            const isCorrect = a.is_correct === true
            const borderColor = isUnanswered ? '#e5e7eb' : isCorrect ? '#86efac' : '#fca5a5'
            const bgColor = isUnanswered ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff1f2'
            const statusLabel = isUnanswered ? 'Tidak Dijawab' : isCorrect ? 'Benar ✓' : 'Salah ✗'
            const statusColor = isUnanswered ? '#6b7280' : isCorrect ? '#15803d' : '#b91c1c'
            const statusBg = isUnanswered ? '#f3f4f6' : isCorrect ? '#dcfce7' : '#fee2e2'

            return (
              <div key={a.question_id} style={{
                border: `1.5px solid ${borderColor}`,
                background: bgColor,
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '12px',
                pageBreakInside: 'avoid',
              }}>
                {/* Question header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>
                    Soal {a.index}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    padding: '2px 10px', borderRadius: '999px',
                    background: statusBg, color: statusColor,
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Question text */}
                <p style={{ fontWeight: 600, color: '#111827', marginBottom: '10px', lineHeight: 1.5 }}>
                  {a.question}
                </p>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                  {a.options.map((opt) => {
                    const isSel = a.selected_answer === opt.key
                    const isCorr = a.correct_answer === opt.key
                    const optBg = isCorr ? '#dcfce7' : isSel && !isCorr ? '#fee2e2' : '#fff'
                    const optBorder = isCorr ? '#4ade80' : isSel && !isCorr ? '#f87171' : '#e5e7eb'
                    const optColor = isCorr ? '#15803d' : isSel && !isCorr ? '#b91c1c' : '#374151'
                    const circBg = isCorr ? '#16a34a' : isSel && !isCorr ? '#ef4444' : '#e5e7eb'
                    const circColor = isCorr || (isSel && !isCorr) ? '#fff' : '#6b7280'
                    return (
                      <div key={opt.key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        background: optBg, border: `1px solid ${optBorder}`,
                        borderRadius: '7px', padding: '7px 10px',
                      }}>
                        <span style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: circBg, color: circColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {opt.key}
                        </span>
                        <span style={{ color: optColor, fontWeight: isCorr ? 600 : 400, fontSize: '12px', lineHeight: 1.4 }}>
                          {opt.text}
                        </span>
                        {isCorr && (
                          <span style={{ marginLeft: 'auto', color: '#16a34a', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>✓</span>
                        )}
                        {isSel && !isCorr && (
                          <span style={{ marginLeft: 'auto', color: '#ef4444', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>✗</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Your answer vs correct (only when wrong) */}
                {!isUnanswered && !isCorrect && (
                  <div style={{ display: 'flex', gap: '20px', fontSize: '11px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ color: '#9ca3af' }}>Jawaban kamu</div>
                      <div style={{ fontWeight: 700, color: '#dc2626' }}>{a.selected_answer}</div>
                    </div>
                    <div>
                      <div style={{ color: '#9ca3af' }}>Jawaban benar</div>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>{a.correct_answer}</div>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '7px', padding: '8px 12px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '3px' }}>
                    Penjelasan
                  </div>
                  <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5 }}>
                    {a.explanation}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: 'center', fontSize: '10px', color: '#d1d5db',
        marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #f3f4f6',
      }}>
        Platform Tryout Online
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
        toast.success('Hasil & soal berhasil diunduh sebagai PNG!')
      } else {
        await downloadAsPdf(printRef.current, `${filename}.pdf`)
        toast.success('Hasil & soal berhasil diunduh sebagai PDF!')
      }
    } catch {
      toast.error('Gagal mengunduh. Coba lagi.')
    }
    setDownloading(null)
  }

  const hasAnswers = result.show_explanations && result.answers && result.answers.length > 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-center">
        Unduh Hasil
      </p>
      <p className="text-xs text-gray-400 text-center mb-3">
        {hasAnswers
          ? 'Termasuk ringkasan nilai + semua soal & jawaban'
          : 'Ringkasan nilai dan data peserta'}
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
            <p className="text-xs text-violet-500">Gambar panjang</p>
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
            <p className="text-xs text-rose-500">Multi-halaman</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Score card shown on-screen ────────────────────────────────────────────
function ResultCard({ result }: { result: ResultData }) {
  const passed = result.passed
  const submittedDate = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '-'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      <div className={cn(
        'px-6 py-5 text-center',
        passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
      )}>
        <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-1">Hasil Tryout</p>
        <h1 className="text-white text-lg font-bold leading-snug">{result.exam_title}</h1>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center mb-6">
          <div className={cn(
            'w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center mb-3',
            passed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
          )}>
            <span className={cn('text-4xl font-black leading-none', passed ? 'text-green-600' : 'text-red-600')}>
              {Math.round(result.score ?? 0)}
            </span>
            <span className="text-xs text-gray-400 mt-1">dari 100</span>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold',
            passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {passed ? '✓ LULUS' : '✗ TIDAK LULUS'}
          </span>
        </div>

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

        <div className="flex items-center justify-between text-xs text-gray-400 mb-5 px-1">
          <span>{result.total_questions} soal</span>
          <span>Waktu: {formatDuration(result.time_used_seconds)}</span>
          <span>{submittedDate}</span>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100">
          <p className="font-bold text-gray-800 text-base">{result.student?.full_name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-gray-500 text-xs">
            <span>🏫 {result.student?.school}</span>
            <span>📚 Kelas {result.student?.class}</span>
            <span>🪪 NIS: {result.student?.nis}</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">Platform Tryout Online</p>
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
      {/* Hidden full document (what actually gets captured for download) */}
      <PrintDocument result={result} printRef={printRef} />

      <div className="max-w-2xl mx-auto space-y-4">
        {/* On-screen score card */}
        <ResultCard result={result} />

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

        {/* On-screen answer review */}
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

// ─── On-screen answer card ─────────────────────────────────────────────────
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
            <div key={opt.key} className={cn(
              'flex items-start gap-2.5 p-2.5 rounded-lg border text-sm',
              isCorrectOpt ? 'border-green-400 bg-green-50'
              : isSelected && !isCorrectOpt ? 'border-red-400 bg-red-50'
              : 'border-gray-200 bg-white'
            )}>
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
