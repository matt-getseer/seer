"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationEmail = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
if (!SENDGRID_API_KEY) {
    console.error('*** SENDGRID_API_KEY environment variable is not set. Email notifications will be disabled.');
}
else {
    mail_1.default.setApiKey(SENDGRID_API_KEY);
    console.log('SendGrid API Key configured.');
}
if (!SENDGRID_FROM_EMAIL) {
    console.error('*** SENDGRID_FROM_EMAIL environment variable is not set. Email notifications might fail.');
}
/**
 * Sends an email notification using SendGrid.
 */
const sendNotificationEmail = async ({ to, subject, html }) => {
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
        await mail_1.default.send(msg);
        console.log(`Email successfully sent to ${to} with subject "${subject}"`);
    }
    catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        // SendGrid errors often have more details in response body
        if (error.response) {
            console.error('SendGrid Error Response:', error.response.body);
        }
        // Rethrow or handle as needed
        // throw error; 
    }
};
exports.sendNotificationEmail = sendNotificationEmail;
