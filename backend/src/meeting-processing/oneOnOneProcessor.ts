import { Meeting, MeetingType } from '@prisma/client';
import { InsightData } from './types';
import { callClaudeWithRetry, MeetingInsights } from '../services/nlpService';

const ONE_ON_ONE_SYSTEM_PROMPT = `You are a specialist in analyzing 1-on-1 meetings between managers and employees. 
Analyze the following meeting transcript focusing on:
1.  A concise summary of the main discussion points.
2.  Specific action items agreed upon, including who owns them if mentioned.
3.  Key topics or themes that emerged during the conversation.
Please format your response as a valid JSON object with the following structure: 
{ 
  "summary": "string", 
  "actionItems": ["string (include owner if possible, e.g., 'John to update the report')"], 
  "keyTopics": ["string"] 
}. 
Only output the JSON object.`;

export async function processOneOnOneMeeting(transcript: string, meeting: Meeting): Promise<InsightData[]> {
    console.log(`Processing 1:1 meeting ID: ${meeting.id} with specific 1:1 prompt.`);
    const insights: InsightData[] = [];

    // Call the refactored Claude service with the specific prompt
    const analysisResult = await callClaudeWithRetry(transcript, ONE_ON_ONE_SYSTEM_PROMPT);

    if (analysisResult) {
        console.log(`Successfully generated analysis for 1:1 meeting ${meeting.id}`);

        // Map the structured result to the InsightData format for saving
        if (analysisResult.summary) {
            insights.push({
                meetingId: meeting.id,
                type: 'SUMMARY',
                content: analysisResult.summary,
            });
        }
        if (analysisResult.actionItems && analysisResult.actionItems.length > 0) {
            analysisResult.actionItems.forEach(item => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'ACTION_ITEM',
                    content: item,
                });
            });
        }
        if (analysisResult.keyTopics && analysisResult.keyTopics.length > 0) {
            analysisResult.keyTopics.forEach(topic => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'KEY_TOPIC',
                    content: topic,
                });
            });
        }
    } else {
        console.error(`Analysis generation failed for 1:1 meeting ${meeting.id} after retries.`);
        // Optionally create an error insight?
        // insights.push({ meetingId: meeting.id, type: 'ERROR', content: 'Failed to generate analysis' });
    }

    console.log(`Generated ${insights.length} insights for 1:1 meeting ${meeting.id}`);
    return insights;
} 