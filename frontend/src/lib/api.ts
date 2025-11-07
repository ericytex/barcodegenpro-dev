/**
 * API service for connecting to the Barcode Generator API
 */

import { safeLog, safeError, debugLog } from '@/utils/logger';

// Function to get API configuration with robust fallbacks
export function getApiConfig() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const envApiKey = import.meta.env.VITE_API_KEY;
  const environment = import.meta.env.VITE_ENVIRONMENT;
  
  // Debug all environment variables
  debugLog('Environment Variables', {
    VITE_API_BASE_URL: envBaseUrl,
    VITE_API_KEY: envApiKey,
    VITE_ENVIRONMENT: environment,
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    allEnv: import.meta.env
  });
  
  // Determine the correct base URL with multiple fallback strategies
  let baseUrl: string;
  
  // Strategy 1: Use environment variable if it exists
  if (envBaseUrl) {
    // Handle both absolute URLs (http://) and relative paths (/api)
    if (envBaseUrl.startsWith('http')) {
      baseUrl = envBaseUrl;
      safeLog('Using absolute URL from environment', baseUrl);
    } else {
      // Relative path (like /api) - use as-is for same-origin requests
      baseUrl = envBaseUrl;
      safeLog('Using relative path from environment', baseUrl);
    }
  } else {
    // Strategy 2: Detect environment and use appropriate fallback
    const isProduction = import.meta.env.PROD || 
                       environment === 'production' ||
                       window.location.hostname.includes('vercel.app') ||
                       window.location.hostname.includes('barcode-gene-frontend');
    
    if (isProduction) {
      baseUrl = 'https://194.163.134.129:8034';
      safeLog('Production fallback (detected via environment)', baseUrl);
    } else {
      baseUrl = 'http://localhost:8034';
      safeLog('Development fallback', baseUrl);
    }
  }
  
  // Determine API key based on environment
  let apiKey: string;
  if (envApiKey) {
    apiKey = envApiKey;
  } else {
    const isProduction = import.meta.env.PROD || 
                       environment === 'production' ||
                       window.location.hostname.includes('vercel.app') ||
                       window.location.hostname.includes('barcode-gene-frontend');
    
    if (isProduction) {
      apiKey = 'frontend-api-key-12345';
    } else {
      apiKey = 'dev-api-key-12345';
    }
  }
  
  debugLog('Final API Configuration', {
    baseUrl,
    apiKey,
    environment,
    source: envBaseUrl && envBaseUrl.startsWith('http') ? 'environment' : 'fallback',
    hostname: window.location.hostname
  });
  
  return { baseUrl, apiKey, environment };
}

/**
 * Helper function to build API URLs correctly
 * Prevents double /api/api prefix when baseUrl is already /api
 */
export function buildApiUrl(endpoint: string, baseUrl?: string): string {
  const config = baseUrl ? { baseUrl } : getApiConfig();
  const url = config.baseUrl || baseUrl || '';
  
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If baseUrl ends with /api, don't add /api again
  if (url.endsWith('/api')) {
    return `${url}${cleanEndpoint}`;
  }
  
  // If baseUrl is relative path (starts with /), add /api prefix
  if (url.startsWith('/')) {
    return `${url}/api${cleanEndpoint}`;
  }
  
  // If baseUrl is absolute URL (http://), add /api prefix
  return `${url}/api${cleanEndpoint}`;
}

const { baseUrl: API_BASE_URL, apiKey: API_KEY, environment: API_ENVIRONMENT } = getApiConfig();

export interface BarcodeItem {
  imei: string;
  box_id?: string;
  model: string;
  product?: string;
  color?: string;
  dn?: string;
}

export interface BarcodeGenerationRequest {
  items: BarcodeItem[];
  create_pdf?: boolean;
  pdf_grid_cols?: number;
  pdf_grid_rows?: number;
  auto_generate_second_imei?: boolean;
  device_type?: string;
  device_id?: number;
}

export interface BarcodeGenerationResponse {
  success: boolean;
  message: string;
  generated_files: string[];
  pdf_file?: string;
  total_items: number;
  timestamp: string;
}

