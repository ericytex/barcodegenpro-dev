import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle, Smartphone, FileText, Sparkles, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { DeviceSelector, useDeviceSelector } from "@/components/DeviceSelector";
import { TemplateSelector } from "@/components/TemplateSelector";
import { BarcodeTemplate } from "@/utils/templateManager";
import { ExcelColumnPreview } from "@/components/ExcelColumnPreview";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function UploadPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [directGeneration, setDirectGeneration] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BarcodeTemplate | null>(null);
  const { uploadExcelAndGenerate, isLoading, error } = useBarcodeApi();
  
  // Device selector state
  const { selectedDevice, handleDeviceChange } = useDeviceSelector();

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      let templateId = selectedTemplate?.id;
      
      if (!templateId && selectedDevice?.specifications) {
        try {
          const specs = typeof selectedDevice.specifications === 'string' 
            ? JSON.parse(selectedDevice.specifications) 
            : selectedDevice.specifications;
          if (specs?.template_id) {
            templateId = specs.template_id;
          }
        } catch (e) {
          // Silently handle parsing errors
        }
      }

      const result = await uploadExcelAndGenerate(uploadedFile, {
        createPdf: true,
        pdfGridCols: 5,
        pdfGridRows: 12,
        autoGenerateSecondImei: true,
        deviceType: directGeneration ? selectedDevice?.device_type : undefined,
        deviceId: directGeneration ? selectedDevice?.id : undefined,
        templateId: templateId || undefined,
      });
      
      const templateInfo = selectedTemplate ? ` using template "${selectedTemplate.name}"` : '';
      toast.success(`Successfully processed ${uploadedFile.name}${templateInfo}! Generated ${result.generated_files.length} barcodes.`);
      setUploadedFile(null);
    } catch (error) {
      toast.error(`Failed to process file: ${error}`);
    } finally {
      setUploading(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Barcode Generator
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload Excel files to generate professional barcode labels automatically
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Section - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Device Selection Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-lg">
                      <Smartphone className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Device Selection</CardTitle>
                      <CardDescription>Choose your device type for specialized barcode generation</CardDescription>
                    </div>
                  </div>
                  {selectedDevice && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <DeviceSelector
                  value={selectedDevice}
                  onChange={handleDeviceChange}
                  placeholder="Select ITEL-BARCODES device type..."
                />
                {selectedDevice && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Device:</span>
                        <p className="font-semibold">{selectedDevice.brand} {selectedDevice.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model Code:</span>
                        <p className="font-semibold">{selectedDevice.model_code}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Excel Column Preview */}
            {selectedDevice && (
              <ExcelColumnPreview device={selectedDevice} />
            )}

            {/* Upload Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <Upload className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Upload Excel File</CardTitle>
                    <CardDescription>Drag and drop or select your Excel file to begin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Direct Generation Toggle */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <Label htmlFor="direct-generation" className="text-sm font-semibold cursor-pointer">
                        Direct Barcode Generation
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generate barcodes immediately without preview
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="direct-generation"
                    checked={directGeneration}
                    onCheckedChange={setDirectGeneration}
                  />
                </div>

                {/* File Upload Area */}
                <div 
                  {...getRootProps()} 
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive 
                      ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg' 
                      : uploadedFile 
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100/50' 
                        : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    {uploadedFile ? (
                      <>
                        <div className="p-4 bg-green-500 rounded-full">
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2 text-green-700">File Ready!</h3>
                          <p className="text-green-600 font-medium mb-1">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-primary/10 rounded-full">
                          <FileSpreadsheet className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">
                            {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel file'}
                          </h3>
                          <p className="text-muted-foreground mb-2">
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports .xlsx and .xls files
                          </p>
                        </div>
                      </>
                    )}
                    
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (uploadedFile) {
                          handleUpload();
                        }
                      }}
                      disabled={!uploadedFile || uploading || isLoading}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {uploading || isLoading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : uploadedFile ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {directGeneration ? 'Generate Barcodes' : 'Process File'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Template Selection - Show after file is uploaded */}
                {uploadedFile && (
                  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-lg text-purple-900">Template Selection</CardTitle>
                      </div>
                      <CardDescription className="text-purple-700">
                        Choose a barcode template to customize the layout and styling
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TemplateSelector
                        onTemplateSelect={setSelectedTemplate}
                        selectedTemplate={selectedTemplate}
                        disabled={uploading}
                      />
                    </CardContent>
                  </Card>
                )}

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Info and Help */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <Card className="border-2 shadow-lg sticky top-6">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">Quick Guide</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Select Device</p>
                      <p className="text-xs text-muted-foreground">Choose ITEL-BARCODES device type</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Upload File</p>
                      <p className="text-xs text-muted-foreground">Drag & drop your Excel file</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Generate</p>
                      <p className="text-xs text-muted-foreground">Click to create barcodes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expected Columns */}
            {!selectedDevice && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Expected Columns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium">IMEI</span>
                      <Badge variant="outline" className="ml-auto text-xs">Required</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <span>Model, Product, Color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <span>Box ID, DN</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
