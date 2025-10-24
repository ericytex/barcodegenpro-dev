/**
 * Environment detection and management utilities
 */

import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';

export interface EnvironmentInfo {
  environment: 'development' | 'production';
  baseUrl: string;
  apiKey: string;
  isProduction: boolean;
  isDevelopment: boolean;
  hostname: string;
  mode: string;
}

/**
 * Hook for managing environment configuration
 */
export function useEnvironment() {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>(() => {
    const config = apiService.getEnvironmentConfig();
    return {
      environment: config.environment as 'development' | 'production',
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      isProduction: config.isProduction,
      isDevelopment: config.isDevelopment,
      hostname: window.location.hostname,
      mode: import.meta.env.MODE,
    };
  });

  const switchEnvironment = (newEnvironment: 'development' | 'production') => {
    if (newEnvironment === 'development') {
      apiService.switchToDevelopment();
    } else {
      apiService.switchToProduction();
    }
    
    const config = apiService.getEnvironmentConfig();
    setEnvironmentInfo({
      environment: config.environment as 'development' | 'production',
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      isProduction: config.isProduction,
      isDevelopment: config.isDevelopment,
      hostname: window.location.hostname,
      mode: import.meta.env.MODE,
    });
  };

  const detectEnvironment = (): 'development' | 'production' => {
    // Check environment variables first
    const envVar = import.meta.env.VITE_ENVIRONMENT;
    if (envVar === 'development' || envVar === 'production') {
      return envVar;
    }

    // Check Vite mode
    if (import.meta.env.MODE === 'development') {
      return 'development';
    }
    if (import.meta.env.MODE === 'production') {
      return 'production';
    }

    // Check hostname patterns
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
      return 'development';
    }
    
    if (hostname.includes('vercel.app') || hostname.includes('barcode-gene-frontend')) {
      return 'production';
    }

    // Default to development for local development
    return 'development';
  };

  const autoDetectAndSwitch = () => {
    const detectedEnv = detectEnvironment();
    if (detectedEnv !== environmentInfo.environment) {
      switchEnvironment(detectedEnv);
    }
  };

  useEffect(() => {
    // Auto-detect environment on mount
    autoDetectAndSwitch();
  }, []);

  return {
    environmentInfo,
    switchEnvironment,
    detectEnvironment,
    autoDetectAndSwitch,
  };
}

/**
 * Utility function to get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
  
  return {
    isDevelopment: isDev,
    isProduction: isProd,
    mode: import.meta.env.MODE,
    environment: import.meta.env.VITE_ENVIRONMENT || (isDev ? 'development' : 'production'),
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:8034' : 'https://194.163.134.129:8034/'),
    apiKey: import.meta.env.VITE_API_KEY || (isDev ? 'dev-api-key-12345' : 'frontend-api-key-12345'),
    debug: import.meta.env.VITE_DEBUG === 'true' || isDev,
    logRequests: import.meta.env.VITE_LOG_REQUESTS === 'true' || isDev,
  };
}

/**
 * Utility function to check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || 
         import.meta.env.MODE === 'development' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * Utility function to check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD || 
         import.meta.env.MODE === 'production' ||
         window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('barcode-gene-frontend');
}
