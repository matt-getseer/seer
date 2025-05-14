/**
 * Feature flag configuration module for frontend
 * Controls feature enablement throughout the UI
 */

// Feature flag definitions
export interface FeatureFlags {
  ENABLE_ORGANIZATIONS: boolean;
  ENABLE_ADMIN_ROLE: boolean;
}

// Get environment variables with fallback to disabled state
const getFeatureFlags = (): FeatureFlags => {
  return {
    ENABLE_ORGANIZATIONS: import.meta.env.VITE_ENABLE_ORGANIZATIONS === 'true',
    ENABLE_ADMIN_ROLE: import.meta.env.VITE_ENABLE_ADMIN_ROLE === 'true',
  };
};

// Cached feature flags to avoid repeated environment lookups
const featureFlags = getFeatureFlags();

// Utility functions for feature checks
export const isOrganizationsEnabled = (): boolean => featureFlags.ENABLE_ORGANIZATIONS;
export const isAdminRoleEnabled = (): boolean => featureFlags.ENABLE_ADMIN_ROLE;

// Export all flags as a single object
export default featureFlags; 