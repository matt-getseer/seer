import { supabase } from '../lib/supabase';
import { Survey, SurveyQuestion, SurveyResponse } from '../types/survey';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ApiError {
  status: string;
  message: string;
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'An error occurred');
    }

    // Return undefined for 204 responses
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Survey endpoints
  async getSurveys(): Promise<Survey[]> {
    return this.request<Survey[]>('/api/surveys');
  }

  async getSurveyById(id: string): Promise<Survey> {
    return this.request<Survey>(`/api/surveys/${id}`);
  }

  async createSurvey(data: { 
    title: string; 
    description?: string;
    author?: string;
  }): Promise<Survey> {
    return this.request<Survey>('/api/surveys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSurvey(id: string, data: { title?: string; description?: string }): Promise<Survey> {
    return this.request<Survey>(`/api/surveys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSurvey(id: string): Promise<void> {
    return this.request<void>(`/api/surveys/${id}`, {
      method: 'DELETE',
    });
  }

  // Survey questions endpoints
  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    return this.request<SurveyQuestion[]>(`/api/surveys/${surveyId}/questions`);
  }

  async addSurveyQuestion(surveyId: string, data: {
    question: string;
    type: SurveyQuestion['type'];
    options?: string[];
    required?: boolean;
    order_number: number;
  }): Promise<SurveyQuestion> {
    return this.request<SurveyQuestion>(`/api/surveys/${surveyId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSurveyQuestion(
    surveyId: string,
    questionId: string,
    data: {
      question?: string;
      type?: SurveyQuestion['type'];
      options?: string[];
      required?: boolean;
      order_number?: number;
    }
  ): Promise<SurveyQuestion> {
    return this.request<SurveyQuestion>(`/api/surveys/${surveyId}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSurveyQuestion(surveyId: string, questionId: string): Promise<void> {
    return this.request<void>(`/api/surveys/${surveyId}/questions/${questionId}`, {
      method: 'DELETE',
    });
  }

  // Survey responses endpoints
  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return this.request<SurveyResponse[]>(`/api/surveys/${surveyId}/responses`);
  }

  async addSurveyResponse(surveyId: string, data: {
    participant_id: string;
    answers: SurveyResponse['answers'];
  }): Promise<SurveyResponse> {
    return this.request<SurveyResponse>(`/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService(); 
