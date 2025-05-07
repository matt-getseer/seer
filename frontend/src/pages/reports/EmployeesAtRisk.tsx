import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface Employee {
  id: string
  name: string
  team: string
  role: string
  riskScore: number
  lastReviewDate: string
  riskFactors: string[]
}

// Key metrics data
const keyMetrics = [
  { name: "Average Risk Score", value: "74.2", change: "+2.5", status: "negative" },
  { name: "Highest Risk Employee", value: "Jane Smith (82)", change: "+7", status: "negative" },
  { name: "High Risk Count", value: "2 Employees", change: "+1", status: "negative" },
  { name: "Recently Improved", value: "1 Employee", change: "", status: "positive" }
]

// Insights data
const insights = [
  {
    title: "Marketing team shows concerning patterns",
    description: "Jane Smith in Marketing has the highest risk score at 82, with multiple absences and decreased productivity."
  },
  {
    title: "Engineering team member needs intervention",
    description: "John Doe shows reduced engagement and recent negative feedback, suggesting immediate manager attention."
  },
  {
    title: "Customer Support shows increasing concerns",
    description: "Michael Wilson's issues with customer satisfaction decline and team turnover may impact department stability."
  }
]

const EmployeesAtRisk = () => {
  const [timeRange] = useState('Last 3 months')
  const [employees] = useState<Employee[]>([
    {
      id: '1',
      name: 'John Doe',
      team: 'Engineering',
      role: 'Senior Developer',
      riskScore: 76,
      lastReviewDate: '2023-03-15',
      riskFactors: ['Low performance', 'Reduced engagement', 'Recent negative feedback']
    },
    {
      id: '2',
      name: 'Jane Smith',
      team: 'Marketing',
      role: 'Marketing Specialist',
      riskScore: 82,
      lastReviewDate: '2023-04-05',
      riskFactors: ['Multiple absences', 'Decreased productivity', 'Missed deadlines']
    },
    {
      id: '3',
      name: 'Alex Johnson',
      team: 'Sales',
      role: 'Account Executive',
      riskScore: 68,
      lastReviewDate: '2023-02-28',
      riskFactors: ['Declining sales metrics', 'Communication issues', 'Client complaints']
    },
    {
      id: '4',
      name: 'Emily Brown',
      team: 'Product',
      role: 'Product Manager',
      riskScore: 71,
      lastReviewDate: '2023-03-22',
      riskFactors: ['Team conflicts', 'Missed milestones', 'Work quality concerns']
    },
    {
      id: '5',
      name: 'Michael Wilson',
      team: 'Customer Support',
      role: 'Support Lead',
      riskScore: 74,
      lastReviewDate: '2023-04-10',
      riskFactors: ['Customer satisfaction decline', 'Process adherence issues', 'Team turnover']
    }
  ])

  const getRiskLevelClass = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800'
    if (score >= 70) return 'bg-orange-100 text-orange-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with back button, title, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/reports" className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
            <CaretLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employees at Risk Report</h1>
            <p className="text-sm text-gray-500">Identify employees who may be at risk of leaving or performance issues</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Calendar className="mr-2 h-4 w-4" />
            {timeRange}
            <CaretDown className="ml-2 h-4 w-4" />
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <DownloadSimple className="mr-2 h-4 w-4" />
            Download
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Export className="mr-2 h-4 w-4" />
            Share
          </button>
        </div>
      </div>
      
      {/* Key metrics section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {keyMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">{metric.name}</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-semibold text-gray-900">{metric.value}</p>
                {metric.change && (
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    metric.status === 'positive' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                  }`}>
                    {metric.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About This Report</h2>
        <div className="text-sm text-gray-600">
          <p>This report identifies employees who may be at risk based on performance metrics, engagement scores, and manager feedback. 
          Risk scores above 80 indicate high risk, 70-79 moderate risk, and below 70 lower risk.</p>
        </div>
      </div>

      {/* Insights section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h2>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="border-l-4 border-red-500 pl-4 py-1">
              <h3 className="text-md font-medium text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Detailed data table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Employees with Risk Indicators</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Team / Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Risk Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Last Review
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Risk Factors
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{employee.team}</div>
                    <div className="text-gray-500 text-sm">{employee.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelClass(employee.riskScore)}`}>
                      {employee.riskScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(employee.lastReviewDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-gray-500 list-disc pl-5">
                      {employee.riskFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recommendations section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h2>
        <ul className="space-y-3 list-disc list-inside text-gray-600">
          <li>Schedule immediate 1:1 meetings with high-risk employees (Jane Smith, John Doe).</li>
          <li>Conduct a team climate survey for the Marketing department to identify broader issues.</li>
          <li>Review the Customer Support team's processes and workload allocation.</li>
          <li>Implement bi-weekly check-ins with all employees with risk scores above 70.</li>
          <li>Consider targeted professional development opportunities for employees showing performance concerns.</li>
        </ul>
      </div>
    </div>
  )
}

export default EmployeesAtRisk 