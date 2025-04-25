import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import SearchModal from './components/SearchModal'
import Home from './pages/Home'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Interviews from './pages/Interviews'
import InterviewDetail from './pages/InterviewDetail'
import Employees from './pages/Employees'
import Teams from './pages/Teams'
import Login from './pages/Login'
import { isTokenValid } from './api/client'

// Lazy load report pages
const TeamPerformance = lazy(() => import('./pages/reports/TeamPerformance'))
const CoreCompetency = lazy(() => import('./pages/reports/CoreCompetency'))
const Engagement = lazy(() => import('./pages/reports/Engagement'))
const Sentiment = lazy(() => import('./pages/reports/Sentiment'))
const TopPerformer = lazy(() => import('./pages/reports/TopPerformer'))
const EmployeesAtRisk = lazy(() => import('./pages/reports/EmployeesAtRisk'))

// Route persistence wrapper component
const RoutePersistence = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Save route on change
  useEffect(() => {
    if (location.pathname !== '/login') {
      localStorage.setItem('lastRoute', location.pathname + location.search);
    }
  }, [location]);

  // Restore route on mount - only redirect if at root and logged in
  useEffect(() => {
    const lastRoute = localStorage.getItem('lastRoute');
    // Only redirect from root to lastRoute if logged in and at root path
    if (lastRoute && location.pathname === '/' && isTokenValid()) {
      navigate(lastRoute);
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Function to check authentication status
  const checkAuth = () => {
    const isValid = isTokenValid()
    
    if (isValid !== isAuthenticated) {
      setIsAuthenticated(isValid)
    }
    
    // Clear saved route if not authenticated
    if (!isValid) {
      localStorage.removeItem('lastRoute')
    }
  }
  
  // Check authentication on mount and periodically
  useEffect(() => {
    // Initial auth check
    checkAuth()
    
    // Add auth check when the component is mounted
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }
    
    // Listen for storage events (when token is added/removed)
    window.addEventListener('storage', checkAuth)
    
    // Check when tab becomes visible again
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Custom event for auth state changes within the same window
    window.addEventListener('auth-state-change', checkAuth)
    
    // Check token validity every minute to handle expirations
    const intervalId = setInterval(checkAuth, 60000)
    
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth-state-change', checkAuth)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [isAuthenticated])
  
  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    
    if (!isAuthenticated) {
      // Save the attempted URL for redirect after login
      if (location.pathname !== '/') {
        localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
      }
      return <Navigate to="/login" state={{ from: location }} replace />
    }
    
    return <>{children}</>
  }

  // Content layout with sidebar and navbar
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        onSearchClick={() => setSearchModalOpen(true)} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'pl-16' : 'pl-sidebar'}`}>
        <Navbar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )

  // Render search modal only when authenticated
  const renderSearchModal = () => {
    if (isAuthenticated) {
      return <SearchModal 
        isOpen={searchModalOpen}
        setIsOpen={setSearchModalOpen}
        onOpen={() => setSearchModalOpen(true)} 
      />;
    }
    return null;
  }

  return (
    <Router>
      <RoutePersistence>
        <Routes>
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports/team-performance" 
            element={
              <ProtectedRoute>
                <MainLayout>
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
                <MainLayout>
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
                <MainLayout>
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
                <MainLayout>
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
                <MainLayout>
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
                <MainLayout>
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
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/interviews" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Interviews />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/interviews/:id" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InterviewDetail />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Employees />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/employees/:employeeId" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Employees />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Teams />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Add a catch-all route for direct URL access */}
          <Route 
            path="*" 
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
        
        {/* Add SearchModal to enable CMD+K search throughout the app */}
        {renderSearchModal()}
      </RoutePersistence>
    </Router>
  )
}

export default App
