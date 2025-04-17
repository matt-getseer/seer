import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import Surveys from './pages/Surveys';
import Participants from './pages/Participants';
import Billing from './pages/Billing';
import Users from './pages/Users.tsx';
import Settings from './pages/Settings';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import SetPassword from './pages/SetPassword';
import SurveyCreator from './pages/SurveyCreator';
import SurveyOverview from './pages/SurveyOverview';
import SurveyEditor from './pages/SurveyEditor';
import TakeSurvey from './pages/TakeSurvey';
import SharedAnalytics from './pages/SharedAnalytics';
import Sidebar from './components/Sidebar';
import PublicLayout from './components/PublicLayout';
import ConnectionStatus from './components/ConnectionStatus';
import { SurveyProvider } from './contexts/SurveyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthCallback from './pages/AuthCallback';
import EnvTest from './components/EnvTest';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Layout wrapper for protected routes
const LayoutWrapper: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="lg:pl-72">
        <Outlet />
      </div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry, but there was an error loading this page.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 404 Not Found Component
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
      >
        Return to Home
      </a>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/env-test" element={<EnvTest />} />
            <Route path="/sign-in" element={<PublicLayout><SignIn /></PublicLayout>} />
            <Route path="/sign-up" element={<PublicLayout><SignUp /></PublicLayout>} />
            <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
            <Route path="/email-verification" element={<PublicLayout><EmailVerification /></PublicLayout>} />
            <Route path="/set-password" element={<PublicLayout><SetPassword /></PublicLayout>} />
            <Route path="/auth/callback" element={<PublicLayout><AuthCallback /></PublicLayout>} />
            <Route 
              path="/take-survey/:mode/:id" 
              element={
                <PublicLayout>
                  <TakeSurvey isPreview={window.location.pathname.includes('/preview/')} />
                </PublicLayout>
              } 
            />
            <Route 
              path="/take-survey/token/:token" 
              element={
                <PublicLayout>
                  <TakeSurvey />
                </PublicLayout>
              } 
            />
            <Route path="/analytics/:token" element={<PublicLayout><SharedAnalytics /></PublicLayout>} />

            {/* Protected routes wrapped in SurveyProvider */}
            <Route
              element={
                <ProtectedRoute>
                  <SurveyProvider>
                    <LayoutWrapper />
                  </SurveyProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/surveys" replace />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/surveys/new" element={<SurveyCreator />} />
              <Route path="/surveys/:id" element={<SurveyOverview />} />
              <Route path="/surveys/:id/edit" element={<SurveyEditor />} />
              <Route path="/participants" element={<Participants />} />
              <Route path="/users" element={<Users />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <ConnectionStatus />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
