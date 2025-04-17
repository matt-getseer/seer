import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Participant } from '../lib/types';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import { logger } from '../lib/logger';
import Toast from './Toast';

interface ParticipantManagerProps {
  surveyId: string;
}

interface ParticipantWithResponse extends Participant {
  survey_responses?: {
    created_at: string | null;
    completed_at: string | null;
  }[];
}

interface SurveyResponseStatus {
  created_at: string;
  completed_at: string | null;
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({ surveyId }) => {
  const [participants, setParticipants] = useState<ParticipantWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('participants')
        .select(`
          *,
          survey_responses:survey_responses!left (
            created_at,
            completed_at
          )
        `)
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        logger.error('Participant fetch error', fetchError, { context: 'ParticipantManager' });
        throw fetchError;
      }
      
      // Transform the data to ensure we have the latest response status
      const transformedData = (data || []).map(participant => ({
        ...participant,
        survey_responses: Array.isArray(participant.survey_responses) 
          ? participant.survey_responses.sort((a: SurveyResponseStatus, b: SurveyResponseStatus) => {
              const aDate = a.completed_at ? new Date(a.completed_at) : new Date(a.created_at);
              const bDate = b.completed_at ? new Date(b.completed_at) : new Date(b.created_at);
              return bDate.getTime() - aDate.getTime();
            })
          : []
      }));
      
      setParticipants(transformedData);
      setError(null);
    } catch (err) {
      logger.error('Error in participant management', {
        error: err instanceof Error ? err.message : 'Unknown error',
        surveyId,
        context: 'ParticipantManager'
      });
      
      if (err instanceof Error) {
        if (err.message.includes('permission denied')) {
          setError('You do not have permission to view these participants');
        } else {
          setError('Unable to load participants. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchParticipants();

    // Set up real-time subscriptions with debounced fetch
    let debounceTimer: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchParticipants();
      }, 1000); // 1 second debounce
    };

    const participantsSubscription = supabase
      .channel('participant_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `survey_id=eq.${surveyId}`
        },
        (payload) => {
          // If it's a delete event, update state directly
          if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
            return;
          }
          // For other changes, use debounced fetch
          debouncedFetch();
        }
      )
      .subscribe();

    const responsesSubscription = supabase
      .channel('survey_responses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_responses',
          filter: `survey_id=eq.${surveyId}`
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    // Cleanup subscriptions and timer on unmount
    return () => {
      clearTimeout(debounceTimer);
      participantsSubscription.unsubscribe();
      responsesSubscription.unsubscribe();
    };
  }, [fetchParticipants, surveyId]);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.name || !newParticipant.email) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: addError } = await supabase
        .rpc('add_participant', {
          p_name: newParticipant.name,
          p_email: newParticipant.email,
          p_survey_id: surveyId,
          p_participation_token: generateUUID()
        });

      if (addError) {
        throw new Error(addError.message);
      }

      if (!data) {
        throw new Error('Failed to add participant');
      }

      setParticipants(prev => [data, ...prev]);
      setNewParticipant({ name: '', email: '' });
    } catch (err) {
      logger.error('Error in participant management', {
        error: err instanceof Error ? err.message : 'Unknown error',
        context: 'ParticipantManager'
      });
      setError(err instanceof Error ? err.message : 'An error occurred while adding the participant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Delete the participant with RPC call
      const { error: deleteError } = await supabase
        .rpc('delete_participant', {
          p_participant_id: id,
          p_survey_id: surveyId
        });

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error('Failed to delete participant');
      }

      // Only update local state if the delete was successful
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      logger.error('Error in participant deletion', {
        error: err instanceof Error ? err.message : 'Unknown error',
        participantId: id,
        context: 'ParticipantManager'
      });
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the participant');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      // Verify file type
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      
      // Validate CSV structure
      if (rows.length < 2) {
        throw new Error('CSV file must contain a header row and at least one participant');
      }

      const headerRow = rows[0].map(header => header.trim().toLowerCase());
      const nameIndex = headerRow.indexOf('name');
      const emailIndex = headerRow.indexOf('email');

      if (nameIndex === -1 || emailIndex === -1) {
        throw new Error('CSV must contain "name" and "email" columns');
      }

      // Process participants, skipping header row and empty rows
      const participants = rows.slice(1)
        .filter(row => row.length >= Math.max(nameIndex, emailIndex) + 1 && 
                      row[nameIndex]?.trim() && 
                      row[emailIndex]?.trim())
        .map(row => ({
          name: row[nameIndex].trim(),
          email: row[emailIndex].trim()
        }));

      if (participants.length === 0) {
        throw new Error('No valid participants found in CSV');
      }

      // Add participants one by one using the RPC function
      const addedParticipants: ParticipantWithResponse[] = [];
      for (const participant of participants) {
        const { data, error: addError } = await supabase.rpc('add_participant', {
          p_name: participant.name,
          p_email: participant.email,
          p_survey_id: surveyId,
          p_participation_token: generateUUID()
        });

        if (addError) {
          // If it's a duplicate email, continue with the next participant
          if (addError.message.includes('already exists')) {
            continue;
          }
          throw new Error(addError.message);
        }

        if (data) {
          addedParticipants.push(data);
        }
      }

      if (addedParticipants.length === 0) {
        throw new Error('No participants were added. They may already exist in the survey.');
      }

      setParticipants(prev => [...addedParticipants, ...prev]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      logger.error('Error in CSV upload', {
        error: err instanceof Error ? err.message : 'Unknown error',
        context: 'ParticipantManager'
      });
      setError(err instanceof Error ? err.message : 'An error occurred while uploading participants');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (token: string | null) => {
    if (!token) {
      logger.error('No participation token available');
      return;
    }
    try {
      const surveyUrl = `${window.location.origin}/take-survey/token/${token}`;
      await navigator.clipboard.writeText(surveyUrl);
      
      // Clear any existing timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      
      // Show toast and set timeout to hide it
      setShowToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      logger.error('Error copying to clipboard', err);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <Toast 
        message="Survey link copied to clipboard!"
        type="success"
        isVisible={showToast}
      />
      
      <div className="mb-6 flex items-center justify-between">
        <form onSubmit={handleAddParticipant} className="flex-1 mr-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Name"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div className="flex-1">
              <input
                type="email"
                placeholder="Email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Participant
            </button>
          </div>
        </form>

        <div className="flex items-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Upload CSV
          </label>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading participants...
                </td>
              </tr>
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No participants added yet
                </td>
              </tr>
            ) : (
              participants.map((participant) => {
                // Get the latest response
                const latestResponse = participant.survey_responses?.[0];
                const status = latestResponse?.completed_at 
                  ? 'completed' 
                  : latestResponse?.created_at 
                  ? 'started' 
                  : 'pending';

                return (
                  <tr key={participant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span 
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : status === 'started'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        title={
                          status === 'completed'
                            ? `Started: ${new Date(latestResponse?.created_at!).toLocaleString()}\nCompleted: ${new Date(latestResponse?.completed_at!).toLocaleString()}`
                            : status === 'started'
                            ? `Started: ${new Date(latestResponse?.created_at!).toLocaleString()}\nNot yet completed`
                            : 'Survey not yet started'
                        }
                      >
                        {status === 'completed' 
                          ? 'Completed' 
                          : status === 'started' 
                          ? 'Started'
                          : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-4">
                        <button
                          onClick={() => copyToClipboard(participant.participation_token)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Copy survey link"
                        >
                          <ShareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParticipant(participant.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete participant"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantManager; 
