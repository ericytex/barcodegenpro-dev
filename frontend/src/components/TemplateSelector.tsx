import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TemplateManager, BarcodeTemplate } from '@/utils/templateManager';
import { FileText, Calendar, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateSelectorProps {
  onTemplateSelect: (template: BarcodeTemplate | null) => void;
  selectedTemplate: BarcodeTemplate | null;
  disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  selectedTemplate,
  disabled = false
}) => {
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    
    try {
      const allTemplates = await TemplateManager.getAllTemplates();
      
      setTemplates(allTemplates);
    } catch (error) {
      console.error('❌ TemplateSelector - Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      onTemplateSelect(null);
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
      toast.success(`Selected template: ${template.name}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Barcode Template Selection
        </CardTitle>
        <CardDescription>
          Choose a template to apply to your barcode generation. Templates define the layout, components, and styling.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="template-select">Select Template</Label>
          <Select
            value={selectedTemplate?.id || 'none'}
            onValueChange={handleTemplateChange}
            disabled={disabled || loading}
          >
            <SelectTrigger id="template-select" className="w-full">
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span>No Template (Default)</span>
                  <Badge variant="outline" className="text-xs">Default</Badge>
                </div>
              </SelectItem>
              {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Array.isArray(template.components) ? template.components.length : 0} components
                  </Badge>
                </div>
              </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Template Preview */}
        {selectedTemplate && (
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-700">Selected Template</h4>
              </div>
              <Badge variant="outline" className="text-xs">
                {Array.isArray(selectedTemplate.components) ? selectedTemplate.components.length : 0} components
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div>
                <h5 className="font-medium">{selectedTemplate.name}</h5>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Created: {formatDate(selectedTemplate.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Canvas: {selectedTemplate.canvasWidth}×{selectedTemplate.canvasHeight}px</span>
                </div>
              </div>

              {/* Component Summary */}
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Components:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(selectedTemplate.components) 
                    ? selectedTemplate.components.map((component, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {component.type}
                        </Badge>
                      ))
                    : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Template Selected */}
        {!selectedTemplate && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-blue-700">Default Generation</h4>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              No template selected. Barcodes will be generated using the default format.
            </p>
          </div>
        )}

        {/* Template Count */}
        <div className="text-xs text-muted-foreground text-center">
          {templates.length} template{templates.length !== 1 ? 's' : ''} available
        </div>
      </CardContent>
    </Card>
  );
};
