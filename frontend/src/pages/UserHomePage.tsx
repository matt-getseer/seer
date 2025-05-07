import React from 'react';
// import apiClient from '../api/client'; // No longer needed for direct fetch
import { format } from 'date-fns';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'; // Removed LineChart, Line
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { EnvelopeSimple, Phone, Calendar, /*MapPin,*/ Building, Spinner, WarningCircle, Users } from '@phosphor-icons/react'; // MapPin not used in current JSX
import { useAppContext, Meeting as AppContextMeeting } from '../context/AppContext'; // Keep AppContextMeeting import

// Removed unused/duplicated local types
// type EmployeeSelfProfile = { ... };
// interface Meeting { ... };

// Mock data (can be kept or removed if real data for these charts comes from employeeProfile)
const mockAnalysisHistory = [
  { month: 'Jan', healthScore: 72, technical: 68, communication: 75, teamwork: 73 },
  { month: 'Feb', healthScore: 74, technical: 70, communication: 75, teamwork: 77 },
  { month: 'Dec', healthScore: 93, technical: 94, communication: 91, teamwork: 94 },
];
const mockCurrentSkillsData = [
  { skill: 'Technical', value: 94 }, { skill: 'Communication', value: 91 }, { skill: 'Adaptability', value: 88 },
];
const mockStrengths = ["Exceptional technical knowledge"];
const mockSupportAreas = ["Could benefit from more leadership opportunities"];
const mockRecommendations = ["Enroll in the Advanced Leadership Program"];

const UserHomePage = () => {
  const { currentUser, isLoadingUser, errorLoadingUser } = useAppContext();

  console.log('[UserHomePage] isLoadingUser:', isLoadingUser);
  console.log('[UserHomePage] errorLoadingUser:', errorLoadingUser);
  console.log('[UserHomePage] currentUser object:', currentUser);
  if (currentUser) {
    console.log('[UserHomePage] currentUser.employeeProfile:', currentUser.employeeProfile);
  }

  // Remove internal state and useEffect for fetching data
  // const [userData, setUserData] = useState<CurrentUserData | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  // useEffect(() => { ... fetchUserData ... }, []);

  // Helper to format meeting time (from EmployeeProfile)
  const formatMeetingTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'PPpp');
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Helper to get status badge class (from EmployeeProfile)
  const getStatusBadgeClass = (status: string) => {
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800';
    if (status.startsWith('ERROR')) return 'bg-red-100 text-red-800';
    if (status === 'SCHEDULED' || status === 'PENDING_BOT_INVITE' || status === 'BOT_INVITED') return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };
  
  // const getCountryCode = (countryName: string | null | undefined): string => { ... };

  if (isLoadingUser) { // <-- Use isLoadingUser from context
    return (
      <div className="flex justify-center items-center h-64 p-6">
        <Spinner size={48} className="animate-spin text-indigo-600" />
        <p className="ml-3 text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  // Use errorLoadingUser and currentUser from context
  if (errorLoadingUser || !currentUser || !currentUser.employeeProfile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow max-w-md mx-auto">
        <div className="flex items-center mb-3">
          <WarningCircle size={24} className="mr-2" />
          <h3 className="text-lg font-semibold">Error Loading Profile</h3>
        </div>
        <p>{errorLoadingUser || 'Your employee profile could not be loaded. Please contact support if this issue persists.'}</p>
      </div>
    );
  }

  // Data comes from currentUser context
  const { employeeProfile, meetings } = currentUser;

  // ---- Start of EmployeeProfile.tsx like rendering ----
  // TODO: This section largely duplicates the structure and some logic from frontend/src/components/EmployeeProfile.tsx.
  // Consider refactoring to use the EmployeeProfile component directly or by extracting shared sub-components
  // to reduce code duplication and improve maintainability.
  // This section should mirror the JSX structure of EmployeeProfileContent
  // using `employeeProfile` and `meetings` data.

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header (Name, Title, Team) */}
      <div className="bg-white shadow-lg border border-gray-200 overflow-hidden sm:rounded-lg">
        <div className="px-6 py-5 sm:px-8 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {employeeProfile.name}!</h1>
            <p className="mt-1 text-lg text-indigo-600">{employeeProfile.title}</p>
          </div>
          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            {/* <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Active
            </span> */}
            {employeeProfile.team && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Users className="w-4 h-4 mr-1.5" /> {employeeProfile.team.name}
              </span>
            )}
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="border-t border-gray-200 px-6 py-5 sm:px-8">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <EnvelopeSimple className="mr-2 text-gray-400" size={18} /> Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{employeeProfile.email}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Phone className="mr-2 text-gray-400" size={18} /> Phone
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{employeeProfile.phone || 'Not provided'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="mr-2 text-gray-400" size={18} /> Start Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employeeProfile.startDate ? new Date(employeeProfile.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not provided'}
              </dd>
            </div>
            {employeeProfile.team && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Building className="mr-2 text-gray-400" size={18} /> Department
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{employeeProfile.team.department}</dd>
              </div>
            )}
            {/* Add Country field if getCountryCode and flag are to be used */}
          </dl>
        </div>
      </div>

      {/* Mock Data Sections (as in EmployeeProfile.tsx) */}
      {/* Health Score */}
      {employeeProfile.healthScore !== undefined && (
        <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Health Score</h2>
          <p className="text-5xl font-bold text-indigo-600">{employeeProfile.healthScore} <span className="text-2xl text-gray-500">/ 100</span></p>
          {/* Potentially add more context or a small chart here if desired */}
        </div>
      )}

      {/* Historical Performance Chart */}
      <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={mockAnalysisHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="healthScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Health Score" />
            {/* Add other lines (technical, communication, teamwork) if desired */}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Current Skills Radar Chart */}
      <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Current Skills</h2>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockCurrentSkillsData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="skill" />
            {/* <PolarRadiusAxis /> // Optional: if you want radial numbers */}
            <Radar name={employeeProfile.name || "You"} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Strengths, Support Areas, Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Strengths</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {mockStrengths.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
        <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Support Areas</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {mockSupportAreas.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
        <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {mockRecommendations.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white shadow-lg border border-gray-200 sm:rounded-lg">
        <div className="px-6 py-5 sm:px-8">
          <h2 className="text-xl font-semibold text-gray-900">Your Meetings</h2>
        </div>
        {meetings && meetings.length > 0 ? (
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="p-4 hover:bg-gray-50 sm:px-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {meeting.title || 'Meeting'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatMeetingTime(meeting.scheduledTime)}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                  {/* Add link to meeting overview if available: e.g., <Link to={`/meetings/${meeting.id}`}>View</Link> */}
                  {meeting.platform && <p className="mt-1 text-sm text-gray-500">Platform: {meeting.platform}</p>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-6 py-5 sm:px-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">You have no meetings scheduled or recorded.</p>
          </div>
        )}
      </div>
      {/* ---- End of EmployeeProfile.tsx like rendering ---- */}
    </div>
  );
};

export default UserHomePage; 