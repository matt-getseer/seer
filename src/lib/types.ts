export interface Survey {
  id: string
  title: string
  description: string | null
  author: string
  questions: any | null
  stats: any
  created_at: string
}

export interface Participant {
  id: string
  survey_id: string
  name: string
  email: string
  participation_token: string | null
  created_at: string
  survey?: {
    title: string
  }
}

export interface SurveyQuestion {
  id: string
  survey_id: string | null
  question: string
  type: string
  options: any | null
  order_number: number
  required: boolean | null
  created_at: string
  updated_at: string
}

export interface SurveyResponse {
  id: string
  survey_id: string | null
  participant_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
} 