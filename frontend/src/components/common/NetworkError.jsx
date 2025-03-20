import React from 'react';
import PropTypes from 'prop-types';

const NetworkError = ({ error, onRetry }) => {
  // Format the error message based on error type
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'Something went wrong. Please try again.';

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-white rounded-lg shadow">
      <div className="max-w-md w-full space-y-8 text-center p-6">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Network Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>
        {onRetry && (
          <div>
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

NetworkError.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      message: PropTypes.string,
    })
  ]),
  onRetry: PropTypes.func,
};

export default NetworkError; 