import { useState, useEffect } from 'react';
import { employeeService } from '../api/client';
import Flag from 'react-world-flags';

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
};

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
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-1/3 mb-6 sm:mb-0 flex flex-col items-center">
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
              </div>
              
              <div className="sm:w-2/3 sm:pl-8 sm:border-l sm:border-gray-200">
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
                    <dt className="text-sm font-medium text-gray-500">Interviews</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {employee.interviewCount || 0}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
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