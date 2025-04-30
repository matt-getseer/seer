import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { CaretDown, Funnel, DotsThree, Check, Brain, Lightning, ChartLine, Users, ChartPie, Lightbulb, ArrowUp } from '@phosphor-icons/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

// Chart data for employee performance
const performanceTrendData = [
  { month: 'Jan', avgScore: 3.2, engagement: 72 },
  { month: 'Feb', avgScore: 3.4, engagement: 75 },
  { month: 'Mar', avgScore: 3.5, engagement: 78 },
  { month: 'Apr', avgScore: 3.7, engagement: 80 },
  { month: 'May', avgScore: 3.9, engagement: 83 },
  { month: 'Jun', avgScore: 4.1, engagement: 85 },
]

// Company health score data
const healthScoreData = {
  score: 783,
  maxScore: 1000,
  change: 12,
  components: [
    { name: 'Performance', value: 82 },
    { name: 'Engagement', value: 78 },
    { name: 'Communication', value: 85 },
    { name: 'Leadership', value: 73 },
    { name: 'Sentiment', value: 81 }
  ]
}

// Competency data 
const competencyData = [
  { name: 'Communication', value: 78 },
  { name: 'Leadership', value: 65 },
  { name: 'Technical', value: 83 },
  { name: 'Collaboration', value: 81 },
  { name: 'Adaptability', value: 72 },
]

// Employee engagement breakdown
const engagementData = [
  { name: 'Highly Engaged', value: 35 },
  { name: 'Engaged', value: 40 },
  { name: 'Neutral', value: 15 },
  { name: 'Disengaged', value: 10 },
]

// Sentiment analysis data
const sentimentData = [
  { category: 'Positive', count: 68 },
  { category: 'Neutral', count: 22 },
  { category: 'Negative', count: 10 },
]

// Team performance radar data
const radarData = [
  { subject: 'Communication', A: 85, B: 75, fullMark: 100 },
  { subject: 'Technical Skills', A: 90, B: 80, fullMark: 100 },
  { subject: 'Leadership', A: 70, B: 65, fullMark: 100 },
  { subject: 'Collaboration', A: 82, B: 76, fullMark: 100 },
  { subject: 'Innovation', A: 78, B: 85, fullMark: 100 },
]

// Colors for charts
const COLORS = ['#8349F0', '#A57CF8', '#BFA4FC', '#D9D4FF']
const SENTIMENT_COLORS = ['#4CAF50', '#9E9E9E', '#F44336']
const PRIMARY_CHART_COLOR = "#8884d8"; // Color from EmployeeProfile
const SECONDARY_CHART_COLOR = "#4CAF50"; // Existing secondary color for comparison

type ChartType = 'line' | 'bar' | 'area'

interface ChartDataPoint {
  month?: string
  name?: string
  category?: string
  value?: number
  avgScore?: number
  engagement?: number
  count?: number
}

