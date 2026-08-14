import React from 'react'
import { DifficultyBadge } from '@/components/ui/Badge'
import type { Question, Category } from '@/types/database'
import Image from 'next/image'

interface QuestionPreviewProps {
  question: Question & { categories?: Category }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export function QuestionPreview({ question }: QuestionPreviewProps) {
  const options = [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ]

  const correctIndex = ['A', 'B', 'C', 'D'].indexOf(question.correct_answer)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <DifficultyBadge difficulty={question.difficulty} />
        <span className="text-xs text-gray-500">Kelas {question.grade}</span>
        {question.categories && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {question.categories.name}
          </span>
        )}
      </div>

      <p className="text-gray-900 font-medium leading-relaxed">{question.question}</p>

      {question.image_url && (
        <div className="relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <Image
            src={question.image_url}
            alt="Gambar soal"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
              i === correctIndex
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === correctIndex
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {OPTION_LABELS[i]}
            </span>
            <span className={i === correctIndex ? 'text-green-800 font-medium' : 'text-gray-700'}>
              {opt}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-700 mb-1">Penjelasan:</p>
        <p className="text-sm text-amber-800">{question.explanation}</p>
      </div>
    </div>
  )
}
