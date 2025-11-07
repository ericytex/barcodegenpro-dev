import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { Device } from "@/lib/api";

interface ColumnSpec {
  name: string;
  required: boolean;
  description: string;
  example: string;
  aliases?: string[];
}

interface ExcelColumnPreviewProps {
  device: Device | null;
}

// Define expected columns for different device types
const getExpectedColumns = (deviceType: string | null): ColumnSpec[] => {
  if (!deviceType) {
    // Default columns for generic barcode generation
    return [
      {
        name: "IMEI",
        required: true,
        description: "International Mobile Equipment Identity (15 digits)",
        example: "350544301197847",
        aliases: ["imei", "IMEI/SN", "imei_sn", "serial", "serial_number", "sn"]
      },
      {
        name: "Model",
        required: true,
        description: "Device model name or code",
        example: "Vision 7 Plus",
        aliases: ["model", "model_name", "device_model", "model_code"]
      },
      {
        name: "Product",
        required: false,
        description: "Product name (used for color/storage extraction)",
        example: "Itel Vision 7 Plus 128GB",
        aliases: ["product", "product_name", "device", "device_name"]
      },
      {
        name: "Color",
        required: false,
        description: "Device color or finish",
        example: "Ocean Blue",
        aliases: ["color", "colour", "device_color", "color_name"]
      },
      {
        name: "DN",
        required: false,
        description: "Device Number (default: M8N7)",
        example: "M8N7",
        aliases: ["dn", "d/n", "device_number", "part_number"]
      },
      {
        name: "Box ID",
        required: false,
        description: "Box or package identifier",
        example: "BOX001",
        aliases: ["box_id", "boxid", "box_number", "package_id"]
      }
    ];
  }

  const deviceTypeLower = deviceType.toLowerCase();
  
  // ITEL-BARCODES specific columns (handle various naming formats)
  // DeviceSelector converts "ITEL-BARCODES" -> "itel-barcodes" (lowercase, spaces to underscores)
  // So we check for "itel" in the name and specifically "itel-barcodes" or "itel_barcodes"
  if (deviceTypeLower.includes("itel") && 
      (deviceTypeLower.includes("barcode") || 
       deviceTypeLower === "itel-barcodes" || 
       deviceTypeLower === "itel_barcodes")) {
    return [
      {
        name: "IMEI/SN",
        required: true,
        description: "IMEI number (15 digits, will be formatted as 'IMEI 1 : {imei}')",
        example: "352201700084294",
        aliases: ["imei", "IMEI", "IMEI/SN"]
      },
      {
        name: "COLOR",
        required: false,
        description: "Device color variant",
        example: "PURE BLACK",
        aliases: ["color", "Color", "COLOR"]
      },
      {
        name: "PRODUCT",
        required: false,
        description: "Product model code",
        example: "A6611L 64+2",
        aliases: ["product", "Product", "PRODUCT"]
      },
      {
        name: "VC",
        required: false,
        description: "Verification Code",
        example: "375001",
        aliases: ["vc", "VC", "verification_code"]
      }
    ];
  }

  // Default columns for other device types
  return getExpectedColumns(null);
};

