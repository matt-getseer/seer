import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CustomerSuccess from './pages/CustomerSuccess'
import Metrics from './pages/Metrics'
import Settings from './pages/Settings'
import QuarterlyReview from './pages/QuarterlyReview'
import EndToEndOnboarding from './pages/EndToEndOnboarding'

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex-1">
          <Navbar />
          <main className="p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/customer-success" element={<CustomerSuccess />} />
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/quarterly-review" element={<QuarterlyReview />} />
              <Route path="/end-to-end-onboarding" element={<EndToEndOnboarding />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
