import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ToastMessage {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export default function PasswordSetup() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const navigate = useNavigate();
  const { supabase, user } = useAuth();
  const minLength = Number(import.meta.env.VITE_PASSWORD_MIN_LENGTH) || 8;

  useEffect(() => {
    // Clear toast after 5 seconds
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Redirect if user is not in an invite flow
    if (!localStorage.getItem('pendingWorkspaceId')) {
      navigate('/');
    }
  }, [navigate]);

  const validatePassword = (pass: string) => {
    if (pass.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!user?.id) {
        throw new Error('No user session found');
      }

      // Update user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Update user's profile to mark password as set
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_setup_complete: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const workspaceId = localStorage.getItem('pendingWorkspaceId');
      localStorage.removeItem('pendingWorkspaceId');

      setToast({
        title: 'Success',
        description: 'Password set successfully. You can now access your workspace.',
      });

      // Redirect to the workspace
      navigate(workspaceId ? `/workspace/${workspaceId}` : '/');
    } catch (error) {
      setToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out ${
          toast.variant === 'destructive' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          <h3 className="font-medium">{toast.title}</h3>
          <p className="text-sm mt-1">{toast.description}</p>
        </div>
      )}

      {/* Main Card */}
      <div className="w-[400px] bg-white rounded-lg shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Set Your Password</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
          </div>
          <div className="text-sm text-gray-500">
            Password must:
            <ul className="list-disc list-inside mt-2">
              <li>Be at least {minLength} characters long</li>
              <li>Contain at least one uppercase letter</li>
              <li>Contain at least one lowercase letter</li>
              <li>Contain at least one number</li>
            </ul>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
} 