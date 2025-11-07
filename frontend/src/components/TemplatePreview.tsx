import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarcodeTemplate } from '@/utils/templateManager';
import { Eye, Palette, Square } from 'lucide-react';
import { generateBarcodeDataURL, generateQRCodeDataURL } from '@/utils/barcodeGenerator';

interface TemplatePreviewProps {
  template: BarcodeTemplate | null;
}

interface ComponentPreview {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, any>;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template }) => {
  const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  // Parse template components for preview
  const components: ComponentPreview[] = useMemo(() => {
    if (!template) {
      return [];
    }
    
    try {
      let componentsArray: any[] = [];
      
      // Handle both string and array formats
      if (typeof template.components === 'string') {
        // Parse JSON string
        componentsArray = JSON.parse(template.components);
      } else if (Array.isArray(template.components)) {
        // Use array directly
        componentsArray = template.components;
      }
      
      // Convert to ComponentPreview format, handling backend structure
      return componentsArray.map((comp: any) => ({
        id: comp.id || Math.random().toString(36),
        type: comp.type || 'text',
        x: comp.x || 0,
        y: comp.y || 0,
        width: comp.width || 100,
        height: comp.height || 30,
        props: comp.properties || comp.props || {} // Backend uses 'properties', frontend uses 'props'
      }));
    } catch (error) {
      console.error('Error parsing template components:', error);
      return [];
    }
  }, [template]);

  // Sample data for preview rendering
  const sampleData = {
    text: 'SAMPLE TEXT',
    barcode: '123456789012345',
    qrcode: 'https://example.com',
    imei: '123456789012345',
    model: 'A669L',
    color: 'SAPPHIRE BLACK',
    vc: '874478',
    storage: '64+2'
  };

  // Generate images for barcode and QR components (same as Design tab)
  useEffect(() => {
    if (!components.length) return;

    const generateBarcodeImage = async (component: ComponentPreview) => {
      try {
        const dataURL = await generateBarcodeDataURL({
          value: component.props.value || component.props.text || '1234567890',
          format: component.props.format || 'CODE128',
          width: Math.min(component.width, 300),
          height: Math.min(component.height, 100),
          displayValue: false,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 2,
        });
        setBarcodeImages(prev => ({ ...prev, [component.id]: dataURL }));
      } catch (error) {
        console.error('Error generating barcode image:', error);
      }
    };

    const generateQRImage = async (component: ComponentPreview) => {
      try {
        const dataURL = await generateQRCodeDataURL({
          value: component.props.value || component.props.text || 'https://example.com',
          width: Math.min(component.width, component.height, 100),
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setQrImages(prev => ({ ...prev, [component.id]: dataURL }));
      } catch (error) {
        console.error('Error generating QR image:', error);
      }
    };

    components.forEach(component => {
      if (component.type === 'barcode' && !barcodeImages[component.id]) {
        generateBarcodeImage(component);
      } else if (component.type === 'qr' && !qrImages[component.id]) {
        generateQRImage(component);
      }
    });
  }, [components, barcodeImages, qrImages]);

  const renderComponent = async (canvas: HTMLCanvasElement, component: ComponentPreview) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height, type, props } = component;

    ctx.save();

    // Apply component positioning and sizing
    ctx.translate(x, y);

    // Set styling based on component type
    switch (type) {
      case 'text':
        ctx.fillStyle = props.color || '#000000';
        ctx.font = `${props.fontWeight || 'normal'} ${props.fontSize || 16}px ${props.fontFamily || 'Arial'}`;
        ctx.textBaseline = 'alphabetic'; // Use alphabetic baseline for proper text rendering
        const text = props.text || sampleData.text || 'Sample Text';
        const letterSpacing = props.letterSpacing || 0;
        
        if (letterSpacing !== 0) {
          // Render with letter spacing
          let currentX = 0;
          const textY = height - 5;
          for (let i = 0; i < text.length; i++) {
            ctx.fillText(text[i], currentX, textY);
            const charMetrics = ctx.measureText(text[i]);
            currentX += charMetrics.width + letterSpacing;
          }
        } else {
          // Render normally
          ctx.fillText(text, 0, height - 5);
        }
        break;
        
      case 'barcode':
        // Use real barcode image if available
        if (barcodeImages[component.id]) {
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                resolve();
              };
              img.onerror = reject;
              img.src = barcodeImages[component.id];
            });
          } catch (error) {
            console.error('Error rendering barcode image:', error);
            // Fallback to simple representation
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            for (let i = 0; i < width; i += 4) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i + (Math.random() > 0.5 ? 2 : 1), height);
              ctx.stroke();
            }
          }
        }
        break;
        
      case 'qr':
        // Use real QR image if available
        if (qrImages[component.id]) {
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                resolve();
              };
              img.onerror = reject;
              img.src = qrImages[component.id];
            });
          } catch (error) {
            console.error('Error rendering QR image:', error);
            // Fallback to simple representation
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, Math.min(width, height), Math.min(width, height));
          }
        }
        break;
        
      case 'rectangle':
        ctx.strokeStyle = props.strokeColor || props.color || '#000000';
        ctx.lineWidth = props.strokeWidth || props.borderWidth || 1;
        if (props.fillColor && props.fillColor !== 'transparent') {
          ctx.fillStyle = props.fillColor;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.strokeRect(0, 0, width, height);
        break;
        
      case 'line':
        ctx.strokeStyle = props.color || '#000000';
        ctx.lineWidth = props.lineWidth || 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        break;
        
      case 'circle':
        ctx.strokeStyle = props.color || '#000000';
        ctx.lineWidth = props.borderWidth || 1;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 1, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      default:
        // Generic component representation
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        ctx.fillStyle = '#cccccc';
        ctx.font = '12px Arial';
        ctx.fillText(type.toUpperCase(), 5, height / 2);
    }

    ctx.restore();
  };

  React.useEffect(() => {
    if (!document || !previewCanvasRef.current || !template) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale down the canvas for preview
    const scale = 0.3;
    const canvasWidth = template.canvasWidth * scale;
    const canvasHeight = template.canvasHeight * scale;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw border
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvasWidth - 1, canvasHeight - 1);

    // Render components (use async rendering for images)
    const renderAllComponents = async () => {
      for (const component of components) {
        const scaledComponent = {
          ...component,
          x: component.x * scale,
          y: component.y * scale,
          width: component.width * scale,
          height: component.height * scale
        };
        await renderComponent(canvas, scaledComponent);
      }
    };
    renderAllComponents();
  }, [template, components, barcodeImages, qrImages]);

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Template Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select a template to preview</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Template Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Info */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{template.name}</h4>
              <p className="text-sm text-muted-foreground">
                {template.canvasWidth}×{template.canvasHeight}px • {components.length} components
              </p>
            </div>
            <Badge variant="outline">{components.length} components</Badge>
          </div>

          {/* Canvas Preview */}
          <div className="border rounded-lg bg-white p-4">
            <div className="flex justify-center">
              <canvas
                ref={previewCanvasRef}
                className="border border-gray-200 rounded shadow-sm"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Scaled preview of the selected template
            </p>
          </div>

          {/* Component Breakdown */}
          {components.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Components:</h5>
              <div className="flex flex-wrap gap-1">
                {components.map((component, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {component.type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
