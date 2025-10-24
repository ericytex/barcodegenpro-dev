/**
 * Safe logging utility that respects environment settings
 * Removes sensitive data in production builds
 */

interface LogConfig {
  enableLogs: boolean;
  enableDebugLogs: boolean;
  enableSensitiveLogs: boolean;
}

// Get logging configuration based on environment
function getLogConfig(): LogConfig {
  const isProduction = import.meta.env.PROD;
  const isDevelopment = import.meta.env.DEV;
  const debugEnabled = import.meta.env.VITE_DEBUG === 'true';
  
  return {
    enableLogs: isDevelopment || debugEnabled,
    enableDebugLogs: isDevelopment && debugEnabled,
    enableSensitiveLogs: isDevelopment && debugEnabled,
  };
}

// Sanitize sensitive data
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    // Remove API keys, tokens, and sensitive URLs
    return data
      .replace(/api[_-]?key[_-]?[a-zA-Z0-9_-]+/gi, '[API_KEY_REDACTED]')
      .replace(/token[_-]?[a-zA-Z0-9_-]+/gi, '[TOKEN_REDACTED]')
      .replace(/password[_-]?[a-zA-Z0-9_-]+/gi, '[PASSWORD_REDACTED]')
      .replace(/secret[_-]?[a-zA-Z0-9_-]+/gi, '[SECRET_REDACTED]');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('key') || lowerKey.includes('token') || 
          lowerKey.includes('password') || lowerKey.includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// Safe console.log that respects environment
export function safeLog(message: string, data?: any): void {
  const config = getLogConfig();
  if (!config.enableLogs) return;
  
  if (data !== undefined) {
    const sanitizedData = config.enableSensitiveLogs ? data : sanitizeData(data);
    //console.log(message, sanitizedData);
  } else {
    console.log(message);
  }
}

// Safe console.error that respects environment
export function safeError(message: string, error?: any): void {
  const config = getLogConfig();
  if (!config.enableLogs) return;
  
  if (error !== undefined) {
    const sanitizedError = config.enableSensitiveLogs ? error : sanitizeData(error);
    //console.error(message, sanitizedError);
  } else {
    console.error(message);
  }
}

// Safe console.warn that respects environment
export function safeWarn(message: string, data?: any): void {
  const config = getLogConfig();
  if (!config.enableLogs) return;
  
  if (data !== undefined) {
    const sanitizedData = config.enableSensitiveLogs ? data : sanitizeData(data);
    //console.warn(message, sanitizedData);
  } else {
    console.warn(message);
  }
}

// Debug logging (only in development with debug enabled)
export function debugLog(message: string, data?: any): void {
  const config = getLogConfig();
  if (!config.enableDebugLogs) return;
  
  if (data !== undefined) {
    //console.log(`🐛 DEBUG: ${message}`, data);
  } else {
    console.log(`🐛 DEBUG: ${message}`);
  }
}
