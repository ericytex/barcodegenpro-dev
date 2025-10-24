import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Banner {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

interface AnnouncementBannerProps {
  className?: string;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ className = '' }) => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActiveBanner();
  }, []);

  const loadActiveBanner = async () => {
    try {
      setIsLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/banners/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.banner) {
          setBanner(data.banner);
          // Check if banner is expired
          if (data.banner.expires_at) {
            const expiresAt = new Date(data.banner.expires_at);
            const now = new Date();
            if (now > expiresAt) {
              setIsVisible(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage to prevent showing again
    if (banner) {
      localStorage.setItem(`banner_dismissed_${banner.id}`, 'true');
    }
  };

  const getBannerIcon = () => {
    switch (banner?.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBannerStyles = () => {
    switch (banner?.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Don't show if loading, no banner, not visible, or dismissed
  if (isLoading || !banner || !isVisible) {
    return null;
  }

  // Check if banner was previously dismissed
  const isDismissed = localStorage.getItem(`banner_dismissed_${banner.id}`) === 'true';
  if (isDismissed) {
    return null;
  }

  return (
    <Card className={`border-l-4 ${getBannerStyles()} ${className}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0">
          {getBannerIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{banner.title}</h3>
          <p className="text-sm">{banner.message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default AnnouncementBanner;

