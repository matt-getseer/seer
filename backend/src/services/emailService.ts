import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

// Initialize function to be called after env vars are loaded
export const initializeEmailService = () => {
  // Debug logging
  logger.info('Environment variables check:', {
    SENDGRID_API_KEY_EXISTS: !!process.env.SENDGRID_API_KEY,
    SENDGRID_API_KEY_LENGTH: process.env.SENDGRID_API_KEY?.length,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    FRONTEND_URL: process.env.FRONTEND_URL
  });

  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY is not set in environment variables');
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    logger.warn('SENDGRID_FROM_EMAIL is not set in environment variables');
  }

  // Set the API key
  const apiKey = process.env.SENDGRID_API_KEY || '';
  logger.info('Setting SendGrid API key:', { keyLength: apiKey.length, startsWithSG: apiKey.startsWith('SG.') });
  sgMail.setApiKey(apiKey);
};

export const sendSurveyEmails = async (participants: { name: string; email: string; participation_token: string }[], surveyTitle: string) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured');
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      throw new Error('SendGrid sender email is not configured');
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error('Frontend URL is not configured');
    }

    const emails = participants.map(participant => ({
      to: participant.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cutonce.com',
      subject: `You're invited to take a survey: ${surveyTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${participant.name},</h2>
          <p>You have been invited to participate in a survey: <strong>${surveyTitle}</strong></p>
          <p>Please click the link below to take the survey:</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/take-survey/token/${participant.participation_token}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Take Survey
            </a>
          </p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p>${process.env.FRONTEND_URL}/take-survey/token/${participant.participation_token}</p>
          <p>Thank you for your participation!</p>
        </div>
      `
    }));

    logger.info('Attempting to send emails to participants', { 
      count: emails.length,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      apiKeyExists: !!process.env.SENDGRID_API_KEY
    });

    const response = await sgMail.send(emails);
    logger.info('Survey invitation emails sent successfully', { count: emails.length });
    return response;
  } catch (error: any) {
    logger.error('Error sending survey invitation emails', {
      error: error.message,
      code: error.code,
      response: error.response?.body,
    });
    throw error;
  }
}; 