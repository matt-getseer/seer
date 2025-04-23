import { useState, useEffect, Fragment, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { employeeService, teamService, interviewService } from '../api/client'

// Define types for API responses
type Employee = {
  id: number
  name: string
  title: string
  email: string
  startDate: string
  teamId: number
  userId: number
  team?: {
    name: string
    department: string
  }
}

type Team = {
  id: number
  name: string
  department: string
  employees: Employee[]
  createdAt: string
  updatedAt: string
  userId: number
}

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

type SearchResult = {
  id: string | number
  title: string
  subtitle?: string
  type: 'employee' | 'team' | 'interview'
  url: string
}

interface SearchModalProps {
  onOpen?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SearchModal = ({ onOpen, isOpen: controlledIsOpen, setIsOpen }: SearchModalProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Open modal with CMD+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CMD+K or CTRL+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        onOpen?.()
      }
      // Close with Escape key
      if (e.key === 'Escape' && controlledIsOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [controlledIsOpen, onOpen, setIsOpen])

  // Search functionality
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults([])
        return
      }

      setLoading(true)
      
      try {
        // Get data in parallel
        const [employeesResponse, teamsResponse, interviewsResponse] = await Promise.all([
          employeeService.getAllEmployees(),
          teamService.getAllTeams(),
          interviewService.getAllInterviews()
        ])

        // Search employees
        const employeeResults = (employeesResponse.data as Employee[])
          .filter((employee: Employee) => 
            employee.name.toLowerCase().includes(query.toLowerCase()) ||
            employee.title.toLowerCase().includes(query.toLowerCase()) ||
            employee.email.toLowerCase().includes(query.toLowerCase())
          )
          .map((employee: Employee) => ({
            id: employee.id,
            title: employee.name,
            subtitle: employee.title,
            type: 'employee' as const,
            url: `/employees/${employee.id}`
          }))
        
        // Search teams
        const teamResults = (teamsResponse.data as Team[])
          .filter((team: Team) => 
            team.name.toLowerCase().includes(query.toLowerCase()) ||
            team.department.toLowerCase().includes(query.toLowerCase())
          )
          .map((team: Team) => ({
            id: team.id,
            title: team.name,
            subtitle: team.department,
            type: 'team' as const,
            url: `/teams`
          }))
        
        // Search interviews
        const interviewResults = (interviewsResponse.data as Interview[])
          .filter((interview: Interview) => 
            interview.name.toLowerCase().includes(query.toLowerCase()) ||
            interview.interviewName.toLowerCase().includes(query.toLowerCase()) ||
            interview.team.toLowerCase().includes(query.toLowerCase())
          )
          .map((interview: Interview) => ({
            id: interview.id,
            title: interview.interviewName,
            subtitle: `${interview.name} - ${interview.team}`,
            type: 'interview' as const,
            url: `/interviews/${interview.id}`
          }))
        
        // Combine results, prioritizing by type
        setResults([
          ...employeeResults,
          ...teamResults,
          ...interviewResults
        ])
        
        // Reset active index
        setActiveIndex(0)
      } catch (error) {
        console.error('Error searching:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimer)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      handleSelectResult(results[activeIndex])
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    navigate(result.url)
  }

  const closeModal = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  // Focus input when modal opens
  useEffect(() => {
    if (controlledIsOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [controlledIsOpen])

  // Icon components for result types
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'employee':
        return <div className="p-1.5 bg-blue-100 rounded text-blue-700"><MagnifyingGlass weight="bold" size={16} /></div>
      case 'team':
        return <div className="p-1.5 bg-green-100 rounded text-green-700"><MagnifyingGlass weight="bold" size={16} /></div>
      case 'interview':
        return <div className="p-1.5 bg-indigo-100 rounded text-indigo-700"><MagnifyingGlass weight="bold" size={16} /></div>
      default:
        return <div className="p-1.5 bg-gray-100 rounded text-gray-700"><MagnifyingGlass weight="bold" size={16} /></div>
    }
  }

  return (
    <>
      {/* Search Modal */}
      <Transition appear show={controlledIsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                  <div className="relative">
                    <div className="flex items-center border-b border-gray-200 p-4">
                      <MagnifyingGlass size={20} className="text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search employees, teams, interviews..."
                        className="w-full border-none outline-none pl-3 pr-8 py-1 text-gray-800 placeholder-gray-400"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <div className="absolute right-4 flex items-center space-x-2">
                        <span className="text-xs text-gray-400">Press ESC to close</span>
                        <button
                          onClick={closeModal}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-gray-500">
                          Searching...
                        </div>
                      ) : results.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {results.map((result, index) => (
                            <li
                              key={`${result.type}-${result.id}`}
                              className={`px-4 py-3 cursor-pointer ${
                                index === activeIndex
                                  ? 'bg-gray-50'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleSelectResult(result)}
                            >
                              <div className="flex items-center">
                                {getTypeIcon(result.type)}
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {result.title}
                                  </div>
                                  {result.subtitle && (
                                    <div className="text-xs text-gray-500">
                                      {result.subtitle}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-auto text-xs text-gray-400 capitalize">
                                  {result.type}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : query.trim() !== '' ? (
                        <div className="p-4 text-center text-gray-500">
                          No results found
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Type to search
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">⌘K</span> to open search
                        </div>
                        <div className="flex space-x-4">
                          <span><span className="font-semibold">↑↓</span> to navigate</span>
                          <span><span className="font-semibold">↵</span> to select</span>
                          <span><span className="font-semibold">ESC</span> to close</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SearchModal 