import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, FolderOpen, Trash2, Download, Upload, Plus } from 'lucide-react';
import { TemplateManager, BarcodeTemplate, BarcodeComponent } from '@/utils/templateManager';

interface TemplateDialogProps {
  components: BarcodeComponent[];
  onLoadTemplate: (components: BarcodeComponent[]) => void;
  trigger?: React.ReactNode;
}

export const TemplateDialog: React.FC<TemplateDialogProps> = ({ 
  components, 
  onLoadTemplate,
  trigger 
}) => {
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<BarcodeTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const allTemplates = TemplateManager.getAllTemplates();
    setTemplates(allTemplates);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    const templateId = TemplateManager.saveTemplate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      components: components.map(comp => ({ ...comp })), // Deep copy
      canvasWidth: 600,
      canvasHeight: 200,
      backgroundColor: '#ffffff',
    });

    if (templateId) {
      setTemplateName('');
      setTemplateDescription('');
      loadTemplates();
      setActiveTab('load');
    }
  };

  const handleLoadTemplate = (template: BarcodeTemplate) => {
    onLoadTemplate(template.components);
    setIsOpen(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      TemplateManager.deleteTemplate(templateId);
      loadTemplates();
    }
  };

  const handleExportTemplate = (template: BarcodeTemplate) => {
    const json = TemplateManager.exportTemplate(template.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const templateId = TemplateManager.importTemplate(content);
      if (templateId) {
        loadTemplates();
        setActiveTab('load');
      } else {
        alert('Failed to import template. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const loadDefaultTemplate = () => {
    const defaultTemplate = TemplateManager.createDefaultTemplate();
    onLoadTemplate(defaultTemplate.components);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            Templates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Template Manager</DialogTitle>
        </DialogHeader>

        <div className="flex space-x-2 mb-4">
          <Button
            variant={activeTab === 'save' ? 'default' : 'outline'}
            onClick={() => setActiveTab('save')}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
          <Button
            variant={activeTab === 'load' ? 'default' : 'outline'}
            onClick={() => setActiveTab('load')}
            className="flex-1"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Load Template
          </Button>
        </div>

        {activeTab === 'save' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description..."
                rows={3}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {components.length} components will be saved
              </div>
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'load' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {templates.length} templates available
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDefaultTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Load Default
                </Button>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTemplate}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates saved yet</p>
                  <p className="text-sm">Save your first template to get started</p>
                </div>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTemplate(template);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {template.components.length} components
                          </Badge>
                          <Badge variant="outline">
                            {template.canvasWidth}×{template.canvasHeight}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                        >
                          Load Template
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
