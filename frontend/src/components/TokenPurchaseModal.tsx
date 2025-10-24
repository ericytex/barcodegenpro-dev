import React, { useState } from 'react';
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
import { Coins, Loader2, Check } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';
import { toast } from 'sonner';

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
  { id: 'MTN', name: 'MTN', logo: '📱' },
  { id: 'AIRTEL', name: 'Airtel', logo: '📱' },
  { id: 'MPESA', name: 'M-PESA', logo: '💳' },
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

  const calculateTokens = (amount: number) => {
    return Math.floor(amount / 500);
  };

  const handlePackageSelect = (index: number) => {
    setSelectedPackage(index);
    setCustomAmount('');
  };

  const handlePurchase = async () => {
    let amount = 0;
    
    if (selectedPackage !== null) {
      amount = TOKEN_PACKAGES[selectedPackage].amount;
    } else if (customAmount) {
      amount = parseInt(customAmount);
      if (isNaN(amount) || amount < 5000) {
        toast.error('Minimum purchase is UGX 5,000');
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

  const tokens = selectedPackage !== null 
    ? TOKEN_PACKAGES[selectedPackage].tokens
    : customAmount ? calculateTokens(parseInt(customAmount) || 0) : 0;

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
                A payment prompt has been sent to {phone}
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

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  refreshBalance();
                  onClose();
                  setShowPaymentInstructions(false);
                  setPaymentData(null);
                }} 
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            Buy Tokens
          </DialogTitle>
          <DialogDescription>
            {requiredTokens 
              ? `You need ${requiredTokens} tokens. Select a package or enter custom amount.`
              : '1 token = 1 barcode (UGX 500 per token)'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Packages */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Quick Packages</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TOKEN_PACKAGES.map((pkg, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPackage === index
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950'
                      : 'border-gray-200 hover:border-amber-300'
                  } ${pkg.popular ? 'ring-2 ring-amber-400' : ''}`}
                  onClick={() => handlePackageSelect(index)}
                >
                  <div className="p-4">
                    {pkg.popular && (
                      <div className="text-xs font-semibold text-amber-600 mb-1">🔥 POPULAR</div>
                    )}
                    <div className="text-2xl font-bold text-amber-600">{pkg.tokens}</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                    <div className="mt-2 text-sm font-semibold">
                      UGX {pkg.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{pkg.label}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="custom-amount" className="text-base font-semibold mb-2 block">
              Or Custom Amount
            </Label>
            <Input
              id="custom-amount"
              type="number"
              placeholder="Enter amount in UGX (min 5,000)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPackage(null);
              }}
              className="text-lg"
            />
            {customAmount && parseInt(customAmount) >= 5000 && (
              <p className="text-sm text-muted-foreground mt-1">
                = {calculateTokens(parseInt(customAmount))} tokens
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((provider) => (
                <Card
                  key={provider.id}
                  className={`cursor-pointer transition-all hover:shadow-md p-4 text-center ${
                    selectedProvider === provider.id
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <div className="text-3xl mb-1">{provider.logo}</div>
                  <div className="text-sm font-semibold">{provider.name}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+256700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Summary & Purchase Button */}
          {tokens > 0 && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">Tokens:</span>
                <span className="text-lg font-bold text-amber-600">{tokens}</span>
              </div>
              <Button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full bg-amber-600 hover:bg-amber-700"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay UGX {(selectedPackage !== null ? TOKEN_PACKAGES[selectedPackage].amount : parseInt(customAmount) || 0).toLocaleString()}
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
