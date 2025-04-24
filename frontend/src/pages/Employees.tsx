import { useState, useEffect, useCallback } from 'react'
import { employeeService, isTokenValid } from '../api/client'
import { useNavigate, useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MagnifyingGlass } from '@phosphor-icons/react'
import EmployeeProfile from '../components/EmployeeProfile'
import Flag from 'react-world-flags'

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
  team?: {
    name: string
    department: string
  }
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

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const { employeeId } = useParams<{ employeeId?: string }>()
  
  const selectedEmployeeId = employeeId ? parseInt(employeeId, 10) : null

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check if user is logged in with valid token
      if (!isTokenValid()) {
        console.error('No valid authentication token found')
        setError('Please log in to view employees')
        setLoading(false)
        navigate('/login')
        return
      }
      
      const response = await employeeService.getAllEmployees()
      setEmployees(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch employees:', err)
      const axiosError = err as AxiosError
      
      if (axiosError.response?.status === 401) {
        setError('Authentication error. Please log in again.')
        localStorage.removeItem('token')
        navigate('/login')
      } else if (axiosError.response?.status === 404) {
        setError('No employees found or endpoint unavailable.')
      } else {
        setError('Failed to load employees. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Format date for display
  const formatDate = (dateString: string | null) => {
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
  }

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase()
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.title.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.country && employee.country.toLowerCase().includes(searchLower)) ||
      (employee.team?.name && employee.team.name.toLowerCase().includes(searchLower)) ||
      (employee.team?.department && employee.team.department.toLowerCase().includes(searchLower))
    )
  })

  const handleEmployeeClick = (id: number) => {
    navigate(`/employees/${id}`)
  }

  const handleBackClick = () => {
    navigate('/employees')
  }

  // If an employee is selected, render the EmployeeProfile component
  if (selectedEmployeeId) {
    return (
      <EmployeeProfile 
        employeeId={selectedEmployeeId}
        onClose={handleBackClick}
      />
    )
  }

  // Otherwise, render the employees list
  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
        <div className="relative rounded-md shadow-sm w-1/3">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-10 py-2"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <MagnifyingGlass size={20} className="text-gray-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Loading employees...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          {employees.length === 0 ? (
            <p className="text-gray-600">No employees found.</p>
          ) : (
            <p className="text-gray-600">No matches found for "{searchTerm}".</p>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Team
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Country
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Start Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button 
                        onClick={() => handleEmployeeClick(employee.id)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees 