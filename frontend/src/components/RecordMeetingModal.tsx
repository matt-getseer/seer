import React, { useState } from 'react';
import { meetingService } from '../api/client';

interface RecordMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string | null;
}

const RecordMeetingModal: React.FC<RecordMeetingModalProps> = ({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeName 
}) => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrl || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await meetingService.recordMeeting({
        meetingUrl,
        employeeId,
        title: `Meeting with ${employeeName || 'Employee'} (${new Date().toLocaleDateString()})` // Auto-generate title
      });
      setSuccessMessage(`Bot invite requested successfully! Meeting ID: ${response.data.meetingId}`);
      setMeetingUrl(''); // Clear input on success
      // Optionally close modal after a delay
      setTimeout(() => {
         handleClose();
      }, 2000);
    } catch (err: any) {
      console.error("Failed to record meeting:", err);
      setError(err.response?.data?.message || 'Failed to start recording. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    // Reset state on close
    setMeetingUrl('');
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onClose(); 
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out" onClick={handleClose}>
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-in-out scale-100" 
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Record Meeting</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">Enter the meeting URL for <span className="font-medium">{employeeName || 'this employee'}</span> (ID: {employeeId}).</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="meetingUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting URL (Zoom, Meet, Teams)
            </label>
            <input
              type="url"
              id="meetingUrl"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://..."
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded-md">
              {successMessage}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !meetingUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Inviting Bot...
                  </>
              ) : (
                 'Invite Bot & Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordMeetingModal; 