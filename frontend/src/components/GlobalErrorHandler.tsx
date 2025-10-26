import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  const { handleSessionExpiration } = useAuth();

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if it's a session expiration error
      if (error?.message === 'SESSION_EXPIRED') {
        console.log('Unhandled session expiration error detected');
        event.preventDefault(); // Prevent the default unhandled rejection behavior
        handleSessionExpiration();
      }
    };

    // Global error handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if it's a session expiration error
      if (error?.message === 'SESSION_EXPIRED') {
        console.log('Uncaught session expiration error detected');
        event.preventDefault(); // Prevent the default error behavior
        handleSessionExpiration();
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleSessionExpiration]);

  return <>{children}</>;
}
