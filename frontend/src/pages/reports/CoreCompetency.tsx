import { useState } from 'react'
import { CaretLeft, CaretDown, Calendar, DownloadSimple, Export, Brain } from '@phosphor-icons/react'
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
const competencyData = [
  { skill: 'Technical Knowledge', score: 84, previousScore: 80, change: '+4' },
  { skill: 'Problem Solving', score: 89, previousScore: 86, change: '+3' },
  { skill: 'Communication', score: 78, previousScore: 82, change: '-4' },
  { skill: 'Leadership', score: 76, previousScore: 72, change: '+4' },
  { skill: 'Teamwork', score: 92, previousScore: 89, change: '+3' },
  { skill: 'Adaptability', score: 81, previousScore: 75, change: '+6' },
]

const roleCompetencyData = [
  {
    role: 'Software Engineer',
    'Technical Knowledge': 90,
    'Problem Solving': 86,
    'Communication': 72,
    'Leadership': 65,
    'Teamwork': 88,
    'Adaptability': 80,
  },
  {
    role: 'Product Manager',
    'Technical Knowledge': 75,
    'Problem Solving': 92,
    'Communication': 90,
    'Leadership': 85,
    'Teamwork': 88,
    'Adaptability': 82,
  },
  {
    role: 'UX Designer',
    'Technical Knowledge': 72,
    'Problem Solving': 88,
    'Communication': 85,
    'Leadership': 70,
    'Teamwork': 90,
    'Adaptability': 86,
  },
  {
    role: 'Sales Executive',
    'Technical Knowledge': 65,
    'Problem Solving': 80,
    'Communication': 95,
    'Leadership': 78,
    'Teamwork': 85,
    'Adaptability': 90,
  }
]

// Radar chart data
const radarData = [
  { subject: 'Technical Knowledge', A: 84, B: 80, fullMark: 100 },
  { subject: 'Problem Solving', A: 89, B: 86, fullMark: 100 },
  { subject: 'Communication', A: 78, B: 82, fullMark: 100 },
  { subject: 'Leadership', A: 76, B: 72, fullMark: 100 },
  { subject: 'Teamwork', A: 92, B: 89, fullMark: 100 },
  { subject: 'Adaptability', A: 81, B: 75, fullMark: 100 },
];

// Insights data
const insights = [
  {
    title: "Adaptability showing strongest improvement",
    description: "Adaptability scores have increased by 6 points, the largest improvement across all competencies, suggesting training initiatives are effective."
  },
  {
    title: "Communication skills need attention",
    description: "Communication has decreased by 4 points. This may require targeted training programs and clearer expectations for team interactions."
  },
  {
    title: "Teamwork remains a consistent strength",
    description: "With a score of 92, Teamwork continues to be the highest-rated competency, reflecting a positive collaborative culture."
  }
]

// Key metrics data
const keyMetrics = [
  { name: "Average Competency Score", value: "83.3%", change: "+2.7%", status: "positive" },
  { name: "Top Competency", value: "Teamwork (92%)", change: "+3%", status: "positive" },
  { name: "Most Improved", value: "Adaptability", change: "+6%", status: "positive" },
  { name: "Needs Attention", value: "Communication", change: "-4%", status: "negative" }
]

const CoreCompetency = () => {
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
            <h1 className="text-2xl font-semibold text-gray-900">Core Competency Report</h1>
            <p className="text-sm text-gray-500">Evaluate key skills and abilities across departments</p>
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Competency Scores</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="skill" stroke="#6B7280" />
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Competency Analysis</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={90} data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Current Period" dataKey="A" stroke="#8349F0" fill="#8349F0" fillOpacity={0.5} />
                <Radar name="Previous Period" dataKey="B" stroke="#C4B5FD" fill="#C4B5FD" fillOpacity={0.5} />
                <Legend />
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
      
      {/* Detailed data table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Detailed Competency Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Competency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Current Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Previous Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competencyData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.skill}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.score}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.previousScore}%</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>{item.change}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.change.startsWith('+') ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                    }`}>
                      {item.change.startsWith('+') ? 'Improving' : 'Declining'}
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
          <li>Launch targeted communication workshops to address the decline in communication competency scores.</li>
          <li>Recognize and celebrate teams with high teamwork scores at the next company meeting.</li>
          <li>Document and share adaptability best practices from teams showing significant improvement.</li>
          <li>Consider mentorship programs pairing those with high leadership scores with employees looking to develop this competency.</li>
        </ul>
      </div>
    </div>
  )
}

export default CoreCompetency 