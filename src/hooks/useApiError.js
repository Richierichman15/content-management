import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

const useApiError = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleError = useCallback((error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    
    setError(error);
    toast.error(message);
    return message;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(
    async (apiCall) => {
      setLoading(true);
      clearError();

      try {
        const result = await apiCall();
        return result;
      } catch (error) {
        handleError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [clearError, handleError]
  );

  return {
    error,
    loading,
    handleError,
    clearError,
    withErrorHandling,
  };
};

export default useApiError; 