"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReviewMeeting = processReviewMeeting;
const client_1 = require("@prisma/client");
const nlpService_1 = require("../services/nlpService");
const prisma = new client_1.PrismaClient();
// Base prompt for reviews
const BASE_REVIEW_SYSTEM_PROMPT = `You are a specialist in analyzing performance review meetings. 
The meeting is a {REVIEW_TYPE} between {MANAGER_NAME} (manager) and {EMPLOYEE_NAME} (employee).
Analyze the following meeting transcript for this {REVIEW_TYPE}. Focus on:
1.  A concise summary of the key discussion points, including feedback given and received.
2.  Specific goals set or progress discussed.
3.  Any agreed-upon action items or development plans (e.g., "{EMPLOYEE_NAME} to complete X training" or "{MANAGER_NAME} to schedule follow-up").
4.  Strengths demonstrated by {EMPLOYEE_NAME} or positive aspects highlighted.
5.  Areas where {EMPLOYEE_NAME} could use support, development, or constructive feedback provided by {MANAGER_NAME}.

When generating the summary, goals, action items, strengths, and areas for support, please use the names {MANAGER_NAME} and {EMPLOYEE_NAME} where appropriate, instead of generic terms like "the manager" or "the employee". If a name is not available, use the generic terms as a fallback.

Please format your response as a valid JSON object with the following structure: 
{ 
  "summary": "string", 
  "goalsDiscussed": ["string"], 
  "actionItems": ["string"],
  "strengths": ["string"],
  "areasForSupport": ["string"]
}. 
Only output the JSON object.`;
// Function to get the specific prompt based on review type
function getReviewSystemPrompt(meetingType, managerName, employeeName) {
    let reviewTypeName = 'review'; // Default
    if (meetingType === client_1.MeetingType.SIX_MONTH_REVIEW) {
        reviewTypeName = '6-Month Review';
    }
    else if (meetingType === client_1.MeetingType.TWELVE_MONTH_REVIEW) {
        reviewTypeName = '12-Month Review';
    }
    return BASE_REVIEW_SYSTEM_PROMPT
        .replace(/{REVIEW_TYPE}/g, reviewTypeName)
        .replace(/{MANAGER_NAME}/g, managerName)
        .replace(/{EMPLOYEE_NAME}/g, employeeName);
}
// Note: The MeetingInsights structure from nlpService might need adjustment
// if the review prompts request different fields (e.g., goalsDiscussed).
// For now, we'll assume the response can be mapped or the structure is flexible.
async function processReviewMeeting(transcript, meeting) {
    console.log(`Processing ${meeting.meetingType} meeting ID: ${meeting.id} with specific review prompt.`);
    const insights = [];
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
    }
    catch (error) {
        console.error(`Error fetching manager or employee name for review meeting ${meeting.id}:`, error);
        // Continue with default names
    }
    const systemPrompt = getReviewSystemPrompt(meeting.meetingType, managerName, employeeName);
    // Call the refactored Claude service
    // We are expecting MeetingInsights structure, but the prompt asks for goalsDiscussed instead of keyTopics.
    // This might cause parsing/validation errors in callClaudeWithRetry if it's strict.
    // A potential fix is to make the parsing more flexible or adjust the expected structure.
    // For now, proceed assuming it might work or we'll adjust nlpService later if needed.
    const analysisResult = await (0, nlpService_1.callClaudeWithRetry)(transcript, systemPrompt);
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
        const goals = analysisResult.goalsDiscussed; // Use type assertion carefully
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
        // If strengths are returned, include them
        if (analysisResult.strengths && analysisResult.strengths.length > 0) {
            analysisResult.strengths.forEach(topic => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'STRENGTHS',
                    content: topic,
                });
            });
        }
        // If areasForSupport are returned, include them
        if (analysisResult.areasForSupport && analysisResult.areasForSupport.length > 0) {
            analysisResult.areasForSupport.forEach(topic => {
                insights.push({
                    meetingId: meeting.id,
                    type: 'AREAS_FOR_SUPPORT',
                    content: topic,
                });
            });
        }
    }
    else {
        console.error(`Analysis generation failed for review meeting ${meeting.id} after retries.`);
    }
    console.log(`Generated ${insights.length} insights for review meeting ${meeting.id}`);
    return insights;
}
