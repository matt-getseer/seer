import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense, useCallback, useMemo, memo } from 'react'
import { useAuth, useUser, useOrganizationList, useOrganization } from '@clerk/clerk-react'
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
import MinimalLayout from './layouts/MinimalLayout'

// Lazy load report pages
const TeamPerformance = lazy(() => import('./pages/reports/TeamPerformance'))
const CoreCompetency = lazy(() => import('./pages/reports/CoreCompetency'))
const Engagement = lazy(() => import('./pages/reports/Engagement'))
const Sentiment = lazy(() => import('./pages/reports/Sentiment'))
const TopPerformer = lazy(() => import('./pages/reports/TopPerformer'))
const EmployeesAtRisk = lazy(() => import('./pages/reports/EmployeesAtRisk'))

// Lazy load meeting pages
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'))
const MeetingDetailPage = lazy(() => import('./pages/MeetingDetailPage'))

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
  const { user } = useUser(); 

  const handleSearchClick = useCallback(() => {
    setSearchModalOpen(true);
  }, [setSearchModalOpen]);

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
  );
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

  // Remove useCallback wrapper, make it a regular component function
  const ProtectedRoute = ({ children, requiresOrg = true }: { children: React.ReactNode; requiresOrg?: boolean }) => {
    const location = useLocation();
    const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
    const { organization, isLoaded: isOrgLoaded } = useOrganization();
    // State to track if initial checks passed successfully for this instance
    const [initialPassComplete, setInitialPassComplete] = useState(false);

    // Log entry point including state
    console.log(`ProtectedRoute Render: Path=${location.pathname}, AuthLoaded=${isAuthLoaded}, OrgLoaded=${isOrgLoaded}, SignedIn=${isSignedIn}, InitialPass=${initialPassComplete}`);

    // Only run the full suite of checks if the initial pass isn't marked complete yet
    if (!initialPassComplete) {
      const isLoading = !isAuthLoaded || (requiresOrg && !isOrgLoaded);

      if (isLoading) {
        console.log(`ProtectedRoute (${location.pathname}): Internal loading state ACTIVE (Initial Check)`);
        return <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>;
      }

      if (!isSignedIn) {
        console.log(`ProtectedRoute (${location.pathname}): User not signed in (Initial Check)`);
        // Save redirect path and navigate
        if (location.pathname !== '/' && !location.pathname.includes('/sign-in') && !location.pathname.includes('/sign-up')) {
          localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
        }
        return <Navigate to="/sign-in" state={{ from: location }} replace />;
      }

      if (requiresOrg && !organization && location.pathname !== '/organizations/new') {
        console.log(`ProtectedRoute (${location.pathname}): Org check failed (Initial Check)`);
        return <Navigate to="/organizations/new" replace />;
      }

      // All initial checks passed! Mark as complete and render children.
      console.log(`ProtectedRoute (${location.pathname}): Initial checks PASSED`);
      setInitialPassComplete(true); // Set state AFTER checks pass
      return <>{children}</>; // Render children immediately

    } else {
      // ----- Initial pass was already complete for this instance -----
      // On subsequent re-renders, just do a quick check for logout
      if (!isSignedIn) {
         console.log(`ProtectedRoute (${location.pathname}): User signed OUT after initial pass! Redirecting.`);
         // Consider clearing localStorage here too if needed
         if (location.pathname !== '/' && !location.pathname.includes('/sign-in') && !location.pathname.includes('/sign-up')) {
           localStorage.setItem('redirectAfterLogin', location.pathname + location.search); // Still save path
         }
         // Resetting state might be needed if the component instance survives the redirect somehow, but often isn't.
         // setInitialPassComplete(false); 
         return <Navigate to="/sign-in" state={{ from: location }} replace />;
      }

      // If still signed in, assume org status is fine and render children immediately
      console.log(`ProtectedRoute (${location.pathname}): Subsequent render, skipping full checks.`);
      return <>{children}</>;
    }
  }; // End of ProtectedRoute component definition

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

  // PublicRoute helper (keep this)
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { isSignedIn } = useAuth();
    if (isSignedIn) {
      return <Navigate to="/" replace />;
    }
    return <ClearRedirects>{children}</ClearRedirects>; 
  };
  
  return (
    <Router>
      <NavigationSetup>
        {!isLoaded ? (
          // Show top-level loading spinner while Clerk initializes
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          // Clerk is loaded, now render routing and modals
          <>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
              <Routes>
                {/* Public routes */}
                <Route path="/sign-in" element={<PublicRoute><SignIn /></PublicRoute>} />
                <Route path="/sign-up" element={<PublicRoute><SignUp /></PublicRoute>} />

                {/* Special case: Organization creation doesn't require an existing org */}
                <Route 
                  path="/organizations/new" 
                  element={
                    <ProtectedRoute requiresOrg={false}>
                      <MinimalLayout>
                        <CreateOrganization />
                      </MinimalLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Routes requiring authentication AND organization */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Home />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/employees" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Employees />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/teams" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Teams />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/meetings" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <MeetingsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/meetings/:meetingId" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <MeetingDetailPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Reports />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Settings />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/employees/:id" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Employees />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/reports/team-performance" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
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
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
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
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
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
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
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
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
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
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <Suspense fallback={<div>Loading...</div>}>
                          <EmployeesAtRisk />
                        </Suspense>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                {/* Catch-all for authenticated users - Render 404 within layout */}
                <Route 
                  path="*" 
                  element={
                    <ProtectedRoute>
                      <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                        <div className="text-center py-10">
                          <h2 className="text-2xl font-semibold mb-2">404 - Page Not Found</h2>
                          <p className="text-gray-600 mb-4">Sorry, the page you are looking for does not exist.</p>
                          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">Go to Home</Link>
                        </div>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            {renderSearchModal()}
          </>
        )}
      </NavigationSetup>
    </Router>
  )
}

export default App
