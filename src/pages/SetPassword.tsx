import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import usePageTitle from '../hooks/usePageTitle';

const SetPassword: React.FC = () => {
  usePageTitle('Set Password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // If we don't have a session and this is a recovery flow, try to exchange the token
        if (!session && searchParams.get('type') === 'recovery') {
          const refreshToken = searchParams.get('refresh_token');
          const accessToken = searchParams.get('access_token');

          if (!refreshToken && !accessToken) {
            throw new Error('No recovery token found');
          }

          // Try to get the user without a session
          const { data: { user }, error: userError } = accessToken 
            ? await supabase.auth.getUser(accessToken)
            : { data: { user: null }, error: new Error('No access token') };

          if (userError || !user) {
            throw new Error('Invalid or expired recovery token');
          }

          // Get the workspace ID from the user's metadata
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('workspace_id')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          if (profiles?.workspace_id) {
            setWorkspaceId(profiles.workspace_id);
          }
        }

      } catch (err) {
        console.error('Recovery error:', err);
        setError('Invalid or expired password reset link. Please request a new one.');
        setTimeout(() => navigate('/sign-in'), 3000);
      }
    };

    handlePasswordRecovery();
  }, [navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Update the user's password
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      if (!user) throw new Error('Failed to update password');

      // Update the user's profile status to active
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          workspace_id: workspaceId // Ensure workspace_id is set
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Add user to workspace_users if not already added
      if (workspaceId) {
        const { error: workspaceError } = await supabase
          .from('workspace_users')
          .upsert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'workspace_id,user_id'
          });

        if (workspaceError) throw workspaceError;
      }

      // Sign out after password update
      await supabase.auth.signOut();

      // Redirect to sign in with success message
      navigate('/sign-in', { 
        state: { message: 'Password set successfully. Please sign in with your new password.' }
      });
    } catch (err) {
      console.error('Error setting password:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while setting your password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please set a password to activate your account
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Setting password...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPassword; 