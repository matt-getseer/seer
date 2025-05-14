export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Represent icon as string for now
  color: string;
  url?: string; // Optional url, as Sidebar.tsx definition had it
  slug?: string; // Optional slug, as Sidebar.tsx definition had it
}

export const reportCategories: ReportCategory[] = [
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Analyze team productivity, efficiency, and accomplishments',
    icon: 'ChartBar', // Placeholder string
    color: 'bg-indigo-50 border-indigo-200',
    url: '/reports/team-performance', // Added from Sidebar version
    slug: 'team-performance' // Added from Sidebar version
  },
  {
    id: 'core-competency',
    name: 'Core Competency',
    description: 'Evaluate key skills and abilities across departments',
    icon: 'Brain', // Placeholder string
    color: 'bg-blue-50 border-blue-200',
    url: '/reports/core-competency', // Added from Sidebar version
    slug: 'core-competency' // Added from Sidebar version
  },
  {
    id: 'engagement',
    name: 'Engagement',
    description: 'Track employee participation and involvement metrics',
    icon: 'HandsClapping', // Placeholder string
    color: 'bg-purple-50 border-purple-200',
    url: '/reports/engagement', // Added from Sidebar version
    slug: 'engagement' // Added from Sidebar version
  },
  {
    id: 'sentiment',
    name: 'Sentiment',
    description: 'Monitor employee satisfaction and workplace morale',
    icon: 'Smiley', // Placeholder string
    color: 'bg-green-50 border-green-200',
    url: '/reports/sentiment', // Added from Sidebar version
    slug: 'sentiment' // Added from Sidebar version
  },
  {
    id: 'top-performer',
    name: 'Top Performer',
    description: 'Identify outstanding employees and their achievements',
    icon: 'Star', // Placeholder string
    color: 'bg-amber-50 border-amber-200',
    url: '/reports/top-performers', // Corrected URL from Sidebar version
    slug: 'top-performers' // Corrected slug from Sidebar version
  },
  {
    id: 'employees-at-risk',
    name: 'Employees at Risk',
    description: 'Identify employees who may be at risk of leaving or performance issues',
    icon: 'WarningCircle', // Placeholder string
    color: 'bg-red-50 border-red-200',
    url: '/reports/employees-at-risk', // Added from Sidebar version
    slug: 'employees-at-risk' // Added from Sidebar version
  }
]; 