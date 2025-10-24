/**
 * Custom hook for barcode API operations
 */

import { useState, useCallback } from 'react';
import { apiService, BarcodeItem, BarcodeGenerationRequest, FileInfo, DatabaseFileInfo, ArchiveSession, ArchiveStatistics } from '@/lib/api';

export interface UseBarcodeApiReturn {
  // State
  isLoading: boolean;
  error: string | null;
  generatedFiles: string[];
  pdfFile: string | null;
  availableFiles: FileInfo[];
  databaseFiles: DatabaseFileInfo[];
  archiveSessions: ArchiveSession[];
  archiveStatistics: ArchiveStatistics | null;
  
  // Actions
  generateBarcodes: (items: BarcodeItem[], options?: {
    createPdf?: boolean;
    pdfGridCols?: number;
    pdfGridRows?: number;
    autoGenerateSecondImei?: boolean;
    deviceType?: string;
    deviceId?: number;
    templateId?: string;
  }) => Promise<void>;
  
  uploadExcelAndGenerate: (file: File, options?: {
    createPdf?: boolean;
    pdfGridCols?: number;
    pdfGridRows?: number;
    autoGenerateSecondImei?: boolean;
    deviceType?: string;
    deviceId?: number;
    templateId?: string;
  }) => Promise<{ generated_files: string[]; pdf_file?: string }>;
  
  downloadFile: (filename: string, isPdf?: boolean) => Promise<void>;
  listFiles: () => Promise<void>;
  getDatabaseFiles: () => Promise<void>;
  getArchiveSessions: () => Promise<void>;
  getArchiveStatistics: () => Promise<void>;
  createPdfFromExisting: (options?: {
    gridCols?: number;
    gridRows?: number;
    pdfFilename?: string;
  }) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export function useBarcodeApi(): UseBarcodeApiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<FileInfo[]>([]);
  const [databaseFiles, setDatabaseFiles] = useState<DatabaseFileInfo[]>([]);
  const [archiveSessions, setArchiveSessions] = useState<ArchiveSession[]>([]);
  const [archiveStatistics, setArchiveStatistics] = useState<ArchiveStatistics | null>(null);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    setError(errorMessage);
    console.error('API Error:', err);
  }, []);

  const generateBarcodes = useCallback(async (
    items: BarcodeItem[],
    options: {
      createPdf?: boolean;
      pdfGridCols?: number;
      pdfGridRows?: number;
      autoGenerateSecondImei?: boolean;
      deviceType?: string;
      deviceId?: number;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const request: BarcodeGenerationRequest = {
        items,
        create_pdf: options.createPdf ?? true,
        pdf_grid_cols: options.pdfGridCols ?? 5,
        pdf_grid_rows: options.pdfGridRows ?? 12,
        auto_generate_second_imei: options.autoGenerateSecondImei ?? true,
        device_type: options.deviceType,
        device_id: options.deviceId,
      };
      
      const response = await apiService.generateEnhancedBarcodes(request);
      
      setGeneratedFiles(response.generated_files);
      setPdfFile(response.pdf_file || null);
      
      // Refresh file list
      await listFiles();
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const uploadExcelAndGenerate = useCallback(async (
    file: File,
    options: {
      createPdf?: boolean;
      pdfGridCols?: number;
      pdfGridRows?: number;
      autoGenerateSecondImei?: boolean;
      deviceType?: string;
      deviceId?: number;
      templateId?: string;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.uploadExcelAndGenerate(
        file,
        options.createPdf ?? true,
        options.pdfGridCols ?? 5,
        options.pdfGridRows ?? 12,
        options.autoGenerateSecondImei ?? true,
        options.deviceType,
        options.deviceId,
        options.templateId
      );
      
      setGeneratedFiles(response.generated_files);
      setPdfFile(response.pdf_file || null);
      
      // Refresh file list
      await listFiles();
      
      // Return the response data
      return {
        generated_files: response.generated_files,
        pdf_file: response.pdf_file
      };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const downloadFile = useCallback(async (filename: string, isPdf: boolean = false) => {
    try {
      await apiService.downloadFile(filename, isPdf);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  const listFiles = useCallback(async () => {
    try {
      const response = await apiService.listFiles();
      setAvailableFiles(response.files);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  const getDatabaseFiles = useCallback(async () => {
    try {
      const response = await apiService.getDatabaseFiles();
      setDatabaseFiles(response.files);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  const getArchiveSessions = useCallback(async () => {
    try {
      const response = await apiService.getArchiveSessions();
      setArchiveSessions(response.sessions);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  const getArchiveStatistics = useCallback(async () => {
    try {
      const response = await apiService.getArchiveStatistics();
      setArchiveStatistics(response.statistics);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  const createPdfFromExisting = useCallback(async (options: {
    gridCols?: number;
    gridRows?: number;
    pdfFilename?: string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.createPdfFromExisting(
        options.gridCols ?? 5,
        options.gridRows ?? 12,
        options.pdfFilename
      );
      
      setPdfFile(response.pdf_file || null);
      
      // Refresh file list
      await listFiles();
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError, listFiles]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setGeneratedFiles([]);
    setPdfFile(null);
    setAvailableFiles([]);
    setDatabaseFiles([]);
    setArchiveSessions([]);
    setArchiveStatistics(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    generatedFiles,
    pdfFile,
    availableFiles,
    databaseFiles,
    archiveSessions,
    archiveStatistics,
    
    // Actions
    generateBarcodes,
    uploadExcelAndGenerate,
    downloadFile,
    listFiles,
    getDatabaseFiles,
    getArchiveSessions,
    getArchiveStatistics,
    createPdfFromExisting,
    
    // Utilities
    clearError,
    reset,
  };
}
