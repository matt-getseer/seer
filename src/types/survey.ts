export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'rating' | 'boolean';
  options?: string[];
  required: boolean;
  order_number: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyAnswer {
  questionId: string;
  answer: string | number | boolean;
}

export interface SurveyParticipant {
  id: string;
  name: string;
  email: string;
  participation_token: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  participant_id: string;
  completed_at: string | null;
  answers?: SurveyAnswer[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  author?: string;
} 
