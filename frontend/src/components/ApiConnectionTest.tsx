import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, Wifi } from "lucide-react";
import { apiService } from "@/lib/api";

export function ApiConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setError(null);
    
    try {
      const healthData = await apiService.healthCheck();
      setApiInfo(healthData);
      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'testing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'testing':
        return <Badge className="bg-blue-100 text-blue-800">Testing...</Badge>;
      default:
        return <Badge variant="secondary">Not Tested</Badge>;
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          API Connection Test
        </CardTitle>
        <CardDescription>
          Test connection to the Barcode Generator API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          {getStatusBadge()}
        </div>

        {apiInfo && (
          <div className="space-y-2">
            <div className="text-sm">
              <strong>API Version:</strong> {apiInfo.version}
            </div>
            <div className="text-sm">
              <strong>Status:</strong> {apiInfo.status}
            </div>
            <div className="text-sm">
              <strong>Uptime:</strong> {apiInfo.uptime}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
        <div className="text-xs text-red-600 mt-1">
          Make sure the API server is running on {import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8034' : 'https://194.163.134.129:8034/')}
        </div>
          </div>
        )}

        <Button 
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          className="w-full"
        >
          {connectionStatus === 'testing' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 mr-2" />
              Test API Connection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
