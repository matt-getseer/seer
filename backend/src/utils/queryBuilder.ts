import { Request } from 'express';
import featureFlags, { DEFAULT_ORGANIZATION_ID } from '../config/featureFlags.js';

/**
 * Centralized utility for building Prisma query filters with proper organization context
 * This ensures consistent organization filtering across all database queries
 */

/**
 * Get the organization ID to use for a query, respecting feature flags
 * 
 * @param requestOrOrgId Either a Request object or a specific organizationId string
 * @returns The organization ID to use in the query
 */
export const getQueryOrganizationId = (requestOrOrgId?: Request | string | null): string => {
  // If organizations feature is disabled, always use the default
  if (!featureFlags.ENABLE_ORGANIZATIONS) {
    return DEFAULT_ORGANIZATION_ID;
  }

  // If we got a request object
  if (requestOrOrgId && typeof requestOrOrgId !== 'string' && 'organizationId' in requestOrOrgId) {
    const req = requestOrOrgId as Request;
    return (
      req.organizationId || 
      req.body?.organizationId || 
      (req.query?.organizationId as string) || 
      DEFAULT_ORGANIZATION_ID
    );
  }

  // If we got a direct organizationId string
  return (requestOrOrgId as string) || DEFAULT_ORGANIZATION_ID;
};

/**
 * Add organization filter to a Prisma where clause
 * 
 * @param baseWhereClause The existing where clause to add organization filter to
 * @param requestOrOrgId Either a Request object or a specific organizationId string
 * @returns A new where clause with organization filter added
 */
export const withOrganizationFilter = <T extends object>(
  baseWhereClause: T = {} as T,
  requestOrOrgId?: Request | string | null
): T & { organizationId: string } => {
  const organizationId = getQueryOrganizationId(requestOrOrgId);
  return {
    ...baseWhereClause,
    organizationId
  };
};

/**
 * Create a standard organization filter object
 * 
 * @param requestOrOrgId Either a Request object or a specific organizationId string
 * @returns An object with the organizationId filter
 */
export const createOrganizationFilter = (
  requestOrOrgId?: Request | string | null
): { organizationId: string } => {
  return {
    organizationId: getQueryOrganizationId(requestOrOrgId)
  };
}; 