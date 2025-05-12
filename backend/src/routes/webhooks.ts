import express, { Request, Response } from 'express';
import { PrismaClient, MeetingInsight, Prisma, MeetingType, UserRole } from '@prisma/client';
import { sendNotificationEmail } from '../services/emailService';
import { InsightData } from '../meeting-processing/types';
import { processOneOnOneMeeting } from '../meeting-processing/oneOnOneProcessor';
import { processReviewMeeting } from '../meeting-processing/reviewProcessor';
import dotenv from 'dotenv';
import { WebhookEvent, UserJSON, OrganizationJSON, OrganizationMembershipJSON, DeletedObjectJSON, users, OrganizationMembership } from '@clerk/clerk-sdk-node';
import { Webhook } from 'svix';
import { v4 as uuidv4 } from 'uuid';
import { formatInTimeZone } from 'date-fns-tz';

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
          
          // If the new status is 'IN_WAITING_ROOM', store the current time and check if meeting should be marked as "DID NOT HAPPEN"
          if (newStatus === 'IN_WAITING_ROOM') {
            // Get meeting timezone or use UTC as fallback
            const meetingTimeZone = meeting.timeZone || 'UTC';
            const scheduledTime = meeting.scheduledTime;
            const durationMinutes = meeting.durationMinutes || 60; // Default to 1 hour if not specified
            
            // Calculate end time in the meeting's timezone
            const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);
            
            // Get current time in UTC
            const now = new Date();
            
            console.log(`Meeting scheduled time: ${scheduledTime}, End time: ${endTime}, Now: ${now}`);
            console.log(`Meeting timezone: ${meetingTimeZone}`);
            
            // Compare dates with timezone awareness
            try {
              // Convert now to the meeting's timezone for comparison
              const nowInMeetingTz = formatInTimeZone(now, meetingTimeZone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX');
              const endTimeInMeetingTz = formatInTimeZone(endTime, meetingTimeZone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX');
              
              console.log(`Now in meeting timezone: ${nowInMeetingTz}, End time in meeting timezone: ${endTimeInMeetingTz}`);
              
              // If the current time is already after the end of the meeting window, mark as "DID NOT HAPPEN"
              if (new Date(nowInMeetingTz) > new Date(endTimeInMeetingTz)) {
                console.log(`Meeting ${meeting.id} is marked as "DID NOT HAPPEN" because current time is after the end time in the meeting timezone`);
                await prisma.meeting.update({
                  where: { id: meeting.id },
                  data: { status: 'DID_NOT_HAPPEN' },
                });
                return res.status(200).json({ message: 'Meeting marked as DID_NOT_HAPPEN due to timing.' });
              }
            } catch (error) {
              console.error(`Error comparing dates with timezone: ${error}`);
              // Fallback to simple comparison if date-fns-tz throws an error
              if (now > endTime) {
                console.log(`Meeting ${meeting.id} is marked as "DID NOT HAPPEN" (fallback comparison)`);
                await prisma.meeting.update({
                  where: { id: meeting.id },
                  data: { status: 'DID_NOT_HAPPEN' },
                });
                return res.status(200).json({ message: 'Meeting marked as DID_NOT_HAPPEN due to timing (fallback).' });
              }
            }
          }
          
          // Update meeting with the status from MeetingBaaS if not already handled
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

              // Fetch the employee's name
              const employee = await prisma.employee.findUnique({
                where: { id: meeting.employeeId },
                select: { name: true },
              });
              const employeeName = employee?.name;

              if (manager && manager.email) {
                const meetingTitle = meeting.title || `Meeting on ${meeting.scheduledTime.toLocaleDateString()}`;
                let subject = `✅ Insights Ready: ${meetingTitle}`;
                if (employeeName) {
                  subject += ` with ${employeeName}`;
                }
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

// Helper function (can be defined within this file or imported)
function isValidAppUserRole(role: any): role is UserRole {
  return Object.values(UserRole).includes(role);
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
        // Use upsert to handle cases where the organization might not exist locally yet
        await prisma.organization.upsert({
          where: { clerkOrganizationId: orgUpdatedData.id },
          update: { // Data to use if record IS found
            name: orgUpdatedData.name || undefined, // Ensure name is not null if it's optional and can be unset
            // slug: orgUpdatedData.slug, // if you use slug
            // imageUrl: orgUpdatedData.image_url, // if you use image_url
            // ... any other fields you want to sync
            updatedAt: new Date(), // Explicitly set. RECOMMENDED: use @updatedAt in schema.prisma for Organization model
          },
          create: { // Data to use if record IS NOT found
            id: uuidv4(), // Generate local UUID
            clerkOrganizationId: orgUpdatedData.id,
            name: orgUpdatedData.name || 'Unnamed Organization', // Provide a default name if needed
            // createdAt will be set by @default(now())
            updatedAt: new Date(),
          },
        });
        console.log(`Organization upserted in DB: ${orgUpdatedData.id}`);
        break;

      case 'organizationMembership.created':
        const membershipCreatedData = evt.data as OrganizationMembershipJSON;
        const clerkOrgIdForMembership = membershipCreatedData.organization.id;
        const clerkUserIdForMembership = membershipCreatedData.public_user_data?.user_id;

        if (!clerkOrgIdForMembership || !clerkUserIdForMembership) {
          console.error('Invalid organizationMembership.created payload (missing org ID or user ID):', membershipCreatedData);
          return res.status(400).json({ error: 'Invalid payload for organizationMembership.created' });
        }

        // --- START: App Role Logic for organizationMembership.created ---
        let appRoleForMembership: UserRole = UserRole.USER; // Default
        if (membershipCreatedData.public_metadata?.app_role && isValidAppUserRole(membershipCreatedData.public_metadata.app_role)) {
          appRoleForMembership = membershipCreatedData.public_metadata.app_role as UserRole;
          console.log(`Organization membership for user ${clerkUserIdForMembership}: app_role '${appRoleForMembership}' found in public_metadata.`);
        } else {
          console.log(`Organization membership for user ${clerkUserIdForMembership}: No valid app_role in public_metadata, defaulting to '${UserRole.USER}'.`);
        }
        // --- END: App Role Logic ---

        try {
          let organization = await prisma.organization.findUnique({
            where: { clerkOrganizationId: clerkOrgIdForMembership },
          });

          // if (!organization) console.warn(`Organization ${clerkOrgIdForMembership} not found initially. Attempting to create or re-query.`);
          if (!organization && membershipCreatedData.organization.name) { // Corrected condition: only try create if name exists
            try {
              organization = await prisma.organization.create({
                data: {
                  id: uuidv4(),
                  clerkOrganizationId: clerkOrgIdForMembership,
                  name: membershipCreatedData.organization.name,
                  updatedAt: new Date(),
                },
              });
              console.log(`Organization ${clerkOrgIdForMembership} - ${membershipCreatedData.organization.name} created locally from membership event.`);
            } catch (createError: any) {
              if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
                console.warn(`Create failed due to P2002 (unique constraint) for org ${clerkOrgIdForMembership}. Re-querying as it likely now exists.`);
                organization = await prisma.organization.findUnique({
                  where: { clerkOrganizationId: clerkOrgIdForMembership },
                });
                if (organization) {
                  console.log(`Organization ${clerkOrgIdForMembership} found on re-query.`);
                } else {
                  console.error(`Organization ${clerkOrgIdForMembership} still not found after P2002 and re-query. This is unexpected.`);
                }
              } else {
                console.error(`Failed to create missing organization ${clerkOrgIdForMembership} from membership event with non-P2002 error:`, createError);
              }
            }
          } else if (!organization) { // Log if still not found and name was missing for creation
            console.warn(`Cannot create or find organization ${clerkOrgIdForMembership} as name is missing from membership event and not found locally.`);
          }
          
          let userToUpdate = await prisma.user.findUnique({
            where: { clerkId: clerkUserIdForMembership },
          });

          if (userToUpdate) { // User exists, update them
            await prisma.user.update({
              where: { id: userToUpdate.id },
              data: { 
                organizationId: organization ? organization.id : userToUpdate.organizationId, // Link to org if found, else keep current
                role: appRoleForMembership, // <<< SET THE APPLICATION ROLE HERE
              },
            });
            console.log(`User ${clerkUserIdForMembership} linked to Organization ${clerkOrgIdForMembership} (local ID: ${organization?.id}) and app role set to ${appRoleForMembership}.`);
          } else {
            // User does not exist locally. This should ideally be handled by user.created first.
            // If user must be created here, their email is required.
            // Fetching from Clerk API would be necessary.
             console.warn(`User ${clerkUserIdForMembership} not found locally during organizationMembership.created. User should ideally be created via user.created event first. Role from metadata might not be applied if created later without it.`);
            // Example:
            // const clerkUser = await users.getUser(clerkUserIdForMembership);
            // const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
            // if (email) { /* create user with email and appRoleForMembership */ } 
          }
        } catch (error) {
          console.error(`Error processing organizationMembership.created for User ${clerkUserIdForMembership} / Org ${clerkOrgIdForMembership}:`, error);
          return res.status(500).json({ error: 'Failed to process organizationMembership.created event.' });
        }
        break;

      case 'user.created':
        const userCreatedData = evt.data as UserJSON; // Cast to UserJSON for better type safety
        if (!userCreatedData.id || !userCreatedData.email_addresses || userCreatedData.email_addresses.length === 0) {
            console.error('Invalid user.created payload:', userCreatedData);
            return res.status(400).json({ error: 'Invalid payload for user.created'});
        }
        
        const primaryEmail = userCreatedData.email_addresses.find(e => e.id === userCreatedData.primary_email_address_id)?.email_address 
                           || userCreatedData.email_addresses[0].email_address;

        // --- START: App Role Logic for user.created ---
        let appRoleForCreation: UserRole = UserRole.USER; // Default

        // Check if any organization exists. If not, this is the first user of the first organization.
        const existingOrganizations = await prisma.organization.count();
        if (existingOrganizations === 0) {
          appRoleForCreation = UserRole.MANAGER;
          console.log(`User creation for ${userCreatedData.id}: No organizations exist. Setting role to MANAGER.`);
        } else {
          // If organizations exist, check public_metadata or default to USER
          if (userCreatedData.public_metadata?.app_role && isValidAppUserRole(userCreatedData.public_metadata.app_role)) {
            appRoleForCreation = userCreatedData.public_metadata.app_role as UserRole;
            console.log(`User creation for ${userCreatedData.id}: app_role '${appRoleForCreation}' found in public_metadata.`);
          } else {
            console.log(`User creation for ${userCreatedData.id}: Organizations exist, no valid app_role in public_metadata, defaulting to '${UserRole.USER}'.`);
          }
        }
        // --- END: App Role Logic ---

        await prisma.user.upsert({
            where: { clerkId: userCreatedData.id },
            update: { 
                email: primaryEmail,
                name: `${userCreatedData.first_name || ''} ${userCreatedData.last_name || ''}`.trim() || null,
                role: appRoleForCreation, // <<< SET/UPDATE THE APPLICATION ROLE HERE
            },
            create: {
                clerkId: userCreatedData.id,
                email: primaryEmail,
                name: `${userCreatedData.first_name || ''} ${userCreatedData.last_name || ''}`.trim() || null,
                password: 'clerk-webhook-user', // Review if this placeholder password is truly needed
                role: appRoleForCreation, // <<< SET THE APPLICATION ROLE HERE
            }
        });
        console.log(`User created/updated via webhook: ${userCreatedData.id} with app role ${appRoleForCreation}`);

        // Attempt to link organization if user has memberships
        try {
          // Assuming getOrganizationMembershipList might directly return the array
          const organizationMemberships: OrganizationMembership[] = await users.getOrganizationMembershipList({ userId: userCreatedData.id });

          if (organizationMemberships && organizationMemberships.length > 0) {
            const primaryOrgMembership: OrganizationMembership = organizationMemberships[0]; // Assuming first is primary/relevant
            const clerkOrganizationId = primaryOrgMembership.organization.id;

            if (clerkOrganizationId) {
              const org = await prisma.organization.findUnique({ 
                where: { clerkOrganizationId: clerkOrganizationId } 
              });

              if (org) {
                // Update only if not already linked to this specific org, to avoid unnecessary writes
                // And ensure not to overwrite other fields like 'role'
                await prisma.user.updateMany({ 
                  where: { 
                    clerkId: userCreatedData.id,
                    OR: [ // Link if not linked, or linked to a different org
                        { organizationId: null },
                        { organizationId: { not: org.id } }
                    ]
                  }, 
                  data: { organizationId: org.id } 
                });
                console.log(`User ${userCreatedData.id} linked to organization ${clerkOrganizationId} (local ID: ${org.id}) during user.created webhook processing.`);
              } else {
                  console.warn(`Organization ${clerkOrganizationId} for user ${userCreatedData.id} not found locally during user.created webhook. The organization.created event might be pending or failed.`);
              }
            } else {
              console.log(`No organization ID found in primary organization membership for user ${userCreatedData.id} during user.created webhook.`);
            }
          } else {
            console.log(`No organization memberships found for user ${userCreatedData.id} via getOrganizationMembershipList during user.created webhook. Will rely on organizationMembership.created event.`);
          }
        } catch (error) {
          console.error(`Error fetching organization memberships for user ${userCreatedData.id} during user.created webhook:`, error);
        }
        break;

      case 'user.updated':
        const userUpdatedData = evt.data as UserJSON; // Cast to UserJSON
        if (!userUpdatedData.id) {
            console.error('Invalid user.updated payload (missing ID):', userUpdatedData);
            return res.status(400).json({ error: 'Invalid payload for user.updated'});
        }

        const updatedPrimaryEmail = userUpdatedData.email_addresses?.find(e => e.id === userUpdatedData.primary_email_address_id)?.email_address;
        
        // --- START: App Role Logic for user.updated ---
        let roleUpdateData: { role?: UserRole } = {};
        if (userUpdatedData.public_metadata?.app_role && isValidAppUserRole(userUpdatedData.public_metadata.app_role)) {
          roleUpdateData.role = userUpdatedData.public_metadata.app_role as UserRole;
          console.log(`User update for ${userUpdatedData.id}: app_role '${roleUpdateData.role}' found in public_metadata. Will update.`);
        } else {
           console.log(`User update for ${userUpdatedData.id}: No app_role in public_metadata or invalid. App role will not be changed by this event alone.`);
        }
        // --- END: App Role Logic ---

        await prisma.user.updateMany({ // Using updateMany to avoid error if user not found
          where: { clerkId: userUpdatedData.id }, 
          data: {
            email: updatedPrimaryEmail || undefined, // Use undefined to not update if not present
            name: `${userUpdatedData.first_name || ''} ${userUpdatedData.last_name || ''}`.trim() || undefined,
            ...roleUpdateData // Spread the role update only if app_role was in metadata
          },
        });
        console.log(`User updated via webhook: ${userUpdatedData.id}`);
        
        // Handle organization membership changes using SDK method
        try {
            const currentOrgMemberships: OrganizationMembership[] = await users.getOrganizationMembershipList({ userId: userUpdatedData.id });
            if (currentOrgMemberships && currentOrgMemberships.length > 0) {
                const primaryOrgMembership = currentOrgMemberships[0]; // Assuming first is primary/relevant
                const org = await prisma.organization.findUnique({ 
                    where: { clerkOrganizationId: primaryOrgMembership.organization.id }
                });
                if (org) {
                    await prisma.user.updateMany({
                        where: { clerkId: userUpdatedData.id },
                        data: { organizationId: org.id }
                    });
                    console.log(`User ${userUpdatedData.id} organization link updated to ${primaryOrgMembership.organization.id} via user.updated event.`);
                } else {
                    console.warn(`Organization ${primaryOrgMembership.organization.id} not found for user ${userUpdatedData.id} during user.updated (getOrganizationMembershipList).`);
                }
            } else {
                // No organization memberships found, so unlink user from any organization
                await prisma.user.updateMany({
                    where: { clerkId: userUpdatedData.id },
                    data: { organizationId: null }
                });
                console.log(`User ${userUpdatedData.id} organization link cleared via user.updated event (no memberships found via getOrganizationMembershipList).`);
            }
        } catch (error) {
            console.error(`Error updating organization memberships for user ${userUpdatedData.id} during user.updated event:`, error);
        }
        break;

      case 'organization.deleted':
        // Use the more specific type for deletion events, likely DeletedObjectJSON or similar
        // This type typically only contains { id: string, object: string, deleted: boolean }
        const orgDeletedData = evt.data as DeletedObjectJSON; 

        if (!orgDeletedData || !orgDeletedData.id) { // Check if orgDeletedData itself is valid
          console.error('Invalid organization.deleted payload (missing data or ID):', orgDeletedData);
          return res.status(400).json({ error: 'Invalid payload for organization.deleted' });
        }
        try {
          // We use orgDeletedData.id which is the clerkOrganizationId
          const clerkOrgIdToDelete = orgDeletedData.id;

          const orgToDeleteLocally = await prisma.organization.findUnique({
            where: { clerkOrganizationId: clerkOrgIdToDelete }, // Find by Clerk's ID
            select: { id: true } // Select only the local DB ID for subsequent operations
          });

          if (orgToDeleteLocally) {
            console.log(`Processing deletion for organization - Clerk ID: ${clerkOrgIdToDelete}, Local DB ID: ${orgToDeleteLocally.id}`);

            // Step 1: Unlink users from this organization
            const updatedUserCount = await prisma.user.updateMany({
              where: { organizationId: orgToDeleteLocally.id },
              data: { organizationId: null },
            });
            console.log(`Unlinked ${updatedUserCount.count} users from organization ID ${orgToDeleteLocally.id}`);

            // Step 2: Delete teams associated with this organization
            const deletedTeamCount = await prisma.team.deleteMany({
              where: { organizationId: orgToDeleteLocally.id },
            });
            console.log(`Deleted ${deletedTeamCount.count} teams from organization ID ${orgToDeleteLocally.id}`);
            
            // Step 3: Delete the organization itself from your local database
            await prisma.organization.delete({
              where: { id: orgToDeleteLocally.id }, // Use the local DB ID for deletion
            });
            console.log(`Organization with Clerk ID ${clerkOrgIdToDelete} (Local DB ID: ${orgToDeleteLocally.id}) deleted from local database.`);
          } else {
            console.warn(`Organization with Clerk ID ${clerkOrgIdToDelete} not found in local database during organization.deleted event. Already processed or never existed locally?`);
          }
        } catch (error) {
          console.error(`Error processing organization.deleted event for Clerk ID ${orgDeletedData.id}:`, error);
          return res.status(500).json({ error: 'Failed to process organization.deleted event.' });
        }
        break;

      case 'organizationMembership.deleted':
        const membershipDeletedData = evt.data as OrganizationMembershipJSON; // Type might need adjustment if payload is different for delete
        
        // const clerkOrgIdForDeletedMembership = membershipDeletedData.organization?.id; // organization can be null if org deleted
        const clerkOrgIdForDeletedMembership = membershipDeletedData.organization && typeof membershipDeletedData.organization === 'object' ? membershipDeletedData.organization.id : null;

        const clerkUserIdForDeletedMembership = membershipDeletedData.public_user_data?.user_id;

        if (!clerkUserIdForDeletedMembership) { // clerkOrgIdForDeletedMembership can be null if the org itself was deleted
          console.error('Invalid organizationMembership.deleted payload (missing user ID ):', membershipDeletedData);
          return res.status(400).json({ error: 'Invalid payload for organizationMembership.deleted' });
        }
        break;

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