export interface FileInfo {
  filename: string;
  size: number;
  created: string;
  modified: string;
  mime_type: string;
}

export interface DatabaseFileInfo {
  id: number;
  filename: string;
  file_path: string;
  archive_path: string;
  file_type: 'png' | 'pdf';
  file_size: number;
  created_at: string;
  archived_at: string;
  generation_session: string;
  imei?: string;
  box_id?: string;
  model?: string;
  product?: string;
  color?: string;
  dn?: string;
  created_timestamp: string;
}

export interface DatabaseFilesResponse {
  success: boolean;
  files: DatabaseFileInfo[];
  total_count: number;
}

export interface ArchiveSession {
  id: number;
  session_id: string;
  created_at: string;
  total_files: number;
  png_count: number;
  pdf_count: number;
  total_size: number;
  excel_filename?: string;
  notes?: string;
  created_timestamp: string;
}

export interface ArchiveSessionsResponse {
  success: boolean;
  sessions: ArchiveSession[];
}

export interface ArchiveStatistics {
  total_files: number;
  png_count: number;
  pdf_count: number;
  total_size: number;
  total_sessions: number;
}

export interface ArchiveStatsResponse {
  success: boolean;
  statistics: ArchiveStatistics;
}

export interface DeviceType {
  type: string;
  display_name: string;
  description: string;
  icon: string;
  template_id?: string; // Optional template ID for template-based devices
}

// Phone Management Interfaces
export interface PhoneBrand {
  id: number;
  name: string;
  icon: string;
  description?: string;
  country_origin?: string;
  market_share_uganda?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PhoneModel {
  id: number;
  brand_id: number;
  model_name: string;
  model_code: string;
  device_type: string;
  price_range: string;
  screen_size?: string;
  battery_capacity?: string;
  storage_options?: string;
  color_options?: string;
  release_year?: number;
  is_popular_uganda: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PhoneBrandCreateRequest {
  name: string;
  icon?: string;
  description?: string;
  country_origin?: string;
  market_share_uganda?: number;
}

export interface PhoneBrandUpdateRequest {
  name?: string;
  icon?: string;
  description?: string;
  country_origin?: string;
  market_share_uganda?: number;
  is_active?: boolean;
}

export interface PhoneModelCreateRequest {
  brand_id: number;
  model_name: string;
  model_code: string;
  device_type?: string;
  price_range?: string;
  screen_size?: string;
  battery_capacity?: string;
  storage_options?: string;
  color_options?: string;
  release_year?: number;
  is_popular_uganda?: boolean;
}

export interface PhoneBrandResponse {
  success: boolean;
  brand: PhoneBrand;
  timestamp: string;
}

export interface PhoneBrandListResponse {
  success: boolean;
  brands: PhoneBrand[];
  total_count: number;
  timestamp: string;
}

export interface PhoneModelResponse {
  success: boolean;
  model: PhoneModel;
  brand?: PhoneBrand;
  timestamp: string;
}

export interface PhoneModelListResponse {
  success: boolean;
  models: PhoneModel[];
  brand?: PhoneBrand;
  total_count: number;
  timestamp: string;
}

export interface ScalableDeviceSelectorResponse {
  success: boolean;
  brands: PhoneBrand[];
  popular_models: PhoneModel[];
  timestamp: string;
}

export interface Device {
  id?: number;
  name: string;
  brand: string;
  model_code: string;
  device_type: string;
  default_dn: string;
  description?: string;
  specifications?: any;
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
}

export interface DeviceCreateRequest {
  name: string;
  brand: string;
  model_code: string;
  device_type: string;
  default_dn?: string;
  description?: string;
  specifications?: any;
}

export interface DeviceUpdateRequest {
  name?: string;
  brand?: string;
  model_code?: string;
  device_type?: string;
  default_dn?: string;
  description?: string;
  specifications?: any;
  is_active?: boolean;
}

export interface DeviceResponse {
  success: boolean;
  message: string;
  device?: Device;
  timestamp: string;
}

export interface DeviceListResponse {
  success: boolean;
  devices: Device[];
  total_count: number;
  timestamp: string;
}

export interface DeviceTypeListResponse {
  success: boolean;
  device_types: DeviceType[];
  timestamp: string;
}

export interface FileListResponse {
  success: boolean;
  files: FileInfo[];
  total_count: number;
  timestamp: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  status: 'Suggestion' | 'Planned' | 'In Progress' | 'Completed';
  submitted_by: string;
  created_at: string;
}

export interface AddFeatureRequest {
  title: string;
  description: string;
}


class ApiService {
  private baseUrl: string;
  private apiKey: string;
  private environment: string;

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = API_KEY, environment: string = API_ENVIRONMENT) {
    debugLog('ApiService Constructor', {
      passedBaseUrl: baseUrl,
      API_BASE_URL: API_BASE_URL,
      passedApiKey: apiKey,
      API_KEY: API_KEY,
      passedEnvironment: environment,
      API_ENVIRONMENT: API_ENVIRONMENT
    });
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.environment = environment;
    safeLog('ApiService initialized', { baseUrl: this.baseUrl, environment: this.environment });
  }

  /**
   * Get current environment configuration
   */
  getEnvironmentConfig() {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      environment: this.environment,
      isProduction: this.environment === 'production' || import.meta.env.PROD,
      isDevelopment: this.environment === 'development' || import.meta.env.DEV
    };
  }

