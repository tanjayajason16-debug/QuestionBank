export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'super_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          education_level: string | null
          subject: string | null
          grade: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          education_level?: string | null
          subject?: string | null
          grade?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          education_level?: string | null
          subject?: string | null
          grade?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          category_id: string
          grade: number
          difficulty: 'easy' | 'medium' | 'hard'
          question: string
          image_url: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: 'A' | 'B' | 'C' | 'D'
          explanation: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          grade: number
          difficulty: 'easy' | 'medium' | 'hard'
          question: string
          image_url?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: 'A' | 'B' | 'C' | 'D'
          explanation: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          grade?: number
          difficulty?: 'easy' | 'medium' | 'hard'
          question?: string
          image_url?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          correct_answer?: 'A' | 'B' | 'C' | 'D'
          explanation?: string
          created_at?: string
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          title: string
          description: string | null
          category_id: string
          grade: number
          question_count: number
          duration_minutes: number
          passing_score: number
          selection_mode: 'manual' | 'random'
          randomize_questions: boolean
          randomize_answers: boolean
          show_explanations: boolean
          allow_retake: boolean
          start_date: string | null
          end_date: string | null
          status: 'draft' | 'active' | 'inactive' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category_id: string
          grade: number
          question_count: number
          duration_minutes: number
          passing_score: number
          selection_mode: 'manual' | 'random'
          randomize_questions?: boolean
          randomize_answers?: boolean
          show_explanations?: boolean
          allow_retake?: boolean
          start_date?: string | null
          end_date?: string | null
          status?: 'draft' | 'active' | 'inactive' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category_id?: string
          grade?: number
          question_count?: number
          duration_minutes?: number
          passing_score?: number
          selection_mode?: 'manual' | 'random'
          randomize_questions?: boolean
          randomize_answers?: boolean
          show_explanations?: boolean
          allow_retake?: boolean
          start_date?: string | null
          end_date?: string | null
          status?: 'draft' | 'active' | 'inactive' | 'expired'
          created_at?: string
          updated_at?: string
        }
      }
      exam_questions: {
        Row: {
          id: string
          exam_id: string
          question_id: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          question_id: string
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          question_id?: string
          order_index?: number
          created_at?: string
        }
      }
      access_codes: {
        Row: {
          id: string
          exam_id: string
          code: string
          max_usage: number
          usage_count: number
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          code: string
          max_usage?: number
          usage_count?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          code?: string
          max_usage?: number
          usage_count?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          full_name: string
          school: string
          class: string
          nis: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          school: string
          class: string
          nis: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          school?: string
          class?: string
          nis?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attempts: {
        Row: {
          id: string
          student_id: string
          exam_id: string
          access_code_id: string
          status: 'in_progress' | 'submitted' | 'expired'
          started_at: string
          expires_at: string
          submitted_at: string | null
          score: number | null
          total_questions: number
          correct_count: number | null
          wrong_count: number | null
          unanswered_count: number | null
          passed: boolean | null
          question_order: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          exam_id: string
          access_code_id: string
          status?: 'in_progress' | 'submitted' | 'expired'
          started_at?: string
          expires_at: string
          submitted_at?: string | null
          score?: number | null
          total_questions: number
          correct_count?: number | null
          wrong_count?: number | null
          unanswered_count?: number | null
          passed?: boolean | null
          question_order?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          exam_id?: string
          access_code_id?: string
          status?: 'in_progress' | 'submitted' | 'expired'
          started_at?: string
          expires_at?: string
          submitted_at?: string | null
          score?: number | null
          total_questions?: number
          correct_count?: number | null
          wrong_count?: number | null
          unanswered_count?: number | null
          passed?: boolean | null
          question_order?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          selected_answer: 'A' | 'B' | 'C' | 'D' | null
          is_correct: boolean | null
          is_flagged: boolean
          answered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          selected_answer?: 'A' | 'B' | 'C' | 'D' | null
          is_correct?: boolean | null
          is_flagged?: boolean
          answered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          selected_answer?: 'A' | 'B' | 'C' | 'D' | null
          is_correct?: boolean | null
          is_flagged?: boolean
          answered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamQuestion = Database['public']['Tables']['exam_questions']['Row']
export type AccessCode = Database['public']['Tables']['access_codes']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type Attempt = Database['public']['Tables']['attempts']['Row']
export type Answer = Database['public']['Tables']['answers']['Row']

export type Difficulty = 'easy' | 'medium' | 'hard'
export type CorrectAnswer = 'A' | 'B' | 'C' | 'D'
export type ExamStatus = 'draft' | 'active' | 'inactive' | 'expired'
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired'
export type SelectionMode = 'manual' | 'random'
export type UserRole = 'admin' | 'super_admin'
