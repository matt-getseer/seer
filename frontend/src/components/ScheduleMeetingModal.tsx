import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import date picker CSS
import { meetingService } from '../api/client';
import { VideoCamera, Buildings } from '@phosphor-icons/react'; // Using Phosphor icons for platform

// Define MeetingType locally for frontend usage
type MeetingType = 'ONE_ON_ONE' | 'SIX_MONTH_REVIEW' | 'TWELVE_MONTH_REVIEW';

// Optional: For display names in the dropdown
const meetingTypeDisplayNames: Record<MeetingType, string> = {
  ONE_ON_ONE: '1-on-1',
  SIX_MONTH_REVIEW: '6 Month Review',
  TWELVE_MONTH_REVIEW: '12 Month Review',
};

// Define PlatformType
type PlatformType = 'Google Meet' | 'Zoom';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string | null;
  // Optional: Pass user connection status if available
  // isGoogleConnected?: boolean;
  // isZoomConnected?: boolean;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  // isGoogleConnected = false, // Default values if passed
  // isZoomConnected = false,
}) => {
  // State for form fields
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [meetingType, setMeetingType] = useState<MeetingType>('ONE_ON_ONE');
  // State for platform selection
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('Google Meet'); 

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when modal opens or employee changes
  useEffect(() => {
    if (isOpen) {
      setMeetingType('ONE_ON_ONE');
      setDescription('');
      setStartDate(new Date());
      setDurationMinutes(30);
      setSelectedPlatform('Google Meet'); // Reset platform on open
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, employeeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const calculatedEndDate = new Date(startDate!.getTime());
      calculatedEndDate.setMinutes(calculatedEndDate.getMinutes() + durationMinutes);

      const startDateTimeISO = startDate!.toISOString();
      const endDateTimeISO = calculatedEndDate.toISOString();
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('Scheduling meeting with data:', {
        employeeId,
        description,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        timeZone: userTimeZone,
        meetingType: meetingType,
        platform: selectedPlatform, // Include selected platform
      });

      // Pass the selected platform to the API call
      const response = await meetingService.scheduleMeeting({
        employeeId,
        description,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        timeZone: userTimeZone,
        meetingType: meetingType,
        platform: selectedPlatform, // Pass platform here
      });

      // Use platform in success message
      setSuccessMessage(`Meeting scheduled via ${response.data.platform || selectedPlatform} successfully! (ID: ${response.data.meetingId}). Bot invite pending.`);
      setTimeout(() => {
         handleClose();
      }, 2500);

    } catch (err: any) {
      console.error("Failed to schedule meeting:", err);

      let displayError = 'Failed to schedule meeting. Please try again.';

      // Handle specific platform authentication errors
      if (err?.response?.status === 401 && typeof err.response?.data?.message === 'string') {
         const message = err.response.data.message.toLowerCase();
         if (message.includes('google authentication required')) {
             displayError = 'Google account connection required. Please connect your Google Calendar in Settings.';
         } else if (message.includes('zoom authentication required')) {
             displayError = 'Zoom account connection required. Please connect your Zoom account in Settings.';
         } else {
             // Generic auth error
             displayError = err.response.data.message;
         }
      }
      // Handle other Axios errors
      else if (err?.isAxiosError && err.response?.data) {
          const errorData = err.response.data;
          if (typeof errorData === 'object' && errorData !== null) {
              displayError = (errorData as any).message || (errorData as any).detail || JSON.stringify(errorData);
          } else {
              displayError = String(errorData);
          }
          displayError = `Error: ${displayError} (Status: ${err.response.status})`;
      }
      // Handle other types of errors
      else if (err instanceof Error) {
          displayError = err.message;
      }
      // Fallback
      else if (err) {
         try {
             displayError = JSON.stringify(err);
         } catch { /* Ignore */ }
      }

      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
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
          {/* Platform Selector */}
          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              Platform <span className="text-red-500">*</span>
            </label>
            <select
              id="platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as PlatformType)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
              disabled={isLoading} // Could also disable based on connection status: `disabled={isLoading || (e.target.value === 'Google Meet' && !isGoogleConnected)}` etc.
              required
            >
              {/* Add icons potentially? Requires more complex dropdown or library */}
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom</option>
              {/* Add Teams option when implemented */}
              {/* <option value="Microsoft Teams" disabled={!isTeamsConnected}>Microsoft Teams</option> */}
            </select>
            {/* Optional: Add warning if platform not connected */}
            {/* {selectedPlatform === 'Google Meet' && !isGoogleConnected && <p className="text-xs text-yellow-600 mt-1">Google Calendar not connected in Settings.</p>} */} 
            {/* {selectedPlatform === 'Zoom' && !isZoomConnected && <p className="text-xs text-yellow-600 mt-1">Zoom account not connected in Settings.</p>} */} 
          </div>
          
          {/* Meeting Type Dropdown */}
          <div>
            <label htmlFor="meetingType" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Type <span className="text-red-500">*</span>
            </label>
            <select
              id="meetingType"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
              disabled={isLoading}
              required
            >
              {Object.entries(meetingTypeDisplayNames).map(([key, displayName]) => (
                <option key={key} value={key}>{displayName}</option>
              ))}
            </select>
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

          {/* Start Date/Time Picker & Duration Dropdown */}
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
                   className="mt-1 block w-full px-3 py-1 h-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   minDate={new Date()} // Prevent selecting past dates
                   disabled={isLoading}
                   required
                />
             </div>
             {/* Duration Dropdown */}
             <div className='flex-1'>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                   Duration <span className="text-red-500">*</span>
                </label>
                <select
                   id="duration"
                   value={durationMinutes}
                   onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                   className="mt-1 block w-full px-3 py-1 h-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                   disabled={isLoading}
                   required
                >
                   <option value={30}>30 minutes</option>
                   <option value={45}>45 minutes</option>
                   <option value={60}>1 hour</option>
                 </select>
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
              disabled={isLoading || !startDate}
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