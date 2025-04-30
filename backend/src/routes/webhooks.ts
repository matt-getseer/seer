import express, { Request, Response } from 'express';
import { PrismaClient, MeetingInsight, Prisma, MeetingType } from '@prisma/client';
import { sendNotificationEmail } from '../services/emailService';
import { InsightData } from '../meeting-processing/types';
import { processOneOnOneMeeting } from '../meeting-processing/oneOnOneProcessor';
import { processReviewMeeting } from '../meeting-processing/reviewProcessor';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// Placeholder for the frontend URL - Add to .env later
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; 

// Define structure for a single word in the transcript
interface TranscriptWord {
  start: number;
  end: number;
  word: string;
}

// Define structure for a transcript segment
interface TranscriptSegment {
  speaker: string;
  offset: number;
  words: TranscriptWord[];
}

// Updated interface based on the provided payload
interface MeetingBaaSWebhookPayload {
  event: string; 
  data: {
    bot_id: string; 
    transcript?: TranscriptSegment[]; // Transcript is an array of segments
    speakers?: string[];
    mp4?: string; // Recording URL is directly under mp4 key
    status?: { // Keep status for bot.status_change event
      code: string; 
      created_at: string;
    };
    error?: string; 
  };
}

// Helper function to reconstruct text from transcript segments
function getTextFromTranscript(transcriptSegments: TranscriptSegment[] | undefined): string {
  if (!transcriptSegments) return '';
  return transcriptSegments
    .map(segment => segment.words.map(word => word.word).join('')) // Join words within a segment
    .join('\n'); // Join segments with newline (or space, adjust as needed)
}

