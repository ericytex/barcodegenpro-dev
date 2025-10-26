import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

/**
 * Custom hook to handle API errors, particularly session expiration
 * Components can use this to automatically handle SESSION_EXPIRED errors
 */
export function useApiErrorHandler() {
  const { handleSessionExpiration } = useAuth();

  const handleApiError = (error: Error) => {
    if (error.message === 'SESSION_EXPIRED') {
      console.log('Session expired error detected - redirecting to login');
      handleSessionExpiration();
      return true; // Error was handled
    }
    return false; // Error was not handled
  };

  return { handleApiError };
}

/**
 * Higher-order function to wrap API calls with automatic session expiration handling
 */
export function withSessionHandling<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  handleSessionExpiration: () => void
) {
  return async (...args: T): Promise<R> => {
    try {
      return await apiFunction(...args);
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        console.log('Session expired in API call - redirecting to login');
        handleSessionExpiration();
        throw error; // Re-throw to let component handle if needed
      }
      throw error;
    }
  };
}
