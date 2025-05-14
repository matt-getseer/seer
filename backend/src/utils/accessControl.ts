import { UserRole } from '@prisma/client';
import { Request } from 'express';
import featureFlags, { DEFAULT_ORGANIZATION_ID } from '../config/featureFlags.js';
import { createOrganizationFilter } from './queryBuilder.js';

/**
 * Utility to validate a user's access within organization context
 * When organization feature is disabled, uses default organization
 */

export interface UserContext {
  id: number;
  role: UserRole;
  organizationId?: string;
}

/**
 * Extract user context from request
 * 
 * @param req Express request object
 * @returns User context object with organization handled according to feature flags
 */
export const getUserContext = (req: Request): UserContext => {
  // Get basic user info from the request
  const userId = req.user?.id as number || 0;
  const userRole = req.user?.role as UserRole;
  
  // Get organization ID, respecting feature flags
  let organizationId = req.user?.organizationId;
  
  // If organizations are disabled, use default
  if (!featureFlags.ENABLE_ORGANIZATIONS) {
    organizationId = DEFAULT_ORGANIZATION_ID;
  } else if (!organizationId) {
    // When orgs are enabled, try to get from request headers or body
    organizationId = req.organizationId || 
                     req.body?.organizationId || 
                     (req.query?.organizationId as string) || 
                     DEFAULT_ORGANIZATION_ID;
  }
  
  return {
    id: userId,
    role: userRole,
    organizationId,
  };
};

/**
 * Check if user is allowed to access a specific organization
 * When organization feature is disabled, this always returns true
 * 
 * @param userContext User context object
 * @param targetOrgId Organization ID to check access for
 * @returns Boolean indicating if access is allowed
 */
export const canAccessOrganization = (
  userContext: UserContext,
  targetOrgId?: string
): boolean => {
  // If organizations feature is disabled, always grant access
  if (!featureFlags.ENABLE_ORGANIZATIONS) {
    return true;
  }
  
  // If no target org specified, use the user's org
  const orgToCheck = targetOrgId || userContext.organizationId;
  
  // User must have an organization assigned
  if (!userContext.organizationId) {
    return false;
  }
  
  // User can only access their own organization's data
  return userContext.organizationId === orgToCheck;
};

/**
 * Get the organization filter for database queries based on user context
 * 
 * @param userContext User context object  
 * @returns Organization filter object
 */
export const getAccessibleOrganizationFilter = (
  userContext: UserContext
): { organizationId: string } => {
  return createOrganizationFilter(userContext.organizationId);
}; 