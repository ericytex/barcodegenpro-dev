import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, BarChart3, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { BarcodeItem, Device } from "@/lib/api";
import { toast } from "sonner";
import { AuthenticatedImagePreview, AuthenticatedPdfPreview } from "@/components/AuthenticatedImagePreview";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DeviceSelector, useDeviceSelector } from "@/components/DeviceSelector";

function TestPage() {
  const [testImei, setTestImei] = useState("359827134443046");
  const [testBoxId, setTestBoxId] = useState("BOX001");
  const [testModel, setTestModel] = useState("X6525D");
  const [testProduct, setTestProduct] = useState("SMART 8 64+3 SHINY GOLD");
  const [testDn, setTestDn] = useState("M8N7");
  
  // Device selector state
  const { selectedDevice, handleDeviceChange } = useDeviceSelector();

  const {
    isLoading,
    error,
    generatedFiles,
    pdfFile,
    availableFiles,
    generateBarcodes,
    downloadFile,
    listFiles,
    clearError,
  } = useBarcodeApi();

  const handleTestGeneration = async () => {
    // Use selected device data if available, otherwise use manual inputs
    const testItem: BarcodeItem = {
      imei: testImei,
      box_id: testBoxId,
      model: selectedDevice?.model_code || testModel,
      product: testProduct,
      dn: selectedDevice?.default_dn || testDn,
    };

    try {
      await generateBarcodes([testItem], {
        createPdf: true,
        pdfGridCols: 5,
        pdfGridRows: 12,
      });
      
      toast.success("Test barcode generated successfully!");
      await listFiles(); // Refresh file list
    } catch (err) {
      toast.error("Failed to generate test barcode");
    }
  };

  const handleDownloadTest = async (filename: string, isPdf: boolean = false) => {
    try {
      await downloadFile(filename, isPdf);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(`Failed to download ${filename}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
            API Integration Test
          </h1>
        <p className="text-lg text-muted-foreground">
          Test the connection between frontend and backend API
        </p>
      </div>

      {/* Test Data Input */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-primary" />
            Test Data Input
          </CardTitle>
          <CardDescription>
            Enter test data to generate a sample barcode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Selector */}
          <div className="space-y-2">
            <Label>Select Device (Optional)</Label>
            <DeviceSelector
              value={selectedDevice}
              onChange={handleDeviceChange}
              placeholder="Choose a device or enter manually below..."
            />
            {selectedDevice && (
              <div className="text-sm text-muted-foreground">
                Using device: <strong>{selectedDevice.brand} {selectedDevice.name}</strong> - 
                Model: {selectedDevice.model_code}, D/N: {selectedDevice.default_dn}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-imei">IMEI</Label>
              <Input
                id="test-imei"
                value={testImei}
                onChange={(e) => setTestImei(e.target.value)}
                placeholder="Enter IMEI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-box-id">Box ID</Label>
              <Input
                id="test-box-id"
                value={testBoxId}
                onChange={(e) => setTestBoxId(e.target.value)}
                placeholder="Enter Box ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-model">Model</Label>
              <Input
                id="test-model"
                value={selectedDevice?.model_code || testModel}
                onChange={(e) => setTestModel(e.target.value)}
                placeholder={selectedDevice ? `Using: ${selectedDevice.model_code}` : "Enter Model"}
                disabled={!!selectedDevice}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-dn">D/N</Label>
              <Input
                id="test-dn"
                value={selectedDevice?.default_dn || testDn}
                onChange={(e) => setTestDn(e.target.value)}
                placeholder={selectedDevice ? `Using: ${selectedDevice.default_dn}` : "Enter D/N"}
                disabled={!!selectedDevice}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-product">Product</Label>
            <Input
              id="test-product"
              value={testProduct}
              onChange={(e) => setTestProduct(e.target.value)}
              placeholder="Enter Product (color will be extracted automatically)"
            />
          </div>

          {/* Debug info */}
          <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
            Debug: isLoading={isLoading.toString()}, testImei="{testImei}" (len: {testImei.length}), trimmed: "{testImei.trim()}" (len: {testImei.trim().length}), disabled={String(isLoading || !testImei.trim())}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleTestGeneration}
              disabled={isLoading || !testImei.trim()}
              className="w-full gradient-primary"
              size="lg"
            >
              {isLoading ? (
                <>
                  <BarChart3 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Test Barcode...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Generate Test Barcode
                </>
              )}
            </Button>
            
            {/* Quick PDF Download */}
            {pdfFile && (
              <Button
                onClick={() => handleDownloadTest(pdfFile, true)}
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

      {/* Error Display */}
      {error && (
        <Card className="shadow-elegant border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={clearError}
              className="mt-2"
            >
              Clear Error
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Files */}
      {(generatedFiles.length > 0 || pdfFile) && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Generated Test Files
            </CardTitle>
            <CardDescription>
              Files generated from the test data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PNG Files */}
            {generatedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>PNG Files ({generatedFiles.length})</Label>
                
                {/* First Barcode Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">First Barcode Preview</Label>
                  <div className="border rounded-lg p-4 bg-white">
                    <AuthenticatedImagePreview
                      filename={generatedFiles[0]}
                      alt={`Barcode preview: ${generatedFiles[0]}`}
                      className="max-w-full max-h-64 object-contain mx-auto"
                      fallbackText="Loading preview..."
                      onError={(error) => {
                        console.error('Preview error:', error);
                        toast.error(`Failed to load preview: ${error.message}`);
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">All Generated Files</Label>
                  {generatedFiles.map((filename) => (
                    <div
                      key={filename}
                      className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">PNG</Badge>
                          <span className="text-sm font-medium">{filename}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadTest(filename, false)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      {/* Authenticated Image Preview */}
                      <div className="mt-2">
                        <AuthenticatedImagePreview
                          filename={filename}
                          alt={`Barcode preview: ${filename}`}
                          className="max-w-sm max-h-48 object-contain border rounded"
                          fallbackText="Loading preview..."
                          onError={(error) => {
                            console.error('Preview error:', error);
                            toast.error(`Failed to load preview: ${error.message}`);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF File */}
            {pdfFile && (
              <div className="space-y-2">
                <Label>PDF Collection</Label>
                <div className="space-y-4">
                  {/* PDF Download Section */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">PDF</Badge>
                      <span className="font-medium">{pdfFile}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadTest(pdfFile, true)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download PDF
                    </Button>
                  </div>
                  
                  {/* PDF Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">PDF Preview</Label>
                    <div className="h-96 w-full border rounded-md overflow-hidden bg-white">
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Files */}
      {availableFiles.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>All Available Files</CardTitle>
            <CardDescription>
              All files currently in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {availableFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={file.mime_type === 'application/pdf' ? 'destructive' : 'secondary'}>
                        {file.mime_type === 'application/pdf' ? 'PDF' : 'PNG'}
                      </Badge>
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
                      onClick={() => handleDownloadTest(file.filename, file.mime_type === 'application/pdf')}
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
      </div>
    </DashboardLayout>
  );
}

export default TestPage;
