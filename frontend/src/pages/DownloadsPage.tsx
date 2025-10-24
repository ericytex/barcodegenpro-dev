import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, Calendar, Filter, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBarcodeApi } from "@/hooks/useBarcodeApi";
import { useEffect, useState } from "react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

export default function DownloadsPage() {
  const { availableFiles, listFiles, isLoading, error } = useBarcodeApi();
  const [downloadStats, setDownloadStats] = useState({
    totalDownloads: 0,
    pdfCollections: 0,
    pngFiles: 0,
    totalSize: 0
  });

  useEffect(() => {
    listFiles();
  }, [listFiles]);

  // Calculate download stats
  useEffect(() => {
    const pngFiles = availableFiles.filter(file => file.filename.endsWith('.png'));
    const pdfFiles = availableFiles.filter(file => file.filename.endsWith('.pdf'));
    const totalSize = availableFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    setDownloadStats({
      totalDownloads: availableFiles.length,
      pdfCollections: pdfFiles.length,
      pngFiles: pngFiles.length,
      totalSize: totalSize
    });
  }, [availableFiles]);

  const handleDownload = async (filename: string, isPdf: boolean = false) => {
    try {
      if (isPdf) {
        await apiService.downloadPdfFile(filename);
      } else {
        await apiService.downloadBarcodeFile(filename);
      }
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(`Failed to download ${filename}: ${error}`);
    }
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
          <p className="text-muted-foreground">
            Download your generated barcode files and collections
          </p>
        </div>

        {/* Filter and Search */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter & Search
            </CardTitle>
            <CardDescription>
              Find specific files or collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                All Time
              </Button>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                PDF Collections
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PNG Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Downloads */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Recent Downloads
            </CardTitle>
            <CardDescription>
              Your most recently generated files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableFiles.length > 0 ? (
                availableFiles
                  .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
                  .slice(0, 5)
                  .map((file) => (
                    <div key={file.filename} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{file.filename}</h4>
                          <p className="text-sm text-muted-foreground">
                            {file.filename.endsWith('.pdf') ? 'PDF Collection' : 'PNG File'} • 
                            {(file.size / 1024 / 1024).toFixed(2)} MB • 
                            {new Date(file.modified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(file.filename, file.filename.endsWith('.pdf'))}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <Download className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Files Available</h3>
                  <p className="text-muted-foreground">
                    Generate barcodes to see them here
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{downloadStats.totalDownloads}</div>
              <p className="text-xs text-muted-foreground">This session</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">PDF Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{downloadStats.pdfCollections}</div>
              <p className="text-xs text-muted-foreground">Generated</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">PNG Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{downloadStats.pngFiles}</div>
              <p className="text-xs text-muted-foreground">Individual barcodes</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{(downloadStats.totalSize / 1024 / 1024).toFixed(1)} MB</div>
              <p className="text-xs text-muted-foreground">Downloaded</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
