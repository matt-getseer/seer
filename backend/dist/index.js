"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const client_1 = require("@prisma/client");
const users_1 = require("./routes/users");
const interviews_1 = __importDefault(require("./routes/interviews"));
const teams_1 = __importDefault(require("./routes/teams"));
const employees_1 = __importDefault(require("./routes/employees"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Debug routes - Add these before other routes
app.get('/api-test', (req, res) => {
    res.status(200).json({ message: 'API is accessible' });
});
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API with /api prefix is accessible' });
});
// Log all incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});
// Routes
app.use('/api/users', users_1.userRouter);
app.use('/api/interviews', interviews_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/employees', employees_1.default);
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});
// Catch-all 404 handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API test: http://localhost:${PORT}/api-test`);
    console.log(`API with prefix test: http://localhost:${PORT}/api/test`);
});
// Handle shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
});
