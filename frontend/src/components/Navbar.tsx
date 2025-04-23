import { MagnifyingGlass, Bell, Question, SignOut } from '@phosphor-icons/react'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../api/client'

const Navbar: FC = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    // Dispatch custom event for auth state change
    window.dispatchEvent(new Event('auth-state-change'))
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlass className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Search"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-1.5 text-gray-500 hover:text-gray-600">
              <Question className="h-5 w-5" />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-600 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 transform translate-x-1/2 -translate-y-1/2"></span>
            </button>
            <div className="flex items-center space-x-3">
              <img
                className="h-8 w-8 rounded-full"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="User avatar"
              />
              <span className="text-sm font-medium text-gray-700">Test User</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-gray-600 flex items-center"
              title="Logout"
            >
              <SignOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 