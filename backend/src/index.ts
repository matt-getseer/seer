// backend/src/index.ts

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- DOTENV CONFIG FIRST ---
console.log('Loading environment variables from index.ts...');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Path from /src to /backend/.env
console.log('DEBUG from index.ts: After dotenv.config(), CLERK_SECRET_KEY is:', process.env.CLERK_SECRET_KEY);

// --- THEN IMPORT THE CONFIGURED APP ---
import app from './app.js'; // Import the app from app.ts

// --- Clerk Secret Key Check (Important to keep this early) ---
const CLERK_SECRET_KEY_FROM_ENV = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY_FROM_ENV) {
  console.error("FATAL ERROR from index.ts: CLERK_SECRET_KEY is not defined. Check .env file and path.");
  process.exit(1);
}
console.log('Clerk Secret Key confirmed in index.ts.');

// --- Initialize Prisma Client (if not already done in a service/db layer imported by app.ts) ---
// If app.ts or its route files import Prisma Client, this might be redundant here,
// but it doesn't hurt to have it initialized early.
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();


// --- PORT Configuration ---
const PORT = process.env.PORT || 3001;

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}. Main entry: index.ts`);
});

// No need to export 'app' from here if it's just the entry point to start the server.
// export default app; // Usually not needed from the main server startup file