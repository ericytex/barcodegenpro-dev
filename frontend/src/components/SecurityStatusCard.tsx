/**
 * Security Configuration Component
 * Displays API connection status and security information
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SecurityStatus {
  apiConnected: boolean;
  apiKeyValid: boolean;
  rateLimitStatus: 'ok' | 'warning' | 'error';
  lastError?: string;
}

export function SecurityStatusCard() {
  const [status, setStatus] = useState<SecurityStatus>({
    apiConnected: false,
    apiKeyValid: false,
    rateLimitStatus: 'ok',
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkApiStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health', {
        headers: {
          'X-API-Key': import.meta.env.VITE_API_KEY || 'frontend-api-key-12345',
        },
      });

      if (response.ok) {
        setStatus({
          apiConnected: true,
          apiKeyValid: true,
          rateLimitStatus: 'ok',
        });
      } else if (response.status === 401) {
        setStatus({
          apiConnected: true,
          apiKeyValid: false,
          rateLimitStatus: 'error',
          lastError: 'Invalid API key',
        });
      } else if (response.status === 429) {
        setStatus({
          apiConnected: true,
          apiKeyValid: true,
          rateLimitStatus: 'warning',
          lastError: 'Rate limit exceeded',
        });
      } else {
        setStatus({
          apiConnected: false,
          apiKeyValid: false,
          rateLimitStatus: 'error',
          lastError: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      setStatus({
        apiConnected: false,
        apiKeyValid: false,
        rateLimitStatus: 'error',
        lastError: 'Connection failed',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  const getStatusIcon = () => {
    if (status.apiConnected && status.apiKeyValid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.apiConnected && !status.apiKeyValid) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    if (status.apiConnected && status.apiKeyValid) {
      return <Badge variant="default" className="bg-green-500">Secure</Badge>;
    } else if (status.apiConnected && !status.apiKeyValid) {
      return <Badge variant="destructive">Auth Failed</Badge>;
    } else {
      return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          API Security Status
        </CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">
              {status.apiConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkApiStatus}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {status.lastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{status.lastError}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>API Key: {status.apiKeyValid ? 'Valid' : 'Invalid'}</div>
          <div>Rate Limit: {status.rateLimitStatus}</div>
          <div>Base URL: {import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8034' : 'https://194.163.134.129:8034/')}</div>
          <div>Environment: {import.meta.env.VITE_ENVIRONMENT || (import.meta.env.DEV ? 'development' : 'production')}</div>
        </div>

        {!status.apiKeyValid && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please check your API key configuration in the environment variables.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
