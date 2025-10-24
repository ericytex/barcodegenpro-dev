import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiConfig } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setRefreshTokenValue(storedRefreshToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          verifyToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  useEffect(() => {
  }, [user]);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'X-API-Key': apiConfig.apiKey,
        },
      });

      if (!response.ok) {
        // Token invalid, try to refresh
        if (refreshTokenValue) {
          await refreshToken();
        } else {
          clearAuthState();
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  };

  const saveAuthState = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setRefreshTokenValue(refreshToken);
    setUser(userData);
  };

  const clearAuthState = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({
          email,
          username,
          password,
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const registerData = await response.json();
      
      toast.success('Registration successful!', {
        description: `You've received ${registerData.welcome_tokens || 10} free tokens! Now logging you in...`,
      });
      
      // Auto-login after registration
      await login(username, password);
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({
          email_or_username: emailOrUsername,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      saveAuthState(data.access_token, data.refresh_token, data.user);
      
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        const apiConfig = getApiConfig();
        await fetch(`${apiConfig.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': apiConfig.apiKey,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuthState();
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  const refreshToken = async () => {
    try {
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.apiKey,
        },
        body: JSON.stringify({
          refresh_token: refreshTokenValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);

      // Re-fetch user data with the new token
      const userResponse = await fetch(`${apiConfig.baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'X-API-Key': apiConfig.apiKey,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        throw new Error('Failed to re-fetch user data after token refresh');
      }

    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthState();
      navigate('/login');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
