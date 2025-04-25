import { Link, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  House,
  ChartLine,
  Users,
  Gear,
  ChatCircle,
  UsersThree,
  MagnifyingGlass,
  CaretDoubleLeft,
  CaretDoubleRight
} from '@phosphor-icons/react'

interface SidebarProps {
  onSearchClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export const reportCategories = [
  { 
    name: 'Team Performance', 
    url: '/reports/team-performance',
    slug: 'team-performance'
  },
  { 
    name: 'Engagement', 
    url: '/reports/engagement',
    slug: 'engagement'
  },
  { 
    name: 'Sentiment', 
    url: '/reports/sentiment',
    slug: 'sentiment'
  },
  { 
    name: 'Core Competency', 
    url: '/reports/core-competency',
    slug: 'core-competency'
  },
  { 
    name: 'Top Performers', 
    url: '/reports/top-performers',
    slug: 'top-performers'
  },
  { 
    name: 'Employees at Risk', 
    url: '/reports/employees-at-risk',
    slug: 'employees-at-risk'
  }
]

const Sidebar = ({ onSearchClick, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(isCollapsed);

  // Use local storage to persist sidebar state
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      const parsedState = savedState === 'true';
      setCollapsed(parsedState);
      if (onToggleCollapse) {
        onToggleCollapse(parsedState);
      }
    }
  }, [onToggleCollapse]);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    if (onToggleCollapse) {
      onToggleCollapse(newState);
    }
  };

  return (
    <aside className={`bg-gray-50 border-r border-gray-200 fixed h-screen flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-sidebar'}`}>
      <div className={`h-16 flex items-center border-b border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'justify-center' : 'px-4 justify-between'}`}>
        {!collapsed && (
          <Link to="/" className="flex items-center space-x-2 transition-opacity duration-300 ease-in-out">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">S</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Seer</span>
          </Link>
        )}
        <button
          onClick={toggleCollapse}
          className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded-md hover:bg-gray-200 transition-all duration-200 ease-in-out"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <CaretDoubleRight size={18} /> : <CaretDoubleLeft size={18} />}
        </button>
      </div>

      <nav className={`${collapsed ? 'p-2' : 'p-4'} space-y-1 flex-1 overflow-y-auto transition-all duration-300 ease-in-out`}>
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => 
            `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
              isActive 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-gray-600 hover:bg-gray-100'
            }`
          }
          title="Home"
        >
          <House className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
          {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Home</span>}
        </NavLink>
        
        <button 
          onClick={onSearchClick}
          className={`flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 w-full transition-all duration-300 ease-in-out`}
          title="Search"
        >
          <MagnifyingGlass className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
          {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Search</span>}
        </button>
        
        <div className="pt-4">
          {!collapsed && (
            <div className="px-3 mb-2 transition-opacity duration-300 ease-in-out">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Workspace</h3>
            </div>
          )}
          
          <NavLink 
            to="/interviews"
            className={({ isActive }) => 
              `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title="Interviews"
          >
            <ChatCircle className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
            {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Interviews</span>}
          </NavLink>

          <NavLink 
            to="/employees"
            className={({ isActive }) => 
              `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title="Employees"
          >
            <Users className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
            {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Employees</span>}
          </NavLink>
          
          <NavLink 
            to="/teams"
            className={({ isActive }) => 
              `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title="Teams"
          >
            <UsersThree className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
            {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Teams</span>}
          </NavLink>
          
          <NavLink 
            to="/reports"
            className={({ isActive }) => 
              `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title="Reports"
          >
            <ChartLine className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
            {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Reports</span>}
          </NavLink>
          
          <NavLink 
            to="/settings"
            className={({ isActive }) => 
              `flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title="Settings"
          >
            <Gear className={`transition-all duration-300 ease-in-out ${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
            {!collapsed && <span className="transition-opacity duration-300 ease-in-out">Settings</span>}
          </NavLink>
        </div>
      </nav>

      {/* User profile section at the bottom of sidebar */}
      <div className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <img
              className="h-8 w-8 rounded-full"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="User avatar"
            />
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 transform translate-x-1/4 translate-y-1/4 border border-white"></span>
          </div>
          {!collapsed && (
            <span className="ml-3 text-sm font-medium text-gray-700">Test User</span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 