import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface BarcodeComponent {
  id: string;
  type: 'text' | 'barcode' | 'qr' | 'rectangle' | 'line' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties: {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    data?: string;
    barcodeType?: 'code128' | 'qr';
    borderWidth?: number;
    fillColor?: string;
    strokeColor?: string;
    letterSpacing?: number;
  };
}

export interface PreviewOptions {
  width: number;
  height: number;
  backgroundColor?: string;
}

export class BarcodePreviewGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  async generatePreview(
    components: BarcodeComponent[],
    options: PreviewOptions = { width: 600, height: 200, backgroundColor: '#ffffff' }
  ): Promise<string> {
    // Set canvas dimensions
    this.canvas.width = options.width;
    this.canvas.height = options.height;

    // Clear canvas with background color
    this.ctx.fillStyle = options.backgroundColor!;
    this.ctx.fillRect(0, 0, options.width, options.height);

    // Render each component
    for (const component of components) {
      await this.renderComponent(component);
    }

    // Return data URL
    return this.canvas.toDataURL('image/png');
  }

  private async renderComponent(component: BarcodeComponent): Promise<void> {
    const { x, y, width = 100, height = 30, properties } = component;

    switch (component.type) {
      case 'text':
        await this.renderText(x, y, width, height, properties);
        break;
      case 'barcode':
        await this.renderBarcode(x, y, width, height, properties);
        break;
      case 'qr':
        await this.renderQRCode(x, y, width, height, properties);
        break;
      case 'rectangle':
        this.renderRectangle(x, y, width, height, properties);
        break;
      case 'line':
        this.renderLine(x, y, width, height, properties);
        break;
      case 'circle':
        this.renderCircle(x, y, width, height, properties);
        break;
    }
  }

  private async renderText(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): Promise<void> {
    const { text = '', fontSize = 16, fontFamily = 'Arial', color = '#000000', letterSpacing = 0 } = properties;

    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    // Render text with letter spacing support
    if (letterSpacing !== 0) {
      // Render character by character with spacing
      this.renderTextWithLetterSpacing(text, x, y, width, height, fontSize, letterSpacing);
    } else {
      // Wrap text if it exceeds width (original behavior for no letter spacing)
      const words = text.split(' ');
      let line = '';
      let lineY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > width && n > 0) {
          this.ctx.fillText(line, x, lineY);
          line = words[n] + ' ';
          lineY += fontSize;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, x, lineY);
    }
  }

  private renderTextWithLetterSpacing(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    letterSpacing: number
  ) {
    // Split text into words for word wrapping
    const words = text.split(' ');
    let currentX = x;
    let currentY = y;
    const lineHeight = fontSize;

    for (const word of words) {
      // Measure word width with letter spacing
      let wordWidth = 0;
      for (let i = 0; i < word.length; i++) {
        const charMetrics = this.ctx.measureText(word[i]);
        wordWidth += charMetrics.width;
        if (i < word.length - 1) {
          wordWidth += letterSpacing;
        }
      }

      // Check if word fits on current line
      if (currentX + wordWidth > x + width && currentX > x) {
        // Move to next line
        currentX = x;
        currentY += lineHeight;
        
        // Check if we've exceeded height
        if (currentY + lineHeight > y + height) {
          break;
        }
      }

      // Render word character by character with letter spacing
      for (let i = 0; i < word.length; i++) {
        this.ctx.fillText(word[i], currentX, currentY);
        const charMetrics = this.ctx.measureText(word[i]);
        currentX += charMetrics.width + letterSpacing;
      }

      // Add space after word (except for last word)
      if (words.indexOf(word) < words.length - 1) {
        const spaceMetrics = this.ctx.measureText(' ');
        currentX += spaceMetrics.width;
      }
    }
  }

  private async renderBarcode(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): Promise<void> {
    const { data = '123456789', barcodeType = 'code128' } = properties;

    try {
      // Create a temporary canvas for the barcode
      const barcodeCanvas = document.createElement('canvas');
      barcodeCanvas.width = width;
      barcodeCanvas.height = height;

      // Generate barcode using JsBarcode with proper width scaling
      JsBarcode(barcodeCanvas, data, {
        format: barcodeType.toUpperCase(),
        width: Math.max(1, Math.floor(width / 50)), // Scale width based on component width
        height: height - 10,
        displayValue: false,
        margin: 0,
      });

      // Draw the barcode onto the main canvas
      this.ctx.drawImage(barcodeCanvas, x, y + 5);
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Fallback: draw a placeholder
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, width, height);
    }
  }

  private async renderQRCode(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): Promise<void> {
    const { data = '123456789' } = properties;

    try {
      // Generate QR code data URL
      const qrDataURL = await QRCode.toDataURL(data, {
        width: Math.min(width, height),
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      // Create image from data URL and wait for it to load
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          this.ctx.drawImage(img, x, y, width, height);
          resolve();
        };
        img.onerror = reject;
        img.src = qrDataURL;
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback: draw a placeholder square
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, width, height);
    }
  }

  private renderRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): void {
    const { borderWidth = 1, fillColor = 'transparent', strokeColor = '#000000' } = properties;

    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.fillStyle = fillColor;

    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
  }

  private renderLine(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): void {
    const { borderWidth = 1, strokeColor = '#000000' } = properties;

    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height / 2);
    this.ctx.lineTo(x + width, y + height / 2);
    this.ctx.stroke();
  }

  private renderCircle(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ): void {
    const { borderWidth = 1, fillColor = 'transparent', strokeColor = '#000000' } = properties;

    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.fillStyle = fillColor;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
  }
}

export const generateBarcodePreview = async (
  components: BarcodeComponent[],
  canvas: HTMLCanvasElement,
  options?: PreviewOptions
): Promise<string> => {
  const generator = new BarcodePreviewGenerator(canvas);
  return generator.generatePreview(components, options);
};
