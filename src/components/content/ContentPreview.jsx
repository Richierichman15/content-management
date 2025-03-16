import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import NetworkError from '../common/NetworkError';

const ContentPreview = ({ contentId, onClose }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/content/${contentId}`);
        if (!response.ok) {
          throw new Error(`Failed to load content: ${response.statusText}`);
        }
        
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(err.message);
        toast.error(`Error loading preview: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (contentId) {
      fetchContent();
    }
  }, [contentId]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Re-fetch content
    fetch(`/api/content/${contentId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load content: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        toast.error(`Error loading preview: ${err.message}`);
      });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="text-center py-16">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading content preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full">
          <NetworkError error={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">Content Preview</h2>
          <div className="flex space-x-3">
            <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              {content?.status || 'Draft'}
            </span>
            <button
              onClick={onClose}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {content && (
          <div className="preview-content">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2 dark:text-white">{content.title}</h1>
              {content.author && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  By {content.author} · 
                  {content.createdAt && (
                    <span className="ml-1">
                      {format(new Date(content.createdAt), 'MMMM d, yyyy')}
                    </span>
                  )}
                </p>
              )}
              {content.category && (
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {content.category}
                  </span>
                </div>
              )}
            </div>

            {content.featuredImage && (
              <div className="mb-6">
                <img 
                  src={content.featuredImage} 
                  alt={content.title}
                  className="w-full h-auto rounded-lg object-cover max-h-96"
                />
              </div>
            )}

            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />

            {content.tags && content.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ContentPreview.propTypes = {
  contentId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ContentPreview; 