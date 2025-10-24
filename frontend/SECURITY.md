# Frontend Security Implementation

## 🔒 Security Features Implemented

### 1. **API Key Authentication**
- All API requests include `X-API-Key` header
- API key stored in environment variables
- Automatic authentication for all endpoints

### 2. **Environment Configuration**
- Secure API key management via `.env.local`
- Separate keys for development and production
- No hardcoded credentials in source code

### 3. **Error Handling**
- Specific error messages for authentication failures
- Rate limit error handling
- User-friendly security error messages

### 4. **Security Status Monitoring**
- Real-time API connection status
- API key validation status
- Rate limit monitoring

## 🚀 Setup Instructions

### 1. **Environment Configuration**
Create `.env.local` file in the frontend directory:
```bash
# Copy from env.example
cp env.example .env.local

# Edit with your actual API keys
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_KEY=frontend-api-key-12345
VITE_DEBUG=true
VITE_LOG_REQUESTS=true
```

### 2. **Backend API Key Setup**
Ensure your backend has the corresponding API key:
```bash
# In your backend environment
API_KEYS=your-super-secret-api-key-here,frontend-api-key-12345
```

### 3. **Development vs Production**
```bash
# Development (.env.local)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_KEY=frontend-api-key-12345

# Production (.env.production)
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_API_KEY=your-production-frontend-api-key
```

## 🔧 API Integration

### **Automatic Authentication**
All API calls automatically include the API key:
```typescript
// Automatically adds X-API-Key header
const response = await apiService.generateBarcodes(request);
```

### **Error Handling**
```typescript
try {
  await apiService.generateBarcodes(data);
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    // Handle API key issues
  } else if (error.message.includes('Rate limit exceeded')) {
    // Handle rate limiting
  }
}
```

### **Security Status Component**
```tsx
import { SecurityStatusCard } from '@/components/SecurityStatusCard';

// Shows real-time security status
<SecurityStatusCard />
```

## 🛡️ Security Features

### **1. API Key Management**
- Environment-based configuration
- No exposure in client-side code
- Automatic header injection

### **2. Request Security**
- All requests authenticated
- Proper error handling
- Rate limit awareness

### **3. File Upload Security**
- File type validation
- Size limits enforced
- Secure file handling

### **4. Error Security**
- No sensitive data in error messages
- User-friendly error handling
- Security event logging

## 🔍 Security Monitoring

### **Real-time Status**
- API connection status
- Authentication status
- Rate limit status
- Error tracking

### **Console Logging** (Development)
```bash
# Enable request logging
VITE_LOG_REQUESTS=true

# Console output:
# API Request: POST http://localhost:8000/api/barcodes/generate
# API Request: GET http://localhost:8000/api/barcodes/list
```

## ⚠️ Security Checklist

### **Before Production:**
- [ ] Update API keys in environment files
- [ ] Configure production API base URL
- [ ] Disable debug logging
- [ ] Test authentication flow
- [ ] Verify error handling
- [ ] Check rate limit behavior

### **Security Best Practices:**
- [ ] Never commit `.env.local` to version control
- [ ] Use different API keys for different environments
- [ ] Regularly rotate API keys
- [ ] Monitor security status
- [ ] Keep dependencies updated

## 🚨 Troubleshooting

### **Authentication Errors**
```bash
# Check API key configuration
echo $VITE_API_KEY

# Verify backend API keys
curl -H "X-API-Key: your-key" http://localhost:8000/api/health
```

### **Connection Issues**
```bash
# Test API connectivity
curl http://localhost:8000/api/health

# Check CORS configuration
# Ensure frontend URL is in CORS_ORIGINS
```

### **Rate Limiting**
- Wait for rate limit window to reset
- Implement exponential backoff
- Monitor rate limit headers

## 📋 Security Testing

### **Test Authentication**
```bash
# Should work with valid API key
curl -H "X-API-Key: frontend-api-key-12345" \
  http://localhost:8000/api/health

# Should fail without API key
curl http://localhost:8000/api/health
```

### **Test Rate Limiting**
```bash
# Make multiple requests quickly
for i in {1..101}; do
  curl -H "X-API-Key: frontend-api-key-12345" \
    http://localhost:8000/api/health
done
```

### **Test File Upload Security**
```bash
# Test with valid Excel file
curl -X POST \
  -H "X-API-Key: frontend-api-key-12345" \
  -F "file=@test.xlsx" \
  http://localhost:8000/api/barcodes/upload-excel

# Test with invalid file type
curl -X POST \
  -H "X-API-Key: frontend-api-key-12345" \
  -F "file=@test.txt" \
  http://localhost:8000/api/barcodes/upload-excel
```

## 🔄 Migration from Insecure Version

### **Changes Made:**
1. Added API key authentication to all requests
2. Updated error handling for security responses
3. Added security status monitoring
4. Implemented environment-based configuration
5. Enhanced file upload security

### **Breaking Changes:**
- All API calls now require authentication
- Direct URL access to files requires API key
- Error messages changed for security reasons

### **Migration Steps:**
1. Update environment variables
2. Test API connectivity
3. Verify authentication flow
4. Check error handling
5. Monitor security status
