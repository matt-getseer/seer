"use strict";
// backend/src/app.ts
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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path")); // For static path if you keep it here
const fs_1 = __importDefault(require("fs")); // For static path check if you keep it here
// --- Route Imports ---
const teams_1 = __importDefault(require("./routes/teams"));
const employees_1 = __importDefault(require("./routes/employees"));
const auth_1 = __importDefault(require("./routes/auth"));
const meetings_1 = __importDefault(require("./routes/meetings"));
const users_1 = require("./routes/users"); // Assuming userRouter is the correct export name
const departments_1 = __importDefault(require("./routes/departments"));
const webhooks_1 = __importStar(require("./routes/webhooks")); // Ensure handleClerkWebhook is correctly imported/exported
const app = (0, express_1.default)();
// --- CORS Configuration ---
// (Copied from your original index.ts, ensure FRONTEND_URL is in .env)
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000', // Your main frontend URL
    'http://localhost:5173' // Vite dev server origin, if you use it
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// Handle preflight OPTIONS requests for all routes
app.options('*', (0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// --- Helmet Security Headers ---
// (Copied from your original index.ts - adjust directives as needed)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            ...helmet_1.default.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", 'https://together-honeybee-3.clerk.accounts.dev', "'unsafe-inline'"],
            'connect-src': ["'self'", 'https://together-honeybee-3.clerk.accounts.dev', process.env.VITE_API_URL || 'http://localhost:3001'],
            'img-src': ["'self'", "https://img.clerk.com", "data:"],
            'style-src': ["'self'", "'unsafe-inline'"]
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
}));
// --- Clerk Webhook Route (needs raw body, BEFORE express.json()) ---
app.post('/api/webhooks/clerk', express_1.default.raw({ type: 'application/json' }), webhooks_1.handleClerkWebhook);
// --- Standard Middleware ---
app.use(express_1.default.json()); // For parsing application/json
// --- API Routes ---
app.use('/api/teams', teams_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/meetings', meetings_1.default);
app.use('/api/users', users_1.userRouter);
app.use('/api/departments', departments_1.default); // Your departments route is here!
app.use('/api/webhooks', webhooks_1.default); // Other webhook routes (if any, besides the specific Clerk one)
// --- Health Check Route ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});
// --- Serve Static Frontend Files (for production) ---
// Adjust the path according to your project structure. This assumes frontend is ../../frontend from backend/src
const staticPath = path_1.default.join(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(staticPath)) {
    console.log(`Serving static files from: ${staticPath}`);
    app.use(express_1.default.static(staticPath));
    // Handles any requests that don't match the API ones above by serving the frontend's index.html
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(staticPath, 'index.html'));
    });
}
else {
    console.warn(`Static path not found: ${staticPath}. Frontend will not be served by this server if this is a production build.`);
}
// --- Global Error Handler (must be last) ---
app.use((err, req, res, next) => {
    console.error('[Global Error Handler] Caught:', err.message);
    console.error(err.stack);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            message: err.message || 'An unexpected error occurred on the server.',
        }
    });
});
exports.default = app; // Export the configured app
