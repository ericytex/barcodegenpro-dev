import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getApiConfig } from '@/lib/api';
import { toast } from 'sonner';

interface TokenBalance {
  balance: number;
  total_purchased: number;
  total_used: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface TokenContextType {
  balance: number | null;
  tokenAccount: TokenBalance | null;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  purchaseTokens: (amountUgx: number, provider: string, phone: string) => Promise<any>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenAccount, setTokenAccount] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token, isAuthenticated } = useAuth();

  const refreshBalance = async () => {
    if (!isAuthenticated || !token) {
      setBalance(null);
      setTokenAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/tokens/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': apiConfig.apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
        setTokenAccount(data);
      } else {
        console.error('Failed to fetch token balance');
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseTokens = async (amountUgx: number, provider: string, phone: string) => {
    if (!isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/tokens/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({
          amount_ugx: amountUgx,
          provider,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Purchase failed');
      }

      // Refresh balance after purchase
      await refreshBalance();

      return data;
    } catch (error: any) {
      console.error('Token purchase error:', error);
      throw error;
    }
  };

  // Load balance on mount and when auth state changes
  useEffect(() => {
    refreshBalance();
  }, [isAuthenticated, token]);

  return (
    <TokenContext.Provider
      value={{
        balance,
        tokenAccount,
        isLoading,
        refreshBalance,
        purchaseTokens,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
}
