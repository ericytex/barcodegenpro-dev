import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Smartphone, Laptop, Headphones, Watch, Tablet, Speaker } from "lucide-react";
import { toast } from "sonner";

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

interface Device {
  id?: number;
  device_type: string;
  brand: string;
  model_name: string;
  is_active?: boolean;
}

export function SimpleDeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [deviceForm, setDeviceForm] = useState<Device>({
    device_type: 'phone',
    brand: '',
    model_name: ''
  });

  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      // For now, use localStorage to store devices
      const storedDevices = localStorage.getItem('simple_devices');
      if (storedDevices) {
        setDevices(JSON.parse(storedDevices));
      } else {
        // Load some sample devices
        const sampleDevices: Device[] = [
          { id: 1, device_type: 'phone', brand: 'Samsung', model_name: 'Galaxy S25' },
          { id: 2, device_type: 'phone', brand: 'Tecno', model_name: 'Spark 40' },
          { id: 3, device_type: 'phone', brand: 'Infinix', model_name: 'Hot 50i' },
          { id: 4, device_type: 'laptop', brand: 'HP', model_name: 'Pavilion 15' },
          { id: 5, device_type: 'laptop', brand: 'Dell', model_name: 'Inspiron 15' },
          { id: 6, device_type: 'earphones', brand: 'Sony', model_name: 'WH-1000XM5' },
          { id: 7, device_type: 'earphones', brand: 'Apple', model_name: 'AirPods Pro' },
          { id: 8, device_type: 'watch', brand: 'Apple', model_name: 'Watch Series 9' },
          { id: 9, device_type: 'speaker', brand: 'JBL', model_name: 'Charge 5' },
          { id: 10, device_type: 'tablet', brand: 'Samsung', model_name: 'Galaxy Tab S9' }
        ];
        setDevices(sampleDevices);
        localStorage.setItem('simple_devices', JSON.stringify(sampleDevices));
      }
      toast.success(`Loaded ${devices.length} devices`);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDevice = async () => {
    try {
      if (!deviceForm.brand || !deviceForm.model_name) {
        toast.error('Please fill in brand and model name');
        return;
      }

      const newDevice: Device = {
        id: Date.now(), // Simple ID generation
        device_type: deviceForm.device_type,
        brand: deviceForm.brand,
        model_name: deviceForm.model_name,
        is_active: true
      };

      const updatedDevices = [...devices, newDevice];
      setDevices(updatedDevices);
      localStorage.setItem('simple_devices', JSON.stringify(updatedDevices));
      
      toast.success(`Created device: ${deviceForm.brand} ${deviceForm.model_name}`);
      
      // Reset form
      setDeviceForm({
        device_type: 'phone',
        brand: '',
        model_name: ''
      });
      setShowDialog(false);
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error('Failed to create device');
    }
  };

  const handleDeleteDevice = async (deviceId: number) => {
    try {
      if (confirm('Are you sure you want to delete this device?')) {
        const updatedDevices = devices.filter(device => device.id !== deviceId);
        setDevices(updatedDevices);
        localStorage.setItem('simple_devices', JSON.stringify(updatedDevices));
        toast.success('Device deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
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

  const getDevicesByType = (deviceType: string) => {
    return devices.filter(device => device.device_type === deviceType);
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Simple Device Management
        </CardTitle>
        <CardDescription>
          Add and manage devices by type, brand, and model. Simple and straightforward.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add Device Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Devices ({devices.length})</h3>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Device</DialogTitle>
                  <DialogDescription>
                    Add a new device to the system. Choose device type, brand, and model.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="device-type">Device Type *</Label>
                    <Select 
                      value={deviceForm.device_type} 
                      onValueChange={(value) => setDeviceForm({ ...deviceForm, device_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map((deviceType) => (
                          <SelectItem key={deviceType.value} value={deviceType.value}>
                            <div className="flex items-center gap-2">
                              <span>{deviceType.icon}</span>
                              <span>{deviceType.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand *</Label>
                    <Input
                      id="brand"
                      placeholder="e.g., Samsung, Apple, HP, Sony"
                      value={deviceForm.brand}
                      onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model Name *</Label>
                    <Input
                      id="model"
                      placeholder="e.g., Galaxy S25, MacBook Pro, WH-1000XM5"
                      value={deviceForm.model_name}
                      onChange={(e) => setDeviceForm({ ...deviceForm, model_name: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDevice} disabled={!deviceForm.brand || !deviceForm.model_name}>
                    Add Device
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Devices by Type */}
          {DEVICE_TYPES.map((deviceType) => {
            const typeDevices = getDevicesByType(deviceType.value);
            if (typeDevices.length === 0) return null;

            return (
              <div key={deviceType.value} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{deviceType.icon}</span>
                  <h4 className="font-medium">{deviceType.label}</h4>
                  <Badge variant="outline">{typeDevices.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {typeDevices.map((device) => (
                    <Card key={device.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{device.brand}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{device.model_name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {devices.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices added yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first device</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading devices...</div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">📋 How to Use</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Choose Device Type:</strong> Select from phone, laptop, earphones, etc.</li>
              <li>• <strong>Enter Brand:</strong> Type the brand name (e.g., Samsung, Apple, HP)</li>
              <li>• <strong>Enter Model:</strong> Type the model name (e.g., Galaxy S25, MacBook Pro)</li>
              <li>• <strong>Auto-Organize:</strong> Devices are automatically grouped by type</li>
              <li>• <strong>Easy Management:</strong> Delete devices you no longer need</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
