import { ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { reportCategories } from '../../src/constants/reportConstants'

const Reports = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                {/* Icon rendering will need to be adjusted to map string to component */}
                {/* For now, this will likely break or show string name */}
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