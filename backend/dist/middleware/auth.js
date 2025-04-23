"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth Middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Auth Middleware - Missing or invalid token format');
            return res.status(401).json({ error: 'Authentication required' });
        }
        const token = authHeader.split(' ')[1];
        console.log('Auth Middleware - Token:', token.substring(0, 10) + '...');
        const secretKey = process.env.JWT_SECRET || 'fallback-secret-key';
        console.log('Auth Middleware - Using secret key:', secretKey === 'fallback-secret-key' ? 'fallback' : 'from env');
        const decodedToken = jsonwebtoken_1.default.verify(token, secretKey);
        console.log('Auth Middleware - Decoded token:', decodedToken);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Auth Middleware - Error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