  /**
   * Switch to development environment
   */
  switchToDevelopment() {
    this.baseUrl = 'http://localhost:8034';
    this.apiKey = 'dev-api-key-12345';
    this.environment = 'development';
    safeLog('Switched to development environment', this.getEnvironmentConfig());
  }

  /**
   * Switch to production environment
   */
  switchToProduction() {
    this.baseUrl = 'https://194.163.134.129:8034/';
    this.apiKey = 'frontend-api-key-12345';
    this.environment = 'production';
    safeLog('Switched to production environment', this.getEnvironmentConfig());
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: { baseUrl?: string; apiKey?: string; environment?: string }) {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.environment) this.environment = config.environment;
    safeLog('Updated API configuration', this.getEnvironmentConfig());
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure no double slashes in URL construction
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // If baseUrl already ends with /api and endpoint starts with /api, remove /api from endpoint
    if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
    }
    
    const url = `${baseUrl}${cleanEndpoint}`;
    
    // Debug URL construction
    debugLog('URL Construction', {
      originalBaseUrl: this.baseUrl,
      endpoint: endpoint,
      cleanedBaseUrl: baseUrl,
      finalUrl: url
    });
    
    // Get JWT token from localStorage if available
    const jwtToken = localStorage.getItem('access_token');
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...(jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {}),
        ...options.headers,
      },
    };

    // Log requests in development
    if (import.meta.env.VITE_LOG_REQUESTS === 'true') {
      safeLog(`API Request: ${options.method || 'GET'}`, url);
    }

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors - trigger session expiration
      if (response.status === 401 || response.status === 403) {
        // Check if this is a JWT token issue
        const jwtToken = localStorage.getItem('access_token');
        if (jwtToken) {
          // This is likely a session expiration, trigger logout
          console.log('Authentication error detected - session may have expired');
          // Import and use the auth context to handle session expiration
          import('@/contexts/AuthContext').then(({ useAuth }) => {
            // This will be handled by the component using the API service
            // We'll throw a specific error that components can catch
          });
          throw new Error('SESSION_EXPIRED');
        } else {
          throw new Error('Authentication failed. Please check your API key.');
        }
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error(errorData.detail || 'Invalid request. Please check your data.');
      }
      
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    try {
      const jsonResponse = await response.json();
      debugLog('Parsed JSON response', jsonResponse);
      return jsonResponse;
    } catch (error) {
      safeError('Failed to parse JSON response', error);
      safeError('Response text', await response.text());
      throw new Error('Failed to parse server response');
    }
  }

  /**
   * Generate barcodes from JSON data
   */
  async generateBarcodes(request: BarcodeGenerationRequest): Promise<BarcodeGenerationResponse> {
    return this.request<BarcodeGenerationResponse>('/api/barcodes/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate barcodes with enhanced device-specific logic
   */
  async generateEnhancedBarcodes(request: BarcodeGenerationRequest): Promise<BarcodeGenerationResponse> {
    return this.request<BarcodeGenerationResponse>('/api/barcodes/generate-enhanced', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Upload Excel file and generate barcodes
   */
  async uploadExcelAndGenerate(
    file: File,
    createPdf: boolean = true,
    pdfGridCols: number = 5,
    pdfGridRows: number = 12,
    autoGenerateSecondImei: boolean = true,
    deviceType?: string,
    deviceId?: number,
    templateId?: string
  ): Promise<BarcodeGenerationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('create_pdf', createPdf.toString());
    formData.append('pdf_grid_cols', pdfGridCols.toString());
    formData.append('pdf_grid_rows', pdfGridRows.toString());
    formData.append('auto_generate_second_imei', autoGenerateSecondImei.toString());
    
    // Add device information if provided
    if (deviceType) {
      formData.append('device_type', deviceType);
    }
    if (deviceId) {
      formData.append('device_id', deviceId.toString());
    }
    
    // Add template information if provided
    console.log('🔍 API DEBUG: templateId received in uploadExcelAndGenerate:', templateId);
    if (templateId) {
      formData.append('template_id', templateId);
      console.log('✅ API DEBUG: Added template_id to FormData:', templateId);
    } else {
      console.warn('⚠️ API DEBUG: templateId is falsy, NOT adding to FormData. Value:', templateId);
    }

    safeLog('Uploading Excel file', file.name);
    debugLog('FormData contents', {
      createPdf,
      pdfGridCols,
      pdfGridRows,
      autoGenerateSecondImei,
      templateId: templateId || 'NOT PROVIDED'
    });
    
    // Log all FormData entries for debugging
    console.log('🔍 API DEBUG: FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    // Get JWT token from localStorage if available
    const jwtToken = localStorage.getItem('access_token');
    
    const response = await this.request<BarcodeGenerationResponse>('/api/barcodes/upload-excel', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        ...(jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {}),
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData,
    });

    debugLog('Upload response', response);
    debugLog('Response type', typeof response);
    debugLog('Response keys', response ? Object.keys(response) : 'undefined');
    return response;
  }

  /**
   * List all generated files (legacy file system)
   */
  async listFiles(): Promise<FileListResponse> {
    return this.request<FileListResponse>('/api/barcodes/list');
  }

  /**
   * Get all files from database with metadata
   */
  async getDatabaseFiles(): Promise<DatabaseFilesResponse> {
    return this.request<DatabaseFilesResponse>('/api/database/files');
  }

  /**
   * Get files from a specific archive session
   */
  async getSessionFiles(sessionId: string): Promise<DatabaseFilesResponse> {
    return this.request<DatabaseFilesResponse>(`/api/archive/session/${sessionId}/files`);
  }

  /**
   * Generic HTTP methods
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Get recent archive sessions
   */
  async getArchiveSessions(limit: number = 10): Promise<ArchiveSessionsResponse> {
    return this.request<ArchiveSessionsResponse>(`/api/archive/sessions?limit=${limit}`);
  }

  /**
   * Get archive statistics
   */
  async getArchiveStatistics(): Promise<ArchiveStatsResponse> {
    return this.request<ArchiveStatsResponse>('/api/archive/statistics');
  }

  /**
   * Get specific file by filename
   */
  async getFileByName(filename: string): Promise<{ success: boolean; file: DatabaseFileInfo }> {
    return this.request<{ success: boolean; file: DatabaseFileInfo }>(`/api/database/file/${filename}`);
  }

  /**
   * Download a PNG file
   */
  async downloadBarcodeFile(filename: string): Promise<Blob> {
    // Use the same URL cleaning logic as the request method
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    // If baseUrl already ends with /api, don't add it again
    const url = baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download/${filename}`
      : `${baseUrl}/api/barcodes/download/${filename}`;
    
    console.log(`🔍 Downloading PNG: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      }
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ PNG downloaded: ${blob.size} bytes, type: ${blob.type}`);
    return blob;
  }

  /**
   * Download a PDF file
   */
  async downloadPdfFile(filename: string): Promise<Blob> {
    // Use the same URL cleaning logic as the request method
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    // If baseUrl already ends with /api, don't add it again
    const url = baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download-pdf/${filename}`
      : `${baseUrl}/api/barcodes/download-pdf/${filename}`;
    
    console.log(`🔍 Downloading PDF: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      }
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ PDF downloaded: ${blob.size} bytes, type: ${blob.type}`);
    return blob;
  }

  /**
   * Get a direct URL for viewing a PDF in-browser
   * Note: This won't work with API key authentication in browser
   * Use downloadPdfFile() method instead for authenticated downloads
   */
  getPdfUrl(filename: string): string {
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    // If baseUrl already ends with /api, don't add it again
    return baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download-pdf/${filename}`
      : `${baseUrl}/api/barcodes/download-pdf/${filename}`;
  }

  /**
   * Get a direct URL for viewing/downloading a PNG in-browser
   * Note: This won't work with API key authentication in browser
   * Use downloadBarcodeFile() method instead for authenticated downloads
   */
  getPngUrl(filename: string): string {
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    // If baseUrl already ends with /api, don't add it again
    return baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download/${filename}`
      : `${baseUrl}/api/barcodes/download/${filename}`;
  }

  /**
   * Create an authenticated image URL for preview
   * This creates a blob URL from the authenticated download
   */
  async getAuthenticatedImageUrl(filename: string): Promise<string> {
    try {
      const blob = await this.downloadBarcodeFile(filename);
      return URL.createObjectURL(blob);
    } catch (error) {
      safeError('Failed to create authenticated image URL', error);
      throw error;
    }
  }

  /**
   * Create an authenticated PDF URL for preview
   * This creates a blob URL from the authenticated download
   */
  async getAuthenticatedPdfUrl(filename: string): Promise<string> {
    try {
      const blob = await this.downloadPdfFile(filename);
      return URL.createObjectURL(blob);
    } catch (error) {
      safeError('Failed to create authenticated PDF URL', error);
      throw error;
    }
  }

  /**
   * Create PDF from existing barcodes
   */
  async createPdfFromExisting(
    gridCols: number = 5,
    gridRows: number = 12,
    pdfFilename?: string
  ): Promise<BarcodeGenerationResponse> {
    const params = new URLSearchParams({
      grid_cols: gridCols.toString(),
      grid_rows: gridRows.toString(),
    });

    if (pdfFilename) {
      params.append('pdf_filename', pdfFilename);
    }

    return this.request<BarcodeGenerationResponse>(`/api/barcodes/create-pdf?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string; uptime: string }> {
    return this.request('/api/health');
  }

  /**
   * Download file and trigger browser download
   */
  async downloadFile(filename: string, isPdf: boolean = false): Promise<void> {
    try {
      console.log(`🔍 Starting download for ${filename} (isPdf: ${isPdf})`);
      
      const blob = isPdf 
        ? await this.downloadPdfFile(filename)
        : await this.downloadBarcodeFile(filename);
      
      console.log(`✅ Blob created: ${blob.size} bytes, type: ${blob.type}`);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      console.log(`🔍 Triggering download for ${filename}`);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log(`✅ Download cleanup completed for ${filename}`);
      }, 100);
      
    } catch (error) {
      console.error(`❌ Download failed for ${filename}:`, error);
      safeError('Download failed', error);
      throw error;
    }
  }

  /**
   * Simple and reliable download method using fetch + blob URL
   */
  async downloadFileSimple(filename: string, isPdf: boolean = false): Promise<void> {
    try {
      console.log(`🔍 Starting simple download for ${filename} (isPdf: ${isPdf})`);
      
      const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const endpoint = isPdf ? 'download-pdf' : 'download';
      const url = `${baseUrl}/barcodes/${endpoint}/${filename}`;
      
      console.log(`🔍 Fetching from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ Response received: ${response.status}`);
      
      const blob = await response.blob();
      console.log(`✅ Blob created: ${blob.size} bytes, type: ${blob.type}`);
      
      // Create object URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM and click
      document.body.appendChild(link);
      console.log(`🔍 Clicking download link for ${filename}`);
      link.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        console.log(`✅ Cleanup completed for ${filename}`);
      }, 1000);
      
    } catch (error) {
      console.error(`❌ Simple download failed for ${filename}:`, error);
      throw error;
    }
  }

  // Device Management Methods

  /**
   * Get all available device types
   */
  async getDeviceTypes(): Promise<DeviceTypeListResponse> {
    return this.request<DeviceTypeListResponse>('/devices/types');
  }

  /**
   * Create a new device
   */
  async createDevice(request: DeviceCreateRequest): Promise<DeviceResponse> {
    return this.request<DeviceResponse>('/devices', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get all devices
   */
  async getAllDevices(activeOnly: boolean = true): Promise<DeviceListResponse> {
    return this.request<DeviceListResponse>(`/devices?active_only=${activeOnly}`);
  }

  /**
   * Get a device by ID
   */
  async getDeviceById(deviceId: number): Promise<DeviceResponse> {
    return this.request<DeviceResponse>(`/devices/${deviceId}`);
  }

  /**
   * Get devices by type
   */
  async getDevicesByType(deviceType: string, activeOnly: boolean = true): Promise<DeviceListResponse> {
    return this.request<DeviceListResponse>(`/devices/type/${deviceType}?active_only=${activeOnly}`);
  }

  /**
   * Update a device
   */
  async updateDevice(deviceId: number, request: DeviceUpdateRequest): Promise<DeviceResponse> {
    return this.request<DeviceResponse>(`/devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  /**
   * Delete a device (soft delete)
   */
  async deleteDevice(deviceId: number): Promise<DeviceResponse> {
    return this.request<DeviceResponse>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get device statistics
   */
  async getDeviceStatistics(): Promise<{ success: boolean; statistics: any }> {
    return this.request<{ success: boolean; statistics: any }>('/devices/statistics');
  }

  // Phone Management Methods
  
  async getPhoneBrands(activeOnly: boolean = true): Promise<PhoneBrandListResponse> {
    const params = new URLSearchParams({ active_only: activeOnly.toString() });
    return this.request<PhoneBrandListResponse>(`/phone-brands?${params}`);
  }

  async createPhoneBrand(request: PhoneBrandCreateRequest): Promise<PhoneBrandResponse> {
    return this.request<PhoneBrandResponse>('/phone-brands', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPhoneBrandById(brandId: number): Promise<PhoneBrandResponse> {
    return this.request<PhoneBrandResponse>(`/phone-brands/${brandId}`);
  }

  async updatePhoneBrand(brandId: number, request: PhoneBrandUpdateRequest): Promise<PhoneBrandResponse> {
    return this.request<PhoneBrandResponse>(`/phone-brands/${brandId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deletePhoneBrand(brandId: number): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.request<{ success: boolean; message: string; timestamp: string }>(`/phone-brands/${brandId}`, {
      method: 'DELETE',
    });
  }

  async getPhoneModelsByBrand(brandId: number, activeOnly: boolean = true): Promise<PhoneModelListResponse> {
    const params = new URLSearchParams({ active_only: activeOnly.toString() });
    return this.request<PhoneModelListResponse>(`/phone-models/brand/${brandId}?${params}`);
  }

  async createPhoneModel(request: PhoneModelCreateRequest): Promise<PhoneModelResponse> {
    return this.request<PhoneModelResponse>('/phone-models', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getScalableDeviceSelectorData(): Promise<ScalableDeviceSelectorResponse> {
    return this.request<ScalableDeviceSelectorResponse>('/scalable-device-selector');
  }

  async getFeatures(): Promise<Feature[]> {
    return this.request<Feature[]>('/api/features');
  }

  async addFeature(feature: AddFeatureRequest): Promise<Feature> {
    return this.request<Feature>('/api/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    });
  }

  async updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature> {
    return this.request<Feature>(`/api/features/${featureId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFeature(featureId: string): Promise<void> {
    return this.request<void>(`/api/features/${featureId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export the class for testing
export { ApiService };

// Force cache refresh
