import { Request, Response, NextFunction } from 'express';
import featureFlags, { DEFAULT_ORGANIZATION_ID } from '../config/featureFlags.js';

/**
 * Middleware to enforce organization feature flag
 * If organizations are disabled, this assigns the default organization
 */
export const organizationFeatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip if organizations feature is enabled
  if (featureFlags.ENABLE_ORGANIZATIONS) {
    return next();
  }

  // If organizations are disabled, ensure a default organization ID is set
  // Set it in three places for maximum compatibility with existing code
  
  // 1. In request body if it exists
  if (req.body && !req.body.organizationId) {
    req.body.organizationId = DEFAULT_ORGANIZATION_ID;
  }

  // 2. In query params if they exist
  if (req.query && !req.query.organizationId) {
    req.query.organizationId = DEFAULT_ORGANIZATION_ID;
  }
  
  // 3. In the standardized location on the request object
  req.organizationId = DEFAULT_ORGANIZATION_ID;

  next();
};

/**
 * Middleware to enforce admin role feature flag
 * If admin role is disabled, this blocks access to admin-only routes
 */
export const adminFeatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!featureFlags.ENABLE_ADMIN_ROLE) {
    return res.status(403).json({
      message: 'Access denied. Admin features are currently disabled.',
    });
  }

  next();
};

/**
 * NOTE: For getting organization ID from requests, use getQueryOrganizationId from utils/queryBuilder instead.
 * That function is the centralized utility for all organization ID logic and it properly respects feature flags.
 */ 