export function ExcelColumnPreview({ device }: ExcelColumnPreviewProps) {
  if (!device) {
    return null;
  }

  const expectedColumns = getExpectedColumns(device.device_type);
  const deviceTypeLower = device.device_type?.toLowerCase() || "";
  const isItel = deviceTypeLower.includes("itel") || 
                 deviceTypeLower === "itel-barcodes" ||
                 deviceTypeLower === "itel_barcodes" ||
                 deviceTypeLower === "itel-barcode" ||
                 deviceTypeLower.includes("itel-barcode");

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Expected Excel Columns</CardTitle>
        </div>
        <CardDescription>
          {isItel 
            ? "Required columns and format for ITEL-BARCODES barcode generation"
            : `Required columns for ${device.brand} ${device.name} barcode generation`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sample Excel preview - Excel-like styling */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Sample Excel Format:</h4>
            <div className="border border-gray-400 rounded overflow-hidden bg-white shadow-sm excel-preview-container" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
              <style>{`
                .excel-preview-container .excel-green-header {
                  color: #ffffff !important;
                }
                .excel-preview-container [style*="background-color: #217346"] {
                  color: #ffffff !important;
                }
                .excel-preview-container [style*="background-color: rgb(33, 115, 70)"] {
                  color: #ffffff !important;
                }
                .excel-preview-container [style*="background-color: rgb(33,115,70)"] {
                  color: #ffffff !important;
                }
              `}</style>
              {/* Excel-like grid */}
              <div className="relative">
                {/* Top row: Column letters (A, B, C, D...) */}
                <div className="flex">
                  {/* Empty cell for row number column */}
                  <div className="w-12 border-r border-gray-400 excel-green-header" style={{ minHeight: '21px', backgroundColor: '#217346' }}></div>
                  {/* Column letters */}
                  {expectedColumns.map((col, i) => {
                    const columnLetter = String.fromCharCode(65 + i); // A, B, C, D...
                    return (
                      <div key={i} className="flex-1 border-r border-gray-400 last:border-r-0 text-center text-xs font-medium excel-green-header" style={{ minHeight: '21px', lineHeight: '21px', paddingTop: '2px', backgroundColor: '#217346', color: '#ffffff', fontWeight: '500' } as React.CSSProperties}>
                        {columnLetter}
                      </div>
                    );
                  })}
                </div>
                
                {/* Header row: Column names */}
                <div className="flex border-b border-gray-400">
                  {/* Row number column header (empty) */}
                  <div className="w-12 border-r border-gray-400 excel-green-header" style={{ minHeight: '21px', backgroundColor: '#217346' }}></div>
                  {/* Column name headers */}
                  {expectedColumns.map((col, i) => (
                    <div key={i} className="flex-1 border-r border-gray-400 last:border-r-0 text-left px-2 py-0.5 text-xs font-bold excel-green-header" style={{ minHeight: '21px', lineHeight: '21px', backgroundColor: '#217346', color: '#ffffff', fontWeight: '700' } as React.CSSProperties}>
                      {col.name}
                    </div>
                  ))}
                </div>
                
                {/* Data rows */}
                <div className="flex flex-col">
                  {/* Sample row 1 */}
                  <div className="flex border-b border-gray-300">
                    {/* Row number */}
                    <div className="w-12 border-r border-gray-400 flex items-center justify-center text-xs font-medium excel-green-header" style={{ minHeight: '21px', lineHeight: '21px', backgroundColor: '#217346', color: '#ffffff', fontWeight: '500' } as React.CSSProperties}>
                      2
                    </div>
                    {/* Data cells */}
                    {expectedColumns.map((col, i) => {
                      let example = col.example;
                      // Use exact values from the image for row 2
                      if (isItel) {
                        if (col.name === "IMEI/SN") example = "352201700084294";
                        if (col.name === "COLOR") example = "PURE BLACK";
                        if (col.name === "PRODUCT") example = "A6611L 64+2";
                        if (col.name === "VC") example = "375001";
                      }
                      return (
                        <div key={i} className="flex-1 border-r border-gray-300 last:border-r-0 px-2 py-0.5 text-xs text-black bg-white" style={{ minHeight: '21px', lineHeight: '21px' }}>
                          {example}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Sample row 2 (variation) - highlighted in orange */}
                  <div className="flex border-b border-gray-300">
                    {/* Row number - orange highlight */}
                    <div className="w-12 border-r border-orange-500 flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: '#ff9800', minHeight: '21px', lineHeight: '21px' }}>
                      3
                    </div>
                    {/* Data cells - orange border highlight */}
                    {expectedColumns.map((col, i) => {
                      let example = col.example;
                      if (col.name === "IMEI" || col.name === "IMEI/SN") example = "359484731063080";
                      if (col.name === "Color" || col.name === "COLOR") example = "STARLIT BLACK";
                      if (col.name === "Product" || col.name === "PRODUCT") {
                        if (isItel) {
                          example = "A6611L 64+2";
                        } else {
                          example = example.replace("Ocean Blue", "STARLIT BLACK").replace("Itel Vision 7 Plus 128GB", "A6611L 64+2");
                        }
                      }
                      if (col.name === "VC") example = "375002";
                      if (col.name === "DN") example = "M8N7";
                      return (
                        <div 
                          key={i} 
                          className="flex-1 border-r border-orange-500 last:border-r-0 px-2 py-0.5 text-xs text-black" 
                          style={{ 
                            minHeight: '21px', 
                            lineHeight: '21px',
                            backgroundColor: '#fff4e6',
                            borderTop: '1px solid #ff9800',
                            borderBottom: '1px solid #ff9800'
                          }}
                        >
                          {example}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Sample row 3 */}
                  <div className="flex border-b border-gray-300">
                    {/* Row number */}
                    <div className="w-12 border-r border-gray-400 flex items-center justify-center text-xs font-medium excel-green-header" style={{ minHeight: '21px', lineHeight: '21px', backgroundColor: '#217346', color: '#ffffff', fontWeight: '500' } as React.CSSProperties}>
                      4
                    </div>
                    {/* Data cells */}
                    {expectedColumns.map((col, i) => {
                      let example = col.example;
                      if (col.name === "IMEI" || col.name === "IMEI/SN") example = "357660270558349";
                      if (col.name === "Color" || col.name === "COLOR") example = "STARLIT BLACK";
                      if (col.name === "Product" || col.name === "PRODUCT") {
                        if (isItel) {
                          example = "A6610L 128+3";
                        } else {
                          example = "A6610L 128+3";
                        }
                      }
                      if (col.name === "VC") example = "375003";
                      return (
                        <div key={i} className="flex-1 border-r border-gray-300 last:border-r-0 px-2 py-0.5 text-xs text-black bg-white" style={{ minHeight: '21px', lineHeight: '21px' }}>
                          {example}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>Note:</strong> Column names are case-insensitive and support various formats.</p>
            <p>The system will automatically map your Excel columns to the expected format.</p>
            {isItel && (
              <p className="text-blue-700 font-medium">
                For ITEL-BARCODES: IMEI must be exactly 15 digits. The system will format it automatically.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

