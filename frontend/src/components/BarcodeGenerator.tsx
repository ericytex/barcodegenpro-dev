import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, Settings, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  data: any[];
  onBarcodeGenerated?: (barcodes: GeneratedBarcode[]) => void;
}

interface GeneratedBarcode {
  id: string;
  data: any;
  svg: string;
  type: string;
}

const barcodeTypes = [
  { value: 'CODE128', label: 'CODE128 (General Purpose)' },
  { value: 'EAN13', label: 'EAN13 (Products)' },
  { value: 'EAN8', label: 'EAN8 (Small Products)' },
  { value: 'UPC', label: 'UPC (US Products)' },
  { value: 'CODE39', label: 'CODE39 (Alphanumeric)' },
  { value: 'ITF14', label: 'ITF14 (Shipping)' },
];

export function BarcodeGenerator({ data, onBarcodeGenerated }: BarcodeGeneratorProps) {
  const [barcodeType, setBarcodeType] = useState('CODE128');
  const [dataField, setDataField] = useState<string>('');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<GeneratedBarcode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const availableFields = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'id') : [];

  useEffect(() => {
    if (availableFields.length > 0 && !dataField) {
      setDataField(availableFields[0]);
    }
  }, [availableFields, dataField]);

  const generateBarcodes = async () => {
    if (!dataField || data.length === 0) return;
    
    setIsGenerating(true);
    const barcodes: GeneratedBarcode[] = [];

    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const barcodeData = String(item[dataField] || '').trim();
        
        if (barcodeData) {
          // Create a temporary canvas for each barcode
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            try {
              JsBarcode(canvas, barcodeData, {
                format: barcodeType,
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 10,
              });

              // Convert canvas to SVG-like data URL
              const svg = canvas.toDataURL('image/png');
              
              barcodes.push({
                id: `barcode-${i}`,
                data: item,
                svg,
                type: barcodeType,
              });
            } catch (error) {
              console.warn(`Failed to generate barcode for: ${barcodeData}`, error);
            }
          }
        }

        // Add small delay for smooth progress
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setGeneratedBarcodes(barcodes);
      onBarcodeGenerated?.(barcodes);
    } catch (error) {
      console.error('Error generating barcodes:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBarcodes = () => {
    if (generatedBarcodes.length === 0) return;

    // Create a simple HTML page with all barcodes
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Generated Barcodes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .barcode-item { margin: 20px 0; page-break-inside: avoid; }
            .barcode-info { margin-bottom: 10px; font-size: 12px; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          <h1>Generated Barcodes (${barcodeType})</h1>
          ${generatedBarcodes.map((barcode, index) => `
            <div class="barcode-item">
              <div class="barcode-info">
                <strong>Item ${index + 1}:</strong> ${barcode.data[dataField]}
              </div>
              <img src="${barcode.svg}" alt="Barcode ${index + 1}" />
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes-${barcodeType}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No data selected for barcode generation</p>
            <p className="text-sm text-muted-foreground mt-1">Select data from the preview table first</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Barcode Configuration
          </CardTitle>
          <CardDescription>
            Configure your barcode generation settings
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Barcode Type</label>
              <Select value={barcodeType} onValueChange={setBarcodeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {barcodeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Field</label>
              <Select value={dataField} onValueChange={setDataField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field for barcode" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Badge variant="secondary" className="text-xs">
              {data.length} items selected
            </Badge>
            <Button
              onClick={generateBarcodes}
              disabled={isGenerating || !dataField}
              className="gradient-primary border-0 text-white transition-smooth hover:shadow-glow"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Barcodes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Barcodes */}
      {generatedBarcodes.length > 0 && (
        <Card className="shadow-elegant transition-smooth hover:shadow-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-success" />
                  Generated Barcodes
                </CardTitle>
                <CardDescription>
                  {generatedBarcodes.length} barcodes generated successfully
                </CardDescription>
              </div>
              
              <Button
                onClick={downloadBarcodes}
                className="gradient-secondary border-0 text-white transition-smooth hover:shadow-glow"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[500px] w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedBarcodes.map((barcode, index) => (
                  <div
                    key={barcode.id}
                    className="border rounded-lg p-4 bg-card hover:bg-muted/30 transition-smooth"
                  >
                    <div className="text-center space-y-2">
                      <img
                        src={barcode.svg}
                        alt={`Barcode ${index + 1}`}
                        className="mx-auto max-w-full h-auto"
                      />
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium">{barcode.data[dataField]}</div>
                        <div>{barcode.type}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for barcode generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}