import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense, useCallback, useMemo, memo } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import SearchModal from './components/SearchModal'
import Home from './pages/Home'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Employees from './pages/Employees'
import Teams from './pages/Teams'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import { setTokenGetter } from './api/client'
import CreateOrganization from '@/pages/organizations/CreateOrganization'
import OrganizationProfile from '@/pages/organizations/OrganizationProfile'
import OrganizationSettings from '@/pages/organizations/OrganizationSettings'
import OrganizationMembers from '@/pages/organizations/OrganizationMembers'

// Lazy load report pages
const TeamPerformance = lazy(() => import('./pages/reports/TeamPerformance'))
const CoreCompetency = lazy(() => import('./pages/reports/CoreCompetency'))
const Engagement = lazy(() => import('./pages/reports/Engagement'))
const Sentiment = lazy(() => import('./pages/reports/Sentiment'))
const TopPerformer = lazy(() => import('./pages/reports/TopPerformer'))
const EmployeesAtRisk = lazy(() => import('./pages/reports/EmployeesAtRisk'))

// Navigation setup component
const NavigationSetup = memo(({ children }: { children: React.ReactNode }) => {
  const { isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded) return;

    // Create a stable token getter function that doesn't change on re-renders
    const stableTokenGetter = async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error('Error in token getter:', error);
        return null;
      }
    };

    setTokenGetter(stableTokenGetter);
  }, [isLoaded]); // Only depend on isLoaded, not getToken

  return <>{children}</>
});

// Component to clear problematic redirects from localStorage
const ClearRedirects = memo(({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Clear any redirects that might cause loops
    const lastRoute = localStorage.getItem('lastRoute');
    if (lastRoute && (lastRoute.includes('/sign-in') || lastRoute.includes('/sign-up'))) {
      localStorage.removeItem('lastRoute');
    }
    
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
    if (redirectAfterLogin && (redirectAfterLogin.includes('/sign-in') || redirectAfterLogin.includes('/sign-up'))) {
      localStorage.removeItem('redirectAfterLogin');
    }
  }, []);
  
  return <>{children}</>;
});

// Memoized content layout with sidebar and navbar
const MainLayout = memo(({ children, sidebarCollapsed, setSidebarCollapsed, setSearchModalOpen }: { 
  children: React.ReactNode;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchModalOpen: (open: boolean) => void;
}) => {
  // Memoize the callback for Sidebar
  const handleSearchClick = useCallback(() => {
    setSearchModalOpen(true);
  }, [setSearchModalOpen]);

  // Memoize the toggle callback
  const handleToggleCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, [setSidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        onSearchClick={handleSearchClick} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'pl-16' : 'pl-sidebar'}`}>
        <Navbar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
});

function App() {
  // Use useState with function initialization to ensure localStorage is only accessed once
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState === 'true';
    }
    return false;
  });

  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  
  // Add console logs to debug authentication state
  useEffect(() => {
    if (isLoaded) {
      console.log('Auth state loaded:', { isSignedIn, userId: user?.id });
    }
  }, [isLoaded, isSignedIn, user]);

  // Memoize these callback functions to prevent unnecessary re-renders
  const handleSetSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, []);

  const handleSetSearchModalOpen = useCallback((open: boolean) => {
    setSearchModalOpen(open);
  }, []);

  // Memoized Protected Route component
  const ProtectedRoute = useCallback(({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    
    if (!isLoaded) {
      // Still loading auth state, show loading spinner
      return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>;
    }
    
    if (!isSignedIn) {
      console.log('User not signed in, redirecting from:', location.pathname);
      // Only save non-root paths for redirects
      if (location.pathname !== '/' && !location.pathname.includes('/sign-in') && !location.pathname.includes('/sign-up')) {
        localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
        console.log('Saved redirect path:', location.pathname + location.search);
      }
      return <Navigate to="/sign-in" state={{ from: location }} replace />
    }
    
    return <>{children}</>
  }, [isLoaded, isSignedIn]);

  // Memoized SearchModal rendering
  const renderSearchModal = useCallback(() => {
    if (isSignedIn) {
      return <SearchModal 
        isOpen={searchModalOpen}
        setIsOpen={handleSetSearchModalOpen}
        onOpen={() => handleSetSearchModalOpen(true)} 
      />;
    }
    return null;
  }, [isSignedIn, searchModalOpen, handleSetSearchModalOpen]);

  // Loading state
  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <Router>
      <NavigationSetup>
        <Routes>
          {/* Public Routes */}
          <Route path="/sign-in" element={
            isSignedIn 
              ? <Navigate to="/" replace /> 
              : <ClearRedirects><SignIn /></ClearRedirects>
          } />
          <Route path="/sign-up" element={
            isSignedIn 
              ? <Navigate to="/" replace /> 
              : <ClearRedirects><SignUp /></ClearRedirects>
          } />
          
          {/* Organization Routes */}
          <Route 
            path="/organizations/new" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <CreateOrganization />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/organizations/:orgId" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <OrganizationProfile />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/organizations/:orgId/settings" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <OrganizationSettings />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/organizations/:orgId/members" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <OrganizationMembers />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Employees />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/employees/:id" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Employees />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Teams />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/team-performance" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <TeamPerformance />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/core-competency" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <CoreCompetency />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/engagement" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <Engagement />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/sentiment" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <Sentiment />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/top-performer" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <TopPerformer />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/employees-at-risk" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <EmployeesAtRisk />
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={handleSetSidebarCollapsed}
                  setSearchModalOpen={handleSetSearchModalOpen}
                >
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
        {renderSearchModal()}
      </NavigationSetup>
    </Router>
  )
}

export default App
