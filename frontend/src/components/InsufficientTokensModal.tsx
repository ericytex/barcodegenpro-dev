import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Coins, ShoppingCart } from 'lucide-react';

interface InsufficientTokensModalProps {
  open: boolean;
  onClose: () => void;
  required: number;
  available: number;
  missing: number;
  costUgx: number;
  onBuyTokens: () => void;
}

export function InsufficientTokensModal({
  open,
  onClose,
  required,
  available,
  missing,
  costUgx,
  onBuyTokens,
}: InsufficientTokensModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Insufficient Tokens
          </DialogTitle>
          <DialogDescription>
            You don't have enough tokens to complete this generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              You're trying to generate <strong>{required} barcodes</strong>
            </AlertDescription>
          </Alert>

          {/* Token Requirements */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You need:</span>
              <span className="text-lg font-bold flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-600" />
                {required} tokens
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You have:</span>
              <span className="text-lg font-bold flex items-center gap-1">
                <Coins className="h-4 w-4 text-green-600" />
                {available} tokens
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Missing:</span>
                <span className="text-xl font-bold text-red-600 flex items-center gap-1">
                  <Coins className="h-5 w-5" />
                  {missing} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Cost to Continue */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Cost to continue:
              </span>
              <span className="text-2xl font-bold text-amber-600">
                UGX {costUgx.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              for {missing} token{missing !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                onClose();
                onBuyTokens();
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Buy Tokens
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground">
            💡 1 token = 1 barcode generation (UGX 500 per token)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
