import { useState, useEffect } from 'react';
import { employeeService } from '../api/client';

type Employee = {
  id: number;
  name: string;
  title: string;
  email: string;
  startDate: string;
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

const EmployeeProfile = ({ employeeId, onClose }: EmployeeProfileProps) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (employeeId) {
      setLoading(true);
      setError('');
      setIsVisible(true);
      
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
    } else {
      setIsVisible(false);
    }
  }, [employeeId]);

  const handleClose = () => {
    setIsVisible(false);
    // Delay the actual closing to allow animation to complete
    setTimeout(() => {
      onClose();
    }, 300); // Match the transition duration
  };

  if (!employeeId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Overlay - when clicked it will close the sidebar */}
      <div 
        className={`fixed inset-0 bg-gray-600 transition-opacity duration-300 ease-in-out ${
          isVisible ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      ></div>
      
      {/* Sidebar panel */}
      <div 
        style={{ width: '560px' }}
        className={`relative ml-auto flex h-full flex-col overflow-y-auto bg-white py-6 shadow-xl transform transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Employee Profile
            </h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={handleClose}
            >
              <span className="sr-only">Close panel</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
            <div className="space-y-6">
              <div className="flex items-center justify-center flex-col">
                <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                  <span className="text-3xl font-semibold text-gray-600">
                    {employee.name.split(' ').map(name => name[0]).join('')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                <p className="text-gray-600">{employee.title}</p>
              </div>
              
              <div className="border-t border-gray-200 pt-5">
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
                  <div className="py-4 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Team</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{employee.team?.name || 'N/A'}</dd>
                  </div>
                  <div className="py-4 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{employee.team?.department || 'N/A'}</dd>
                  </div>
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
          ) : (
            <div className="py-10 text-center">
              <p className="text-gray-500">No employee details found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;