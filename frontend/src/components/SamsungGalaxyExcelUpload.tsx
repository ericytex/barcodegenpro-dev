import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Eye, FileSpreadsheet, LayoutTemplate, ChevronDown, ChevronUp } from 'lucide-react';
import { safeLog, safeError, debugLog } from '@/utils/logger';
import { getApiConfig } from '@/lib/api';
import { TemplateSelector } from '@/components/TemplateSelector';
import { TemplatePreview } from '@/components/TemplatePreview';
import { AuthenticatedPdfPreview } from '@/components/AuthenticatedImagePreview';
import { downloadExcelTemplate } from '@/utils/excelTemplateGenerator';
import { BarcodeTemplate } from '@/utils/templateManager';

interface GeneratedBarcode {
  filename: string;
  filepath: string;
  isPdf?: boolean;
}

interface SamsungGalaxyExcelUploadProps {
  onBarcodesGenerated?: (barcodes: GeneratedBarcode[]) => void;
}

const SamsungGalaxyExcelUpload: React.FC<SamsungGalaxyExcelUploadProps> = ({ 
  onBarcodesGenerated 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BarcodeTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<GeneratedBarcode[]>([]);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploadCardCollapsed, setIsUploadCardCollapsed] = useState(false);

  // Load persisted state on component mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        // Load selected template
        const savedTemplate = localStorage.getItem('samsungGalaxy_selectedTemplate');
        if (savedTemplate) {
          const template = JSON.parse(savedTemplate);
          setSelectedTemplate(template);
        }

        // Load generated PDF info
        const savedPdfFile = localStorage.getItem('samsungGalaxy_pdfFile');
        if (savedPdfFile) {
          setPdfFile(savedPdfFile);
        }

        // Load generated barcodes
        const savedBarcodes = localStorage.getItem('samsungGalaxy_generatedBarcodes');
        if (savedBarcodes) {
          const barcodes = JSON.parse(savedBarcodes);
          setGeneratedBarcodes(barcodes);
        }

        // Load success message
        const savedSuccess = localStorage.getItem('samsungGalaxy_success');
        if (savedSuccess) {
          setSuccess(savedSuccess);
        }

        // Load uploaded file name
        const savedFileName = localStorage.getItem('samsungGalaxy_uploadedFileName');
        if (savedFileName) {
          setUploadedFileName(savedFileName);
        }
      } catch (error) {
        console.error('Error loading persisted state:', error);
      }
    };

    loadPersistedState();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem('samsungGalaxy_selectedTemplate', JSON.stringify(selectedTemplate));
    } else {
      localStorage.removeItem('samsungGalaxy_selectedTemplate');
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (pdfFile) {
      localStorage.setItem('samsungGalaxy_pdfFile', pdfFile);
    } else {
      localStorage.removeItem('samsungGalaxy_pdfFile');
    }
  }, [pdfFile]);

  useEffect(() => {
    if (generatedBarcodes.length > 0) {
      localStorage.setItem('samsungGalaxy_generatedBarcodes', JSON.stringify(generatedBarcodes));
    } else {
      localStorage.removeItem('samsungGalaxy_generatedBarcodes');
    }
  }, [generatedBarcodes]);

  useEffect(() => {
    if (success) {
      localStorage.setItem('samsungGalaxy_success', success);
    } else {
      localStorage.removeItem('samsungGalaxy_success');
    }
  }, [success]);

  useEffect(() => {
    if (uploadedFileName) {
      localStorage.setItem('samsungGalaxy_uploadedFileName', uploadedFileName);
    } else {
      localStorage.removeItem('samsungGalaxy_uploadedFileName');
    }
  }, [uploadedFileName]);

  const handleTemplateSelect = (template: BarcodeTemplate | null) => {
    setSelectedTemplate(template);
    setError(null);
    setSuccess(null);
  };

  const clearPersistedState = () => {
    localStorage.removeItem('samsungGalaxy_selectedTemplate');
    localStorage.removeItem('samsungGalaxy_pdfFile');
    localStorage.removeItem('samsungGalaxy_generatedBarcodes');
    localStorage.removeItem('samsungGalaxy_success');
    localStorage.removeItem('samsungGalaxy_uploadedFileName');
    setSelectedTemplate(null);
    setPdfFile(null);
    setGeneratedBarcodes([]);
    setSuccess(null);
    setError(null);
    setUploadedFileName(null);
    setUploadedFile(null);
  };

  const handleDownloadTemplate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }
    
    try {
      await downloadExcelTemplate(selectedTemplate, selectedTemplate.name);
      setSuccess('Excel template downloaded successfully');
    } catch (err) {
      setError('Failed to download Excel template');
      console.error('Template download error:', err);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setError(null);
      setSuccess(null);
    }
  };

  const uploadExcelAndGenerate = async () => {
    if (!uploadedFile && !uploadedFileName) {
      setError('Please select an Excel file first');
      return;
    }

    // If we have a persisted file name but no actual file, we can't proceed
    if (!uploadedFile && uploadedFileName) {
      setError('Please re-upload your Excel file. The previous file is no longer available.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setGeneratedBarcodes([]);
    
    // Clear previous PDF and success state when starting new generation
    setPdfFile(null);
    localStorage.removeItem('samsungGalaxy_pdfFile');
    localStorage.removeItem('samsungGalaxy_success');

    try {
      debugLog('Uploading Excel file for Samsung Galaxy barcodes:', uploadedFile.name);

      const { baseUrl, apiKey } = getApiConfig();
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      // Always use Samsung Galaxy endpoint
      const endpoint = '/api/barcodes/upload-excel-samsung-galaxy';
      
      // Include template ID if a template is selected
      if (selectedTemplate) {
        formData.append('template_id', selectedTemplate.id);
      }

      // Ensure proper URL construction
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const fullUrl = `${cleanBaseUrl}${cleanEndpoint}`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Check if we have a PDF (template-based generation) or individual files (legacy)
        // Match the default PDF generation response format: {pdf_file, ...}
        if (data.pdf_file) {
          // Template-based generation returns PDF (same format as default generation)
          setPdfFile(data.pdf_file);  // Set PDF file for preview
          setGeneratedBarcodes([{
            filename: data.pdf_file,
            filepath: data.pdf_url || `/barcodes/download-pdf/${data.pdf_file}`,
            isPdf: true
          }]);
          const templateText = selectedTemplate ? ` using template "${selectedTemplate.name}"` : '';
          setSuccess(data.message || `PDF created successfully from existing barcodes${templateText}`);
          safeLog('Excel Samsung Galaxy PDF generated successfully', data.total_items);
          
          // Notify parent component with PDF
          if (onBarcodesGenerated) {
            onBarcodesGenerated([{
              filename: data.pdf_file,
              filepath: data.pdf_url || `/barcodes/download-pdf/${data.pdf_file}`,
              isPdf: true
            }]);
          }
        } else {
          // Legacy generation returns individual PNG files
          const barcodes = data.generated_files.map((filename: string, index: number) => ({
            filename,
            filepath: data.generated_files[index],
            isPdf: false
          }));
          setGeneratedBarcodes(barcodes);
          const templateText = selectedTemplate ? ` using template "${selectedTemplate.name}"` : '';
          setSuccess(`Successfully generated ${data.total_items} Samsung Galaxy barcodes from Excel file${templateText}`);
          safeLog('Excel Samsung Galaxy barcodes generated successfully', data.total_items);
          
          // Notify parent component
          if (onBarcodesGenerated) {
            onBarcodesGenerated(barcodes);
          }
        }
      } else {
        setError(data.detail || 'Failed to generate barcodes from Excel file');
        safeError('Excel Samsung Galaxy barcode generation failed', data.detail);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(`Error processing Excel file: ${errorMessage}`);
      safeError('Excel Samsung Galaxy barcode generation error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadBarcode = (filename: string) => {
    const { baseUrl } = getApiConfig();
    const downloadUrl = baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download/${filename}`
      : `${baseUrl}/api/barcodes/download/${filename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewPDF = (pdfUrl: string) => {
    const { baseUrl } = getApiConfig();
    // If pdfUrl starts with /api/ and baseUrl ends with /api, remove /api from pdfUrl
    let cleanPdfUrl = pdfUrl;
    if (baseUrl.endsWith('/api') && pdfUrl.startsWith('/api/')) {
      cleanPdfUrl = pdfUrl.replace(/^\/api/, '');
    }
    const fullPdfUrl = `${baseUrl}${cleanPdfUrl}`;
    window.open(fullPdfUrl, '_blank', 'width=800,height=600');
  };

  const previewBarcode = (filename: string) => {
    const { baseUrl } = getApiConfig();
    const previewUrl = baseUrl.endsWith('/api') 
      ? `${baseUrl}/barcodes/download/${filename}`
      : `${baseUrl}/api/barcodes/download/${filename}`;
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Streamlined Upload and Generate Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection - Compact */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" />
                Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TemplateSelector
                onTemplateSelect={handleTemplateSelect}
                selectedTemplate={selectedTemplate}
              />
              {selectedTemplate && (
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Download Template
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upload and Generate - Main Focus */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setIsUploadCardCollapsed(!isUploadCardCollapsed)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel File Upload
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUploadCardCollapsed(!isUploadCardCollapsed);
                  }}
                >
                  {isUploadCardCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            {!isUploadCardCollapsed && (
              <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">Select Excel File</Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                  {(uploadedFile || uploadedFileName) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedTemplate 
                        ? `Selected: ${uploadedFile?.name || uploadedFileName} (will use template "${selectedTemplate.name}")` 
                        : `Selected: ${uploadedFile?.name || uploadedFileName}`}
                    </p>
                  )}
                </div>

                {selectedTemplate ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">
                      Using Template: {selectedTemplate.name}
                    </h4>
                    <p className="text-sm text-green-700">
                      Your Excel file will be processed using the selected template's design and structure.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Default Format</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Your Excel file should contain columns for:
                    </p>
                    <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li><strong>Product</strong> - Product description</li>
                      <li><strong>Color</strong> - Device color</li>
                      <li><strong>IMEI/sn</strong> - IMEI number</li>
                      <li><strong>VC</strong> - Verification code</li>
                      <li><strong>Storage</strong> - Storage capacity</li>
                    </ul>
                  </div>
                )}

                <Button
                  onClick={uploadExcelAndGenerate}
                  disabled={isUploading || (!uploadedFile && !uploadedFileName)}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Excel File...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Generate Samsung Galaxy Barcodes
                    </>
                  )}
                </Button>
              </div>
              </CardContent>
            )}
          </Card>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Generated Files */}
          {generatedBarcodes.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {generatedBarcodes[0]?.isPdf 
                      ? `Generated PDF Document` 
                      : `Generated Barcodes (${generatedBarcodes.length})`}
                  </CardTitle>
                  <Button
                    onClick={clearPersistedState}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generatedBarcodes[0]?.isPdf ? (
                  // PDF Preview and Download
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                      <div className="flex-1">
                        <div className="font-medium text-green-800">Samsung Galaxy Barcode PDF</div>
                        <div className="text-sm text-green-600">{pdfFile}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Your barcodes have been generated successfully
                        </div>
                      </div>
                      <Button
                        onClick={() => downloadBarcode(pdfFile)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                    
                    {/* PDF Preview */}
                    <div>
                      <Label>Preview</Label>
                      <div className="h-[540px] w-full border rounded-md overflow-hidden bg-white">
                        <AuthenticatedPdfPreview
                          filename={pdfFile}
                          className="w-full h-full"
                          fallbackText="Loading PDF preview..."
                          onError={(error) => {
                            console.error('PDF preview error:', error);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Individual PNG Files (preview only)
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedBarcodes.map((barcode, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">Barcode {index + 1}</div>
                          <div className="text-sm text-muted-foreground">{barcode.filename}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => previewBarcode(barcode.filename)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Badge variant="secondary">PNG</Badge>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground text-center">Individual PNG files are included in the PDF collection</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SamsungGalaxyExcelUpload;