import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SurveyProvider } from './contexts/SurveyContext';
import { vi } from 'vitest';
import { supabase } from './lib/supabase';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

test('renders sign in page by default', async () => {
  window.history.pushState({}, '', '/sign-in');
  render(
    <AuthProvider>
      <SurveyProvider>
        <App />
      </SurveyProvider>
    </AuthProvider>
  );
  await screen.findByRole('heading', { name: /sign in to your account/i });
});
