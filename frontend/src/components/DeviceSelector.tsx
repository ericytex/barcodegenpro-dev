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
    setIsLoading(true);
    try {
      // Load templates from backend - these become device types
      const { getApiConfig, buildApiUrl } = await import('@/lib/api');
      const apiConfig = getApiConfig();
      const response = await fetch(buildApiUrl('/templates'), {
        headers: {
          'X-API-Key': apiConfig.apiKey,
        },
      });

      const templateDevices: DeviceType[] = [];
      
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates || [];
        
        // Convert templates to device types
        templates.forEach((template: any) => {
          // Use template name as device type (convert to lowercase for consistency)
          const deviceType = template.name.toLowerCase().replace(/\s+/g, '_');
          const deviceTypeObj = {
            type: deviceType,
            display_name: template.name,
            description: template.description || `Template: ${template.name}`,
            icon: '📱',
            template_id: template.id, // Store template ID for reference
          };
          console.log('🔍 DEVICE SELECTOR: Loading template:', template.name, 'template_id:', template.id, 'deviceTypeObj:', deviceTypeObj);
          templateDevices.push(deviceTypeObj);
        });
      }

      // Only use templates - no static device types
      setDeviceTypes(templateDevices);
      console.log(`Loaded ${templateDevices.length} templates as device types`);
    } catch (error) {
      console.error('Error loading templates as device types:', error);
      // No fallback - empty list if API fails (user will see "No device types available")
      setDeviceTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (deviceType: string) => {
    if (deviceType === "none") {
      onChange(null);
      return;
    }
    
    // Create a mock device object from the device type
    const deviceTypeInfo = deviceTypes.find(type => type.type === deviceType);
    console.log('🔍 DEVICE SELECTOR DEBUG: handleValueChange called with deviceType:', deviceType);
    console.log('🔍 DEVICE SELECTOR DEBUG: deviceTypeInfo found:', deviceTypeInfo);
    console.log('🔍 DEVICE SELECTOR DEBUG: template_id in deviceTypeInfo:', (deviceTypeInfo as any)?.template_id);
    
    if (deviceTypeInfo) {
      const templateId = (deviceTypeInfo as any).template_id;
      const specs = templateId ? JSON.stringify({ template_id: templateId }) : null;
      
      console.log('🔍 DEVICE SELECTOR DEBUG: templateId extracted:', templateId);
      console.log('🔍 DEVICE SELECTOR DEBUG: specifications JSON:', specs);
      
      const mockDevice: Device = {
        id: templateId ? 0 : 0, // Use template_id if available
        name: deviceTypeInfo.display_name,
        brand: deviceTypeInfo.display_name.split(' ')[0] || 'Generic',
        model_code: 'AUTO',
        device_type: deviceTypeInfo.type, // This is the template name converted to device_type
        default_dn: 'M8N7',
        description: deviceTypeInfo.description,
        specifications: specs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };
      
      console.log('✅ DEVICE SELECTOR DEBUG: Created mockDevice with specifications:', mockDevice.specifications);
      onChange(mockDevice);
    } else {
      console.error('❌ DEVICE SELECTOR ERROR: deviceTypeInfo not found for deviceType:', deviceType);
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
