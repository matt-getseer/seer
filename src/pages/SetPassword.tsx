import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import usePageTitle from '../hooks/usePageTitle';

const MIN_PASSWORD_LENGTH = 8;

const SetPassword: React.FC = () => {
  usePageTitle('Set Password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyInviteToken = async () => {
      const access_token = searchParams.get('access_token');
      if (!access_token) {
        setError('No access token found');
        setTimeout(() => navigate('/sign-in'), 3000);
        return;
      }

      try {
        // Verify the token without creating a session
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: access_token,
          type: 'invite',
        });

        if (verifyError) {
          console.error('Token verification error:', verifyError);
          setError('Invalid or expired invite link');
          setTimeout(() => navigate('/sign-in'), 3000);
          return;
        }

        // Store email for later use
        if (data.user?.email) {
          localStorage.setItem('pendingInviteEmail', data.user.email);
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setError('Error verifying invite link');
        setTimeout(() => navigate('/sign-in'), 3000);
      }
    };

    verifyInviteToken();
  }, [navigate, searchParams]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    // Password complexity check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      setError('Password must contain uppercase, lowercase, numbers, and special characters');
      return;
    }

    setLoading(true);

    try {
      const email = localStorage.getItem('pendingInviteEmail');
      const workspaceId = localStorage.getItem('pendingWorkspaceId');

      if (!email) {
        throw new Error('No email found for invite');
      }

      // Sign in with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString(),
          ...(workspaceId ? { workspace_id: workspaceId } : {})
        })
        .eq('email', email);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Failed to activate account');
      }

      // Clear stored data
      localStorage.removeItem('pendingInviteEmail');
      localStorage.removeItem('pendingWorkspaceId');

      // Navigate to the main app
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Password setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please set a secure password to complete your account setup
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSetPassword}>
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

          <div className="text-sm text-gray-600">
            <p>Password must:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Be at least {MIN_PASSWORD_LENGTH} characters long</li>
              <li>Include uppercase and lowercase letters</li>
              <li>Include numbers</li>
              <li>Include special characters (!@#$%^&*)</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPassword; 