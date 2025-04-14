import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();

if (!GEMINI_API_KEY) {
  console.warn('Missing VITE_GEMINI_API_KEY environment variable. Analytics will not work.');
}

// Initialize with API key
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Configure the model
const model = genAI?.getGenerativeModel({ model: 'gemini-1.5-pro' });

interface SurveyResponseData {
  question: string;
  answer: string;
}

interface AnalysisResult {
  sentiment_score: number;
  key_themes: string[];
  actionable_insights: string[];
}

function cleanJsonResponse(text: string): string {
  // Remove markdown code block indicators and any surrounding whitespace
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

export async function analyzeWithGemini(responses: SurveyResponseData[]): Promise<AnalysisResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
  }

  if (!model) {
    throw new Error('Failed to initialize Gemini model.');
  }

  if (!responses || responses.length === 0) {
    throw new Error('No survey responses provided for analysis.');
  }

  try {
    const prompt = `You are a survey analysis expert. Please analyze these survey responses and provide:
      1. A sentiment score from 0 to 100 (where 0 is very negative and 100 is very positive)
      2. Key themes (maximum 5)
      3. Actionable insights for product improvement (maximum 5)

      Survey Responses:
      ${responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n')}

      Important: Return ONLY a valid JSON object with no markdown formatting or additional text.
      The response should be in this exact format:
      {
        "sentiment_score": number,
        "key_themes": string[],
        "actionable_insights": string[]
      }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Clean the response text before parsing
      const cleanedText = cleanJsonResponse(text);
      console.log('Cleaned response:', cleanedText); // For debugging
      const parsedResponse = JSON.parse(cleanedText);

      // Ensure the response matches our expected format
      return {
        sentiment_score: Math.min(100, Math.max(0, parsedResponse.sentiment_score)), // Clamp between 0-100
        key_themes: (parsedResponse.key_themes || []).slice(0, 5), // Limit to 5 themes
        actionable_insights: (parsedResponse.actionable_insights || []).slice(0, 5) // Limit to 5 insights
      };
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      console.error('Raw response:', text); // For debugging
      return {
        sentiment_score: 0,
        key_themes: ['Error analyzing responses'],
        actionable_insights: ['Failed to analyze responses']
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
} 