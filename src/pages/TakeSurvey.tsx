import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyQuestion, SurveyParticipant, SurveyAnswer } from '../types/survey';
import { Survey } from '../lib/supabase';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';

// Add Web Speech API type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionError) => any) | null;
  onend: ((this: SpeechRecognition) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SurveyData {
  survey: Survey | null;
  participant: SurveyParticipant | null;
  questions: SurveyQuestion[];
  creatorLogo?: string | null;
}

interface TakeSurveyProps {
  isPreview?: boolean;
}

const TakeSurvey: React.FC<TakeSurveyProps> = ({ isPreview = false }) => {
  const { token, id, mode } = useParams<{ token?: string; id?: string; mode?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'questions' | 'complete'>('welcome');
  const [surveyData, setSurveyData] = useState<SurveyData>({
    survey: null,
    participant: null,
    questions: [],
    creatorLogo: null
  });
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(180); // 3 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveIsPreview = isPreview || mode === 'preview';

  console.log('TakeSurvey component mounted:', {
    isPreview,
    effectiveIsPreview,
    token,
    surveyId: id,
    mode,
    params: useParams(),
    currentUrl: window.location.href
  });

  const handleAnswerChange = useCallback((questionId: string, answer: string | number | boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answer },
    }));
  }, []);

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        setLoading(true);
        
        if (effectiveIsPreview) {
          console.log('Preview mode - attempting to fetch survey with ID:', id);
          // First fetch the survey data
          const { data: surveyData, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', id)
            .single();

          console.log('Preview survey fetch result:', { 
            data: surveyData, 
            error: surveyError,
            errorDetails: surveyError ? {
              message: surveyError.message,
              details: surveyError.details,
              hint: surveyError.hint,
              code: surveyError.code
            } : null,
            currentUrl: window.location.href
          });

          if (surveyError) {
            console.error('Survey fetch error details:', {
              message: surveyError.message,
              details: surveyError.details,
              hint: surveyError.hint,
              code: surveyError.code
            });
            throw surveyError;
          }

          if (!surveyData) {
            console.error('No survey data found for ID:', id);
            throw new Error('Survey not found');
          }

          // Then fetch the creator's profile separately
          const { data: creatorProfile, error: profileError } = await supabase
            .from('profiles')
            .select('logo_url')
            .eq('id', surveyData.user_id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            // Don't throw here, just log the error as logo is optional
          }

          // Fetch survey questions
          console.log('Attempting to fetch questions for survey:', id);
          const { data: questions, error: questionsError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('survey_id', id)
            .order('order_number', { ascending: true });

          if (questionsError) {
            console.error('Questions fetch error:', questionsError);
            throw questionsError;
          }

          setSurveyData({
            survey: surveyData,
            participant: null,
            questions: questions || [],
            creatorLogo: creatorProfile?.logo_url || null
          });
        } else {
          // Participant token flow
          if (!token) {
            throw new Error('No token provided');
          }

          console.log('Attempting to fetch participant with token:', {
            token,
            tokenLength: token.length,
            tokenType: typeof token,
            queryString: `participation_token=eq.${token}`
          });

          // First fetch the participant data without .single()
          const { data: participantData, error: participantError } = await supabase
            .from('participants')
            .select('*, survey:surveys(title)')
            .eq('participation_token', token);

          console.log('Raw participant query result:', {
            data: participantData,
            count: participantData?.length,
            error: participantError,
            requestDetails: {
              endpoint: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/participants`,
              queryParams: `select=*&participation_token=eq.${token}`
            }
          });

          if (participantError) {
            console.error('Participant fetch error:', {
              message: participantError.message,
              details: participantError.details,
              hint: participantError.hint,
              code: participantError.code
            });
            throw participantError;
          }

          if (!participantData || participantData.length === 0) {
            console.error('No participant found with token:', token);
            throw new Error('Invalid or expired survey link. Please check your email for a valid link.');
          }

          const participant = participantData[0];
          console.log('Found participant:', participant);

          // Then fetch the survey data
          const { data: surveyData, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', participant.survey_id)
            .single();

          console.log('Survey fetch result:', { data: surveyData, error: surveyError });

          if (surveyError) {
            console.error('Survey fetch error:', surveyError);
            throw surveyError;
          }

          // Fetch creator's profile
          let creatorLogo = null;
          if (surveyData?.user_id) {
            const { data: creatorProfile, error: profileError } = await supabase
              .from('profiles')
              .select('logo_url')
              .eq('id', surveyData.user_id)
              .single();
            
            console.log('Profile fetch result:', { data: creatorProfile, error: profileError });
            
            creatorLogo = creatorProfile?.logo_url;
          }

          // Check if survey is already completed
          const { data: responseData, error: responseError } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('survey_id', participant.survey_id)
            .eq('participant_id', participant.id)
            .single();

          console.log('Response check result:', { data: responseData, error: responseError });

          if (responseData?.completed_at) {
            setError('You have already completed this survey.');
            return;
          }

          // Fetch survey questions
          const { data: questions, error: questionsError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('survey_id', participant.survey_id)
            .order('order_number', { ascending: true });

          console.log('Questions fetch result:', { data: questions, error: questionsError });

          if (questionsError) {
            console.error('Questions fetch error:', questionsError);
            throw questionsError;
          }

          setSurveyData({
            survey: surveyData,
            participant: participant,
            questions: questions || [],
            creatorLogo: creatorLogo
          });
        }
      } catch (err) {
        console.error('Error in fetchSurveyData:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading the survey');
      } finally {
        setLoading(false);
      }
    };

    if (token || (effectiveIsPreview && id)) {
      console.log('Initializing with:', { effectiveIsPreview, id, token });
      fetchSurveyData();
    }
  }, [token, id, effectiveIsPreview]);

  // Initialize speech recognition once
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';

      speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
        const question = surveyData.questions[currentQuestionIndex];
        if (!question || question.type !== 'text') {
          return;
        }
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        handleAnswerChange(question.id, transcript);
      };

      speechRecognition.onerror = (event: SpeechRecognitionError) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      speechRecognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      recognitionRef.current = speechRecognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, surveyData.questions, handleAnswerChange]);

  // Handle recording state changes
  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        // Start timer
        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              stopRecording();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setIsRecording(false);
      }
    } else if (!isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const handleStartSurvey = () => {
    setCurrentStep('questions');
  };

  const handleNext = () => {
    const currentQuestion = surveyData.questions[currentQuestionIndex];
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      setError('Please answer this question before proceeding.');
      return;
    }

    setError(null);
    if (currentQuestionIndex < surveyData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (effectiveIsPreview) {
      // In preview mode, just show completion message and return to survey overview
      setCurrentStep('complete');
      setTimeout(() => {
        navigate(`/surveys/${id}`);
      }, 3000);
      return;
    }

    try {
      setLoading(true);
      
      if (!surveyData.survey || !surveyData.participant) {
        throw new Error('Survey data not found');
      }

      console.log('Submitting survey response with data:', {
        survey_id: surveyData.survey.id,
        participant_id: surveyData.participant.id,
        answers: Object.values(answers)
      });

      // Submit the response
      const { data, error: responseError } = await supabase
        .from('survey_responses')
        .upsert({
          survey_id: surveyData.survey.id,
          participant_id: surveyData.participant.id,
          completed_at: new Date().toISOString(),
          answers: Object.values(answers),
        });

      if (responseError) {
        console.error('Survey submission error:', {
          message: responseError.message,
          details: responseError.details,
          hint: responseError.hint
        });
        throw responseError;
      }

      console.log('Survey response submitted successfully:', data);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Error submitting survey:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the survey');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      setTimeRemaining(180);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false);
    }
  };

  const clearText = () => {
    const currentQuestion = surveyData.questions[currentQuestionIndex];
    handleAnswerChange(currentQuestion.id, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="rounded-lg bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!surveyData.survey || (!surveyData.participant && !effectiveIsPreview)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Survey not found</p>
        </div>
      </div>
    );
  }

  const currentQuestion = surveyData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / surveyData.questions.length) * 100;

  // Debug logging for questions
  console.log('Current survey state:', {
    currentStep,
    questions: surveyData.questions,
    currentQuestionIndex,
    currentQuestion,
    questionCount: surveyData.questions.length,
    effectiveIsPreview
  });

  return (
    <>
      {effectiveIsPreview && (
        <div className="fixed top-0 left-0 right-0 bg-primary-600 text-white px-4 py-2 text-center text-sm z-50">
          Preview Mode - Responses will not be saved
        </div>
      )}
      <div className={`min-h-screen bg-gray-50 flex flex-col ${effectiveIsPreview ? 'pt-10' : ''}`}>
        <div className="max-w-3xl mx-auto w-full px-4 py-8">
          <div className="flex justify-center mb-8 pt-10 pb-6">
            <img
              src={surveyData.creatorLogo || "/CutOnce.png"}
              alt={surveyData.creatorLogo ? "Survey Creator Logo" : "CutOnce Logo"}
              className="h-10 max-h-[40px] object-contain"
            />
          </div>
          {currentStep === 'welcome' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {surveyData.survey.title}
                </h1>
                <p className="text-gray-600 mb-6">{surveyData.survey.description}</p>
                {!effectiveIsPreview && surveyData.participant?.name && (
                  <p className="text-sm text-gray-500 mb-6">
                    Welcome, {surveyData.participant.name}
                  </p>
                )}
                <button
                  onClick={handleStartSurvey}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Start Survey
                </button>
              </div>
            </div>
          )}

          {currentStep === 'questions' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {surveyData.questions.length === 0 ? (
                  <div className="text-center">
                    <p className="text-gray-500">No questions found for this survey.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-primary-600">
                              Question {currentQuestionIndex + 1} of {surveyData.questions.length}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-primary-600">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                          <div
                            style={{ width: `${progress}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="text-xl font-medium text-gray-900 mb-4">
                        {currentQuestion.question}
                        {currentQuestion.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h2>

                      {currentQuestion.type === 'text' && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <button
                              type="button"
                              onClick={isRecording ? stopRecording : startRecording}
                              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                                isRecording
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              {isRecording ? (
                                <>
                                  <StopIcon className="h-5 w-5 mr-2" />
                                  Stop Recording
                                </>
                              ) : (
                                <>
                                  <MicrophoneIcon className="h-5 w-5 mr-2" />
                                  Start Recording
                                </>
                              )}
                            </button>
                            {isRecording && (
                              <span className="text-sm text-gray-500">
                                Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                            {answers[currentQuestion.id]?.answer && (
                              <button
                                type="button"
                                onClick={clearText}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Clear Text
                              </button>
                            )}
                          </div>
                          <textarea
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            rows={4}
                            value={answers[currentQuestion.id]?.answer as string || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            placeholder="Your answer will appear here as you speak..."
                          />
                        </div>
                      )}

                      {currentQuestion.type === 'multiple_choice' && (
                        <div className="space-y-4">
                          {currentQuestion.options?.map((option, index) => (
                            <div key={index} className="flex items-center">
                              <input
                                type="radio"
                                id={`option-${index}`}
                                name={`question-${currentQuestion.id}`}
                                value={option}
                                checked={answers[currentQuestion.id]?.answer === option}
                                onChange={() => handleAnswerChange(currentQuestion.id, option)}
                                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                              />
                              <label
                                htmlFor={`option-${index}`}
                                className="ml-3 block text-sm font-medium text-gray-700"
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentQuestion.type === 'rating' && (
                        <div className="flex space-x-4">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleAnswerChange(currentQuestion.id, rating)}
                              className={`px-4 py-2 rounded-md ${
                                answers[currentQuestion.id]?.answer === rating
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                      )}

                      {currentQuestion.type === 'boolean' && (
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleAnswerChange(currentQuestion.id, true)}
                            className={`px-4 py-2 rounded-md ${
                              answers[currentQuestion.id]?.answer === true
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => handleAnswerChange(currentQuestion.id, false)}
                            className={`px-4 py-2 rounded-md ${
                              answers[currentQuestion.id]?.answer === false
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      )}

                      {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                          currentQuestionIndex === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNext}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {currentQuestionIndex === surveyData.questions.length - 1 ? 'Submit' : 'Next'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Thank you for completing the survey!
                </h2>
                <p className="text-gray-600">
                  Your responses have been recorded.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="text-center text-gray-400 text-sm mt-4">
          Powered by CutOnce
        </div>
      </div>
    </>
  );
};

export default TakeSurvey; 
