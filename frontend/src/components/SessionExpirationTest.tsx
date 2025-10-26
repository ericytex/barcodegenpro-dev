import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Test component to demonstrate session expiration handling
 * This can be used to test the automatic redirection functionality
 */
export function SessionExpirationTest() {
  const { handleSessionExpiration } = useAuth();

  const testSessionExpiration = async () => {
    try {
      // This will trigger a 401/403 response and should redirect to login
      await apiService.get('/api/auth/verify');
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        toast.info('Session expiration test triggered - redirecting to login');
        handleSessionExpiration();
      } else {
        toast.error('Test failed: ' + error.message);
      }
    }
  };

  const testInvalidToken = async () => {
    try {
      // Temporarily set an invalid token
      const originalToken = localStorage.getItem('access_token');
      localStorage.setItem('access_token', 'invalid-token-for-testing');
      
      // Make a request that requires authentication
      await apiService.get('/api/tokens/balance');
      
      // Restore original token
      if (originalToken) {
        localStorage.setItem('access_token', originalToken);
      }
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        toast.info('Invalid token test triggered - redirecting to login');
        handleSessionExpiration();
      } else {
        toast.error('Test failed: ' + error.message);
      }
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Session Expiration Test</h3>
      <p className="text-sm text-gray-600">
        These buttons test the automatic session expiration handling and redirection to login.
      </p>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={testSessionExpiration}
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          Test Session Expiration
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testInvalidToken}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Test Invalid Token
        </Button>
      </div>
      
      <div className="text-xs text-gray-500">
        <p><strong>Session Expiration Test:</strong> Simulates a 401/403 response</p>
        <p><strong>Invalid Token Test:</strong> Uses an invalid JWT token</p>
        <p>Both should automatically redirect to the login page.</p>
      </div>
    </div>
  );
}
