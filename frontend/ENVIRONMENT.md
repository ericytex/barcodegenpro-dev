# Frontend Environment Configuration

This frontend application supports both development and production environments with automatic URL switching capabilities.

## Environment Modes

### Development Mode
- **API URL**: `http://localhost:8034`
- **API Key**: `dev-api-key-12345`
- **Features**: Debug logging, dev tools, source maps
- **Build**: Unminified with source maps

### Production Mode
- **API URL**: `https://194.163.134.129:8034/`
- **API Key**: `frontend-api-key-12345`
- **Features**: Optimized build, no debug logs
- **Build**: Minified and optimized

## Configuration

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Copy from env.example
cp env.example .env.local
```

Key environment variables:
- `VITE_API_BASE_URL`: API server URL
- `VITE_API_KEY`: API authentication key
- `VITE_ENVIRONMENT`: Environment mode (development/production)
- `VITE_DEBUG`: Enable debug logging
- `VITE_LOG_REQUESTS`: Log API requests

### Automatic Environment Detection

The application automatically detects the environment based on:

1. **Environment Variables**: `VITE_ENVIRONMENT` setting
2. **Vite Mode**: `--mode` flag during build/dev
3. **Hostname**: `localhost` = development, `vercel.app` = production
4. **Build Flags**: `import.meta.env.DEV` / `import.meta.env.PROD`

## Usage

### Development Commands

```bash
# Start development server (auto-detects development)
npm run dev

# Start with explicit development mode
npm run dev --mode development

# Start with production mode locally
npm run dev:prod
```

### Build Commands

```bash
# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Build and preview
npm run build:preview
```

### Environment Switching in UI

1. Go to **Settings** page
2. In **API Configuration** section
3. Use the **Environment** dropdown to switch between:
   - Development (localhost:3000)
   - Production (194.163.134.129:8034)
4. Click **Test Connection** to verify the switch

## API Service Configuration

The `ApiService` class provides methods for environment management:

```typescript
import { apiService } from '@/lib/api';

// Get current configuration
const config = apiService.getEnvironmentConfig();

// Switch environments
apiService.switchToDevelopment();
apiService.switchToProduction();

// Update configuration
apiService.updateConfig({
  baseUrl: 'http://localhost:3000',
  apiKey: 'custom-key',
  environment: 'development'
});
```

## Environment Hooks

Use the `useEnvironment` hook for React components:

```typescript
import { useEnvironment } from '@/hooks/useEnvironment';

function MyComponent() {
  const { environmentInfo, switchEnvironment } = useEnvironment();
  
  return (
    <div>
      <p>Current environment: {environmentInfo.environment}</p>
      <button onClick={() => switchEnvironment('development')}>
        Switch to Development
      </button>
    </div>
  );
}
```

## Deployment

### Vercel Deployment

Set these environment variables in Vercel Dashboard:

**Production Environment:**
- `VITE_API_BASE_URL` = `https://194.163.134.129:8034/`
- `VITE_API_KEY` = `frontend-api-key-12345`
- `VITE_ENVIRONMENT` = `production`
- `VITE_DEBUG` = `false`
- `VITE_LOG_REQUESTS` = `false`

**Preview Environment:**
- `VITE_API_BASE_URL` = `http://localhost:3000`
- `VITE_API_KEY` = `dev-api-key-12345`
- `VITE_ENVIRONMENT` = `development`
- `VITE_DEBUG` = `true`
- `VITE_LOG_REQUESTS` = `true`

### Local Development Setup

1. **Start API Server** (development):
   ```bash
   cd api
   python app.py
   # Runs on http://localhost:3000
   ```

2. **Start Frontend** (development):
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:8080
   ```

3. **Access Application**:
   - Frontend: http://localhost:8080
   - API: http://localhost:3000

## Troubleshooting

### Connection Issues

1. **Check Environment**: Verify the correct environment is selected in Settings
2. **Test Connection**: Use the "Test Connection" button in Settings
3. **Check API Server**: Ensure the API server is running on the expected URL
4. **Check CORS**: Verify CORS settings allow the frontend origin

### Environment Detection Issues

1. **Check Environment Variables**: Verify `.env.local` file exists and is correct
2. **Check Build Mode**: Ensure correct `--mode` flag is used
3. **Check Hostname**: Verify hostname detection logic matches your setup

### Build Issues

1. **Clear Cache**: Delete `node_modules` and `dist` folders
2. **Reinstall Dependencies**: Run `npm install`
3. **Check Environment Variables**: Ensure all required variables are set

## File Structure

```
frontend/
├── src/
│   ├── hooks/
│   │   └── useEnvironment.ts      # Environment management hook
│   ├── lib/
│   │   └── api.ts                  # API service with environment switching
│   ├── pages/
│   │   └── SettingsPage.tsx        # Settings with environment controls
│   └── components/
│       ├── SecurityStatusCard.tsx  # Environment-aware status
│       └── ApiConnectionTest.tsx  # Environment-aware connection test
├── env.example                     # Environment template
├── vite.config.ts                  # Environment-aware Vite config
└── package.json                    # Environment-aware scripts
```
