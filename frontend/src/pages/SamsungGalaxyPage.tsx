import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Palette, Upload, PenTool, FileText, Download, BarChart3, Smartphone, Zap } from 'lucide-react';
import SamsungGalaxyExcelUpload from '@/components/SamsungGalaxyExcelUpload';
import BarcodeDesignerV2 from '@/components/BarcodeDesignerV2';
import { TokenBalance } from '@/components/TokenBalance';
import { TokenPurchaseModal } from '@/components/TokenPurchaseModal';
import { InsufficientTokensModal } from '@/components/InsufficientTokensModal';
import { useTokens } from '@/contexts/TokenContext';

interface GeneratedBarcode {
  filename: string;
  filepath: string;
}

const SamsungGalaxyPage: React.FC = () => {
  const [excelBarcodes, setExcelBarcodes] = useState<GeneratedBarcode[]>([]);
  const [activeTab, setActiveTab] = useState("design");

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Navigation Tabs - Professional Style */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("design")}
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === "design"
                  ? "bg-primary text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <PenTool className="w-4 h-4" />
              Design
            </button>
            <button
              onClick={() => setActiveTab("excel")}
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === "excel"
                  ? "bg-primary text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Upload className="w-4 h-4" />
              Excel Upload
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === "design" && (
            <Card className="shadow-card border-0 glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Palette className="w-5 h-5 text-primary" />
                  Barcode Designer
                </CardTitle>
                <CardDescription className="text-base">
                  Create and customize barcode templates with our advanced design tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeDesignerV2 />
              </CardContent>
            </Card>
          )}

          {activeTab === "excel" && (
            <div className="space-y-6">
              {/* Main Excel Upload Section */}
              <Card className="shadow-card border-0 glass-effect bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6 text-primary" />
                        </div>
                        Excel File Processing
                      </CardTitle>
                      <CardDescription className="text-base mt-2 text-muted-foreground">
                        Upload your Excel file to process data and generate professional barcodes
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Ready to Process
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SamsungGalaxyExcelUpload onBarcodesGenerated={(barcodes) => {
                    setExcelBarcodes(barcodes);
                  }} />
                </CardContent>
              </Card>


            </div>
          )}

        </div>

        {/* Quick Actions Footer - Moved to bottom */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <Card className="shadow-card border-0 glass-effect bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Need Help Getting Started?</h3>
                  <p className="text-muted-foreground text-sm">
                    Follow our step-by-step guide to create professional barcodes
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                    <FileText className="w-4 h-4" />
                    View Guide
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted/50 transition-colors">
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SamsungGalaxyPage;