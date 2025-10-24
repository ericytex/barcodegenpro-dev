import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Smartphone, Star, Building, Globe } from "lucide-react";
import { 
  apiService, 
  PhoneBrand, 
  PhoneModel, 
  PhoneBrandCreateRequest, 
  PhoneModelCreateRequest 
} from "@/lib/api";
import { toast } from "sonner";

export function PhoneManagementSettings() {
  const [brands, setBrands] = useState<PhoneBrand[]>([]);
  const [models, setModels] = useState<PhoneModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Brand form state
  const [brandForm, setBrandForm] = useState<PhoneBrandCreateRequest>({
    name: '',
    icon: '📱',
    description: '',
    country_origin: '',
    market_share_uganda: 0
  });
  
  // Model form state
  const [modelForm, setModelForm] = useState<PhoneModelCreateRequest>({
    brand_id: 0,
    model_name: '',
    model_code: '',
    device_type: 'phone',
    price_range: 'budget',
    screen_size: '',
    battery_capacity: '',
    storage_options: '',
    color_options: '',
    release_year: new Date().getFullYear(),
    is_popular_uganda: false
  });

  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showModelDialog, setShowModelDialog] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadModelsByBrand(selectedBrandId);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getPhoneBrands(true);
      if (response.success) {
        setBrands(response.brands);
        toast.success(`Loaded ${response.brands.length} phone brands`);
      }
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
      const response = await apiService.getPhoneModelsByBrand(brandId, true);
      if (response.success) {
        setModels(response.models);
        toast.success(`Loaded ${response.models.length} phone models`);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error('Failed to load phone models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBrand = async () => {
    try {
      const response = await apiService.createPhoneBrand(brandForm);
      if (response.success) {
        toast.success(`Created brand: ${response.brand.name}`);
        setBrandForm({
          name: '',
          icon: '📱',
          description: '',
          country_origin: '',
          market_share_uganda: 0
        });
        setShowBrandDialog(false);
        await loadBrands();
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      toast.error('Failed to create phone brand');
    }
  };

  const handleCreateModel = async () => {
    try {
      if (!selectedBrandId) {
        toast.error('Please select a brand first');
        return;
      }
      
      const modelData = {
        ...modelForm,
        brand_id: selectedBrandId,
        storage_options: modelForm.storage_options ? JSON.stringify(modelForm.storage_options.split(',').map(s => s.trim())) : '',
        color_options: modelForm.color_options ? JSON.stringify(modelForm.color_options.split(',').map(s => s.trim())) : ''
      };
      
      const response = await apiService.createPhoneModel(modelData);
      if (response.success) {
        toast.success(`Created model: ${response.model.model_name}`);
        setModelForm({
          brand_id: 0,
          model_name: '',
          model_code: '',
          device_type: 'phone',
          price_range: 'budget',
          screen_size: '',
          battery_capacity: '',
          storage_options: '',
          color_options: '',
          release_year: new Date().getFullYear(),
          is_popular_uganda: false
        });
        setShowModelDialog(false);
        await loadModelsByBrand(selectedBrandId);
      }
    } catch (error) {
      console.error('Error creating model:', error);
      toast.error('Failed to create phone model');
    }
  };

  const handleDeleteBrand = async (brandId: number) => {
    try {
      if (confirm('Are you sure you want to delete this brand?')) {
        const response = await apiService.deletePhoneBrand(brandId);
        if (response.success) {
          toast.success(response.message);
          await loadBrands();
          if (selectedBrandId === brandId) {
            setSelectedBrandId(null);
            setModels([]);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete phone brand');
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
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Phone Management (Admin Settings)
        </CardTitle>
        <CardDescription>
          Manage phone brands and models for scalable device selection. Add new phones imported to Uganda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="brands" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brands" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Phone Brands
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Phone Models
            </TabsTrigger>
          </TabsList>

          {/* Phone Brands Tab */}
          <TabsContent value="brands" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Phone Brands ({brands.length})</h3>
              <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Brand
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Phone Brand</DialogTitle>
                    <DialogDescription>
                      Add a new phone brand to the system. This brand will appear in device selection dropdowns.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand-name">Brand Name *</Label>
                      <Input
                        id="brand-name"
                        placeholder="e.g., Samsung, Tecno, Infinix"
                        value={brandForm.name}
                        onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand-icon">Icon</Label>
                      <Input
                        id="brand-icon"
                        placeholder="📱"
                        value={brandForm.icon}
                        onChange={(e) => setBrandForm({ ...brandForm, icon: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand-description">Description</Label>
                      <Textarea
                        id="brand-description"
                        placeholder="Brief description of the brand"
                        value={brandForm.description}
                        onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand-origin">Country of Origin</Label>
                        <Input
                          id="brand-origin"
                          placeholder="e.g., China, South Korea"
                          value={brandForm.country_origin}
                          onChange={(e) => setBrandForm({ ...brandForm, country_origin: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand-market-share">Uganda Market Share (%)</Label>
                        <Input
                          id="brand-market-share"
                          type="number"
                          placeholder="0.0"
                          value={brandForm.market_share_uganda}
                          onChange={(e) => setBrandForm({ ...brandForm, market_share_uganda: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBrandDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateBrand} disabled={!brandForm.name}>
                      Create Brand
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <Card key={brand.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{brand.icon}</span>
                        <div>
                          <h4 className="font-medium">{brand.name}</h4>
                          <p className="text-xs text-muted-foreground">{brand.country_origin}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBrand(brand.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {brand.market_share_uganda && (
                      <Badge variant="outline" className="mt-2">
                        {brand.market_share_uganda}% Uganda
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{brand.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setSelectedBrandId(brand.id)}
                    >
                      View Models
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Phone Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Phone Models</h3>
                <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" disabled={!selectedBrandId}>
                      <Plus className="w-4 h-4" />
                      Add Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Phone Model</DialogTitle>
                      <DialogDescription>
                        Add a new phone model under the selected brand.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="model-name">Model Name *</Label>
                          <Input
                            id="model-name"
                            placeholder="e.g., Galaxy S25, Spark 40"
                            value={modelForm.model_name}
                            onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model-code">Model Code *</Label>
                          <Input
                            id="model-code"
                            placeholder="e.g., SM-S925, TECNO-SP40"
                            value={modelForm.model_code}
                            onChange={(e) => setModelForm({ ...modelForm, model_code: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price-range">Price Range</Label>
                          <Select value={modelForm.price_range} onValueChange={(value) => setModelForm({ ...modelForm, price_range: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="mid-range">Mid-range</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="release-year">Release Year</Label>
                          <Input
                            id="release-year"
                            type="number"
                            placeholder="2024"
                            value={modelForm.release_year}
                            onChange={(e) => setModelForm({ ...modelForm, release_year: parseInt(e.target.value) || new Date().getFullYear() })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="screen-size">Screen Size</Label>
                          <Input
                            id="screen-size"
                            placeholder="e.g., 6.1 inch"
                            value={modelForm.screen_size}
                            onChange={(e) => setModelForm({ ...modelForm, screen_size: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="battery-capacity">Battery Capacity</Label>
                          <Input
                            id="battery-capacity"
                            placeholder="e.g., 4000mAh"
                            value={modelForm.battery_capacity}
                            onChange={(e) => setModelForm({ ...modelForm, battery_capacity: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storage-options">Storage Options (comma-separated)</Label>
                        <Input
                          id="storage-options"
                          placeholder="64GB, 128GB, 256GB"
                          value={modelForm.storage_options}
                          onChange={(e) => setModelForm({ ...modelForm, storage_options: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color-options">Color Options (comma-separated)</Label>
                        <Input
                          id="color-options"
                          placeholder="Black, Blue, White"
                          value={modelForm.color_options}
                          onChange={(e) => setModelForm({ ...modelForm, color_options: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="popular-uganda"
                          checked={modelForm.is_popular_uganda}
                          onChange={(e) => setModelForm({ ...modelForm, is_popular_uganda: e.target.checked })}
                        />
                        <Label htmlFor="popular-uganda">Popular in Uganda</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowModelDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateModel} disabled={!modelForm.model_name || !modelForm.model_code}>
                        Create Model
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Brand Selection for Models */}
              <div className="space-y-2">
                <Label>Select Brand to View/Add Models</Label>
                <Select value={selectedBrandId?.toString() || ""} onValueChange={(value) => setSelectedBrandId(value ? parseInt(value) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a brand to manage models..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{brand.icon}</span>
                          <span>{brand.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Models List */}
              {selectedBrandId && (
                <div className="space-y-4">
                  <h4 className="font-medium">
                    Models for {brands.find(b => b.id === selectedBrandId)?.name} ({models.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models.map((model) => (
                      <Card key={model.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium">{model.model_name}</h5>
                                {model.is_popular_uganda && (
                                  <Star className="w-4 h-4 text-yellow-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{model.model_code}</p>
                            </div>
                            <Badge className={`text-xs ${getPriceRangeColor(model.price_range)}`}>
                              {model.price_range}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {model.screen_size && <div>Screen: {model.screen_size}</div>}
                            {model.battery_capacity && <div>Battery: {model.battery_capacity}</div>}
                            {model.release_year && <div>Year: {model.release_year}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">📋 Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Add Brands:</strong> Create phone brands like Samsung, Tecno, Infinix, etc.</li>
            <li>• <strong>Add Models:</strong> Select a brand first, then add specific phone models</li>
            <li>• <strong>Market Data:</strong> Include Uganda market share for better insights</li>
            <li>• <strong>Popular Models:</strong> Mark models as popular in Uganda for better visibility</li>
            <li>• <strong>Auto-Update:</strong> Changes reflect immediately in device selection dropdowns</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
