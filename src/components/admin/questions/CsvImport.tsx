'use client'

import React, { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/utils'
import {
  validateHeaders,
  validateRows,
  buildInsertPayload,
  type ValidatedRow,
} from '@/lib/csv/validateImport'
import type { Category } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface CsvImportProps {
  categories: Category[]
  onImportComplete: () => void
  onCancel: () => void
}

const CSV_TEMPLATE = `category,grade,difficulty,question,image_url,option_a,option_b,option_c,option_d,correct_answer,explanation
Matematika SMP,8,medium,"Jika 2x + 5 = 15, maka nilai x adalah ...",,3,5,7,10,B,"Kurangi 5 dari kedua sisi sehingga 2x = 10. Kemudian bagi kedua sisi dengan 2 sehingga x = 5."
Bahasa Indonesia,8,easy,"Antonim dari kata 'besar' adalah ...",,tinggi,kecil,panjang,luas,B,"Kata 'kecil' merupakan lawan kata atau antonim dari 'besar'."
`

export function CsvImport({ categories, onImportComplete, onCancel }: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [headerError, setHeaderError] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; rejected: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const validRows = rows.filter((r) => r.isValid)
  const invalidRows = rows.filter((r) => !r.isValid)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Hanya file CSV yang diperbolehkan')
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const missingHeaders = validateHeaders(results.meta.fields ?? [])
        if (missingHeaders.length > 0) {
          setHeaderError(`Kolom tidak ditemukan: ${missingHeaders.join(', ')}`)
          return
        }
        setHeaderError('')
        const validated = validateRows(results.data, categories)
        setRows(validated)
        setStep('preview')
      },
      error: () => {
        toast.error('Gagal membaca file CSV')
      },
    })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)

    const payloads = validRows.map(buildInsertPayload).filter(Boolean)

    const BATCH = 100
    let imported = 0

    for (let i = 0; i < payloads.length; i += BATCH) {
      const batch = payloads.slice(i, i + BATCH)
      const { error } = await supabase.from('questions').insert(batch as any[])
      if (error) {
        toast.error(`Batch ${Math.floor(i / BATCH) + 1} gagal: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    setResult({ imported, rejected: invalidRows.length })
    setStep('done')
    setImporting(false)

    if (imported > 0) {
      toast.success(`${imported} soal berhasil diimpor`)
    }
  }

  function downloadErrorCsv() {
    const lines = [
      'row_number,errors',
      ...invalidRows.map(
        (r) => `${r.rowNumber},"${r.errors.join('; ')}"`
      ),
    ]
    downloadCsv(lines.join('\n'), 'import-errors.csv')
  }

  function downloadTemplate() {
    downloadCsv(CSV_TEMPLATE, 'template-soal.csv')
  }

  // STEP: UPLOAD
  if (step === 'upload') {
    return (
      <div className="space-y-5">
        {/* Format help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-2">Format CSV</p>
          <div className="space-y-1 text-blue-700">
            <p><code className="bg-blue-100 px-1 rounded">difficulty</code>: easy / medium / hard</p>
            <p><code className="bg-blue-100 px-1 rounded">correct_answer</code>: A / B / C / D</p>
            <p><code className="bg-blue-100 px-1 rounded">image_url</code>: opsional, kosongkan jika tidak ada</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={downloadTemplate}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          >
            Unduh Template CSV
          </Button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          aria-label="Upload file CSV"
        >
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            Seret & lepas file CSV ke sini, atau klik untuk memilih
          </p>
          <p className="text-xs text-gray-400 mt-1">Hanya file .csv</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {headerError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {headerError}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>Batal</Button>
        </div>
      </div>
    )
  }

  // STEP: PREVIEW
  if (step === 'preview') {
    return (
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
            <p className="text-xs text-green-600 mt-0.5">✓ Valid</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{invalidRows.length}</p>
            <p className="text-xs text-red-500 mt-0.5">✕ Tidak Valid</p>
          </div>
        </div>

        {/* Invalid rows */}
        {invalidRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-red-700">Baris dengan Error</p>
              <Button variant="outline" size="sm" onClick={downloadErrorCsv}>
                Unduh CSV Error
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-red-100 p-3 bg-red-50">
              {invalidRows.map((r) => (
                <div key={r.rowNumber} className="text-sm">
                  <span className="font-semibold text-red-700">Baris {r.rowNumber}:</span>
                  <ul className="mt-0.5 ml-4 list-disc text-red-600 text-xs space-y-0.5">
                    {r.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valid preview */}
        {validRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Pratinjau ({Math.min(3, validRows.length)} dari {validRows.length} baris valid)
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validRows.slice(0, 3).map((r) => (
                <div key={r.rowNumber} className="text-xs bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="font-medium text-green-800 truncate">{r.data.question}</p>
                  <p className="text-green-600 mt-0.5">
                    {r.data.category} · Kelas {r.data.grade} · {r.data.difficulty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {validRows.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Tidak ada baris valid untuk diimpor.
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => { setStep('upload'); setRows([]); if (fileRef.current) fileRef.current.value = '' }}
          >
            Kembali
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>Batal</Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={validRows.length === 0}
            >
              Impor {validRows.length} Soal
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // STEP: DONE
  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900">Impor Selesai</p>
        <p className="text-sm text-gray-500 mt-1">
          <span className="text-green-700 font-semibold">{result?.imported} soal</span> berhasil diimpor.
          {result?.rejected ? (
            <> <span className="text-red-600 font-semibold">{result.rejected} baris</span> ditolak.</>
          ) : null}
        </p>
      </div>
      <Button onClick={onImportComplete}>Selesai</Button>
    </div>
  )
}
