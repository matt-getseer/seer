import { Meeting, MeetingType, PrismaClient } from '@prisma/client';
import { InsightData } from './types';
import { callClaudeWithRetry, MeetingInsights } from '../services/nlpService';

const BASE_ONE_ON_ONE_SYSTEM_PROMPT = `You are a specialist in analyzing 1-on-1 meetings.
The meeting is between {MANAGER_NAME} (manager) and {EMPLOYEE_NAME} (employee).
Analyze the following meeting transcript. Focus on:
1.  A concise summary of the main discussion points.
2.  Specific action items agreed upon, including who owns them if mentioned (e.g., "{EMPLOYEE_NAME} to update the report" or "{MANAGER_NAME} to provide resources").
3.  Strengths demonstrated by {EMPLOYEE_NAME} or positive aspects discussed.
4.  Areas where {EMPLOYEE_NAME} could use support or development, or where {MANAGER_NAME} can provide assistance.

When generating the summary, action items, strengths, and areas for support, please use the names {MANAGER_NAME} and {EMPLOYEE_NAME} where appropriate, instead of generic terms like "the manager" or "the employee". If a name is not available, you can use "the manager" or "the employee" as a fallback.

Please format your response as a valid JSON object with the following structure: 
{ 
  "summary": "string", 
  "actionItems": ["string"], 
  "strengths": ["string"], 
  "areasForSupport": ["string"] 
}. 
Only output the JSON object.`;

const prisma = new PrismaClient();

export async function processOneOnOneMeeting(transcript: string, meeting: Meeting): Promise<InsightData[]> {
    console.log(`Processing 1:1 meeting ID: ${meeting.id} with specific 1:1 prompt.`);
    const insights: InsightData[] = [];

    let managerName = 'The Manager';
    let employeeName = 'The Employee';

    try {
        const manager = await prisma.user.findUnique({
            where: { id: meeting.managerId },
            select: { name: true }
        });
        if (manager && manager.name) {
            managerName = manager.name;
        }

        const employee = await prisma.employee.findUnique({
            where: { id: meeting.employeeId },
            select: { name: true }
        });
        if (employee && employee.name) {
            employeeName = employee.name;
        }
    } catch (error) {
        console.error(`Error fetching manager or employee name for meeting ${meeting.id}:`, error);
        // Continue with default names if fetching fails
    }

    const systemPrompt = BASE_ONE_ON_ONE_SYSTEM_PROMPT
        .replace(/{MANAGER_NAME}/g, managerName)
        .replace(/{EMPLOYEE_NAME}/g, employeeName);

    // Call the refactored Claude service with the specific prompt
    const analysisResult = await callClaudeWithRetry(transcript, systemPrompt);

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
        if (analysisResult.strengths && analysisResult.strengths.length > 0) {
            analysisResult.strengths.forEach(item => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'STRENGTHS',
                    content: item,
                });
            });
        }
        if (analysisResult.areasForSupport && analysisResult.areasForSupport.length > 0) {
            analysisResult.areasForSupport.forEach(item => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'AREAS_FOR_SUPPORT',
                    content: item,
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