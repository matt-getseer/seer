import { ArrowRight, ChartBar, Brain, HandsClapping, Smiley, Star, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

// Report category data
const reportCategories = [
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Analyze team productivity, efficiency, and accomplishments',
    icon: <ChartBar className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-indigo-50 border-indigo-200'
  },
  {
    id: 'core-competency',
    name: 'Core Competency',
    description: 'Evaluate key skills and abilities across departments',
    icon: <Brain className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-blue-50 border-blue-200'
  },
  {
    id: 'engagement',
    name: 'Engagement',
    description: 'Track employee participation and involvement metrics',
    icon: <HandsClapping className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-purple-50 border-purple-200'
  },
  {
    id: 'sentiment',
    name: 'Sentiment',
    description: 'Monitor employee satisfaction and workplace morale',
    icon: <Smiley className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-green-50 border-green-200'
  },
  {
    id: 'top-performer',
    name: 'Top Performer',
    description: 'Identify outstanding employees and their achievements',
    icon: <Star className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-amber-50 border-amber-200'
  },
  {
    id: 'employees-at-risk',
    name: 'Employees at Risk',
    description: 'Identify employees who may be at risk of leaving or performance issues',
    icon: <WarningCircle className="w-8 h-8 text-primary-500" weight="duotone" />,
    color: 'bg-red-50 border-red-200'
  }
]

const Reports = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => (
            <div 
              key={category.id}
              className={`rounded-lg border p-6 transition-all duration-200 hover:shadow-md cursor-pointer ${category.color}`}
            >
              <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm inline-block">
                {category.icon}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">{category.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{category.description}</p>
              <Link 
                to={`/reports/${category.id}`}
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View reports
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports 