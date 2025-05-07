import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the structure we expect the AI to return
// Exporting this so processors can potentially use it for type safety
export interface MeetingInsights {
  summary: string;
  actionItems: string[];
  strengths: string[];
  areasForSupport: string[];
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Renamed function and added systemPrompt parameter
async function callClaudeWithRetry(
  transcriptText: string, 
  systemPrompt: string // Added systemPrompt parameter
): Promise<MeetingInsights | null> {
  let attempts = 0;
  let delay = INITIAL_DELAY_MS;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(`Attempt ${attempts + 1} to generate insights using provided prompt.`);
      const msg = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", 
        max_tokens: 1024,
        system: systemPrompt, // Use the passed systemPrompt
        messages: [
          {
            role: "user",
            content: `Here is the transcript:\n\n${transcriptText}`,
          },
        ],
      });

      console.log('Anthropic API Response received.');
      // Assuming the response content is an array and the first element has the text
      const rawResponseText = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';

      // --- Clean up potential Markdown fences --- 
      let responseText = rawResponseText;
      if (responseText.startsWith('```json\n') && responseText.endsWith('\n```')) {
        responseText = responseText.substring(7, responseText.length - 4).trim();
      } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
         // Handle cases without explicit json language tag or newlines
         responseText = responseText.substring(3, responseText.length - 3).trim();
      }
      // --- End cleanup --- 

      // Attempt to parse the cleaned JSON
      try {
        const insights = JSON.parse(responseText) as MeetingInsights;
        // Basic validation of the parsed structure
        if (
          typeof insights.summary === 'string' &&
          Array.isArray(insights.actionItems) &&
          Array.isArray(insights.strengths) &&
          Array.isArray(insights.areasForSupport)
        ) {
          console.log('Successfully parsed insights from Anthropic response.');
          return insights;
        } else {
          console.warn('Parsed JSON does not match expected MeetingInsights structure:', responseText);
          throw new Error('Parsed JSON structure mismatch'); // Force retry
        }
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        console.warn('Failed to parse Anthropic response as JSON:', message);
        console.warn('Raw response text:', responseText);
        // Consider adding more robust JSON extraction logic here if needed (e.g., regex)
        throw parseError; // Force retry
      }
    } catch (error) {
      attempts++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error generating insights (Attempt ${attempts}/${MAX_RETRIES}):`, errorMessage);
      if (attempts >= MAX_RETRIES) {
        console.error('Max retries reached for generating insights.');
        return null; // Return null after max retries
      }
      // Exponential backoff
      delay *= 2;
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null; // Should not be reached if MAX_RETRIES > 0, but included for safety
}

// Updated export
export { callClaudeWithRetry }; 