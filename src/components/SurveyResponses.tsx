import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Participant {
  id: string;
  email: string;
  name: string;
  survey_id: string;
}

interface SurveyQuestion {
  id: string;
  question: string;
  type: string;
}

interface SurveyResponse {
  id: string;
  participant_id: string;
  survey_id: string;
  completed_at: string | null;
  answers: Array<{
    questionId: string;
    answer: string | number | boolean;
  }>;
}

interface ParticipantWithResponse extends Participant {
  response?: SurveyResponse;
  questions?: SurveyQuestion[];
}

interface SurveyResponsesProps {
  surveyId: string;
}

const SurveyResponses: React.FC<SurveyResponsesProps> = ({ surveyId }) => {
  const [participants, setParticipants] = useState<ParticipantWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipantsAndResponses = async () => {
      try {
        setLoading(true);
        
        // Fetch participants for this survey directly from participants table
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('survey_id', surveyId);

        if (participantsError) throw participantsError;

        // Fetch questions for this survey
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_number', { ascending: true });

        if (questionsError) throw questionsError;

        // Fetch responses for this survey
        const { data: responses, error: responsesError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', surveyId);

        if (responsesError) throw responsesError;

        // Combine participant data with their responses and questions
        const participantsWithResponses = (participants as Participant[]).map(participant => ({
          ...participant,
          response: (responses as SurveyResponse[])?.find(r => r.participant_id === participant.id),
          questions: questions as SurveyQuestion[]
        }));

        setParticipants(participantsWithResponses);
      } catch (err) {
        console.error('Error fetching participants and responses:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantsAndResponses();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Loading responses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading responses</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-base font-semibold leading-6 text-gray-900">Survey Responses</h2>
          <p className="mt-2 text-sm text-gray-700">
            Track completion status for all participants in this survey.
          </p>
        </div>
      </div>
      <div className="mt-6 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Completed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {participant.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {participant.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          participant.response?.completed_at 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {participant.response?.completed_at ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {participant.response?.completed_at 
                          ? new Date(participant.response.completed_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyResponses; 
