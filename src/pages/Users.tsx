import React, { useState, useEffect } from 'react';
import { ArrowUpRightIcon, MagnifyingGlassIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

interface EmailData {
  user_id: string;
  email: string;
}

interface Profile {
  id: string;
  updated_at: string;
  invited_at: string | null;
  status: 'active' | 'pending' | 'invited';
  full_name: string | null;
  username: string | null;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  status: 'active' | 'pending' | 'invited';
  full_name: string | null;
  username: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Users: React.FC = () => {
  usePageTitle('Users');
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get profiles with user information
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get user emails using our function
      const { data: emails, error: emailsError } = await supabase
        .rpc('get_user_emails');
      
      if (emailsError) throw emailsError;

      // Map profiles to user objects
      const users = (profiles || []).map(profile => {
        const userEmail = emails?.find((e: EmailData) => e.user_id === profile.id);
        return {
          id: profile.id,
          email: userEmail?.email || 'No email provided',
          created_at: profile.updated_at,
          last_sign_in_at: null, // We don't have access to this info from client side
          invited_at: profile.invited_at,
          status: profile.status || 'pending',
          full_name: profile.full_name,
          username: profile.username
        };
      });

      setUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    try {
      setInviteLoading(true);
      setInviteError(null);

      if (!inviteEmail) {
        throw new Error('Please enter an email address');
      }

      console.log('Step 1: Checking for existing user...');
      // Check if user already exists
      const { data: existingUsers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, status, email')
        .eq('email', inviteEmail);

      if (fetchError) {
        console.error('Error checking existing user:', fetchError);
        throw fetchError;
      }

      console.log('Existing users check result:', existingUsers);

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.status === 'invited') {
          setInviteError('User has already been invited');
          setInviteLoading(false);
          return;
        }
      }

      console.log('Step 2: Creating user via Edge Function...');
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('Calling Edge Function with session token...');
      
      // Log the request payload
      const requestPayload = {
        email: inviteEmail,
        invitedBy: user.id
      };
      console.log('Edge Function request payload:', requestPayload);
      
      try {
        // Call the Edge Function to create user and send invite
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-user', {
          body: requestPayload
        });

        console.log('Raw Edge Function response:', inviteData, inviteError);
        if (inviteError) {
          console.error('Full error object:', inviteError);
          console.error('Error details:', {
            message: inviteError.message,
            name: inviteError.name,
            stack: inviteError.stack,
            context: inviteError.context
          });
          throw inviteError;
        }

        if (!inviteData?.id) {
          throw new Error('Failed to create user - no ID returned');
        }

        const newUserId = inviteData.id;
        console.log('User created with ID:', newUserId);

        console.log('Step 3: Creating profile...');
        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            email: inviteEmail,
            status: 'invited',
            invited_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw profileError;
        }

        addToast('User has been invited successfully. They will receive an email to set up their account.', 'success');

        // Reset form and close modal
        setInviteEmail('');
        setShowInviteModal(false);
        
        console.log('Step 4: Refreshing user list...');
        // Fetch users after a short delay to ensure the profile is available
        setTimeout(() => {
          fetchUsers();
        }, 1000);
        
      } catch (functionError: unknown) {
        console.error('Edge Function error details:', functionError);
        if (functionError instanceof Error) {
          throw functionError;
        } else {
          throw new Error('Unknown error occurred while inviting user');
        }
      }
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvite = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'pending',
          invited_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Refresh the user list
      fetchUsers();
    } catch (err) {
      console.error('Error revoking invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);
      setError(null);

      const payload = { userId: userToDelete.id };
      console.log('Delete payload:', payload);
      
      // Call the Edge Function to delete the user
      const { data, error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: payload
      });

      console.log('Delete response:', { data, error: deleteError });

      if (deleteError) {
        console.error('Delete error details:', deleteError);
        throw deleteError;
      }

      // Update the local state to remove the deleted user
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));

      // Show success message using toast
      addToast('User deleted successfully', 'success');

      // Close the modal
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      addToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const getStatusBadge = (status: User['status']) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      invited: { color: 'bg-blue-100 text-blue-800', text: 'Invited' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out ${
              toast.type === 'success' ? 'bg-green-50 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="ml-2 border-none bg-transparent outline-none"
              />
            </div>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <span>+ Invite User</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Last Active</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        {user.status === 'invited' && (
                          <button
                            onClick={() => handleRevokeInvite(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleInviteUser}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                />
              </div>
              {inviteError && (
                <div className="mb-4 text-sm text-red-600">
                  {inviteError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{userToDelete.email}</p>
                <p className="text-sm text-gray-500">Status: {userToDelete.status}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 
