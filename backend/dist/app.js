"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const teams_1 = __importDefault(require("./routes/teams"));
const employees_1 = __importDefault(require("./routes/employees"));
const auth_1 = __importDefault(require("./routes/auth"));
const meetings_1 = __importDefault(require("./routes/meetings"));
const users_1 = require("./routes/users");
const app = (0, express_1.default)();
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use('/api/teams', teams_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/meetings', meetings_1.default);
app.use('/api/users', users_1.userRouter);
app.use((err, req, res, next) => {
    console.error('[Global Error Handler] Caught:', err.message);
    console.error(err.stack);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            message: err.message || 'An unexpected error occurred.',
        }
    });
});
exports.default = app;
