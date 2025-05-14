import { Question, CaretRight } from '@phosphor-icons/react'
import { FC, useState, useEffect, useMemo, memo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { employeeService } from '../api/client'

// Cache for employee name lookups
const employeeNameCache: Record<string, string> = {};

// Memoized breadcrumb item component
const BreadcrumbItem = memo(({ breadcrumb, isLast, index }: { 
  breadcrumb: { name: string; path: string; }; 
  isLast: boolean;
  index: number;
}) => (
  <li key={breadcrumb.path} className="flex items-center">
    {index > 0 && (
      <CaretRight className="mx-1 h-4 w-4 flex-shrink-0 text-gray-400" />
    )}
    <Link
      to={breadcrumb.path}
      className={`text-xs font-medium ${
        isLast
          ? 'text-gray-900'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      style={{ fontSize: '12px' }}
    >
      {breadcrumb.name}
    </Link>
  </li>
));

const Navbar: FC = memo(() => {
  const location = useLocation()
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({})
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    // Call handler once on mount to check initial scroll position
    handleScroll(); 

    // Cleanup listener on unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array ensures this runs only once on mount and cleanup on unmount

  // Fetch employee data for ID-based routes with caching
  useEffect(() => {
    let isMounted = true;
    const pathnames = location.pathname.split('/').filter(path => path)
    
    // Look for numeric IDs that might be employee IDs
    pathnames.forEach((segment, index) => {
      if (!isNaN(Number(segment)) && index > 0 && pathnames[index-1] === 'employees') {
        const employeeId = segment
        
        // Check cache first, then state, then fetch
        if (employeeNameCache[employeeId]) {
          if (!employeeNames[employeeId]) {
            setEmployeeNames(prev => ({
              ...prev,
              [employeeId]: employeeNameCache[employeeId]
            }));
          }
          return;
        }
        
        // Only fetch if we don't already have this employee's name
        if (!employeeNames[employeeId]) {
          // Add debouncing to prevent rapid API calls
          const timer = setTimeout(() => {
            employeeService.getEmployeeById(Number(employeeId))
              .then(response => {
                const employeeName = response.data.name;
                // Update cache
                employeeNameCache[employeeId] = employeeName;
                
                if (isMounted) {
                  setEmployeeNames(prev => ({
                    ...prev,
                    [employeeId]: employeeName
                  }));
                }
              })
              .catch(err => {
                console.error('Error fetching employee:', err)
              })
          }, 300)
          
          return () => {
            clearTimeout(timer);
          }
        }
      }
    })
    
    return () => {
      isMounted = false;
    };
  }, [location.pathname, employeeNames])

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter(path => path)
    
    // Map of path segments to readable names
    const pathMap: Record<string, string> = {
      'employees': 'Employees',
      'teams': 'Teams',
      'interviews': 'Interviews',
      'reports': 'Reports',
      'settings': 'Settings',
      'quarterly-review': 'Quarterly Review',
      'end-to-end-onboarding': 'End-to-End Onboarding'
    }
    
    // If we're at root path
    if (pathnames.length === 0) {
      return [{ name: 'Home', path: '/' }]
    }
    
    // Build breadcrumb items with accumulated paths
    return pathnames.map((name, index) => {
      // For numeric IDs in routes like /employees/123, show employee name if available
      const isId = !isNaN(Number(name)) && index > 0
      const prevSegment = pathnames[index - 1]
      
      let displayName = pathMap[name] || name
      
      // If this is an employee ID and we have the name, use it
      if (isId && prevSegment === 'employees') {
        displayName = employeeNames[name] || 'Employee Details'
      } else if (isId && prevSegment) {
        // For other types of IDs
        displayName = `${pathMap[prevSegment] || prevSegment} Details`
      }
      
      // Build the correct path for this breadcrumb
      const path = `/${pathnames.slice(0, index + 1).join('/')}`
      
      return {
        name: displayName,
        path
      }
    })
  }, [location.pathname, employeeNames])

  return (
    <>
      <nav className={`bg-white sticky top-0 z-10 transition-shadow duration-200 ${
          isScrolled ? '[box-shadow:0_1px_2px_0_rgba(0,0,0,0.05)]' : ''
        }`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex-1">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <BreadcrumbItem 
                      key={breadcrumb.path}
                      breadcrumb={breadcrumb}
                      isLast={index === breadcrumbs.length - 1}
                      index={index}
                    />
                  ))}
                </ol>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-1.5 text-gray-500 hover:text-gray-600">
                <Question className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
})

export default Navbar 