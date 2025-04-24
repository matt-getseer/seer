import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export, ChartBar } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

// Sample data - in a real app, this would come from API
const performanceData = [
  { team: 'Engineering', score: 87, previousScore: 82, change: '+5' },
  { team: 'Product', score: 92, previousScore: 89, change: '+3' },
  { team: 'Marketing', score: 78, previousScore: 75, change: '+3' },
  { team: 'Sales', score: 85, previousScore: 90, change: '-5' },
  { team: 'Customer Success', score: 89, previousScore: 84, change: '+5' },
  { team: 'Finance', score: 82, previousScore: 80, change: '+2' },
]

const timeSeriesData = [
  { month: 'Jan', engineering: 75, product: 80, marketing: 65, sales: 78, cs: 73, finance: 71 },
  { month: 'Feb', engineering: 78, product: 82, marketing: 67, sales: 84, cs: 75, finance: 72 },
  { month: 'Mar', engineering: 80, product: 85, marketing: 70, sales: 87, cs: 79, finance: 75 },
  { month: 'Apr', engineering: 82, product: 87, marketing: 72, sales: 89, cs: 81, finance: 77 },
  { month: 'May', engineering: 85, product: 90, marketing: 74, sales: 92, cs: 83, finance: 79 },
  { month: 'Jun', engineering: 87, product: 92, marketing: 78, sales: 85, cs: 89, finance: 82 },
]

// Insights data
const insights = [
  {
    title: "Engineering team shows consistent improvement",
    description: "The Engineering team has shown a steady increase in performance scores over the last 6 months, with a 5-point improvement compared to the previous period."
  },
  {
    title: "Sales team performance declined",
    description: "The Sales team's performance has declined by 5 points. This may be related to recent market challenges and higher targets set for Q2."
  },
  {
    title: "Product team leads overall performance",
    description: "The Product team continues to maintain the highest performance score across all departments at 92%."
  }
]

// Key metrics data
const keyMetrics = [
  { name: "Average Team Score", value: "85.5%", change: "+2.2%", status: "positive" },
  { name: "Top Performing Team", value: "Product (92%)", change: "+3%", status: "positive" },
  { name: "Most Improved", value: "Engineering", change: "+5%", status: "positive" },
  { name: "Needs Attention", value: "Sales", change: "-5%", status: "negative" }
]

const TeamPerformance = () => {
  const [timeRange, setTimeRange] = useState('Last 6 months')
  
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with back button, title, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/reports" className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
            <CaretLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Team Performance Report</h1>
            <p className="text-sm text-gray-500">Analyze team productivity, efficiency, and accomplishments</p>
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
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  metric.status === 'positive' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                }`}>
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Performance by Team</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="team" stroke="#6B7280" />
                <YAxis stroke="#6B7280" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar name="Current Score" dataKey="score" fill="#8349F0" />
                <Bar name="Previous Score" dataKey="previousScore" fill="#C4B5FD" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Secondary chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Trends (6 Months)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" domain={[60, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="engineering" name="Engineering" stroke="#8349F0" strokeWidth={2} />
                <Line type="monotone" dataKey="product" name="Product" stroke="#EC4899" strokeWidth={2} />
                <Line type="monotone" dataKey="marketing" name="Marketing" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#F59E0B" strokeWidth={2} />
                <Line type="monotone" dataKey="cs" name="Customer Success" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="finance" name="Finance" stroke="#6B7280" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Insights section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h2>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="border-l-4 border-primary-500 pl-4 py-1">
              <h3 className="text-md font-medium text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Detailed data table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Detailed Team Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.map((team, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{team.team}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{team.score}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{team.previousScore}%</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    team.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>{team.change}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      team.change.startsWith('+') ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                    }`}>
                      {team.change.startsWith('+') ? 'Improving' : 'Declining'}
                    </span>
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
          <li>Investigate the recent decline in Sales team performance through targeted interviews with team leads.</li>
          <li>Recognize the Engineering team's improvement in the next company all-hands meeting.</li>
          <li>Share the Product team's best practices with other departments to improve overall company performance.</li>
          <li>Schedule a review of Marketing team processes to identify opportunities for improvement.</li>
        </ul>
      </div>
    </div>
  )
}

export default TeamPerformance 