import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Metrics from './pages/Metrics'
import Settings from './pages/Settings'
import QuarterlyReview from './pages/QuarterlyReview'
import EndToEndOnboarding from './pages/EndToEndOnboarding'
import Interviews from './pages/Interviews'
import Teams from './pages/Teams'
import Login from './pages/Login'
import { isTokenValid } from './api/client'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Function to check authentication status
  const checkAuth = () => {
    const isValid = isTokenValid()
    setIsAuthenticated(isValid)
  }
  
  // Check authentication on mount and periodically
  useEffect(() => {
    checkAuth()
    
    // Listen for storage events (when token is added/removed)
    window.addEventListener('storage', checkAuth)
    
    // Custom event for auth state changes within the same window
    window.addEventListener('auth-state-change', checkAuth)
    
    // Check token validity every minute to handle expirations
    const intervalId = setInterval(checkAuth, 60000)
    
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth-state-change', checkAuth)
      clearInterval(intervalId)
    }
  }, [])

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />
    }
    return <>{children}</>
  }

  // Content layout with sidebar and navbar
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )

  return (
    <Router>
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
          path="/metrics" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Metrics />
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
          path="/quarterly-review" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <QuarterlyReview />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/end-to-end-onboarding" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <EndToEndOnboarding />
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
          path="/teams" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Teams />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
