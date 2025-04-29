import { useState, useEffect } from 'react'
import { interviewService } from '../api/client'
import { useParams, useNavigate } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import { AxiosError } from 'axios'

type InterviewWithAnswers = {
  id: number
  name: string
  team: string
  interviewName: string
  dateTaken: string
  createdAt: string
  updatedAt: string
  userId: number
  interviewAnswer?: {
    id: number
    firstAnswer: string
    secondAnswer: string
    createdAt: string
    updatedAt: string
    interviewId: number
  }
}

// Mock data for ratings charts
const mockRatings = {
  sentiment: 0.75, // 0-1 scale
  engagement: 0.82,
  worklifeBalance: 0.65,
  culture: 0.90
}

// Mock data for takeaways and actions
const mockTakeaways = [
  "Strong problem-solving skills demonstrated",
  "Excellent communication with team members",
  "Shows initiative in challenging situations",
  "Adaptable to changing requirements",
  "Positive attitude toward feedback"
]

const mockActions = [
  "Provide additional training on cloud architecture",
  "Pair with senior developer for code reviews",
  "Schedule follow-up meeting to discuss career goals",
  "Offer opportunities for technical presentations",
  "Connect with mentor from engineering leadership"
]

// Metrics context descriptions
const metricsContext = {
  sentiment: "Measures the overall positive or negative tone expressed during the interview. Higher scores indicate more positive language and emotional expressions.",
  engagement: "Evaluates the candidate's level of interest, enthusiasm, and participation in the interview process. Higher scores reflect active involvement and genuine interest.",
  worklifeBalance: "Assesses the candidate's perspective on balancing professional responsibilities with personal life. Higher scores suggest healthier boundaries and sustainable work habits.",
  culture: "Indicates how well the candidate's values and working style align with the company culture. Higher scores represent stronger cultural alignment."
}

// Employee-specific metric explanations
const employeeMetricExplanations = {
  sentiment: "The candidate expressed positive opinions about previous roles and teams. While sharing challenges, they maintained a constructive tone and focused on solutions rather than complaints. Some hesitation when discussing conflict resolution lowered the overall score.",
  engagement: "Demonstrated high interest by asking thoughtful questions about the team and technology. Provided detailed responses showing preparation and research about the company. Actively built upon interviewer questions with relevant examples.",
  worklifeBalance: "Mentioned occasional difficulty disconnecting from work and checking emails during off-hours. However, showed awareness of the issue and described implementing personal boundaries like dedicated family time and regular exercise.",
  culture: "Values closely align with company principles, especially regarding collaboration and innovation. Previous experience in similar team structures indicates adaptability. Communication style matches team dynamics, and expressed enthusiasm for the company mission."
}

const InterviewDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [interview, setInterview] = useState<InterviewWithAnswers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratings] = useState(mockRatings) // In a real app, you'd fetch these from an API
  const [takeaways] = useState(mockTakeaways)
  const [actions] = useState(mockActions)
  const [context] = useState(metricsContext)
  const [metricExplanations] = useState(employeeMetricExplanations)

  // Save the current interview ID to sessionStorage for refresh handling
  useEffect(() => {
    if (id) {
      sessionStorage.setItem('currentInterviewId', id)
    }
  }, [id])

  useEffect(() => {
    // Get the interview ID from params or sessionStorage if refreshed
    const interviewId = id || sessionStorage.getItem('currentInterviewId')
    
    if (!interviewId) {
      setError('Interview ID not found')
      setLoading(false)
      return
    }

    const fetchInterview = async () => {
      try {
        setLoading(true)
        const response = await interviewService.getInterviewById(Number(interviewId))
        setInterview(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch interview:', err)
        const axiosError = err as AxiosError
        
        if (axiosError.response?.status === 404) {
          setError('Interview not found.')
        } else {
          setError('Failed to load interview details.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchInterview()
  }, [id])

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) {
        return 'Invalid date'
      }
      return format(date, 'PPP')
    } catch (err) {
      console.error('Error formatting date:', err)
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Loading interview details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/interviews')}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Back to Interviews
        </button>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Interview not found.</p>
        </div>
        <button
          onClick={() => navigate('/interviews')}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Back to Interviews
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/interviews')}
            className="text-indigo-600 hover:text-indigo-900 mb-4 flex items-center"
          >
            ← Back to Interviews
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Monthly check in</h1>
        </div>
      </div>

      {/* Interview Metrics/Charts Section */}
      <div className="bg-white border border-gray-300 overflow-hidden rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {/* Sentiment Chart */}
          <div className="flex flex-col items-center">
            <h4 className="mb-2 text-gray-700 font-medium">Sentiment</h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${ratings.sentiment * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-gray-600">{Math.round(ratings.sentiment * 100)}%</p>
          </div>

          {/* Engagement Chart */}
          <div className="flex flex-col items-center">
            <h4 className="mb-2 text-gray-700 font-medium">Engagement</h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${ratings.engagement * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-gray-600">{Math.round(ratings.engagement * 100)}%</p>
          </div>

          {/* Work-life Balance Chart */}
          <div className="flex flex-col items-center">
            <h4 className="mb-2 text-gray-700 font-medium">Work-life Balance</h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-600 h-2.5 rounded-full" 
                style={{ width: `${ratings.worklifeBalance * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-gray-600">{Math.round(ratings.worklifeBalance * 100)}%</p>
          </div>

          {/* Culture Chart */}
          <div className="flex flex-col items-center">
            <h4 className="mb-2 text-gray-700 font-medium">Culture</h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-amber-600 h-2.5 rounded-full" 
                style={{ width: `${ratings.culture * 100}%` }}
              ></div>
            </div>
            <p className="mt-1 text-gray-600">{Math.round(ratings.culture * 100)}%</p>
          </div>
        </div>
      </div>

      {/* Takeaways and Actions Section */}
      <div className="bg-white border border-gray-300 overflow-hidden rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Positive Takeaways */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">Positive Takeaways</h4>
            <ul className="space-y-3">
              {takeaways.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                    <span className="text-green-600 text-sm">✓</span>
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Things to Action */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">Things to Action</h4>
            <ul className="space-y-3">
              {actions.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center mr-2">
                    <span className="text-amber-600 text-sm">→</span>
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Metrics Context Section */}
      <div className="bg-white border border-gray-300 overflow-hidden rounded-lg mb-6">
        <div>
          <dl>
            <div className="bg-white px-4 py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-900 flex items-center mb-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                Sentiment ({Math.round(ratings.sentiment * 100)}%)
              </dt>
              <dd className="mt-1 text-sm text-gray-700 sm:mt-0">
                <p>{metricExplanations.sentiment}</p>
              </dd>
            </div>
            
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-900 flex items-center mb-2">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                Engagement ({Math.round(ratings.engagement * 100)}%)
              </dt>
              <dd className="mt-1 text-sm text-gray-700 sm:mt-0">
                <p>{metricExplanations.engagement}</p>
              </dd>
            </div>
            
            <div className="bg-white px-4 py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-900 flex items-center mb-2">
                <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
                Work-life Balance ({Math.round(ratings.worklifeBalance * 100)}%)
              </dt>
              <dd className="mt-1 text-sm text-gray-700 sm:mt-0">
                <p>{metricExplanations.worklifeBalance}</p>
              </dd>
            </div>
            
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-900 flex items-center mb-2">
                <div className="w-3 h-3 bg-amber-600 rounded-full mr-2"></div>
                Culture ({Math.round(ratings.culture * 100)}%)
              </dt>
              <dd className="mt-1 text-sm text-gray-700 sm:mt-0">
                <p>{metricExplanations.culture}</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white border border-gray-300 overflow-hidden rounded-lg mb-6">
        <div>
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Interviewee</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{interview.name}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Team</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{interview.team}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Interview Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{interview.interviewName}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date Taken</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(interview.dateTaken)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {interview.interviewAnswer ? (
        <div className="bg-white border border-gray-300 overflow-hidden rounded-lg">
          <div>
            <dl>
              <div className="bg-white px-4 py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 mb-2">Technical Assessment Answer</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {interview.interviewAnswer.firstAnswer || 'No answer provided'}
                </dd>
              </div>
              
              <div className="bg-gray-50 px-4 py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 mb-2">Cultural Fit Assessment Answer</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {interview.interviewAnswer.secondAnswer || 'No answer provided'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-300 overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 text-center py-10">
            <p className="text-gray-500 mb-4">No answers have been recorded for this interview.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default InterviewDetail 