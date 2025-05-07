import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react'
import { useAuth, useUser, useOrganization, Protect } from '@clerk/clerk-react'
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
import UserHomePage from './pages/UserHomePage'
import { setTokenGetter } from './api/client'
import CreateOrganization from '@/pages/organizations/CreateOrganization'
import MinimalLayout from './layouts/MinimalLayout'
import { AppProvider, useAppContext } from './context/AppContext'

// Lazy load report pages
const TeamPerformance = lazy(() => import('./pages/reports/TeamPerformance'))
const CoreCompetency = lazy(() => import('./pages/reports/CoreCompetency'))
const Engagement = lazy(() => import('./pages/reports/Engagement'))
const Sentiment = lazy(() => import('./pages/reports/Sentiment'))
const TopPerformer = lazy(() => import('./pages/reports/TopPerformer'))
const EmployeesAtRisk = lazy(() => import('./pages/reports/EmployeesAtRisk'))

// Lazy load meeting pages
const MeetingsPage = lazy(() => import('./pages/meetings'))
const MeetingOverviewPage = lazy(() => import('./pages/meetingoverview'))

// Navigation setup component
const NavigationSetup = memo(({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      console.log('[NavigationSetup] Clerk not loaded yet.');
      return;
    }
    console.log(`[NavigationSetup] Clerk loaded. isSignedIn: ${isSignedIn}`);

    // Create a stable token getter function that doesn't change on re-renders
    const stableTokenGetter = async () => {
      console.log('[stableTokenGetter] Attempting to get token...');
      if (!isSignedIn) {
        console.log('[stableTokenGetter] Not signed in according to useAuth, returning null.');
        return null;
      }
      try {
        const token = await getToken();
        if (token) {
          console.log('[stableTokenGetter] Token retrieved successfully (first 15 chars):', token.substring(0, 15) + '...');
        } else {
          console.log('[stableTokenGetter] getToken() returned null or undefined.');
        }
        return token;
      } catch (error) {
        console.error('[stableTokenGetter] Error calling getToken():', error);
        return null;
      }
    };

    setTokenGetter(stableTokenGetter);
    console.log('[NavigationSetup] Token getter has been set.');
  }, [isLoaded, isSignedIn, getToken]);

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
  const { isLoaded } = useUser();

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

