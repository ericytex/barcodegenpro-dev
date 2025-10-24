import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, ShoppingCart, TrendingUp, History } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';
import { Skeleton } from '@/components/ui/skeleton';

interface TokenBalanceProps {
  onBuyTokens?: () => void;
  onViewHistory?: () => void;
  compact?: boolean;
}

export function TokenBalance({ onBuyTokens, onViewHistory, compact = false }: TokenBalanceProps) {
  const { balance, tokenAccount, isLoading, refreshBalance } = useTokens();

  if (isLoading) {
    return (
      <Card className={compact ? '' : 'w-full'}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Balance</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {balance !== null ? balance.toLocaleString() : '0'}
                </p>
              </div>
            </div>
            <Button onClick={onBuyTokens} size="sm" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Buy Tokens
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Coins className="h-5 w-5" />
          Token Balance
        </CardTitle>
        <CardDescription>1 token = 1 barcode (UGX 500 per token)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-600 dark:to-orange-700 shadow-lg">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">
                {balance !== null ? balance.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-amber-50">tokens</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">available for barcode generation</p>
        </div>

        {/* Statistics */}
        {tokenAccount && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Total Purchased
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {tokenAccount.total_purchased.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <History className="h-4 w-4" />
                Total Used
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {tokenAccount.total_used.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={onBuyTokens} 
            className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
            size="lg"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy More Tokens
          </Button>
          {onViewHistory && (
            <Button 
              onClick={onViewHistory} 
              variant="outline"
              size="lg"
              className="border-amber-300 dark:border-amber-700"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Low Balance Warning */}
        {balance !== null && balance < 10 && (
          <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Low balance! You have {balance} token{balance !== 1 ? 's' : ''} remaining.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
