import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Package, Tag } from "lucide-react";
import { Device } from "@/lib/api";

// Simple device types
const DEVICE_TYPES = [
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'laptop', label: 'Laptop', icon: '💻' },
  { value: 'earphones', label: 'Earphones', icon: '🎧' },
  { value: 'watch', label: 'Smart Watch', icon: '⌚' },
  { value: 'tablet', label: 'Tablet', icon: '📱' },
  { value: 'speaker', label: 'Speaker', icon: '🔊' },
  { value: 'camera', label: 'Camera', icon: '📷' },
  { value: 'gaming', label: 'Gaming Console', icon: '🎮' },
  { value: 'tv', label: 'Smart TV', icon: '📺' },
  { value: 'router', label: 'Router', icon: '📡' },
  { value: 'other', label: 'Other', icon: '🔧' }
];

interface SimpleDeviceSelectorProps {
  value?: Device | null;
  onChange: (device: Device | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SimpleDeviceSelector({
  value,
  onChange,
  placeholder = "Select a device...",
  disabled = false,
}: SimpleDeviceSelectorProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      // Load from localStorage (same as SimpleDeviceManagement)
      const storedDevices = localStorage.getItem('simple_devices');
      if (storedDevices) {
        const parsedDevices = JSON.parse(storedDevices);
        // Convert to Device format
        const convertedDevices: Device[] = parsedDevices.map((d: any) => ({
          id: d.id,
          name: d.model_name,
          brand: d.brand,
          model_code: 'AUTO',
          device_type: d.device_type,
          default_dn: 'M8N7',
          description: `${d.brand} ${d.model_name}`,
          specifications: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        }));
        setDevices(convertedDevices);
      } else {
        // Use fallback devices
        const fallbackDevices: Device[] = [
          { id: 1, name: 'Galaxy S25', brand: 'Samsung', model_code: 'AUTO', device_type: 'phone', default_dn: 'M8N7', description: 'Samsung Galaxy S25', specifications: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true },
          { id: 2, name: 'Spark 40', brand: 'Tecno', model_code: 'AUTO', device_type: 'phone', default_dn: 'M8N7', description: 'Tecno Spark 40', specifications: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true },
          { id: 3, name: 'Hot 50i', brand: 'Infinix', model_code: 'AUTO', device_type: 'phone', default_dn: 'M8N7', description: 'Infinix Hot 50i', specifications: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true },
          { id: 4, name: 'Pavilion 15', brand: 'HP', model_code: 'AUTO', device_type: 'laptop', default_dn: 'M8N7', description: 'HP Pavilion 15', specifications: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true },
          { id: 5, name: 'WH-1000XM5', brand: 'Sony', model_code: 'AUTO', device_type: 'earphones', default_dn: 'M8N7', description: 'Sony WH-1000XM5', specifications: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true }
        ];
        setDevices(fallbackDevices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (deviceId: string) => {
    if (deviceId === "none") {
      onChange(null);
      return;
    }
    
    const selectedDevice = devices.find(device => device.id?.toString() === deviceId);
    if (selectedDevice) {
      onChange(selectedDevice);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const deviceTypeInfo = DEVICE_TYPES.find(dt => dt.value === deviceType);
    return deviceTypeInfo?.icon || '📱';
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    const deviceTypeInfo = DEVICE_TYPES.find(dt => dt.value === deviceType);
    return deviceTypeInfo?.label || 'Unknown';
  };

  return (
    <Select 
      value={value?.id?.toString() || "none"} 
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading devices..." : placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              <span>{getDeviceIcon(value.device_type)}</span>
              <span>{value.brand} {value.name}</span>
              <Badge variant="outline" className="text-xs">
                {getDeviceTypeLabel(value.device_type)}
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
        
        {devices.length === 0 && !isLoading && (
          <SelectItem value="no-devices" disabled>
            <span className="text-muted-foreground">No devices available</span>
          </SelectItem>
        )}
        
        {devices.map((device) => (
          <SelectItem key={device.id} value={device.id?.toString() || ""}>
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{getDeviceIcon(device.device_type)}</span>
                  <span className="font-medium">{device.brand} {device.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getDeviceTypeLabel(device.device_type)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {device.description}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Hook for using simple device selector state
export function useSimpleDeviceSelector(initialDevice?: Device | null) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialDevice || null);

  const handleDeviceChange = useCallback((device: Device | null) => {
    setSelectedDevice(device);
  }, []);

  return { selectedDevice, handleDeviceChange, setSelectedDevice };
}
