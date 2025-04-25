import { FC, useEffect, useState } from 'react';
import { X, CaretRight, Warning, Lightbulb, CheckCircle, ChartBar, ChartLineUp, Clock } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

// Define notification types for type safety
type NotificationType = 'action' | 'insight' | 'reminder' | 'trend' | 'performance';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  date: string;
  employeeId?: number;
  employeeName?: string;
  interviewId?: number;
  teamId?: number;
  teamName?: string;
  isRead: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const NotificationCenter: FC<NotificationCenterProps> = ({ isOpen, onClose, onUnreadCountChange }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'actions' | 'insights'>('all');

  useEffect(() => {
    // Enhanced mock data focused on employee interviews and insights
    const mockNotifications: Notification[] = [
      {
        id: 1,
        type: 'action',
        title: 'Quarterly Review Needed',
        description: 'Sarah Johnson is due for a quarterly review based on recent interview feedback.',
        date: '2023-10-15',
        employeeId: 101,
        employeeName: 'Sarah Johnson',
        interviewId: 201,
        isRead: false,
        priority: 'high',
      },
      {
        id: 2,
        type: 'insight',
        title: 'Development Opportunity',
        description: 'Michael Chen showed interest in leadership training during his last interview.',
        date: '2023-10-12',
        employeeId: 102,
        employeeName: 'Michael Chen',
        interviewId: 202,
        isRead: false,
        priority: 'medium',
      },
      {
        id: 3,
        type: 'action',
        title: 'Performance Concern',
        description: 'Feedback for Alex Williams suggests potential burnout. Consider scheduling a check-in.',
        date: '2023-10-10',
        employeeId: 103,
        employeeName: 'Alex Williams',
        interviewId: 203,
        isRead: true,
        priority: 'high',
      },
      {
        id: 4,
        type: 'trend',
        title: 'Team Satisfaction Trend',
        description: 'Recent interviews show increased satisfaction in the Engineering team.',
        date: '2023-10-08',
        teamId: 5,
        teamName: 'Engineering',
        isRead: false,
        priority: 'medium',
      },
      {
        id: 5,
        type: 'reminder',
        title: 'Interview Follow-up',
        description: 'Follow-up actions from Jessica Miller\'s interview are due tomorrow.',
        date: '2023-10-05',
        employeeId: 104,
        employeeName: 'Jessica Miller',
        interviewId: 204,
        isRead: false,
        priority: 'medium',
      },
      {
        id: 6,
        type: 'performance',
        title: 'Performance Improvement',
        description: 'David Lee has shown significant improvement since his last review cycle.',
        date: '2023-10-03',
        employeeId: 105,
        employeeName: 'David Lee',
        isRead: false,
        priority: 'low',
      },
      {
        id: 7,
        type: 'trend',
        title: 'Interview Insight Pattern',
        description: 'Multiple employees have mentioned work-life balance concerns in recent interviews.',
        date: '2023-10-01',
        teamId: 3,
        teamName: 'Product',
        isRead: true,
        priority: 'high',
      },
      {
        id: 8,
        type: 'action',
        title: 'Onboarding Review',
        description: 'New hire Emily Watson completed her 90-day period. Schedule a review interview.',
        date: '2023-09-28',
        employeeId: 106,
        employeeName: 'Emily Watson',
        isRead: false,
        priority: 'medium',
      },
      {
        id: 9,
        type: 'insight',
        title: 'Training Need Identified',
        description: 'Multiple team members from Design expressed interest in UX research training.',
        date: '2023-09-25',
        teamId: 4,
        teamName: 'Design',
        isRead: true,
        priority: 'low',
      },
    ];

    // Simulate API fetch
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
      
      // Report initial unread count to parent
      const initialUnreadCount = mockNotifications.filter(n => !n.isRead).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(initialUnreadCount);
      }
    }, 500);
  }, [onUnreadCountChange]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange && !loading) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange, loading]);

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type and available IDs
    if (notification.employeeId) {
      // If there's an interview ID, navigate to the specific interview
      if (notification.interviewId) {
        navigate(`/employees/${notification.employeeId}/interviews/${notification.interviewId}`);
      } else {
        // Otherwise just navigate to the employee profile
        navigate(`/employees/${notification.employeeId}`);
      }
    } else if (notification.teamId) {
      // Navigate to team page if it's team-related
      navigate(`/teams/${notification.teamId}`);
    }
    
    onClose();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'actions') return notification.type === 'action' || notification.type === 'reminder';
    if (activeTab === 'insights') return notification.type === 'insight' || notification.type === 'trend' || notification.type === 'performance';
    return true;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'action':
        return <Warning weight="fill" className="h-5 w-5 text-amber-500" />;
      case 'insight':
        return <Lightbulb weight="fill" className="h-5 w-5 text-blue-500" />;
      case 'reminder':
        return <Clock weight="fill" className="h-5 w-5 text-green-500" />;
      case 'trend':
        return <ChartLineUp weight="fill" className="h-5 w-5 text-purple-500" />;
      case 'performance':
        return <ChartBar weight="fill" className="h-5 w-5 text-indigo-500" />;
      default:
        return <CheckCircle weight="fill" className="h-5 w-5 text-green-500" />;
    }
  };

  // Get priority styling
  const getPriorityStyle = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-green-500';
      default:
        return '';
    }
  };

  // If not open, don't render
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Notification panel */}
      <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">{unreadCount} unread</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-white text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'actions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'insights'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Insights
            </button>
          </nav>
        </div>
        
        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                  {[1, 2, 3].map(item => (
                    <div key={item} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <ul className="space-y-4">
              {filteredNotifications.map((notification) => (
                <li 
                  key={notification.id}
                  className={`
                    p-4 border rounded-lg shadow-sm cursor-pointer
                    ${notification.isRead ? 'bg-white' : 'bg-blue-50'}
                    ${getPriorityStyle(notification.priority)}
                    hover:bg-gray-50 transition duration-150
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 flex items-center">
                        {notification.title}
                        {notification.priority === 'high' && !notification.isRead && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High priority
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {notification.employeeName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            {notification.employeeName}
                          </span>
                        )}
                        {notification.teamName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Team: {notification.teamName}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <span>{new Date(notification.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-2">
                      <CaretRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No notifications to display
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={markAllAsRead}
            className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
          >
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter; 