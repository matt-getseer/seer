import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export, HandsClapping } from '@phosphor-icons/react'
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Sample data - in a real app, this would come from API
const engagementData = [
  { department: 'Engineering', score: 79, previousScore: 72, change: '+7' },
  { department: 'Product', score: 83, previousScore: 85, change: '-2' },
  { department: 'Marketing', score: 88, previousScore: 82, change: '+6' },
  { department: 'Sales', score: 76, previousScore: 78, change: '-2' },
  { department: 'Customer Success', score: 91, previousScore: 86, change: '+5' },
  { department: 'Finance', score: 74, previousScore: 70, change: '+4' },
]

const timeSeriesData = [
  { month: 'Jan', engagement: 75 },
  { month: 'Feb', engagement: 78 },
  { month: 'Mar', engagement: 80 },
  { month: 'Apr', engagement: 79 },
  { month: 'May', engagement: 82 },
  { month: 'Jun', engagement: 85 },
]

const engagementBreakdown = [
  { name: 'Highly Engaged', value: 38, color: '#4C1D95' },
  { name: 'Engaged', value: 42, color: '#8349F0' },
  { name: 'Neutral', value: 12, color: '#C4B5FD' },
  { name: 'Disengaged', value: 8, color: '#E5E7EB' }
]

// Insights data
const insights = [
  {
    title: "Engineering showing strongest engagement improvement",
    description: "The Engineering department has shown a 7-point increase in engagement scores, potentially due to recent improvements in project management processes."
  },
  {
    title: "Product and Sales teams showing slight declines",
    description: "Both Product and Sales teams have decreased by 2 points. This may relate to recent product launch delays and increasing sales targets."
  },
  {
    title: "Customer Success maintains highest engagement",
    description: "At 91%, the Customer Success team continues to show the highest engagement levels, driven by positive client feedback and team recognition programs."
  }
]

// Key metrics data
const keyMetrics = [
  { name: "Overall Engagement", value: "82%", change: "+3%", status: "positive" },
  { name: "Participation Rate", value: "94%", change: "+2%", status: "positive" },
  { name: "Most Engaged Team", value: "Customer Success", change: "+5%", status: "positive" },
  { name: "Needs Attention", value: "Sales", change: "-2%", status: "negative" }
]

// Driver data for table
const driverData = [
  { driver: 'Recognition & Rewards', score: 78, previousScore: 72, change: '+6', impact: 'High' },
  { driver: 'Career Development', score: 72, previousScore: 68, change: '+4', impact: 'High' },
  { driver: 'Work-Life Balance', score: 85, previousScore: 80, change: '+5', impact: 'Medium' },
  { driver: 'Manager Relationship', score: 81, previousScore: 79, change: '+2', impact: 'High' },
  { driver: 'Company Direction', score: 76, previousScore: 74, change: '+2', impact: 'Medium' },
  { driver: 'Team Collaboration', score: 88, previousScore: 85, change: '+3', impact: 'High' },
]

const Engagement = () => {
  const [timeRange, setTimeRange] = useState('Last 6 months')
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with back button, title, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/reports" className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
            <CaretLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Engagement Report</h1>
            <p className="text-sm text-gray-500">Track employee participation and involvement metrics</p>
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Engagement by Department</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" stroke="#6B7280" />
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Engagement Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8349F0"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {engagementBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Trend chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Engagement Trend (6 Months)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" domain={[60, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="engagement" name="Engagement Score" stroke="#8349F0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
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
        <div className="px-6 py-4 border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Engagement Drivers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Current Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Previous Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Impact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {driverData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.driver}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.score}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.previousScore}%</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>{item.change}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.impact}</td>
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
          <li>Schedule focus groups with Product and Sales teams to address their recent engagement drops.</li>
          <li>Expand the recognition program that has been successful in the Customer Success team to other departments.</li>
          <li>Continue the engineering team's newly implemented project management practices, as they appear to be effective.</li>
          <li>Invest in programs that strengthen career development opportunities, as this remains a high-impact driver with potential for improvement.</li>
        </ul>
      </div>
    </div>
  )
}

export default Engagement 