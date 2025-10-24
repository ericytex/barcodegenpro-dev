import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as ExcelJS from 'exceljs';

interface FileUploadProps {
  onFileUploaded: (data: any[]) => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const processExcelFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
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
      });

      setUploadedFileName(file.name);
      setUploadStatus('success');
      onFileUploaded(processedData);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processExcelFile(file);
    }
  }, [processExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <Card className="shadow-card card-hover border-0 glass-effect animate-scale-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent shadow-glow">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Upload Data File
          </span>
        </CardTitle>
        <CardDescription className="text-base">
          Drop your Excel or CSV file to get started with barcode generation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer relative overflow-hidden
            ${isDragActive 
              ? 'border-primary bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 shadow-hover scale-105' 
              : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-6 relative z-10">
            {uploading ? (
              <>
                <div className="relative">
                  <Upload className="w-16 h-16 animate-spin text-primary" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-primary">Processing your file...</p>
                  <Progress value={uploadProgress} className="mt-3 w-64" />
                </div>
              </>
            ) : uploadStatus === 'success' ? (
              <>
                <div className="relative group">
                  <CheckCircle className="w-20 h-20 text-success group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -inset-2 bg-gradient-to-r from-success/20 to-success/20 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-success mb-2">File uploaded successfully!</p>
                  <p className="text-muted-foreground">{uploadedFileName}</p>
                </div>
              </>
            ) : uploadStatus === 'error' ? (
              <>
                <div className="relative group">
                  <AlertCircle className="w-20 h-20 text-destructive group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -inset-2 bg-gradient-to-r from-destructive/20 to-destructive/20 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-destructive mb-2">Upload failed</p>
                  <p className="text-muted-foreground">Please try again with a valid Excel file</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative group">
                  <Upload className="w-20 h-20 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-muted-foreground">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">.xlsx</span>
                    <span className="px-3 py-1 bg-accent/10 text-accent text-xs rounded-full font-medium">.xls</span>
                    <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs rounded-full font-medium">.csv</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Animated background effect */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full animate-ping"></div>
            <div className="absolute bottom-6 right-8 w-1 h-1 bg-accent rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-secondary rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>

        {uploadStatus === 'success' && (
          <div className="mt-4 flex gap-2 animate-slide-up">
            <Button 
              variant="outline" 
              className="button-glow"
              onClick={() => {
                setUploadStatus('idle');
                setUploadedFileName('');
              }}
            >
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}