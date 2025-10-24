import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Smartphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { DeviceSelector, useDeviceSelector } from "@/components/DeviceSelector";
import { TemplateSelector } from "@/components/TemplateSelector";
import { BarcodeTemplate } from "@/utils/templateManager";
import { toast } from "sonner";

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
      const result = await uploadExcelAndGenerate(uploadedFile, {
        createPdf: true,
        pdfGridCols: 5,
        pdfGridRows: 12,
        autoGenerateSecondImei: true,
        deviceType: directGeneration ? selectedDevice?.device_type : undefined,
        deviceId: directGeneration ? selectedDevice?.id : undefined,
        templateId: selectedTemplate?.id, // Include template ID if selected
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
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Upload Excel Files</h1>
          <p className="text-muted-foreground">
            Upload your Excel files to generate barcode labels automatically
          </p>
        </div>

        {/* Upload Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Excel File Upload
            </CardTitle>
            <CardDescription>
              Upload your Excel file to process data or generate barcodes directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Direct Barcode Generation Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  id="direct-generation"
                  checked={directGeneration}
                  onCheckedChange={setDirectGeneration}
                />
                <Label htmlFor="direct-generation" className="text-sm font-medium">
                  Direct Barcode Generation
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                {directGeneration ? "Enabled" : "Disabled"}
              </div>
            </div>

            {/* Device Selection - Only show when direct generation is enabled */}
            {directGeneration && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">Device Type Selection</Label>
                </div>
                <div className="space-y-2">
                  <div className="p-4 bg-red-100 border border-red-300 rounded">
                    <p className="text-red-700 font-bold">TEST: DeviceSelector should be here!</p>
                    <p className="text-red-600 text-sm">If you see this, the conditional rendering is working.</p>
                  </div>
                  <DeviceSelector
                    value={selectedDevice}
                    onChange={handleDeviceChange}
                    placeholder="Select device type for specialized barcode generation..."
                  />
                  {selectedDevice && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                      <strong>Selected Device:</strong> {selectedDevice.brand} {selectedDevice.name}
                      <br />
                      <strong>Type:</strong> {selectedDevice.device_type}
                      <br />
                      <strong>Model:</strong> {selectedDevice.model_code}
                      <br />
                      <strong>Default D/N:</strong> {selectedDevice.default_dn}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select a device type to generate specialized barcodes. Leave empty for default generation.
                  </p>
                </div>
              </div>
            )}

            {/* Debug: Show if directGeneration is true */}
            {directGeneration && (
              <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                DEBUG: Direct generation is enabled. DeviceSelector should be visible above.
              </div>
            )}

            {/* Template Selection - Show after file is uploaded */}
            {uploadedFile && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm font-medium text-purple-700">Template Selection</Label>
                </div>
                <p className="text-xs text-purple-600">
                  Choose a barcode template to apply to your generation. This will define the layout and styling of your barcodes.
                </p>
                <TemplateSelector
                  onTemplateSelect={setSelectedTemplate}
                  selectedTemplate={selectedTemplate}
                  disabled={uploading}
                />
              </div>
            )}

            {/* Mode Indicator */}
            <div className={`p-4 rounded-lg border ${
              directGeneration 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className={`w-4 h-4 ${
                  directGeneration ? 'text-green-600' : 'text-blue-600'
                }`} />
                <span className={`text-sm font-medium ${
                  directGeneration ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {directGeneration ? 'Direct Generation Mode' : 'Data Preview Mode'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${
                directGeneration ? 'text-green-600' : 'text-blue-600'
              }`}>
                {directGeneration 
                  ? 'Upload Excel file to generate barcodes directly with device-specific formatting.'
                  : 'Upload Excel file to preview data and select which records to generate barcodes for.'
                }
              </p>
            </div>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : uploadedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              
              {uploadedFile ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-green-700">File Selected!</h3>
                  <p className="text-green-600 mb-4">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {isDragActive ? 'Drop your Excel file here' : 'Drag & drop your Excel file here, or click to select'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Supports .xlsx and .xls files
                  </p>
                </div>
              )}
              
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (uploadedFile) {
                    handleUpload();
                  }
                }}
                disabled={!uploadedFile || uploading || isLoading}
                className="mt-4"
              >
                {uploading || isLoading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : uploadedFile ? (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {directGeneration ? 'Generate Barcodes' : 'Upload & Preview Data'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>

            {/* Expected Columns Note */}
            <div className="text-sm text-muted-foreground">
              <p><strong>Expected columns:</strong> imei, box_id, model, product, color, dn</p>
              <p className="mt-1"><strong>Note:</strong> The 'product' column will be used to automatically extract colors.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these simple steps to generate your barcodes with templates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h4 className="font-semibold">Upload Excel File</h4>
                <p className="text-sm text-muted-foreground">
                  Upload your Excel file containing the data you want to convert to barcodes.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h4 className="font-semibold">Choose Template</h4>
                <p className="text-sm text-muted-foreground">
                  Select a barcode template to define the layout and styling of your barcodes.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold">Select Records</h4>
                <p className="text-sm text-muted-foreground">
                  Choose which records from your Excel file to generate barcodes for.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-primary">4</span>
                </div>
                <h4 className="font-semibold">Generate & Download</h4>
                <p className="text-sm text-muted-foreground">
                  Generate barcodes using your selected template and download the results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
