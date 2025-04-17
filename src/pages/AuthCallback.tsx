import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for token in multiple possible parameter names
      const token = searchParams.get('token') || searchParams.get('access_token');
      const type = searchParams.get('type');
      const workspace = searchParams.get('workspace');

      console.log('AuthCallback: Starting auth flow', { 
        hasToken: !!token,
        type,
        params: Object.fromEntries(searchParams.entries())
      });

      if (!token) {
        setError('No token found in URL');
        setTimeout(() => navigate('/sign-in'), 3000);
        return;
      }

      try {
        // First try to exchange the token for a session
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        });

        if (sessionError) {
          console.error('Token verification error:', sessionError);
          throw sessionError;
        }

        // Check if this is an invited user by looking at their metadata
        const isInvitedUser = sessionData.user?.user_metadata?.requiresPassword === true;
        
        if (isInvitedUser) {
          console.log('AuthCallback: Processing invite flow', {
            email: sessionData.user?.email,
            metadata: sessionData.user?.user_metadata
          });
          
          // 1. Force immediate sign out to clear any existing session
          await supabase.auth.signOut();
          console.log('AuthCallback: Cleared existing session');

          // 2. Store necessary data for password setup
          if (workspace) {
            localStorage.setItem('pendingWorkspaceId', workspace);
          }
          if (sessionData.user?.email) {
            localStorage.setItem('pendingInviteEmail', sessionData.user.email);
          }

          // 3. Redirect to password setup
          console.log('AuthCallback: Redirecting to password setup');
          navigate(`/set-password?access_token=${token}`, { replace: true });
          return;
        }

        // For non-invite flows, proceed with session check
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;

        if (session) {
          // Get workspace ID from auth metadata
          const workspaceId = session.user.user_metadata?.workspace_id;

          if (workspaceId) {
            try {
              // Update or create profile
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ 
                  id: session.user.id,
                  email: session.user.email,
                  workspace_id: workspaceId,
                  status: 'active',
                  updated_at: new Date().toISOString()
                });

              if (profileError) {
                console.error('Profile error details:', profileError);
                throw profileError;
              }

              // Navigate to the main app
              navigate('/', { replace: true });
              return;
            } catch (err) {
              console.error('Profile update error:', err);
              setError('Failed to update profile. Please contact support.');
              setTimeout(() => navigate('/sign-in'), 3000);
              return;
            }
          }

          // If no workspace ID, proceed with normal authentication
          navigate('/', { replace: true });
        } else {
          // No session found
          setError('Authentication failed. Please try signing in manually.');
          setTimeout(() => navigate('/sign-in'), 3000);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setTimeout(() => navigate('/sign-in'), 3000);
      }
    };

    // Execute immediately
    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600">{error}</h2>
            <p className="mt-2 text-gray-600">Redirecting you shortly...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Processing...</h2>
          <p className="mt-2 text-gray-600">Please wait while we verify your credentials.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 