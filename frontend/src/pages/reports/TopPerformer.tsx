import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export, Star } from '@phosphor-icons/react'
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

// Sample data - in a real app, this would come from API
const topPerformerData = [
  { name: 'Alex Chen', department: 'Engineering', performanceScore: 94, leadership: 90, innovation: 95, teamwork: 92, quality: 96 },
  { name: 'Sophia Rodriguez', department: 'Product', performanceScore: 93, leadership: 92, innovation: 94, teamwork: 94, quality: 92 },
  { name: 'Michael Johnson', department: 'Marketing', performanceScore: 92, leadership: 95, innovation: 90, teamwork: 94, quality: 89 },
  { name: 'Emma Wilson', department: 'Sales', performanceScore: 91, leadership: 93, innovation: 88, teamwork: 90, quality: 94 },
  { name: 'David Kim', department: 'Customer Success', performanceScore: 90, leadership: 88, innovation: 85, teamwork: 96, quality: 91 },
]

// Department performance distribution
const departmentDistribution = [
  { department: 'Engineering', topPerformers: 8, averagePerformers: 22, emergingTalent: 12 },
  { department: 'Product', topPerformers: 6, averagePerformers: 14, emergingTalent: 8 },
  { department: 'Marketing', topPerformers: 4, averagePerformers: 12, emergingTalent: 4 },
  { department: 'Sales', topPerformers: 5, averagePerformers: 18, emergingTalent: 7 },
  { department: 'Customer Success', topPerformers: 7, averagePerformers: 20, emergingTalent: 5 },
]

// Radar chart data for a selected top performer
const radarData = [
  { attribute: 'Technical Skills', value: 92 },
  { attribute: 'Leadership', value: 90 },
  { attribute: 'Innovation', value: 95 },
  { attribute: 'Communication', value: 88 },
  { attribute: 'Teamwork', value: 92 },
  { attribute: 'Quality', value: 96 },
  { attribute: 'Productivity', value: 94 },
];

// Insights data
const insights = [
  {
    title: "Engineering has highest concentration of top performers",
    description: "The Engineering department leads with 8 top performers, representing 19% of their total headcount and contributing significantly to product innovation."
  },
  {
    title: "Top performers excel in multiple competencies",
    description: "Most top performers score highly across multiple competencies rather than specializing in one area, with an average of 4.2 competencies above 90%."
  },
  {
    title: "Quality of work is the highest performing attribute",
    description: "Among top performers, Quality of Work scores the highest with an average of 92.4%, followed by Innovation at 90.4%."
  }
]

// Key metrics data
const keyMetrics = [
  { name: "Total Top Performers", value: "30", change: "+5", status: "positive" },
  { name: "% of Workforce", value: "12.5%", change: "+1.8%", status: "positive" },
  { name: "Retention Rate", value: "97%", change: "+2%", status: "positive" },
  { name: "Promotion Rate", value: "28%", change: "+4%", status: "positive" }
]

// Promotion history for top performers
const promotionData = [
  { name: 'Alex Chen', department: 'Engineering', lastPromoted: '6 months ago', timeInRole: '1.5 years', readinessForNext: 'High' },
  { name: 'Sophia Rodriguez', department: 'Product', lastPromoted: '1 year ago', timeInRole: '1 year', readinessForNext: 'Medium' },
  { name: 'Michael Johnson', department: 'Marketing', lastPromoted: '8 months ago', timeInRole: '8 months', readinessForNext: 'Low' },
  { name: 'Emma Wilson', department: 'Sales', lastPromoted: '1.5 years ago', timeInRole: '1.5 years', readinessForNext: 'High' },
  { name: 'David Kim', department: 'Customer Success', lastPromoted: '10 months ago', timeInRole: '10 months', readinessForNext: 'Medium' },
]

const TopPerformer = () => {
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
            <h1 className="text-2xl font-semibold text-gray-900">Top Performer Report</h1>
            <p className="text-sm text-gray-500">Identify outstanding employees and their achievements</p>
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Performers by Department</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar name="Top Performers" dataKey="topPerformers" fill="#8349F0" />
                <Bar name="Average Performers" dataKey="averagePerformers" fill="#C4B5FD" />
                <Bar name="Emerging Talent" dataKey="emergingTalent" fill="#E9D5FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Secondary chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Profile: Alex Chen</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={90} data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="attribute" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Performance" dataKey="value" stroke="#8349F0" fill="#8349F0" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
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
      
      {/* Top performers table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Top Performers List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leadership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Innovation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teamwork</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topPerformerData.map((performer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{performer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{performer.performanceScore}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.leadership}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.innovation}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.teamwork}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.quality}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Career progression table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Career Progression Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Promoted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time in Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Readiness for Next Level</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotionData.map((performer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{performer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.lastPromoted}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.timeInRole}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      performer.readinessForNext === 'High' ? 'text-green-800 bg-green-100' : 
                      performer.readinessForNext === 'Medium' ? 'text-yellow-800 bg-yellow-100' : 
                      'text-red-800 bg-red-100'
                    }`}>
                      {performer.readinessForNext}
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
          <li>Develop individualized career advancement plans for all top performers to ensure retention.</li>
          <li>Establish a mentorship program where top performers can share knowledge with emerging talent.</li>
          <li>Consider Alex Chen and Emma Wilson for promotion based on their high readiness scores and time in current roles.</li>
          <li>Create cross-functional project opportunities to leverage the diverse strengths of top performers.</li>
          <li>Analyze what makes the Engineering department successful in developing top performers and apply those practices to other departments.</li>
        </ul>
      </div>
    </div>
  )
}

export default TopPerformer 