import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Surveys from './pages/Surveys';
import Participants from './pages/Participants';
import Billing from './pages/Billing';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import SurveyCreator from './pages/SurveyCreator';
import SurveyOverview from './pages/SurveyOverview';
import TakeSurvey from './pages/TakeSurvey';
import SharedAnalytics from './pages/SharedAnalytics';
import Sidebar from './components/Sidebar';
import PublicLayout from './components/PublicLayout';
import ConnectionStatus from './components/ConnectionStatus';
import { SurveyProvider } from './contexts/SurveyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
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

// Wrapper component to handle layout selection
const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isPublicRoute = location.pathname.startsWith('/take-survey/') ||
    location.pathname.startsWith('/analytics/') ||
    location.pathname === '/sign-in' ||
    location.pathname === '/sign-up' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/email-verification';

  if (isPublicRoute) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="pl-56">
        <main>{children}</main>
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
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
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
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
          <SurveyProvider>
            <LayoutWrapper>
              <Routes>
                {/* Public routes */}
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/email-verification" element={<EmailVerification />} />
                <Route path="/take-survey/:token" element={<TakeSurvey />} />
                <Route path="/take-survey/preview/:surveyId" element={<TakeSurvey isPreview />} />
                <Route path="/analytics/:token" element={<SharedAnalytics />} />

                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
                <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
                <Route path="/surveys/new" element={<ProtectedRoute><SurveyCreator /></ProtectedRoute>} />
                <Route path="/surveys/:id" element={<ProtectedRoute><SurveyOverview /></ProtectedRoute>} />
                <Route path="/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LayoutWrapper>
            <ConnectionStatus />
          </SurveyProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
