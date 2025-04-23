import { useState, useEffect, useCallback } from 'react'
import { teamService, isTokenValid, authService } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MagnifyingGlass } from '@phosphor-icons/react'

type Employee = {
  id: number
  name: string
  title: string
  email: string
  startDate: string
  interviewCount?: number
}

type Team = {
  id: number
  name: string
  department: string
  employees: Employee[]
  createdAt: string
  updatedAt: string
  userId: number
  interviewCount?: number
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

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

  const fetchTeams = useCallback(async () => {
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
        setError('Please log in to view teams')
        setLoading(false)
        navigate('/login')
        return
      }
      
      const response = await teamService.getAllTeams()
      console.log('API Response:', response.data)
      setTeams(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to fetch teams:', err)
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
        localStorage.removeItem('token')
        navigate('/login')
      } else if (axiosError.response?.status === 404) {
        setError('No teams found or teams endpoint unavailable.')
      } else {
        setError('Failed to load teams. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Navigate to employee profile
  const handleEmployeeClick = (id: number) => {
    navigate(`/employees/${id}`)
  }

  // Filter teams based on search term
  const filteredTeams = teams.filter(team => {
    const teamMatches = team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        team.department.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Search employees
    const employeeMatches = team.employees.some(employee => 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      employee.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return teamMatches || employeeMatches
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
        <div className="relative rounded-md shadow-sm w-1/3">
          <input
            type="text"
            placeholder="Search teams or employees..."
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
          <p className="text-gray-600">Loading teams...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          {teams.length === 0 ? (
            <p className="text-gray-600">No teams found.</p>
          ) : (
            <p className="text-gray-600">No matches found for "{searchTerm}".</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
                    <p className="text-sm text-gray-500">{team.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{team.employees.length} employees</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                {team.employees && team.employees.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Interviews
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {team.employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button 
                              onClick={() => handleEmployeeClick(employee.id)}
                              className="hover:text-indigo-600 hover:underline focus:outline-none"
                            >
                              {employee.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {employee.interviewCount || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500 py-4">No team members yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Teams 