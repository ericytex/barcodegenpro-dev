import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Loader2, Check, Phone, CreditCard, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';

interface TokenPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  requiredTokens?: number;
}

const TOKEN_PACKAGES = [
  { tokens: 10, amount: 5000, label: 'Starter', popular: false },
  { tokens: 20, amount: 10000, label: 'Basic', popular: false },
  { tokens: 50, amount: 25000, label: 'Popular', popular: true },
  { tokens: 100, amount: 50000, label: 'Pro', popular: false },
  { tokens: 200, amount: 100000, label: 'Business', popular: false },
];

const PROVIDERS = [
  { 
    id: 'MTN', 
    name: 'MTN', 
    icon: Phone,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    selectedBgColor: 'bg-yellow-100',
    selectedBorderColor: 'border-yellow-500',
    textColor: 'text-yellow-700'
  },
  { 
    id: 'AIRTEL', 
    name: 'Airtel', 
    icon: Phone,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    selectedBgColor: 'bg-red-100',
    selectedBorderColor: 'border-red-500',
    textColor: 'text-red-700'
  },
  { 
    id: 'MPESA', 
    name: 'M-PESA', 
    icon: CreditCard,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    selectedBgColor: 'bg-green-100',
    selectedBorderColor: 'border-green-500',
    textColor: 'text-green-700'
  },
];

