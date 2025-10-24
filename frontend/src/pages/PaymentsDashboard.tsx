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
  Filter,
  CreditCard,
  Users,
  Activity,
  Zap,
  Target,
  PieChart,
  LineChart
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';

interface TokenPurchase {
  id: number;
  user_id: number;
  transaction_uid: string;
  amount_ugx: number;
  tokens_purchased: number;
  payment_method: string;
  provider: string;
  phone: string;
  status: string;
  payment_url?: string;
  local_country: string;
  local_currency: string;
  local_amount: number;
  created_at: string;
  completed_at?: string;
  username?: string;
  email?: string;
}

interface TokenPurchasesData {
  purchases: TokenPurchase[];
  total_count: number;
  statistics: {
    total_purchases: number;
    total_revenue: number;
    status_breakdown: Record<string, { count: number; amount: number }>;
    provider_breakdown: Record<string, { count: number; amount: number }>;
  };
}

interface PaymentMetrics {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageTransaction: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  topProviders: Array<{ provider: string; count: number; amount: number }>;
  recentTransactions: Collection[];
}

const PaymentsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<TokenPurchasesData | null>(null);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // Check if user is super admin
  if (!user?.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadTokenPurchases();
    calculateMetrics();
  }, []);

  const loadTokenPurchases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/tokens/admin/purchases?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPurchases(data);
        toast.success(`Loaded ${data.purchases.length} token purchases`);
      } else {
        toast.error(data.message || 'Failed to load token purchases');
      }
    } catch (error) {
      console.error('Error loading token purchases:', error);
      toast.error('Failed to load token purchases');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (!purchases) return;

    const totalRevenue = purchases.statistics.total_revenue;
    const totalTransactions = purchases.statistics.total_purchases;
    const completedPurchases = purchases.statistics.status_breakdown.completed?.count || 0;
    const successRate = totalTransactions > 0 ? (completedPurchases / totalTransactions) * 100 : 0;
    const averageTransaction = completedPurchases > 0 ? totalRevenue / completedPurchases : 0;

    // Calculate provider stats from completed purchases
    const providerStats: Record<string, { count: number; amount: number }> = {};
    Object.entries(purchases.statistics.provider_breakdown).forEach(([provider, stats]) => {
      providerStats[provider] = stats;
    });

    const topProviders = Object.entries(providerStats)
      .map(([provider, stats]) => ({ provider, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const calculatedMetrics: PaymentMetrics = {
      totalRevenue,
      totalTransactions,
      successRate,
      averageTransaction,
      dailyRevenue: totalRevenue / 30, // Rough estimate
      monthlyRevenue: totalRevenue,
      topProviders,
      recentTransactions: purchases.purchases.slice(0, 10)
    };

    setMetrics(calculatedMetrics);
  };

  const refreshPurchases = async () => {
    setRefreshing(true);
    try {
      await loadTokenPurchases();
      toast.success('Token purchases refreshed');
    } catch (error) {
      console.error('Error refreshing purchases:', error);
      toast.error('Failed to refresh purchases');
    } finally {
      setRefreshing(false);
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

  const formatAmount = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-US').format(amount) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Token Purchases Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor token purchases and payment analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refreshPurchases}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={loadTokenPurchases} disabled={loading}>
            Load Purchases
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatAmount(metrics.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-bold">{formatAmount(metrics.averageTransaction)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Revenue Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>

            {/* Provider Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Provider Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.topProviders.map((provider, index) => (
                  <div key={provider.provider} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{provider.provider}</Badge>
                      <span className="text-sm text-muted-foreground">{provider.count} transactions</span>
                    </div>
                    <span className="font-medium">{formatAmount(provider.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>Detailed breakdown by mobile money provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.topProviders.map((provider, index) => (
                  <div key={provider.provider} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{provider.provider}</p>
                        <p className="text-sm text-muted-foreground">{provider.count} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatAmount(provider.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {((provider.amount / metrics.totalRevenue) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Token Purchases</CardTitle>
              <CardDescription>Latest token purchase transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading purchases...</span>
                </div>
              ) : purchases && purchases.purchases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Transaction ID</th>
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Tokens</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Provider</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.purchases.slice(0, 20).map((purchase) => (
                        <tr key={purchase.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="font-mono text-sm">
                              {purchase.transaction_uid.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div className="font-medium">{purchase.username || 'Unknown'}</div>
                              <div className="text-muted-foreground">{purchase.email || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="p-2 font-medium">
                            {formatAmount(purchase.amount_ugx, 'UGX')}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">{purchase.tokens_purchased} tokens</Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(purchase.status)}
                              <Badge variant={
                                purchase.status === 'completed' ? 'default' :
                                purchase.status === 'pending' ? 'secondary' :
                                purchase.status === 'failed' ? 'destructive' : 'outline'
                              }>
                                {purchase.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {purchase.provider}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-sm">
                            {purchase.phone}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {formatDate(purchase.created_at)}
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
                    No token purchases found. Try refreshing to load recent purchases.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters & Settings</CardTitle>
              <CardDescription>Configure data filters and display options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="statusFilter">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={loadTokenPurchases}
                    disabled={loading}
                    className="w-full"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PaymentsDashboard;
