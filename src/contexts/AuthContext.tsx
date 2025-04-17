import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      // Check if this is an invite flow
      const searchParams = new URLSearchParams(location.search);
      const isInviteFlow = searchParams.get('type') === 'invite';
      const isSettingPassword = location.pathname.includes('set-password');
      const isAuthCallback = location.pathname.includes('auth/callback');

      console.log('Auth check details:', {
        pathname: location.pathname,
        search: location.search,
        isInviteFlow,
        isSettingPassword,
        isAuthCallback
      });

      // Skip session check for invite-related routes
      if (isInviteFlow || isSettingPassword || isAuthCallback) {
        console.log('Skipping auth check for protected route:', { isInviteFlow, isSettingPassword, isAuthCallback });
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Check active sessions and sets the user
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error checking auth session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    handleAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const searchParams = new URLSearchParams(location.search);
      const isInviteFlow = searchParams.get('type') === 'invite';
      const isSettingPassword = location.pathname.includes('set-password');
      const isAuthCallback = location.pathname.includes('auth/callback');

      // Don't update user state for invite-related routes
      if (isInviteFlow || isSettingPassword || isAuthCallback) {
        console.log('Skipping auth state change for protected route:', {
          pathname: location.pathname,
          isInviteFlow,
          isSettingPassword,
          isAuthCallback
        });
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, location.search]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
