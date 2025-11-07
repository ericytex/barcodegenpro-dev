import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { BarcodeComponent } from './barcodePreview';

export interface CanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  gridSize?: number;
  showGrid?: boolean;
}

export class LiveCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: CanvasOptions;
  private components: BarcodeComponent[] = [];
  private selectedComponent: BarcodeComponent | null = null;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private resizeHandle: string | null = null;
  private editingComponent: BarcodeComponent | null = null;
  private editingInput: HTMLInputElement | null = null;

  constructor(canvas: HTMLCanvasElement, options: CanvasOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.options = options;
    
    this.setupCanvas();
  }

  private setupCanvas() {
    // Set canvas dimensions
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    
    // Set canvas styles
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'auto';
  }

  setComponents(components: BarcodeComponent[]) {
    this.components = components;
    this.render();
  }

  setSelectedComponent(component: BarcodeComponent | null) {
    this.selectedComponent = component;
    this.render();
  }

  setDragging(isDragging: boolean) {
    this.isDragging = isDragging;
    this.render();
  }

  setResizing(isResizing: boolean, handle: string | null = null) {
    this.isResizing = isResizing;
    this.resizeHandle = handle;
    this.render();
  }

  render() {
    this.renderBackground();
    this.renderComponents();
    // Remove selection rendering completely - no bounding boxes or handles
  }

  private renderBackground() {
    // Clear canvas
    this.ctx.fillStyle = this.options.backgroundColor || '#ffffff';
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);

    // Draw grid if enabled
    if (this.options.showGrid && this.options.gridSize) {
      this.drawGrid();
    }
  }

  private drawGrid() {
    const gridSize = this.options.gridSize!;
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([1, 4]);

    // Vertical lines
    for (let x = 0; x <= this.options.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.options.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.options.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.options.width, y);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);
  }

  private async renderComponents() {
    for (const component of this.components) {
      await this.renderComponent(component);
    }
  }

  private async renderComponent(component: BarcodeComponent) {
    const { x, y, width = 100, height = 30, properties } = component;

    // Apply opacity if dragging
    const opacity = this.isDragging && this.selectedComponent?.id === component.id ? 0.7 : 1;
    this.ctx.globalAlpha = opacity;

    switch (component.type) {
      case 'text':
        await this.renderText(x, y, width, height, properties, component);
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

    this.ctx.globalAlpha = 1;
  }

  private async renderText(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties'],
    component: BarcodeComponent
  ) {
    const { text = 'Text', fontSize = 16, fontFamily = 'Arial', color = '#000000', borderWidth = 1, fillColor = 'transparent', strokeColor = '#000000', letterSpacing = 0 } = properties;

    // Draw background rectangle if fillColor is not transparent
    if (fillColor !== 'transparent') {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, y, width, height);
    }

    // Draw text
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    // Show placeholder text if empty, with subtle styling to indicate it's editable
    const displayText = text || 'Click to edit';
    const textColor = text ? color : '#999999'; // Gray for placeholder
    this.ctx.fillStyle = textColor;

    // Add subtle border for empty text to indicate it's editable
    if (!text) {
      this.ctx.strokeStyle = '#e0e0e0';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 2]); // Dashed border for empty text
      this.ctx.strokeRect(x, y, width, height);
      this.ctx.setLineDash([]); // Reset line dash
    }

    // Render text with letter spacing support
    if (letterSpacing !== 0) {
      // Render character by character with spacing
      this.renderTextWithLetterSpacing(displayText, x, y, width, height, fontSize, letterSpacing);
    } else {
      // Wrap text if it exceeds width (original behavior for no letter spacing)
      const words = displayText.split(' ');
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
  ) {
    const { data = '123456789', barcodeType = 'code128' } = properties;

    try {
      // Create a temporary canvas for the barcode
      const barcodeCanvas = document.createElement('canvas');
      barcodeCanvas.width = width;
      barcodeCanvas.height = height;

      // Generate barcode using JsBarcode with proper width scaling
      JsBarcode(barcodeCanvas, data, {
        format: barcodeType.toUpperCase(),
        width: Math.max(1, Math.floor(width / 50)),
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
  ) {
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
  ) {
    const { fillColor = 'transparent' } = properties;
    
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(x, y, width, height);
    
    // Don't draw component border - selection system handles all borders
  }

  private renderLine(
    x: number,
    y: number,
    width: number,
    height: number,
    properties: BarcodeComponent['properties']
  ) {
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
  ) {
    const { fillColor = 'transparent' } = properties;

    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    this.ctx.fillStyle = fillColor;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Don't draw component border - selection system handles all borders
  }

  private renderSelection() {
    // Render selection and handles on main canvas
    if (this.selectedComponent) {
      this.renderSelectionBorder(this.selectedComponent);
    }
  }

  private renderSelectionBorder(component: BarcodeComponent) {
    if (!component) return;
    
    const { x, y, width = 100, height = 30 } = component;

    // Clean selection border - dashed line like professional design tools
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]); // Dashed line
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.setLineDash([]); // Reset line dash

    // Resize handles
    if (!this.isDragging) {
      this.renderResizeHandles(x, y, width, height);
    }
  }

  private renderResizeHandles(x: number, y: number, width: number, height: number) {
    const handleSize = 8;
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize' }, // NW
      { x: x + width/2 - handleSize/2, y: y - handleSize/2, cursor: 'n-resize' }, // N
      { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize' }, // NE
      { x: x + width - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'e-resize' }, // E
      { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize' }, // SE
      { x: x + width/2 - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize' }, // S
      { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize' }, // SW
      { x: x - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'w-resize' }, // W
    ];

    this.ctx.fillStyle = '#3b82f6';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;

    handles.forEach(handle => {
      // Draw circular handles instead of square ones
      this.ctx.beginPath();
      this.ctx.arc(handle.x + handleSize/2, handle.y + handleSize/2, handleSize/2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  // Direct editing methods
  startDirectEdit(component: BarcodeComponent, onUpdate: (component: BarcodeComponent, property: string, value: any) => void) {
    if (component.type !== 'text') return;
    
    this.editingComponent = component;
    this.selectedComponent = component;
    
    // Create input element positioned over the component
    const input = document.createElement('input');
    input.type = 'text';
    input.value = component.properties.text || '';
    input.style.position = 'absolute';
    input.style.left = `${this.canvas.offsetLeft + component.x}px`;
    input.style.top = `${this.canvas.offsetTop + component.y}px`;
    input.style.width = `${component.width || 100}px`;
    input.style.height = `${component.height || 30}px`;
    input.style.border = '2px solid #3b82f6';
    input.style.borderRadius = '4px';
    input.style.padding = '4px';
    input.style.fontSize = `${component.properties.fontSize || 16}px`;
    input.style.fontFamily = component.properties.fontFamily || 'Arial';
    input.style.color = component.properties.color || '#000000';
    input.style.backgroundColor = 'white';
    input.style.zIndex = '1000';
    input.style.outline = 'none';
    
    this.editingInput = input;
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    const handleBlur = () => {
      if (input.value.trim() !== '') {
        onUpdate(component, 'text', input.value);
      }
      this.finishDirectEdit();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        this.finishDirectEdit();
      }
    };
    
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);
  }
  
  finishDirectEdit() {
    if (this.editingInput) {
      if (document.body.contains(this.editingInput)) {
        document.body.removeChild(this.editingInput);
      }
      this.editingInput = null;
    }
    this.editingComponent = null;
  }
  
  isEditing(): boolean {
    return this.editingComponent !== null;
  }

  // Direct resizing without handles - detect edges
  isPointNearEdge(x: number, y: number, component: BarcodeComponent): string | null {
    const edgeThreshold = 8;
    const { x: compX, y: compY, width = 100, height = 30 } = component;
    
    // Check if point is near any edge
    const nearLeft = Math.abs(x - compX) <= edgeThreshold;
    const nearRight = Math.abs(x - (compX + width)) <= edgeThreshold;
    const nearTop = Math.abs(y - compY) <= edgeThreshold;
    const nearBottom = Math.abs(y - (compY + height)) <= edgeThreshold;
    
    // Determine resize handle based on which edges are near
    if (nearLeft && nearTop) return 'nw';
    if (nearRight && nearTop) return 'ne';
    if (nearLeft && nearBottom) return 'sw';
    if (nearRight && nearBottom) return 'se';
    if (nearLeft) return 'w';
    if (nearRight) return 'e';
    if (nearTop) return 'n';
    if (nearBottom) return 's';
    
    return null;
  }
  
  // Get cursor style for edge detection
  getCursorForEdge(x: number, y: number, component: BarcodeComponent): string {
    const handle = this.isPointNearEdge(x, y, component);
    if (!handle) return 'default';
    
    const cursors: { [key: string]: string } = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize',
      'n': 'n-resize',
      's': 's-resize',
      'e': 'e-resize',
      'w': 'w-resize'
    };
    
    return cursors[handle] || 'default';
  }

  // Hit detection methods
  getComponentAt(x: number, y: number): BarcodeComponent | null {
    // Check from top to bottom (last drawn is on top)
    for (let i = this.components.length - 1; i >= 0; i--) {
      const component = this.components[i];
      if (this.isPointInComponent(x, y, component)) {
        return component;
      }
    }
    return null;
  }

  private isPointInComponent(x: number, y: number, component: BarcodeComponent): boolean {
    const { x: compX, y: compY, width = 100, height = 30 } = component;
    return x >= compX && x <= compX + width && y >= compY && y <= compY + height;
  }

  getResizeHandleAt(x: number, y: number): string | null {
    if (!this.selectedComponent) return null;

    const { x: compX, y: compY, width = 100, height = 30 } = this.selectedComponent;
    const handleSize = 8;
    const tolerance = 4;

    const handles = [
      { x: compX - handleSize/2, y: compY - handleSize/2, handle: 'nw' },
      { x: compX + width/2 - handleSize/2, y: compY - handleSize/2, handle: 'n' },
      { x: compX + width - handleSize/2, y: compY - handleSize/2, handle: 'ne' },
      { x: compX + width - handleSize/2, y: compY + height/2 - handleSize/2, handle: 'e' },
      { x: compX + width - handleSize/2, y: compY + height - handleSize/2, handle: 'se' },
      { x: compX + width/2 - handleSize/2, y: compY + height - handleSize/2, handle: 's' },
      { x: compX - handleSize/2, y: compY + height - handleSize/2, handle: 'sw' },
      { x: compX - handleSize/2, y: compY + height/2 - handleSize/2, handle: 'w' },
    ];

    for (const handle of handles) {
      if (x >= handle.x - tolerance && x <= handle.x + handleSize + tolerance &&
          y >= handle.y - tolerance && y <= handle.y + handleSize + tolerance) {
        return handle.handle;
      }
    }

    return null;
  }

  // Export methods
  exportAsDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  exportAsBlob(): Promise<Blob> {
    return new Promise(resolve => {
      this.canvas.toBlob(resolve!, 'image/png');
    });
  }
}
