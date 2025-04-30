import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

if (!SENDGRID_API_KEY) {
  console.error('*** SENDGRID_API_KEY environment variable is not set. Email notifications will be disabled.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid API Key configured.');
}

if (!SENDGRID_FROM_EMAIL) {
    console.error('*** SENDGRID_FROM_EMAIL environment variable is not set. Email notifications might fail.');
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email notification using SendGrid.
 */
export const sendNotificationEmail = async ({ to, subject, html }: EmailParams): Promise<void> => {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.error('SendGrid API Key or From Email not configured. Skipping email send.');
    // Optionally throw an error or return a status
    return;
  }

  const msg = {
    to: to,
    from: SENDGRID_FROM_EMAIL, // Use the verified sender email from .env
    subject: subject,
    html: html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email successfully sent to ${to} with subject "${subject}"`);
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error);

    // SendGrid errors often have more details in response body
    if (error.response) {
      console.error('SendGrid Error Response:', error.response.body);
    }
    // Rethrow or handle as needed
    // throw error; 
  }
}; 