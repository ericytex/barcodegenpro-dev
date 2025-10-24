import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  example: string;
  description: string;
}

export interface ExcelTemplate {
  columns: ExcelColumn[];
  sampleData: Record<string, string>;
}

// Generate Excel columns based on template components
export const generateExcelColumnsFromTemplate = (template: any): ExcelColumn[] => {
  if (!template || !template.components) {
    // Default columns if no template
    return [
      { header: 'Product', example: 'SMART 10 64+3 TITANIUM SILVER', description: 'Product description with "+X" text' },
      { header: 'Color', example: 'SAPPHIRE BLACK', description: 'Device color' },
      { header: 'IMEI/sn', example: '350544301197847', description: '15-digit IMEI number' },
      { header: 'VC', example: '874478', description: 'Verification code' },
      { header: 'Storage', example: '64+2', description: 'Storage capacity' }
    ];
  }

  let components: any[] = [];
  
  try {
    // Parse components if it's a string
    if (typeof template.components === 'string') {
      components = JSON.parse(template.components);
    } else if (Array.isArray(template.components)) {
      components = template.components;
    }
  } catch (error) {
    console.error('Error parsing template components:', error);
    components = [];
  }

  // Generate columns based on template components and their props
  const columns: ExcelColumn[] = [];
  const seenProps = new Set<string>();

  components.forEach((component: any) => {
    if (component.props) {
      Object.entries(component.props).forEach(([key, value]) => {
        if (typeof key === 'string' && typeof value === 'string') {
          // Skip if we've already added this column
          if (seenProps.has(key)) return;

          // Map common prop keys to meaningful column headers
          let header = key;
          let example = '';
          let description = '';

          switch (key.toLowerCase()) {
            case 'text':
            case 'content':
              header = component.type === 'text' ? 'Text Label' : `${component.type} Content`;
              example = 'Sample Text';
              description = 'Text content for the component';
              break;
            case 'value':
              if (component.type === 'barcode') {
                header = 'IMEI';
                example = '123456789012345';
                description = 'IMEI number for barcode';
              } else if (component.type === 'qr') {
                header = 'QR Code Data';
                example = 'https://example.com';
                description = 'Data for QR code';
              } else {
                header = 'Value';
                example = 'Sample Value';
                description = 'Component value';
              }
              break;
            case 'imei':
              header = 'IMEI';
              example = '123456789012345';
              description = 'IMEI number';
              break;
            case 'model':
              header = 'Model';
              example = 'A669L';
              description = 'Device model';
              break;
            case 'color':
              header = 'Color';
              example = 'SAPPHIRE BLACK';
              description = 'Device color';
              break;
            case 'vc':
            case 'verificationcode':
              header = 'VC';
              example = '874478';
              description = 'Verification code';
              break;
            case 'storage':
              header = 'Storage';
              example = '64+2';
              description = 'Storage capacity';
              break;
            case 'serial':
            case 'serialnumber':
              header = 'Serial Number';
              example = 'SN123456789';
              description = 'Serial number';
              break;
            case 'product':
              header = 'Product';
              example = 'SMART 10 64+3 TITANIUM SILVER';
              description = 'Product description';
              break;
            default:
              header = key.charAt(0).toUpperCase() + key.slice(1);
              example = `Sample ${header}`;
              description = `${header} information`;
          }

          columns.push({
            header,
            example,
            description
          });
          seenProps.add(key);
        }
      });
    }
  });

  // If no components found or parsed, add default columns
  if (columns.length === 0) {
    columns.push(
      { header: 'Product', example: 'SMART 10 64+3 TITANIUM SILVER', description: 'Product description with "+X" text' },
      { header: 'Color', example: 'SAPPHIRE BLACK', description: 'Device color' },
      { header: 'IMEI/sn', example: '350544301197847', description: '15-digit IMEI number' },
      { header: 'VC', example: '874478', description: 'Verification code' },
      { header: 'Storage', example: '64+2', description: 'Storage capacity' }
    );
  }

  return columns;
};

// Generate Excel file from template
export const generateExcelTemplate = async (
  template: any,
  templateName: string = 'Barcode Template'
): Promise<Blob> => {
  
  const columns = generateExcelColumnsFromTemplate(template);
  
  // Create workbook
  const workbook = new ExcelJS.Workbook();
  
  // Create template sheet
  const templateSheet = workbook.addWorksheet('Data');
  
  // Add header row with styling
  templateSheet.addRow(columns.map(col => col.header));
  
  // Style the header row
  const headerRow = templateSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' } // Light gray background
  };
  
  // Add example data row
  templateSheet.addRow(columns.map(col => col.example));
  
  // Add empty rows for user data
  for (let i = 0; i < 10; i++) {
    templateSheet.addRow(Array(columns.length).fill(''));
  }
  
  // Set column widths
  columns.forEach((col, index) => {
    templateSheet.getColumn(index + 1).width = 25;
  });
  
  // Create instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions');
  
  const instructionsData = [
    ['Barcode Template Instructions'],
    [''],
    ['Column Descriptions:'],
    ...columns.map(col => [col.header, col.description]),
    [''],
    ['Instructions:'],
    ['1. Fill in the "Data" sheet with your actual data'],
    ['2. Keep the header row intact'],
    ['3. Each row represents one barcode'],
    ['4. Save the file and upload it back to the system'],
    [''],
    ['Template Info:'],
    [`Template: ${template?.name || 'Default'}`],
    [`Generated: ${new Date().toLocaleString()}`]
  ];
  
  instructionsData.forEach(row => {
    instructionsSheet.addRow(row);
  });
  
  // Style the title in instructions
  instructionsSheet.getCell('A1').font = { bold: true, size: 14 };
  instructionsSheet.getColumn(1).width = 25;
  instructionsSheet.getColumn(2).width = 40;
  
  // Generate Excel file buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  return blob;
};

// Download Excel template
export const downloadExcelTemplate = async (
  template: any,
  templateName: string = 'Barcode Template'
) => {
  try {
    const blob = await generateExcelTemplate(template, templateName);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateName.replace(/[^a-z0-9]/gi, '_')}_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading Excel template:', error);
    throw error;
  }
};
