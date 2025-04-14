import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { FolderIcon, UserGroupIcon, CreditCardIcon, UsersIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const menuItems = [
    { name: 'Surveys', icon: FolderIcon, path: '/surveys' },
    { name: 'Participants', icon: UserGroupIcon, path: '/participants' },
    { name: 'Billing', icon: CreditCardIcon, path: '/billing' },
    { name: 'Users', icon: UsersIcon, path: '/users' },
    { name: 'Settings', icon: Cog6ToothIcon, path: '/settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-56 bg-white shadow-lg">
      <div className="p-4">
        <div className="mb-12 mt-6">
          <img src="/CutOnce.png" alt="CutOnce Logo" className="h-6 w-auto ml-2" />
        </div>
        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`mb-2 flex items-center rounded-lg p-2 ${
                location.pathname === item.path || (location.pathname === '/' && item.path === '/surveys')
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-4 w-4 text-primary-900" />
              <span className="ml-3 text-sm font-medium text-gray-700">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200">
              <span className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-600">
                {user?.email?.[0].toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.email ?? 'User'}</p>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-primary-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 
