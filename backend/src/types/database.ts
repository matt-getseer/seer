export type Database = {
  public: {
    Tables: {
      surveys: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          title: string;
          description: string | null;
          author: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          title: string;
          description?: string | null;
          author: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          author?: string;
        };
      };
      survey_questions: {
        Row: {
          id: string;
          created_at: string;
          survey_id: string;
          question: string;
          type: string;
          options: any | null;
          required: boolean;
          order_number: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          survey_id: string;
          question: string;
          type: string;
          options?: any | null;
          required?: boolean;
          order_number: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          survey_id?: string;
          question?: string;
          type?: string;
          options?: any | null;
          required?: boolean;
          order_number?: number;
        };
      };
      survey_responses: {
        Row: {
          id: string;
          created_at: string;
          survey_id: string;
          participant_id: string;
          answers: any;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          survey_id: string;
          participant_id: string;
          answers: any;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          survey_id?: string;
          participant_id?: string;
          answers?: any;
          completed_at?: string | null;
        };
      };
    };
  };
}; 