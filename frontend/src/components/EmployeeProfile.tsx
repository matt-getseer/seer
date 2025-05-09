import { memo } from 'react';
import Flag from 'react-world-flags';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useEmployee, useEmployeeMeetings } from '../hooks/useQueryHooks';
import { ArrowLeft, EnvelopeSimple, Phone, Calendar, MapPin, Building, WarningCircle } from '@phosphor-icons/react';

// Mock data for historical performance - would come from API in real implementation
const mockAnalysisHistory = [
  { month: 'Jan', healthScore: 72, technical: 68, communication: 75, teamwork: 73 },
  { month: 'Feb', healthScore: 74, technical: 70, communication: 75, teamwork: 77 },
  { month: 'Mar', healthScore: 75, technical: 72, communication: 77, teamwork: 76 },
  { month: 'Apr', healthScore: 79, technical: 75, communication: 80, teamwork: 82 },
  { month: 'May', healthScore: 76, technical: 74, communication: 78, teamwork: 76 },
  { month: 'Jun', healthScore: 81, technical: 78, communication: 83, teamwork: 82 },
  { month: 'Jul', healthScore: 83, technical: 81, communication: 84, teamwork: 84 },
  { month: 'Aug', healthScore: 85, technical: 86, communication: 85, teamwork: 84 },
  { month: 'Sep', healthScore: 87, technical: 88, communication: 86, teamwork: 87 },
  { month: 'Oct', healthScore: 88, technical: 90, communication: 86, teamwork: 88 },
  { month: 'Nov', healthScore: 91, technical: 92, communication: 89, teamwork: 92 },
  { month: 'Dec', healthScore: 93, technical: 94, communication: 91, teamwork: 94 },
];

// Mock radar data
const mockCurrentSkillsData = [
  { skill: 'Technical', value: 94 },
  { skill: 'Communication', value: 91 },
  { skill: 'Leadership', value: 85 },
  { skill: 'Problem Solving', value: 92 },
  { skill: 'Teamwork', value: 94 },
  { skill: 'Adaptability', value: 88 },
];

// Mock strengths
const mockStrengths = [
  "Exceptional technical knowledge in system architecture",
  "Clear and effective communication with stakeholders",
  "Strong team collaboration and knowledge sharing",
  "Proactive problem-solving approach",
  "Consistently delivers high-quality work on schedule"
];

// Mock support areas
const mockSupportAreas = [
  "Could benefit from more leadership opportunities",
  "Additional mentoring on project management methodologies",
  "Room for growth in strategic planning skills"
];

// Mock recommendations
const mockRecommendations = [
  "Enroll in the Advanced Leadership Program",
  "Schedule monthly mentoring sessions with Tech Director",
  "Lead the upcoming architecture review meeting",
  "Consider cross-training with the Product team"
];

// New Mock Data for additional sections
const mockActionItems = Array(5).fill("MOCKDATA");
const mockNewStrengths = Array(5).fill("MOCKDATA");
const mockNewAreasForSupport = Array(5).fill("MOCKDATA");

// Define Meeting type locally for this component (can be moved to a shared types file later)
interface Meeting {
  id: number;
  title: string | null;
  scheduledTime: string; // ISO string
  platform: string | null;
  status: string;
  // Add other fields if needed
}

interface EmployeeProfileProps {
  employeeId: number;
  onClose: () => void;
}

// Helper function to convert country name to ISO code
const getCountryCode = (countryName: string | null | undefined): string => {
  if (!countryName) return '';
  
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'USA': 'US',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Canada': 'CA',
    'Germany': 'DE',
    'France': 'FR',
    'Spain': 'ES',
    'Italy': 'IT',
    'Japan': 'JP',
    'Australia': 'AU',
    'Brazil': 'BR',
    'India': 'IN',
    'China': 'CN',
    'Mexico': 'MX',
    'Netherlands': 'NL',
    'Sweden': 'SE',
    'Singapore': 'SG'
  };
  
  return countryMap[countryName] || '';
};

// Loading state component
const ProfileLoadingState = memo(() => (
  <div className="flex justify-center items-center h-64 p-6">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
));

// Error state component
const ProfileErrorState = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-2">Error Loading Employee</h3>
    <p className="mb-4">{message}</p>
    <button 
      onClick={onRetry}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Retry
    </button>
  </div>
));

