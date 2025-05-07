"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// --- DOTENV CONFIG FIRST --- 
console.log('Loading environment variables...');
// Ensure the path is correct if your .env file is in `backend/.env` and index.ts is in `backend/src/index.ts`
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// More targeted debug log, check this when server starts
console.log('DEBUG: After dotenv.config(), CLERK_SECRET_KEY is:', process.env.CLERK_SECRET_KEY);
// --- THEN OTHER IMPORTS ---
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const helmet_1 = __importDefault(require("helmet"));
const users_1 = require("./routes/users");
const employees_1 = __importDefault(require("./routes/employees"));
const teams_1 = __importDefault(require("./routes/teams"));
const meetings_1 = __importDefault(require("./routes/meetings"));
const webhooks_1 = __importStar(require("./routes/webhooks")); // handleClerkWebhook is already imported here
const auth_1 = __importDefault(require("./routes/auth"));
// Check CLERK_SECRET_KEY after dotenv.config() and before SDK usage that might depend on it implicitly
const CLERK_SECRET_KEY_FROM_ENV = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY_FROM_ENV) {
    console.error("FATAL ERROR: CLERK_SECRET_KEY is not defined in process.env after dotenv.config(). Check .env file and path.");
    process.exit(1); // Exit if Clerk secret key is not set
}
console.log('Clerk Secret Key is confirmed in process.env.');
// Initialize Prisma Client
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Setup Helmet with CSP for Clerk
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            ...helmet_1.default.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': [
                "'self'",
                'https://together-honeybee-3.clerk.accounts.dev', // Allow Clerk scripts
                "'unsafe-inline'" // Allow inline scripts (temporary fix for CSP error)
            ],
            'connect-src': [
                "'self'",
                'https://together-honeybee-3.clerk.accounts.dev', // Allow connections to Clerk
                // Add any other domains your frontend needs to connect to (e.g., your API if served separately)
                process.env.VITE_API_URL || 'http://localhost:3001'
            ],
            // Add other directives as needed, e.g., img-src, style-src
            'img-src': ["'self'", "https://img.clerk.com", "data:"], // Allow Clerk images
            'style-src': ["'self'", "'unsafe-inline'"] // Allow inline styles if needed
        },
    },
    // Optional: Configure other Helmet features if needed
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
}));
// CORS Configuration - Allow requests from your frontend
// Add the development server origin (e.g., Vite's default port)
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173' // Add Vite dev server origin
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, // Allow cookies
}));
// Clerk Webhook route - needs raw body, so it's defined before express.json()
// The actual handler function 'handleClerkWebhook' will be in 'webhooks.ts'
app.post('/api/webhooks/clerk', express_1.default.raw({ type: 'application/json' }), webhooks_1.handleClerkWebhook);
// Body parsing middleware - now applied after the Clerk webhook route
app.use(express_1.default.json());
// Define API routes (Consider prefixing all with /api)
app.use('/api/users', users_1.userRouter);
app.use('/api/employees', employees_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/meetings', meetings_1.default);
app.use('/api/webhooks', webhooks_1.default); // Note: Webhooks might need raw body, check Clerk/Stripe docs
app.use('/api/auth', auth_1.default); // Mount the correct auth router
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});
// Serve static files from React app (if building for production)
// Adjust the path according to your project structure
const staticPath = path_1.default.join(__dirname, '../../../frontend/dist');
if (fs_1.default.existsSync(staticPath)) {
    console.log(`Serving static files from: ${staticPath}`);
    app.use(express_1.default.static(staticPath));
    // Handles any requests that don't match the ones above
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(staticPath, 'index.html'));
    });
}
else {
    console.warn(`Static path not found: ${staticPath}. Frontend will not be served by this server.`);
}
// Global error handler (Example)
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        // Optionally include stack trace in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
exports.default = app;
