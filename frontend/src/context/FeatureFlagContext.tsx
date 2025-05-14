import React, { createContext, useContext, ReactNode } from 'react';
import featureFlags, { FeatureFlags } from '../config/featureFlags';

// Create context with default values
export const FeatureFlagContext = createContext<{
  flags: FeatureFlags;
  isOrganizationsEnabled: () => boolean;
  isAdminRoleEnabled: () => boolean;
}>({
  flags: featureFlags,
  isOrganizationsEnabled: () => false,
  isAdminRoleEnabled: () => false,
});

interface FeatureFlagProviderProps {
  children: ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  // Feature flag check functions
  const isOrganizationsEnabled = () => featureFlags.ENABLE_ORGANIZATIONS;
  const isAdminRoleEnabled = () => featureFlags.ENABLE_ADMIN_ROLE;

  const value = {
    flags: featureFlags,
    isOrganizationsEnabled,
    isAdminRoleEnabled,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Custom hook for easy access to feature flags
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

export default FeatureFlagProvider; 