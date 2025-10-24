import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Zap, Smartphone, Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { ScalableDeviceSelector, useScalableDeviceSelector } from "@/components/ScalableDeviceSelector";
import { SimpleDeviceSelector, useSimpleDeviceSelector } from "@/components/SimpleDeviceSelector";
import { InsufficientTokensModal } from "@/components/InsufficientTokensModal";
import { TokenPurchaseModal } from "@/components/TokenPurchaseModal";
import { useTokens } from "@/contexts/TokenContext";
import { toast } from "sonner";
import * as ExcelJS from 'exceljs';

interface ApiFileUploadProps {
  onFileUploaded: (data: any[]) => void;
  onDirectGeneration?: (files: string[], pdfFile?: string) => void;
}

export function ApiFileUpload({ onFileUploaded, onDirectGeneration }: ApiFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [useDirectGeneration, setUseDirectGeneration] = useState(false);
  const [pdfGridCols, setPdfGridCols] = useState(5);
  const [pdfGridRows, setPdfGridRows] = useState(12);
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [insufficientTokensData, setInsufficientTokensData] = useState({
    required: 0,
    available: 0,
    missing: 0,
    costUgx: 0,
  });

  // Simple device selector state
  const { selectedDevice, handleDeviceChange } = useSimpleDeviceSelector();
  
  // Token state
  const { balance, refreshBalance } = useTokens();

  // Helper function to determine alert type and message
  const getTokenAlertInfo = () => {
    const currentBalance = balance || 0;
    const recordCount = uploadedData.length;
    
    if (currentBalance === 0) {
      return {
        type: 'danger',
        message: `You have 0 tokens. Buy tokens before enabling Direct Generation.`,
        className: 'border-red-200 bg-red-50',
        iconColor: 'text-red-600',
        textColor: 'text-red-800'
      };
    }
    
    if (recordCount > 0 && recordCount > currentBalance) {
      return {
        type: 'warning',
        message: `You have ${currentBalance} tokens but ${recordCount} records. You need ${recordCount - currentBalance} more tokens.`,
        className: 'border-amber-200 bg-amber-50',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-800'
      };
    }
    
    if (currentBalance > 0) {
      return {
        type: 'success',
        message: `You have ${currentBalance} tokens available for barcode generation.`,
        className: 'border-green-200 bg-green-50',
        iconColor: 'text-green-600',
        textColor: 'text-green-800'
      };
    }
    
    return null;
  };

  const {
    isLoading: isGenerating,
    uploadExcelAndGenerate,
    generatedFiles,
    pdfFile,
  } = useBarcodeApi();

  const processExcelFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // Get first worksheet
      const worksheet = workbook.worksheets[0];
      
      // Convert to JSON array
      const jsonData: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowData: any[] = [];
        row.eachCell((cell, colNumber) => {
          rowData[colNumber - 1] = cell.value;
        });
        jsonData[rowNumber - 1] = rowData;
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Process the data
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      const processedData = rows.map((row, index) => {
        const obj: any = { id: index + 1 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      }).filter(obj => Object.values(obj).some(value => value !== '' && value !== null));

      setUploadedFileName(file.name);
      setUploadStatus('success');
      setUploadedData(processedData);
      onFileUploaded(processedData);
      
      toast.success(`Successfully processed ${processedData.length} records from ${file.name}`);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
      toast.error('Failed to process Excel file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUploaded]);

  const handleDirectGeneration = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90));
      }, 200);

      const response = await uploadExcelAndGenerate(file, {
        createPdf: true,
        pdfGridCols,
        pdfGridRows,
        deviceType: selectedDevice?.device_type,
        deviceId: selectedDevice?.id,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadedFileName(file.name);
      setUploadStatus('success');
      
      toast.success(`Successfully generated barcodes from ${file.name}`);
      
      // Use the response data directly instead of the hook state
      if (response && response.generated_files) {
        onDirectGeneration?.(response.generated_files, response.pdf_file || undefined);
      } else {
        console.error('❌ Invalid response structure:', response);
        toast.error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Error generating barcodes:', error);
      setUploadStatus('error');
      toast.error(`Failed to generate barcodes: ${error.message || error}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [uploadExcelAndGenerate, pdfGridCols, pdfGridRows, onDirectGeneration]);

  // Handle toggle with token check
  const handleToggleChange = (checked: boolean) => {
    if (checked && (balance === null || balance === 0)) {
      // Block toggle if no tokens
      toast.error('No tokens available', {
        description: 'You need tokens to use Direct Barcode Generation. Please buy tokens first.',
      });
      return;
    }
    setUseDirectGeneration(checked);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // If direct generation, check tokens first
    if (useDirectGeneration) {
      // Count rows in Excel before processing
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        
        // Count rows (excluding header)
        const rowCount = worksheet.rowCount - 1;
        
        // Check token balance
        if (balance === null || balance < rowCount) {
          setInsufficientTokensData({
            required: rowCount,
            available: balance || 0,
            missing: rowCount - (balance || 0),
            costUgx: (rowCount - (balance || 0)) * 500,
          });
          setShowInsufficientTokens(true);
          return;
        }
        
        // Proceed with generation
        handleDirectGeneration(file);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to read Excel file');
      }
    } else {
      processExcelFile(file);
    }
  }, [useDirectGeneration, balance, handleDirectGeneration, processExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: !useDirectGeneration, // Disable upload until toggle is ON
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadedFileName('');
    setUploadProgress(0);
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        {/* Token Balance Alert */}
        {(() => {
          const alertInfo = getTokenAlertInfo();
          if (!alertInfo) return null;
          
          return (
            <Alert className={`${alertInfo.className} mb-4`}>
              <Coins className={`h-4 w-4 ${alertInfo.iconColor}`} />
              <AlertDescription className={alertInfo.textColor}>
                {alertInfo.message}
              </AlertDescription>
            </Alert>
          );
        })()}
        
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Excel File Upload
        </CardTitle>
        <CardDescription>
          Upload your Excel file to process data or generate barcodes directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Mode Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="direct-generation"
                checked={useDirectGeneration}
                onCheckedChange={handleToggleChange}
              />
              <Label htmlFor="direct-generation">Direct Barcode Generation</Label>
            </div>
            {balance !== null && (
              <Badge variant="outline" className="gap-1">
                <Coins className="w-3 h-3" />
                {balance} tokens
              </Badge>
            )}
          </div>
          
          
          {useDirectGeneration && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Direct Generation Mode</span>
              </div>
              <p className="text-sm text-blue-700">
                Upload Excel file and generate barcodes directly via API. No data preview needed.
              </p>
            </div>
          )}

          {!useDirectGeneration && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Data Preview Mode</span>
              </div>
              <p className="text-sm text-green-700">
                Upload Excel file to preview data and select which records to generate barcodes for.
              </p>
            </div>
          )}
        </div>

        {/* PDF Settings for Direct Generation */}
        {useDirectGeneration && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">PDF Grid Settings</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-cols" className="text-xs">Columns</Label>
                <Input
                  id="pdf-cols"
                  type="number"
                  min="1"
                  max="10"
                  value={pdfGridCols}
                  onChange={(e) => setPdfGridCols(parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdf-rows" className="text-xs">Rows</Label>
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
          </div>
        )}

        {/* Scalable Device Selection for Direct Generation */}
        {useDirectGeneration && (
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Device Selection (Simple)</Label>
            </div>
            <div className="space-y-2">
              <SimpleDeviceSelector
                value={selectedDevice}
                onChange={handleDeviceChange}
                placeholder="Select device for specialized barcode generation..."
              />
              <p className="text-xs text-muted-foreground">
                Select a device to generate specialized barcodes. Leave empty for default generation.
              </p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${!useDirectGeneration
              ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
              : isDragActive 
                ? 'border-primary bg-primary/5 cursor-pointer' 
                : uploadStatus === 'success' 
                  ? 'border-green-300 bg-green-50 cursor-pointer' 
                  : uploadStatus === 'error'
                    ? 'border-red-300 bg-red-50 cursor-pointer'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
            }
          `}
        >
          <input {...getInputProps()} />
          
          {uploading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {useDirectGeneration ? 'Generating barcodes...' : 'Processing file...'}
                </p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </div>
            </div>
          ) : uploadStatus === 'success' ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-800">
                  {useDirectGeneration ? 'Barcodes generated successfully!' : 'File processed successfully!'}
                </p>
                <p className="text-xs text-green-600">{uploadedFileName}</p>
                {useDirectGeneration && (
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary">{generatedFiles.length} PNG files</Badge>
                    {pdfFile && <Badge variant="secondary">1 PDF file</Badge>}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={resetUpload}>
                  Upload Another File
                </Button>
              </div>
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">Upload failed</p>
                <p className="text-xs text-red-600">Please try again</p>
                <Button size="sm" variant="outline" onClick={resetUpload}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : !useDirectGeneration ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">
                  Upload Disabled
                </p>
                <p className="text-xs text-gray-400">
                  Enable "Direct Barcode Generation" to upload files
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragActive 
                    ? 'Drop your Excel file here' 
                    : 'Drag & drop your Excel file here, or click to select'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .xlsx and .xls files
                </p>
                {useDirectGeneration && (
                  <p className="text-xs text-blue-600 font-medium">
                    Will generate barcodes directly via API
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* File Requirements */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Expected columns:</strong> imei, box_id, model, product, color, dn</p>
          <p><strong>Note:</strong> The 'product' column will be used to automatically extract colors</p>
        </div>
      </CardContent>
      
      {/* Token Modals */}
      <InsufficientTokensModal
        open={showInsufficientTokens}
        onClose={() => setShowInsufficientTokens(false)}
        required={insufficientTokensData.required}
        available={insufficientTokensData.available}
        missing={insufficientTokensData.missing}
        costUgx={insufficientTokensData.costUgx}
        onBuyTokens={() => {
          setShowInsufficientTokens(false);
          setShowPurchaseModal(true);
        }}
      />
      
      <TokenPurchaseModal
        open={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          refreshBalance();
        }}
        requiredTokens={insufficientTokensData.missing}
      />
    </Card>
  );
}
