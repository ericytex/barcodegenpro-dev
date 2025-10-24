/**
 * AuthenticatedImagePreview Component
 * Handles authenticated image previews with proper API key authentication
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';

interface AuthenticatedImagePreviewProps {
  filename: string;
  alt?: string;
  className?: string;
  fallbackText?: string;
  onError?: (error: Error) => void;
}

export function AuthenticatedImagePreview({
  filename,
  alt = 'Preview',
  className = '',
  fallbackText = 'Loading...',
  onError
}: AuthenticatedImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create authenticated URL
        const url = await apiService.getAuthenticatedImageUrl(filename);
        
        if (isMounted) {
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
          setError(errorMessage);
          setLoading(false);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    };

    loadImage();

    // Cleanup function to revoke blob URL when component unmounts
    return () => {
      isMounted = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [filename, onError]);

  // Cleanup blob URL when imageUrl changes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <div className="text-gray-500 text-sm">{fallbackText}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded ${className}`}>
        <div className="text-red-500 text-sm text-center">
          <div className="font-medium">Preview Error</div>
          <div className="text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <div className="text-gray-500 text-sm">No preview available</div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => {
        setError('Failed to display image');
        setLoading(false);
      }}
    />
  );
}

/**
 * AuthenticatedPdfPreview Component
 * Handles authenticated PDF previews with proper API key authentication
 */

interface AuthenticatedPdfPreviewProps {
  filename: string;
  className?: string;
  fallbackText?: string;
  onError?: (error: Error) => void;
}

export function AuthenticatedPdfPreview({
  filename,
  className = 'w-full h-96',
  fallbackText = 'Loading PDF...',
  onError
}: AuthenticatedPdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create authenticated URL
        const url = await apiService.getAuthenticatedPdfUrl(filename);
        
        if (isMounted) {
          setPdfUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
          setError(errorMessage);
          setLoading(false);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    };

    loadPdf();

    // Cleanup function to revoke blob URL when component unmounts
    return () => {
      isMounted = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [filename, onError]);

  // Cleanup blob URL when pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <div className="text-gray-500 text-sm">{fallbackText}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded ${className}`}>
        <div className="text-red-500 text-sm text-center">
          <div className="font-medium">PDF Preview Error</div>
          <div className="text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <div className="text-gray-500 text-sm">No PDF preview available</div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      className={className}
      title={`PDF Preview: ${filename}`}
      onError={() => {
        setError('Failed to display PDF');
        setLoading(false);
      }}
    />
  );
}
