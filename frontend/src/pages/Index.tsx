import { DashboardLayout } from "@/components/DashboardLayout";
import { ApiFileUpload } from "@/components/ApiFileUpload";
import { DataTable } from "@/components/DataTable";
import { ApiBarcodeGenerator } from "@/components/ApiBarcodeGenerator";
import { ApiConnectionTest } from "@/components/ApiConnectionTest";
import { SecurityStatusCard } from "@/components/SecurityStatusCard";
import { AuthenticatedImagePreview, AuthenticatedPdfPreview } from "@/components/AuthenticatedImagePreview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { BarChart3, Upload, FileSpreadsheet, Zap, Shield, Download, Eye, Database, Archive, Plus, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { apiService } from "@/lib/api";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { toast } from "sonner";

const Index = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [selectedDataForBarcodes, setSelectedDataForBarcodes] = useState<any[]>([]);
  const [directGenerationResults, setDirectGenerationResults] = useState<{
    files: string[];
    pdfFile?: string;
  } | null>(null);

  // Use the barcode API hook
  const { 
    databaseFiles, 
    archiveStatistics, 
    getDatabaseFiles, 
    getArchiveStatistics,
    isLoading: apiLoading 
  } = useBarcodeApi();

  // Load database data on component mount
  useEffect(() => {
    getDatabaseFiles();
    getArchiveStatistics();
  }, [getDatabaseFiles, getArchiveStatistics]);

  const handleFileUploaded = (data: any[]) => {
    setUploadedData(data);
    setSelectedDataForBarcodes([]);
    setDirectGenerationResults(null); // Clear direct generation results when uploading new file
  };

  const handleGenerateBarcodes = (selectedData: any[]) => {
    setSelectedDataForBarcodes(selectedData);
    setDirectGenerationResults(null); // Clear direct generation results when using normal flow
  };

  const handleDirectGeneration = async (files: string[], pdfFile?: string) => {
    // Verify files exist before setting results
    try {
      // Get list of available files from API
      const { getApiConfig } = await import('@/lib/api');
      const apiConfig = getApiConfig();
      const listResponse = await fetch(`${apiConfig.baseUrl}/api/barcodes/list`, {
        headers: {
          'X-API-Key': apiConfig.apiKey,
        },
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        // Extract filenames from file objects
        const availableFilenames = listData.files?.map((f: any) => 
          typeof f === 'string' ? f : (f.filename || f.name || f)
        ) || [];
        
        // Filter to only include files that actually exist (exact match or partial match)
        const existingFiles = files.filter(filename => {
          const normalizedFilename = filename.toLowerCase();
          return availableFilenames.some((available: string) => {
            const normalizedAvailable = String(available).toLowerCase();
            return normalizedAvailable === normalizedFilename || 
                   normalizedAvailable.includes(normalizedFilename) || 
                   normalizedFilename.includes(normalizedAvailable);
          });
        });
        
        if (existingFiles.length !== files.length) {
          const missingCount = files.length - existingFiles.length;
          console.warn(`⚠️ ${missingCount} file(s) not found on server. Showing ${existingFiles.length} of ${files.length} files.`);
          console.warn('Missing files:', files.filter(f => !existingFiles.includes(f)));
        }
        
        setDirectGenerationResults({ files: existingFiles.length > 0 ? existingFiles : files, pdfFile });
      } else {
        // If list fails, just use the files as-is
        console.warn('Could not verify files, using response as-is');
        setDirectGenerationResults({ files, pdfFile });
      }
    } catch (error) {
      console.error('Error verifying files:', error);
      // Fallback: use files as-is
      setDirectGenerationResults({ files, pdfFile });
    }
    
    setUploadedData([]); // Clear uploaded data when using direct generation
    setSelectedDataForBarcodes([]); // Clear selected data when using direct generation
  };

  const stats = [
    {
      title: "Total Records",
      value: uploadedData.length,
      icon: FileSpreadsheet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Selected for Barcodes",
      value: selectedDataForBarcodes.length,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Generated Barcodes",
      value: archiveStatistics?.total_files || 0,
      icon: Zap,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "PDF Collections",
      value: archiveStatistics?.pdf_count || 0,
      icon: Download,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">


        {/* Excel File Upload Section - Primary Focus */}
        <Card className="shadow-card border-0 glass-effect mb-8">
          <CardContent>
            <ApiFileUpload 
              onFileUploaded={handleFileUploaded}
              onDirectGeneration={handleDirectGeneration}
            />
          </CardContent>
        </Card>
        






        {/* Direct Generation Results */}
        {directGenerationResults && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Direct Generation Results
              </CardTitle>
              <CardDescription>
                Your barcodes have been generated successfully via direct API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generated Files Summary */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Generated Files</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{directGenerationResults.files.length}</p>
                  <p className="text-sm text-blue-700">Individual barcode images (PDF collection available below)</p>
                </div>

                {directGenerationResults.pdfFile && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-800">PDF Collection</span>
                    </div>
                    <p className="text-sm text-red-700 mb-2">{directGenerationResults.pdfFile}</p>
                    <Button
                      onClick={async () => {
                        try {
                          console.log(`🔍 Index: Starting PDF download for ${directGenerationResults.pdfFile}`);
                          
                          await apiService.downloadFileSimple(directGenerationResults.pdfFile!, true);
                          toast.success(`Downloaded ${directGenerationResults.pdfFile}`);
                          console.log(`✅ Index: PDF download successful`);
                          
                        } catch (error) {
                          console.error(`❌ Index: PDF download failed:`, error);
                          toast.error(`Failed to download PDF: ${error}`);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download PDF
                    </Button>
                  </div>
                )}
              </div>

              {/* PDF Preview */}
              {directGenerationResults.pdfFile && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">PDF Preview</Label>
                  <div className="h-[400px] w-full border rounded-md overflow-hidden bg-white">
                    <AuthenticatedPdfPreview
                      filename={directGenerationResults.pdfFile}
                      className="w-full h-full"
                      fallbackText="Loading PDF preview..."
                      onError={(error) => {
                        console.error('PDF preview error:', error);
                        toast.error(`Failed to load PDF preview: ${error.message}`);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Barcode Previews */}
              {directGenerationResults.files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <Label className="text-sm font-medium">Barcode Previews</Label>
                </div>
                
                  {/* First Barcode Preview (Large) */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">First Barcode (Large Preview)</Label>
                    <div className="border rounded-lg p-4 bg-white">
                      <AuthenticatedImagePreview
                        filename={directGenerationResults.files[0]}
                        alt={`Barcode preview: ${directGenerationResults.files[0]}`}
                        className="max-w-full max-h-64 object-contain mx-auto"
                        fallbackText="Loading barcode preview..."
                        onError={(error) => {
                          console.error('Barcode preview error:', error);
                          toast.error(`Failed to load barcode preview: ${error.message}`);
                        }}
                      />
                    </div>
                  </div>

                  {/* Multiple Barcode Previews (Grid) - Hidden per user request */}
                  {/* {directGenerationResults.files.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        All Generated Barcodes ({directGenerationResults.files.length} total)
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {directGenerationResults.files.slice(0, 8).map((filename, index) => (
                          <div key={filename} className="border rounded-lg p-2 bg-white">
                            <div className="text-xs text-muted-foreground mb-1">
                              #{index + 1}
                            </div>
                            <AuthenticatedImagePreview
                              filename={filename}
                              alt={`Barcode ${index + 1}: ${filename}`}
                              className="w-full h-24 object-contain"
                              fallbackText="Loading..."
                              onError={(error) => {
                                // Only log non-404 errors to reduce console noise
                                if (!error.message.includes('Not Found') && !error.message.includes('404')) {
                                  console.error(`Barcode ${index + 1} preview error:`, error);
                                }
                              }}
                            />
                          </div>
                        ))}
                        {directGenerationResults.files.length > 8 && (
                          <div className="border rounded-lg p-2 bg-gray-50 flex items-center justify-center">
                            <div className="text-xs text-muted-foreground text-center">
                              +{directGenerationResults.files.length - 8} more
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )} */}
                </div>
              )}
              </CardContent>
            </Card>
        )}

        {/* Data Preview Section */}
        {uploadedData.length > 0 && (
          <>
            {/* Debug info */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Debug Info:</h3>
              <p className="text-sm text-yellow-700">Uploaded data length: {uploadedData.length}</p>
              <p className="text-sm text-yellow-700">First item: {JSON.stringify(uploadedData[0], null, 2)}</p>
            </div>
          <DataTable 
            data={uploadedData} 
            onGenerateBarcodes={handleGenerateBarcodes}
          />
          </>
        )}

        {/* Barcode Generation Section */}
        {selectedDataForBarcodes.length > 0 && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Barcode Generation Section:</h3>
              <p className="text-sm text-green-700">selectedDataForBarcodes.length: {selectedDataForBarcodes.length}</p>
              <p className="text-sm text-green-700">First item: {JSON.stringify(selectedDataForBarcodes[0], null, 2)}</p>
            </div>
            <ApiBarcodeGenerator 
            data={selectedDataForBarcodes}
              onBarcodeGenerated={(files) => {
            }}
          />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
