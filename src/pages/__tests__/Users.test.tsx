import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Users from '../Users';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { AuthError, User } from '@supabase/supabase-js';

// Mock the custom hooks and supabase client
vi.mock('../../contexts/AuthContext');
vi.mock('../../hooks/usePageTitle');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn()
    },
    rpc: vi.fn()
  }
}));

describe('Users Component', () => {
  const mockUser = { 
    id: 'test-user-id', 
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as User;
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock the auth context
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

    // Setup default mock responses
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null, status: 200, statusText: 'OK', count: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null, status: 200, statusText: 'OK', count: null })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
      upsert: vi.fn(),
      url: '',
      headers: {}
    } as unknown as PostgrestQueryBuilder<any, any, any>));

    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: [], 
      error: null, 
      status: 200, 
      statusText: 'OK', 
      count: null 
    });
  });

  it('renders the Users component', () => {
    render(<Users />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('+ Invite User')).toBeInTheDocument();
  });

  describe('User Invitation Flow', () => {
    const mockInviteEmail = 'newuser@example.com';
    const mockNewUserId = 'new-user-id';

    beforeEach(() => {
      // Mock user creation
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { 
          user: { 
            id: mockNewUserId,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as User,
          session: null
        },
        error: null
      });

      // Mock password reset email
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null
      });
    });

    it('successfully invites a new user', async () => {
      // Mock all Supabase operations
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'user_roles') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            upsert: vi.fn(),
            url: '',
            headers: {}
          } as unknown as PostgrestQueryBuilder<any, any, any>;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            }),
            delete: vi.fn(),
            insert: vi.fn(),
            upsert: vi.fn(),
            url: '',
            headers: {}
          } as unknown as PostgrestQueryBuilder<any, any, any>;
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          update: vi.fn(),
          delete: vi.fn(),
          insert: vi.fn(),
          upsert: vi.fn(),
          url: '',
          headers: {}
        } as unknown as PostgrestQueryBuilder<any, any, any>;
      });

      render(<Users />);

      // Open invite modal
      fireEvent.click(screen.getByText('+ Invite User'));

      // Wait for modal to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      // Fill in email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: mockInviteEmail } });

      // Submit form
      const submitButton = screen.getByText('Send Invite');
      fireEvent.click(submitButton);

      // Wait for success message in toast
      await waitFor(() => {
        expect(screen.getByText(/invitation sent successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify Supabase calls
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: mockInviteEmail,
        password: expect.any(String),
        options: { data: { invited: true } }
      });
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled();
    });

    it('handles existing invited user error', async () => {
      // Mock initial fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: [], 
            error: null,
            status: 200,
            statusText: 'OK',
            count: null
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
        upsert: vi.fn(),
        url: '',
        headers: {}
      } as unknown as PostgrestQueryBuilder<any, any, any>));

      // Mock existing invited user check
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ 
            data: [{ id: '123', status: 'invited', email: mockInviteEmail }], 
            error: null,
            status: 200,
            statusText: 'OK',
            count: null
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
        upsert: vi.fn(),
        url: '',
        headers: {}
      } as unknown as PostgrestQueryBuilder<any, any, any>));

      vi.mocked(supabase.auth.signUp).mockImplementationOnce(() => {
        throw new Error('signUp should not be called');
      });

      render(<Users />);

      // Open invite modal
      fireEvent.click(screen.getByText('+ Invite User'));

      // Wait for modal to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      // Fill in email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: mockInviteEmail } });

      // Submit form
      const submitButton = screen.getByText('Send Invite');
      fireEvent.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('User has already been invited')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      // Mock API error
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Failed to fetch users' },
            status: 500,
            statusText: 'Error',
            count: null
          }),
          eq: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Failed to fetch users' },
            status: 500,
            statusText: 'Error',
            count: null
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
        upsert: vi.fn(),
        url: '',
        headers: {}
      } as unknown as PostgrestQueryBuilder<any, any, any>));

      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch users/i)).toBeInTheDocument();
      });
    });

    it('shows loading state', () => {
      render(<Users />);
      expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    });

    it('shows empty state when no users exist', async () => {
      // Mock empty users list
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: [], 
            error: null,
            status: 200,
            statusText: 'OK',
            count: null
          }),
          eq: vi.fn().mockResolvedValue({ 
            data: [], 
            error: null,
            status: 200,
            statusText: 'OK',
            count: null
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null })
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
        upsert: vi.fn(),
        url: '',
        headers: {}
      } as unknown as PostgrestQueryBuilder<any, any, any>));

      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Validation', () => {
    it('requires email for invitation', async () => {
      render(<Users />);
      
      // Open invite modal
      fireEvent.click(screen.getByText('+ Invite User'));
      
      // Wait for modal to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });
      
      // Try to submit without email
      fireEvent.click(screen.getByText('Send Invite'));
      
      // Should show validation message (HTML5 validation)
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInvalid();
    });

    it('validates email format', async () => {
      render(<Users />);
      
      // Open invite modal
      fireEvent.click(screen.getByText('+ Invite User'));
      
      // Wait for modal to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });
      
      // Enter invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      // Try to submit
      fireEvent.click(screen.getByText('Send Invite'));
      
      // Should show validation message (HTML5 validation)
      expect(emailInput).toBeInvalid();
    });
  });
}); 