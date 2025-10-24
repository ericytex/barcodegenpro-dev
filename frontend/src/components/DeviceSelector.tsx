import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Laptop, Watch, Headphones, Camera, Monitor, Router, Gamepad2, Speaker, Tablet } from "lucide-react";
import { apiService, Device, DeviceType } from "@/lib/api";

interface DeviceSelectorProps {
  value?: Device | null;
  onChange: (device: Device | null) => void;
  placeholder?: string;
  disabled?: boolean;
  deviceType?: string; // Filter by device type
}

const deviceTypeIcons: Record<string, React.ReactNode> = {
  phone: <Smartphone className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
  laptop: <Laptop className="w-4 h-4" />,
  watch: <Watch className="w-4 h-4" />,
  headphones: <Headphones className="w-4 h-4" />,
  speaker: <Speaker className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  gaming_console: <Gamepad2 className="w-4 h-4" />,
  smart_tv: <Monitor className="w-4 h-4" />,
  router: <Router className="w-4 h-4" />,
  other: <Monitor className="w-4 h-4" />
};

export function DeviceSelector({ 
  value, 
  onChange, 
  placeholder = "Select a device...", 
  disabled = false,
  deviceType 
}: DeviceSelectorProps) {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDeviceTypes();
    // Don't load devices - we'll use device types directly
  }, []);


  const loadDeviceTypes = async () => {
    // Always use fallback device types for now - Popular phones in Uganda 2024-2025
    const fallbackTypes = [
      // General Phone Categories
      { type: 'phone', display_name: 'Smartphone', description: 'Mobile phones and smartphones', icon: '📱' },
      { type: 'phone_android', display_name: 'Android Phone', description: 'Android smartphones', icon: '📱' },
      { type: 'phone_ios', display_name: 'iPhone', description: 'Apple iPhones', icon: '📱' },
      { type: 'phone_basic', display_name: 'Basic Phone', description: 'Basic feature phones', icon: '📱' },
      { type: 'phone_foldable', display_name: 'Foldable Phone', description: 'Foldable smartphones', icon: '📱' },
      { type: 'phone_gaming', display_name: 'Gaming Phone', description: 'Gaming smartphones', icon: '📱' },
      
      // Samsung Galaxy Series (Popular in Uganda)
      { type: 'samsung_galaxy_s25', display_name: 'Samsung Galaxy S25', description: 'Premium flagship smartphone', icon: '📱' },
      { type: 'samsung_galaxy_a56', display_name: 'Samsung Galaxy A56', description: 'Mid-range smartphone', icon: '📱' },
      { type: 'samsung_galaxy_a06', display_name: 'Samsung Galaxy A06', description: 'Entry-level smartphone', icon: '📱' },
      { type: 'samsung_galaxy_a15', display_name: 'Samsung Galaxy A15', description: 'Budget-friendly smartphone', icon: '📱' },
      { type: 'samsung_galaxy_a25', display_name: 'Samsung Galaxy A25', description: 'Mid-range smartphone', icon: '📱' },
      
      // Tecno Series (Very Popular in Uganda)
      { type: 'tecno_phantom_x2_pro', display_name: 'Tecno Phantom X2 Pro', description: 'High-end Tecno smartphone', icon: '📱' },
      { type: 'tecno_spark_40', display_name: 'Tecno Spark 40', description: 'Budget-friendly Tecno smartphone', icon: '📱' },
      { type: 'tecno_pova_6', display_name: 'Tecno Pova 6', description: 'Long battery life smartphone', icon: '📱' },
      { type: 'tecno_camon_30', display_name: 'Tecno Camon 30', description: 'Camera-focused smartphone', icon: '📱' },
      { type: 'tecno_spark_go', display_name: 'Tecno Spark Go', description: 'Entry-level Tecno smartphone', icon: '📱' },
      { type: 'tecno_bg6_m', display_name: 'Tecno BG6 M', description: 'Smart mobile phone model', icon: '📱' },
      
      // Infinix Series (Popular in Uganda)
      { type: 'infinix_hot_50i', display_name: 'Infinix Hot 50i', description: 'Affordable Infinix smartphone', icon: '📱' },
      { type: 'infinix_smart_9', display_name: 'Infinix Smart 9', description: 'Budget Infinix smartphone', icon: '📱' },
      { type: 'infinix_note_40', display_name: 'Infinix Note 40', description: 'Large screen Infinix smartphone', icon: '📱' },
      { type: 'infinix_zero_30', display_name: 'Infinix Zero 30', description: 'Premium Infinix smartphone', icon: '📱' },
      { type: 'infinix_hot_12', display_name: 'Infinix Hot 12', description: 'Gaming-focused smartphone', icon: '📱' },
      
      // Xiaomi Redmi Series (Growing popularity in Uganda)
      { type: 'xiaomi_redmi_note_14', display_name: 'Xiaomi Redmi Note 14', description: 'Feature-rich Xiaomi smartphone', icon: '📱' },
      { type: 'xiaomi_redmi_14c', display_name: 'Xiaomi Redmi 14C', description: 'Budget Xiaomi smartphone', icon: '📱' },
      { type: 'xiaomi_redmi_13c', display_name: 'Xiaomi Redmi 13C', description: 'Entry-level Xiaomi smartphone', icon: '📱' },
      { type: 'xiaomi_redmi_note_13', display_name: 'Xiaomi Redmi Note 13', description: 'Mid-range Xiaomi smartphone', icon: '📱' },
      
      // Itel Series (Very Popular in Uganda)
      { type: 'itel_vision_7_plus', display_name: 'Itel Vision 7 Plus', description: 'Budget smartphone with large battery', icon: '📱' },
      { type: 'itel_p65', display_name: 'Itel P65', description: 'Entry-level Itel smartphone', icon: '📱' },
      { type: 'itel_a90', display_name: 'Itel A90', description: 'Smart mobile phone model A6610L', icon: '📱' },
      { type: 'itel_a06', display_name: 'Itel A06', description: 'User-friendly Itel smartphone', icon: '📱' },
      { type: 'itel_s23', display_name: 'Itel S23', description: 'Budget Itel smartphone', icon: '📱' },
      
      // Apple iPhone Series (Premium market in Uganda)
      { type: 'iphone_14_pro_max', display_name: 'iPhone 14 Pro Max', description: 'Premium Apple smartphone', icon: '📱' },
      { type: 'iphone_15', display_name: 'iPhone 15', description: 'Latest Apple smartphone', icon: '📱' },
      { type: 'iphone_15_pro', display_name: 'iPhone 15 Pro', description: 'Professional Apple smartphone', icon: '📱' },
      { type: 'iphone_13', display_name: 'iPhone 13', description: 'Previous generation iPhone', icon: '📱' },
      { type: 'iphone_se', display_name: 'iPhone SE', description: 'Compact Apple smartphone', icon: '📱' },
      
      // OnePlus Series (Premium Android)
      { type: 'oneplus_13r', display_name: 'OnePlus 13R', description: 'Flagship OnePlus smartphone', icon: '📱' },
      { type: 'oneplus_nord_3', display_name: 'OnePlus Nord 3', description: 'Mid-range OnePlus smartphone', icon: '📱' },
      
      // Google Pixel Series
      { type: 'google_pixel_7a', display_name: 'Google Pixel 7a 5G', description: 'Premium Android experience', icon: '📱' },
      { type: 'google_pixel_8', display_name: 'Google Pixel 8', description: 'Latest Google smartphone', icon: '📱' },
      { type: 'tablet', display_name: 'Tablet', description: 'Tablets and iPads', icon: '📱' },
      { type: 'tablet_android', display_name: 'Android Tablet', description: 'Android tablets', icon: '📱' },
      { type: 'tablet_ios', display_name: 'iPad', description: 'Apple iPads', icon: '📱' },
      { type: 'laptop', display_name: 'Laptop', description: 'Laptops and notebooks', icon: '💻' },
      { type: 'laptop_gaming', display_name: 'Gaming Laptop', description: 'Gaming laptops', icon: '💻' },
      { type: 'laptop_business', display_name: 'Business Laptop', description: 'Business laptops', icon: '💻' },
      { type: 'watch', display_name: 'Smart Watch', description: 'Smart watches and fitness trackers', icon: '⌚' },
      { type: 'watch_smart', display_name: 'Smart Watch', description: 'Smart watches', icon: '⌚' },
      { type: 'watch_fitness', display_name: 'Fitness Tracker', description: 'Fitness tracking devices', icon: '⌚' },
      { type: 'headphones', display_name: 'Headphones', description: 'Wireless headphones and earbuds', icon: '🎧' },
      { type: 'headphones_wireless', display_name: 'Wireless Headphones', description: 'Wireless headphones', icon: '🎧' },
      { type: 'headphones_earbuds', display_name: 'Earbuds', description: 'True wireless earbuds', icon: '🎧' },
      { type: 'speaker', display_name: 'Speaker', description: 'Bluetooth speakers and sound systems', icon: '🔊' },
      { type: 'speaker_bluetooth', display_name: 'Bluetooth Speaker', description: 'Bluetooth speakers', icon: '🔊' },
      { type: 'speaker_smart', display_name: 'Smart Speaker', description: 'Smart speakers with voice assistants', icon: '🔊' },
      { type: 'camera', display_name: 'Camera', description: 'Digital cameras and action cameras', icon: '📷' },
      { type: 'camera_dslr', display_name: 'DSLR Camera', description: 'Digital SLR cameras', icon: '📷' },
      { type: 'camera_action', display_name: 'Action Camera', description: 'Action cameras', icon: '📷' },
      { type: 'gaming_console', display_name: 'Gaming Console', description: 'Gaming consoles and handheld devices', icon: '🎮' },
      { type: 'gaming_handheld', display_name: 'Handheld Console', description: 'Handheld gaming devices', icon: '🎮' },
      { type: 'smart_tv', display_name: 'Smart TV', description: 'Smart TVs and streaming devices', icon: '📺' },
      { type: 'tv_4k', display_name: '4K Smart TV', description: '4K Smart TVs', icon: '📺' },
      { type: 'tv_streaming', display_name: 'Streaming Device', description: 'Streaming devices', icon: '📺' },
      { type: 'router', display_name: 'Router', description: 'WiFi routers and networking equipment', icon: '📡' },
      { type: 'router_wifi', display_name: 'WiFi Router', description: 'WiFi routers', icon: '📡' },
      { type: 'router_mesh', display_name: 'Mesh Router', description: 'Mesh WiFi systems', icon: '📡' },
      { type: 'other', display_name: 'Other', description: 'Other electronic devices', icon: '🔧' }
    ];
    setDeviceTypes(fallbackTypes);
    console.log('Using fallback device types with phone subcategories');
  };

  const handleValueChange = (deviceType: string) => {
    if (deviceType === "none") {
      onChange(null);
      return;
    }
    
    // Create a mock device object from the device type
    const deviceTypeInfo = deviceTypes.find(type => type.type === deviceType);
    if (deviceTypeInfo) {
      const mockDevice: Device = {
        id: 0, // Mock ID
        name: deviceTypeInfo.display_name,
        brand: deviceTypeInfo.display_name.split(' ')[0] || 'Generic',
        model_code: 'AUTO',
        device_type: deviceTypeInfo.type,
        default_dn: 'M8N7',
        description: deviceTypeInfo.description,
        specifications: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };
      onChange(mockDevice);
    }
  };

  return (
    <Select 
      value={value?.device_type || "none"} 
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading device types..." : placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              {deviceTypeIcons[value.device_type]}
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
        
        {deviceTypes.length === 0 && !isLoading && (
          <SelectItem value="no-types" disabled>
            <span className="text-muted-foreground">No device types available</span>
          </SelectItem>
        )}
        
        {deviceTypes.map((deviceType) => (
          <SelectItem key={deviceType.type} value={deviceType.type}>
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{deviceType.icon}</span>
                  <span className="font-medium">{deviceType.display_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {deviceType.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {deviceType.description}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Hook for using device selector state
export function useDeviceSelector(initialDevice?: Device | null) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialDevice || null);
  
  const handleDeviceChange = (device: Device | null) => {
    setSelectedDevice(device);
  };
  
  return {
    selectedDevice,
    setSelectedDevice,
    handleDeviceChange
  };
}