// POST /api/webhooks/meetingbaas - Handles notifications from Meeting BaaS
router.post('/meetingbaas', async (req: Request, res: Response) => {
  console.log('Received Meeting BaaS Webhook:', JSON.stringify(req.body, null, 2));

  // TODO: Add webhook signature validation for security

  const payload = req.body as MeetingBaaSWebhookPayload;

  // Use data.bot_id for validation
  if (!payload || !payload.data || !payload.data.bot_id) {
    console.error('Invalid webhook payload: Missing data.bot_id');
    return res.status(400).json({ message: 'Invalid payload: Missing data.bot_id' });
  }

  const meetingBaasId = payload.data.bot_id;

  try {
    // Find the meeting record using the ID from the webhook
    const meeting = await prisma.meeting.findUnique({
      where: { meetingBaasId: meetingBaasId }, // Use the extracted ID
    });

    if (!meeting) {
      console.warn(`Webhook received for unknown meeting_baas_id: ${meetingBaasId}`);
      return res.status(200).json({ message: 'Meeting not found, acknowledged.' });
    }

    console.log(`Processing webhook for Meeting ID: ${meeting.id}, Event: ${payload.event}`);

    // --- Handle Different Event Types --- 
    switch (payload.event) {
      case 'bot.status_change':
        if (payload.data.status?.code) {
          const newStatus = payload.data.status.code.toUpperCase(); // e.g., IN_WAITING_ROOM
          console.log(`Updating meeting ${meeting.id} status to: ${newStatus}`);
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: newStatus }, 
          });
        } else {
          console.warn(`Received bot.status_change event without status code for meeting ${meeting.id}`);
        }
        break;

      case 'complete': 
        // Check for processing error first
        const completionError = payload.data.error;
        if (completionError) {
          console.error(`Meeting BaaS processing failed for meeting ${meeting.id}: ${completionError}`);
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: 'ERROR_TRANSCRIPTION' }, // Use a generic processing error status
          });
        } else {
          // --- Process successful completion --- 
          const transcriptSegments = payload.data.transcript;
          const recordingUrl = payload.data.mp4;
          const transcriptText = getTextFromTranscript(transcriptSegments);
          
          // Check if we actually got transcript text
          if (!transcriptText) {
            console.error(`Webhook 'complete' but missing transcript text/segments for meeting ${meeting.id}`);
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: { status: 'ERROR_MISSING_TRANSCRIPT' }, 
            });
             res.status(200).json({ message: 'Webhook acknowledged, but transcript missing.' });
             return; 
          }

          // --- Create/Update Transcript Record --- 
          const transcriptRecord = await prisma.transcript.upsert({
            where: { meetingId: meeting.id },
            update: { 
              content: transcriptText,
              // languageCode: payload.data.language_code, // Language code wasn't in the example, add if available
              updatedAt: new Date(),
            },
            create: { 
              meetingId: meeting.id,
              content: transcriptText,
              // languageCode: payload.data.language_code,
            },
          });
          console.log(`Transcript record created/updated for meeting ${meeting.id}, Transcript ID: ${transcriptRecord.id}`);

          // --- Update Meeting Status (before NLP) and Recording URL --- 
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              status: 'GENERATING_INSIGHTS', 
              audioFileUrl: recordingUrl, // Save the mp4 URL
            },
          });
          console.log(`Meeting ${meeting.id} status updated to GENERATING_INSIGHTS`);

          // --- Trigger NLP processing (Dispatch based on Meeting Type) --- 
          console.log(`Dispatching NLP processing for meeting ${meeting.id} based on type: ${meeting.meetingType}`);
          
          let generatedInsights: InsightData[] = [];
          try {
            switch (meeting.meetingType) {
              case MeetingType.ONE_ON_ONE:
                generatedInsights = await processOneOnOneMeeting(transcriptRecord.content, meeting);
                break;
              case MeetingType.SIX_MONTH_REVIEW:
              case MeetingType.TWELVE_MONTH_REVIEW:
                generatedInsights = await processReviewMeeting(transcriptRecord.content, meeting);
                break;
              default:
                console.warn(`Unhandled meeting type ${meeting.meetingType} for meeting ${meeting.id}. No specific insights generated.`);
                // Optionally, implement a default processor here
                break;
            }
          } catch (processingError) {
            console.error(`Error during specialized NLP processing for meeting ${meeting.id}:`, processingError);
            // Keep generatedInsights empty, error status will be set below
          }

          // Check if insights were successfully generated
          if (generatedInsights.length > 0) {
             console.log(`Successfully generated ${generatedInsights.length} insights for meeting ${meeting.id}`);

            // --- Save insights to DB --- 
            // Use the generatedInsights array directly
            const creationResult = await prisma.meetingInsight.createMany({
                data: generatedInsights, // Pass the array conforming to InsightData/Prisma.MeetingInsightCreateManyInput
            });
            console.log(`Saved ${creationResult.count} insights for meeting ${meeting.id}`);
           
            // --- Update final meeting status --- 
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: { status: 'COMPLETED' }, // Mark as fully completed
            });
            console.log(`Meeting ${meeting.id} status updated to COMPLETED`);

            // --- Send Email Notification --- 
            try {
              // Fetch the manager's email
              const manager = await prisma.user.findUnique({
                where: { id: meeting.managerId },
                select: { email: true },
              });

              if (manager && manager.email) {
                const meetingTitle = meeting.title || `Meeting on ${meeting.scheduledTime.toLocaleDateString()}`;
                const subject = `✅ Insights Ready: ${meetingTitle}`;
                const meetingUrl = `${FRONTEND_URL}/meetings/${meeting.id}`;
                const htmlBody = `
                  <p>Good news!</p>
                  <p>The analysis for your meeting "<b>${meetingTitle}</b>" is complete.</p>
                  <p>You can view the insights, transcript, and recording here:</p>
                  <p><a href="${meetingUrl}" target="_blank">${meetingUrl}</a></p>
                  <br>
                  <p>Best regards,</p>
                  <p>The Seer Team</p>
                `;

                await sendNotificationEmail({
                  to: manager.email,
                  subject: subject,
                  html: htmlBody,
                });
              } else {
                console.error(`Could not find manager email for managerId ${meeting.managerId} to send notification.`);
              }
            } catch (emailError) {
              console.error(`Failed to send completion notification email for meeting ${meeting.id}:`, emailError);
              // Don't block the webhook response due to email failure
            }
            // --- End Email Notification --- 

          } else {
             // This block is reached if processors return empty array OR if an error occurred during processing
             console.error(`NLP processing finished with no insights generated for meeting ${meeting.id}. Check logs above for errors.`);
             // Update status to reflect NLP error or lack of insights
             await prisma.meeting.update({
               where: { id: meeting.id },
               data: { status: 'ERROR_NLP' },
             });
          }
        }
        break;

      default:
        console.warn(`Webhook received with unhandled event type: ${payload.event} for meeting ${meeting.id}`);
        break;
    }

    // Acknowledge receipt successfully (unless already handled)
    if (!res.headersSent) {
         res.status(200).json({ message: 'Webhook received and processed.' });
    }

  } catch (error) {
    console.error(`Error processing webhook for meeting_baas_id ${meetingBaasId}:`, error);
    res.status(500).json({ message: 'Internal server error processing webhook.' });
  }
});

export default router; 