// Employee profile content component to reduce re-renders
const EmployeeProfileContent = memo(({ employee, onClose }: {
  employee: any;
  onClose: () => void;
}) => {
  const navigate = useNavigate();

  // Fetch meetings for this employee
  const { 
    data: meetings = [], // Default to empty array
    isLoading: meetingsLoading, 
    error: meetingsError 
  } = useEmployeeMeetings<Meeting[]>(employee.id);

  // Helper function to format meeting date/time
  const formatMeetingTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'PPpp'); // Format like "Sep 14, 2021, 5:30:00 PM"
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  // Helper to get status badge class
  const getStatusBadgeClass = (status: string) => {
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800';
    if (status.startsWith('ERROR')) return 'bg-red-100 text-red-800';
    if (status === 'SCHEDULED' || status === 'PENDING_BOT_INVITE' || status === 'BOT_INVITED') return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800'; // Default/pending
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center">
        <button
          onClick={onClose}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Employee Profile</h1>
      </div>
      
      {/* Profile header */}
      <div className="bg-white border border-gray-200 overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{employee.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
            {employee.team && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {employee.team.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Profile details */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <EnvelopeSimple className="mr-2 text-gray-400" size={18} />
                Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.email}</dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Phone className="mr-2 text-gray-400" size={18} />
                Phone
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.phone || 'Not provided'}</dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="mr-2 text-gray-400" size={18} />
                Start Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.startDate 
                  ? new Date(employee.startDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Not provided'}
              </dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Building className="mr-2 text-gray-400" size={18} />
                Department
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.team ? employee.team.department : 'Not assigned'}
              </dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <MapPin className="mr-2 text-gray-400" size={18} />
                Country
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.country ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 h-10 w-10 overflow-hidden rounded-full border border-gray-200">
                      <Flag code={getCountryCode(employee.country)} className="h-full w-full" />
                    </div>
                    <span className="truncate">{employee.country}</span>
                  </div>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <MapPin className="mr-2 text-gray-400" size={18} />
                Location
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.location || 'Not provided'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* User-modified Strengths and Areas for Support block (Action Items removed, grid is md:grid-cols-2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Strengths (New Style) */}
        <div className="bg-white border border-gray-200 sm:rounded-lg">
          <div className="px-4 pt-5 pb-0 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Strengths</h3>
          </div>
          <div className="px-4 py-5 sm:px-6">
            {mockNewStrengths.length > 0 ? (
              <div className="">
                <ul className="space-y-2">
                  {mockNewStrengths.map((item, index) => (
                    <li key={index} className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-gray-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-gray-500 italic text-sm">No strengths identified.</p>
            )}
          </div>
        </div>

        {/* Areas for Support (New Style) */}
        <div className="bg-white border border-gray-200 sm:rounded-lg">
          <div className="px-4 pt-5 pb-0 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Areas for Support</h3>
          </div>
          <div className="px-4 py-5 sm:px-6">
            {mockNewAreasForSupport.length > 0 ? (
              <div className="">
                <ul className="space-y-2">
                  {mockNewAreasForSupport.map((item, index) => (
                    <li key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-gray-500 italic text-sm">No areas for support identified.</p>
            )}
          </div>
        </div>
      </div>
      {/* End of "Areas for Support (New Style)" card */}

      {/* Meetings Section (MOVED HERE) */}
      <div className="bg-white border border-gray-200 sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Meetings</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Recent meetings involving this employee.
          </p>
        </div>
        <div className="border-t border-gray-200">
          {/* Meetings List - Mimics MeetingsPage table styling within a div/list */}
          <div className="overflow-x-auto">
            {meetingsLoading ? (
              <div className="px-6 py-4 text-sm text-gray-500 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                Loading meetings...
              </div>
            ) : meetingsError ? (
              <div className="px-6 py-4 text-sm text-red-600 bg-red-50 flex items-center">
                 <WarningCircle size={20} className="mr-2 text-red-400" />
                 Error loading meetings: {(meetingsError as Error).message || 'Unknown error'}
              </div>
            ) : meetings.length === 0 ? (
               <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                 No meetings found for this employee.
               </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {meetings.map((meeting) => (
                  <li
                    key={meeting.id}
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer grid grid-cols-6 gap-4 items-center"
                  >
                    {/* Title (wider column) */}
                    <div className="col-span-2 text-sm font-medium text-gray-900 truncate" title={meeting.title || '-'}>
                       {meeting.title || '-'}
                    </div>
                    {/* Date/Time */}
                    <div className="col-span-2 text-sm text-gray-500 whitespace-nowrap">
                       {formatMeetingTime(meeting.scheduledTime)}
                    </div>
                    {/* Platform */}
                    <div className="col-span-1 text-sm text-gray-500 truncate" title={meeting.platform || '-'}>
                       {meeting.platform || '-'}
                    </div>
                     {/* Status Badge */}
                    <div className="col-span-1 text-sm text-gray-500 whitespace-nowrap text-right">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </li>
                ))} 
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* End of Meetings Section */}

    </div>
  );
});

const EmployeeProfile = ({ employeeId, onClose }: EmployeeProfileProps) => {
  const { data: employee, isLoading, error, refetch } = useEmployee(employeeId);

  if (isLoading) {
    return <ProfileLoadingState />;
  }

  if (error) {
    return <ProfileErrorState message={(error as Error).message || "Failed to load employee data."} onRetry={refetch} />;
  }

  if (!employee) {
    return <div className="text-center p-6">Employee not found.</div>; 
  }

  return <EmployeeProfileContent employee={employee} onClose={onClose} />;
};

export default EmployeeProfile;