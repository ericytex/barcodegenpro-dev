import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  RefreshCw, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Smartphone,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';

interface Collection {
  id: string;
  transaction_uid: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  phone: string;
  created_at: string;
  completed_at?: string;
  description: string;
  reference: string;
  formatted_amount: string;
  status_badge: { color: string; text: string };
  provider_badge: { color: string; text: string };
}

interface CollectionsData {
  collections: Collection[];
  total_count: number;
  total_amount: number;
  formatted_total_amount: string;
  status_counts: Record<string, number>;
  summary: {
    total_collections: number;
    total_amount: number;
    successful_collections: number;
    pending_collections: number;
    failed_collections: number;
  };
}

interface CollectionsResponse {
  success: boolean;
  data: CollectionsData;
  total_count: number;
  cached: boolean;
  fetched_at: string;
  error?: string;
  message?: string;
}

interface StatsData {
  daily_stats: Array<{
    date: string;
    total_count: number;
    total_amount: number;
    completed: number;
    pending: number;
    failed: number;
  }>;
  period_days: number;
  start_date: string;
  end_date: string;
}

const CollectionsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionsData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [configuring, setConfiguring] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [optimusData, setOptimusData] = useState<any>(null);
  const [loadingOptimus, setLoadingOptimus] = useState(false);
  
  // Filters
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCache, setUseCache] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  // Check if user is super admin
  if (!user?.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadServiceStatus();
    loadCollections();
    loadStats();
  }, []);

  const loadServiceStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/collections/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      setServiceStatus(data.data);
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        use_cache: useCache.toString()
      });
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`${API_BASE_URL}/api/collections/?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data: CollectionsResponse = await response.json();
      
      if (data.success) {
        setCollections(data.data);
        toast.success(`Loaded ${data.data.collections.length} collections`);
      } else {
        toast.error(data.message || 'Failed to load collections');
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/collections/stats?days=${statsDays}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadOptimusData = async () => {
    setLoadingOptimus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/fetch-all-transactions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOptimusData(data);
        toast.success(`Loaded ${data.total_transactions} transactions from Optimus`);
      } else {
        toast.error(data.message || 'Failed to load Optimus data');
      }
    } catch (error) {
      console.error('Error loading Optimus data:', error);
      toast.error('Failed to load Optimus data');
    } finally {
      setLoadingOptimus(false);
    }
  };

  const refreshCollections = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/collections/refresh?limit=${limit}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Collections cache refreshed');
        loadCollections();
        loadStats();
      } else {
        toast.error(data.message || 'Failed to refresh collections');
      }
    } catch (error) {
      console.error('Error refreshing collections:', error);
      toast.error('Failed to refresh collections');
    } finally {
      setRefreshing(false);
    }
  };

  const configureApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setConfiguring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/collections/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ api_key: apiKey })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('API key configured successfully');
        setApiKey('');
        loadServiceStatus();
      } else {
        toast.error(data.message || 'Failed to configure API key');
      }
    } catch (error) {
      console.error('Error configuring API key:', error);
      toast.error('Failed to configure API key');
    } finally {
      setConfiguring(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    return <Smartphone className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-US').format(amount) + ' ' + currency;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor Optimus mobile money collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadOptimusData}
            disabled={loadingOptimus}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingOptimus ? 'animate-spin' : ''}`} />
            Load Optimus Data
          </Button>
          <Button
            onClick={refreshCollections}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={loadCollections} disabled={loading}>
            Load Collections
          </Button>
        </div>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">API Key:</span>
                <Badge variant={serviceStatus.api_key_configured ? "default" : "destructive"}>
                  {serviceStatus.api_key_configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">API Status:</span>
                <Badge variant={
                  serviceStatus.api_status === "connected" ? "default" : 
                  serviceStatus.api_status === "error" ? "destructive" : "secondary"
                }>
                  {serviceStatus.api_status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Service:</span>
                <Badge variant="default">{serviceStatus.service_status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimus Real-time Data */}
      {optimusData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimus Real-time Collections
            </CardTitle>
            <CardDescription>
              Live data from Optimus API - {optimusData.total_transactions} total transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{optimusData.total_transactions}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {optimusData.data?.data?.filter((t: any) => t.transaction_status === 'completed').length || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {optimusData.data?.data?.filter((t: any) => t.transaction_status === 'pending-approval').length || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {optimusData.data?.data?.reduce((sum: number, t: any) => sum + parseInt(t.total_amount || 0), 0).toLocaleString()} UGX
                  </p>
                </div>
              </div>
            </div>
            
            {/* Recent Transactions */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-3">Recent Transactions</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {optimusData.data?.data?.slice(0, 10).map((transaction: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {transaction.transaction_status === 'completed' ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> :
                          <Clock className="h-4 w-4 text-yellow-500" />
                        }
                        <span className="font-mono text-sm">
                          {transaction.app_transaction_uid?.slice(0, 8)}...
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {transaction.debit_phone_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {parseInt(transaction.total_amount || 0).toLocaleString()} UGX
                      </span>
                      <Badge variant={
                        transaction.transaction_status === 'completed' ? 'default' : 'secondary'
                      }>
                        {transaction.transaction_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Optimus API Key</CardTitle>
          <CardDescription>
            Enter your Optimus collections API key to enable monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter Optimus API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={configureApiKey}
              disabled={configuring || !apiKey.trim()}
            >
              {configuring ? 'Configuring...' : 'Configure'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {collections && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{collections.formatted_total_amount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Collections</p>
                  <p className="text-2xl font-bold">{collections.summary.total_collections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold">{collections.summary.successful_collections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{collections.summary.pending_collections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="limit">Limit</Label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => setUseCache(!useCache)}
                variant={useCache ? "default" : "outline"}
                className="w-full"
              >
                {useCache ? 'Using Cache' : 'Use Cache'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            Mobile money collection transactions from Optimus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading collections...</span>
            </div>
          ) : collections && collections.collections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.collections.map((collection) => (
                    <tr key={collection.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-mono text-sm">
                          {collection.transaction_uid.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="p-2 font-medium">
                        {collection.formatted_amount}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(collection.status)}
                          <Badge variant={
                            collection.status_badge.color === 'green' ? 'default' :
                            collection.status_badge.color === 'yellow' ? 'secondary' :
                            collection.status_badge.color === 'red' ? 'destructive' : 'outline'
                          }>
                            {collection.status_badge.text}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(collection.provider)}
                          <Badge variant="outline">
                            {collection.provider_badge.text}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-sm">
                        {collection.phone}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {formatDate(collection.created_at)}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {collection.completed_at ? formatDate(collection.completed_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No collections found. Make sure the API key is configured and try refreshing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistics ({stats.period_days} days)
            </CardTitle>
            <CardDescription>
              Daily collection statistics from {stats.start_date} to {stats.end_date}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.daily_stats.map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{day.date}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">✓ {day.completed}</span>
                    <span className="text-yellow-600">⏳ {day.pending}</span>
                    <span className="text-red-600">✗ {day.failed}</span>
                    <span className="font-medium">
                      {formatAmount(day.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </DashboardLayout>
  );
};

export default CollectionsDashboard;
