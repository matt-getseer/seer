import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Creates a Google Calendar event with Google Meet conferencing.
 *
 * @param authClient An authenticated Google OAuth2 client.
 * @param summary The event title.
 * @param description The event description.
 * @param startDateTime ISO string for the start date/time.
 * @param endDateTime ISO string for the end date/time.
 * @param attendees Array of attendee email addresses.
 * @param timeZone The IANA timezone string (e.g., 'America/New_York').
 * @returns The created Google Calendar event object.
 */
export const createCalendarEvent = async (
  authClient: OAuth2Client,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  attendees: string[],
  timeZone: string
): Promise<calendar_v3.Schema$Event | undefined> => {

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Prepare attendees array
  const eventAttendees = attendees.map(email => ({ email }));

  const event: calendar_v3.Params$Resource$Events$Insert = {
    calendarId: 'primary', // Use the user's primary calendar
    requestBody: {
      summary: summary,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: timeZone, // Use provided timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone, // Use provided timezone
      },
      attendees: eventAttendees,
      // Request Google Meet conference details
      conferenceData: {
        createRequest: {
          requestId: `seer-meeting-${Date.now()}`, // Unique ID for the request
          conferenceSolutionKey: {
            type: 'hangoutsMeet' // Specifies Google Meet
          }
        }
      },
    },
    conferenceDataVersion: 1, // Required when requesting conference data
    sendNotifications: true, // Send invites to attendees
  };

  try {
    console.log(`Attempting to create Google Calendar event in timezone: ${timeZone}...`);
    const response = await calendar.events.insert(event);
    console.log('Google Calendar event created:', response.data.htmlLink);
    return response.data;
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.response?.data || error.message);
    // Rethrow or handle as needed
    throw new Error(`Failed to create Google Calendar event: ${error.message}`);
  }
}; 