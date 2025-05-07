"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClerkWebhook = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const emailService_1 = require("../services/emailService");
const oneOnOneProcessor_1 = require("../meeting-processing/oneOnOneProcessor");
const reviewProcessor_1 = require("../meeting-processing/reviewProcessor");
const dotenv_1 = __importDefault(require("dotenv"));
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const svix_1 = require("svix");
const uuid_1 = require("uuid");
// Load .env file
dotenv_1.default.config();
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Placeholder for the frontend URL - Add to .env later
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Helper function to reconstruct text from transcript segments
function getTextFromTranscript(transcriptSegments) {
    if (!transcriptSegments)
        return '';
    return transcriptSegments
        .map(segment => segment.words.map(word => word.word).join('')) // Join words within a segment
        .join('\n'); // Join segments with newline (or space, adjust as needed)
}
// POST /api/webhooks/meetingbaas - Handles notifications from Meeting BaaS
router.post('/meetingbaas', async (req, res) => {
    console.log('Received Meeting BaaS Webhook:', JSON.stringify(req.body, null, 2));
    // TODO: Add webhook signature validation for security
    const payload = req.body;
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
                }
                else {
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
                }
                else {
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
                    let generatedInsights = [];
                    try {
                        switch (meeting.meetingType) {
                            case client_1.MeetingType.ONE_ON_ONE:
                                generatedInsights = await (0, oneOnOneProcessor_1.processOneOnOneMeeting)(transcriptRecord.content, meeting);
                                break;
                            case client_1.MeetingType.SIX_MONTH_REVIEW:
                            case client_1.MeetingType.TWELVE_MONTH_REVIEW:
                                generatedInsights = await (0, reviewProcessor_1.processReviewMeeting)(transcriptRecord.content, meeting);
                                break;
                            default:
                                console.warn(`Unhandled meeting type ${meeting.meetingType} for meeting ${meeting.id}. No specific insights generated.`);
                                // Optionally, implement a default processor here
                                break;
                        }
                    }
                    catch (processingError) {
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
                                await (0, emailService_1.sendNotificationEmail)({
                                    to: manager.email,
                                    subject: subject,
                                    html: htmlBody,
                                });
                            }
                            else {
                                console.error(`Could not find manager email for managerId ${meeting.managerId} to send notification.`);
                            }
                        }
                        catch (emailError) {
                            console.error(`Failed to send completion notification email for meeting ${meeting.id}:`, emailError);
                            // Don't block the webhook response due to email failure
                        }
                        // --- End Email Notification --- 
                    }
                    else {
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
    }
    catch (error) {
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
function isValidAppUserRole(role) {
    return Object.values(client_1.UserRole).includes(role);
}
const handleClerkWebhook = async (req, res) => {
    if (!CLERK_WEBHOOK_SECRET) {
        console.error('Clerk Webhook secret not configured.');
        return res.status(500).json({ error: 'Webhook secret not configured.' });
    }
    // Get the Svix headers for verification
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];
    // If any of the Svix headers are missing, return an error
    if (!svix_id || !svix_timestamp || !svix_signature) {
        console.warn('Clerk webhook missing Svix headers.');
        return res.status(400).json({ error: 'Missing Svix headers.' });
    }
    // Get the raw body as a string. Ensure 'req.rawBody' is populated by express.raw middleware.
    const body = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body));
    if (!body) {
        console.warn('Clerk webhook body is empty.');
        return res.status(400).json({ error: 'Empty request body.' });
    }
    // Correct instantiation of Svix Webhook
    const wh = new svix_1.Webhook(CLERK_WEBHOOK_SECRET);
    let evt;
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        });
    }
    catch (err) {
        console.error('Error verifying Clerk webhook signature:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed.' });
    }
    // Handle the event
    const eventType = evt.type;
    console.log(`Received Clerk webhook event: ${eventType}`, JSON.stringify(evt.data, null, 2));
    try {
        switch (eventType) {
            case 'organization.created':
                const orgCreatedData = evt.data; // Use OrganizationJSON type
                // Ensure data has the expected structure (refer to Clerk docs for exact payload)
                if (!orgCreatedData.id || !orgCreatedData.name) {
                    console.error('Invalid organization.created payload:', orgCreatedData);
                    return res.status(400).json({ error: 'Invalid payload for organization.created' });
                }
                await prisma.organization.create({
                    data: {
                        id: (0, uuid_1.v4)(), // Generate UUID for the primary key
                        clerkOrganizationId: orgCreatedData.id,
                        name: orgCreatedData.name,
                        // createdAt will be set by @default(now())
                        updatedAt: new Date(), // Explicitly set. RECOMMENDED: use @updatedAt in schema.prisma for Organization model
                    },
                });
                console.log(`Organization created in DB: ${orgCreatedData.id} - ${orgCreatedData.name}`);
                break;
            case 'organization.updated':
                const orgUpdatedData = evt.data; // Use OrganizationJSON type
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
                const membershipCreatedData = evt.data;
                const clerkOrgIdForMembership = membershipCreatedData.organization.id;
                const clerkUserIdForMembership = membershipCreatedData.public_user_data?.user_id;
                if (!clerkOrgIdForMembership || !clerkUserIdForMembership) {
                    console.error('Invalid organizationMembership.created payload (missing org ID or user ID):', membershipCreatedData);
                    return res.status(400).json({ error: 'Invalid payload for organizationMembership.created' });
                }
                // --- START: App Role Logic for organizationMembership.created ---
                let appRoleForMembership = client_1.UserRole.USER; // Default
                if (membershipCreatedData.public_metadata?.app_role && isValidAppUserRole(membershipCreatedData.public_metadata.app_role)) {
                    appRoleForMembership = membershipCreatedData.public_metadata.app_role;
                    console.log(`Organization membership for user ${clerkUserIdForMembership}: app_role '${appRoleForMembership}' found in public_metadata.`);
                }
                else {
                    console.log(`Organization membership for user ${clerkUserIdForMembership}: No valid app_role in public_metadata, defaulting to '${client_1.UserRole.USER}'.`);
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
                                    id: (0, uuid_1.v4)(),
                                    clerkOrganizationId: clerkOrgIdForMembership,
                                    name: membershipCreatedData.organization.name,
                                    updatedAt: new Date(),
                                },
                            });
                            console.log(`Organization ${clerkOrgIdForMembership} - ${membershipCreatedData.organization.name} created locally from membership event.`);
                        }
                        catch (createError) {
                            if (createError instanceof client_1.Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
                                console.warn(`Create failed due to P2002 (unique constraint) for org ${clerkOrgIdForMembership}. Re-querying as it likely now exists.`);
                                organization = await prisma.organization.findUnique({
                                    where: { clerkOrganizationId: clerkOrgIdForMembership },
                                });
                                if (organization) {
                                    console.log(`Organization ${clerkOrgIdForMembership} found on re-query.`);
                                }
                                else {
                                    console.error(`Organization ${clerkOrgIdForMembership} still not found after P2002 and re-query. This is unexpected.`);
                                }
                            }
                            else {
                                console.error(`Failed to create missing organization ${clerkOrgIdForMembership} from membership event with non-P2002 error:`, createError);
                            }
                        }
                    }
                    else if (!organization) { // Log if still not found and name was missing for creation
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
                    }
                    else {
                        // User does not exist locally. This should ideally be handled by user.created first.
                        // If user must be created here, their email is required.
                        // Fetching from Clerk API would be necessary.
                        console.warn(`User ${clerkUserIdForMembership} not found locally during organizationMembership.created. User should ideally be created via user.created event first. Role from metadata might not be applied if created later without it.`);
                        // Example:
                        // const clerkUser = await users.getUser(clerkUserIdForMembership);
                        // const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
                        // if (email) { /* create user with email and appRoleForMembership */ } 
                    }
                }
                catch (error) {
                    console.error(`Error processing organizationMembership.created for User ${clerkUserIdForMembership} / Org ${clerkOrgIdForMembership}:`, error);
                    return res.status(500).json({ error: 'Failed to process organizationMembership.created event.' });
                }
                break;
            case 'user.created':
                const userCreatedData = evt.data; // Cast to UserJSON for better type safety
                if (!userCreatedData.id || !userCreatedData.email_addresses || userCreatedData.email_addresses.length === 0) {
                    console.error('Invalid user.created payload:', userCreatedData);
                    return res.status(400).json({ error: 'Invalid payload for user.created' });
                }
                const primaryEmail = userCreatedData.email_addresses.find(e => e.id === userCreatedData.primary_email_address_id)?.email_address
                    || userCreatedData.email_addresses[0].email_address;
                // --- START: App Role Logic for user.created ---
                let appRoleForCreation = client_1.UserRole.USER; // Default
                if (userCreatedData.public_metadata?.app_role && isValidAppUserRole(userCreatedData.public_metadata.app_role)) {
                    appRoleForCreation = userCreatedData.public_metadata.app_role;
                    console.log(`User creation for ${userCreatedData.id}: app_role '${appRoleForCreation}' found in public_metadata.`);
                }
                else {
                    console.log(`User creation for ${userCreatedData.id}: No valid app_role in public_metadata, defaulting to '${client_1.UserRole.USER}'.`);
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
                    const organizationMemberships = await clerk_sdk_node_1.users.getOrganizationMembershipList({ userId: userCreatedData.id });
                    if (organizationMemberships && organizationMemberships.length > 0) {
                        const primaryOrgMembership = organizationMemberships[0]; // Assuming first is primary/relevant
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
                                        OR: [
                                            { organizationId: null },
                                            { organizationId: { not: org.id } }
                                        ]
                                    },
                                    data: { organizationId: org.id }
                                });
                                console.log(`User ${userCreatedData.id} linked to organization ${clerkOrganizationId} (local ID: ${org.id}) during user.created webhook processing.`);
                            }
                            else {
                                console.warn(`Organization ${clerkOrganizationId} for user ${userCreatedData.id} not found locally during user.created webhook. The organization.created event might be pending or failed.`);
                            }
                        }
                        else {
                            console.log(`No organization ID found in primary organization membership for user ${userCreatedData.id} during user.created webhook.`);
                        }
                    }
                    else {
                        console.log(`No organization memberships found for user ${userCreatedData.id} via getOrganizationMembershipList during user.created webhook. Will rely on organizationMembership.created event.`);
                    }
                }
                catch (error) {
                    console.error(`Error fetching organization memberships for user ${userCreatedData.id} during user.created webhook:`, error);
                }
                break;
            case 'user.updated':
                const userUpdatedData = evt.data; // Cast to UserJSON
                if (!userUpdatedData.id) {
                    console.error('Invalid user.updated payload (missing ID):', userUpdatedData);
                    return res.status(400).json({ error: 'Invalid payload for user.updated' });
                }
                const updatedPrimaryEmail = userUpdatedData.email_addresses?.find(e => e.id === userUpdatedData.primary_email_address_id)?.email_address;
                // --- START: App Role Logic for user.updated ---
                let roleUpdateData = {};
                if (userUpdatedData.public_metadata?.app_role && isValidAppUserRole(userUpdatedData.public_metadata.app_role)) {
                    roleUpdateData.role = userUpdatedData.public_metadata.app_role;
                    console.log(`User update for ${userUpdatedData.id}: app_role '${roleUpdateData.role}' found in public_metadata. Will update.`);
                }
                else {
                    console.log(`User update for ${userUpdatedData.id}: No app_role in public_metadata or invalid. App role will not be changed by this event alone.`);
                }
                // --- END: App Role Logic ---
                await prisma.user.updateMany({
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
                    const currentOrgMemberships = await clerk_sdk_node_1.users.getOrganizationMembershipList({ userId: userUpdatedData.id });
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
                        }
                        else {
                            console.warn(`Organization ${primaryOrgMembership.organization.id} not found for user ${userUpdatedData.id} during user.updated (getOrganizationMembershipList).`);
                        }
                    }
                    else {
                        // No organization memberships found, so unlink user from any organization
                        await prisma.user.updateMany({
                            where: { clerkId: userUpdatedData.id },
                            data: { organizationId: null }
                        });
                        console.log(`User ${userUpdatedData.id} organization link cleared via user.updated event (no memberships found via getOrganizationMembershipList).`);
                    }
                }
                catch (error) {
                    console.error(`Error updating organization memberships for user ${userUpdatedData.id} during user.updated event:`, error);
                }
                break;
            case 'organization.deleted':
                // Use the more specific type for deletion events, likely DeletedObjectJSON or similar
                // This type typically only contains { id: string, object: string, deleted: boolean }
                const orgDeletedData = evt.data;
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
                    }
                    else {
                        console.warn(`Organization with Clerk ID ${clerkOrgIdToDelete} not found in local database during organization.deleted event. Already processed or never existed locally?`);
                    }
                }
                catch (error) {
                    console.error(`Error processing organization.deleted event for Clerk ID ${orgDeletedData.id}:`, error);
                    return res.status(500).json({ error: 'Failed to process organization.deleted event.' });
                }
                break;
            case 'organizationMembership.deleted':
                const membershipDeletedData = evt.data; // Type might need adjustment if payload is different for delete
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
    }
    catch (error) {
        console.error(`Error processing Clerk webhook event ${eventType}:`, error);
        // Return a 500 status code to indicate an internal server error to Clerk
        // Clerk will then retry sending the webhook if it's configured to do so.
        return res.status(500).json({ error: 'Internal server error processing webhook.' });
    }
    res.status(200).json({ message: 'Webhook received and processed successfully.' });
};
exports.handleClerkWebhook = handleClerkWebhook;
exports.default = router;
