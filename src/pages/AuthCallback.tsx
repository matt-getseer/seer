import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
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
              navigate('/');
              return;
            } catch (err) {
              console.error('Profile update error:', err);
              setError('Failed to update profile. Please contact support.');
              setTimeout(() => {
                navigate('/sign-in');
              }, 3000);
              return;
            }
          }

          // If no workspace ID, proceed with normal authentication
          navigate('/');
        } else {
          // No session found
          setError('Authentication failed. Please try signing in manually.');
          setTimeout(() => {
            navigate('/sign-in');
          }, 3000);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setTimeout(() => {
          navigate('/sign-in');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rotate-45 bg-primary-600" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Completing authentication...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we verify your credentials.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 