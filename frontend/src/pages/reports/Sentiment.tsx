import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export, Smiley } from '@phosphor-icons/react'
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
  Cell,
  AreaChart,
  Area
} from 'recharts'

// Sample data - in a real app, this would come from API
const sentimentData = [
  { department: 'Engineering', score: 72, previousScore: 68, change: '+4' },
  { department: 'Product', score: 81, previousScore: 85, change: '-4' },
  { department: 'Marketing', score: 77, previousScore: 70, change: '+7' },
  { department: 'Sales', score: 74, previousScore: 78, change: '-4' },
  { department: 'Customer Success', score: 85, previousScore: 79, change: '+6' },
  { department: 'Finance', score: 71, previousScore: 69, change: '+2' },
]

const timeSeriesData = [
  { month: 'Jan', sentiment: 70, workload: 65, management: 72, culture: 74 },
  { month: 'Feb', sentiment: 72, workload: 67, management: 74, culture: 75 },
  { month: 'Mar', sentiment: 74, workload: 69, management: 76, culture: 76 },
  { month: 'Apr', sentiment: 75, workload: 72, management: 75, culture: 78 },
  { month: 'May', sentiment: 76, workload: 74, management: 77, culture: 80 },
  { month: 'Jun', sentiment: 78, workload: 75, management: 78, culture: 82 },
]

const sentimentFactors = [
  { name: 'Work-Life Balance', score: 71, previousScore: 68, change: '+3' },
  { name: 'Leadership Trust', score: 78, previousScore: 75, change: '+3' },
  { name: 'Team Dynamics', score: 83, previousScore: 80, change: '+3' },
  { name: 'Career Growth', score: 68, previousScore: 65, change: '+3' },
  { name: 'Compensation', score: 65, previousScore: 67, change: '-2' },
  { name: 'Company Direction', score: 76, previousScore: 72, change: '+4' },
]

// Insights data
const insights = [
  {
    title: "Marketing shows strongest sentiment improvement",
    description: "The Marketing team's sentiment has increased by 7 points, likely due to the recent reorganization and clearer role definitions."
  },
  {
    title: "Product and Sales teams showing sentiment declines",
    description: "Both Product and Sales teams have decreased by 4 points. Product team decline correlates with recent tight deadlines, while Sales may be impacted by higher quotas."
  },
  {
    title: "Team dynamics scores remain highest among factors",
    description: "At 83%, team dynamics continues to be the highest-rated factor, suggesting strong collaboration and positive peer relationships across the organization."
  }
]

// Key metrics data
const keyMetrics = [
  { name: "Overall Sentiment", value: "77%", change: "+3%", status: "positive" },
  { name: "Response Rate", value: "92%", change: "+4%", status: "positive" },
  { name: "Most Positive Team", value: "Customer Success", change: "+6%", status: "positive" },
  { name: "Needs Attention", value: "Compensation", change: "-2%", status: "negative" }
]

// Verbatim comments for the table
const commentData = [
  { theme: 'Management Support', sentiment: 'Positive', comment: "My manager has been incredibly supportive of my professional development goals this quarter." },
  { theme: 'Work-Life Balance', sentiment: 'Negative', comment: "The expectations for after-hours availability has been increasing and it's affecting my personal time." },
  { theme: 'Team Collaboration', sentiment: 'Positive', comment: "I've never worked with such a collaborative and supportive team before. Really enjoying the culture." },
  { theme: 'Career Growth', sentiment: 'Neutral', comment: "While there are opportunities for learning, the path for advancement isn't always clear." },
  { theme: 'Compensation', sentiment: 'Negative', comment: "I feel that my compensation isn't competitive with what other companies are offering for similar roles." },
  { theme: 'Company Direction', sentiment: 'Positive', comment: "The recent company all-hands gave me much more confidence in our strategic direction." },
]

const Sentiment = () => {
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
            <h1 className="text-2xl font-semibold text-gray-900">Sentiment Report</h1>
            <p className="text-sm text-gray-500">Monitor employee satisfaction and workplace morale</p>
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Sentiment by Department</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData}>
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Sentiment Factors</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentFactors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} stroke="#6B7280" />
                <YAxis dataKey="name" type="category" stroke="#6B7280" width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Current Score" fill="#8349F0" />
                <Bar dataKey="previousScore" name="Previous Score" fill="#C4B5FD" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Trend chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Sentiment Trends (6 Months)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sentiment" name="Overall Sentiment" stroke="#8349F0" fill="#8349F0" fillOpacity={0.2} />
              <Area type="monotone" dataKey="workload" name="Workload" stroke="#EC4899" fill="#EC4899" fillOpacity={0.2} />
              <Area type="monotone" dataKey="management" name="Management" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
              <Area type="monotone" dataKey="culture" name="Culture" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
            </AreaChart>
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
      
      {/* Detailed data table - Employee comments */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Employee Verbatim Comments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commentData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.theme}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.sentiment === 'Positive' ? 'text-green-800 bg-green-100' : 
                      item.sentiment === 'Negative' ? 'text-red-800 bg-red-100' : 
                      'text-yellow-800 bg-yellow-100'
                    }`}>
                      {item.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.comment}</td>
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
          <li>Conduct targeted meetings with Product and Sales teams to understand and address their sentiment decline.</li>
          <li>Review compensation structures in relation to market rates, as this appears to be a growing concern.</li>
          <li>Share successful practices from the Marketing team's reorganization with other departments.</li>
          <li>Develop clearer career progression frameworks to address the uncertainty around advancement opportunities.</li>
          <li>Continue to cultivate the positive team dynamics that are driving high scores in that area.</li>
        </ul>
      </div>
    </div>
  )
}

export default Sentiment 