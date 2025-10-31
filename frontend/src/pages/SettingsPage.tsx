import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, Shield, Palette, Database, RefreshCw, AlertTriangle, CheckCircle, Menu, ToggleLeft, ToggleRight, CreditCard, Plus, Trash2, Edit, DollarSign, Users, User, Bell, Eye, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { DeviceManagement } from "@/components/DeviceManagement";
import { SimpleDeviceManagement } from "@/components/SimpleDeviceManagement";
import { DatabaseManagement } from "@/components/DatabaseManagement";
import { useMenuSettings } from "@/contexts/MenuContext";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentProvider {
  id: string;
  name: string;
  country: string;
  currency: string;
  color: string;
  enabled: boolean;
}

interface PaymentSettings {
  payment_api_environment: string;
  payment_production_auth_token: string;
  payment_webhook_url: string;
}

export default function SettingsPage() {
  const [environmentConfig, setEnvironmentConfig] = useState(apiService.getEnvironmentConfig());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { menuSettings, updateMenuSetting, resetMenuSettings } = useMenuSettings();
  const { user } = useAuth();
  
  // Payment providers state
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([
    { id: 'MPESA', name: 'M-PESA', country: 'Kenya', currency: 'KES', color: 'green', enabled: true },
    { id: 'MTN', name: 'MTN Mobile Money', country: 'Uganda', currency: 'UGX', color: 'yellow', enabled: true },
    { id: 'AIRTEL', name: 'Airtel Money', country: 'Multi-Country', currency: 'UGX', color: 'red', enabled: true },
  ]);

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    payment_api_environment: 'sandbox',
    payment_production_auth_token: '',
    payment_webhook_url: ''
  });
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);

  useEffect(() => {
    // Update environment config when component mounts
    setEnvironmentConfig(apiService.getEnvironmentConfig());
    
    // Load payment settings if user is admin
    if (user?.is_admin) {
      loadPaymentSettings();
    }
  }, [user]);

  const loadPaymentSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingPaymentSettings(true);
    try {
      const baseUrl = environmentConfig.baseUrl;
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/payment-settings`
        : baseUrl.startsWith('/') 
          ? `/api/tokens/admin/payment-settings`
          : `${baseUrl}/api/tokens/admin/payment-settings`;
      const response = await fetch(url, {
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
      const baseUrl = environmentConfig.baseUrl;
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/payment-settings`
        : baseUrl.startsWith('/') 
          ? `/api/tokens/admin/payment-settings`
          : `${baseUrl}/api/tokens/admin/payment-settings`;
      const response = await fetch(url, {
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

  const handleEnvironmentChange = (newEnvironment: string) => {
    if (newEnvironment === 'development') {
      apiService.switchToDevelopment();
    } else if (newEnvironment === 'production') {
      apiService.switchToProduction();
    }
    setEnvironmentConfig(apiService.getEnvironmentConfig());
    setConnectionStatus('disconnected'); // Reset connection status when switching
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    
    try {
      await apiService.healthCheck();
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('Connection test failed:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'testing':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };
  return (
    <DashboardLayout>
      <div className="spacing-section">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-professional">Settings</h1>
          <p className="text-lg text-muted-professional">
            Configure your barcode generation preferences and system settings
          </p>
        </div>

        {/* API Settings */}
        <Card className="card-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              API Configuration
            </CardTitle>
            <CardDescription className="text-base">
              Manage your API connection and authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent className="spacing-card">
            {/* Environment Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment</label>
              <Select value={environmentConfig.environment} onValueChange={handleEnvironmentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select environment" />
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
              <div className="space-y-2">
                <label className="text-sm font-medium">API Base URL</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={environmentConfig.baseUrl} 
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                    readOnly
                  />
                  {getConnectionBadge()}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key Status</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="password" 
                    value="••••••••••••••••" 
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                    readOnly
                  />
                  <Badge variant={environmentConfig.isProduction ? "default" : "secondary"}>
                    {environmentConfig.isProduction ? "Production" : "Development"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {getConnectionIcon()}
              <span className="text-sm">
                {connectionStatus === 'connected' ? 'API is reachable' : 
                 connectionStatus === 'testing' ? 'Testing connection...' : 
                 'API connection not tested'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={testConnection}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm">
                Reset API Key
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Menu Settings */}
        <Card className="card-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Menu className="w-5 h-5 text-primary" />
              </div>
              Menu Visibility Settings
            </CardTitle>
            <CardDescription className="text-base">
              Control which menu items are visible in the sidebar navigation
            </CardDescription>
          </CardHeader>
          <CardContent className="spacing-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Dashboard</span>
                  </div>
                  <Switch
                    checked={menuSettings.dashboard}
                    onCheckedChange={(checked) => updateMenuSetting('dashboard', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                    <span className="text-sm font-semibold">API Test</span>
                  </div>
                  <Switch
                    checked={menuSettings.apiTest}
                    onCheckedChange={(checked) => updateMenuSetting('apiTest', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Upload Excel</span>
                  </div>
                  <Switch
                    checked={menuSettings.uploadExcel}
                    onCheckedChange={(checked) => updateMenuSetting('uploadExcel', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Data Preview</span>
                  </div>
                  <Switch
                    checked={menuSettings.dataPreview}
                    onCheckedChange={(checked) => updateMenuSetting('dataPreview', checked)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Generate Barcodes</span>
                  </div>
                  <Switch
                    checked={menuSettings.generateBarcodes}
                    onCheckedChange={(checked) => updateMenuSetting('generateBarcodes', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Design</span>
                  </div>
                  <Switch
                    checked={menuSettings.design}
                    onCheckedChange={(checked) => updateMenuSetting('design', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Subscription</span>
                  </div>
                  <Switch
                    checked={menuSettings.subscription}
                    onCheckedChange={(checked) => updateMenuSetting('subscription', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Downloads</span>
                  </div>
                  <Switch
                    checked={menuSettings.downloads}
                    onCheckedChange={(checked) => updateMenuSetting('downloads', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-semibold">Settings</span>
                  </div>
                  <Switch
                    checked={menuSettings.settings}
                    onCheckedChange={(checked) => updateMenuSetting('settings', checked)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-border/50">
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetMenuSettings}
                className="btn-outline"
              >
                Reset to Defaults
              </Button>
              <div className="text-xs text-muted-foreground font-medium">
                Changes are saved automatically
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="card-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              Security Settings
            </CardTitle>
            <CardDescription className="text-base">
              Configure security and privacy options
            </CardDescription>
          </CardHeader>
          <CardContent className="spacing-card">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">Limit API requests per minute</p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">File Upload Security</h4>
                  <p className="text-sm text-muted-foreground">Validate uploaded files</p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">CORS Protection</h4>
                  <p className="text-sm text-muted-foreground">Control cross-origin requests</p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barcode Settings */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Barcode Generation Settings
            </CardTitle>
            <CardDescription>
              Customize default barcode generation options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Default PDF Grid</span>
                  <Button variant="outline" size="sm">5x12</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-generate IMEI2</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High Resolution</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Default Font Size</span>
                  <Button variant="outline" size="sm">Medium</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Barcode Style</span>
                  <Button variant="outline" size="sm">Standard</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Color Scheme</span>
                  <Button variant="outline" size="sm">Default</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Management */}
        <DeviceManagement />

        {/* Simple Device Management */}
        <SimpleDeviceManagement />

        {/* Payment Providers - Admin Only */}
        {user?.is_admin && (
          <Card className="shadow-elegant border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Payment Providers
                <Badge variant="outline" className="ml-auto">Admin Only</Badge>
              </CardTitle>
              <CardDescription>
                Manage mobile money payment providers available to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {paymentProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                        provider.color === 'green' ? 'bg-green-600' :
                        provider.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        {provider.id.substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {provider.country} • {provider.currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={(checked) => {
                          setPaymentProviders(providers =>
                            providers.map(p =>
                              p.id === provider.id ? { ...p, enabled: checked } : p
                            )
                          );
                        }}
                      />
                      <Badge variant={provider.enabled ? "default" : "secondary"}>
                        {provider.enabled ? "Active" : "Disabled"}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Provider
                </Button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Provider Configuration</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Enabled providers appear on the payment page</li>
                  <li>• Users can only select active providers</li>
                  <li>• Each provider uses specific currency/country settings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment API Settings - Admin Only */}
        {user?.is_admin && (
          <Card className="shadow-elegant border-l-4 border-l-blue-500">
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
                  {/* Environment Selection */}
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
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span>Sandbox (Testing)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="production">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Production (Live)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {paymentSettings.payment_api_environment === 'sandbox' 
                        ? 'Using test environment - no real payments processed'
                        : 'Using live environment - real payments will be processed'
                      }
                    </p>
                  </div>

                  {/* Production Auth Token */}
                  {paymentSettings.payment_api_environment === 'production' && (
                    <div className="space-y-3">
                      <Label htmlFor="production-token" className="text-sm font-medium">
                        Production Auth Token
                      </Label>
                      <div className="relative">
                        <input
                          id="production-token"
                          type="password"
                          value={paymentSettings.payment_production_auth_token}
                          onChange={(e) => 
                            setPaymentSettings(prev => ({ ...prev, payment_production_auth_token: e.target.value }))
                          }
                          placeholder="Enter production auth token"
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Required for production payments. Keep this secure.
                      </p>
                    </div>
                  )}

                  {/* Webhook URL */}
                  <div className="space-y-3">
                    <Label htmlFor="webhook-url" className="text-sm font-medium">
                      Payment Webhook URL
                    </Label>
                    <input
                      id="webhook-url"
                      type="url"
                      value={paymentSettings.payment_webhook_url}
                      onChange={(e) => 
                        setPaymentSettings(prev => ({ ...prev, payment_webhook_url: e.target.value }))
                      }
                      placeholder="https://yourdomain.com/api/tokens/webhook/payment-complete"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL where payment completion notifications will be sent
                    </p>
                  </div>

                  {/* Save Button */}
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

                  {/* Info Box */}
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
          <Card className="shadow-elegant border-l-4 border-l-purple-500">
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
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Collections API Configuration</h4>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                    <li>• Endpoint: https://optimus.santripe.com/transactions/mobile-money-collections/&lt;api_key&gt;</li>
                    <li>• Monitor all mobile money collections in real-time</li>
                    <li>• View transaction status, amounts, and provider details</li>
                    <li>• Access daily statistics and trends</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="collections-api-key" className="text-sm font-medium">
                    Optimus Collections API Key
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="collections-api-key"
                      type="password"
                      placeholder="Enter Optimus collections API key..."
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                    />
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This API key allows monitoring of mobile money collections from Optimus
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Collections monitoring is not configured
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Manager - Super Admin Only */}
        {user?.is_super_admin && (
          <Card className="shadow-elegant border-l-4 border-l-green-500">
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

        {/* Data Management */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Data Management
            </CardTitle>
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
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export { SettingsPage };
export { default as SettingsPageNew } from './SettingsPageNew';

