import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, CreditCard, Smartphone, Loader2, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiConfig } from '@/lib/api';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price_ugx: number;
  duration_months: number;
  features: string[];
}

interface SubscriptionStatus {
  has_subscription: boolean;
  status: string;
  plan: string | null;
  end_date?: string;
}

interface SubscribeResponse {
  message: string;
  payment_url: string;
  transaction_uid: string;
  amount_ugx: number;
  amount_kes: number;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is super admin
  if (!user?.is_super_admin) {
    return <Navigate to="/" replace />;
  }
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const apiConfig = getApiConfig();
      
      // Load plans and status in parallel
      const [plansResponse, statusResponse] = await Promise.all([
        fetch(`${apiConfig.baseUrl}/api/payments/plans`, {
          headers: {
            'X-API-Key': apiConfig.apiKey,
          },
        }),
        fetch(`${apiConfig.baseUrl}/api/payments/status`, {
          headers: {
            'X-API-Key': apiConfig.apiKey,
          },
        })
      ]);

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubscriptionStatus(statusData);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      setError('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !phone) {
      toast.error('Please select a plan and enter your phone number');
      return;
    }

    setIsSubscribing(true);
    setError(null);
    
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({
          plan_id: selectedPlan,
          phone: phone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create subscription');
      }

      const result: SubscribeResponse = await response.json();
      
      // Open payment URL in new tab
      window.open(result.payment_url, '_blank');
      
      toast.success('Redirecting to payment...', {
        description: `Amount: ${formatPrice(result.amount_ugx)} UGX (${result.amount_kes} KES)`
      });
      
      // Refresh status after a delay
      setTimeout(() => {
        loadSubscriptionData();
      }, 2000);
      
    } catch (error: any) {
      console.error('Subscription failed:', error);
      setError(error.message || 'Failed to create subscription');
      toast.error('Subscription failed', {
        description: error.message
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  };

  const testPaymentCompletion = async (transactionUid: string) => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/payments/test-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({ transaction_uid: transactionUid })
      });

      if (response.ok) {
        toast.success('Payment completed successfully');
        loadSubscriptionData();
      } else {
        toast.error('Failed to complete payment');
      }
    } catch (error) {
      console.error('Test payment completion failed:', error);
      toast.error('Test payment completion failed');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading subscription data...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Choose your plan to unlock premium features
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscriptionStatus?.has_subscription && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">
                    Active Subscription: {subscriptionStatus.plan}
                  </h3>
                  {subscriptionStatus.end_date && (
                    <p className="text-green-600">
                      Expires: {new Date(subscriptionStatus.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {selectedPlan === plan.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price_ugx)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                  </div>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Form */}
        {selectedPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Complete Your Subscription
              </CardTitle>
              <CardDescription>
                Enter your mobile money phone number to complete the payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">
                  Mobile Money Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+256700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We support MTN, Airtel, and other mobile money providers
                </p>
              </div>
              
              <Button 
                onClick={handleSubscribe}
                disabled={isSubscribing || isLoading}
                className="w-full"
                size="lg"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscribe Now - {formatPrice(plans.find(p => p.id === selectedPlan)?.price_ugx || 0)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Test Payment Completion (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Development Tools</CardTitle>
              <CardDescription className="text-yellow-700">
                Test payment completion (development only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="test-transaction">Transaction UID</Label>
                <Input
                  id="test-transaction"
                  placeholder="Enter transaction UID to test completion"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        testPaymentCompletion(input.value.trim());
                        input.value = '';
                      }
                    }
                  }}
                />
                <p className="text-xs text-yellow-600">
                  Press Enter to test payment completion
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