// Circle progress component for health score
const CircleProgressRing = ({ 
  value, 
  maxValue, 
  size = 180, 
  strokeWidth = 15,
  textColor = "white"
}: { 
  value: number
  maxValue: number
  size?: number
  strokeWidth?: number
  textColor?: string
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = value / maxValue;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]" 
      >
        {/* Background circle */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius}
          fill="transparent"
          stroke="white"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl md:text-5xl font-bold text-${textColor}`}>{value}</span>
        <span className={`text-base opacity-80 text-${textColor}`}>/ {maxValue}</span>
      </div>
    </div>
  );
};

const ChartTypeDropdown = ({ 
  currentType, 
  onTypeChange 
}: { 
  currentType: ChartType
  onTypeChange: (type: ChartType) => void 
}) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-1 hover:bg-gray-100 rounded-md">
          <DotsThree className="w-5 h-5 text-gray-500" weight="bold" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] p-1">
          <DropdownMenu.Item 
            className={`flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer ${currentType === 'line' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            onClick={() => onTypeChange('line')}
          >
            <Check className={`w-4 h-4 mr-2 ${currentType === 'line' ? 'opacity-100' : 'opacity-0'}`} />
            Line Chart
          </DropdownMenu.Item>
          <DropdownMenu.Item 
            className={`flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer ${currentType === 'bar' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            onClick={() => onTypeChange('bar')}
          >
            <Check className={`w-4 h-4 mr-2 ${currentType === 'bar' ? 'opacity-100' : 'opacity-0'}`} />
            Bar Chart
          </DropdownMenu.Item>
          <DropdownMenu.Item 
            className={`flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer ${currentType === 'area' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            onClick={() => onTypeChange('area')}
          >
            <Check className={`w-4 h-4 mr-2 ${currentType === 'area' ? 'opacity-100' : 'opacity-0'}`} />
            Area Chart
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const Home = () => {
  const [performanceChartType, setPerformanceChartType] = useState<ChartType>('area')
  const [competencyChartType, setCompetencyChartType] = useState<ChartType>('area')

  const renderPerformanceChart = (data: ChartDataPoint[], type: ChartType) => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
            <YAxis yAxisId="left" orientation="left" stroke={PRIMARY_CHART_COLOR} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={SECONDARY_CHART_COLOR} fontSize={12} />
            <Tooltip />
            <Line yAxisId="left" type="monotone" dataKey="avgScore" name="Performance Score" stroke={PRIMARY_CHART_COLOR} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="engagement" name="Engagement %" stroke={SECONDARY_CHART_COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        )
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
            <YAxis yAxisId="left" orientation="left" stroke={PRIMARY_CHART_COLOR} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={SECONDARY_CHART_COLOR} fontSize={12} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="avgScore" name="Performance Score" fill={PRIMARY_CHART_COLOR} />
            <Bar yAxisId="right" dataKey="engagement" name="Engagement %" fill={SECONDARY_CHART_COLOR} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
            <YAxis yAxisId="left" orientation="left" stroke={PRIMARY_CHART_COLOR} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={SECONDARY_CHART_COLOR} fontSize={12} />
            <Tooltip />
            <Area yAxisId="left" type="monotone" dataKey="avgScore" name="Performance Score" fill={PRIMARY_CHART_COLOR} fillOpacity={0.3} stroke={PRIMARY_CHART_COLOR} strokeWidth={2} />
            <Area yAxisId="right" type="monotone" dataKey="engagement" name="Engagement %" fill={SECONDARY_CHART_COLOR} fillOpacity={0.2} stroke={SECONDARY_CHART_COLOR} strokeWidth={2} />
          </AreaChart>
        )
    }
  }

  const renderCompetencyChart = (data: ChartDataPoint[], type: ChartType) => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" stroke="#6B7280" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="#6B7280" width={100} fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill={PRIMARY_CHART_COLOR} />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={PRIMARY_CHART_COLOR} strokeWidth={2} dot={false}/>
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="value" fill={PRIMARY_CHART_COLOR} fillOpacity={0.3} stroke={PRIMARY_CHART_COLOR} strokeWidth={2}/>
          </AreaChart>
        )
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Filters at the top */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Time Range: Last 6 months
            <CaretDown className="ml-2 h-4 w-4" />
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Funnel className="mr-2 h-4 w-4" />
            Filter
          </button>
        </div>
      </div>
    
      {/* Company Health Score Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg mb-8 overflow-hidden">
         <div className="p-8">
           <div className="flex justify-end items-center mb-4">
             <div className="bg-white bg-opacity-20 rounded-md px-3 py-1 flex items-center">
               <ArrowUp className="mr-1 text-green-300" size={16} weight="bold" />
               <span className="text-green-300 font-medium text-sm">+{healthScoreData.change} points</span>
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-6">
             <div className="flex-1 flex justify-center">
               <CircleProgressRing 
                 value={healthScoreData.score} 
                 maxValue={healthScoreData.maxScore} 
                 size={200}
                 strokeWidth={12}
               />
             </div>
             
             <div className="flex-1">
               <div className="grid grid-cols-2 gap-4">
                 {healthScoreData.components.map((component, index) => (
                   <div key={index} className="bg-white bg-opacity-10 rounded-lg p-3">
                     <p className="text-white opacity-80 text-sm">{component.name}</p>
                     <div className="flex items-center">
                       <div className="h-2 flex-1 bg-white bg-opacity-20 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-white" 
                           style={{width: `${component.value}%`}}
                         ></div>
                       </div>
                       <span className="text-white text-sm ml-2">{component.value}/100</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
         <div className="bg-white rounded-lg border border-gray-300 p-6 flex items-center">
           <div className="rounded-full bg-purple-100 p-3 mr-4">
             <ChartLine size={24} weight="duotone" className="text-purple-700" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500">Performance Score</p>
             <p className="text-2xl font-bold text-gray-900">76/100</p>
             <p className="text-sm text-green-600">+6 from previous</p>
           </div>
         </div>
         <div className="bg-white rounded-lg border border-gray-300 p-6 flex items-center">
           <div className="rounded-full bg-green-100 p-3 mr-4">
             <Users size={24} weight="duotone" className="text-green-700" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500">Engagement Rate</p>
             <p className="text-2xl font-bold text-gray-900">83%</p>
             <p className="text-sm text-green-600">+5% from previous</p>
           </div>
         </div>
         <div className="bg-white rounded-lg border border-gray-300 p-6 flex items-center">
           <div className="rounded-full bg-blue-100 p-3 mr-4">
             <ChartPie size={24} weight="duotone" className="text-blue-700" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500">Review Completion</p>
             <p className="text-2xl font-bold text-gray-900">92%</p>
             <p className="text-sm text-green-600">+7% from previous</p>
           </div>
         </div>
         <div className="bg-white rounded-lg border border-gray-300 p-6 flex items-center">
           <div className="rounded-full bg-amber-100 p-3 mr-4">
             <Lightbulb size={24} weight="duotone" className="text-amber-700" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500">Growth Areas</p>
             <p className="text-2xl font-bold text-gray-900">37</p>
             <p className="text-sm text-green-600">-8 from previous</p>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Performance Trend Chart */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center">
               <Lightning size={20} weight="duotone" className="text-indigo-600 mr-2" />
               <h3 className="text-lg font-medium text-gray-900">Performance & Engagement Trend</h3>
             </div>
             <ChartTypeDropdown currentType={performanceChartType} onTypeChange={setPerformanceChartType} />
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               {renderPerformanceChart(performanceTrendData, performanceChartType)}
             </ResponsiveContainer>
           </div>
        </div>

        {/* Team Performance Radar */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center">
               <Users size={20} weight="duotone" className="text-indigo-600 mr-2" />
               <h3 className="text-lg font-medium text-gray-900">Team Performance Analysis</h3>
             </div>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                 <PolarGrid />
                 <PolarAngleAxis dataKey="subject" />
                 <PolarRadiusAxis angle={30} domain={[0, 100]} />
                 <Radar name="Current Quarter" dataKey="A" stroke={PRIMARY_CHART_COLOR} fill={PRIMARY_CHART_COLOR} fillOpacity={0.5} />
                 <Radar name="Previous Quarter" dataKey="B" stroke={SECONDARY_CHART_COLOR} fill={SECONDARY_CHART_COLOR} fillOpacity={0.3} />
                 <Tooltip />
               </RadarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Competency Analysis */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center">
               <Brain size={20} weight="duotone" className="text-indigo-600 mr-2" />
               <h3 className="text-lg font-medium text-gray-900">Core Competency Analysis</h3>
             </div>
             <ChartTypeDropdown currentType={competencyChartType} onTypeChange={setCompetencyChartType} />
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               {renderCompetencyChart(competencyData, competencyChartType)}
             </ResponsiveContainer>
           </div>
        </div>

        {/* AI-Analyzed Engagement */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center">
               <ChartPie size={20} weight="duotone" className="text-indigo-600 mr-2" />
               <h3 className="text-lg font-medium text-gray-900">AI-Analyzed Engagement</h3>
             </div>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={engagementData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   fill="#8349F0"
                   dataKey="value"
                   label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                 >
                   {engagementData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* AI Sentiment Analysis */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
           <div className="flex items-center mb-4">
             <Lightning size={20} weight="duotone" className="text-indigo-600 mr-2" />
             <h3 className="text-lg font-medium text-gray-900">AI Voice Sentiment Analysis</h3>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={sentimentData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                 <XAxis dataKey="category" stroke="#6B7280" />
                 <YAxis stroke="#6B7280" />
                 <Tooltip />
                 <Bar dataKey="count" name="Count">
                   {sentimentData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* AI-Generated Insights */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
           <div className="bg-gray-50 px-6 py-3 flex items-center">
             <Brain size={20} weight="duotone" className="text-indigo-600 mr-2" />
             <h3 className="text-lg font-medium text-gray-900">AI-Generated Performance Insights</h3>
           </div>
           <div className="divide-y divide-gray-300">
             {[
               { insight: 'Communication skills consistently rated highest across teams', impact: 'Positive', time: '2 hours ago' },
               { insight: 'Technical skill gaps identified in Engineering Team', impact: 'Needs Attention', time: '5 hours ago' },
               { insight: 'Leadership development showing improvement in Management', impact: 'Positive', time: '1 day ago' },
               { insight: 'Employee sentiment trending upward after recent initiatives', impact: 'Positive', time: '1 day ago' },
             ].map((item, index) => (
               <div key={index} className="px-6 py-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-gray-900">{item.insight}</p>
                     <p className={`text-sm ${item.impact === 'Positive' ? 'text-green-600' : 'text-amber-600'}`}>{item.impact}</p>
                   </div>
                   <span className="text-sm text-gray-500">{item.time}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

    </div>
  );
}

export default Home 