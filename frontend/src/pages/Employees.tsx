import { useState, useCallback, useMemo, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MagnifyingGlass, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import EmployeeProfile from '../components/EmployeeProfile'
import Flag from 'react-world-flags'
import { useEmployees } from '../hooks/useQueryHooks'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal'

type Employee = {
  id: number
  name: string
  title: string
  email: string
  startDate: string | null
  country?: string | null
  teamId: number
  userId: number
  createdAt: string
  updatedAt: string
  meetingCount?: number;
  team?: {
    name: string
    department: string
  }
  teamName?: string;
  teamDepartment?: string;
}

// Define sort configuration for Employees
type SortConfig = {
  key: keyof Employee | 'teamName' | 'teamDepartment';
  direction: 'ascending' | 'descending';
} | null;

// Cache for country codes to prevent recalculation
const countryCodeCache: Record<string, string> = {};

// Helper function to convert country name to ISO code
const getCountryCode = (countryName: string | null | undefined): string => {
  if (!countryName) return '';
  
  // Use cache if already calculated
  if (countryCodeCache[countryName]) {
    return countryCodeCache[countryName];
  }
  
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
  
  const code = countryMap[countryName] || '';
  // Cache the result
  countryCodeCache[countryName] = code;
  return code;
};

// Loading UI component - extracted to avoid re-rendering the entire component when loading changes
const LoadingState = memo(() => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
));

// Error UI component - extracted to avoid re-rendering the entire component when error changes
const ErrorState = memo(({ message }: { message: string }) => (
  <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
    {message}
  </div>
));

