import type { Category } from '@/types/database'

export interface CsvRow {
  category: string
  grade: string
  difficulty: string
  question: string
  image_url: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
}

export interface ValidatedRow {
  rowNumber: number
  data: CsvRow
  errors: string[]
  isValid: boolean
  categoryId?: string
}

export const REQUIRED_HEADERS = [
  'category',
  'grade',
  'difficulty',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
]

export const OPTIONAL_HEADERS = ['image_url']

export const ALL_HEADERS = [...REQUIRED_HEADERS, 'image_url']

export function validateHeaders(headers: string[]): string[] {
  const normalised = headers.map((h) => h.trim().toLowerCase())
  return REQUIRED_HEADERS.filter((h) => !normalised.includes(h))
}

export function validateRows(
  rows: Record<string, string>[],
  categories: Category[]
): ValidatedRow[] {
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]))

  return rows.map((row, index) => {
    const rowNumber = index + 2 // 1-indexed, skip header row
    const errors: string[] = []

    const data: CsvRow = {
      category: (row['category'] ?? '').trim(),
      grade: (row['grade'] ?? '').trim(),
      difficulty: (row['difficulty'] ?? '').trim().toLowerCase(),
      question: (row['question'] ?? '').trim(),
      image_url: (row['image_url'] ?? '').trim(),
      option_a: (row['option_a'] ?? '').trim(),
      option_b: (row['option_b'] ?? '').trim(),
      option_c: (row['option_c'] ?? '').trim(),
      option_d: (row['option_d'] ?? '').trim(),
      correct_answer: (row['correct_answer'] ?? '').trim().toUpperCase(),
      explanation: (row['explanation'] ?? '').trim(),
    }

    // Required field checks
    if (!data.category) errors.push('category wajib diisi')
    if (!data.grade) errors.push('grade wajib diisi')
    if (!data.difficulty) errors.push('difficulty wajib diisi')
    if (!data.question) errors.push('question wajib diisi')
    if (!data.option_a) errors.push('option_a wajib diisi')
    if (!data.option_b) errors.push('option_b wajib diisi')
    if (!data.option_c) errors.push('option_c wajib diisi')
    if (!data.option_d) errors.push('option_d wajib diisi')
    if (!data.correct_answer) errors.push('correct_answer wajib diisi')
    if (!data.explanation) errors.push('explanation wajib diisi')

    // Validate difficulty
    if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push(`difficulty tidak valid: "${data.difficulty}". Harus easy, medium, atau hard`)
    }

    // Validate correct_answer
    if (data.correct_answer && !['A', 'B', 'C', 'D'].includes(data.correct_answer)) {
      errors.push(`correct_answer tidak valid: "${data.correct_answer}". Harus A, B, C, atau D`)
    }

    // Validate grade
    const gradeNum = parseInt(data.grade)
    if (data.grade && (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 13)) {
      errors.push(`grade tidak valid: "${data.grade}". Harus angka 1–13`)
    }

    // Validate category exists
    let categoryId: string | undefined
    if (data.category) {
      const cat = categoryMap.get(data.category.toLowerCase())
      if (!cat) {
        errors.push(`kategori tidak ditemukan: "${data.category}"`)
      } else {
        categoryId = cat.id
      }
    }

    return {
      rowNumber,
      data,
      errors,
      isValid: errors.length === 0,
      categoryId,
    }
  })
}

export function buildInsertPayload(row: ValidatedRow) {
  if (!row.isValid || !row.categoryId) return null
  return {
    category_id: row.categoryId,
    grade: parseInt(row.data.grade),
    difficulty: row.data.difficulty as 'easy' | 'medium' | 'hard',
    question: row.data.question,
    image_url: row.data.image_url || null,
    option_a: row.data.option_a,
    option_b: row.data.option_b,
    option_c: row.data.option_c,
    option_d: row.data.option_d,
    correct_answer: row.data.correct_answer as 'A' | 'B' | 'C' | 'D',
    explanation: row.data.explanation,
  }
}
