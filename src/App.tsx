import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
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
import SurveyEditor from './pages/SurveyEditor';
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

// Wrapper component to handle layout selection
const LayoutWrapper: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="pl-56">
        <main><Outlet /></main>
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
      <AuthProvider>
        <SurveyProvider>
          <Router>
            <Routes>
              <Route path="/sign-in" element={<PublicLayout><SignIn /></PublicLayout>} />
              <Route path="/sign-up" element={<PublicLayout><SignUp /></PublicLayout>} />
              <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
              <Route path="/email-verification" element={<PublicLayout><EmailVerification /></PublicLayout>} />
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
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Navigate to="/surveys" replace />} />
                <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
                <Route path="/surveys/new" element={<ProtectedRoute><SurveyCreator /></ProtectedRoute>} />
                <Route path="/surveys/:id" element={<ProtectedRoute><SurveyOverview /></ProtectedRoute>} />
                <Route path="/surveys/:id/edit" element={<ProtectedRoute><SurveyEditor /></ProtectedRoute>} />
                <Route path="/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <ConnectionStatus />
          </Router>
        </SurveyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
