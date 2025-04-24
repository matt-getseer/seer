import { Link, NavLink } from 'react-router-dom'
import {
  House,
  ChartLine,
  Users,
  Gear,
  ClockCounterClockwise,
  Bug,
  ChatCircle,
  UsersThree,
  MagnifyingGlass
} from '@phosphor-icons/react'

interface SidebarProps {
  onSearchClick: () => void;
}

const Sidebar = ({ onSearchClick }: SidebarProps) => {
  return (
    <aside className="w-sidebar bg-gray-50 border-r border-gray-200">
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold">S</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Seer</span>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => 
            `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              isActive 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <House className="mr-3 h-5 w-5" />
          Home
        </NavLink>
        
        <button 
          onClick={onSearchClick}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 w-full"
        >
          <MagnifyingGlass className="mr-3 h-5 w-5" />
          Search
        </button>
        
        <div className="pt-4">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Workspace</h3>
          </div>
          
          <NavLink 
            to="/interviews"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <ChatCircle className="mr-3 h-5 w-5" />
            Interviews
          </NavLink>

          <NavLink 
            to="/employees"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Users className="mr-3 h-5 w-5" />
            Employees
          </NavLink>
          
          <NavLink 
            to="/teams"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <UsersThree className="mr-3 h-5 w-5" />
            Teams
          </NavLink>
          
          <NavLink 
            to="/metrics"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <ChartLine className="mr-3 h-5 w-5" />
            Metrics
          </NavLink>
          
          <NavLink 
            to="/settings"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Gear className="mr-3 h-5 w-5" />
            Settings
          </NavLink>
        </div>

        <div className="pt-4">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Favourites</h3>
          </div>
          
          <NavLink 
            to="/quarterly-review"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <ClockCounterClockwise className="mr-3 h-5 w-5" />
            Quarterly review
          </NavLink>
          
          <NavLink 
            to="/end-to-end-onboarding"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Bug className="mr-3 h-5 w-5" />
            End-to-end onboarding
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar 