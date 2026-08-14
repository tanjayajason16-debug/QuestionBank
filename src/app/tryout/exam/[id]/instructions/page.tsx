'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatTimer } from '@/lib/utils'

interface AttemptInfo {
  exam_title: string
  total_questions: number
  expires_at: string
  student_name: string
}

export default function InstructionsPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.id as string

  const [info, setInfo] = useState<AttemptInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/tryout/attempt/${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'ALREADY_SUBMITTED') {
          router.replace(`/tryout/exam/${attemptId}/result`)
          return
        }
        if (data.error) { setError(data.error); setLoading(false); return }
        setInfo(data.attempt)
        setLoading(false)
      })
  }, [attemptId, router])

  if (loading) return <PageLoader label="Memuat..." />
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={() => router.push('/tryout')} className="mt-4 text-primary-600 underline text-sm">
          Kembali ke Beranda
        </button>
      </div>
    </div>
  )

  const durationSeconds = info
    ? Math.max(0, Math.floor((new Date(info.expires_at).getTime() - Date.now()) / 1000))
    : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-primary-600 px-6 py-5 text-white">
            <h1 className="text-xl font-bold">{info?.exam_title}</h1>
            <p className="text-primary-100 text-sm mt-1">Halo, {info?.student_name}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{info?.total_questions}</p>
                <p className="text-xs text-blue-600 mt-1">Jumlah Soal</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{formatTimer(durationSeconds)}</p>
                <p className="text-xs text-orange-500 mt-1">Sisa Waktu</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-800">Petunjuk Ujian</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Bacalah setiap soal dengan teliti sebelum menjawab.',
                  'Pilih satu jawaban yang paling tepat untuk setiap soal.',
                  'Jawaban otomatis tersimpan saat Anda memilih opsi.',
                  'Anda dapat menandai soal untuk ditinjau kembali.',
                  'Pastikan semua soal terjawab sebelum submit.',
                  'Ujian otomatis dikumpulkan saat waktu habis.',
                  'Jangan menutup tab atau browser selama ujian.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push(`/tryout/exam/${attemptId}`)}
            >
              Mulai Ujian
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
