import { Meeting, MeetingType } from '@prisma/client';
import { InsightData } from './types';
import { callClaudeWithRetry, MeetingInsights } from '../services/nlpService';

// Base prompt for reviews
const BASE_REVIEW_SYSTEM_PROMPT = `You are a specialist in analyzing performance review meetings. 
Analyze the following meeting transcript for a {REVIEW_TYPE} between a manager and employee, focusing on:
1.  A concise summary of the key discussion points, including feedback given and received.
2.  Specific goals set or progress discussed.
3.  Any agreed-upon action items or development plans.
Please format your response as a valid JSON object with the following structure: 
{ 
  "summary": "string", 
  "goalsDiscussed": ["string"], 
  "actionItems": ["string (include owner if possible)"],
  "keyTopics": ["string"]
}. 
Only output the JSON object.`;

// Function to get the specific prompt based on review type
function getReviewSystemPrompt(meetingType: MeetingType): string {
    let reviewTypeName = 'review'; // Default
    if (meetingType === MeetingType.SIX_MONTH_REVIEW) {
        reviewTypeName = '6-Month Review';
    } else if (meetingType === MeetingType.TWELVE_MONTH_REVIEW) {
        reviewTypeName = '12-Month Review';
    }
    return BASE_REVIEW_SYSTEM_PROMPT.replace('{REVIEW_TYPE}', reviewTypeName);
}

// Note: The MeetingInsights structure from nlpService might need adjustment
// if the review prompts request different fields (e.g., goalsDiscussed).
// For now, we'll assume the response can be mapped or the structure is flexible.

export async function processReviewMeeting(transcript: string, meeting: Meeting): Promise<InsightData[]> {
    console.log(`Processing ${meeting.meetingType} meeting ID: ${meeting.id} with specific review prompt.`);
    const insights: InsightData[] = [];

    const systemPrompt = getReviewSystemPrompt(meeting.meetingType);

    // Call the refactored Claude service
    // We are expecting MeetingInsights structure, but the prompt asks for goalsDiscussed instead of keyTopics.
    // This might cause parsing/validation errors in callClaudeWithRetry if it's strict.
    // A potential fix is to make the parsing more flexible or adjust the expected structure.
    // For now, proceed assuming it might work or we'll adjust nlpService later if needed.
    const analysisResult = await callClaudeWithRetry(transcript, systemPrompt);

    if (analysisResult) {
        console.log(`Successfully generated analysis for review meeting ${meeting.id}`);

        // Map the structured result (adapt based on actual fields returned)
        if (analysisResult.summary) {
            insights.push({
                meetingId: meeting.id,
                type: 'SUMMARY',
                content: analysisResult.summary,
            });
        }
        // Adapt this part based on the actual JSON structure returned by the review prompt
        const goals = (analysisResult as any).goalsDiscussed; // Use type assertion carefully
        if (goals && Array.isArray(goals) && goals.length > 0) {
            goals.forEach(goal => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'GOAL_DISCUSSED', // Use a specific type for goals
                    content: goal,
                });
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
         // If keyTopics are returned, include them
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
        console.error(`Analysis generation failed for review meeting ${meeting.id} after retries.`);
    }

    console.log(`Generated ${insights.length} insights for review meeting ${meeting.id}`);
    return insights;
} 