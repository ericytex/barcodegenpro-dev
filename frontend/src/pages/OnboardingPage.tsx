import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, CreditCard, Loader2, BarChart3, Sparkles, ArrowRight, Smartphone, Zap, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

export default function OnboardingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'welcome' | 'plans' | 'payment'>('welcome');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTransactionUid, setPaymentTransactionUid] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedProvider, setSelectedProvider] = useState<'MPESA' | 'MTN' | 'AIRTEL'>('MTN');

  useEffect(() => {
    loadPlans();
    checkExistingSubscription();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/payments/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': apiConfig.apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.has_subscription) {
          // User already has subscription, redirect to dashboard
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/payments/plans`, {
        headers: {
          'X-API-Key': apiConfig.apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      setError('Failed to load subscription plans');
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
      const paymentData = {
        plan_id: selectedPlan,
        phone: phone,
        provider: selectedProvider,
      };

      const response = await fetch(`${apiConfig.baseUrl}/api/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create subscription');
      }

      const result = await response.json();

      // Show payment instructions instead of opening blank page
      toast.success('Payment Request Created!', {
        description: 'Check your phone for payment instructions.',
      });

      // Show payment instructions modal
      showPaymentInstructions(result.transaction_uid, result.amount_ugx);

      // Poll for payment completion
      pollPaymentStatus(result.transaction_uid);
    } catch (error: any) {
      setError(error.message || 'Failed to create subscription');
      toast.error('Subscription failed', {
        description: error.message,
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const pollPaymentStatus = async (transactionUid: string) => {
    const maxAttempts = 60; // Poll for 5 minutes
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const apiConfig = getApiConfig();
        const response = await fetch(`${apiConfig.baseUrl}/api/payments/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': apiConfig.apiKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.has_subscription && data.status === 'active') {
            // Payment successful!
            toast.success('Payment successful! Welcome to BarcodeGen Pro!', {
              description: 'Redirecting to your dashboard...',
            });
            setTimeout(() => navigate('/'), 2000);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          toast.info('Still waiting for payment confirmation', {
            description: 'You can continue to dashboard and check status later.',
          });
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }
    };

    checkStatus();
  };

  // Removed skip functionality - subscription is required

  const showPaymentInstructions = (transactionUid: string, amount: number) => {
    setPaymentTransactionUid(transactionUid);
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                Welcome to BarcodeGen Pro! 🎉
              </h1>
              <p className="text-xl text-white/90 font-medium">
                Hi {user?.username}! Let's unlock unlimited barcode generation.
              </p>
            </div>

            <Card className="max-w-3xl mx-auto shadow-2xl border-0 bg-white/10 backdrop-blur-sm">
              <CardContent className="p-10">
                <div className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-2xl mb-2 text-white">Account Created</h3>
                      <p className="text-white/80 text-lg">
                        Your account is ready and secured with enterprise-grade encryption!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-2xl mb-2 text-white">Choose Your Plan</h3>
                      <p className="text-white/80 text-lg">
                        Select a premium subscription plan that fits your business needs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-2xl mb-2 text-white">Start Generating</h3>
                      <p className="text-white/80 text-lg">
                        Create unlimited professional barcodes with premium templates
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <Button 
                    onClick={() => setStep('plans')} 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold text-lg py-6 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Choose Your Plan <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plans Step */}
        {step === 'plans' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Choose Your Plan</h1>
              <p className="text-white/90 text-lg">
                Select the premium plan that best fits your barcode generation needs
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    selectedPlan === plan.id
                      ? 'ring-4 ring-yellow-400 shadow-2xl scale-110 bg-gradient-to-br from-yellow-50 to-orange-50'
                      : 'hover:shadow-2xl bg-white/90 backdrop-blur-sm'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      selectedPlan === plan.id 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}>
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
                      {plan.name}
                      {selectedPlan === plan.id && (
                        <Check className="w-6 h-6 text-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-lg">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 text-center">
                      <div className="text-4xl font-bold text-green-600">{formatPrice(plan.price_ugx)}</div>
                      <div className="text-sm text-gray-600 font-medium">
                        per {plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm font-medium">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          {feature.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  if (selectedPlan) {
                    setStep('payment');
                  } else {
                    toast.error('Please select a plan');
                  }
                }}
                disabled={!selectedPlan}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-6 px-12 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Continue to Payment <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && selectedPlan && (
          <div className="max-w-lg mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Complete Your Subscription</h1>
              <p className="text-white/90 text-lg">
                Enter your mobile money details to activate your premium plan
              </p>
            </div>

            <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white">Payment Details</CardTitle>
                <CardDescription className="text-white/80 text-lg">
                  Plan: {plans.find((p) => p.id === selectedPlan)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl shadow-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-lg">Total Amount:</span>
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(plans.find((p) => p.id === selectedPlan)?.price_ugx || 0)}
                    </span>
                  </div>
                </div>

                {/* Mobile Money Provider Selector */}
                <div className="text-center">
                  <Label className="text-white font-semibold text-lg mb-4 block">Select Your Mobile Money Provider</Label>
                  <div className="flex justify-center gap-6 mb-6">
                    {/* MPESA */}
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        selectedProvider === 'MPESA' ? 'transform scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      onClick={() => {
                        setSelectedProvider('MPESA');
                      }}
                    >
                      <div className={`w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
                        selectedProvider === 'MPESA' ? 'ring-4 ring-yellow-400 shadow-yellow-400/50' : ''
                      }`}>
                        <div className="text-center">
                          <div className="text-3xl font-black text-green-600" style={{ fontFamily: 'Arial Black, sans-serif' }}>M</div>
                          <div className="text-xs font-bold text-green-600 -mt-1">PESA</div>
                        </div>
                      </div>
                      <span className="text-white/90 text-sm mt-3 font-semibold">M-PESA Kenya</span>
                      {selectedProvider === 'MPESA' && (
                        <div className="mt-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>

                    {/* MTN */}
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        selectedProvider === 'MTN' ? 'transform scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      onClick={() => {
                        setSelectedProvider('MTN');
                      }}
                    >
                      <div className={`w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
                        selectedProvider === 'MTN' ? 'ring-4 ring-yellow-400 shadow-yellow-400/50' : ''
                      }`}>
                        <div className="text-center">
                          <div className="text-3xl font-black" style={{ color: '#FFCC00', fontFamily: 'Arial Black, sans-serif' }}>MTN</div>
                          <div className="text-xs font-bold text-gray-700 -mt-1">Mobile Money</div>
                        </div>
                      </div>
                      <span className="text-white/90 text-sm mt-3 font-semibold">MTN Uganda</span>
                      {selectedProvider === 'MTN' && (
                        <div className="mt-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* AIRTEL */}
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        selectedProvider === 'AIRTEL' ? 'transform scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      onClick={() => {
                        setSelectedProvider('AIRTEL');
                      }}
                    >
                      <div className={`w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
                        selectedProvider === 'AIRTEL' ? 'ring-4 ring-yellow-400 shadow-yellow-400/50' : ''
                      }`}>
                        <div className="text-center">
                          <div className="text-2xl font-black" style={{ color: '#ED1C24', fontFamily: 'Arial Black, sans-serif' }}>airtel</div>
                          <div className="text-xs font-bold text-gray-700 -mt-1">Money</div>
                        </div>
                      </div>
                      <span className="text-white/90 text-sm mt-3 font-semibold">Airtel Money</span>
                      {selectedProvider === 'AIRTEL' && (
                        <div className="mt-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-red-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white font-semibold text-lg">Mobile Money Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+256700000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubscribing}
                    className="mt-2 text-lg py-3 bg-white/90 border-0 rounded-xl shadow-lg"
                  />
                  <p className="text-white/80 text-sm mt-2 font-medium">
                    Enter your phone number registered with MPESA, MTN, or Airtel
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing || !phone}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-6 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
                  size="lg"
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay Now with Mobile Money
                    </>
                  )}
                </Button>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => setStep('plans')} 
                    variant="outline" 
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 font-medium"
                  >
                    ← Back to Plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Instructions Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full shadow-2xl border-0 bg-white">
              <CardHeader className="text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardTitle className="text-2xl font-bold">Payment Instructions</CardTitle>
                <CardDescription className="text-white/90">
                  Follow these steps to complete your payment
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatPrice(paymentAmount)}
                  </div>
                  <p className="text-gray-600">Amount to pay</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Check Your Phone</h4>
                      <p className="text-sm text-gray-600">
                        You should receive a payment request on your mobile money account
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Enter Your PIN</h4>
                      <p className="text-sm text-gray-600">
                        Enter your mobile money PIN to authorize the payment
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Wait for Confirmation</h4>
                      <p className="text-sm text-gray-600">
                        We'll automatically detect your payment and activate your subscription
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm text-yellow-800 font-medium">
                      Keep this page open while you complete the payment
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      // For testing - simulate payment completion
                      if (paymentTransactionUid) {
                        fetch(`${getApiConfig().baseUrl}/api/payments/test-payment?transaction_uid=${paymentTransactionUid}`, {
                          method: 'POST',
                          headers: {
                            'X-API-Key': getApiConfig().apiKey,
                          },
                        }).then(() => {
                          toast.success('Payment completed! Redirecting to dashboard...');
                          setTimeout(() => navigate('/'), 2000);
                        });
                      }
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Test Payment (Dev)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
