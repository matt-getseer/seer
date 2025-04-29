import { useState, useEffect, useCallback } from 'react'
import { interviewService, employeeService } from '../api/client'
import { format, isValid, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Trash, ArrowRight } from '@phosphor-icons/react'

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

const fetchInterviews = async (
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setInterviews: (interviews: Interview[]) => void
) => {
  try {
    setLoading(true)
    const response = await interviewService.getAllInterviews()
    setInterviews(response.data)
    setError(null)
  } catch (err) {
    console.error('Failed to fetch interviews:', err)
    const axiosError = err as AxiosError
    
    if (axiosError.response?.status === 404) {
      setError('No interviews found or interview endpoint unavailable.')
    } else {
      setError('Failed to load interviews. Please try again later.')
    }
  } finally {
    setLoading(false)
  }
}

const Interviews = () => {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Record<string, number>>({})

  // Create stable navigation functions
  const handleViewDetails = useCallback((id: number) => {
    // Save current list state to sessionStorage
    sessionStorage.setItem('interviewListScrollPosition', window.scrollY.toString())
    navigate(`/interviews/${id}`)
  }, [navigate])

  const navigateToEmployee = useCallback(async (name: string) => {
    // If we already have this employee's ID in our map, use it
    if (employees[name]) {
      navigate(`/employees/${employees[name]}`)
      return
    }

    try {
      // We need to search for the employee by name
      const response = await employeeService.getAllEmployees()
      const allEmployees = response.data as Employee[]
      
      // Find employee with matching name
      const employee = allEmployees.find(emp => emp.name === name)
      
      if (employee) {
        // Add to our map for future lookups
        setEmployees(prev => ({ ...prev, [name]: employee.id }))
        navigate(`/employees/${employee.id}`)
      } else {
        console.error(`Could not find employee with name: ${name}`)
      }
    } catch (err) {
      console.error('Error finding employee:', err)
    }
  }, [navigate, employees])

  useEffect(() => {
    fetchInterviews(setLoading, setError, setInterviews)
  }, []) // Remove navigate dependency

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('Are you sure you want to delete this interview?')) {
      try {
        await interviewService.deleteInterview(id)
        fetchInterviews(setLoading, setError, setInterviews)
      } catch (err) {
        console.error('Failed to delete interview:', err)
        setError('Failed to delete interview. Please try again.')
      }
    }
  }, [])

  // Restore scroll position when returning to the list
  useEffect(() => {
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem('interviewListScrollPosition')
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition))
      }
    }
    
    // Wait for interviews to load before restoring scroll position
    if (!loading && interviews.length > 0) {
      restoreScrollPosition()
    }
  }, [loading, interviews])

  const formatDate = useCallback((dateString: string) => {
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
  }, [])

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
                      onClick={() => navigateToEmployee(interview.name)}
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
                      title="Delete interview"
                    >
                      <Trash size={20} weight="bold" />
                    </button>
                    <button
                      className="text-indigo-600 hover:text-indigo-900 ml-3"
                      title="View details"
                      onClick={() => handleViewDetails(interview.id)}
                    >
                      <ArrowRight size={20} weight="bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Interviews 