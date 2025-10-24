"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import * as ExcelJS from 'exceljs';

interface ExcelIntegrationProps {
  selectedComponent: any;
  connectedComponents: Record<string, any>;
  onConnectToExcel: (componentId: string, columnName: string) => void;
  onDisconnectFromExcel: (componentId: string) => void;
  onExcelDataLoaded?: (data: ExcelData) => void;
  onShowMappingModal?: () => void;
}

interface ExcelData {
  headers: string[];
  rows: any[];
  fileName?: string;
}

interface ExtractionRule {
  type: 'direct' | 'first_word' | 'last_word' | 'manual' | 'regex';
  value?: string; // For manual, regex pattern
}

interface ComponentMapping {
  componentId: string;
  componentType: string;
  columnName?: string;
  extractionRule?: ExtractionRule;
  staticValue?: string;
}

interface ExcelMappingConfig {
  [componentId: string]: {
    columnName?: string;
    extractionRule?: ExtractionRule;
    staticValue?: string;
  };
}

export default function ExcelIntegration({ 
  selectedComponent, 
  connectedComponents, 
  onConnectToExcel, 
  onDisconnectFromExcel,
  onExcelDataLoaded,
  onShowMappingModal
}: ExcelIntegrationProps) {
  const [excelMode, setExcelMode] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parseExcelFile = async (file: File): Promise<ExcelData> => {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheets found in the Excel file');
    }

    const rows: any[] = [];
    const headers: string[] = [];
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    if (headerRow) {
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text?.toString() || `Column${colNumber}`;
      });
    }

    // Get data rows (skip header row)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber]] = cell.text?.toString() || '';
        });
        rows.push(rowData);
      }
    });

    return {
      headers,
      rows,
      fileName: file.name
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error('Please select a valid CSV file (.xlsx, .xls, .csv)');
      return;
    }

    setIsLoading(true);
    setUploadedFile(file);

    try {
      const data = await parseExcelFile(file);
      setExcelData(data);
      onExcelDataLoaded?.(data);
      toast.success(`Excel file "${file.name}" loaded and parsed successfully`);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Error parsing Excel file. Please check the file format.');
      setExcelData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock CSV data for demonstration (fallback)
  const mockExcelData: ExcelData = {
    headers: ['Product', 'IMEI', 'Color', 'Storage', 'Price'],
    rows: [
      { Product: 'SAMSUNG GALAXY A55 BLACK', IMEI: '123456789012345', Color: 'BLACK', Storage: '128GB', Price: '599' },
      { Product: 'APPLE IPHONE 15 PRO SILVER', IMEI: '987654321098765', Color: 'SILVER', Storage: '256GB', Price: '1299' },
      { Product: 'XIAOMI NOTE 12 BLUE', IMEI: '555444333222111', Color: 'BLUE', Storage: '64GB', Price: '399' },
    ],
    fileName: 'Sample Data (Demo)'
  };

  const handleMockData = () => {
    setExcelData(mockExcelData);
    onExcelDataLoaded?.(mockExcelData);
    setUploadedFile(null);
    toast.success('Mock Excel data loaded for demonstration');
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          Excel Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Excel Mode Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Excel Mode</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excelMode}
              onChange={(e) => {
                setExcelMode(e.target.checked);
                if (e.target.checked) {
                  onShowMappingModal?.();
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-xs">{excelMode ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        {/* Status Message */}
        {excelMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800">
              <strong>Excel Mode Active</strong>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              The Excel mapping modal will open automatically when you toggle Excel Mode ON.
              Upload your Excel file and configure component mappings in the modal.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}