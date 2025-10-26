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
  LineChart,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Download,
  Eye,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  is_test_data?: boolean;
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
  dailyRevenueData: Array<{ date: string; revenue: number; transactions: number }>;
}

const PaymentsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<TokenPurchasesData | null>(null);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  
  // Filters and pagination
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<TokenPurchase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Cache state
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check if user is super admin
  if (!user?.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const shouldLoadData = () => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastDataLoad;
      return timeSinceLastLoad > CACHE_DURATION || lastDataLoad === 0;
    };

    if (shouldLoadData()) {
      loadTokenPurchases();
      setLastDataLoad(Date.now());
    }

    // Automatically sync with payment provider on page load
    syncWithPaymentProvider(true);
  }, []);

  // Calculate metrics when purchases data changes
  useEffect(() => {
    if (purchases) {
      calculateMetrics();
    }
  }, [purchases]);

  // Periodic automatic sync with payment provider every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncing) { // Only sync if not already syncing
        syncWithPaymentProvider(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [syncing]);

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

      const url = API_BASE_URL.startsWith('/') 
        ? `${API_BASE_URL}/tokens/admin/purchases?${params}`
        : `${API_BASE_URL}/api/tokens/admin/purchases?${params}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      console.log('API Response:', data);
      
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

  const calculateDailyRevenueData = (purchases: Collection[]) => {
    // Create a map to store daily revenue and transaction counts
    const dailyData: Record<string, { revenue: number; transactions: number }> = {};
    
    // Initialize last 30 days with zero values
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      dailyData[dateStr] = { revenue: 0, transactions: 0 };
    }
    
    // Aggregate revenue and transactions by date
    purchases.forEach(purchase => {
      if (purchase.status === 'completed' && purchase.created_at) {
        const purchaseDate = new Date(purchase.created_at).toISOString().split('T')[0];
        if (dailyData[purchaseDate]) {
          dailyData[purchaseDate].revenue += purchase.amount_ugx || 0;
          dailyData[purchaseDate].transactions += 1;
        }
      }
    });
    
    // Convert to array format for chart
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: data.revenue,
        transactions: data.transactions
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateMetrics = () => {
    if (!purchases) {
      console.log('No purchases data available for metrics calculation');
      return;
    }

    console.log('Calculating metrics with purchases data:', purchases);
    
    // Check if we have statistics data, if not, return without setting metrics
    if (!purchases.statistics) {
      console.log('No statistics data available');
      setMetrics(null);
      return;
    }
    
    const totalRevenue = purchases.statistics?.total_revenue || 0;
    const totalTransactions = purchases.statistics?.total_purchases || 0;
    const completedPurchases = purchases.statistics?.status_breakdown?.completed?.count || 0;
    const successRate = totalTransactions > 0 ? (completedPurchases / totalTransactions) * 100 : 0;
    const averageTransaction = completedPurchases > 0 ? totalRevenue / completedPurchases : 0;

    // Calculate provider stats from completed purchases
    const providerStats: Record<string, { count: number; amount: number }> = {};
    if (purchases.statistics?.provider_breakdown) {
      Object.entries(purchases.statistics.provider_breakdown).forEach(([provider, stats]) => {
        providerStats[provider] = stats;
      });
    }

    const topProviders = Object.entries(providerStats)
      .map(([provider, stats]) => ({ provider, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate daily revenue data for the last 30 days
    const dailyRevenueData = calculateDailyRevenueData(purchases.purchases || []);

    const calculatedMetrics: PaymentMetrics = {
      totalRevenue,
      totalTransactions,
      successRate,
      averageTransaction,
      dailyRevenue: totalRevenue / 30, // Rough estimate
      monthlyRevenue: totalRevenue,
      topProviders,
      recentTransactions: purchases.purchases?.slice(0, 10) || [],
      dailyRevenueData
    };

    console.log('Calculated metrics:', calculatedMetrics);
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

  const syncWithPaymentProvider = async (isAutomatic = false) => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/sync-with-optimus?limit=${limit}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSyncResults(data);
        if (!isAutomatic) {
          toast.success(`Synced ${data.sync_summary.status_changes} transactions with payment provider`);
        }
        // Refresh the data to show updated statuses
        await loadTokenPurchases();
      } else {
        if (!isAutomatic) {
          toast.error(data.message || 'Failed to sync with payment provider');
        }
      }
    } catch (error) {
      console.error('Error syncing with payment provider:', error);
      if (!isAutomatic) {
        toast.error('Failed to sync with payment provider');
      }
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string, isTestData: boolean = false) => {
    if (isTestData) {
      switch (status) {
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-blue-500" />;
        case 'pending':
          return <Clock className="h-4 w-4 text-blue-500" />;
        case 'failed':
          return <XCircle className="h-4 w-4 text-blue-500" />;
        default:
          return <AlertCircle className="h-4 w-4 text-blue-500" />;
      }
    } else {
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
    }
  };

  const formatAmount = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-US').format(amount) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper functions for table operations
  const getFilteredAndSortedData = () => {
    if (!purchases?.purchases) return [];
    
    let filtered = purchases.purchases.filter((purchase) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          purchase.transaction_uid.toLowerCase().includes(searchLower) ||
          purchase.username?.toLowerCase().includes(searchLower) ||
          purchase.email?.toLowerCase().includes(searchLower) ||
          purchase.phone.includes(searchTerm) ||
          purchase.provider.toLowerCase().includes(searchLower)
        );
      }
      
      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        return purchase.status === statusFilter;
      }
      
      return true;
    });
    
    // Sort data
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof TokenPurchase];
      let bValue: any = b[sortBy as keyof TokenPurchase];
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'completed_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };

  const getPaginatedData = () => {
    const filteredData = getFilteredAndSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />;
  };

  const openTransactionModal = (transaction: TokenPurchase) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeTransactionModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const refreshData = async () => {
    setLastDataLoad(0); // Reset cache to force fresh load
    await loadTokenPurchases();
    await calculateMetrics();
    setLastDataLoad(Date.now());
  };

  // Export functionality
  const exportToCSV = () => {
    if (!purchases?.purchases) {
      toast.error('No data available to export');
      return;
    }

    const filteredData = getFilteredAndSortedData();
    
    // CSV headers
    const headers = [
      'Transaction ID',
      'User',
      'Email',
      'Amount (UGX)',
      'Tokens',
      'Status',
      'Provider',
      'Detected Network',
      'Phone',
      'Payment Method',
      'Created Date',
      'Completed Date',
      'Is Test Data'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...filteredData.map(purchase => [
        purchase.transaction_uid,
        `"${purchase.username || 'Unknown User'}"`,
        `"${purchase.email || 'N/A'}"`,
        purchase.amount_ugx,
        purchase.tokens_purchased,
        purchase.status,
        `"${purchase.provider}"`,
        `"${categorizeNumber(purchase.phone)}"`,
        `"${purchase.phone}"`,
        `"${purchase.payment_method}"`,
        `"${formatDate(purchase.created_at)}"`,
        purchase.completed_at ? `"${formatDate(purchase.completed_at)}"` : 'N/A',
        purchase.is_test_data ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `token-purchases-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredData.length} transactions to CSV`);
  };

  // Network detection based on phone number prefixes
  const categorizeNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return 'Not Verified';
    
    // Clean formatting
    let clean = phoneNumber.replace(/\s|-/g, "");

    // Remove country code (Uganda: +256)
    if (clean.startsWith("+")) clean = clean.slice(1);
    if (clean.startsWith("256")) clean = clean.slice(3);

    // Uganda mobile provider prefixes
    const providers: Record<string, string[]> = {
      MTN: ["77", "78", "76", "71", "72", "73", "74"],
      Airtel: ["70", "75", "79"],
      Africell: ["79"],
      "Safaricom (Mpesa)": ["71", "72"],
      Telkom: ["77"],
      Equitel: ["76"],
    };

    for (const [provider, prefixes] of Object.entries(providers)) {
      if (prefixes.some((p) => clean.startsWith(p))) return provider;
    }

    return "Not Verified";
  };

  const getNetworkPill = (network: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white";
    
    switch (network) {
      case 'MTN':
        return <span className={`${baseClasses} bg-yellow-600`}>MTN</span>;
      case 'Airtel':
        return <span className={`${baseClasses} bg-red-600`}>Airtel</span>;
      case 'Africell':
        return <span className={`${baseClasses} bg-blue-600`}>Africell</span>;
      case 'Safaricom (Mpesa)':
        return <span className={`${baseClasses} bg-green-600`}>Mpesa</span>;
      case 'Telkom':
        return <span className={`${baseClasses} bg-purple-600`}>Telkom</span>;
      case 'Equitel':
        return <span className={`${baseClasses} bg-orange-600`}>Equitel</span>;
      case 'Not Verified':
        return <span className={`${baseClasses} bg-gray-500`}>Not Verified</span>;
      default:
        return <span className={`${baseClasses} bg-gray-600`}>{network}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Payments Dashboard</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <p className="text-sm sm:text-base text-gray-600">
                    Monitor token purchases and payment analytics
                  </p>
                  {lastDataLoad > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      Last updated: {new Date(lastDataLoad).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {syncing && (
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-700">Auto-syncing...</span>
                  </div>
                )}
                {!syncing && (
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-green-700">Auto-sync enabled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Sync Results */}
          {syncResults && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-blue-900">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg w-fit">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-semibold">Payment Sync Results</div>
                    <div className="text-xs sm:text-sm font-normal text-blue-700">
                      Last sync: {new Date(syncResults.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg w-fit">
                        <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Total Processed</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-900">{syncResults.sync_summary.total_processed}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-green-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg w-fit">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Successful Syncs</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-900">{syncResults.sync_summary.successful_syncs}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg w-fit">
                        <Target className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Status Changes</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-900">{syncResults.sync_summary.status_changes}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg w-fit">
                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Failed Syncs</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-900">{syncResults.sync_summary.failed_syncs}</p>
                      </div>
                    </div>
                  </div>
                </div>
            
            {/* Status Changes Details */}
            {syncResults.sync_summary.status_changes > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">Status Changes</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {syncResults.sync_summary.results
                    .filter((result: any) => result.status_changed)
                    .map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{result.table}</Badge>
                        <span className="font-mono text-sm">
                          {result.transaction_uid?.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{result.previous_status}</Badge>
                        <span>→</span>
                        <Badge variant="default">{result.current_status}</Badge>
                        <Badge variant="outline">{result.optimus_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50 h-10 sm:h-12">
            <TabsTrigger value="overview" className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Providers</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-green-900">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <LineChart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Revenue Trends</div>
                    <div className="text-sm font-normal text-green-700">Payment analytics over time</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 bg-white rounded-lg border border-green-100 p-2 sm:p-4">
                  {metrics && metrics.dailyRevenueData ? (
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                        <RechartsLineChart data={metrics.dailyRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `UGX ${(value / 1000).toFixed(0)}K`}
                            width={60}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => [
                              name === 'revenue' ? `UGX ${value.toLocaleString()}` : value,
                              name === 'revenue' ? 'Revenue' : 'Transactions'
                            ]}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 1 }}
                            name="Daily Revenue"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="transactions" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1 }}
                            name="Transactions"
                            yAxisId="right"
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-green-400 mx-auto mb-2" />
                        <p className="text-green-600 font-medium">No revenue data available</p>
                        <p className="text-sm text-green-500">Revenue analytics will appear here once transactions are processed</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Provider Distribution */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-blue-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PieChart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Provider Distribution</div>
                    <div className="text-sm font-normal text-blue-700">Payment method breakdown</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.topProviders && metrics.topProviders.length > 0 ? (
                    metrics.topProviders.map((provider, index) => (
                      <div key={provider.provider} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Smartphone className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">{provider.provider}</Badge>
                            <p className="text-xs text-gray-500">{provider.count} transactions</p>
                          </div>
                        </div>
                        <span className="font-semibold text-blue-900">{formatAmount(provider.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                      <p className="text-blue-600 font-medium">No provider data available</p>
                      <p className="text-sm text-blue-500">Provider distribution will appear here once transactions are processed</p>
                    </div>
                  )}
                </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Token Purchase Transactions</CardTitle>
                  <CardDescription>
                    {getFilteredAndSortedData().length} transactions found
                    {searchTerm && ` matching "${searchTerm}"`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by transaction ID, user, email, phone, or provider..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading transactions...</span>
                </div>
              ) : getPaginatedData().length > 0 ? (
                <>
                  {/* Professional Table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('transaction_uid')}
                          >
                            <div className="flex items-center gap-2">
                              Transaction ID
                              {getSortIcon('transaction_uid')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('username')}
                          >
                            <div className="flex items-center gap-2">
                              User
                              {getSortIcon('username')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('amount_ugx')}
                          >
                            <div className="flex items-center gap-2">
                              Amount
                              {getSortIcon('amount_ugx')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('tokens_purchased')}
                          >
                            <div className="flex items-center gap-2">
                              Tokens
                              {getSortIcon('tokens_purchased')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-2">
                              Status
                              {getSortIcon('status')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('provider')}
                          >
                            <div className="flex items-center gap-2">
                              Provider
                              {getSortIcon('provider')}
                            </div>
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Network
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('phone')}
                          >
                            <div className="flex items-center gap-2">
                              Phone
                              {getSortIcon('phone')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center gap-2">
                              Created
                              {getSortIcon('created_at')}
                            </div>
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getPaginatedData().map((purchase) => {
                          const isTestData = purchase.is_test_data || false;
                          return (
                            <tr 
                              key={purchase.id} 
                              className={`hover:bg-gray-50 transition-colors ${
                                isTestData ? 'bg-blue-25' : ''
                              }`}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                    {purchase.transaction_uid.slice(0, 8)}...
                                  </code>
                                  {isTestData && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                      TEST
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {purchase.username || 'Unknown User'}
                                  </div>
                                  <div className="text-gray-500 truncate max-w-32">
                                    {purchase.email || 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatAmount(purchase.amount_ugx, 'UGX')}
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {purchase.tokens_purchased} tokens
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(purchase.status, isTestData)}
                                  <Badge 
                                    variant={
                                      isTestData 
                                        ? "outline" 
                                        : purchase.status === 'completed' 
                                          ? "default" 
                                          : purchase.status === 'pending' 
                                            ? "secondary" 
                                            : "destructive"
                                    } 
                                    className={
                                      isTestData 
                                        ? "bg-blue-100 text-blue-700 border-blue-300" 
                                        : purchase.status === 'completed' 
                                          ? "bg-green-100 text-green-700 border-green-300" 
                                          : ""
                                    }
                                  >
                                    {purchase.status}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  {purchase.provider}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="text-xs text-gray-600">
                                  {getNetworkPill(categorizeNumber(purchase.phone))}
                                </div>
                              </td>
                              <td className="p-4">
                                <code className="text-sm font-mono text-gray-600">
                                  {purchase.phone}
                                </code>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-gray-600">
                                  {formatDate(purchase.created_at)}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => openTransactionModal(purchase)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredAndSortedData().length)} of {getFilteredAndSortedData().length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(getFilteredAndSortedData().length / itemsPerPage) }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === Math.ceil(getFilteredAndSortedData().length / itemsPerPage) ||
                            Math.abs(page - currentPage) <= 2
                          )
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          ))
                        }
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(Math.ceil(getFilteredAndSortedData().length / itemsPerPage), currentPage + 1))}
                        disabled={currentPage >= Math.ceil(getFilteredAndSortedData().length / itemsPerPage)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? `No transactions match "${searchTerm}"` : 'No token purchases available'}
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm('')}>
                      Clear search
                    </Button>
                  )}
                </div>
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

        {/* Transaction Details Modal */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeTransactionModal}
                className="h-8 w-8 p-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Transaction Status */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  selectedTransaction.status === 'completed' 
                    ? 'bg-green-100' 
                    : selectedTransaction.status === 'pending'
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                }`}>
                  {getStatusIcon(selectedTransaction.status, selectedTransaction.is_test_data)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    {selectedTransaction.is_test_data && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-700">
                        TEST DATA
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">Transaction Status</p>
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Transaction ID</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  <code className="text-sm font-mono text-gray-800">
                    {selectedTransaction.transaction_uid}
                  </code>
                </div>
              </div>

              {/* User Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">User Information</h4>
                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Username:</span>
                    <p className="text-sm text-gray-800">{selectedTransaction.username || 'Unknown User'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <p className="text-sm text-gray-800">{selectedTransaction.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">User ID:</span>
                    <p className="text-sm text-gray-800">{selectedTransaction.user_id}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Amount</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-lg font-semibold text-gray-800">
                      {formatAmount(selectedTransaction.amount_ugx, 'UGX')}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tokens Purchased</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {selectedTransaction.tokens_purchased} tokens
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Provider</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      {selectedTransaction.provider}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Detected Network</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {getNetworkPill(categorizeNumber(selectedTransaction.phone))}
                  </div>
                </div>
              </div>

              {/* Network Detection Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Network Detection</h4>
                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Original Provider:</span>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      {selectedTransaction.provider || 'Not Available'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Detected Network:</span>
                    {getNetworkPill(categorizeNumber(selectedTransaction.phone))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Network detection is based on phone number prefixes. Original provider may differ due to number portability.
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Phone Number</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  <code className="text-sm font-mono text-gray-800">
                    {selectedTransaction.phone}
                  </code>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Created Date</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-800">
                      {formatDate(selectedTransaction.created_at)}
                    </p>
                  </div>
                </div>
                {selectedTransaction.completed_at && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Completed Date</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-800">
                        {formatDate(selectedTransaction.completed_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-800">{selectedTransaction.payment_method}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Local Currency</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-800">
                      {selectedTransaction.local_currency} ({selectedTransaction.local_country})
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment URL (if available) */}
              {selectedTransaction.payment_url && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment URL</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <a 
                      href={selectedTransaction.payment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 break-all"
                    >
                      {selectedTransaction.payment_url}
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={closeTransactionModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </DashboardLayout>
  );
};

export default PaymentsDashboard;
