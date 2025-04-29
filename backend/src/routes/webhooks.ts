import express, { Request, Response } from 'express';
import { PrismaClient, MeetingInsight, Prisma } from '@prisma/client';
import { generateMeetingInsights } from '../services/nlpService';

const router = express.Router();
const prisma = new PrismaClient();

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

          // --- Trigger NLP processing --- 
          console.log(`Starting NLP processing for meeting ${meeting.id}`);
          const insights = await generateMeetingInsights(transcriptRecord.content);

          if (insights) {
             console.log(`Successfully generated insights for meeting ${meeting.id}`);
            // --- Prepare insights for DB insertion --- 
            const insightsToCreate: Prisma.MeetingInsightCreateManyInput[] = [];

            // Add summary
            if (insights.summary) {
                insightsToCreate.push({ 
                    meetingId: meeting.id, 
                    type: 'SUMMARY', 
                    content: insights.summary, 
                });
            }
            // Add action items
            insights.actionItems?.forEach(item => {
                insightsToCreate.push({ 
                    meetingId: meeting.id, 
                    type: 'ACTION_ITEM', 
                    content: item, 
                });
            });
             // Add key topics
            insights.keyTopics?.forEach(topic => {
                insightsToCreate.push({ 
                    meetingId: meeting.id, 
                    type: 'KEY_TOPIC', 
                    content: topic, 
                });
            });

            // --- Save insights to DB --- 
            if (insightsToCreate.length > 0) {
                const creationResult = await prisma.meetingInsight.createMany({
                    data: insightsToCreate,
                });
                console.log(`Saved ${creationResult.count} insights for meeting ${meeting.id}`);
            } else {
                 console.log(`No insights generated or parsed for meeting ${meeting.id}`);
            }

            // --- Update final meeting status --- 
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: { status: 'COMPLETED' }, // Mark as fully completed
            });
            console.log(`Meeting ${meeting.id} status updated to COMPLETED`);

          } else {
             console.error(`NLP processing failed for meeting ${meeting.id}`);
             // Update status to reflect NLP error
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