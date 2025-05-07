import { Link, NavLink } from 'react-router-dom'
import { memo, useCallback } from 'react'
import {
  House,
  ChartLine,
  Users,
  Gear,
  ChatCircle,
  UsersThree,
  MagnifyingGlass,
  CaretDoubleLeft,
  CaretDoubleRight,
  Spinner
} from '@phosphor-icons/react'
import { UserButton, useUser } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext'

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

// Memoized NavLink component that will render consistently
const NavLinkItem = memo(({ 
  to, 
  title, 
  isCollapsed, 
  icon: Icon, 
  label 
}: { 
  to: string; 
  title: string; 
  isCollapsed: boolean; 
  icon: React.ComponentType<any>;
  label: string;
}) => {
  return (
    <NavLink 
      to={to} 
      end={to === '/'}
      className={({ isActive }) => 
        `flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
          isActive 
            ? 'text-gray-900 bg-gray-200 border-l-2 border-gray-900' 
            : 'text-gray-900 hover:bg-gray-200 hover:text-gray-900'
        }`
      }
      title={title}
    >
      <Icon className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
      {!isCollapsed && <span className="transition-opacity duration-200 ease-in-out">{label}</span>}
    </NavLink>
  );
});

const Sidebar = memo(({ onSearchClick, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
  const { user: clerkUser } = useUser();
  const { currentUser, isLoadingUser } = useAppContext();

  const toggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    }
  }, [onToggleCollapse, isCollapsed]);

  if (isLoadingUser) {
    return (
      <aside className={`bg-[#f4f4f5] fixed h-screen flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-sidebar'} items-center justify-center`}>
        <Spinner size={32} className="animate-spin text-indigo-600" />
      </aside>
    );
  }

  const userRole = currentUser?.role || null;

  return (
    <aside className={`bg-[#f4f4f5] fixed h-screen flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-sidebar'}`}>
      <div className={`h-16 flex items-center transition-all duration-300 ease-in-out ${isCollapsed ? 'justify-center' : 'px-4 justify-between'}`}>
        {!isCollapsed && (
          <Link to="/" className="flex items-center space-x-2 transition-opacity duration-300 ease-in-out pl-2 pt-4">
            <img 
              src="/seer_logo_black.svg" 
              alt="Seer Logo" 
              className="h-8 w-auto"
            />
          </Link>
        )}
        <button
          onClick={toggleCollapse}
          className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded-md hover:bg-gray-200 transition-all duration-200 ease-in-out"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <CaretDoubleRight size={18} /> : <CaretDoubleLeft size={18} />}
        </button>
      </div>

      <nav className={`${isCollapsed ? 'p-2' : 'pt-8 px-4'} space-y-1 flex-1 overflow-y-auto transition-all duration-200 ease-in-out`}>
        <NavLinkItem 
          to="/"
          title="Home"
          isCollapsed={isCollapsed}
          icon={House}
          label="Home"
        />
        
        <button 
          onClick={onSearchClick}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-200 hover:text-gray-900 w-full transition-all duration-200 ease-in-out mb-4`}
          title="Search"
        >
          <MagnifyingGlass className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'}`} />
          {!isCollapsed && <span className="transition-opacity duration-200 ease-in-out">Search</span>}
        </button>
        
        <div className="pt-4">
          {!isCollapsed && (
            <div className="px-3 mb-2 transition-opacity duration-300 ease-in-out">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Workspace</h3>
            </div>
          )}
          
          <NavLinkItem 
            to="/meetings"
            title="Meetings"
            isCollapsed={isCollapsed}
            icon={ChatCircle}
            label="Meetings"
          />
          
          {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <>
              <NavLinkItem 
                to="/employees"
                title="Employees"
                isCollapsed={isCollapsed}
                icon={Users}
                label="Employees"
              />
              
              <NavLinkItem 
                to="/teams"
                title="Teams"
                isCollapsed={isCollapsed}
                icon={UsersThree}
                label="Teams"
              />
              
              <NavLinkItem 
                to="/reports"
                title="Reports"
                isCollapsed={isCollapsed}
                icon={ChartLine}
                label="Reports"
              />
            </>
          )}
          
          <NavLinkItem 
            to="/settings"
            title="Settings"
            isCollapsed={isCollapsed}
            icon={Gear}
            label="Settings"
          />
        </div>
      </nav>

      {/* User profile section at the bottom of sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full`}>
          <UserButton 
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {clerkUser?.fullName ?? 'Loading user...'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {clerkUser?.primaryEmailAddress?.emailAddress ?? ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

export default Sidebar; 