import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, Shield, Palette, Database, RefreshCw, AlertTriangle, CheckCircle, Menu, ToggleLeft, ToggleRight, CreditCard, Plus, Trash2, Edit, DollarSign, Users, User, Bell, Eye, Monitor, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { DeviceManagement } from "@/components/DeviceManagement";
import { SimpleDeviceManagement } from "@/components/SimpleDeviceManagement";
import { UserManager } from "@/components/UserManager";
import { DatabaseManagement } from "@/components/DatabaseManagement";

interface PaymentProvider {
  id: string;
  name: string;
  country: string;
  currency: string;
  logo_url: string;
  is_active: boolean;
}

interface PaymentSettings {
  payment_api_environment: string;
  payment_production_auth_token: string;
  payment_webhook_url: string;
}

interface CollectionsSettings {
  collections_api_url: string;
  collections_api_key: string;
}

interface TokenSettings {
  welcome_bonus_tokens: number;
  token_price_ugx: number;
  min_purchase_tokens: number;
  max_purchase_tokens: number;
}

interface Banner {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

const SettingsPageNew = () => {
  const { user } = useAuth();
  const { menuSettings, updateMenuSetting } = useMenuSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [environmentConfig, setEnvironmentConfig] = useState(apiService.getEnvironmentConfig());
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    payment_api_environment: 'sandbox',
    payment_production_auth_token: '',
    payment_webhook_url: ''
  });
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  
  const [collectionsSettings, setCollectionsSettings] = useState<CollectionsSettings>({
    collections_api_url: '',
    collections_api_key: ''
  });
  const [isLoadingCollectionsSettings, setIsLoadingCollectionsSettings] = useState(false);
  const [isSavingCollectionsSettings, setIsSavingCollectionsSettings] = useState(false);
  
  const [tokenSettings, setTokenSettings] = useState<TokenSettings>({
    welcome_bonus_tokens: 0,
    token_price_ugx: 500,
    min_purchase_tokens: 10,
    max_purchase_tokens: 1000
  });
  const [isLoadingTokenSettings, setIsLoadingTokenSettings] = useState(false);
  const [isSavingTokenSettings, setIsSavingTokenSettings] = useState(false);
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    expires_at: ''
  });

  // Navigation items
  const navigationItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account & Security', icon: Shield },
    { id: 'api', label: 'API & Integration', icon: Key },
    { id: 'tokens', label: 'Tokens & Credits', icon: Coins },
    { id: 'appearance', label: 'Appearance & Display', icon: Palette },
    { id: 'system', label: 'System & Data', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
  ];

  useEffect(() => {
    // Update environment config when component mounts
    setEnvironmentConfig(apiService.getEnvironmentConfig());
    
    // Load payment settings if user is admin
    if (user?.is_admin) {
      loadPaymentSettings();
    }
    
    // Load collections settings if user is super admin
    if (user?.is_super_admin) {
      loadCollectionsSettings();
    }
    
    // Load token settings if user is admin
    if (user?.is_admin) {
      loadTokenSettings();
    }
    
    // Load banners if user is admin
    if (user?.is_admin) {
      loadBanners();
    }
  }, [user]);

  const loadPaymentSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingPaymentSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/payment-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    } finally {
      setIsLoadingPaymentSettings(false);
    }
  };

  const savePaymentSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsSavingPaymentSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/payment-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentSettings)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Show success message
        alert('Payment settings saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving payment settings: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      alert('Error saving payment settings');
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  const loadCollectionsSettings = async () => {
    if (!user?.is_super_admin) return;
    
    setIsLoadingCollectionsSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/collections-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCollectionsSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading collections settings:', error);
    } finally {
      setIsLoadingCollectionsSettings(false);
    }
  };

  const saveCollectionsSettings = async () => {
    if (!user?.is_super_admin) return;
    
    setIsSavingCollectionsSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/collections-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collectionsSettings)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Collections settings saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving collections settings: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error saving collections settings:', error);
      alert('Error saving collections settings');
    } finally {
      setIsSavingCollectionsSettings(false);
    }
  };

  const loadTokenSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingTokenSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/token-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTokenSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading token settings:', error);
    } finally {
      setIsLoadingTokenSettings(false);
    }
  };

  const saveTokenSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsSavingTokenSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/tokens/admin/token-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenSettings)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Token settings saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving token settings: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error saving token settings:', error);
      alert('Error saving token settings');
    } finally {
      setIsSavingTokenSettings(false);
    }
  };

  const loadBanners = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingBanners(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/banners`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners || []);
      }
    } catch (error) {
      console.error('Error loading banners:', error);
    } finally {
      setIsLoadingBanners(false);
    }
  };

  const createBanner = async () => {
    if (!user?.is_admin) return;
    
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/banners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBanner)
      });
      
      if (response.ok) {
        alert('Banner created successfully!');
        setNewBanner({
          title: '',
          message: '',
          type: 'info',
          expires_at: ''
        });
        setShowAddBanner(false);
        loadBanners();
      } else {
        const error = await response.json();
        alert(`Error creating banner: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating banner:', error);
      alert('Error creating banner');
    }
  };

  const toggleBannerStatus = async (bannerId: number, isActive: boolean) => {
    if (!user?.is_admin) return;
    
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/banners/${bannerId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        loadBanners();
      } else {
        const error = await response.json();
        alert(`Error updating banner: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating banner:', error);
      alert('Error updating banner');
    }
  };

  const deleteBanner = async (bannerId: number) => {
    if (!user?.is_admin) return;
    
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }
    
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const response = await fetch(`${baseUrl}/api/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        alert('Banner deleted successfully!');
        loadBanners();
      } else {
        const error = await response.json();
        alert(`Error deleting banner: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Error deleting banner');
    }
  };

  const handleEnvironmentChange = (newEnvironment: string) => {
    if (newEnvironment === 'development') {
      apiService.switchToDevelopment();
    } else if (newEnvironment === 'production') {
      apiService.switchToProduction();
    }
    setEnvironmentConfig(apiService.getEnvironmentConfig());
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const response = await fetch(`${environmentConfig.baseUrl}/health`, {
        headers: {
          'X-API-Key': environmentConfig.apiKey
        }
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'testing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Enter your full name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              rows={3}
              placeholder="Tell us about yourself"
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Email Notifications</h4>
                <p className="text-sm text-muted-foreground">Receive security alerts via email</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <ChangePasswordDialog>
            <Button variant="outline">Change Password</Button>
          </ChangePasswordDialog>
        </CardContent>
      </Card>

      {/* User Manager - Super Admin Only */}
      {user?.is_super_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              User Manager
              <Badge variant="outline" className="ml-auto">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Manage users, assign admin rights, and control access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserManager isSuperAdmin={user.is_super_admin} />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderApiTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure API endpoints and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="environment">Environment</Label>
            <Select value={environmentConfig.environment} onValueChange={handleEnvironmentChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Development (localhost:8034)
                  </div>
                </SelectItem>
                <SelectItem value="production">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Production (194.163.134.129:8034)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseUrl">API Base URL</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="baseUrl"
                  value={environmentConfig.baseUrl} 
                  className="flex-1"
                  readOnly
                />
                {getConnectionBadge()}
              </div>
            </div>
            <div>
              <Label htmlFor="apiKey">API Key Status</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="apiKey"
                  type="password" 
                  value="••••••••••••••••" 
                  className="flex-1"
                  readOnly
                />
                <Badge variant={environmentConfig.isProduction ? "default" : "secondary"}>
                  {environmentConfig.isProduction ? "Production" : "Development"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {getConnectionIcon()}
            <span className="text-sm">
              {connectionStatus === 'connected' ? 'API is reachable' : 
               connectionStatus === 'testing' ? 'Testing connection...' : 
               'API connection not tested'}
            </span>
            <Button variant="outline" size="sm" onClick={testConnection} className="ml-auto">
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment API Settings - Admin Only */}
      {user?.is_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Payment API Settings
              <Badge variant="outline" className="ml-auto">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Configure payment gateway API environment and credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingPaymentSettings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading payment settings...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label htmlFor="payment-environment" className="text-sm font-medium">
                    Payment API Environment
                  </Label>
                  <Select
                    value={paymentSettings.payment_api_environment}
                    onValueChange={(value) => 
                      setPaymentSettings(prev => ({ ...prev, payment_api_environment: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentSettings.payment_api_environment === 'production' && (
                  <div className="space-y-3">
                    <Label htmlFor="production-token" className="text-sm font-medium">
                      Production Auth Token
                    </Label>
                    <Input
                      id="production-token"
                      type="password"
                      value={paymentSettings.payment_production_auth_token}
                      onChange={(e) => 
                        setPaymentSettings(prev => ({ ...prev, payment_production_auth_token: e.target.value }))
                      }
                      placeholder="Enter production auth token..."
                      className="w-full"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="webhook-url" className="text-sm font-medium">
                    Payment Webhook URL
                  </Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={paymentSettings.payment_webhook_url}
                    onChange={(e) => 
                      setPaymentSettings(prev => ({ ...prev, payment_webhook_url: e.target.value }))
                    }
                    placeholder="https://yourdomain.com/api/tokens/webhook/payment-complete"
                    className="w-full"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={savePaymentSettings}
                    disabled={isSavingPaymentSettings}
                    className="w-full"
                  >
                    {isSavingPaymentSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Payment Settings
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Payment Configuration</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Sandbox: Test payments with fake money</li>
                    <li>• Production: Real payments with real money</li>
                    <li>• Webhook: Receives payment completion notifications</li>
                    <li>• Changes take effect immediately</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collections Monitoring Settings - Super Admin Only */}
      {user?.is_super_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Collections Monitoring Settings
              <Badge variant="outline" className="ml-auto">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Configure Optimus collections API for monitoring mobile money transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingCollectionsSettings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading collections settings...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label htmlFor="collections-api-url" className="text-sm font-medium">
                    Collections API URL
                  </Label>
                  <Input
                    id="collections-api-url"
                    type="url"
                    value={collectionsSettings.collections_api_url}
                    onChange={(e) => 
                      setCollectionsSettings(prev => ({ ...prev, collections_api_url: e.target.value }))
                    }
                    placeholder="https://optimus.santripe.com/transactions/mobile-money-collections/"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Base URL for the Optimus collections API endpoint
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="collections-api-key" className="text-sm font-medium">
                    Collections API Key
                  </Label>
                  <Input
                    id="collections-api-key"
                    type="password"
                    value={collectionsSettings.collections_api_key}
                    onChange={(e) => 
                      setCollectionsSettings(prev => ({ ...prev, collections_api_key: e.target.value }))
                    }
                    placeholder="Enter Optimus collections API key..."
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    This API key allows monitoring of mobile money collections from Optimus
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={saveCollectionsSettings}
                    disabled={isSavingCollectionsSettings}
                    className="w-full"
                  >
                    {isSavingCollectionsSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Collections Settings
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Collections API Configuration</h4>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                    <li>• Monitor all mobile money collections in real-time</li>
                    <li>• View transaction status, amounts, and provider details</li>
                    <li>• Access daily statistics and trends</li>
                    <li>• Changes take effect immediately</li>
                  </ul>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${collectionsSettings.collections_api_url && collectionsSettings.collections_api_key ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {collectionsSettings.collections_api_url && collectionsSettings.collections_api_key 
                      ? 'Collections monitoring is configured' 
                      : 'Collections monitoring is not configured'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>
            Customize the appearance of your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <p className="text-sm text-muted-foreground mb-3">Select the theme for the dashboard.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                <div className="w-full h-20 bg-white border rounded mb-2 flex items-center justify-center">
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-300 rounded w-8"></div>
                    <div className="h-1 bg-gray-300 rounded w-6"></div>
                    <div className="h-1 bg-gray-300 rounded w-4"></div>
                  </div>
                </div>
                <p className="text-sm font-medium">Light</p>
              </div>
              <div className="border-2 border-primary rounded-lg p-4 cursor-pointer bg-primary/5">
                <div className="w-full h-20 bg-gray-900 border rounded mb-2 flex items-center justify-center">
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-400 rounded w-8"></div>
                    <div className="h-1 bg-gray-400 rounded w-6"></div>
                    <div className="h-1 bg-gray-400 rounded w-4"></div>
                  </div>
                </div>
                <p className="text-sm font-medium">Dark</p>
              </div>
            </div>
          </div>
          <Button>Update Preferences</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu Settings</CardTitle>
          <CardDescription>
            Control which menu items are visible in the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {Object.entries(menuSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                  <p className="text-sm text-muted-foreground">Show/hide {key} in navigation</p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => updateMenuSetting(key as keyof typeof menuSettings, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
          <CardDescription>
              Manage device templates and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceManagement />
        </CardContent>
      </Card>

      {/* Database Management - Super Admin Only */}
      {user?.is_super_admin && (
        <Card className="shadow-elegant border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Database Management
              <Badge variant="outline" className="ml-auto">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Manage database operations, backups, security, and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseManagement />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Manage your data and storage settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Auto-cleanup Generated Files</h4>
                <p className="text-sm text-muted-foreground">Remove old files automatically</p>
              </div>
              <Button variant="outline" size="sm">7 days</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Backup Generated Files</h4>
                <p className="text-sm text-muted-foreground">Keep copies of generated files</p>
              </div>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Log Generation History</h4>
                <p className="text-sm text-muted-foreground">Track all generation activities</p>
              </div>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" size="sm">
              Clear Cache
            </Button>
            <Button variant="outline" size="sm">
              Export Settings
            </Button>
            <Button variant="outline" size="sm">
              Import Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banner Management - Admin Only */}
      {user?.is_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Banner Management
              <Badge variant="outline" className="ml-auto">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Create and manage announcement banners for users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Active Banners</h3>
              <Button onClick={() => setShowAddBanner(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </div>

            {isLoadingBanners ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading banners...</span>
              </div>
            ) : banners.length > 0 ? (
              <div className="space-y-3">
                {banners.map((banner) => (
                  <div key={banner.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={banner.is_active ? "default" : "secondary"}>
                            {banner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{banner.type}</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">{banner.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{banner.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(banner.created_at).toLocaleDateString()}
                          {banner.expires_at && ` • Expires: ${new Date(banner.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={() => toggleBannerStatus(banner.id, banner.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBanner(banner.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No banners created yet</p>
                <p className="text-sm">Create your first announcement banner</p>
              </div>
            )}

            {/* Add Banner Form */}
            {showAddBanner && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Create New Banner</CardTitle>
                  <CardDescription>Add a new announcement or promotion banner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="banner-title">Title</Label>
                      <Input
                        id="banner-title"
                        value={newBanner.title}
                        onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                        placeholder="Banner title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="banner-type">Type</Label>
                      <Select
                        value={newBanner.type}
                        onValueChange={(value: 'info' | 'success' | 'warning' | 'error') => 
                          setNewBanner({ ...newBanner, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="banner-message">Message</Label>
                    <textarea
                      id="banner-message"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      rows={3}
                      value={newBanner.message}
                      onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
                      placeholder="Banner message content"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner-expires">Expires At (Optional)</Label>
                    <Input
                      id="banner-expires"
                      type="datetime-local"
                      value={newBanner.expires_at}
                      onChange={(e) => setNewBanner({ ...newBanner, expires_at: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createBanner}>
                      Create Banner
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddBanner(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Payment Notifications</h4>
                <p className="text-sm text-muted-foreground">Get notified when payments are received</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">System Alerts</h4>
                <p className="text-sm text-muted-foreground">Receive important system updates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Weekly Reports</h4>
                <p className="text-sm text-muted-foreground">Get weekly usage and performance reports</p>
              </div>
              <Switch />
            </div>
          </div>
          <Button>Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>
            Manage your billing and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billing-email">Billing Email</Label>
              <Input id="billing-email" type="email" placeholder="billing@example.com" />
            </div>
            <div>
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input id="tax-id" placeholder="Enter tax ID" />
            </div>
          </div>
          <Button>Update Billing Info</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">**** **** **** 1234</p>
                  <p className="text-sm text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </div>
          <Button variant="outline">Add Payment Method</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderTokensTab = () => (
    <div className="space-y-6">
      {/* Token Settings - Admin Only */}
      {user?.is_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Token Settings
              <Badge variant="outline" className="ml-auto">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Configure token pricing and welcome bonuses for new users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingTokenSettings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading token settings...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="welcome-bonus" className="text-sm font-medium">
                      Welcome Bonus Tokens
                    </Label>
                    <Input
                      id="welcome-bonus"
                      type="number"
                      min="0"
                      value={tokenSettings.welcome_bonus_tokens}
                      onChange={(e) => 
                        setTokenSettings(prev => ({ ...prev, welcome_bonus_tokens: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Free tokens given to new users upon registration
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="token-price" className="text-sm font-medium">
                      Token Price (UGX)
                    </Label>
                    <Input
                      id="token-price"
                      type="number"
                      min="1"
                      value={tokenSettings.token_price_ugx}
                      onChange={(e) => 
                        setTokenSettings(prev => ({ ...prev, token_price_ugx: parseInt(e.target.value) || 500 }))
                      }
                      placeholder="500"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Price per token in Ugandan Shillings
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="min-purchase" className="text-sm font-medium">
                      Minimum Purchase
                    </Label>
                    <Input
                      id="min-purchase"
                      type="number"
                      min="1"
                      value={tokenSettings.min_purchase_tokens}
                      onChange={(e) => 
                        setTokenSettings(prev => ({ ...prev, min_purchase_tokens: parseInt(e.target.value) || 10 }))
                      }
                      placeholder="10"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum tokens that can be purchased
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="max-purchase" className="text-sm font-medium">
                      Maximum Purchase
                    </Label>
                    <Input
                      id="max-purchase"
                      type="number"
                      min="1"
                      value={tokenSettings.max_purchase_tokens}
                      onChange={(e) => 
                        setTokenSettings(prev => ({ ...prev, max_purchase_tokens: parseInt(e.target.value) || 1000 }))
                      }
                      placeholder="1000"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum tokens that can be purchased
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={saveTokenSettings}
                    disabled={isSavingTokenSettings}
                    className="w-full"
                  >
                    {isSavingTokenSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Token Settings
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Token Configuration</h4>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Welcome bonus applies to all new user registrations</li>
                    <li>• Token pricing affects all future purchases</li>
                    <li>• Purchase limits help control user spending</li>
                    <li>• Changes take effect immediately</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Assignment - Super Admin Only */}
      {user?.is_super_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600" />
              Token Assignment
              <Badge variant="outline" className="ml-auto">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Assign tokens to any user for promotions, bonuses, or compensations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TokenAssignment isSuperAdmin={user.is_super_admin} />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'account':
        return renderAccountTab();
      case 'api':
        return renderApiTab();
      case 'tokens':
        return renderTokensTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'system':
        return renderSystemTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'billing':
        return renderBillingTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r bg-background p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-6">Settings</h2>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPageNew;
