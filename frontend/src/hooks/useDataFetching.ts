import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosResponse, AxiosError } from 'axios';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for data fetching with built-in state management for loading, error states and refetching.
 * 
 * @template T - The type of data being fetched
 * @param {() => Promise<AxiosResponse<T>>} fetchFunction - Function that returns a promise resolving to the data
 * @param {Object} options - Additional options
 * @param {boolean} options.loadOnMount - Whether to load data on component mount (default: true)
 * @param {any[]} options.dependencies - Dependencies that should trigger a reload when changed
 * @param {(data: T) => void} options.onSuccess - Callback to run when data is successfully fetched
 * @param {(error: AxiosError) => void} options.onError - Callback to run when an error occurs
 * @returns {FetchState<T>} Object containing data, loading state, error, and refetch function
 */
function useDataFetching<T = any>(
  fetchFunction: () => Promise<AxiosResponse<T>>,
  options: {
    loadOnMount?: boolean;
    dependencies?: any[];
    onSuccess?: (data: T) => void;
    onError?: (error: AxiosError) => void;
  } = {}
): FetchState<T> {
  const { 
    loadOnMount = true, 
    dependencies = [], 
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(loadOnMount);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to avoid stale closure issues with callbacks
  const isMountedRef = useRef(true);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  // Update callback refs when they change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    // Don't set loading state if we're refetching
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetchFunction();
      
      if (isMountedRef.current) {
        setData(response.data);
        setLoading(false);
        
        // Call success callback if provided
        if (onSuccessRef.current) {
          onSuccessRef.current(response.data);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      setLoading(false);
      
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        
        // Set appropriate error message
        const status = axiosError.response?.status;
        if (status === 401 || status === 403) {
          setError('Authentication error. Please log in again.');
        } else if (status === 404) {
          setError('Resource not found.');
        } else if (status && status >= 500) {
          setError('Server error. Please try again later.');
        } else if (axiosError.code === 'ECONNABORTED') {
          setError('Request timed out. Please check your connection.');
        } else {
          setError(axiosError.message || 'An unexpected error occurred.');
        }
        
        // Call error callback if provided
        if (onErrorRef.current) {
          onErrorRef.current(axiosError);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
  }, [fetchFunction]);

  // Load data on mount or when dependencies change
  useEffect(() => {
    if (loadOnMount) {
      fetchData();
    }
  }, [loadOnMount, fetchData, ...dependencies]);

  // Expose refetch function to manually trigger data refresh
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export default useDataFetching; 