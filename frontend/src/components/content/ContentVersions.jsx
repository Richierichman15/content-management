import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import NetworkError from '../common/NetworkError';
import { ArrowPathIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';

const ContentVersions = ({ contentId, onVersionRestore, className = '' }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [contentId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/content/${contentId}/versions`);
      if (!response.ok) {
        throw new Error(`Failed to load versions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error loading versions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    try {
      setRestoring(true);
      
      const response = await fetch(`/api/content/${contentId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restore version: ${response.statusText}`);
      }
      
      const data = await response.json();
      toast.success('Version restored successfully');
      
      // Call the parent callback with the restored content
      if (onVersionRestore) {
        onVersionRestore(data.content);
      }
    } catch (err) {
      toast.error(`Error restoring version: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleRetry = () => {
    fetchVersions();
  };

  if (loading) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-medium mb-4">Version History</h3>
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-medium mb-4">Version History</h3>
        <NetworkError error={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-4">Version History</h3>
      
      {versions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No previous versions found.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <div 
              key={version.id}
              className="border rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center text-sm">
                  <ClockIcon className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                  {version.isLatest && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {version.createdBy ? (
                    <span>By {version.createdBy}</span>
                  ) : (
                    <span>Automatic save</span>
                  )}
                </div>
                {version.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    "{version.comment}"
                  </p>
                )}
              </div>
              
              {!version.isLatest && (
                <button
                  onClick={() => handleRestore(version.id)}
                  disabled={restoring}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Restore
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

ContentVersions.propTypes = {
  contentId: PropTypes.string.isRequired,
  onVersionRestore: PropTypes.func,
  className: PropTypes.string,
};

export default ContentVersions; 