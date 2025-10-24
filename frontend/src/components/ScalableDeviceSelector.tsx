import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Plus, Edit, Trash2, Star } from "lucide-react";
import { apiService, Device } from "@/lib/api";
import { toast } from "sonner";

interface PhoneBrand {
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

interface PhoneModel {
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

interface ScalableDeviceSelectorProps {
  value?: Device | null;
  onChange: (device: Device | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ScalableDeviceSelector({ 
  value, 
  onChange, 
  placeholder = "Select a device...", 
  disabled = false 
}: ScalableDeviceSelectorProps) {
  const [brands, setBrands] = useState<PhoneBrand[]>([]);
  const [models, setModels] = useState<PhoneModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadModelsByBrand(selectedBrandId);
    } else {
      setModels([]);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      // For now, use fallback data since API endpoints aren't ready
      const fallbackBrands: PhoneBrand[] = [
        { id: 1, name: "Samsung", icon: "📱", description: "South Korean electronics company", country_origin: "South Korea", market_share_uganda: 25.5, is_active: true },
        { id: 2, name: "Tecno", icon: "📱", description: "Chinese smartphone manufacturer", country_origin: "China", market_share_uganda: 22.3, is_active: true },
        { id: 3, name: "Infinix", icon: "📱", description: "Chinese smartphone brand", country_origin: "China", market_share_uganda: 18.7, is_active: true },
        { id: 4, name: "Itel", icon: "📱", description: "Budget smartphone brand", country_origin: "China", market_share_uganda: 15.2, is_active: true },
        { id: 5, name: "Xiaomi", icon: "📱", description: "Chinese electronics company", country_origin: "China", market_share_uganda: 8.9, is_active: true },
        { id: 6, name: "Apple", icon: "📱", description: "American technology company", country_origin: "USA", market_share_uganda: 4.1, is_active: true },
        { id: 7, name: "OnePlus", icon: "📱", description: "Chinese premium smartphone", country_origin: "China", market_share_uganda: 2.8, is_active: true },
        { id: 8, name: "Google", icon: "📱", description: "American technology company", country_origin: "USA", market_share_uganda: 1.5, is_active: true }
      ];
      setBrands(fallbackBrands);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Failed to load phone brands');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelsByBrand = async (brandId: number) => {
    try {
      setIsLoading(true);
      // For now, use fallback data
      const fallbackModels: PhoneModel[] = [
        // Samsung Models
        { id: 1, brand_id: 1, model_name: "Galaxy S25", model_code: "SM-S925", device_type: "phone", price_range: "premium", screen_size: "6.2 inch", battery_capacity: "4000mAh", is_popular_uganda: true, is_active: true },
        { id: 2, brand_id: 1, model_name: "Galaxy A56", model_code: "SM-A566", device_type: "phone", price_range: "mid-range", screen_size: "6.6 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        { id: 3, brand_id: 1, model_name: "Galaxy A06", model_code: "SM-A066", device_type: "phone", price_range: "budget", screen_size: "6.1 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        
        // Tecno Models
        { id: 4, brand_id: 2, model_name: "Phantom X2 Pro", model_code: "TECNO-PX2P", device_type: "phone", price_range: "premium", screen_size: "6.8 inch", battery_capacity: "5160mAh", is_popular_uganda: true, is_active: true },
        { id: 5, brand_id: 2, model_name: "Spark 40", model_code: "TECNO-SP40", device_type: "phone", price_range: "budget", screen_size: "6.6 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        { id: 6, brand_id: 2, model_name: "Pova 6", model_code: "TECNO-PV6", device_type: "phone", price_range: "mid-range", screen_size: "6.78 inch", battery_capacity: "6000mAh", is_popular_uganda: true, is_active: true },
        
        // Infinix Models
        { id: 7, brand_id: 3, model_name: "Hot 50i", model_code: "INFINIX-H50I", device_type: "phone", price_range: "budget", screen_size: "6.6 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        { id: 8, brand_id: 3, model_name: "Smart 9", model_code: "INFINIX-SM9", device_type: "phone", price_range: "budget", screen_size: "6.6 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        
        // Itel Models
        { id: 9, brand_id: 4, model_name: "Vision 7 Plus", model_code: "ITEL-V7P", device_type: "phone", price_range: "budget", screen_size: "6.6 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        { id: 10, brand_id: 4, model_name: "A90", model_code: "ITEL-A90", device_type: "phone", price_range: "budget", screen_size: "6.1 inch", battery_capacity: "4000mAh", is_popular_uganda: true, is_active: true },
        
        // Xiaomi Models
        { id: 11, brand_id: 5, model_name: "Redmi Note 14", model_code: "XIAOMI-RN14", device_type: "phone", price_range: "mid-range", screen_size: "6.67 inch", battery_capacity: "5000mAh", is_popular_uganda: true, is_active: true },
        
        // Apple Models
        { id: 12, brand_id: 6, model_name: "iPhone 15", model_code: "APPLE-IP15", device_type: "phone", price_range: "premium", screen_size: "6.1 inch", battery_capacity: "3349mAh", is_popular_uganda: true, is_active: true },
        { id: 13, brand_id: 6, model_name: "iPhone 14 Pro Max", model_code: "APPLE-IP14PM", device_type: "phone", price_range: "premium", screen_size: "6.7 inch", battery_capacity: "4323mAh", is_popular_uganda: true, is_active: true }
      ];
      
      const brandModels = fallbackModels.filter(model => model.brand_id === brandId);
      setModels(brandModels);
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error('Failed to load phone models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    if (brandId === "none") {
      setSelectedBrandId(null);
      setModels([]);
      onChange(null);
      return;
    }
    
    const id = parseInt(brandId);
    setSelectedBrandId(id);
  };

  const handleModelChange = (modelId: string) => {
    if (modelId === "none") {
      onChange(null);
      return;
    }
    
    const id = parseInt(modelId);
    const selectedModel = models.find(model => model.id === id);
    const selectedBrand = brands.find(brand => brand.id === selectedBrandId);
    
    if (selectedModel && selectedBrand) {
      const mockDevice: Device = {
        id: selectedModel.id,
        name: selectedModel.model_name,
        brand: selectedBrand.name,
        model_code: selectedModel.model_code,
        device_type: selectedModel.device_type,
        default_dn: 'M8N7',
        description: `${selectedBrand.name} ${selectedModel.model_name} - ${selectedModel.price_range} smartphone`,
        specifications: JSON.stringify({
          screen_size: selectedModel.screen_size,
          battery_capacity: selectedModel.battery_capacity,
          price_range: selectedModel.price_range,
          release_year: selectedModel.release_year
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };
      onChange(mockDevice);
    }
  };

  const getPriceRangeColor = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return 'bg-green-100 text-green-800';
      case 'mid-range': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Brand Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select Brand</Label>
        <Select 
          value={selectedBrandId?.toString() || "none"} 
          onValueChange={handleBrandChange}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoading ? "Loading brands..." : "Choose a phone brand..."}>
              {selectedBrandId && (
                <div className="flex items-center gap-2">
                  <span>{brands.find(b => b.id === selectedBrandId)?.icon}</span>
                  <span>{brands.find(b => b.id === selectedBrandId)?.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">None selected</span>
              </div>
            </SelectItem>
            
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id.toString()}>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{brand.icon}</span>
                      <span className="font-medium">{brand.name}</span>
                      {brand.market_share_uganda && (
                        <Badge variant="outline" className="text-xs">
                          {brand.market_share_uganda}% Uganda
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {brand.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model Selection */}
      {selectedBrandId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Model</Label>
          <Select 
            value={value?.id?.toString() || "none"} 
            onValueChange={handleModelChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoading ? "Loading models..." : "Choose a phone model..."}>
                {value && (
                  <div className="flex items-center gap-2">
                    <span>{value.brand} {value.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {value.model_code}
                    </Badge>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">None selected</span>
                </div>
              </SelectItem>
              
              {models.length === 0 && !isLoading && (
                <SelectItem value="no-models" disabled>
                  <span className="text-muted-foreground">No models available for this brand</span>
                </SelectItem>
              )}
              
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id.toString()}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.model_name}</span>
                        <Badge className={`text-xs ${getPriceRangeColor(model.price_range)}`}>
                          {model.price_range}
                        </Badge>
                        {model.is_popular_uganda && (
                          <Star className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {model.model_code} • {model.screen_size} • {model.battery_capacity}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Device Info */}
      {value && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Selected Device</span>
              </div>
              <div className="text-sm">
                <div><strong>Brand:</strong> {value.brand}</div>
                <div><strong>Model:</strong> {value.name}</div>
                <div><strong>Code:</strong> {value.model_code}</div>
                <div><strong>Type:</strong> {value.device_type}</div>
                <div><strong>Description:</strong> {value.description}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook for using scalable device selector state
export function useScalableDeviceSelector(initialDevice?: Device | null) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialDevice || null);

  const handleDeviceChange = (device: Device | null) => {
    setSelectedDevice(device);
  };

  return {
    selectedDevice,
    handleDeviceChange
  };
}
