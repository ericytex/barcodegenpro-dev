import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, Shield, Palette, Database, RefreshCw, AlertTriangle, CheckCircle, ToggleLeft, ToggleRight, CreditCard, Plus, Trash2, Edit, DollarSign, Users, User, Bell, Eye, Monitor, Coins } from "lucide-react";
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
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { TokenAssignment } from "@/components/TokenAssignment";
import { useMenuSettings } from "@/contexts/MenuContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  // Profile state
  const [profile, setProfile] = useState({
    full_name: user?.full_name || user?.username || '',
    email: user?.email || '',
    bio: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

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

  // Profile save handler
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const apiConfig = apiService.getEnvironmentConfig();
      const baseUrl = apiConfig.baseUrl.endsWith('/api') ? apiConfig.baseUrl : apiConfig.baseUrl;
      const profileUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/auth/profile`
        : `${baseUrl}/api/auth/profile`;
      const response = await fetch(profileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        alert('Profile updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error updating profile: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Mobile detection and responsive handling

  const loadPaymentSettings = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingPaymentSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/payment-settings`
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
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/payment-settings`
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

  const loadCollectionsSettings = async () => {
    if (!user?.is_super_admin) return;
    
    setIsLoadingCollectionsSettings(true);
    try {
      const baseUrl = apiService.getEnvironmentConfig().baseUrl;
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/collections-settings`
        : `${baseUrl}/api/tokens/admin/collections-settings`;
      const response = await fetch(url, {
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
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/collections-settings`
        : `${baseUrl}/api/tokens/admin/collections-settings`;
      const response = await fetch(url, {
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
      const url = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/token-settings`
        : `${baseUrl}/api/tokens/admin/token-settings`;
      const response = await fetch(url, {
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
      const tokenSettingsUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/tokens/admin/token-settings`
        : `${baseUrl}/api/tokens/admin/token-settings`;
      const response = await fetch(tokenSettingsUrl, {
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
      const bannersUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/banners`
        : `${baseUrl}/api/banners`;
      const response = await fetch(bannersUrl, {
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
      const bannersUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/banners`
        : `${baseUrl}/api/banners`;
      const response = await fetch(bannersUrl, {
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
      const bannerStatusUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/banners/${bannerId}/status`
        : `${baseUrl}/api/banners/${bannerId}/status`;
      const response = await fetch(bannerStatusUrl, {
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
      const deleteBannerUrl = baseUrl.endsWith('/api') 
        ? `${baseUrl}/banners/${bannerId}`
        : `${baseUrl}/api/banners/${bannerId}`;
      const response = await fetch(deleteBannerUrl, {
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
      {/* Mobile-First Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <p className="text-sm text-gray-600">Update your profile details</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button 
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 shadow-sm"
            >
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Additional Mobile-Friendly Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Account Active</span>
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Email Verified</span>
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Security Settings Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <p className="text-sm text-gray-600">Protect your account</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Key className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">Add extra security to your account</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Off</span>
              <button className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
              </button>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Get security alerts via email</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600">On</span>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-colors">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
              </button>
            </div>
          </div>

          {/* Change Password Button */}
          <div className="pt-4">
            <ChangePasswordDialog>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors duration-200 border border-gray-200">
                Change Password
              </button>
            </ChangePasswordDialog>
          </div>
        </div>
      </div>

      {/* User Manager - Super Admin Only */}
      {user?.is_super_admin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">User Manager</h2>
                <p className="text-sm text-gray-600">Manage users and permissions</p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Super Admin</span>
            </div>
          </div>
          <div className="p-6">
            <UserManager isSuperAdmin={user.is_super_admin} />
          </div>
        </div>
      )}
    </div>
  );

  const renderApiTab = () => (
    <div className="space-y-6">
      {/* API Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Key className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
              <p className="text-sm text-gray-600">Manage your API settings</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Environment Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Environment</label>
            <div className="grid grid-cols-2 gap-3">
              <button className={`p-4 rounded-xl border-2 transition-all ${
                environmentConfig.environment === 'development' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Development</span>
                </div>
                <p className="text-xs text-gray-600">localhost:8034</p>
              </button>
              <button className={`p-4 rounded-xl border-2 transition-all ${
                environmentConfig.environment === 'production' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Production</span>
                </div>
                <p className="text-xs text-gray-600">194.163.134.129:8034</p>
              </button>
            </div>
          </div>

          {/* API Status */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">API Status</label>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getConnectionIcon()}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {connectionStatus === 'connected' ? 'API Connected' : 
                       connectionStatus === 'testing' ? 'Testing Connection...' : 
                       'API Disconnected'}
                    </p>
                    <p className="text-xs text-gray-600">{environmentConfig.baseUrl}</p>
                  </div>
                </div>
                {getConnectionBadge()}
              </div>
              <button 
                onClick={testConnection}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment API Settings - Admin Only */}
      {user?.is_admin && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="flex-1 min-w-0">Payment API Settings</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">Admin Only</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              Configure payment gateway API environment and credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
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
                    <SelectTrigger className="mt-1">
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
                      className="w-full mt-1"
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
                    className="w-full mt-1"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={savePaymentSettings}
                    disabled={isSavingPaymentSettings}
                    className="w-full md:w-auto"
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

                <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm md:text-base">Payment Configuration</h4>
                  <ul className="text-xs md:text-sm text-blue-800 dark:text-blue-200 space-y-1">
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
      {/* Theme Settings Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Palette className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Theme Settings</h2>
              <p className="text-sm text-gray-600">Customize your experience</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Choose Theme</label>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="w-full h-16 bg-white border rounded-lg mb-3 flex items-center justify-center">
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-300 rounded w-8"></div>
                    <div className="h-1 bg-gray-300 rounded w-6"></div>
                    <div className="h-1 bg-gray-300 rounded w-4"></div>
                  </div>
                </div>
                <p className="text-sm font-medium text-center">Light</p>
              </button>
              <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
                <div className="w-full h-16 bg-gray-900 border rounded-lg mb-3 flex items-center justify-center">
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-400 rounded w-8"></div>
                    <div className="h-1 bg-gray-400 rounded w-6"></div>
                    <div className="h-1 bg-gray-400 rounded w-4"></div>
                  </div>
                </div>
                <p className="text-sm font-medium text-center text-blue-700">Dark</p>
              </button>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200">
            Update Theme
          </button>
        </div>
      </div>

      {/* Menu Settings Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Menu Settings</h3>
          <p className="text-sm text-gray-600">Control sidebar visibility</p>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(menuSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Settings className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 capitalize text-sm">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-xs text-gray-600">Show/hide in navigation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{value ? 'On' : 'Off'}</span>
                <button 
                  onClick={() => updateMenuSetting(key as keyof typeof menuSettings, !value)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    value ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    value ? 'right-0.5' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-4 md:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Device Management</CardTitle>
          <CardDescription className="text-sm">
              Manage device templates and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceManagement />
        </CardContent>
      </Card>

      {/* Database Management - Super Admin Only */}
      {user?.is_super_admin && (
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Database className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="flex-1 min-w-0">Database Management</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              Manage database operations, backups, security, and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseManagement />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Data Management</CardTitle>
          <CardDescription className="text-sm">
            Manage your data and storage settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">Auto-cleanup Generated Files</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Remove old files automatically</p>
              </div>
              <Button variant="outline" size="sm" className="ml-3 flex-shrink-0">7 days</Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">Backup Generated Files</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Keep copies of generated files</p>
              </div>
              <Button variant="outline" size="sm" className="ml-3 flex-shrink-0">Enabled</Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">Log Generation History</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Track all generation activities</p>
              </div>
              <Button variant="outline" size="sm" className="ml-3 flex-shrink-0">Enabled</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Clear Cache
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Export Settings
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Import Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banner Management - Admin Only */}
      {user?.is_admin && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="flex-1 min-w-0">Banner Management</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">Admin Only</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              Create and manage announcement banners for users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-semibold text-sm md:text-base">Active Banners</h3>
              <Button onClick={() => setShowAddBanner(true)} size="sm" className="w-full sm:w-auto">
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
                  <div key={banner.id} className="border rounded-lg p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={banner.is_active ? "default" : "secondary"} className="text-xs">
                            {banner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{banner.type}</Badge>
                        </div>
                        <h4 className="font-semibold text-sm md:text-base mb-1 break-words">{banner.title}</h4>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2 break-words">{banner.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(banner.created_at).toLocaleDateString()}
                          {banner.expires_at && ` • Expires: ${new Date(banner.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={() => toggleBannerStatus(banner.id, banner.is_active)}
                          className="flex-shrink-0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBanner(banner.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
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
              <Card className="border-dashed shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg md:text-xl">Create New Banner</CardTitle>
                  <CardDescription className="text-sm">Add a new announcement or promotion banner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="banner-title" className="text-sm font-medium">Title</Label>
                      <Input
                        id="banner-title"
                        value={newBanner.title}
                        onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                        placeholder="Banner title"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="banner-type" className="text-sm font-medium">Type</Label>
                      <Select
                        value={newBanner.type}
                        onValueChange={(value: 'info' | 'success' | 'warning' | 'error') => 
                          setNewBanner({ ...newBanner, type: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
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
                    <Label htmlFor="banner-message" className="text-sm font-medium">Message</Label>
                    <textarea
                      id="banner-message"
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                      rows={3}
                      value={newBanner.message}
                      onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
                      placeholder="Banner message content"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner-expires" className="text-sm font-medium">Expires At (Optional)</Label>
                    <Input
                      id="banner-expires"
                      type="datetime-local"
                      value={newBanner.expires_at}
                      onChange={(e) => setNewBanner({ ...newBanner, expires_at: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={createBanner} className="w-full sm:w-auto">
                      Create Banner
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddBanner(false)} className="w-full sm:w-auto">
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
    <div className="space-y-4 md:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Email Notifications</CardTitle>
          <CardDescription className="text-sm">
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">Payment Notifications</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Get notified when payments are received</p>
              </div>
              <Switch defaultChecked className="ml-3 flex-shrink-0" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">System Alerts</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Receive important system updates</p>
              </div>
              <Switch defaultChecked className="ml-3 flex-shrink-0" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">Weekly Reports</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Get weekly usage and performance reports</p>
              </div>
              <Switch className="ml-3 flex-shrink-0" />
            </div>
          </div>
          <Button className="w-full md:w-auto">Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-4 md:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Billing Information</CardTitle>
          <CardDescription className="text-sm">
            Manage your billing and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="billing-email" className="text-sm font-medium">Billing Email</Label>
              <Input 
                id="billing-email" 
                type="email" 
                placeholder="billing@example.com" 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tax-id" className="text-sm font-medium">Tax ID</Label>
              <Input 
                id="tax-id" 
                placeholder="Enter tax ID" 
                className="mt-1"
              />
            </div>
          </div>
          <Button className="w-full md:w-auto">Update Billing Info</Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Payment Methods</CardTitle>
          <CardDescription className="text-sm">
            Manage your payment methods and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 md:p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base">**** **** **** 1234</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0">Edit</Button>
            </div>
          </div>
          <Button variant="outline" className="w-full md:w-auto">Add Payment Method</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderTokensTab = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Token Settings - Admin Only */}
      {user?.is_admin && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="flex-1 min-w-0">Token Settings</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">Admin Only</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              Configure token pricing and welcome bonuses for new users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {isLoadingTokenSettings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading token settings...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
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
                      className="w-full mt-1"
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
                      className="w-full mt-1"
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
                      className="w-full mt-1"
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
                      className="w-full mt-1"
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
                    className="w-full md:w-auto"
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

                <div className="p-3 md:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-sm md:text-base">Token Configuration</h4>
                  <ul className="text-xs md:text-sm text-green-800 dark:text-green-200 space-y-1">
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
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Coins className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <span className="flex-1 min-w-0">Token Assignment</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
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

  // Desktop-Specific Compact Content Renderer
  const renderDesktopTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderDesktopProfileTab();
      case 'account':
        return renderDesktopAccountTab();
      case 'api':
        return renderDesktopApiTab();
      case 'tokens':
        return renderDesktopTokensTab();
      case 'appearance':
        return renderDesktopAppearanceTab();
      case 'system':
        return renderDesktopSystemTab();
      case 'notifications':
        return renderDesktopNotificationsTab();
      case 'billing':
        return renderDesktopBillingTab();
      default:
        return renderDesktopProfileTab();
    }
  };

  // Desktop-Specific Compact Profile Tab - Full Width
  const renderDesktopProfileTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Personal Information - Left Column */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Enter full name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                placeholder="Enter email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Bio</label>
            <textarea
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Account Status - Middle Column */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <h3 className="font-semibold text-gray-900">Account Status</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Account Active</span>
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Email Verified</span>
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Confirmed</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Two-Factor Auth</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">Disabled</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-md transition-colors">
              Security Settings
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats - Right Column */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Quick Stats</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Member Since</span>
            <span className="text-sm font-medium text-gray-900">Oct 2024</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Last Login</span>
            <span className="text-sm font-medium text-gray-900">Today</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Profile Complete</span>
            <span className="text-sm font-medium text-green-600">85%</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium py-2 px-4 rounded-md transition-colors">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop-Specific Compact Account Tab - Full Width
  const renderDesktopAccountTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Security Settings - Column 1 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <h3 className="font-semibold text-gray-900">Security</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">2FA</span>
            </div>
            <button className="w-8 h-4 bg-gray-200 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Email Alerts</span>
            </div>
            <button className="w-8 h-4 bg-blue-600 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5"></div>
            </button>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <ChangePasswordDialog>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
                Change Password
              </button>
            </ChangePasswordDialog>
          </div>
        </div>
      </div>

      {/* User Management - Column 2 */}
      {user?.is_super_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900">User Manager</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-sm font-medium text-gray-900">24</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium text-green-600">18</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Admins</span>
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
                Manage Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions - Column 3 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-orange-50">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <button 
            onClick={() => toast.info('Export functionality coming soon')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
            Export Data
          </button>
          <button 
            onClick={() => toast.info('Download Reports functionality coming soon')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
            Download Reports
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
            Account Settings
          </button>
        </div>
      </div>

      {/* Account Overview - Column 4 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Account Overview</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Account Type</span>
            <span className="text-sm font-medium text-blue-600">Super Admin</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Last Login</span>
            <span className="text-sm font-medium text-gray-900">Today</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Session Time</span>
            <span className="text-sm font-medium text-gray-900">2h 15m</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <button 
              onClick={() => toast.info('Activity history coming soon')}
              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
              View Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop-Specific Compact API Tab - Full Width
  const renderDesktopApiTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* API Configuration - Column 1 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-orange-50">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-orange-600" />
            <h3 className="font-semibold text-gray-900">API Configuration</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Environment</label>
            <div className="grid grid-cols-2 gap-2">
              <button className={`p-3 rounded-md border text-sm transition-all ${
                environmentConfig.environment === 'development' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Development</span>
                </div>
                <p className="text-xs text-gray-600">localhost:8034</p>
              </button>
              <button className={`p-3 rounded-md border text-sm transition-all ${
                environmentConfig.environment === 'production' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Production</span>
                </div>
                <p className="text-xs text-gray-600">194.163.134.129:8034</p>
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">API Status</label>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getConnectionIcon()}
                  <span className="text-sm font-medium text-gray-900">
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'testing' ? 'Testing...' : 
                     'Disconnected'}
                  </span>
                </div>
                {getConnectionBadge()}
              </div>
              <p className="text-xs text-gray-600 mb-2">{environmentConfig.baseUrl}</p>
              <button 
                onClick={testConnection}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settings - Column 2 */}
      {user?.is_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Payment API</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Admin</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Environment</label>
              <div className="flex gap-2">
                <button className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  paymentSettings.payment_api_environment === 'sandbox'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Sandbox
                </button>
                <button className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  paymentSettings.payment_api_environment === 'production'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Production
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Webhook URL</label>
              <input
                type="url"
                value={paymentSettings.payment_webhook_url}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, payment_webhook_url: e.target.value }))}
                placeholder="https://yourdomain.com/webhook"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors">
              Save Payment Settings
            </button>
          </div>
        </div>
      )}

      {/* Collections Settings - Column 3 */}
      {user?.is_super_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Collections API</h3>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Super Admin</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">API URL</label>
              <input
                type="url"
                value={collectionsSettings.collections_api_url}
                onChange={(e) => setCollectionsSettings(prev => ({ ...prev, collections_api_url: e.target.value }))}
                placeholder="https://optimus.santripe.com/..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">API Key</label>
              <input
                type="password"
                value={collectionsSettings.collections_api_key}
                onChange={(e) => setCollectionsSettings(prev => ({ ...prev, collections_api_key: e.target.value }))}
                placeholder="Enter API key..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors">
              Save Collections Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Desktop-Specific Compact Tokens Tab
  const renderDesktopTokensTab = () => (
    <div className="space-y-6">
      {/* Token Settings - Admin Only */}
      {user?.is_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-gray-900">Token Settings</h3>
              <Badge variant="outline" className="ml-auto text-xs">Admin Only</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Configure token pricing and welcome bonuses for new users
            </p>
          </div>
          <div className="p-4 space-y-4">
            {isLoadingTokenSettings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading token settings...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-bonus-desktop" className="text-xs font-medium">
                      Welcome Bonus Tokens
                    </Label>
                    <Input
                      id="welcome-bonus-desktop"
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

                  <div className="space-y-2">
                    <Label htmlFor="token-price-desktop" className="text-xs font-medium">
                      Token Price (UGX)
                    </Label>
                    <Input
                      id="token-price-desktop"
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

                  <div className="space-y-2">
                    <Label htmlFor="min-purchase-desktop" className="text-xs font-medium">
                      Minimum Purchase
                    </Label>
                    <Input
                      id="min-purchase-desktop"
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

                  <div className="space-y-2">
                    <Label htmlFor="max-purchase-desktop" className="text-xs font-medium">
                      Maximum Purchase
                    </Label>
                    <Input
                      id="max-purchase-desktop"
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

                <div className="pt-2 border-t border-gray-100">
                  <Button 
                    onClick={saveTokenSettings}
                    disabled={isSavingTokenSettings}
                    className="w-full md:w-auto"
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

                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2 text-sm">Token Configuration</h4>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li>• Welcome bonus applies to all new user registrations</li>
                    <li>• Token pricing affects all future purchases</li>
                    <li>• Purchase limits help control user spending</li>
                    <li>• Changes take effect immediately</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Token Assignment - Super Admin Only */}
      {user?.is_super_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Token Assignment</h3>
              <Badge variant="outline" className="ml-auto text-xs">Super Admin Only</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Assign tokens to any user for promotions, bonuses, or compensations
            </p>
          </div>
          <div className="p-4">
            <TokenAssignment isSuperAdmin={user.is_super_admin} />
          </div>
        </div>
      )}
    </div>
  );

  // Desktop-Specific Compact Appearance Tab
  const renderDesktopAppearanceTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Theme Settings</h3>
        <div className="space-y-3">
          <button className="w-full p-3 border border-gray-200 rounded-md hover:bg-gray-50">
            Light Theme
          </button>
          <button className="w-full p-3 border border-blue-500 bg-blue-50 rounded-md">
            Dark Theme
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Menu Settings</h3>
        <div className="space-y-2">
          {Object.entries(menuSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button 
                onClick={() => updateMenuSetting(key as keyof typeof menuSettings, !value)}
                className={`w-8 h-4 rounded-full relative ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${value ? 'right-0.5' : 'left-0.5'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Desktop-Specific Compact System Tab
  const renderDesktopSystemTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Device Management</h3>
        <DeviceManagement />
      </div>
      {user?.is_super_admin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Database Management</h3>
          <div className="space-y-2">
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
              Database Health
            </button>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors">
              Backup Database
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Desktop-Specific Compact Notifications Tab
  const renderDesktopNotificationsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Email Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Security alerts</span>
            <button className="w-8 h-4 bg-blue-600 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">System updates</span>
            <button className="w-8 h-4 bg-gray-200 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5"></div>
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Push Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Mobile notifications</span>
            <button className="w-8 h-4 bg-blue-600 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Desktop notifications</span>
            <button className="w-8 h-4 bg-gray-200 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop-Specific Compact Billing Tab
  const renderDesktopBillingTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Current Plan</h3>
        <div className="text-lg font-bold text-blue-600 mb-1">Pro Plan</div>
        <p className="text-sm text-gray-600">$29/month</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Usage This Month</h3>
        <div className="text-lg font-bold text-green-600 mb-1">2,450</div>
        <p className="text-sm text-gray-600">Tokens used</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Next Billing</h3>
        <div className="text-lg font-bold text-gray-900 mb-1">Dec 15</div>
        <p className="text-sm text-gray-600">$29.00</p>
      </div>
    </div>
  );




  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Settings Header with Horizontal Tabs */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 pr-6 lg:pr-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600">Manage your account settings and preferences</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {user?.is_super_admin ? 'Super Admin' : user?.is_admin ? 'Admin' : 'User'}
                </Badge>
              </div>
            </div>
            
            {/* Horizontal Tab Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 pr-6 lg:pr-12">
            <div className="max-w-full mx-auto">
              {renderDesktopTabContent()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPageNew;
