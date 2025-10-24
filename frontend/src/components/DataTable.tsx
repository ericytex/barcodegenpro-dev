import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataTableProps {
  data: any[];
  onGenerateBarcodes: (selectedData: any[]) => void;
}

export function DataTable({ data, onGenerateBarcodes }: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Debug logging
  console.log('DataTable received data:', data);
  console.log('DataTable data length:', data?.length);
  console.log('DataTable first item:', data?.[0]);

  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === data.length ? [] : data.map((_, index) => index)
    );
  };

  const handleGenerateBarcodes = () => {
    console.log('Generate Barcodes clicked!');
    console.log('Selected rows:', selectedRows);
    console.log('Data length:', data.length);
    const selectedData = selectedRows.map(index => data[index]);
    console.log('Selected data (stringified):', JSON.stringify(selectedData, null, 2));
    onGenerateBarcodes(selectedData);
  };

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No data uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload an Excel file to see your data here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const headers = Object.keys(data[0] || {}).filter(key => key !== 'id');
  const displayData = showAll ? data : data.slice(0, 10);

  return (
    <Card className="shadow-elegant transition-smooth hover:shadow-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Data Preview
            </CardTitle>
            <CardDescription>
              {data.length} rows • {selectedRows.length} selected
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="transition-smooth"
            >
              {showAll ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showAll ? 'Show Less' : `Show All (${data.length})`}
            </Button>
            
            <Button
              onClick={handleGenerateBarcodes}
              disabled={selectedRows.length === 0}
              className="gradient-primary border-0 text-white transition-smooth hover:shadow-glow"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Barcodes ({selectedRows.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </TableHead>
                {headers.map((header) => (
                  <TableHead key={header} className="font-medium">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {displayData.map((row, index) => {
                const actualIndex = showAll ? index : index;
                const isSelected = selectedRows.includes(actualIndex);
                
                return (
                  <TableRow
                    key={actualIndex}
                    className={`transition-smooth cursor-pointer ${
                      isSelected ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => toggleRowSelection(actualIndex)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(actualIndex)}
                        className="rounded border-border"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    {headers.map((header) => (
                      <TableCell key={header} className="max-w-[200px] truncate">
                        {row[header] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {!showAll && data.length > 10 && (
          <div className="mt-4 text-center">
            <Badge variant="secondary" className="text-xs">
              Showing 10 of {data.length} rows
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}