// Memoized EmployeeRow component to prevent re-rendering all rows when one changes
const EmployeeRow = memo(({ 
  employee, 
  onEmployeeClick,
  onScheduleClick,
  formatDate
}: { 
  employee: Employee, 
  onEmployeeClick: (id: number) => void,
  onScheduleClick: (employee: Employee) => void,
  formatDate: (dateString: string | null) => string
}) => (
  <tr key={employee.id} className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      <button 
        onClick={() => onEmployeeClick(employee.id)}
        className="text-gray-900 hover:text-indigo-600 hover:underline focus:outline-none"
      >
        {employee.name}
      </button>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {employee.title}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {employee.team ? (
        <div>
          <div>{employee.team.name}</div>
          <div className="text-xs text-gray-400">{employee.team.department}</div>
        </div>
      ) : (
        'N/A'
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      <div className="truncate max-w-xs">{employee.email}</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {employee.country ? (
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 h-10 w-10 overflow-hidden rounded-full border border-gray-200">
            <Flag code={getCountryCode(employee.country)} className="h-full w-full object-cover" />
          </div>
          <span className="truncate">{employee.country}</span>
        </div>
      ) : (
        'N/A'
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {formatDate(employee.startDate)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        {employee.meetingCount ?? 0}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
       <button 
         onClick={() => onScheduleClick(employee)}
         className="text-indigo-600 hover:text-indigo-900 focus:outline-none text-sm font-medium"
       >
         Schedule
       </button>
    </td>
  </tr>
));

// Table header component extracted - NOW accepts sorting props
const TableHeader = memo(({ requestSort, getSortIcon }: {
  requestSort: (key: keyof Employee | 'teamName' | 'teamDepartment') => void;
  getSortIcon: (key: keyof Employee | 'teamName' | 'teamDepartment') => React.ReactNode;
}) => (
  <thead className="bg-gray-50">
    <tr>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>
        Name {getSortIcon('name')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('title')}>
        Title {getSortIcon('title')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('teamName')}>
        Team {getSortIcon('teamName')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('email')}>
        Email {getSortIcon('email')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('country')}>
        Country {getSortIcon('country')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('startDate')}>
        Start Date {getSortIcon('startDate')}
      </th>
      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('meetingCount')}>
        Meetings {getSortIcon('meetingCount')}
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
        Actions
      </th>
    </tr>
  </thead>
));

// Search bar component extracted and memoized
const SearchBar = memo(({ 
  searchTerm, 
  onSearchChange 
}: { 
  searchTerm: string, 
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) => (
  <div className="relative rounded-md w-1/3">
    <input
      type="text"
      placeholder="Search employees..."
      value={searchTerm}
      onChange={onSearchChange}
      className="block w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-10 py-2"
    />
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
      <MagnifyingGlass size={20} className="text-gray-400" />
    </div>
  </div>
));

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const { id: employeeId } = useParams<{ id?: string }>()
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEmployeeForScheduling, setSelectedEmployeeForScheduling] = useState<Employee | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  const selectedEmployeeId = employeeId ? parseInt(employeeId, 10) : null
  const { data: employeesData = [], isLoading, error } = useEmployees<Employee[]>();

  // Format date for display - memoized to avoid recreation
  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch (err) {
      console.error('Error formatting date:', err)
      return 'Invalid date'
    }
  }, []);

  // Filter employees based on search term - memoized to prevent recalculation
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) {
      return employeesData;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return employeesData.filter((employee: Employee) => (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.title.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.country && employee.country.toLowerCase().includes(searchLower)) ||
      (employee.team?.name && employee.team.name.toLowerCase().includes(searchLower)) ||
      (employee.team?.department && employee.team.department.toLowerCase().includes(searchLower))
    ));
  }, [employeesData, searchTerm]);

  // Function to request sorting
  const requestSort = useCallback((key: keyof Employee | 'teamName' | 'teamDepartment') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Function to render sort icons
  const getSortIcon = useCallback((key: keyof Employee | 'teamName' | 'teamDepartment') => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp size={16} className="inline ml-1" />;
    }
    return <ArrowDown size={16} className="inline ml-1" />;
  }, [sortConfig]);

  // Sort the filtered employees - memoized
  const sortedAndFilteredEmployees = useMemo(() => {
    let sortableItems = [...filteredEmployees];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'teamName') {
          aValue = a.team?.name || '';
          bValue = b.team?.name || '';
        } else if (sortConfig.key === 'teamDepartment') {
          aValue = a.team?.department || '';
          bValue = b.team?.department || '';
        } else {
          const key = sortConfig.key as keyof Employee;
          aValue = a[key];
          bValue = b[key];
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        if (sortConfig.key === 'meetingCount') {
          aValue = typeof aValue === 'number' ? aValue : 0;
          bValue = typeof bValue === 'number' ? bValue : 0;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          // Numerical comparison
        } else {
          aValue = String(aValue);
          bValue = String(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEmployees, sortConfig]);

  // Memoized event handlers
  const handleEmployeeClick = useCallback((id: number) => {
    navigate(`/employees/${id}`);
  }, [navigate]);

  const handleBackClick = useCallback(() => {
    navigate('/employees');
  }, [navigate]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handler to open the schedule modal
  const handleScheduleClick = useCallback((employee: Employee) => {
    setSelectedEmployeeForScheduling(employee);
    setIsScheduleModalOpen(true);
  }, []);

  // Handler to close the modal
  const handleCloseModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setSelectedEmployeeForScheduling(null);
  }, []);

  // If an employee is selected, render the EmployeeProfile component
  if (selectedEmployeeId) {
    return (
      <EmployeeProfile 
        employeeId={selectedEmployeeId}
        onClose={handleBackClick}
      />
    )
  }

  // Extract error message if there is an error
  const errorMessage = error ? 
    (error instanceof Error ? error.message : 'Failed to load employees. Please try again later.') 
    : null;

  // Otherwise, render the employees list
  return (
    <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
        <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage || 'An unexpected error occurred.'} />
      ) : (
        <div className="flex flex-col mt-4">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <TableHeader requestSort={requestSort} getSortIcon={getSortIcon} />
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAndFilteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          No employees found.
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredEmployees.map((employee: Employee) => (
                        <EmployeeRow 
                          key={employee.id} 
                          employee={employee} 
                          onEmployeeClick={handleEmployeeClick}
                          onScheduleClick={handleScheduleClick}
                          formatDate={formatDate} 
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEmployeeForScheduling && (
        <ScheduleMeetingModal 
          isOpen={isScheduleModalOpen}
          onClose={handleCloseModal}
          employeeId={selectedEmployeeForScheduling.id}
          employeeName={selectedEmployeeForScheduling.name}
        />
      )}
    </div>
  )
}

export default memo(Employees) 