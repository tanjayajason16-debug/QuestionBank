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
    <div className="space-y-4 text-gray-900 dark:text-gray-100">
      <div className="flex items-center gap-2 flex-wrap">
        <DifficultyBadge difficulty={question.difficulty} />
        <span className="text-xs text-gray-500 dark:text-gray-400">Kelas {question.grade}</span>
        {question.categories && (
          <span className="text-xs bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
            {question.categories.name}
          </span>
        )}
      </div>

      <p className="text-gray-900 dark:text-white font-medium leading-relaxed">{question.question}</p>

      {question.image_url && (
        <div className="relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
            className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors ${
              i === correctIndex
                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/40'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === correctIndex
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {OPTION_LABELS[i]}
            </span>
            <span className={i === correctIndex ? 'text-green-800 dark:text-green-300 font-medium' : 'text-gray-700 dark:text-gray-300'}>
              {opt}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Penjelasan:</p>
        <p className="text-sm text-amber-800 dark:text-amber-200">{question.explanation}</p>
      </div>
    </div>
  )
}
