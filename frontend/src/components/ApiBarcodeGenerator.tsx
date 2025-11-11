import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, BarChart3, Settings, RefreshCw, FileText, Image, Eye, Smartphone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { BarcodeItem, Device } from "@/lib/api";
import { toast } from "sonner";
import { AuthenticatedPdfPreview } from "@/components/AuthenticatedImagePreview";
import { DeviceSelector, useDeviceSelector } from "@/components/DeviceSelector";

interface ApiBarcodeGeneratorProps {
  data: any[];
  onBarcodeGenerated?: (files: string[]) => void;
}

export function ApiBarcodeGenerator({ data, onBarcodeGenerated }: ApiBarcodeGeneratorProps) {
  console.log('ApiBarcodeGenerator rendered with data:', data);
  console.log('ApiBarcodeGenerator data length:', data?.length);
  
  const {
    isLoading,
    error,
    generatedFiles,
    pdfFile,
    availableFiles,
    generateBarcodes,
    downloadFile,
    listFiles,
    createPdfFromExisting,
    clearError,
  } = useBarcodeApi();

  const [pdfGridCols, setPdfGridCols] = useState(4);
  const [pdfGridRows, setPdfGridRows] = useState(12);
  const [createPdf, setCreatePdf] = useState(true);
  
  // Device selector for overriding device information
  const { selectedDevice, handleDeviceChange } = useDeviceSelector();

  // Map data to our API format
  const mapDataToBarcodeItems = (data: any[]): BarcodeItem[] => {
    return data.map((item, index) => {
      // Try to map common field names
      const imei = item.imei || item.IMEI || item['IMEI/SN'] || item.serial || item.id || `item_${index}`;
      const boxId = item.box_id || item['Box ID'] || item.Boxid || item.boxId;
      
      // Use selected device data if available, otherwise use data from item
      const model = selectedDevice?.model_code || item.model || item.Model || item.product_model || 'Unknown';
      const product = item.product || item.Product || item.description;
      const color = item.color || item.Color;
      const dn = selectedDevice?.default_dn || item.dn || item.DN || item.dn_number || 'M8N7';

      return {
        imei: String(imei),
        box_id: boxId ? String(boxId) : undefined,
        model: String(model),
        product: product ? String(product) : undefined,
        color: color ? String(color) : undefined,
        dn: String(dn),
      };
    });
  };

  const handleGenerateBarcodes = async () => {
    if (data.length === 0) {
      toast.error("No data available to generate barcodes");
      return;
    }

    try {
      const barcodeItems = mapDataToBarcodeItems(data);
      await generateBarcodes(barcodeItems, {
        createPdf,
        pdfGridCols,
        pdfGridRows,
        deviceType: selectedDevice?.device_type,
        deviceId: selectedDevice?.id,
      });
      
      toast.success(`Successfully generated ${barcodeItems.length} barcodes`);
      onBarcodeGenerated?.(generatedFiles);
    } catch (err) {
      toast.error("Failed to generate barcodes");
    }
  };

  const handleDownloadFile = async (filename: string, isPdf: boolean = false) => {
    try {
      await downloadFile(filename, isPdf);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(`Failed to download ${filename}`);
    }
  };

  const handleCreatePdfFromExisting = async () => {
    try {
      await createPdfFromExisting({
        gridCols: pdfGridCols,
        gridRows: pdfGridRows,
      });
      toast.success("PDF created from existing barcodes");
    } catch (err) {
      toast.error("Failed to create PDF");
    }
  };

  useEffect(() => {
    // Load available files on component mount
    listFiles();
  }, [listFiles]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const availableFields = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'id') : [];

  return (
    <div className="space-y-6">
      {/* Generation Settings */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Barcode Generation Settings
          </CardTitle>
          <CardDescription>
            Configure settings for generating professional barcode labels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Device Selection (Optional)
            </Label>
            <DeviceSelector
              value={selectedDevice}
              onChange={handleDeviceChange}
              placeholder="Select a device type for specialized barcode generation (e.g., Itel Vision 7 Plus)..."
            />
            {selectedDevice && (
              <div className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>Selected Device:</strong> {selectedDevice.brand} {selectedDevice.name}
                <br />
                <strong>Type:</strong> {selectedDevice.device_type}
                <br />
                <strong>Model Code:</strong> {selectedDevice.model_code}
                <br />
                <strong>Default D/N:</strong> {selectedDevice.default_dn}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select a device type (e.g., Itel phones) to generate specialized barcodes with custom templates.
            </p>
          </div>

          {/* PDF Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="create-pdf"
                checked={createPdf}
                onCheckedChange={setCreatePdf}
              />
              <Label htmlFor="create-pdf">Create PDF collection</Label>
            </div>

            {createPdf && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-cols">PDF Columns</Label>
                  <Input
                    id="pdf-cols"
                    type="number"
                    min="1"
                    max="10"
                    value={pdfGridCols}
                    onChange={(e) => setPdfGridCols(parseInt(e.target.value) || 4)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdf-rows">PDF Rows</Label>
                  <Input
                    id="pdf-rows"
                    type="number"
                    min="1"
                    max="20"
                    value={pdfGridRows}
                    onChange={(e) => setPdfGridRows(parseInt(e.target.value) || 12)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data Preview */}
          <div className="space-y-2">
            <Label>Data Preview</Label>
            <div className="text-sm text-muted-foreground">
              {data.length} items ready for processing
            </div>
            {availableFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableFields.map((field) => (
                  <Badge key={field} variant="secondary">
                    {field}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="space-y-3">
            <Button
              onClick={handleGenerateBarcodes}
              disabled={isLoading || data.length === 0}
              className="w-full gradient-primary"
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Barcodes...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate {data.length} Barcodes
                </>
              )}
            </Button>
            
            {/* Quick PDF Download */}
            {pdfFile && (
              <Button
                onClick={() => handleDownloadFile(pdfFile, true)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF Collection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(generatedFiles.length > 0 || pdfFile) && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Generated Files
            </CardTitle>
            <CardDescription>
              Your barcodes have been generated successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Generated Files */}
            {generatedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Generated Files ({generatedFiles.length})</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {generatedFiles.map((filename) => (
                      <div
                        key={filename}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{filename}</span>
                        </div>
                        <Badge variant="secondary">PNG</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">Individual PNG files are included in the PDF collection below</p>
              </div>
            )}

            {/* PDF File */}
            {pdfFile && (
              <div className="space-y-2">
                <Label>PDF Collection</Label>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span className="font-medium">{pdfFile}</span>
                    <Badge variant="secondary">PDF</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadFile(pdfFile, true)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download PDF
                  </Button>
                </div>

                {/* Authenticated PDF Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="h-[540px] w-full border rounded-md overflow-hidden bg-white">
                    <AuthenticatedPdfPreview
                      filename={pdfFile}
                      className="w-full h-full"
                      fallbackText="Loading PDF preview..."
                      onError={(error) => {
                        console.error('PDF preview error:', error);
                        toast.error(`Failed to load PDF preview: ${error.message}`);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Files */}
      {availableFiles.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Available Files
            </CardTitle>
            <CardDescription>
              All generated files in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {availableFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {file.mime_type === 'application/pdf' ? (
                        <FileText className="w-4 h-4 text-red-600" />
                      ) : (
                        <Image className="w-4 h-4 text-blue-600" />
                      )}
                      <div>
                        <span className="text-sm font-medium">{file.filename}</span>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB • {new Date(file.modified).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadFile(file.filename, file.mime_type === 'application/pdf')}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create PDF from Existing */}
      {availableFiles.some(f => f.mime_type === 'image/png') && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Create PDF from Existing Barcodes</CardTitle>
            <CardDescription>
              Generate a new PDF collection from existing barcode images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreatePdfFromExisting}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create PDF Collection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
