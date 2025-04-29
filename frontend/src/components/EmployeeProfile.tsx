import { useState, useEffect, memo, useCallback } from 'react';
import { employeeService, interviewService } from '../api/client';
import Flag from 'react-world-flags';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useEmployee } from '../hooks/useQueryHooks';
import { ArrowLeft, EnvelopeSimple, Phone, Calendar, MapPin, Building } from '@phosphor-icons/react';

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
  <div className="bg-white rounded-lg shadow p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    </div>
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
}) => (
  <div className="space-y-6">
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
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
              <Flag className="mr-2 text-gray-400" size={18} />
              Country
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{employee.country || 'Not provided'}</dd>
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
    
    {/* Additional sections can be added here */}
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Latest interviews and feedback
        </p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        {/* This would be populated with real data in a full implementation */}
        <div className="text-sm text-gray-500">No recent activity to display</div>
      </div>
    </div>
  </div>
));

const EmployeeProfile = ({ employeeId, onClose }: EmployeeProfileProps) => {
  // Use React Query to fetch employee data
  const { 
    data: employee, 
    isLoading, 
    error, 
    refetch 
  } = useEmployee(employeeId);

  // Handle retry when error occurs
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return <ProfileLoadingState />;
  }

  // Show error state
  if (error || !employee) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Could not load employee data. Please try again.';
    
    return <ProfileErrorState message={errorMessage} onRetry={handleRetry} />;
  }

  // Show profile
  return <EmployeeProfileContent employee={employee} onClose={onClose} />;
};

export default memo(EmployeeProfile);