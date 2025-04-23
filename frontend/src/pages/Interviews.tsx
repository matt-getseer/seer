import { useState, useEffect, useCallback } from 'react'
import { interviewService, isTokenValid, authService, employeeService } from '../api/client'
import { format, isValid, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import EmployeeProfile from '../components/EmployeeProfile'

type Interview = {
  id: number
  name: string
  team: string
  interviewName: string
  dateTaken: string
  createdAt: string
  updatedAt: string
  userId: number
}

type Employee = {
  id: number
  name: string
}

const Interviews = () => {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<Record<string, number>>({}) // Map employee names to IDs

  const checkApiHealth = async () => {
    try {
      await authService.checkHealth();
      console.log('API is healthy');
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      setError('Cannot connect to the server. Please try again later.');
      return false;
    }
  };

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check API health first
      const isApiHealthy = await checkApiHealth();
      if (!isApiHealthy) {
        setLoading(false);
        return;
      }
      
      // Check if user is logged in with valid token
      if (!isTokenValid()) {
        console.error('No valid authentication token found')
        setError('Please log in to view interviews')
        setLoading(false)
        navigate('/login')
        return
      }
      
      const response = await interviewService.getAllInterviews()
      console.log('API Response:', response.data)
      setInterviews(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to fetch interviews:', err)
      const axiosError = err as AxiosError
      console.error('Error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          baseURL: axiosError.config?.baseURL,
          headers: axiosError.config?.headers
        }
      })
      
      if (axiosError.response?.status === 401) {
        setError('Authentication error. Please log in again.')
        // Redirect to login
        localStorage.removeItem('token')
        navigate('/login')
      } else if (axiosError.response?.status === 404) {
        setError('No interviews found or interview endpoint unavailable.')
      } else {
        setError('Failed to load interviews. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this interview?')) {
      try {
        await interviewService.deleteInterview(id)
        fetchInterviews()
      } catch (err) {
        console.error('Failed to delete interview:', err)
        setError('Failed to delete interview. Please try again.')
      }
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) {
        return 'Invalid date'
      }
      return format(date, 'PPP')
    } catch (err) {
      console.error('Error formatting date:', err)
      return 'Invalid date'
    }
  }

  // Find employee by name from our list of employees
  const findEmployeeByName = async (name: string) => {
    // If we already have this employee's ID in our map, use it
    if (employees[name]) {
      setSelectedEmployeeId(employees[name])
      return
    }

    try {
      // We need to search for the employee by name
      // First get all employees from all teams
      const teams = await employeeService.getAllEmployees()
      const allEmployees = teams.data as Employee[]
      
      // Find employee with matching name
      const employee = allEmployees.find(emp => emp.name === name)
      
      if (employee) {
        // Add to our map for future lookups
        setEmployees(prev => ({ ...prev, [name]: employee.id }))
        setSelectedEmployeeId(employee.id)
      } else {
        console.error(`Could not find employee with name: ${name}`)
      }
    } catch (err) {
      console.error('Error finding employee:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Interviews</h1>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">No interviews found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interviewee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interview Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Taken
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviews.map((interview) => (
                <tr key={interview.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => findEmployeeByName(interview.name)}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline focus:outline-none"
                    >
                      {interview.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{interview.team}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{interview.interviewName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(interview.dateTaken)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(interview.id)}
                      className="text-red-600 hover:text-red-900 ml-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {selectedEmployeeId && (
        <EmployeeProfile 
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
    </div>
  )
}

export default Interviews 