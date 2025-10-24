import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface BarcodeOptions {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
}

export interface QRCodeOptions {
  value: string;
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate a barcode as a data URL
 */
export const generateBarcodeDataURL = (options: BarcodeOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting barcode generation with options:', options);
      
      const canvas = document.createElement('canvas');
      
      // Set canvas size first
      canvas.width = 300;
      canvas.height = 100;

      console.log('Canvas size set to: 300 x 100');

      // Generate barcode with minimal options
      JsBarcode(canvas, options.value || "1234567890", {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: false, // Remove the label
        background: '#ffffff',
        lineColor: '#000000',
        margin: 5,
      });

      console.log('Barcode generated successfully');
      resolve(canvas.toDataURL());
    } catch (error) {
      console.error('Barcode generation error:', error);
      reject(error);
    }
  });
};

/**
 * Generate a QR code as a data URL
 */
export const generateQRCodeDataURL = (options: QRCodeOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(options.value, {
      width: options.width || 200,
      margin: options.margin || 1,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#ffffff',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    })
    .then((dataURL) => resolve(dataURL))
    .catch((error) => reject(error));
  });
};

/**
 * Generate a barcode as an HTML Image element
 */
export const generateBarcodeImage = async (options: BarcodeOptions): Promise<HTMLImageElement> => {
  const dataURL = await generateBarcodeDataURL(options);
  const img = new Image();
  img.src = dataURL;
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

/**
 * Generate a QR code as an HTML Image element
 */
export const generateQRCodeImage = async (options: QRCodeOptions): Promise<HTMLImageElement> => {
  const dataURL = await generateQRCodeDataURL(options);
  const img = new Image();
  img.src = dataURL;
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};
