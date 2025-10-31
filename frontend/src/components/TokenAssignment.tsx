import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTokens } from '@/contexts/TokenContext';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_active: boolean;
  token_balance?: number;
}

interface TokenAssignmentProps {
  isSuperAdmin: boolean;
}

export const TokenAssignment: React.FC<TokenAssignmentProps> = ({ isSuperAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { refreshBalance } = useTokens();

  // In production, VITE_API_BASE_URL is '/api' 
  // But when testing locally, it might be 'http://localhost:8034'
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('access_token');
      const usersUrl = API_BASE_URL.endsWith('/api') 
        ? `${API_BASE_URL}/admin/users`
        : `${API_BASE_URL}/api/admin/users`;
      const response = await fetch(usersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignTokens = async () => {
    if (!selectedUserId || !tokenAmount) {
      setMessage({ type: 'error', text: 'Please select a user and enter token amount' });
      return;
    }

    const tokens = parseInt(tokenAmount);
    if (isNaN(tokens) || tokens <= 0) {
      setMessage({ type: 'error', text: 'Token amount must be a positive number' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('access_token');
      const grantUrl = API_BASE_URL.endsWith('/api') 
        ? `${API_BASE_URL}/tokens/admin/grant?user_id=${selectedUserId}&tokens=${tokens}&reason=${encodeURIComponent(reason || 'Super admin grant')}`
        : `${API_BASE_URL}/api/tokens/admin/grant?user_id=${selectedUserId}&tokens=${tokens}&reason=${encodeURIComponent(reason || 'Super admin grant')}`;
      const response = await fetch(grantUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to assign tokens');
      }

      const data = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: `Successfully assigned ${tokens} tokens to ${users.find(u => u.id.toString() === selectedUserId)?.username}` 
      });
      
      // Reset form
      setTokenAmount('');
      setReason('');
      
      // Refresh token balance in header immediately
      await refreshBalance();
      
      // Reload users to update balances in the dropdown
      await loadUsers();
      
    } catch (error: any) {
      console.error('Error assigning tokens:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to assign tokens' 
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id.toString() === selectedUserId);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {/* User Selection */}
        <div className="space-y-2">
          <Label htmlFor="user-select" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Select User
          </Label>
          {loadingUsers ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    <div className="flex items-center justify-between gap-4">
                      <span>
                        {user.username} ({user.email})
                      </span>
                      {user.is_super_admin && (
                        <span className="text-xs text-purple-600">Super Admin</span>
                      )}
                      {user.is_admin && !user.is_super_admin && (
                        <span className="text-xs text-blue-600">Admin</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedUser && (
            <div className="text-sm text-gray-600 mt-1">
              Current balance: {selectedUser.token_balance || 0} tokens
            </div>
          )}
        </div>

        {/* Token Amount */}
        <div className="space-y-2">
          <Label htmlFor="token-amount" className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Token Amount
          </Label>
          <Input
            id="token-amount"
            type="number"
            min="1"
            placeholder="Enter number of tokens"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Reason (optional) */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (Optional)</Label>
          <Input
            id="reason"
            type="text"
            placeholder="e.g., Promotion, Bonus, Compensation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={handleAssignTokens}
          disabled={loading || !selectedUserId || !tokenAmount}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning Tokens...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              Assign Tokens
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Token Assignment Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>You can assign tokens to any user, including yourself</li>
              <li>Token assignments are logged for audit purposes</li>
              <li>Use the reason field to document why tokens were granted</li>
              <li>Users will see the updated balance immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