// --- NEW: Component to handle organization check after sign-in ---
const OrganizationCheckWrapper = memo(({ children }: { children: React.ReactNode }) => {
  const { organization, isLoaded } = useOrganization();
  const location = useLocation();

  console.log('[OrganizationCheckWrapper] State:', { isLoaded, hasOrg: !!organization, pathname: location.pathname });

  if (!isLoaded) {
    console.log('[OrganizationCheckWrapper] Not loaded, showing spinner.');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // After loading, check if org exists and if we are not on the creation page
  if (!organization && location.pathname !== '/organizations/new') {
    console.log('[OrganizationCheckWrapper] No org and not on /organizations/new, redirecting to /organizations/new.');
    return <Navigate to="/organizations/new" replace />;
  }

  // If loaded and (organization exists OR we are on the creation page), render children
  console.log('[OrganizationCheckWrapper] Checks passed, rendering children.');
  return <>{children}</>;
});
// --- End NEW Component ---

// --- NEW: RoleProtect Component ---
interface RoleProtectProps {
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'USER'>;
  children: React.ReactNode;
}

const RoleProtect = ({ allowedRoles, children }: RoleProtectProps) => {
  const { currentUser, isLoadingUser } = useAppContext(); // <-- Use REAL useAppContext
  const location = useLocation();

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser || !currentUser.role || !allowedRoles.includes(currentUser.role)) {
    // Redirect to home page if role not allowed or no user
    // The home page (/) will then decide what to show based on role
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
// --- End RoleProtect Component ---

// NEW Component: Contains the main application logic previously in App
const AppRoutes = () => {
  // Move state hooks here
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState === 'true';
    }
    return false;
  });

  // Move auth and location hooks here
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const { currentUser, isLoadingUser } = useAppContext(); // <-- Use REAL useAppContext

  // Move logging useEffect here
  useEffect(() => {
    if (isLoaded) {
      // Log auth state and current path
      console.log('Auth state check:', { 
        pathname: location.pathname, 
        isSignedIn, 
        userId: user?.id 
      });
    }
  }, [isLoaded, isSignedIn, user, location.pathname]);

  // Move callback hooks here
  const handleSetSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, []);

  const handleSetSearchModalOpen = useCallback((open: boolean) => {
    setSearchModalOpen(open);
  }, []);

  // Move modal rendering here
  const renderSearchModal = useCallback(() => {
    return <SearchModal 
      isOpen={searchModalOpen}
      setIsOpen={handleSetSearchModalOpen}
      onOpen={() => handleSetSearchModalOpen(true)} 
    />;
  }, [searchModalOpen, handleSetSearchModalOpen]);

  // Return the previous content of App's return statement
  return (
    <NavigationSetup>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
        <Routes>
          {/* Routes visible only when signed OUT */}
          <Route 
            path="/sign-in" 
            element={
              <ClearRedirects><SignIn /></ClearRedirects>
            }
          />
          <Route 
            path="/sign-up" 
            element={
              <ClearRedirects><SignUp /></ClearRedirects>
            }
          />

          {/* Routes visible only when signed IN - Use Protect */}
          <Route 
            path="/*" // Match all other paths for signed-in users
            element={
              <Protect fallback={<Navigate to="/sign-in" replace />}> 
                {/* Search Modal makes sense only when signed in */} 
                {renderSearchModal()}
                
                {/* Check for organization before rendering main layouts/routes */}
                <OrganizationCheckWrapper>
                  <Routes> {/* Nested Routes for organization-dependent paths */}
                    {/* Org Creation: Special case handled by Org Check Wrapper */}
                    <Route 
                      path="/organizations/new" 
                      element={
                          <MinimalLayout> 
                            <CreateOrganization />
                          </MinimalLayout>
                      }
                    />
                    
                    {/* Main application routes requiring organization */}
                    <Route 
                      path="/" 
                      element={(
                        <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                          {isLoadingUser ? (
                            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
                          ) : currentUser && currentUser.role === 'USER' ? (
                            <UserHomePage />
                          ) : (
                            <Home /> // For ADMIN/MANAGER or if role is null/unexpected (though Protect should handle unauth)
                          )}
                        </MainLayout>
                      )}
                    />
                    <Route 
                      path="/employees" 
                      element={(
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <Employees />
                          </MainLayout>
                        </RoleProtect>
                      )}
                    />
                    <Route 
                      path="/employees/:id" 
                      element={
                        <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                          <Employees />
                        </MainLayout>
                      }
                    />
                    <Route 
                      path="/teams" 
                      element={(
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <Teams />
                          </MainLayout>
                        </RoleProtect>
                      )}
                    />
                    <Route 
                      path="/meetings"
                      element={(
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER', 'USER']}> {/* USER can see their own meetings list on UserHomePage, but this is for the general /meetings page if it exists for them */}
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <MeetingsPage />
                          </MainLayout>
                        </RoleProtect>
                      )}
                    />
                    <Route 
                      path="/meetings/:meetingId"
                      element={(
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER', 'USER']}> {/* USER can see their own meetings, so can view details */}
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <MeetingOverviewPage />
                          </MainLayout>
                        </RoleProtect>
                      )}
                    />
                    <Route 
                      path="/reports" 
                      element={(
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <Reports />
                          </MainLayout>
                        </RoleProtect>
                      )}
                    />
                    <Route 
                      path="/reports/team-performance" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <TeamPerformance />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/reports/core-competency" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <CoreCompetency />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/reports/engagement" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <Engagement />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/reports/sentiment" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <Sentiment />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/reports/top-performer" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <TopPerformer />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/reports/employees-at-risk" 
                      element={
                        <RoleProtect allowedRoles={['ADMIN', 'MANAGER']}>
                          <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                            <EmployeesAtRisk />
                          </MainLayout>
                        </RoleProtect>
                      }
                    />
                    <Route 
                      path="/settings" 
                      element={(
                        <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                          <Settings />
                        </MainLayout>
                      )}
                    />
                    
                    {/* Catch-all INSIDE organization check (user is signed in, has org) */}
                    <Route 
                      path="*" 
                      element={
                        <MainLayout sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetSidebarCollapsed} setSearchModalOpen={handleSetSearchModalOpen}>
                          <div className="text-center py-10">
                            <h2 className="text-2xl font-semibold mb-2">404 - Page Not Found</h2>
                            <p className="text-gray-600 mb-4">Sorry, the page you are looking for does not exist within your organization.</p>
                            <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">Go to Home</Link>
                          </div>
                        </MainLayout>
                      }
                    />
                  </Routes>
                </OrganizationCheckWrapper>
              </Protect>
            }
          />
        </Routes>
      </Suspense>
    </NavigationSetup>
  );
}

// Simplified App component
function App() {
  return (
    <Router>
      <AppProvider>
        <NavigationSetup>
          <ClearRedirects>
            <AppRoutes /> 
          </ClearRedirects>
        </NavigationSetup>
      </AppProvider>
    </Router>
  )
}

export default App
