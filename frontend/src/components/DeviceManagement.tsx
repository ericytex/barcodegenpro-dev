import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Smartphone, Laptop, Watch, Headphones, Camera, Monitor, Router, Gamepad2, Speaker, Tablet } from "lucide-react";
import { toast } from "sonner";
import { apiService, Device, DeviceType, DeviceCreateRequest, DeviceUpdateRequest } from "@/lib/api";

interface DeviceManagementProps {
  onDevicesChange?: () => void;
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

export function DeviceManagement({ onDevicesChange }: DeviceManagementProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model_code: '',
    device_type: '',
    default_dn: 'M8N7',
    description: '',
    specifications: ''
  });

  useEffect(() => {
    loadDevices();
    loadDeviceTypes();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllDevices(true);
      if (response.success) {
        setDevices(response.devices);
      } else {
        toast.error('Failed to load devices');
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeviceTypes = async () => {
    try {
      const response = await apiService.getDeviceTypes();
      if (response.success) {
        setDeviceTypes(response.device_types);
      }
    } catch (error) {
      console.error('Error loading device types:', error);
      // Fallback device types if API fails - Popular phones in Uganda 2024-2025
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
      console.log('Using fallback device types');
    }
  };

  const handleCreateDevice = async () => {
    try {
      if (!formData.name || !formData.brand || !formData.model_code || !formData.device_type) {
        toast.error('Please fill in all required fields');
        return;
      }

      const request: DeviceCreateRequest = {
        name: formData.name,
        brand: formData.brand,
        model_code: formData.model_code,
        device_type: formData.device_type,
        default_dn: formData.default_dn,
        description: formData.description || undefined,
        specifications: formData.specifications ? JSON.parse(formData.specifications) : undefined
      };

      const response = await apiService.createDevice(request);
      if (response.success) {
        toast.success('Device created successfully');
        await loadDevices();
        resetForm();
        setIsDialogOpen(false);
        onDevicesChange?.();
      } else {
        toast.error(response.message || 'Failed to create device');
      }
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error('Failed to create device');
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    try {
      const request: DeviceUpdateRequest = {
        name: formData.name,
        brand: formData.brand,
        model_code: formData.model_code,
        device_type: formData.device_type,
        default_dn: formData.default_dn,
        description: formData.description || undefined,
        specifications: formData.specifications ? JSON.parse(formData.specifications) : undefined
      };

      const response = await apiService.updateDevice(editingDevice.id!, request);
      if (response.success) {
        toast.success('Device updated successfully');
        await loadDevices();
        resetForm();
        setIsDialogOpen(false);
        setEditingDevice(null);
        onDevicesChange?.();
      } else {
        toast.error(response.message || 'Failed to update device');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!device.id) return;

    try {
      const response = await apiService.deleteDevice(device.id);
      if (response.success) {
        toast.success('Device deleted successfully');
        await loadDevices();
        onDevicesChange?.();
      } else {
        toast.error(response.message || 'Failed to delete device');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model_code: '',
      device_type: '',
      default_dn: 'M8N7',
      description: '',
      specifications: ''
    });
    setEditingDevice(null);
  };

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      brand: device.brand,
      model_code: device.model_code,
      device_type: device.device_type,
      default_dn: device.default_dn,
      description: device.description || '',
      specifications: device.specifications ? JSON.stringify(device.specifications, null, 2) : ''
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getDeviceTypeBadge = (deviceType: string) => {
    const type = deviceTypes.find(t => t.type === deviceType);
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {deviceTypeIcons[deviceType]}
        {type?.display_name || deviceType}
      </Badge>
    );
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Device Management
            </CardTitle>
            <CardDescription>
              Manage your electronic devices for barcode generation
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingDevice ? 'Edit Device' : 'Add New Device'}
                </DialogTitle>
                <DialogDescription>
                  {editingDevice 
                    ? 'Update the device information below.'
                    : 'Add a new device to your barcode generation system.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Device Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="iPhone 15 Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand *</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Apple"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model_code">Model Code *</Label>
                    <Input
                      id="model_code"
                      value={formData.model_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, model_code: e.target.value }))}
                      placeholder="A3102"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device_type">Device Type *</Label>
                    <Select 
                      value={formData.device_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, device_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceTypes.map((type) => (
                          <SelectItem key={type.type} value={type.type}>
                            <div className="flex items-center gap-2">
                              {deviceTypeIcons[type.type]}
                              {type.display_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default_dn">Default D/N</Label>
                  <Input
                    id="default_dn"
                    value={formData.default_dn}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_dn: e.target.value }))}
                    placeholder="M8N7"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional device information..."
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specifications">Specifications (JSON)</Label>
                  <Textarea
                    id="specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder='{"storage": "256GB", "color": "Space Black"}'
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingDevice ? handleUpdateDevice : handleCreateDevice}>
                  {editingDevice ? 'Update Device' : 'Create Device'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No devices found. Add your first device to get started.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{device.name}</h4>
                      {getDeviceTypeBadge(device.device_type)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Brand:</span> {device.brand}</p>
                      <p><span className="font-medium">Model:</span> {device.model_code}</p>
                      <p><span className="font-medium">D/N:</span> {device.default_dn}</p>
                      {device.description && (
                        <p><span className="font-medium">Description:</span> {device.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(device)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDevice(device)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
