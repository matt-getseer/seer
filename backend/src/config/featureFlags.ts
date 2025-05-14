/**
 * Feature flag configuration module
 * Controls feature enablement throughout the application
 */

// The default organization ID to use when organizations feature is disabled
export const DEFAULT_ORGANIZATION_ID = process.env.DEFAULT_ORGANIZATION_ID || 'org_2x0OWQtE4mrSS215eksf8kbq6xW';

// Feature flag definitions
export interface FeatureFlags {
  ENABLE_ORGANIZATIONS: boolean;
  ENABLE_ADMIN_ROLE: boolean;
}

// Get environment variables with fallback to disabled state
const getFeatureFlags = (): FeatureFlags => {
  return {
    ENABLE_ORGANIZATIONS: process.env.ENABLE_ORGANIZATIONS === 'true',
    ENABLE_ADMIN_ROLE: process.env.ENABLE_ADMIN_ROLE === 'true',
  };
};

// Cached feature flags to avoid repeated environment lookups
const featureFlags = getFeatureFlags();

// Utility functions for feature checks
export const isOrganizationsEnabled = (): boolean => featureFlags.ENABLE_ORGANIZATIONS;
export const isAdminRoleEnabled = (): boolean => featureFlags.ENABLE_ADMIN_ROLE;
export const getOrganizationId = (orgId?: string | null): string => {
  // If organizations are enabled and a valid orgId is provided, use it
  // Otherwise fall back to the default organization
  return (isOrganizationsEnabled() && orgId) ? orgId : DEFAULT_ORGANIZATION_ID;
};

// Export all flags as a single object
export default featureFlags; 