import { useState, useEffect } from 'react';
import { employeeService, interviewService } from '../api/client';
import Flag from 'react-world-flags';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

type Employee = {
  id: number;
  name: string;
  title: string;
  email: string;
  startDate: string;
  country?: string;
  interviewCount?: number;
  team?: {
    id: number;
    name: string;
    department: string;
  };
  healthScore?: number; // Overall score from 0-100
};

type Interview = {
  id: number;
  name: string;
  team: string;
  interviewName: string;
  dateTaken: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
};

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

interface EmployeeProfileProps {
  employeeId: number | null;
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

const EmployeeProfile = ({ employeeId, onClose }: EmployeeProfileProps) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [timelineView, setTimelineView] = useState('Year'); // 'Year', 'Quarter', 'Month'
  const navigate = useNavigate();

  useEffect(() => {
    if (employeeId) {
      setLoading(true);
      setError('');
      
      employeeService.getEmployeeById(employeeId)
        .then(response => {
          setEmployee(response.data);
        })
        .catch(err => {
          console.error('Error fetching employee:', err);
          setError('Failed to load employee details. Please try again.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [employeeId]);

  // Fetch all interviews and filter for this employee
  useEffect(() => {
    if (employee?.name) {
      interviewService.getAllInterviews()
        .then(response => {
          // Filter interviews for this employee by name match
          const employeeInterviews = response.data.filter(
            (interview: Interview) => interview.name.toLowerCase() === employee.name.toLowerCase()
          );
          setInterviews(employeeInterviews);
        })
        .catch(err => {
          console.error('Error fetching interviews:', err);
        });
    }
  }, [employee]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const handleViewInterview = (id: number) => {
    navigate(`/interviews/${id}`);
  };

  if (!employeeId) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Employee Profile
            </h2>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Employees
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-gray-500">Loading employee details...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : employee ? (
          <div className="px-6 py-6">
            {/* Employee Basic Info */}
            <div className="flex flex-col lg:flex-row mb-8">
              <div className="lg:w-1/3 mb-6 lg:mb-0 flex flex-col items-center">
                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <span className="text-4xl font-semibold text-gray-600">
                    {employee.name.split(' ').map(name => name[0]).join('')}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{employee.name}</h3>
                <p className="text-lg text-gray-600">{employee.title}</p>
                {employee.team && (
                  <div className="mt-3 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {employee.team.name} • {employee.team.department}
                    </span>
                  </div>
                )}
                
                {/* Overall Health Score */}
                <div className="mt-6 w-full max-w-xs">
                  <div className="text-center mb-2">
                    <span className="text-sm font-medium text-gray-500">Overall Health Score</span>
                    <div className="flex items-center justify-center mt-1">
                      <span className="text-3xl font-bold text-indigo-600">93</span>
                      <span className="ml-2 text-sm font-medium text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586l3.293-3.293A1 1 0 0112 7z" clipRule="evenodd" />
                        </svg>
                        +5
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-indigo-600 h-3 rounded-full" style={{ width: '93%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="lg:w-2/3 lg:pl-8 lg:border-l lg:border-gray-200">
                {/* Basic employee info */}
                <dl className="divide-y divide-gray-200">
                  <div className="py-4 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{employee.email}</dd>
                  </div>
                  <div className="py-4 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {new Date(employee.startDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </dd>
                  </div>
                  {employee.country && (
                    <div className="py-4 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">Country</dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        <div className="flex items-center">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 mr-3">
                            <Flag code={getCountryCode(employee.country)} className="h-full w-full object-cover" />
                          </div>
                          <span>{employee.country}</span>
                        </div>
                      </dd>
                    </div>
                  )}
                  <div className="py-4 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Interviews/Check-ins</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {interviews.length || 0}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Interview Timeline */}
            {interviews.length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-8 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Interview Timeline</h3>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute h-full w-0.5 bg-gray-200 left-5 top-0"></div>
                  
                  {/* Timeline Events */}
                  <div className="space-y-16">
                    {interviews
                      .sort((a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime())
                      .map((interview, index) => {
                        // Calculate a color based on health score for visual variety
                        const score = mockAnalysisHistory[index % 12].healthScore;
                        const colorClass = score >= 90 ? 'bg-green-500' : 
                                          score >= 80 ? 'bg-green-400' : 
                                          score >= 70 ? 'bg-yellow-500' : 
                                          score >= 60 ? 'bg-orange-500' : 'bg-red-500';
                        
                        return (
                          <div key={interview.id} className="relative">
                            {/* Time Marker with Hover Details */}
                            <div className="group relative">
                              {/* Timeline Dot & Date - Always Visible */}
                              <div className="flex items-center relative">
                                {/* Timeline Dot */}
                                <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-white ${colorClass} flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110`}>
                                  <span className="text-white text-sm font-medium">{score}</span>
                                </div>
                                
                                {/* Event Date */}
                                <div className="ml-8">
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatDate(interview.dateTaken)}
                                  </span>
                                  <span className="ml-3 text-sm font-medium text-gray-500">
                                    {interview.interviewName}
                                  </span>
                                </div>
                                
                                {/* View Details Button - Always Visible */}
                                <button 
                                  onClick={() => handleViewInterview(interview.id)}
                                  className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none"
                                >
                                  View
                                </button>
                              </div>
                              
                              {/* Hover Details */}
                              <div className="absolute left-14 top-0 mt-10 w-full max-w-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-md font-semibold text-gray-900">{interview.interviewName}</h4>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Team: {interview.team}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Key Strengths:</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {mockStrengths.slice(0, (index % 3) + 2).map((strength, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          {strength.split(' ').slice(0, 2).join(' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Areas for Support:</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {mockSupportAreas.slice(0, (index % 2) + 1).map((area, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                          {area.split(' ').slice(0, 3).join(' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-2 text-right">
                                    <button 
                                      onClick={() => handleViewInterview(interview.id)}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                    >
                                      View Full Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Performance Over Time Chart */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Performance Over Time</h3>
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setTimelineView('Year')}
                    className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${timelineView === 'Year' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-700'}`}
                  >
                    Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineView('Quarter')}
                    className={`relative inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${timelineView === 'Quarter' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-700'}`}
                  >
                    Quarter
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineView('Month')}
                    className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-t border-b border-r border-gray-300 text-sm font-medium ${timelineView === 'Month' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-700'}`}
                  >
                    Month
                  </button>
                </div>
              </div>
              
              {/* Performance Chart */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockAnalysisHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="healthScore" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.1} name="Overall Health" />
                    <Area type="monotone" dataKey="technical" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Technical" />
                    <Area type="monotone" dataKey="communication" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} name="Communication" />
                    <Area type="monotone" dataKey="teamwork" stroke="#EC4899" fill="#EC4899" fillOpacity={0.1} name="Teamwork" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Current Skills & Insights */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Skills Radar Chart */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-4">Current Skills Assessment</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} data={mockCurrentSkillsData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <Radar name="Skills" dataKey="value" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Strengths */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-4">Strengths</h3>
                <ul className="space-y-3">
                  {mockStrengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                        <svg className="h-3.5 w-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Support Areas */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-4">Areas for Support</h3>
                <ul className="space-y-3">
                  {mockSupportAreas.map((area, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center mr-2">
                        <svg className="h-3.5 w-3.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Recommendations & Action Items */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Actions</h3>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <ul className="space-y-4">
                  {mockRecommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                        <span className="text-indigo-600 text-sm font-medium">{index + 1}</span>
                      </span>
                      <div>
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Interview/Check-in History */}
            {interviews.length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Check-in History</h3>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                        <th className="px-4 py-3 bg-gray-50"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interviews.map((interview, index) => (
                        <tr key={interview.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(interview.dateTaken)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{interview.interviewName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {mockAnalysisHistory[index % 12].healthScore}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                            {index > 0 && (
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586l3.293-3.293A1 1 0 0112 7z" clipRule="evenodd" />
                                </svg>
                                +{mockAnalysisHistory[index % 12].healthScore - mockAnalysisHistory[(index - 1) % 12].healthScore}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleViewInterview(interview.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-gray-500">No employee details found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;