export function TokenPurchaseModal({ open, onClose, requiredTokens }: TokenPurchaseModalProps) {
  const { purchaseTokens, refreshBalance } = useTokens();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('MTN');
  const [phone, setPhone] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [tokenSettings, setTokenSettings] = useState({
    min_purchase_tokens: 10,
    token_price_ugx: 500
  });

  const calculateTokens = (amount: number) => {
    return Math.floor(amount / (tokenSettings.token_price_ugx || 500));
  };

  // Fetch token settings on component mount
  useEffect(() => {
    const fetchTokenSettings = async () => {
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
        console.error('Failed to fetch token settings:', error);
        // Keep default values if fetch fails
      }
    };

    fetchTokenSettings();
  }, []);

  const handlePackageSelect = (index: number) => {
    setSelectedPackage(index);
    setCustomAmount('');
  };

  // Check if tokens were confirmed via Collections API
  useEffect(() => {
    if (isWaitingForConfirmation && paymentData?.transaction_uid) {
      const interval = setInterval(async () => {
        try {
          // Call the verification endpoint to check Collections API
          const baseUrl = apiService.getEnvironmentConfig().baseUrl;
          const url = baseUrl.endsWith('/api') 
            ? `${baseUrl}/tokens/verify-transaction/${paymentData.transaction_uid}`
            : `${baseUrl}/api/tokens/verify-transaction/${paymentData.transaction_uid}`;
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.confirmed && result.tokens_credited) {
              // Payment confirmed and tokens credited!
              setIsWaitingForConfirmation(false);
              if (checkInterval) {
                clearInterval(checkInterval);
              }
              
              console.log('✅ Tokens confirmed and credited! Refreshing balance...');
              
              toast.success('Tokens confirmed!', {
                description: `Your ${paymentData.tokens_purchased} tokens have been added`,
              });
              
              // Refresh balance to show new tokens - with multiple retries
              await refreshBalance();
              // Small delay then refresh again to ensure UI updates
              setTimeout(async () => {
                console.log('Refreshing balance again to ensure update...');
                await refreshBalance();
              }, 500);
              
              // Close modal after a short delay
              setTimeout(() => {
                onClose();
              }, 2000);
              
            } else if (result.confirmed && !result.tokens_credited) {
              // Confirmed but crediting failed - retry
              console.log('Transaction confirmed but token crediting failed, retrying...');
            }
            // If not confirmed yet, keep waiting
          }
        } catch (error) {
          console.error('Error checking token confirmation:', error);
        }
      }, 1000); // Check every 1 second
      
      setCheckInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isWaitingForConfirmation, paymentData, refreshBalance]);

  const handlePurchase = async () => {
    let amount = 0;
    
    if (selectedPackage !== null) {
      amount = TOKEN_PACKAGES[selectedPackage].amount;
    } else if (customAmount) {
      amount = parseInt(customAmount);
      const minAmount = (tokenSettings.min_purchase_tokens || 10) * (tokenSettings.token_price_ugx || 500);
      if (isNaN(amount) || amount < minAmount) {
        toast.error(`Minimum purchase is UGX ${minAmount.toLocaleString()}`);
        return;
      }
    } else {
      toast.error('Please select a package or enter custom amount');
      return;
    }

    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await purchaseTokens(amount, selectedProvider, phone);
      
      if (result.success) {
        setPaymentData(result);
        setShowPaymentInstructions(true);
        setIsWaitingForConfirmation(true);
        toast.success('Payment initiated!', {
          description: `Please complete payment on your phone for ${calculateTokens(amount)} tokens`,
        });
      } else {
        toast.error(result.message || 'Purchase failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const tokens = (() => {
    if (selectedPackage !== null) {
      return TOKEN_PACKAGES[selectedPackage].tokens;
    }
    if (customAmount) {
      const amount = parseInt(customAmount);
      const calculatedTokens = calculateTokens(amount);
      if (calculatedTokens >= tokenSettings.min_purchase_tokens) {
        return calculatedTokens;
      }
    }
    return 0;
  })();

  if (showPaymentInstructions && paymentData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Follow these steps to complete your token purchase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold mb-2">
                <Check className="h-5 w-5" />
                Payment Request Sent
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                A payment prompt has been sent to {phone}. Please complete the payment on your phone.
              </p>
            </Card>

            <div className="space-y-2">
              <p className="font-semibold">Steps to Complete:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Check your phone for a payment prompt from {selectedProvider}</li>
                <li>Enter your Mobile Money PIN to authorize</li>
                <li>You'll receive a confirmation message</li>
                <li>Your tokens will be added automatically</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Transaction ID:</strong> {paymentData.transaction_uid?.slice(0, 12)}...
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                <strong>Tokens:</strong> {paymentData.tokens_purchased}
              </p>
            </div>

            {/* Loading Spinner - Waiting for payment confirmation */}
            {isWaitingForConfirmation && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      Verifying your payment...
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Please wait while we process your transaction. This usually takes a few seconds.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (checkInterval) {
                    clearInterval(checkInterval);
                  }
                  setIsWaitingForConfirmation(false);
                  refreshBalance();
                  onClose();
                  setShowPaymentInstructions(false);
                  setPaymentData(null);
                }} 
                className="flex-1"
                disabled={isWaitingForConfirmation}
              >
                {isWaitingForConfirmation ? 'Waiting...' : 'Done'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-3 py-2 border-b bg-gradient-to-r from-amber-100 to-orange-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="p-1 bg-amber-200 rounded-full">
              <Coins className="h-4 w-4 text-amber-800" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Buy Tokens</div>
              <div className="text-xs font-normal text-gray-700">
                {requiredTokens 
                  ? `Need ${requiredTokens} tokens`
                  : '1 token = 1 barcode (UGX 500)'
                }
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 py-3 space-y-3">
          {/* Quick Packages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Packages</h3>
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">Choose One</Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {TOKEN_PACKAGES.map((pkg, index) => {
                const Icon = pkg.popular ? Star : Coins;
                return (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedPackage === index
                        ? 'border-amber-600 bg-amber-100 shadow-md ring-1 ring-amber-300'
                        : 'border-gray-300 hover:border-amber-400 bg-white'
                    } ${pkg.popular ? 'ring-1 ring-amber-500' : ''}`}
                    onClick={() => handlePackageSelect(index)}
                  >
                    <div className="p-1.5 text-center">
                      {pkg.popular && (
                        <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-amber-800 mb-0.5">
                          <Star className="h-2 w-2 fill-current" />
                          POP
                        </div>
                      )}
                      <div className="text-lg font-bold text-amber-700 mb-0.5">{pkg.tokens}</div>
                      <div className="text-xs text-gray-600 mb-0.5">tokens</div>
                      <div className="text-xs font-bold text-gray-900 mb-0.5">
                        UGX {pkg.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-700">{pkg.label}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-900">Custom Amount</h3>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                Min: UGX {((tokenSettings.min_purchase_tokens || 10) * (tokenSettings.token_price_ugx || 500)).toLocaleString()}
              </Badge>
            </div>
            <div className="relative">
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter amount in UGX"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedPackage(null);
                }}
                className="text-sm pr-8 border-gray-400 focus:border-blue-600"
                min={(tokenSettings.min_purchase_tokens || 10) * (tokenSettings.token_price_ugx || 500)}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                <button
                  onClick={() => setCustomAmount(String((parseInt(customAmount) || 0) + (tokenSettings.token_price_ugx || 500)))}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setCustomAmount(String(Math.max((tokenSettings.min_purchase_tokens || 10) * (tokenSettings.token_price_ugx || 500), (parseInt(customAmount) || 0) - (tokenSettings.token_price_ugx || 500))))}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
            {customAmount && calculateTokens(parseInt(customAmount)) >= (tokenSettings.min_purchase_tokens || 10) && (
              <div className="mt-1 p-2 bg-blue-100 rounded border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 font-medium">You'll receive:</span>
                  <span className="font-bold text-blue-900">{calculateTokens(parseInt(customAmount))} tokens</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {tokenSettings.token_price_ugx || 500} UGX per token
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Payment Method</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                const isSelected = selectedProvider === provider.id;
                return (
                  <Card
                    key={provider.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? `${provider.selectedBgColor} ${provider.selectedBorderColor} border-2 shadow-md`
                        : `${provider.bgColor} ${provider.borderColor} border hover:border-opacity-80`
                    }`}
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    <div className="p-2 text-center">
                      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                        isSelected ? provider.selectedBgColor : provider.bgColor
                      }`}>
                        <Icon className={`h-3 w-3 ${provider.textColor}`} />
                      </div>
                      <div className={`text-xs font-semibold ${provider.textColor}`}>{provider.name}</div>
                      {isSelected && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-800">Selected</Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Phone Number</h3>
            <Input
              id="phone"
              type="tel"
              placeholder="+256700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-sm border-gray-400 focus:border-blue-600"
            />
            <p className="text-xs text-gray-600 mt-1">
              Phone registered with {selectedProvider}
            </p>
          </div>

          {/* Summary & Purchase Button */}
          {tokens > 0 && (
            <Card className="p-2 bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-700 font-medium">Tokens</div>
                    <div className="text-base font-bold text-amber-800">{tokens}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-700 font-medium">Amount</div>
                    <div className="text-sm font-bold text-gray-900">
                      UGX {(selectedPackage !== null ? TOKEN_PACKAGES[selectedPackage].amount : parseInt(customAmount) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handlePurchase}
                  disabled={isProcessing || !phone}
                  className="w-full bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold py-1.5 text-xs border-0"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-1 h-3 w-3" />
                      Pay with {selectedProvider}
                    </>
                  )}
                </Button>
                
                {!phone && (
                  <p className="text-xs text-red-700 text-center font-medium">
                    Please enter your phone number to continue
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
