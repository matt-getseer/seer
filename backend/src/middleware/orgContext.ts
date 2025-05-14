import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RequestWithUser } from './types.js'; // Assuming types.ts is in the same directory
import featureFlags, { isOrganizationsEnabled, DEFAULT_ORGANIZATION_ID } from '../config/featureFlags.js';

const prisma = new PrismaClient();

/**
 * Middleware to ensure organization context is available in the request
 * If organizations feature is disabled, will use the default organization
 */
export const ensureOrganizationContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for public routes that don't require organization context
    if (req.path.startsWith('/api/public') || req.path.startsWith('/webhooks')) {
      return next();
    }

    // If organizations feature is disabled, use default organization
    if (!isOrganizationsEnabled()) {
      // Find the default organization by its UUID (which is what DEFAULT_ORGANIZATION_ID stores)
      const defaultOrg = await prisma.organization.findUnique({
        where: { id: DEFAULT_ORGANIZATION_ID } // Corrected: Query by id (UUID)
      });

      if (!defaultOrg) {
        // This error message should ideally reflect that the UUID was not found
        console.error(`Default organization with ID (UUID) ${DEFAULT_ORGANIZATION_ID} not found in the database.`);
        return res.status(500).json({ error: 'Default organization record missing or configuration error' });
      }

      // Set default organization context in all places for consistency
      req.organizationId = defaultOrg.id;
      
      // Also in body and query for backward compatibility
      if (req.body && !req.body.organizationId) {
        req.body.organizationId = defaultOrg.id;
      }
      
      if (req.query && !req.query.organizationId) {
        req.query.organizationId = defaultOrg.id;
      }
      
      return next();
    }
    
    // When organizations feature is enabled, get org from request (check all possible locations)
    const orgId = 
      req.organizationId || 
      req.header('X-Organization-Id') || 
      req.body?.organizationId ||
      (req.query?.organizationId as string) ||  
      (req.user?.organizationId as string) || 
      null;
                  
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }
    
    // Set the organization ID in the standard location
    req.organizationId = orgId;
    
    // Also set in body and query for backward compatibility if they exist but are empty
    if (req.body && !req.body.organizationId) {
      req.body.organizationId = orgId;
    }
    
    if (req.query && !req.query.organizationId) {
      req.query.organizationId = orgId;
    }
    
    next();
  } catch (error) {
    console.error('Error in organization context middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 