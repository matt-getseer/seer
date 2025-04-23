import { CaretDown, Funnel, DotsThree, Check } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'

const lineChartData = [
  { month: 'Jan', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Apr', value: 4500 },
  { month: 'May', value: 6000 },
  { month: 'Jun', value: 5500 },
]

const barChartData = [
  { name: 'Product A', value: 3200 },
  { name: 'Product B', value: 2800 },
  { name: 'Product C', value: 4100 },
  { name: 'Product D', value: 2400 },
]

const pieChartData = [
  { name: 'Enterprise', value: 45 },
  { name: 'Mid-Market', value: 30 },
  { name: 'Small Business', value: 25 },
]

const COLORS = ['#8349F0', '#A57CF8', '#BFA4FC']

const tableData = [
  { metric: 'Monthly Recurring Revenue', value: '$125,000', change: '+12.5%', status: 'positive' },
  { metric: 'Customer Acquisition Cost', value: '$1,200', change: '-5.2%', status: 'positive' },
  { metric: 'Churn Rate', value: '2.4%', change: '+0.3%', status: 'negative' },
  { metric: 'Net Revenue Retention', value: '108%', change: '+3%', status: 'positive' },
]

type ChartType = 'line' | 'bar' | 'area'

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

const Metrics = () => {
  const [revenueChartType, setRevenueChartType] = useState<ChartType>('line')
  const [performanceChartType, setPerformanceChartType] = useState<ChartType>('bar')

  const renderChart = (data: any[], type: ChartType) => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={data === lineChartData ? "month" : "name"} stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8349F0" strokeWidth={2} />
          </LineChart>
        )
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={data === lineChartData ? "month" : "name"} stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip />
            <Bar dataKey="value" fill="#8349F0" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={data === lineChartData ? "month" : "name"} stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip />
            <Area type="monotone" dataKey="value" fill="#8349F0" fillOpacity={0.2} stroke="#8349F0" strokeWidth={2} />
          </AreaChart>
        )
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Metrics Dashboard</h1>
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

      {/* Key Metrics Table */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
        <div className="min-w-full divide-y divide-gray-300">
          <div className="bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Key Metrics</h3>
          </div>
          <div className="divide-y divide-gray-300">
            {tableData.map((item, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{item.metric}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                    <span className={`text-sm font-medium ${item.status === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
                      {item.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <ChartTypeDropdown currentType={revenueChartType} onTypeChange={setRevenueChartType} />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(lineChartData, revenueChartType)}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Performance Chart */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Product Performance</h3>
            <ChartTypeDropdown currentType={performanceChartType} onTypeChange={setPerformanceChartType} />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(barChartData, performanceChartType)}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Segments</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8349F0"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
          <div className="bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-300">
            {[
              { event: 'New customer onboarded', details: 'Acme Corp', time: '2 hours ago' },
              { event: 'Subscription upgraded', details: 'TechStart Inc', time: '5 hours ago' },
              { event: 'Support ticket resolved', details: 'Global Systems', time: '1 day ago' },
              { event: 'Feature activation', details: 'DataFlow Ltd', time: '1 day ago' },
            ].map((item, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.event}</p>
                    <p className="text-sm text-gray-500">{item.details}</p>
                  </div>
                  <span className="text-sm text-gray-500">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Metrics 