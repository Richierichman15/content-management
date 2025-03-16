import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO, isFuture, isPast, addHours } from 'date-fns';
import { toast } from 'react-toastify';
import { CalendarIcon, ClockIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ContentSchedule = ({ 
  contentId, 
  currentStatus,
  onScheduleUpdate,
  className = '' 
}) => {
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Calculate default time (current time + 1 hour, rounded to nearest hour)
  const getDefaultTime = () => {
    const defaultDate = addHours(new Date(), 1);
    defaultDate.setMinutes(0);
    defaultDate.setSeconds(0);
    
    return {
      date: format(defaultDate, 'yyyy-MM-dd'),
      time: format(defaultDate, 'HH:mm')
    };
  };

  useEffect(() => {
    if (contentId) {
      fetchSchedule();
    } else {
      // Set default values for new content
      const { date, time } = getDefaultTime();
      setPublishDate(date);
      setPublishTime(time);
      setInitialLoading(false);
    }
  }, [contentId]);

  const fetchSchedule = async () => {
    try {
      setInitialLoading(true);
      
      const response = await fetch(`/api/content/${contentId}/schedule`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }
      
      const data = await response.json();
      
      if (data.scheduledPublish) {
        const scheduledDate = parseISO(data.scheduledPublish);
        setIsScheduled(true);
        setPublishDate(format(scheduledDate, 'yyyy-MM-dd'));
        setPublishTime(format(scheduledDate, 'HH:mm'));
      } else {
        // No schedule set, use default values
        const { date, time } = getDefaultTime();
        setPublishDate(date);
        setPublishTime(time);
        setIsScheduled(false);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule information');
      
      // Set default values on error
      const { date, time } = getDefaultTime();
      setPublishDate(date);
      setPublishTime(time);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setLoading(true);
      
      // Validate the date and time
      const dateTimeString = `${publishDate}T${publishTime}:00`;
      const scheduledDate = new Date(dateTimeString);
      
      if (!isFuture(scheduledDate)) {
        toast.error('Please select a future date and time');
        return;
      }
      
      const response = await fetch(`/api/content/${contentId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledPublish: dateTimeString,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule content');
      }
      
      const data = await response.json();
      
      toast.success('Content scheduled successfully');
      setIsScheduled(true);
      
      // Notify parent component
      if (onScheduleUpdate) {
        onScheduleUpdate(dateTimeString);
      }
    } catch (error) {
      toast.error(`Failed to schedule content: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/content/${contentId}/schedule`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel schedule');
      }
      
      toast.success('Publishing schedule cancelled');
      setIsScheduled(false);
      
      // Reset to default future time
      const { date, time } = getDefaultTime();
      setPublishDate(date);
      setPublishTime(time);
      
      // Notify parent component
      if (onScheduleUpdate) {
        onScheduleUpdate(null);
      }
    } catch (error) {
      toast.error(`Failed to cancel schedule: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-medium mb-3">Publishing Schedule</h3>
        <div className="flex justify-center py-4">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-3">Publishing Schedule</h3>
      
      {isScheduled ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <CalendarIcon className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Scheduled to publish on:
                </p>
                <p className="text-sm text-blue-700">
                  {format(new Date(`${publishDate}T${publishTime}:00`), 'MMMM d, yyyy')} at {format(new Date(`${publishDate}T${publishTime}:00`), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCancelSchedule}
            disabled={loading || currentStatus === 'published'}
            className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              <>
                <XMarkIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                Cancel Schedule
              </>
            )}
          </button>
          
          {currentStatus === 'published' && (
            <p className="text-sm text-orange-600 mt-2">
              Note: This content is already published.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="publish-date" className="block text-sm font-medium text-gray-700">
                Publish Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  name="publish-date"
                  id="publish-date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="publish-time" className="block text-sm font-medium text-gray-700">
                Publish Time
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="time"
                  name="publish-time"
                  id="publish-time"
                  value={publishTime}
                  onChange={(e) => setPublishTime(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSaveSchedule}
            disabled={loading || !publishDate || !publishTime || currentStatus === 'published'}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              <>
                <CheckIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                Schedule Publication
              </>
            )}
          </button>
          
          {currentStatus === 'published' && (
            <p className="text-sm text-orange-600 mt-2">
              This content is already published.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

ContentSchedule.propTypes = {
  contentId: PropTypes.string,
  currentStatus: PropTypes.string,
  onScheduleUpdate: PropTypes.func,
  className: PropTypes.string,
};

export default ContentSchedule; 