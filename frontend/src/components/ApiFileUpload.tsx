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
import { DeviceSelector, useDeviceSelector } from "@/components/DeviceSelector";
import { ExcelColumnPreview } from "@/components/ExcelColumnPreview";
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

  // Device selector state - using DeviceSelector for Itel support
  const { selectedDevice, handleDeviceChange } = useDeviceSelector();
  
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

      // Extract template_id from selectedDevice.specifications if available
      console.log('🔍 APIFILEUPLOAD DEBUG: handleDirectGeneration called');
      console.log('🔍 APIFILEUPLOAD DEBUG: selectedDevice:', selectedDevice);
      console.log('🔍 APIFILEUPLOAD DEBUG: selectedDevice?.specifications:', selectedDevice?.specifications);
      
      let templateId: string | undefined = undefined;
      if (selectedDevice?.specifications) {
        try {
          const specs = typeof selectedDevice.specifications === 'string' 
            ? JSON.parse(selectedDevice.specifications) 
            : selectedDevice.specifications;
          console.log('🔍 APIFILEUPLOAD DEBUG: Parsed specs:', specs);
          if (specs?.template_id) {
            templateId = specs.template_id;
            console.log('✅ APIFILEUPLOAD DEBUG: Extracted template_id from device specifications:', templateId);
          } else {
            console.warn('⚠️ APIFILEUPLOAD DEBUG: specs.template_id not found. Specs:', specs);
          }
        } catch (e) {
          console.error('❌ APIFILEUPLOAD DEBUG: Failed to parse device specifications:', e);
        }
      } else {
        console.warn('⚠️ APIFILEUPLOAD DEBUG: selectedDevice?.specifications is falsy:', selectedDevice?.specifications);
      }
      
      console.log('🔍 APIFILEUPLOAD DEBUG: Final templateId before API call:', templateId);

      const response = await uploadExcelAndGenerate(file, {
        createPdf: true,
        pdfGridCols,
        pdfGridRows,
        deviceType: selectedDevice?.device_type,
        deviceId: selectedDevice?.id,
        templateId: templateId, // Include template ID from DeviceSelector
      });
      
      console.log('🔍 APIFILEUPLOAD DEBUG: After API call, templateId sent was:', templateId);

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
  }, [uploadExcelAndGenerate, pdfGridCols, pdfGridRows, onDirectGeneration, selectedDevice]);

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
        
        {/* Direct Generation Mode Alert - Moved to Header */}
        {useDirectGeneration && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200 mt-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Direct Generation Mode</span>
            </div>
            <p className="text-sm text-blue-700">
              Upload Excel file and generate barcodes directly via API. No data preview needed.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className={useDirectGeneration ? "space-y-3" : "space-y-6"}>
        {/* Upload Mode Selection - Compact when Direct Generation is ON */}
        <div className={useDirectGeneration ? "space-y-2" : "space-y-4"}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Switch
                id="direct-generation"
                checked={useDirectGeneration}
                onCheckedChange={handleToggleChange}
                className="flex-shrink-0"
              />
              <Label htmlFor="direct-generation" className={`${useDirectGeneration ? "text-sm" : ""} text-sm sm:text-base leading-tight`}>
                Direct Barcode Generation
              </Label>
            </div>
            {balance !== null && (
              <Badge variant="outline" className="gap-1 text-xs self-start sm:self-auto flex-shrink-0">
                <Coins className="w-3 h-3" />
                <span className="truncate">{balance} tokens</span>
              </Badge>
            )}
          </div>
          
          {!useDirectGeneration && (
            <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-800">Data Preview Mode</span>
              </div>
              <p className="text-sm text-green-700 leading-relaxed">
                Upload Excel file to preview data and select which records to generate barcodes for.
              </p>
            </div>
          )}
        </div>

        {/* Device Selection */}
        {useDirectGeneration && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-3 h-3 text-primary" />
              <Label className="text-xs font-medium">Device Selection (Optional)</Label>
            </div>
            <DeviceSelector
              value={selectedDevice}
              onChange={handleDeviceChange}
              placeholder="Select device type (e.g., Itel Vision 7 Plus) for specialized barcode generation..."
            />
            {selectedDevice && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>Selected:</strong> {selectedDevice.brand} {selectedDevice.name}
                <br />
                <strong>Type:</strong> {selectedDevice.device_type}
                <br />
                <strong>Model:</strong> {selectedDevice.model_code}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select a device type (e.g., Itel phones) to generate specialized barcodes with custom templates.
            </p>
            
            {/* Excel Column Preview - Show immediately when device is selected */}
            {selectedDevice && (
              <div className="mt-4">
                <ExcelColumnPreview device={selectedDevice} />
              </div>
            )}
          </div>
        )}

        {/* Upload Area - Responsive Design */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg text-center transition-all duration-200
            ${useDirectGeneration ? 'p-6 sm:p-12 min-h-[150px] sm:min-h-[200px]' : 'p-4 sm:p-8'}
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
                <p className="text-sm font-medium text-gray-500 leading-tight">
                  Upload Disabled
                </p>
                <p className="text-xs text-gray-400 leading-tight">
                  Enable "Direct Barcode Generation" to upload files
                </p>
              </div>
            </div>
          ) : (
            <div className={useDirectGeneration ? "space-y-4 sm:space-y-6" : "space-y-3 sm:space-y-4"}>
              <div className={`mx-auto bg-muted rounded-full flex items-center justify-center ${
                useDirectGeneration ? 'w-12 h-12 sm:w-16 sm:h-16' : 'w-10 h-10 sm:w-12 sm:h-12'
              }`}>
                <FileSpreadsheet className={`text-muted-foreground ${
                  useDirectGeneration ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'
                }`} />
              </div>
              <div className="space-y-2">
                <p className={`font-medium leading-tight ${
                  useDirectGeneration ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                }`}>
                  {isDragActive 
                    ? 'Drop your Excel file here' 
                    : 'Drag & drop your Excel file here, or click to select'
                  }
                </p>
                <p className={`text-muted-foreground leading-tight ${
                  useDirectGeneration ? 'text-xs sm:text-sm' : 'text-xs'
                }`}>
                  Supports .xlsx and .xls files
                </p>
                {useDirectGeneration && (
                  <p className="text-xs sm:text-sm text-blue-600 font-medium leading-tight">
                    Will generate barcodes directly via API
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* File Requirements */}
        <div className="text-xs text-muted-foreground space-y-1 px-2 sm:px-0">
          <p className="break-words leading-relaxed">
            <strong>Expected columns:</strong> imei, box_id, model, product, color, dn
          </p>
          <p className="break-words leading-relaxed">
            <strong>Note:</strong> The 'product' column will be used to automatically extract colors
          </p>
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
