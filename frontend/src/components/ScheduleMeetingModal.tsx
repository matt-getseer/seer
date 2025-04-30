import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import date picker CSS
import { meetingService } from '../api/client';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string | null;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName
}) => {
  // State for the new form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date()); // Default to now
  const [endDate, setEndDate] = useState<Date | null>(() => { // Default to 1 hour from now
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when modal opens or employee changes
  useEffect(() => {
    if (isOpen) {
      setTitle(`Meeting with ${employeeName || 'Employee'}`);
      setDescription('');
      const now = new Date();
      const oneHourLater = new Date();
      oneHourLater.setHours(now.getHours() + 1);
      setStartDate(now);
      setEndDate(oneHourLater);
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, employeeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate inputs
    if (!title || !startDate || !endDate || isLoading) return;
    if (endDate <= startDate) {
       setError('End time must be after start time.');
       return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const startDateTimeISO = startDate!.toISOString();
      const endDateTimeISO = endDate!.toISOString();
      // Get user's local timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('Scheduling meeting with data:', {
        employeeId,
        title,
        description,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        timeZone: userTimeZone, // Include timezone
      });

      const response = await meetingService.scheduleMeeting({
        employeeId,
        title,
        description,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        timeZone: userTimeZone, // Pass timezone
      });

      setSuccessMessage(`Meeting scheduled successfully! (ID: ${response.data.meetingId}). Bot invite pending.`);
      setTimeout(() => {
         handleClose();
      }, 2500);

    } catch (err: any) {
      console.error("Failed to schedule meeting:", err);
       if (err.response?.status === 401 && err.response?.data?.message?.includes('Google authentication required')) {
          setError('Google account connection required. Please connect your Google Calendar account in settings.');
      } else {
         setError(err.response?.data?.message || 'Failed to schedule meeting. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset local state if needed before calling parent onClose
    // State is reset by useEffect when isOpen changes, so just call onClose
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out" /* onClick={handleClose} - Keep modal open on overlay click for now */ >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 transform transition-all duration-300 ease-in-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Schedule Meeting</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Schedule a new meeting with <span className="font-medium">{employeeName || 'this employee'}</span> (ID: {employeeId}).</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Start Date/Time Picker */}
          <div className="flex flex-col sm:flex-row sm:space-x-4">
             <div className='flex-1 mb-4 sm:mb-0'>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                   Start Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                   selected={startDate}
                   onChange={(date: Date | null) => setStartDate(date)}
                   showTimeSelect
                   timeFormat="HH:mm"
                   timeIntervals={15}
                   dateFormat="Pp" // Format like "9/14/2021, 5:30 PM"
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   minDate={new Date()} // Prevent selecting past dates
                   disabled={isLoading}
                   required
                />
             </div>
             {/* End Date/Time Picker */}
             <div className='flex-1'>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                   End Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                   selected={endDate}
                   onChange={(date: Date | null) => setEndDate(date)}
                   showTimeSelect
                   timeFormat="HH:mm"
                   timeIntervals={15}
                   dateFormat="Pp"
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   minDate={startDate || new Date()} // End date cannot be before start date
                   disabled={isLoading}
                   required
                />
             </div>
           </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-100 text-green-700 text-sm rounded-md">
              {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
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
              disabled={isLoading || !title || !startDate || !endDate || (!!endDate && !!startDate && endDate <= startDate)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </>
              ) : (
                 'Schedule Meeting'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal; 