import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Participant } from '../lib/types';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { logger } from '../lib/logger';

interface ParticipantManagerProps {
  surveyId: string;
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({ surveyId }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      logger.info('Fetching participants for survey', { surveyId }, { context: 'ParticipantManager' });
      const { data, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        logger.error('Supabase fetch error', fetchError, { context: 'ParticipantManager' });
        throw fetchError;
      }
      logger.info('Fetched participants', { count: data?.length }, { context: 'ParticipantManager' });
      setParticipants(data || []);
    } catch (err) {
      logger.error('Error fetching participants', {
        message: err instanceof Error ? err.message : 'Unknown error',
        code: (err as any)?.code,
        details: (err as any)?.details,
        hint: (err as any)?.hint
      }, { context: 'ParticipantManager' });
      setError(err instanceof Error ? err.message : 'An error occurred while fetching participants');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

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
      logger.info('Adding participant', {
        name: newParticipant.name,
        email: newParticipant.email,
        survey_id: surveyId
      }, { context: 'ParticipantManager' });

      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([
          {
            name: newParticipant.name,
            email: newParticipant.email,
            survey_id: surveyId,
            participation_token: generateUUID()
          }
        ])
        .select()
        .single();

      if (insertError) {
        logger.error('Supabase insert error', insertError, { context: 'ParticipantManager' });
        throw insertError;
      }

      logger.info('Participant added successfully', { participantId: data.id }, { context: 'ParticipantManager' });
      setParticipants(prev => [data, ...prev]);
      setNewParticipant({ name: '', email: '' });
    } catch (err) {
      logger.error('Error adding participant', err, { context: 'ParticipantManager' });
      setError(err instanceof Error ? err.message : 'An error occurred while adding the participant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      logger.error('Error deleting participant', err, { context: 'ParticipantManager' });
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
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      
      // Skip header row and filter out empty rows
      const participants = rows.slice(1)
        .filter(row => row.length >= 2 && row[0] && row[1])
        .map(row => ({
          name: row[0].trim(),
          email: row[1].trim(),
          survey_id: surveyId,
          participation_token: generateUUID() // Generate a proper UUID for each participant
        }));

      if (participants.length === 0) {
        throw new Error('No valid participants found in CSV');
      }

      const { data, error: insertError } = await supabase
        .from('participants')
        .insert(participants)
        .select();

      if (insertError) throw insertError;
      setParticipants(prev => [...data, ...prev]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      logger.error('Error uploading participants', err, { context: 'ParticipantManager' });
      setError(err instanceof Error ? err.message : 'An error occurred while uploading participants');
    } finally {
      setLoading(false);
    }
  };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 tracking-wider">Actions</th>
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
              participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(participant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteParticipant(participant.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantManager; 
