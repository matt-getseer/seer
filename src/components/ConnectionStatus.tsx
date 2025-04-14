import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const calculateRetryDelay = (attempt: number) => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
    const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
    return baseDelay + jitter;
  };

  const checkConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Checking Supabase connection...', { retryCount });
      
      const { error } = await supabase.from('surveys').select('id').limit(1);
      
      if (error) {
        logger.error('Supabase connection error:', error);
        throw error;
      }
      
      logger.info('Supabase connection successful');
      setIsConnected(true);
      setLastCheck(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      logger.error('Connection check failed:', err);
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to database');
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        const delay = calculateRetryDelay(retryCount);
        logger.info(`Scheduling retry in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        const timeout = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkConnection();
        }, delay);
        
        setRetryTimeout(timeout);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    checkConnection();
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [checkConnection, retryTimeout]);

  if (isConnected === null) {
    return null; // Don't show anything while checking
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {loading ? (
        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow-sm">
          <div className="w-4 h-4 border-2 border-yellow-800 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">
            Checking connection... {retryCount > 0 && `(Attempt ${retryCount + 1}/${MAX_RETRIES})`}
          </span>
        </div>
      ) : isConnected ? (
        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-md shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">
            Connected {lastCheck && `(Last check: ${lastCheck.toLocaleTimeString()})`}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-md shadow-sm">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Disconnected</span>
            {error && <span className="text-xs text-red-600">{error}</span>}
            {retryCount < MAX_RETRIES && (
              <span className="text-xs text-red-600">
                Retrying in {Math.round(calculateRetryDelay(retryCount) / 1000)} seconds...
              </span>
            )}
          </div>
          {retryCount >= MAX_RETRIES && (
            <button
              onClick={() => {
                setRetryCount(0);
                checkConnection();
              }}
              className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus; 
