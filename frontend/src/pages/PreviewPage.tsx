import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Eye, Download, RefreshCw, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { useEffect, useState } from "react";
import { AuthenticatedImagePreview, AuthenticatedPdfPreview } from "@/components/AuthenticatedImagePreview";

export default function PreviewPage() {
  const { availableFiles, listFiles, isLoading, error } = useBarcodeApi();
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRecords: 0,
    validRecords: 0,
    errors: 0
  });

  useEffect(() => {
    listFiles();
  }, [listFiles]);

  // Calculate stats from available files
  useEffect(() => {
    const pngFiles = availableFiles.filter(file => file.filename.endsWith('.png'));
    const pdfFiles = availableFiles.filter(file => file.filename.endsWith('.pdf'));
    
    setStats({
      totalRecords: pngFiles.length,
      validRecords: pngFiles.length, // Assuming all generated files are valid
      errors: 0
    });
  }, [availableFiles]);
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Data Preview</h1>
          <p className="text-muted-foreground">
            Preview and validate your uploaded Excel data before generating barcodes
          </p>
        </div>

        {/* Data Preview Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Data Preview
            </CardTitle>
            <CardDescription>
              Review your data to ensure accuracy before barcode generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {availableFiles.length > 0 ? `${availableFiles.length} files loaded` : 'No data loaded'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={listFiles} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {availableFiles.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File List */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">PNG Files ({stats.totalRecords})</h4>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {availableFiles
                        .filter(file => file.filename.endsWith('.png'))
                        .map((file, index) => (
                          <div 
                            key={file.filename} 
                            className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-colors ${
                              selectedFile === file.filename 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedFile(file.filename)}
                          >
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="truncate flex-1">{file.filename}</span>
                            <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)}KB</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">PDF Collections ({availableFiles.filter(f => f.filename.endsWith('.pdf')).length})</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {availableFiles
                        .filter(file => file.filename.endsWith('.pdf'))
                        .map((file, index) => (
                          <div 
                            key={file.filename} 
                            className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-colors ${
                              selectedFile === file.filename 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedFile(file.filename)}
                          >
                            <CheckCircle className="w-3 h-3 text-blue-600" />
                            <span className="truncate flex-1">{file.filename}</span>
                            <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Preview</h4>
                    {selectedFile && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedFile(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {selectedFile ? (
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="mb-3">
                        <h5 className="font-medium text-sm">{selectedFile}</h5>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.endsWith('.pdf') ? 'PDF Collection' : 'PNG Barcode'} • 
                          {availableFiles.find(f => f.filename === selectedFile)?.size && 
                            (selectedFile.endsWith('.pdf') 
                              ? `${(availableFiles.find(f => f.filename === selectedFile)!.size / 1024 / 1024).toFixed(1)} MB`
                              : `${(availableFiles.find(f => f.filename === selectedFile)!.size / 1024).toFixed(0)} KB`
                            )
                          }
                        </p>
                      </div>
                      
                      <div className="h-64 w-full border rounded-md overflow-hidden bg-gray-50">
                        {selectedFile.endsWith('.pdf') ? (
                          <AuthenticatedPdfPreview
                            filename={selectedFile}
                            className="w-full h-full"
                            fallbackText="Loading PDF preview..."
                            onError={(error) => {
                              console.error('PDF preview error:', error);
                            }}
                          />
                        ) : (
                          <AuthenticatedImagePreview
                            filename={selectedFile}
                            alt={`Barcode preview: ${selectedFile}`}
                            className="w-full h-full object-contain"
                            fallbackText="Loading barcode preview..."
                            onError={(error) => {
                              console.error('Barcode preview error:', error);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 bg-muted/20 text-center">
                      <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
                      <p className="text-muted-foreground">
                        Click on a file to preview it here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload an Excel file to preview your data here
                  </p>
                  <Button onClick={() => window.location.href = '/upload'}>
                    <Download className="w-4 h-4 mr-2" />
                    Upload Excel File
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRecords > 0 ? 'Records loaded' : 'No data loaded'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valid Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.validRecords}</div>
              <p className="text-xs text-muted-foreground">Ready for generation</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <p className="text-xs text-muted-foreground">Issues found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
