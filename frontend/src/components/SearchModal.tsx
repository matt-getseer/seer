import { useState, useEffect, Fragment, useRef, useCallback, useMemo, memo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlass, X, CalendarBlank } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useEmployees, useTeams, useMeetings } from '../hooks/useQueryHooks'
import useDebounce from '@/hooks/useDebounce'

// Define types for the data models
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

// Add Meeting type (based on MeetingsPage.tsx usage)
interface Meeting {
  id: number;
  title: string | null;
  scheduledTime: string; // ISO string
  platform: string | null;
  status: string;
  employee: {
    id: number;
    name: string | null;
  };
}

// Define types for search results
type SearchResult = {
  id: string | number
  title: string
  subtitle?: string
  type: 'employee' | 'team' | 'meeting' // Added 'meeting'
  url: string
}

interface SearchModalProps {
  onOpen?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// Cache for search data to prevent unnecessary API calls
const searchDataCache = {
  employees: null as Employee[] | null,
  teams: null as Team[] | null,
  lastFetched: 0,
  // Cache expires after 5 minutes
  isCacheValid: () => (Date.now() - searchDataCache.lastFetched) < 5 * 60 * 1000
};

// Icon components for result types - extracted outside the component
const TypeIcons = {
  employee: memo(() => <div className="p-1.5 bg-blue-100 rounded text-blue-700"><MagnifyingGlass weight="bold" size={16} /></div>),
  team: memo(() => <div className="p-1.5 bg-green-100 rounded text-green-700"><MagnifyingGlass weight="bold" size={16} /></div>),
  meeting: memo(() => <div className="p-1.5 bg-purple-100 rounded text-purple-700"><CalendarBlank weight="bold" size={16} /></div>), // Added meeting icon
  default: memo(() => <div className="p-1.5 bg-gray-100 rounded text-gray-700"><MagnifyingGlass weight="bold" size={16} /></div>)
};

// Memoized result item component
const SearchResultItem = memo(({ 
  result, 
  isActive, 
  onClick 
}: { 
  result: SearchResult; 
  isActive: boolean; 
  onClick: (result: SearchResult) => void;
}) => {
  const TypeIcon = TypeIcons[result.type as keyof typeof TypeIcons] || TypeIcons.default;
  
  return (
    <li
      className={`px-4 py-3 cursor-pointer ${
        isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
      }`}
      onClick={() => onClick(result)}
    >
      <div className="flex items-center">
        <TypeIcon />
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
  );
});

// Loading indicator component
const LoadingIndicator = memo(() => (
  <div className="p-4 text-center text-gray-500">
    Searching...
  </div>
));

// Empty results component
const EmptyResults = memo(({ hasQuery }: { hasQuery: boolean }) => (
  <div className="p-4 text-center text-gray-500">
    {hasQuery ? 'No results found' : 'Type to search'}
  </div>
));

// Keyboard shortcuts help component
const KeyboardShortcutsHelp = memo(() => (
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
));

const SearchModal: React.FC<SearchModalProps> = memo(({ onOpen, isOpen: controlledIsOpen, setIsOpen }) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Use our custom hook for debouncing search query
  const debouncedQuery = useDebounce(query, 800) // Increased to 800ms for better performance
  
  // Use React Query hooks for data fetching - only enable when modal is open
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees<Employee[]>({ enabled: controlledIsOpen });
  const { data: teams = [], isLoading: isLoadingTeams } = useTeams<Team[]>({ enabled: controlledIsOpen });
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetings<Meeting[]>({ enabled: controlledIsOpen }); // Added meetings hook
  
  // Check if any data is still loading
  const isLoading = isLoadingEmployees || isLoadingTeams || isLoadingMeetings; // Added meetings loading state

  // Open modal with CMD+K shortcut - memoized event handler
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

  // Compute search results - heavily memoized to prevent recalculation
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const lowerQuery = debouncedQuery.toLowerCase();
    let searchResults: SearchResult[] = [];
    
    // Search employees
    const employeeResults = employees
      .filter((employee: Employee) => 
        employee.name.toLowerCase().includes(lowerQuery) ||
        employee.title.toLowerCase().includes(lowerQuery) ||
        employee.email.toLowerCase().includes(lowerQuery)
      )
      .map((employee: Employee) => ({
        id: employee.id,
        title: employee.name,
        subtitle: employee.title,
        type: 'employee' as const,
        url: `/employees/${employee.id}`
      }));
    
    // Search teams
    const teamResults = teams
      .filter((team: Team) => 
        team.name.toLowerCase().includes(lowerQuery) ||
        team.department.toLowerCase().includes(lowerQuery)
      )
      .map((team: Team) => ({
        id: team.id,
        title: team.name,
        subtitle: team.department,
        type: 'team' as const,
        url: `/teams/${team.id}`
      }));
    
    // Search meetings
    const meetingResults = meetings
      .filter((meeting: Meeting) => 
        // Check title (case-insensitive, handle null)
        (meeting.title && meeting.title.toLowerCase().includes(lowerQuery)) ||
        // Check employee name (case-insensitive, handle null)
        (meeting.employee?.name && meeting.employee.name.toLowerCase().includes(lowerQuery)) 
      )
      .map((meeting: Meeting) => ({
        id: meeting.id,
        title: meeting.title || 'Untitled Meeting',
        subtitle: `Employee: ${meeting.employee?.name || 'N/A'}`,
        type: 'meeting' as const,
        url: `/meetings/${meeting.id}`
      }));
    
    // Combine results
    searchResults = [...employeeResults, ...teamResults, ...meetingResults];
    
    // Sort results (optional, e.g., by type or title)
    searchResults.sort((a, b) => a.title.localeCompare(b.title));

    return searchResults;
  }, [debouncedQuery, employees, teams, meetings]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Handle keyboard navigation with memoization
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelectResult(results[activeIndex]);
    }
  }, [results, activeIndex]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    navigate(result.url);
  }, [setIsOpen, navigate]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, [setIsOpen]);

  // Function to focus the input, called after transition ends
  const focusInput = useCallback(() => {
      searchInputRef.current?.focus();
  }, []); // No dependencies needed

  // Determine what content to show based on query and results state
  const searchContent = useMemo(() => {
    if (debouncedQuery.trim() !== '' && isLoading) {
      return <LoadingIndicator />;
    }
    
    if (results.length > 0) {
      return (
        <ul className="divide-y divide-gray-100">
          {results.map((result, index) => (
            <SearchResultItem
              key={`${result.type}-${result.id}`}
              result={result}
              isActive={index === activeIndex}
              onClick={handleSelectResult}
            />
          ))}
        </ul>
      );
    }
    
    return <EmptyResults hasQuery={debouncedQuery.trim() !== ''} />;
  }, [debouncedQuery, isLoading, results, activeIndex, handleSelectResult]);

  return (
    <Transition appear show={controlledIsOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        {/* Overlay Transition */}
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
            {/* Panel Transition - Add afterEnter here */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
              afterEnter={focusInput} // Call focusInput after enter transition
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                <div className="relative">
                  <div className="flex items-center border-b border-gray-200 p-4">
                    <MagnifyingGlass size={20} className="text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search employees, teams, meetings..."
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
                    {searchContent}
                  </div>

                  <KeyboardShortcutsHelp />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
})

export default SearchModal 