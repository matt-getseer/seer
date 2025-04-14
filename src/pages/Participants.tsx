import React, { useState, useCallback, useEffect } from 'react';
import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase, type Participant } from '../lib/supabase';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

const ROWS_PER_PAGE = 20;

const Participants: React.FC = () => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [surveyId, setSurveyId] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!surveyId) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching participants');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (user) {
      // Get the first survey ID for the user
      const getFirstSurvey = async () => {
        try {
          const { data, error } = await supabase
            .from('surveys')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

          if (error) throw error;
          if (data) {
            setSurveyId(data.id);
          }
        } catch (err) {
          logger.error('Error fetching survey ID', err);
        }
      };

      getFirstSurvey();
    }
  }, [user]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const deleteParticipant = async (id: string) => {
    if (!user) return;

    try {
      setLoading(true);
      // First verify this participant belongs to one of the user's surveys
      const participant = participants.find(p => p.id === id);
      if (!participant) throw new Error('Participant not found');

      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .eq('id', participant.survey_id)
        .eq('user_id', user.id)
        .single();

      if (surveyError || !survey) {
        throw new Error('Not authorized to delete this participant');
      }

      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setParticipants(prev => prev.filter(participant => participant.id !== id));
    } catch (err) {
      console.error('Error deleting participant:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the participant');
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(participant => 
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.survey?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParticipants.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedParticipants = filteredParticipants.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading participants</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ml-2 border-none bg-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Survey
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading participants...
                    </td>
                  </tr>
                ) : paginatedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'No participants found matching your search' : 'No participants added yet'}
                    </td>
                  </tr>
                ) : (
                  paginatedParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.survey?.title || 'Unknown Survey'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(participant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteParticipant(participant.id)}
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
          {!loading && filteredParticipants.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Participants; 
