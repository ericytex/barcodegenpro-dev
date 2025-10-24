import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Palette, Download, Eye, Type, Square, Circle, Minus, QrCode, BarChart3, 
  Loader2, FolderOpen, Trash2, Copy, RotateCcw, Grid, Layers, Settings,
  HelpCircle, Move, MousePointer, Zap, Save, Upload, Maximize2, ChevronLeft, ChevronRight,
  Undo2, Redo2
} from 'lucide-react';
import { BarcodeComponent, generateBarcodePreview } from '@/utils/barcodePreview';
import { LiveCanvasRenderer } from '@/utils/liveCanvasRenderer';
import { TemplateDialog } from './TemplateDialog';

/**
 * BarcodeDesigner Component
 * 
 * IMPORTANT: Function ordering matters!
 * Functions must be defined before they're used in dependency arrays.
 * See FUNCTION_ORDERING_GUIDE.md for details.
 */
const BarcodeDesigner: React.FC = () => {
  const [components, setComponents] = useState<BarcodeComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<BarcodeComponent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [history, setHistory] = useState<BarcodeComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRendererRef = useRef<LiveCanvasRenderer | null>(null);

  const componentTypes = [
    { 
      type: 'text', 
      label: 'Text', 
      icon: Type, 
      description: 'Add text labels and descriptions',
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
    },
    { 
      type: 'barcode', 
      label: 'Barcode', 
      icon: BarChart3, 
      description: 'Generate Code128 barcodes',
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
    },
    { 
      type: 'qr', 
      label: 'QR Code', 
      icon: QrCode, 
      description: 'Create QR codes for data',
      color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
    },
    { 
      type: 'rectangle', 
      label: 'Rectangle', 
      icon: Square, 
      description: 'Add rectangular shapes',
      color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
    },
    { 
      type: 'line', 
      label: 'Line', 
      icon: Minus, 
      description: 'Draw horizontal lines',
      color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
    },
    { 
      type: 'circle', 
      label: 'Circle', 
      icon: Circle, 
      description: 'Add circular shapes',
      color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
    },
  ];

  const handleDragStart = useCallback((e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('component-type', componentType);
    setIsDragging(true);
    
    // Hide the dragged element completely
    const draggedElement = e.currentTarget as HTMLElement;
    draggedElement.style.display = 'none';
    
    // Create a completely transparent drag image to prevent visual duplication
    const transparentCanvas = document.createElement('canvas');
    transparentCanvas.width = 1;
    transparentCanvas.height = 1;
    const ctx = transparentCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
    }
    e.dataTransfer.setDragImage(transparentCanvas, 0, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    
    // Restore the dragged element visibility
    const draggedElement = e.currentTarget as HTMLElement;
    draggedElement.style.display = '';
  }, []);

  const handleComponentClick = useCallback((component: BarcodeComponent) => {
    setSelectedComponent(component);
  }, []);

  const handleComponentDragStart = useCallback((e: React.DragEvent, component: BarcodeComponent) => {
    e.stopPropagation();
    setIsDraggingComponent(true);
    setSelectedComponent(component);
    
    // Set drag data to identify this as an existing component
    e.dataTransfer.setData('component-id', component.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Calculate offset from mouse to component top-left corner
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleComponentDragEnd = useCallback(() => {
    setIsDraggingComponent(false);
  }, []);

  // History management functions
  const saveToHistory = useCallback((newComponents: BarcodeComponent[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newComponents]);
      return newHistory.slice(-50); // Keep only last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const updateComponentPosition = useCallback((id: string, x: number, y: number) => {
    setComponents(prev => {
      const newComponents = prev.map(comp => 
        comp.id === id ? { ...comp, x, y } : comp
      );
      saveToHistory(newComponents);
      return newComponents;
    });
  }, [saveToHistory]);

  const updateComponentSize = useCallback((id: string, width: number, height: number) => {
    setComponents(prev => {
      const newComponents = prev.map(comp => 
        comp.id === id ? { ...comp, width, height } : comp
      );
      saveToHistory(newComponents);
      return newComponents;
    });
  }, [saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setComponents([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setComponents([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  const handleResizeStart = useCallback((e: React.MouseEvent, component: BarcodeComponent, handle: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setSelectedComponent(component);
    
    // Store initial mouse position and component dimensions
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = component.width || 100;
    const startHeight = component.height || 30;
    const startXPos = component.x;
    const startYPos = component.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      switch (handle) {
        case 'se': // Southeast (bottom-right)
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          break;
        case 'sw': // Southwest (bottom-left)
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          newX = startXPos + (startWidth - newWidth);
          break;
        case 'ne': // Northeast (top-right)
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newY = startYPos + (startHeight - newHeight);
          break;
        case 'nw': // Northwest (top-left)
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newX = startXPos + (startWidth - newWidth);
          newY = startYPos + (startHeight - newHeight);
          break;
        case 'e': // East (right)
          newWidth = Math.max(20, startWidth + deltaX);
          break;
        case 'w': // West (left)
          newWidth = Math.max(20, startWidth - deltaX);
          newX = startXPos + (startWidth - newWidth);
          break;
        case 's': // South (bottom)
          newHeight = Math.max(20, startHeight + deltaY);
          break;
        case 'n': // North (top)
          newHeight = Math.max(20, startHeight - deltaY);
          newY = startYPos + (startHeight - newHeight);
          break;
      }

      // Ensure component stays within canvas bounds
      if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const maxX = canvasRect.width - newWidth;
        const maxY = canvasRect.height - newHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      }

      updateComponentPosition(component.id, newX, newY);
      updateComponentSize(component.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateComponentPosition, updateComponentSize]);

  const deleteComponent = useCallback((id: string) => {
    setComponents(prev => {
      const newComponents = prev.filter(comp => comp.id !== id);
      saveToHistory(newComponents);
      return newComponents;
    });
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent, saveToHistory]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverCanvas(false);
    
    if (!liveCanvasRef.current) return;

    const rect = liveCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we're dragging an existing component
    const componentId = e.dataTransfer.getData('component-id');
    if (componentId && selectedComponent && selectedComponent.id === componentId) {
      // Move existing component to new position
      const newX = Math.max(0, Math.min(x - dragOffset.x, rect.width - (selectedComponent.width || 100)));
      const newY = Math.max(0, Math.min(y - dragOffset.y, rect.height - (selectedComponent.height || 30)));
      
      updateComponentPosition(selectedComponent.id, newX, newY);
      return;
    }

    // Handle dropping new component from library
    const componentType = e.dataTransfer.getData('component-type');
    if (!componentType) return;

    const newComponent: BarcodeComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType as any,
      x: Math.max(0, x - 50), // Center the component on cursor
      y: Math.max(0, y - 15),
      width: componentType === 'text' ? 150 : componentType === 'barcode' ? 200 : 100,
      height: componentType === 'text' ? 30 : componentType === 'barcode' ? 50 : 100,
      properties: {
        text: componentType === 'text' ? '' : '', // Start with empty text for immediate editing
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        data: componentType === 'barcode' || componentType === 'qr' ? '12345' : '',
        barcodeType: 'code128',
        borderWidth: 1,
        fillColor: 'transparent',
        strokeColor: '#000000',
      },
    };

    setComponents(prev => [...prev, newComponent]);
    setSelectedComponent(newComponent);
    saveToHistory([...components, newComponent]);
  }, [isDraggingComponent, selectedComponent, dragOffset, updateComponentPosition, components, saveToHistory]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOverCanvas(true);
  }, []);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're actually leaving the canvas (not just moving to a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOverCanvas(false);
    }
  }, []);

  // Live canvas mouse event handlers
  const handleLiveCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!liveRendererRef.current) return;

    const rect = liveCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for component selection
    const component = liveRendererRef.current.getComponentAt(x, y);
    if (component) {
      setSelectedComponent(component);
      
      // Check if clicking near edge for resizing
      const resizeHandle = liveRendererRef.current.isPointNearEdge(x, y, component);
      if (resizeHandle) {
        setIsResizing(true);
        setResizeHandle(resizeHandle);
        liveRendererRef.current.setResizing(true, resizeHandle);
      } else {
        // Start dragging
        setIsDraggingComponent(true);
        setDragOffset({ x: x - component.x, y: y - component.y });
        liveRendererRef.current.setDragging(true);
      }
    } else {
      setSelectedComponent(null);
    }
  }, []);

  const handleLiveCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!liveRendererRef.current || !liveCanvasRef.current) return;

    const rect = liveCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isResizing && selectedComponent && resizeHandle) {
      // Handle resizing logic here
      const newWidth = Math.max(20, x - selectedComponent.x);
      const newHeight = Math.max(20, y - selectedComponent.y);
      
      updateComponentSize(selectedComponent.id, newWidth, newHeight);
    } else if (isDraggingComponent && selectedComponent) {
      // Handle dragging logic here
      const newX = Math.max(0, Math.min(x - dragOffset.x, rect.width - (selectedComponent.width || 100)));
      const newY = Math.max(0, Math.min(y - dragOffset.y, rect.height - (selectedComponent.height || 30)));
      
      updateComponentPosition(selectedComponent.id, newX, newY);
    }
  }, [isResizing, isDraggingComponent, selectedComponent, resizeHandle, dragOffset, updateComponentSize, updateComponentPosition]);

  const handleLiveCanvasMouseUp = useCallback(() => {
    setIsDraggingComponent(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  const updateComponentProperty = useCallback((property: string, value: any) => {
    if (!selectedComponent) return;

    setComponents(prev => {
      const newComponents = prev.map(comp => 
        comp.id === selectedComponent.id 
          ? { ...comp, properties: { ...comp.properties, [property]: value } }
          : comp
      );
      saveToHistory(newComponents);
      
      // Update selectedComponent with the updated component from the array
      const updatedComponent = newComponents.find(comp => comp.id === selectedComponent.id);
      if (updatedComponent) {
        setSelectedComponent(updatedComponent);
      }
      
      return newComponents;
    });
  }, [selectedComponent, saveToHistory]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!liveRendererRef.current) return;

    const rect = liveCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for text component to edit
    const component = liveRendererRef.current.getComponentAt(x, y);
    if (component && component.type === 'text') {
      // Use the new direct editing system
      liveRendererRef.current.startDirectEdit(component, (comp, property, value) => {
        updateComponentProperty(property, value);
      });
    }
  }, [updateComponentProperty]);

  const clearCanvas = useCallback(() => {
    setComponents([]);
    setSelectedComponent(null);
  }, []);

  const handleLoadTemplate = useCallback((templateComponents: BarcodeComponent[]) => {
    setComponents(templateComponents);
    setSelectedComponent(null);
  }, []);

  const generatePreview = useCallback(async () => {
    if (!previewCanvasRef.current || components.length === 0) return;

    setIsGeneratingPreview(true);
    try {
      const previewDataURL = await generateBarcodePreview(
        components,
        previewCanvasRef.current,
        { width: 600, height: 200, backgroundColor: '#ffffff' }
      );
      setPreviewImage(previewDataURL);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [components]);

  // Initialize live canvas renderer
  useEffect(() => {
    if (liveCanvasRef.current) {
      liveRendererRef.current = new LiveCanvasRenderer(
        liveCanvasRef.current,
        {
          width: 800,
          height: 400,
          backgroundColor: '#ffffff',
          gridSize: 20,
          showGrid: true,
        }
      );
    }
  }, []);

  // Update live canvas when components change
  useEffect(() => {
    if (liveRendererRef.current) {
      liveRendererRef.current.setComponents(components);
    }
  }, [components]);

  // Update live canvas when selection changes
  useEffect(() => {
    if (liveRendererRef.current) {
      liveRendererRef.current.setSelectedComponent(selectedComponent);
    }
  }, [selectedComponent]);

  // Update live canvas when dragging state changes
  useEffect(() => {
    if (liveRendererRef.current) {
      liveRendererRef.current.setDragging(isDraggingComponent);
    }
  }, [isDraggingComponent]);

  // Update live canvas when resizing state changes
  useEffect(() => {
    if (liveRendererRef.current) {
      liveRendererRef.current.setResizing(isResizing, resizeHandle);
    }
  }, [isResizing, resizeHandle]);

  // Auto-generate preview when components change
  useEffect(() => {
    if (components.length > 0) {
      const timeoutId = setTimeout(() => {
        generatePreview();
      }, 300); // Reduced debounce for more responsive preview
      return () => clearTimeout(timeoutId);
    }
  }, [components, generatePreview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      
      // Delete shortcut
      if (e.key === 'Delete' && selectedComponent) {
        deleteComponent(selectedComponent.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponent, deleteComponent, undo, redo]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Barcode Designer
            </h2>
            <p className="text-muted-foreground mt-1">
              Drag and drop components to create custom barcode layouts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {components.length} components
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
            <TemplateDialog 
              components={components} 
              onLoadTemplate={handleLoadTemplate}
              trigger={
                <Button variant="outline" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              }
            />
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${
          isPropertiesCollapsed ? 'xl:grid-cols-4' : 'xl:grid-cols-5'
        }`}>
          {/* Enhanced Component Library */}
          <Card className="xl:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5" />
                Components
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Drag elements to the canvas to build your design
              </div>
              
              <div className="space-y-3">
                {componentTypes.map(({ type, label, icon: Icon, description, color }) => (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <div
                        className={`p-3 border-2 rounded-lg cursor-move transition-all duration-200 hover:scale-105 ${color}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-md shadow-sm">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{label}</div>
                            <div className="text-xs text-muted-foreground">{description}</div>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Drag to canvas to add {label.toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearCanvas}
                    disabled={components.length === 0}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generatePreview}
                    disabled={isGeneratingPreview || components.length === 0}
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Eye className="w-3 h-3 mr-1" />
                    )}
                    Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvas and Preview Side by Side */}
          <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${
            isPropertiesCollapsed ? 'xl:col-span-3' : 'xl:col-span-3'
          }`}>
            {/* Enhanced Canvas Area */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Grid className="w-5 h-5" />
                    Live Design Canvas
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      {selectedComponent ? 'Selected' : 'None'}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <p><strong>Drag & Drop:</strong> Move components from library</p>
                          <p><strong>Click:</strong> Select components to edit</p>
                          <p><strong>Double-click:</strong> Edit text inline</p>
                          <p><strong>Drag:</strong> Move selected components</p>
                          <p><strong>Resize:</strong> Drag blue handles to resize</p>
                          <p><strong>Delete:</strong> Remove selected component</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative w-full border-2 border-dashed rounded-lg bg-gradient-to-br from-muted/20 to-background overflow-hidden transition-all duration-200 ${
                    isDraggingOverCanvas 
                      ? 'border-blue-400 bg-blue-50/50' 
                      : 'border-muted-foreground/25'
                  } ${isPropertiesCollapsed ? 'h-[500px]' : 'h-80'}`}
                  onDrop={handleCanvasDrop}
                  onDragOver={handleCanvasDragOver}
                  onDragLeave={handleCanvasDragLeave}
                >
                  {/* Live Canvas */}
                  <canvas
                    ref={liveCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    style={{ cursor: isDraggingComponent ? 'grabbing' : 'default' }}
                    onMouseDown={handleLiveCanvasMouseDown}
                    onMouseMove={handleLiveCanvasMouseMove}
                    onMouseUp={handleLiveCanvasMouseUp}
                    onMouseLeave={handleLiveCanvasMouseUp}
                    onDoubleClick={handleCanvasDoubleClick}
                  />
                  {/* Grid Background */}
                  <div className="absolute inset-0 opacity-20">
                    <svg width="100%" height="100%" className="text-muted-foreground/10">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  {/* Canvas Components */}
                  {components.map((component) => {
                    const Icon = componentTypes.find(ct => ct.type === component.type)?.icon || Type;
                    const isSelected = selectedComponent?.id === component.id;
                    const isDraggingThis = isDraggingComponent && isSelected;
                    
                    return (
                      <div
                        key={component.id}
                        className={`absolute border-2 cursor-move transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                            : 'border-transparent hover:border-muted-foreground/50'
                        } ${isDraggingThis ? 'opacity-50' : ''}`}
                        style={{
                          left: component.x,
                          top: component.y,
                          width: component.width || 100,
                          height: component.height || 30,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComponentClick(component);
                        }}
                        onDragStart={(e) => handleComponentDragStart(e, component)}
                        onDragEnd={handleComponentDragEnd}
                        draggable
                      >
                        <div className="w-full h-full bg-white/80 backdrop-blur-sm rounded border flex items-center justify-center relative">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                          <Palette className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Start Designing</p>
                          <p className="text-sm text-muted-foreground">
                            Drag components from the library to begin
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Info */}
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Canvas: 600×200px</span>
                    <span>Components: {components.length}</span>
                    {isResizing && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" />
                        Resizing
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <canvas ref={previewCanvasRef} className="hidden" />
                    {previewImage && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>Preview Ready</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Enhanced Property Panel */}
          <Card className={`xl:col-span-1 transition-all duration-300 ${
            isPropertiesCollapsed ? 'hidden' : 'block'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5" />
                  Properties
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPropertiesCollapsed(true)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedComponent ? (
                <div className="space-y-4">
                  {/* Component Info */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = componentTypes.find(ct => ct.type === selectedComponent.type)?.icon || Type;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="font-medium capitalize">{selectedComponent.type}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {selectedComponent.id}
                    </div>
                  </div>

                  {/* Position & Size */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Move className="w-4 h-4" />
                      Position & Size
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="x" className="text-xs">X Position</Label>
                        <Input
                          id="x"
                          type="number"
                          value={selectedComponent.x}
                          onChange={(e) => updateComponentPosition(selectedComponent.id, parseInt(e.target.value) || 0, selectedComponent.y)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="y" className="text-xs">Y Position</Label>
                        <Input
                          id="y"
                          type="number"
                          value={selectedComponent.y}
                          onChange={(e) => updateComponentPosition(selectedComponent.id, selectedComponent.x, parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="width" className="text-xs">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          value={selectedComponent.width || 0}
                          onChange={(e) => updateComponentSize(selectedComponent.id, parseInt(e.target.value) || 0, selectedComponent.height || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-xs">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          value={selectedComponent.height || 0}
                          onChange={(e) => updateComponentSize(selectedComponent.id, selectedComponent.width || 0, parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Component-specific Properties */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Properties</h4>
                    
                    {selectedComponent.type === 'text' && (
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="text" className="text-xs">Text Content</Label>
                          <Input
                            id="text"
                            value={selectedComponent.properties.text || ''}
                            onChange={(e) => updateComponentProperty('text', e.target.value)}
                            className="h-8"
                            placeholder="Enter text..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="fontSize" className="text-xs">Font Size</Label>
                          <Input
                            id="fontSize"
                            type="number"
                            value={selectedComponent.properties.fontSize || 16}
                            onChange={(e) => updateComponentProperty('fontSize', parseInt(e.target.value) || 16)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="color" className="text-xs">Color</Label>
                          <Input
                            id="color"
                            type="color"
                            value={selectedComponent.properties.color || '#000000'}
                            onChange={(e) => updateComponentProperty('color', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}

                    {(selectedComponent.type === 'barcode' || selectedComponent.type === 'qr') && (
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="data" className="text-xs">Data</Label>
                          <Input
                            id="data"
                            value={selectedComponent.properties.data || ''}
                            onChange={(e) => updateComponentProperty('data', e.target.value)}
                            className="h-8"
                            placeholder="Enter data..."
                          />
                        </div>
                        {selectedComponent.type === 'barcode' && (
                          <div>
                            <Label htmlFor="barcodeType" className="text-xs">Barcode Type</Label>
                            <Select
                              value={selectedComponent.properties.barcodeType || 'code128'}
                              onValueChange={(value) => updateComponentProperty('barcodeType', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="code128">Code128</SelectItem>
                                <SelectItem value="ean13">EAN13</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedComponent.type === 'rectangle' || selectedComponent.type === 'circle') && (
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="borderWidth" className="text-xs">Border Width</Label>
                          <Input
                            id="borderWidth"
                            type="number"
                            value={selectedComponent.properties.borderWidth || 1}
                            onChange={(e) => updateComponentProperty('borderWidth', parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="strokeColor" className="text-xs">Border Color</Label>
                          <Input
                            id="strokeColor"
                            type="color"
                            value={selectedComponent.properties.strokeColor || '#000000'}
                            onChange={(e) => updateComponentProperty('strokeColor', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fillColor" className="text-xs">Fill Color</Label>
                          <Input
                            id="fillColor"
                            type="color"
                            value={selectedComponent.properties.fillColor || 'transparent'}
                            onChange={(e) => updateComponentProperty('fillColor', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteComponent(selectedComponent.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Component
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <MousePointer className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Select a component to edit its properties
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collapsed Properties Panel */}
          {isPropertiesCollapsed && (
            <div className="xl:col-span-1 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPropertiesCollapsed(false)}
                className="h-12 w-12 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BarcodeDesigner;