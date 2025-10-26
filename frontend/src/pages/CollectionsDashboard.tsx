import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  Clock,
  Activity,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';

const CollectionsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [optimusData, setOptimusData] = useState<any>(null);
  const [loadingOptimus, setLoadingOptimus] = useState(false);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Cache state
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
      console.log('Loading fresh data (cache expired or first load)');
      loadOptimusData();
      loadPaymentsData();
      setLastDataLoad(Date.now());
    } else {
      console.log('Using cached data (cache still valid)');
    }
  }, []);

  const loadPaymentsData = async () => {
    try {
      const url = API_BASE_URL.startsWith('/') 
        ? `${API_BASE_URL}/tokens/admin/purchases?limit=200`
        : `${API_BASE_URL}/api/tokens/admin/purchases?limit=200`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentsData(data.purchases || []);
      }
    } catch (error) {
      console.error('Error loading payments data:', error);
    }
  };

  const loadOptimusData = async () => {
    setLoadingOptimus(true);
    try {
      const url = API_BASE_URL.startsWith('/') 
        ? `${API_BASE_URL}/payments/fetch-all-transactions`
        : `${API_BASE_URL}/api/payments/fetch-all-transactions`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOptimusData(data);
        toast.success(`Loaded ${data.total_transactions} transactions`);
      } else {
        toast.error(data.message || 'Failed to load transaction data');
      }
    } catch (error) {
      console.error('Error loading transaction data:', error);
      toast.error('Failed to load transaction data');
    } finally {
      setLoadingOptimus(false);
    }
  };

  // Helper functions for table
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCustomerName = (transactionUid: string) => {
    if (!transactionUid || !paymentsData.length) return 'External Transaction';
    
    // Try to find matching transaction by app_transaction_uid or transaction_uid
    const payment = paymentsData.find(p => 
      p.transaction_uid === transactionUid || 
      p.app_transaction_uid === transactionUid
    );
    
    if (payment) {
      return payment.username || payment.email || 'Unknown User';
    }
    
    return 'External Transaction';
  };

  // Network detection based on phone number prefixes
  const categorizeNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return 'Not Verified';
    
    // Clean formatting
    let clean = phoneNumber.replace(/\s|-/g, "");

    // Remove country code (Uganda: +256)
    if (clean.startsWith("+")) clean = clean.slice(1);
    if (clean.startsWith("256")) clean = clean.slice(3);

    // Debug logging for verification
    console.log(`Phone: ${phoneNumber} -> Clean: ${clean} -> Prefix: ${clean.substring(0, 2)}`);

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
      if (prefixes.some((p) => clean.startsWith(p))) {
        console.log(`Matched ${provider} for prefix ${clean.substring(0, 2)}`);
        return provider;
      }
    }

    console.log(`No match found for prefix ${clean.substring(0, 2)}`);
    return "Not Verified";
  };

  const getMobileNetwork = (transaction: any) => {
    if (!transaction) return 'Not Verified';
    
    // First try to match by transaction_uid from token_purchases table
    if (paymentsData.length > 0) {
      const payment = paymentsData.find(p => 
        p.transaction_uid === transaction.app_transaction_uid
      );
      
      if (payment && payment.provider && payment.provider !== 'Not Verified') {
        return payment.provider; // Use the provider field from token_purchases table
      }
    }
    
    // If no match or provider is "Not Verified", try phone number detection
    if (transaction.debit_phone_number) {
      const detectedNetwork = categorizeNumber(transaction.debit_phone_number);
      if (detectedNetwork !== 'Not Verified') {
        return detectedNetwork;
      }
    }
    
    return 'Not Verified';
  };

  const getNetworkPill = (network: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white";
    
    switch (network) {
      case 'MTN':
        return <span className={`${baseClasses} bg-yellow-600`}>MTN</span>;
      case 'AIRTEL':
        return <span className={`${baseClasses} bg-red-600`}>AIRTEL</span>;
      case 'Airtel':
        return <span className={`${baseClasses} bg-red-600`}>Airtel</span>;
      case 'Africell':
        return <span className={`${baseClasses} bg-blue-600`}>Africell</span>;
      case 'MPESA':
        return <span className={`${baseClasses} bg-green-600`}>MPESA</span>;
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

  const openTransactionModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeTransactionModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const refreshData = async () => {
    console.log('Manual refresh requested');
    setLastDataLoad(0); // Reset cache to force fresh load
    await loadOptimusData();
    await loadPaymentsData();
    setLastDataLoad(Date.now());
  };

  // Export functionality
  const exportToCSV = () => {
    if (!optimusData?.data?.data) {
      toast.error('No data available to export');
      return;
    }

    const filteredData = getFilteredAndSortedData();
    
    // CSV headers
    const headers = [
      'Transaction ID',
      'User',
      'Mobile Number',
      'Detected Network',
      'Amount (UGX)',
      'Status',
      'Created Date',
      'Completed Date',
      'Description',
      'Reference'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...filteredData.map(transaction => [
        transaction.app_transaction_uid,
        `"${getCustomerName(transaction.app_transaction_uid)}"`,
        `"${transaction.debit_phone_number}"`,
        `"${getMobileNetwork(transaction)}"`,
        parseInt(transaction.total_amount || 0),
        transaction.transaction_status,
        `"${formatDate(transaction.transaction_date || transaction.created_at)}"`,
        transaction.completed_at ? `"${formatDate(transaction.completed_at)}"` : 'N/A',
        `"${transaction.description || 'N/A'}"`,
        `"${transaction.reference || 'N/A'}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `collections-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredData.length} transactions to CSV`);
  };

  const getFilteredAndSortedData = () => {
    if (!optimusData?.data?.data) return [];
    
    let filtered = optimusData.data.data.filter((transaction: any) => {
      // Search filter
      const customerName = getCustomerName(transaction.app_transaction_uid);
      const matchesSearch = searchTerm === '' || 
        transaction.app_transaction_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.debit_phone_number?.includes(searchTerm) ||
        customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'cancelled' ? transaction.transaction_status !== 'completed' : transaction.transaction_status === statusFilter);
      
      return matchesSearch && matchesStatus;
    });

    // Sort data
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'transaction_date':
          aValue = new Date(a.transaction_date || a.created_at || 0).getTime();
          bValue = new Date(b.transaction_date || b.created_at || 0).getTime();
          break;
        case 'amount':
          aValue = parseInt(a.total_amount || 0);
          bValue = parseInt(b.total_amount || 0);
          break;
        case 'status':
          aValue = a.transaction_status || '';
          bValue = b.transaction_status || '';
          break;
        default:
          aValue = a.app_transaction_uid || '';
          bValue = b.app_transaction_uid || '';
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

  const totalPages = Math.ceil(getFilteredAndSortedData().length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
        <div>
                  <h1 className="text-3xl font-bold text-gray-900">Collections Dashboard</h1>
                  <p className="text-gray-600 text-lg">
                    Real-time mobile money transaction monitoring
                    {lastDataLoad > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        (Last updated: {new Date(lastDataLoad).toLocaleTimeString()})
                      </span>
                    )}
          </p>
        </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
            <Button
                onClick={refreshData}
                disabled={loadingOptimus}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingOptimus ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
            </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Refactored Statistics Cards */}
          {optimusData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Transactions */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Total Transactions</p>
                      <p className="text-3xl font-bold text-blue-900">{optimusData.total_transactions}</p>
                      <p className="text-xs text-blue-600 mt-1">All time</p>
                    </div>
                    <div className="p-3 bg-blue-200 rounded-full">
                      <Activity className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
              {/* Transaction Status */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100/50">
            <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Completed</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-900">
                          {optimusData.data?.data?.filter((t: any) => t.transaction_status === 'completed').length || 0}
                        </p>
                        <p className="text-xs text-green-600">
                          {optimusData.total_transactions > 0 ? 
                            Math.round((optimusData.data?.data?.filter((t: any) => t.transaction_status === 'completed').length || 0) / optimusData.total_transactions * 100) : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Cancelled</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-900">
                          {optimusData.data?.data?.filter((t: any) => t.transaction_status !== 'completed').length || 0}
                        </p>
                        <p className="text-xs text-red-600">Incomplete transactions</p>
                      </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
              {/* Financial Overview */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Completed Payments</span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-900">
                          {(optimusData.data?.data?.filter((t: any) => t.transaction_status === 'completed').reduce((sum: number, t: any) => sum + parseInt(t.total_amount || 0), 0) || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-purple-600">UGX</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Cancelled</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-900">
                          {optimusData.data?.data?.filter((t: any) => t.transaction_status !== 'completed').length || 0}
                        </p>
                        <p className="text-xs text-red-600">transactions</p>
                      </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
              {/* Performance Metrics */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-gray-700">Success Rate</span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-900">
                          {optimusData.total_transactions > 0 ? 
                            Math.round((optimusData.data?.data?.filter((t: any) => t.transaction_status === 'completed').length || 0) / optimusData.total_transactions * 100) : 0}%
                        </p>
                        <p className="text-xs text-emerald-600">Completion rate</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Volume</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-900">
                          {(optimusData.data?.data?.reduce((sum: number, t: any) => sum + parseInt(t.total_amount || 0), 0) || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-600">UGX processed</p>
                      </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

          {/* Enhanced Transactions Table */}
          {optimusData && (
            <Card className="border-0 shadow-sm">
              {/* Filters and Controls */}
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                      />
                    </div>
                    
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(searchTerm || statusFilter !== 'all') && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Items per page */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            </div>
          </div>
        </CardHeader>

              <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="text-left p-3 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('transaction_date')}
                        >
                          <div className="flex items-center gap-2">
                            Date
                            {getSortIcon('transaction_date')}
                          </div>
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">Transaction ID</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">User</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">Mobile Number</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">Network</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600">Amount</th>
                        <th className="text-right p-3 text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                      {getPaginatedData().map((transaction: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="text-xs text-gray-900">
                              {formatDate(transaction.transaction_date || transaction.created_at)}
                        </div>
                      </td>
                          <td className="p-3">
                        <div className="flex items-center gap-2">
                              <div className={`p-1 rounded-full ${
                                transaction.transaction_status === 'completed' 
                                  ? 'bg-green-100' 
                                  : 'bg-red-100'
                              }`}>
                                {transaction.transaction_status === 'completed' ? 
                                  <CheckCircle className="h-3 w-3 text-green-600" /> :
                                  <X className="h-3 w-3 text-red-600" />
                                }
                              </div>
                              <Badge 
                                className={`text-xs font-normal ${
                                  transaction.transaction_status === 'completed' 
                                    ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                                }`}
                              >
                                {transaction.transaction_status === 'completed' ? 'Completed' : 'Cancelled'}
                          </Badge>
                        </div>
                      </td>
                          <td className="p-3">
                            <div className="font-mono text-xs text-gray-900">
                              {transaction.app_transaction_uid?.slice(0, 12)}...
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-xs font-medium text-gray-900">
                              {getCustomerName(transaction.app_transaction_uid)}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-xs font-medium text-gray-900">
                              {transaction.debit_phone_number}
                        </div>
                      </td>
                          <td className="p-3">
                            <div className="text-xs text-gray-600">
                              {getNetworkPill(getMobileNetwork(transaction))}
                            </div>
                      </td>
                          <td className="p-3">
                            <div className="font-semibold text-xs text-gray-900">
                              {parseInt(transaction.total_amount || 0).toLocaleString()} UGX
                            </div>
                      </td>
                          <td className="p-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => openTransactionModal(transaction)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredAndSortedData().length)} of {getFilteredAndSortedData().length} transactions
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {!optimusData && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading transaction data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/20 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Transaction Details</h2>
                    <p className="text-xs text-blue-100">
                      {selectedTransaction.transaction_status === 'completed' ? 'Completed' : 'Cancelled'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeTransactionModal}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3 max-h-[calc(85vh-120px)] overflow-y-auto">
              {/* Amount Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700">Amount</p>
                    <p className="text-lg font-bold text-green-800">
                      {parseInt(selectedTransaction.total_amount || 0).toLocaleString()} UGX
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Transaction Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Transaction ID */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Transaction ID</p>
                  <p className="text-xs font-mono text-gray-800 break-all">
                    {selectedTransaction.app_transaction_uid}
                  </p>
                </div>

                {/* User */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">User</p>
                  <p className="text-xs text-gray-800 truncate">
                    {getCustomerName(selectedTransaction.app_transaction_uid)}
                  </p>
                </div>
              </div>

              {/* Mobile & Network */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Mobile Number</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Network:</span>
                    {getNetworkPill(getMobileNetwork(selectedTransaction))}
                  </div>
                </div>
                <p className="text-sm font-mono text-gray-800">{selectedTransaction.debit_phone_number}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Transaction Date</p>
                  <p className="text-xs text-gray-800">
                    {formatDate(selectedTransaction.transaction_date || selectedTransaction.created_at)}
                  </p>
                </div>
                {selectedTransaction.completed_at && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Completed Date</p>
                    <p className="text-xs text-gray-800">
                      {formatDate(selectedTransaction.completed_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {(selectedTransaction.description || selectedTransaction.reference) && (
                <div className="space-y-2">
                  {selectedTransaction.description && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Description</p>
                      <p className="text-xs text-gray-800">{selectedTransaction.description}</p>
                    </div>
                  )}
                  {selectedTransaction.reference && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Reference</p>
                      <p className="text-xs text-gray-800">{selectedTransaction.reference}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t bg-gray-50 px-4 py-3">
              <Button 
                variant="outline" 
                onClick={closeTransactionModal} 
                size="sm"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CollectionsDashboard;
