import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { interviewService, isTokenValid } from '../api/client'
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
    technicalScore: number
    cultureScore: number
    communicationScore: number
    overallRating: number
    notes: string | null
    createdAt: string
    updatedAt: string
    interviewId: number
  }
}

const InterviewDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [interview, setInterview] = useState<InterviewWithAnswers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Save the current interview ID to sessionStorage for refresh handling
  useEffect(() => {
    if (id) {
      sessionStorage.setItem('currentInterviewId', id)
    }
  }, [id])

  useEffect(() => {
    if (!isTokenValid()) {
      // Save the current path before redirecting to login
      localStorage.setItem('lastRoute', window.location.pathname)
      navigate('/login')
      return
    }

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
        
        if (axiosError.response?.status === 401) {
          // Save current path before redirecting
          localStorage.setItem('lastRoute', window.location.pathname)
          setError('Authentication error. Please log in again.')
          navigate('/login')
        } else if (axiosError.response?.status === 404) {
          setError('Interview not found.')
        } else {
          setError('Failed to load interview details.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchInterview()
  }, [id, navigate])

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
          <h1 className="text-2xl font-semibold text-gray-900">Interview Details</h1>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Interview Information</h3>
        </div>
        <div className="border-t border-gray-200">
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
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Interview Answers & Metrics</h3>
          </div>
          <div className="border-t border-gray-200">
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
              
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Technical Score</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {interview.interviewAnswer.technicalScore}/10
                    </span>
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Culture Score</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {interview.interviewAnswer.cultureScore}/10
                    </span>
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Communication Score</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {interview.interviewAnswer.communicationScore}/10
                    </span>
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Overall Rating</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {interview.interviewAnswer.overallRating}/10
                    </span>
                  </dd>
                </div>
              </div>
              
              {interview.interviewAnswer.notes && (
                <div className="bg-gray-50 px-4 py-5 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Additional Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {interview.interviewAnswer.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 text-center py-10">
            <p className="text-gray-500 mb-4">No answers have been recorded for this interview.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default InterviewDetail 