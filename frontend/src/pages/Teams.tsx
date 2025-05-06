import { useState, useEffect, useCallback, useMemo } from 'react'
import { teamService } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MagnifyingGlass, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import { useTeams } from '../hooks/useQueryHooks'

type Employee = {
  id: number
  name: string
  title: string
  email: string
  startDate: string
  interviewCount?: number
}

type SortConfig = {
  key: keyof Employee;
  direction: 'ascending' | 'descending';
} | null;

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
  const { data: teams = [], isLoading: loading, error: queryError } = useTeams<Team[]>();
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const error = queryError 
    ? (
        (queryError instanceof AxiosError && 
         queryError.response?.data && 
         typeof queryError.response.data === 'object' && 
         'message' in queryError.response.data && 
         typeof queryError.response.data.message === 'string'
        ) 
          ? queryError.response.data.message // Use message from response data if available
          : (queryError as Error).message // Otherwise, use the general error message
      ) || 'Failed to load teams. Please try again later.' // Fallback message
    : null;

  const handleEmployeeClick = useCallback((id: number) => {
    navigate(`/employees/${id}`)
  }, [navigate])

  const requestSort = useCallback((key: keyof Employee) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const getSortIcon = useCallback((key: keyof Employee) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null; // No icon if not sorted by this column
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp size={16} className="inline ml-1" />;
    }
    return <ArrowDown size={16} className="inline ml-1" />;
  }, [sortConfig]);

  const filteredTeams = useMemo(() => {
    if (loading || error) return [];
    return teams.filter(team => {
      const teamMatches = team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          team.department.toLowerCase().includes(searchTerm.toLowerCase())
      
      const employeeMatches = team.employees.some(employee => 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        employee.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      return teamMatches || employeeMatches
    })
  }, [teams, searchTerm, loading, error])

  const sortEmployees = useCallback((employees: Employee[]) => {
    if (!sortConfig) {
      return employees; // Return original if no sorting applied
    }
    const sorted = [...employees].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Basic comparison logic (handle nulls, strings, numbers)
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (sortConfig.key === 'interviewCount') {
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
    return sorted;
  }, [sortConfig]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
        <div className="relative rounded-md w-1/3">
          <input
            type="text"
            placeholder="Search teams or employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-10 py-2"
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
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-6 text-center">
          {teams.length === 0 && !searchTerm ? (
            <p className="text-gray-600 text-sm">No teams found.</p>
          ) : (
            <p className="text-gray-600 text-sm">No matches found for "{searchTerm}".</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg overflow-hidden border border-gray-200">
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>
                          Name {getSortIcon('name')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('title')}>
                          Title {getSortIcon('title')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('email')}>
                          Email {getSortIcon('email')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('startDate')}>
                          Start Date {getSortIcon('startDate')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('interviewCount')}>
                          Interviews {getSortIcon('interviewCount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortEmployees(team.employees).map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
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