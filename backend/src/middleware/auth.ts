import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  email: string;
}

// Extend Express Request interface
type RequestWithUser = Request & {
  user?: JwtPayload;
};

export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
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
    
    const decodedToken = jwt.verify(
      token, 
      secretKey
    ) as JwtPayload;
    
    console.log('Auth Middleware - Decoded token:', decodedToken);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Middleware - Error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}; 