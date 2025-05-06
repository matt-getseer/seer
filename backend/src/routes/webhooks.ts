import express, { Request, Response } from 'express';
import { PrismaClient, MeetingInsight, Prisma, MeetingType } from '@prisma/client';
import { sendNotificationEmail } from '../services/emailService';
import { InsightData } from '../meeting-processing/types';
import { processOneOnOneMeeting } from '../meeting-processing/oneOnOneProcessor';
import { processReviewMeeting } from '../meeting-processing/reviewProcessor';
import dotenv from 'dotenv';
import { WebhookEvent, UserJSON, OrganizationJSON, OrganizationMembershipJSON } from '@clerk/clerk-sdk-node';
import { Webhook } from 'svix';
import { v4 as uuidv4 } from 'uuid';

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

// SECTION: Clerk Webhook Handler

// Ensure you have CLERK_WEBHOOK_SECRET in your .env file
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!CLERK_WEBHOOK_SECRET) {
  console.error('FATAL ERROR: CLERK_WEBHOOK_SECRET is not set in environment variables.');
  // Depending on your application's needs, you might want to throw an error
  // or disable webhook processing if the secret is missing.
  // For now, we log an error. In a production environment, you might want to exit or prevent startup.
}

export const handleClerkWebhook = async (req: Request, res: Response) => {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error('Clerk Webhook secret not configured.');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  // Get the Svix headers for verification
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If any of the Svix headers are missing, return an error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn('Clerk webhook missing Svix headers.');
    return res.status(400).json({ error: 'Missing Svix headers.' });
  }

  // Get the raw body as a string. Ensure 'req.rawBody' is populated by express.raw middleware.
  const body = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body));
  if (!body) {
    console.warn('Clerk webhook body is empty.');
    return res.status(400).json({ error: 'Empty request body.'});
  }
  
  // Correct instantiation of Svix Webhook
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err: any) {
    console.error('Error verifying Clerk webhook signature:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed.' });
  }

  // Handle the event
  const eventType = evt.type;
  console.log(`Received Clerk webhook event: ${eventType}`, JSON.stringify(evt.data, null, 2));

  try {
    switch (eventType) {
      case 'organization.created':
        const orgCreatedData = evt.data as OrganizationJSON; // Use OrganizationJSON type
        // Ensure data has the expected structure (refer to Clerk docs for exact payload)
        if (!orgCreatedData.id || !orgCreatedData.name) {
            console.error('Invalid organization.created payload:', orgCreatedData);
            return res.status(400).json({ error: 'Invalid payload for organization.created' });
        }
        await prisma.organization.create({
          data: {
            id: uuidv4(), // Generate UUID for the primary key
            clerkOrganizationId: orgCreatedData.id,
            name: orgCreatedData.name,
            // createdAt will be set by @default(now())
            updatedAt: new Date(), // Explicitly set. RECOMMENDED: use @updatedAt in schema.prisma for Organization model
          },
        });
        console.log(`Organization created in DB: ${orgCreatedData.id} - ${orgCreatedData.name}`);
        break;

      case 'organization.updated':
        const orgUpdatedData = evt.data as OrganizationJSON; // Use OrganizationJSON type
        if (!orgUpdatedData.id) {
            console.error('Invalid organization.updated payload:', orgUpdatedData);
            return res.status(400).json({ error: 'Invalid payload for organization.updated (missing ID)' });
        }
        await prisma.organization.update({
          where: { clerkOrganizationId: orgUpdatedData.id },
          data: {
            name: orgUpdatedData.name || undefined, // Ensure name is not null if it's optional and can be unset
            // slug: orgUpdatedData.slug, // if you use slug
            // imageUrl: orgUpdatedData.image_url, // if you use image_url
            // ... any other fields you want to sync
            updatedAt: new Date(), // Explicitly set. RECOMMENDED: use @updatedAt in schema.prisma for Organization model
          },
        });
        console.log(`Organization updated in DB: ${orgUpdatedData.id}`);
        break;

      case 'organizationMembership.created':
        const membershipCreatedData = evt.data as OrganizationMembershipJSON; // Use OrganizationMembershipJSON type

        // Corrected access to organization ID and user ID
        const clerkOrgIdForMembership = membershipCreatedData.organization.id;
        // Corrected to use public_user_data based on linter feedback
        // Further corrected to use user_id based on linter feedback for OrganizationMembershipPublicUserDataJSON
        const clerkUserIdForMembership = membershipCreatedData.public_user_data?.user_id; 

        if (!clerkOrgIdForMembership || !clerkUserIdForMembership) {
            console.error('Invalid organizationMembership.created payload (missing org ID or user ID):', membershipCreatedData);
            return res.status(400).json({ error: 'Invalid payload for organizationMembership.created' });
        }

        // 1. Find the local Organization by its clerkOrganizationId
        const organization = await prisma.organization.findUnique({
          where: { clerkOrganizationId: clerkOrgIdForMembership },
        });

        if (!organization) {
          console.warn(`Organization with clerkOrganizationId ${clerkOrgIdForMembership} not found during membership creation. It might be created by another event shortly or there's a sync issue.`);
          // Depending on your strategy, you might want to retry, or wait for organization.created
          // For now, we'll proceed, and if the user update fails due to foreign key, it will be caught.
          // Alternatively, you could choose to create the org here if it's missing, using data from the membership event if available.
        }
        
        // 2. Find or create the local User by clerkUserId (using existing handler logic if possible, or simplified here)
        // We expect findOrCreateUser to have run, but let's be safe and try to find the user.
        const userToUpdate = await prisma.user.findUnique({
            where: { clerkId: clerkUserIdForMembership },
        });

        if (!userToUpdate) {
            console.warn(`User with clerkId ${clerkUserIdForMembership} not found during membership creation. Ensure findOrCreateUser runs successfully upon login/auth.`);
            // This is problematic. The user should exist if they are being added to an org.
            // Consider if `findOrCreateUser` needs to be invoked here or if this indicates an issue elsewhere.
            return res.status(404).json({ error: `User ${clerkUserIdForMembership} not found.`});
        }

        // 3. Update the user's organizationId
        if (organization) { // Only update if organization was found
            await prisma.user.update({
              where: { id: userToUpdate.id }, 
              data: { organizationId: organization.id }, // Link to your local Organization's UUID id
            });
            console.log(`User ${clerkUserIdForMembership} linked to Organization ${clerkOrgIdForMembership} (local ID: ${organization.id})`);
        } else {
            console.warn(`Skipped linking User ${clerkUserIdForMembership} to Organization ${clerkOrgIdForMembership} because the organization was not found locally.`);
        }
        break;

      case 'user.created': // You might already handle this via findOrCreateUser on auth
        const userCreatedData = evt.data as UserJSON; // Cast to UserJSON for better type safety
        // Check if your `findOrCreateUser` utility already covers this adequately upon first authentication.
        // If not, or if you want webhooks to be the primary source of truth for user creation:
        if (!userCreatedData.id || !userCreatedData.email_addresses || userCreatedData.email_addresses.length === 0) {
            console.error('Invalid user.created payload:', userCreatedData);
            return res.status(400).json({ error: 'Invalid payload for user.created'});
        }
        
        const primaryEmail = userCreatedData.email_addresses.find(e => e.id === userCreatedData.primary_email_address_id)?.email_address 
                           || userCreatedData.email_addresses[0].email_address;

        await prisma.user.upsert({
            where: { clerkId: userCreatedData.id },
            update: { 
                email: primaryEmail,
                name: `${userCreatedData.first_name || ''} ${userCreatedData.last_name || ''}`.trim() || null,
                // Potentially update other fields if they change
                // updatedAt: new Date(), // If you manage updatedAt manually
            },
            create: {
                // id is auto-incremented by Prisma
                clerkId: userCreatedData.id,
                email: primaryEmail,
                name: `${userCreatedData.first_name || ''} ${userCreatedData.last_name || ''}`.trim() || null,
                password: 'clerk-webhook-user', // Default placeholder, as Clerk handles auth
                // organizationId might be set by organizationMembership.created if it follows
                // createdAt will be set by @default(now())
                // updatedAt: new Date(), // If you manage updatedAt manually
            }
        });
        console.log(`User created/updated via webhook: ${userCreatedData.id}`);
        // Note: If this user belongs to an organization immediately, Clerk might send
        // organizationMembership.created event as well, or include organization details here.
        // Check Clerk's user.created payload for `organization_memberships` array.
        // If present, you might also link the organization here.
        // For example: 
        // if (userCreatedData.organization_memberships && userCreatedData.organization_memberships.length > 0) {
        //   const primaryOrgClerkId = userCreatedData.organization_memberships[0].organization.id;
        //   const org = await prisma.organization.findUnique({ where: { clerkOrganizationId: primaryOrgClerkId } });
        //   if (org) {
        //     await prisma.user.update({ where: { clerkId: userCreatedData.id }, data: { organizationId: org.id } });
        //     console.log(`User ${userCreatedData.id} linked to primary organization ${primaryOrgClerkId} during creation.`);
        //   } else {
        //       console.warn(`Primary organization ${primaryOrgClerkId} for user ${userCreatedData.id} not found locally during user.created webhook.`);
        //   }
        // }
        break;

      case 'user.updated':
        const userUpdatedData = evt.data as UserJSON; // Cast to UserJSON
        // Similar to user.created, ensure data consistency.
        // This event can also update organization membership if the user's primary org changes.
        if (!userUpdatedData.id) {
            console.error('Invalid user.updated payload (missing ID):', userUpdatedData);
            return res.status(400).json({ error: 'Invalid payload for user.updated'});
        }

        const updatedPrimaryEmail = userUpdatedData.email_addresses?.find(e => e.id === userUpdatedData.primary_email_address_id)?.email_address;

        await prisma.user.updateMany({ // Using updateMany to avoid error if user not found (though they should be)
          where: { clerkId: userUpdatedData.id }, 
          data: {
            email: updatedPrimaryEmail || undefined, // Use undefined to not update if not present
            name: `${userUpdatedData.first_name || ''} ${userUpdatedData.last_name || ''}`.trim() || undefined,
            // updatedAt: new Date(), // If you manage updatedAt manually
            // Check for organization changes. Clerk's payload for `user.updated` might include
            // `public_metadata.organization_id` or `organization_memberships` array.
            // If `organization_memberships` is present and has changed, you might need to update `User.organizationId`.
            // This logic can be complex depending on how Clerk structures this data for your setup.
            // Example if primary organization changes and is sent in public_metadata or a specific field:
            // organizationId: (await prisma.organization.findUnique({ where: { clerkOrganizationId: userUpdatedData.public_metadata.organization_id } }))?.id
          },
        });
        console.log(`User updated via webhook: ${userUpdatedData.id}`);
        // Add logic here to handle changes in organization membership if provided in user.updated event.
        // For example, if `userUpdatedData.organization_memberships` is an array:
        // const currentOrgMembership = userUpdatedData.organization_memberships?.[0]; // Assuming the first one is primary or relevant
        // if (currentOrgMembership?.organization?.id) {
        //    const org = await prisma.organization.findUnique({ where: { clerkOrganizationId: currentOrgMembership.organization.id }});
        //    if (org) {
        //        await prisma.user.update({ where: { clerkId: userUpdatedData.id }, data: { organizationId: org.id }});
        //        console.log(`User ${userUpdatedData.id} organization link updated to ${org.clerkOrganizationId}`);
        //    } else {
        //        console.warn(`Organization ${currentOrgMembership.organization.id} not found for user ${userUpdatedData.id} during user.updated webhook.`);
        //    }
        // } else {
        //     // Handle if user is removed from all orgs or primary org is removed
        //     await prisma.user.update({ where: { clerkId: userUpdatedData.id }, data: { organizationId: null }});
        //      console.log(`User ${userUpdatedData.id} organization link cleared during user.updated webhook.`);
        // }
        break;

      // Add other event types as needed (e.g., organization.deleted, organizationMembership.deleted)
      // case 'organization.deleted':
      //   const orgDeletedData = evt.data;
      //   await prisma.organization.deleteMany({
      //     where: { clerkOrganizationId: orgDeletedData.id },
      //   });
      //   console.log(`Organization deleted from DB: ${orgDeletedData.id}`);
      //   // Note: You might need to nullify organizationId on related Users or handle cascades.
      //   break;

      // case 'organizationMembership.deleted':
      //   const membershipDeletedData = evt.data;
      //   const clerkUserIdForDeletion = membershipDeletedData.public_user_data?.user_id || membershipDeletedData.user_id;
      //   // Find user and set organizationId to null
      //   if (clerkUserIdForDeletion) {
      //       await prisma.user.updateMany({
      //           where: { clerkId: clerkUserIdForDeletion }, 
      //           data: { organizationId: null }
      //       });
      //       console.log(`User ${clerkUserIdForDeletion} unlinked from organization via webhook.`);
      //   }
      //   break;

      default:
        console.log(`Received unhandled Clerk event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing Clerk webhook event ${eventType}:`, error);
    // Return a 500 status code to indicate an internal server error to Clerk
    // Clerk will then retry sending the webhook if it's configured to do so.
    return res.status(500).json({ error: 'Internal server error processing webhook.' });
  }

  res.status(200).json({ message: 'Webhook received and processed successfully.' });
};

export default router; 