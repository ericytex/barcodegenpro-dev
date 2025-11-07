"use client";

import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Type, 
  BarChart3, 
  QrCode, 
  Square, 
  Minus, 
  Circle,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Save,
  Upload,
  Database,
  Settings,
  FileText
} from "lucide-react";
import { generateBarcodeDataURL, generateQRCodeDataURL } from "@/utils/barcodeGenerator";
import ExcelIntegration from "./ExcelIntegration";
import * as ExcelJS from 'exceljs';
import { getApiConfig } from "@/lib/api";

type ComponentType = "text" | "barcode" | "qr" | "rectangle" | "line" | "circle";

interface DesignerComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, any>;
  
  // Excel mapping properties
  mapping?: {
    columnName?: string;
    extractionRule?: {
      type: 'direct' | 'first_word' | 'last_word' | 'manual' | 'regex';
      value?: string;
    };
    staticValue?: string;
    isConnected: boolean;
  };
}

// Excel Integration Interfaces
interface ExcelSheetData {
  headers: string[];
  rows: Record<string, string>[];
  sampleRows: Record<string, string>[];
}

interface TextExtractionRule {
  type: 'prefix' | 'suffix' | 'between' | 'word_position' | 'regex';
  value: string;
  secondValue?: string; // for 'between' type
  wordPosition?: number; // for 'word_position' type
  isAdvanced?: boolean; // true for regex, false for simple rules
}

interface ExcelConnection {
  columnName: string;
  extractionRule?: TextExtractionRule;
  isManual?: boolean; // true for manual components, false for Excel-connected
}

interface ComponentExcelConnection {
  [componentId: string]: ExcelConnection;
}

export default function BarcodeDesignerV2() {
  const [components, setComponents] = useState<DesignerComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [history, setHistory] = useState<DesignerComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [preciseMode, setPreciseMode] = useState(false);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [gridSize, setGridSize] = useState(5);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // Edit Template states
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<string>('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string>('');
  const [showColumnMappingDialog, setShowColumnMappingDialog] = useState(false);
  const [extractedColumns, setExtractedColumns] = useState<Array<{
    id: string;
    componentId: string;
    property: string;
    label: string;
    sampleValue: string;
    type: string;
  }>>([]);
  const [showTemplateSelectionDialog, setShowTemplateSelectionDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [uploadedExcelFile, setUploadedExcelFile] = useState<File | null>(null);
  const [excelColumns, setExcelColumns] = useState<Array<{
    name: string;
    sampleValue: string;
  }>>([]);

  // Excel connection state
  const [componentExcelConnections, setComponentExcelConnections] = useState<Record<string, any>>({});
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  
  // Excel mapping state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelDataForMapping, setExcelDataForMapping] = useState<any>(null);
  const [componentForMapping, setComponentForMapping] = useState<DesignerComponent | null>(null);
  const [componentMappingCollapsed, setComponentMappingCollapsed] = useState<Record<string, boolean>>({});
  const [currentPreviewRowIndex, setCurrentPreviewRowIndex] = useState(0);
  const [extractionRuleMode, setExtractionRuleMode] = useState<'simple' | 'advanced'>('simple');
  
  // Sync componentForMapping with latest component data when components change
  // This ensures that when a template is loaded, componentForMapping has the latest mapping data
  useEffect(() => {
    if (componentForMapping && components.length > 0) {
      const latestComponent = components.find(c => c.id === componentForMapping.id);
      if (latestComponent) {
        // Only update if the mapping data is different (to avoid infinite loops)
        const mappingChanged = JSON.stringify(latestComponent.mapping) !== JSON.stringify(componentForMapping.mapping);
        if (mappingChanged) {
          setComponentForMapping(latestComponent);
        }
      }
    }
  }, [components, componentForMapping?.id]);

  // Alignment guides state
  const [alignmentGuides, setAlignmentGuides] = useState<{
    horizontal: number[];
    vertical: number[];
  }>({ horizontal: [], vertical: [] });

  // Load saved design from localStorage on component mount
  useEffect(() => {
    const savedDesign = localStorage.getItem('barcodeDesigner_design');
    const savedExcelData = localStorage.getItem('barcodeDesigner_excelData');
    
    if (savedDesign) {
      try {
        const parsedDesign = JSON.parse(savedDesign);
        if (parsedDesign.components && Array.isArray(parsedDesign.components)) {
          setComponents(parsedDesign.components);
          toast.success('Design restored from previous session');
        }
      } catch (error) {
        console.error('Error loading saved design:', error);
      }
    }
    
    if (savedExcelData) {
      try {
        const parsedExcelData = JSON.parse(savedExcelData);
        setExcelDataForMapping(parsedExcelData);
        toast.success('Excel data restored from previous session');
      } catch (error) {
        console.error('Error loading saved Excel data:', error);
      }
    }
  }, []);

  // Save design to localStorage whenever components change
  useEffect(() => {
    if (components.length > 0) {
      const designData = {
        components,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem('barcodeDesigner_design', JSON.stringify(designData));
    }
  }, [components]);

  // Save Excel data to localStorage whenever it changes
  useEffect(() => {
    if (excelDataForMapping) {
      localStorage.setItem('barcodeDesigner_excelData', JSON.stringify(excelDataForMapping));
    }
  }, [excelDataForMapping]);

  // Regenerate images when components change
  useEffect(() => {
    components.forEach(component => {
      if (component.type === "barcode" && !barcodeImages[component.id]) {
        generateBarcodeImage(component);
      } else if (component.type === "qr" && !qrImages[component.id]) {
        generateQRImage(component);
      }
    });
  }, [components]);

  // Fix existing rectangles to have transparent backgrounds
  useEffect(() => {
    const updatedComponents = components.map(component => {
      if (component.type === "rectangle" && component.props.fillColor === "#e0e0e0") {
        return {
          ...component,
          props: {
            ...component.props,
            fillColor: "transparent"
          }
        };
      }
      return component;
    });

    if (updatedComponents.some((comp, index) => comp !== components[index])) {
      setComponents(updatedComponents);
      saveToHistory(updatedComponents);
    }
  }, [components]);

  // Move component with keyboard
  const moveComponent = (id: string, direction: 'up' | 'down' | 'left' | 'right', distance: number = 10) => {
    const component = components.find(c => c.id === id);
    if (!component) return;

    let newX = component.x;
    let newY = component.y;

    switch (direction) {
      case 'up':
        newY = Math.max(0, component.y - distance);
        break;
      case 'down':
        newY = component.y + distance;
        break;
      case 'left':
        newX = Math.max(0, component.x - distance);
        break;
      case 'right':
        newX = component.x + distance;
        break;
    }

    updateComponent(id, { x: newX, y: newY });
  };

  // Handle double-click to start text editing
  const handleDoubleClick = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    // Allow text editing for all component types
    setEditingComponent(componentId);
    
    // Get the appropriate text property based on component type
    let currentText = '';
    switch (component.type) {
      case 'text':
        currentText = component.props.text || '';
        break;
      case 'barcode':
        currentText = component.props.value || '';
        break;
      case 'qr':
        currentText = component.props.value || '';
        break;
      case 'rectangle':
      case 'circle':
      case 'line':
        currentText = component.props.text || '';
        break;
      default:
        currentText = '';
    }
    
    setEditingText(currentText);
  };

  // Save text editing
  const saveTextEdit = () => {
    if (editingComponent) {
      const component = components.find(c => c.id === editingComponent);
      if (!component) return;

      // Update the appropriate property based on component type
      switch (component.type) {
        case 'text':
          updateComponentProps(editingComponent, { text: editingText });
          break;
        case 'barcode':
          updateComponentProps(editingComponent, { value: editingText });
          break;
        case 'qr':
          updateComponentProps(editingComponent, { value: editingText });
          break;
        case 'rectangle':
        case 'circle':
        case 'line':
          updateComponentProps(editingComponent, { text: editingText });
          break;
      }
      
      setEditingComponent(null);
      setEditingText('');
    }
  };

  // Cancel text editing
  const cancelTextEdit = () => {
    setEditingComponent(null);
    setEditingText('');
  };

  // Handle key press in text editing
  const handleTextEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTextEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTextEdit();
    }
  };

  // Keyboard shortcuts for undo/redo and arrow key movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Arrow key movement for selected component
      if (selectedComponent && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const distance = e.shiftKey ? 50 : 10; // Shift for larger steps
        
        switch (e.key) {
          case 'ArrowUp':
            moveComponent(selectedComponent, 'up', distance);
            break;
          case 'ArrowDown':
            moveComponent(selectedComponent, 'down', distance);
            break;
          case 'ArrowLeft':
            moveComponent(selectedComponent, 'left', distance);
            break;
          case 'ArrowRight':
            moveComponent(selectedComponent, 'right', distance);
            break;
        }
        return;
      }

      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedComponent, components]);

  // Generate barcode image
  const generateBarcodeImage = async (component: DesignerComponent) => {
    try {
      console.log('Generating barcode for component:', component);
      const dataURL = await generateBarcodeDataURL({
        value: component.props.value || '1234567890',
        format: component.props.format || 'code128',
        width: Math.max(200, component.width), // Ensure minimum width
        height: Math.max(100, component.height), // Ensure minimum height for barcodes
        displayValue: false, // Remove the label
        fontSize: 12,
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 0, // Remove text margin
        margin: 0, // Remove all margins
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
      console.log('Barcode generated successfully:', dataURL.substring(0, 50) + '...');
      setBarcodeImages(prev => ({ ...prev, [component.id]: dataURL }));
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  };

  // Generate QR code image
  const generateQRImage = async (component: DesignerComponent) => {
    try {
      const dataURL = await generateQRCodeDataURL({
        value: component.props.value,
        width: Math.min(component.width, component.height),
        margin: 0, // Remove margin
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      setQrImages(prev => ({ ...prev, [component.id]: dataURL }));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Save state to history
  const saveToHistory = (newComponents: DesignerComponent[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newComponents]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Add new component
  const addComponent = (type: ComponentType) => {
    const baseX = 50 + (components.length * 20);
    const baseY = 50 + (components.length * 20);
    const newComponent: DesignerComponent = {
      id: uuid(),
      type,
      x: snapToGridPosition(baseX),
      y: snapToGridPosition(baseY),
      width: type === "text" ? 150 : type === "line" ? 200 : 200,
      height: type === "text" ? 40 : type === "line" ? 2 : type === "barcode" ? 100 : 60,
      props: getDefaultProps(type),
      // Excel mapping - start as unmapped
      mapping: {
        isConnected: false,
      },
    };

    const newComponents = [...components, newComponent];
    setComponents(newComponents);
    setSelectedComponent(newComponent.id);
    saveToHistory(newComponents);

    // Generate images for barcode and QR components
    if (type === "barcode") {
      generateBarcodeImage(newComponent);
    } else if (type === "qr") {
      generateQRImage(newComponent);
    }
  };

  // Get default props for component type
  const getDefaultProps = (type: ComponentType): Record<string, any> => {
    const baseProps = {
      margin: 0,
      padding: 0
    };
    
    switch (type) {
      case "text":
        return { 
          ...baseProps,
          text: "Sample Text", 
          fontSize: 16, 
          color: "#000000",
          fontFamily: "Arial",
          fontWeight: "normal",
          letterSpacing: 0,
          wordSpacing: 0
        };
      case "barcode":
        return { 
          ...baseProps,
          value: "1234567890", 
          format: "CODE128",
          fontSize: 12,
          fontFamily: "Arial",
          fontColor: "#000000",
          fontWeight: "normal",
          letterSpacing: 0,
          wordSpacing: 0
        };
      case "qr":
        return { 
          ...baseProps,
          value: "https://example.com", 
          size: 100 
        };
      case "rectangle":
        return { 
          ...baseProps,
          fillColor: "transparent", 
          strokeColor: "#000000", 
          strokeWidth: 1,
          text: "",
          fontSize: 14,
          fontFamily: "Arial",
          fontColor: "#000000",
          fontWeight: "normal",
          letterSpacing: 0,
          wordSpacing: 0
        };
      case "line":
        return { 
          ...baseProps,
          strokeColor: "#000000", 
          strokeWidth: 2,
          text: "",
          fontSize: 12,
          fontFamily: "Arial",
          fontColor: "#000000",
          fontWeight: "normal",
          letterSpacing: 0,
          wordSpacing: 0
        };
      case "circle":
        return { 
          ...baseProps,
          fillColor: "transparent", 
          strokeColor: "#000000", 
          strokeWidth: 1,
          text: "",
          fontSize: 14,
          fontFamily: "Arial",
          fontColor: "#000000",
          fontWeight: "normal",
          letterSpacing: 0,
          wordSpacing: 0
        };
      default:
        return {};
    }
  };

  // Update component position/size
  const updateComponent = (id: string, updates: Partial<DesignerComponent>) => {
    // Find the component to check its type for debugging
    const component = components.find(c => c.id === id);
    
    // Apply snap-to-grid to position and size updates
    // Note: Only snap if snapToGrid is enabled and not in precise mode
    const snappedUpdates = { ...updates };
    if (updates.x !== undefined) {
      const originalX = updates.x;
      snappedUpdates.x = snapToGrid ? snapToGridPosition(updates.x, preciseMode) : updates.x;
      if (component?.type === 'qr') {
        console.log(`🔍 QR updateComponent X: original=${originalX}, snapped=${snappedUpdates.x}, snapToGrid=${snapToGrid}, preciseMode=${preciseMode}`);
      }
    }
    if (updates.y !== undefined) {
      const originalY = updates.y;
      snappedUpdates.y = snapToGrid ? snapToGridPosition(updates.y, preciseMode) : updates.y;
      if (component?.type === 'qr') {
        console.log(`🔍 QR updateComponent Y: original=${originalY}, snapped=${snappedUpdates.y}, snapToGrid=${snapToGrid}, preciseMode=${preciseMode}`);
      }
    }
    if (updates.width !== undefined) {
      snappedUpdates.width = snapToGrid ? snapToGridPosition(updates.width, preciseMode) : updates.width;
    }
    if (updates.height !== undefined) {
      snappedUpdates.height = snapToGrid ? snapToGridPosition(updates.height, preciseMode) : updates.height;
    }

    const newComponents = components.map((c) => 
      c.id === id ? { ...c, ...snappedUpdates } : c
    );
    
    if (component?.type === 'qr') {
      const updated = newComponents.find(c => c.id === id);
      console.log(`🔍 QR updateComponent RESULT: new x=${updated?.x}, new y=${updated?.y}`);
    }
    
    setComponents(newComponents);
    saveToHistory(newComponents);

    // Regenerate images for barcode and QR components when size changes
    const updatedComponent = newComponents.find(c => c.id === id);
    if (updatedComponent && (updates.width || updates.height)) {
      if (updatedComponent.type === "barcode") {
        generateBarcodeImage(updatedComponent);
      } else if (updatedComponent.type === "qr") {
        generateQRImage(updatedComponent);
      }
    }
  };

  // Multi-select functions
  const handleComponentClick = (componentId: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      // Shift+click: toggle selection
      setSelectedComponents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(componentId)) {
          newSet.delete(componentId);
        } else {
          newSet.add(componentId);
        }
        return newSet;
      });
      setIsMultiSelectMode(true);
    } else {
      // Regular click: single selection
      setSelectedComponent(componentId);
      setSelectedComponents(new Set([componentId]));
      setIsMultiSelectMode(false);
    }
  };

  const clearSelection = () => {
    setSelectedComponent(null);
    setSelectedComponents(new Set());
    setIsMultiSelectMode(false);
  };

  const isComponentSelected = (componentId: string) => {
    return selectedComponents.has(componentId);
  };

  const getSelectedComponentsData = () => {
    return components.filter(comp => selectedComponents.has(comp.id));
  };

  // Update component properties
  const updateComponentProps = (id: string, propUpdates: Record<string, any>) => {
    const newComponents = components.map((c) => 
      c.id === id ? { ...c, props: { ...c.props, ...propUpdates } } : c
    );
    setComponents(newComponents);
    saveToHistory(newComponents);

    // Regenerate images for barcode and QR components when properties change
    const component = newComponents.find(c => c.id === id);
    if (component) {
      if (component.type === "barcode") {
        generateBarcodeImage(component);
      } else if (component.type === "qr") {
        generateQRImage(component);
      }
    }
  };

  // Delete component
  const deleteComponent = (id: string) => {
    const newComponents = components.filter((c) => c.id !== id);
    setComponents(newComponents);
    setSelectedComponent(null);
    saveToHistory(newComponents);
  };

  // Clear all components
  const clearCanvas = () => {
    if (components.length === 0) return;
    
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      setComponents([]);
      setSelectedComponent(null);
      setHistory([]);
      setHistoryIndex(-1);
      setBarcodeImages({});
      setQrImages({});
      // Clear localStorage as well
      localStorage.removeItem('barcodeDesigner_design');
      localStorage.removeItem('barcodeDesigner_excelData');
      toast.success('Canvas cleared and saved data removed');
    }
  };

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setComponents(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setComponents(history[historyIndex + 1]);
    }
  };

  // Export JSON
  const exportJSON = () => {
    const dataStr = JSON.stringify(components, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'barcode-design.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load saved templates for import dialog
  const loadSavedTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates`, {
        headers: {
          'X-API-Key': apiConfig.apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates || [];
        console.log('Loaded templates:', templates);
        setSavedTemplates(templates);
      } else {
        const errorText = await response.text();
        console.error('Failed to load templates:', response.status, errorText);
        setSavedTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setSavedTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load templates when import dialog opens
  useEffect(() => {
    if (showImportDialog) {
      loadSavedTemplates();
    }
  }, [showImportDialog]);

  // Load template JSON when a template is selected
  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId || templateId === 'none') {
      setSelectedTemplateId('');
      setImportJson('');
      return;
    }

    setSelectedTemplateId(templateId);
    try {
      const apiConfig = getApiConfig();
      console.log('Loading template:', templateId);
      const response = await fetch(`${apiConfig.baseUrl}/api/templates/${templateId}`, {
        headers: {
          'X-API-Key': apiConfig.apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Template response:', data);
        
        // Extract template object from API response wrapper
        // API returns: { "success": true, "template": {...} }
        // Import function expects: { "id": "...", "name": "...", "components": [...] }
        const template = data.template || data;
        
        // Convert template to JSON string for textarea
        const templateJson = JSON.stringify(template, null, 2);
        setImportJson(templateJson);
        const templateName = template.name || template.id || 'Unknown';
        toast.success(`Loaded template: ${templateName}`);
      } else {
        const errorText = await response.text();
        console.error('Failed to load template:', response.status, errorText);
        toast.error(`Failed to load template: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error(`Error loading template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Import JSON
  const importJSON = () => {
    try {
      const importedData = JSON.parse(importJson);
      let importedComponents: any[];
      
      // Handle multiple formats:
      // 1. Direct array of components (old format): [{...}, {...}]
      // 2. Template object with components: { "id": "...", "components": [...] }
      // 3. API response wrapper: { "success": true, "template": { "components": [...] } }
      let templateData = importedData;
      
      // If it's an API response wrapper, extract the template
      if (importedData.template && importedData.template.components) {
        templateData = importedData.template;
        console.log('Detected API response wrapper, extracting template object');
      }
      
      if (Array.isArray(templateData)) {
        // Format 1: Direct array of components
        importedComponents = templateData;
      } else if (templateData.components && Array.isArray(templateData.components)) {
        // Format 2: Template object with components array
        importedComponents = templateData.components.map((comp: any, index: number) => ({
          id: comp.id || `imported-${Date.now()}-${index}`,
          type: comp.type || 'text',
          x: comp.x || 0,
          y: comp.y || 0,
          width: comp.width || 100,
          height: comp.height || 30,
          props: comp.properties || comp.props || {} // Handle both 'properties' and 'props'
        }));
        
        console.log(`Importing template: ${templateData.name || 'Unknown'} with ${importedComponents.length} components`);
      } else {
        throw new Error('Invalid JSON format. Expected an array of components or a template object with a components array.');
      }
      
      // Clear existing components and images
      setComponents([]);
      setBarcodeImages({});
      setQrImages({});
      setSelectedComponent(null);
      
      // Set the imported components
      setComponents(importedComponents);
      saveToHistory(importedComponents);
      
      // Close dialog and clear input
      setShowImportDialog(false);
      setImportJson('');
      setSelectedTemplateId('');
      
      console.log('Successfully imported', importedComponents.length, 'components');
      toast.success(`Successfully imported ${importedComponents.length} components from template`);
    } catch (error) {
      console.error('Error importing JSON:', error);
      alert('Error importing JSON: ' + (error as Error).message);
    }
  };

  // Extract columns from template components
  const extractColumnsFromTemplate = () => {
    const columns: Array<{
      id: string;
      componentId: string;
      property: string;
      label: string;
      sampleValue: string;
      type: string;
    }> = [];

    components.forEach(component => {
      // Extract text properties that can be mapped to Excel columns
      if (component.type === 'text' && component.props.text) {
        columns.push({
          id: `text_${component.id}`,
          componentId: component.id,
          property: 'text',
          label: `Text from ${component.id.slice(0, 8)}`,
          sampleValue: component.props.text,
          type: 'text'
        });
      }
      
      if (component.type === 'barcode' && component.props.value) {
        columns.push({
          id: `barcode_${component.id}`,
          componentId: component.id,
          property: 'value',
          label: `Barcode Value`,
          sampleValue: component.props.value,
          type: 'text'
        });
      }
      
      if (component.type === 'qr' && component.props.value) {
        columns.push({
          id: `qr_${component.id}`,
          componentId: component.id,
          property: 'value',
          label: `QR Code Value`,
          sampleValue: component.props.value,
          type: 'text'
        });
      }
      
      // Extract text from shapes
      if ((component.type === 'rectangle' || component.type === 'circle' || component.type === 'line') && component.props.text) {
        columns.push({
          id: `${component.type}_${component.id}`,
          componentId: component.id,
          property: 'text',
          label: `${component.type.charAt(0).toUpperCase() + component.type.slice(1)} Text`,
          sampleValue: component.props.text,
          type: 'text'
        });
      }
    });

    setExtractedColumns(columns);
    setShowColumnMappingDialog(true);
  };

  // Generate Excel template
  const generateExcelTemplate = () => {
    if (extractedColumns.length === 0) return;

    // Create CSV content
    const headers = extractedColumns.map(col => col.label);
    const sampleRow = extractedColumns.map(col => col.sampleValue);
    
    const csvContent = [
      headers.join(','),
      sampleRow.join(','),
      // Add empty rows for user data
      ...Array(10).fill('').map(() => headers.map(() => '').join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateName || 'template'}_excel_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load available templates
  const loadTemplates = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates`, {
        headers: {
          'X-API-Key': 'test-key',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      } else {
        console.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Enhanced Excel file upload and parsing
  const handleExcelUpload = async (file: File) => {
    setUploadedExcelFile(file);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.worksheets[0];
      const headers: string[] = [];
      const rows: Record<string, string>[] = [];
      const sampleRows: Record<string, string>[] = [];
      
      // Skip if empty worksheet
      if (!worksheet || worksheet.rowCount < 2) {
        throw new Error('Excel file appears to be empty or contains only headers');
      }

      // Extract headers (first row)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          headers.push(cell.value.toString());
        } else {
          headers.push(`Column_${colNumber}`);
        }
      });

      // Extract data rows
      const maxRows = Math.min(worksheet.rowCount, 100); // Limit to first 100 rows for performance
      for (let rowNumber = 2; rowNumber <= maxRows; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, string> = {};
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1] || `Column_${colNumber}`;
          rowData[header] = cell.value ? cell.value.toString() : '';
        });
        
        // Only add row if it has at least one non-empty value
        if (Object.values(rowData).some(value => value.trim() !== '')) {
          rows.push(rowData);
          
          // Keep first few rows for samples
          if (sampleRows.length < 5) {
            sampleRows.push(rowData);
          }
        }
      }

      const excelData: ExcelSheetData = {
        headers,
        rows,
        sampleRows
      };

      setExcelDataForMapping(excelData);
      setExcelColumns(headers.map(header => ({
        name: header,
        sampleValue: sampleRows[0]?.[header] || ''
      })));
      
      // Set first preview row
      setCurrentPreviewRowIndex(0);
      
      toast.success(`Loaded Excel: ${headers.length} columns, ${rows.length} rows`);
      console.log('Excel data loaded:', excelData);
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Error parsing Excel file. Please ensure it\'s a valid Excel file.');
    }
  };

  // Start template selection and Excel upload flow
  const startTemplateSelection = () => {
    loadTemplates();
    setShowTemplateSelectionDialog(true);
  };

  // Save Template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const templateData = {
        id: templateId,
        name: templateName.trim(),
        description: `Template created on ${new Date().toLocaleDateString()}`,
        components: components.map(component => ({
          id: component.id,
          type: component.type,
          x: Math.round(component.x),
          y: Math.round(component.y),
          width: component.width ? Math.round(component.width) : null,
          height: component.height ? Math.round(component.height) : null,
          properties: component.props,
          mapping: component.mapping || null  // Include mapping data!
        })),
        canvas_width: 800,
        canvas_height: 600,
        background_color: "#ffffff",
        created_at: now,
        updated_at: now
      };

      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        alert(`Template "${templateName}" saved successfully!`);
        setShowSaveTemplateDialog(false);
        setTemplateName('');
      } else {
        let errorMessage = 'Failed to save template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + (error as Error).message);
    }
  };

  // Load Templates for editing
  const loadTemplatesForEdit = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates`, {
        headers: {
          'X-API-Key': 'test-key',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error loading templates');
    }
  };

  // Load selected template for editing
  const loadTemplateForEdit = async (templateId: string) => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates/${templateId}`, {
        headers: {
          'X-API-Key': 'test-key',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Template response data:', data);
        const template = data.template; // Extract template from response
        
        if (!template || !template.components) {
          console.error('❌ Invalid template structure:', template);
          toast.error('Invalid template structure');
          return;
        }
        
        console.log('✅ Template components:', template.components);
        
        // Convert template components to DesignerComponent format
        const designerComponents: DesignerComponent[] = template.components.map((comp: any) => {
          // Normalize mapping structure to ensure it's properly formatted
          let mapping = comp.mapping || null;
          if (mapping && typeof mapping === 'object') {
            // Ensure isConnected is set correctly based on mapping data
            // This fixes cases where mapping exists but isConnected is missing or false
            const hasColumn = !!(mapping.columnName && mapping.columnName.trim());
            const hasStaticValue = !!(mapping.staticValue && mapping.staticValue.trim());
            mapping = {
              columnName: mapping.columnName || undefined,
              extractionRule: mapping.extractionRule || undefined,
              staticValue: mapping.staticValue || undefined,
              isConnected: mapping.isConnected !== undefined 
                ? mapping.isConnected 
                : (hasColumn || hasStaticValue)
            };
            console.log(`🔍 Component ${comp.id} mapping normalized:`, mapping);
          }
          
          return {
            id: comp.id,
            type: comp.type,
            x: comp.x,
            y: comp.y,
            width: comp.width,
            height: comp.height,
            props: comp.properties,
            mapping: mapping
          };
        });
        
        console.log('✅ Converted designer components:', designerComponents);
        console.log('🔍 Components with mappings:', designerComponents.filter(c => c.mapping).map(c => ({
          id: c.id,
          type: c.type,
          mapping: c.mapping
        })));
        
        // Check if we have any components
        if (designerComponents.length === 0) {
          toast.warning('Template has no components to load');
          return;
        }
        
        // Clear existing components and load template
        setComponents(designerComponents);
        setSelectedComponent(null);
        setSelectedComponents(new Set());
        saveToHistory(designerComponents);
        
        // Set editing state
        setIsEditingTemplate(true);
        setEditingTemplateId(templateId);
        setShowEditTemplateDialog(false);
        
        toast.success(`Template "${template.name}" loaded for editing`);
      } else {
        toast.error('Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error loading template');
    }
  };

  // Update existing template
  const updateTemplate = async () => {
    if (!editingTemplateId) {
      toast.error('No template selected for editing');
      return;
    }

    try {
      const templateData = {
        id: editingTemplateId,
        // Don't send name - backend will preserve original name
        // Don't send description - backend will preserve original description
        components: components.map(component => ({
          id: component.id,
          type: component.type,
          x: Math.round(component.x),
          y: Math.round(component.y),
          width: component.width ? Math.round(component.width) : null,
          height: component.height ? Math.round(component.height) : null,
          properties: component.props,
          mapping: component.mapping || null
        })),
        canvas_width: 800,
        canvas_height: 600,
        background_color: "#ffffff",
        // Don't send created_at - backend will preserve original creation date
        updated_at: new Date().toISOString() // This will be overwritten by backend with current timestamp
      };

      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/templates/${editingTemplateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify(templateData),
      });

      console.log('🔍 Update template response status:', response.status);
      console.log('🔍 Update template response:', response);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Template update result:', result);
        toast.success(`Template updated successfully!`);
        setIsEditingTemplate(false);
        setEditingTemplateId('');
        setTemplateName('');
      } else {
        let errorMessage = 'Failed to update template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('❌ Template update error:', errorData);
        } catch (jsonError) {
          errorMessage = response.statusText || errorMessage;
          console.error('❌ Template update error (no JSON):', response.statusText);
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Error updating template');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditingTemplate(false);
    setEditingTemplateId('');
    setTemplateName('');
    toast.info('Editing cancelled');
  };

  // Update component positions when zoom changes
  const updatePositionsForZoom = (newZoom: number, oldZoom: number) => {
    const scaleFactor = newZoom / oldZoom;
    
    const updatedComponents = components.map(component => ({
      ...component,
      x: component.x * scaleFactor,
      y: component.y * scaleFactor,
      width: component.width * scaleFactor,
      height: component.height * scaleFactor
    }));
    
    setComponents(updatedComponents);
    saveToHistory(updatedComponents);
    // Reset pan offset since positions are now scaled
    setPanOffset({ x: 0, y: 0 });
  };

  // Zoom functions
  const zoomIn = () => {
    const oldZoom = zoom;
    const newZoom = Math.min(zoom * 1.2, 3); // Max zoom 3x
    setZoom(newZoom);
    updatePositionsForZoom(newZoom, oldZoom);
  };

  const zoomOut = () => {
    const oldZoom = zoom;
    const newZoom = Math.max(zoom / 1.2, 0.5); // Min zoom 0.5x
    setZoom(newZoom);
    updatePositionsForZoom(newZoom, oldZoom);
  };

  const resetZoom = () => {
    const oldZoom = zoom;
    const newZoom = 1;
    setZoom(newZoom);
    updatePositionsForZoom(newZoom, oldZoom);
  };

  // Snap to grid function (no longer needs to respect zoom level since positions are scaled)
  const snapToGridPosition = (position: number, isPrecise: boolean = false) => {
    if (!snapToGrid || isPrecise) return position;
    return Math.round(position / gridSize) * gridSize;
  };

  // Calculate alignment guides
  const calculateAlignmentGuides = (draggingComponent: DesignerComponent, otherComponents: DesignerComponent[]) => {
    const threshold = 5; // pixels - how close components need to be to show guides
    const horizontalGuides: number[] = [];
    const verticalGuides: number[] = [];

    otherComponents.forEach(comp => {
      if (comp.id === draggingComponent.id) return;

      // Check horizontal alignment (same Y position)
      const draggingCenterY = draggingComponent.y + draggingComponent.height / 2;
      const compCenterY = comp.y + comp.height / 2;
      const draggingTopY = draggingComponent.y;
      const compTopY = comp.y;
      const draggingBottomY = draggingComponent.y + draggingComponent.height;
      const compBottomY = comp.y + comp.height;

      // Center alignment
      if (Math.abs(draggingCenterY - compCenterY) < threshold) {
        horizontalGuides.push(compCenterY);
      }
      // Top alignment
      if (Math.abs(draggingTopY - compTopY) < threshold) {
        horizontalGuides.push(compTopY);
      }
      // Bottom alignment
      if (Math.abs(draggingBottomY - compBottomY) < threshold) {
        horizontalGuides.push(compBottomY);
      }

      // Check vertical alignment (same X position)
      const draggingCenterX = draggingComponent.x + draggingComponent.width / 2;
      const compCenterX = comp.x + comp.width / 2;
      const draggingLeftX = draggingComponent.x;
      const compLeftX = comp.x;
      const draggingRightX = draggingComponent.x + draggingComponent.width;
      const compRightX = comp.x + comp.width;

      // Center alignment
      if (Math.abs(draggingCenterX - compCenterX) < threshold) {
        verticalGuides.push(compCenterX);
      }
      // Left alignment
      if (Math.abs(draggingLeftX - compLeftX) < threshold) {
        verticalGuides.push(compLeftX);
      }
      // Right alignment
      if (Math.abs(draggingRightX - compRightX) < threshold) {
        verticalGuides.push(compRightX);
      }
    });

    return {
      horizontal: [...new Set(horizontalGuides)], // Remove duplicates
      vertical: [...new Set(verticalGuides)]
    };
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start for panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPanning(true);
      setLastTouchDistance(getTouchDistance(e.touches[0], e.touches[1]));
      e.preventDefault();
    }
  };

  // Handle touch move for panning
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPanning) {
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const distanceDiff = currentDistance - lastTouchDistance;
      
      // Pan the canvas based on touch movement
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      setPanOffset(prev => ({
        x: prev.x + (centerX - prev.x) * 0.1,
        y: prev.y + (centerY - prev.y) * 0.1
      }));
      
      setLastTouchDistance(currentDistance);
      e.preventDefault();
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPanning(false);
    }
  };

  // Export as PNG
  const exportPNG = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create array of image loading promises
    const imagePromises: Promise<void>[] = [];

    // Draw each component
    components.forEach(component => {
      if (component.type === 'barcode' && barcodeImages[component.id]) {
        const img = new Image();
        const promise = new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, component.x, component.y, component.width, component.height);
            resolve();
          };
          img.onerror = () => {
            console.error('Failed to load barcode image for component:', component.id);
            resolve();
          };
        });
        img.src = barcodeImages[component.id];
        imagePromises.push(promise);
      } else if (component.type === 'qr' && qrImages[component.id]) {
        const img = new Image();
        const promise = new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, component.x, component.y, component.width, component.height);
            resolve();
          };
          img.onerror = () => {
            console.error('Failed to load QR image for component:', component.id);
            resolve();
          };
        });
        img.src = qrImages[component.id];
        imagePromises.push(promise);
      } else if (component.type === 'text') {
        ctx.fillStyle = component.props.color || '#000000';
        ctx.font = `${component.props.fontWeight || 'normal'} ${component.props.fontSize || 16}px ${component.props.fontFamily || 'Arial'}`;
        ctx.textBaseline = 'alphabetic'; // Use alphabetic baseline for proper text rendering
        ctx.textAlign = 'left';
        
        // Handle text with manual spacing (preserve spaces)
        const text = component.props.text || '';
        const lines = text.split('\n');
        let currentY = component.y + (component.props.fontSize || 16); // Add font size to match CSS positioning
        
        lines.forEach(line => {
          ctx.fillText(line, component.x, currentY);
          currentY += (component.props.fontSize || 16) * 1.2; // Line height
        });
      } else if (component.type === 'rectangle') {
        ctx.strokeStyle = component.props.strokeColor || '#000000';
        ctx.lineWidth = component.props.strokeWidth || 1;
        if (component.props.fillColor && component.props.fillColor !== 'transparent') {
          ctx.fillStyle = component.props.fillColor;
          ctx.fillRect(component.x, component.y, component.width, component.height);
        }
        ctx.strokeRect(component.x, component.y, component.width, component.height);
        
        // Draw text inside rectangle if present
        if (component.props.text) {
          ctx.fillStyle = component.props.fontColor || '#000000';
          ctx.font = `${component.props.fontWeight || 'normal'} ${component.props.fontSize || 14}px ${component.props.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = 'center';
          const centerX = component.x + component.width / 2;
          const centerY = component.y + component.height / 2 + (component.props.fontSize || 14) / 2; // Center vertically
          ctx.fillText(component.props.text, centerX, centerY);
        }
      } else if (component.type === 'line') {
        ctx.strokeStyle = component.props.strokeColor || '#000000';
        ctx.lineWidth = component.props.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(component.x, component.y);
        ctx.lineTo(component.x + component.width, component.y);
        ctx.stroke();
        
        // Draw text on line if present
        if (component.props.text) {
          ctx.fillStyle = component.props.fontColor || '#000000';
          ctx.font = `${component.props.fontWeight || 'normal'} ${component.props.fontSize || 12}px ${component.props.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = 'center';
          const centerX = component.x + component.width / 2;
          const centerY = component.y + (component.props.fontSize || 12); // Position at line level
          ctx.fillText(component.props.text, centerX, centerY);
        }
      } else if (component.type === 'circle') {
        ctx.fillStyle = component.props.fillColor || 'transparent';
        ctx.strokeStyle = component.props.strokeColor || '#000000';
        ctx.lineWidth = component.props.strokeWidth || 1;
        ctx.beginPath();
        ctx.arc(component.x + component.width/2, component.y + component.height/2, Math.min(component.width, component.height)/2, 0, 2 * Math.PI);
        if (component.props.fillColor && component.props.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        
        // Draw text inside circle if present
        if (component.props.text) {
          ctx.fillStyle = component.props.fontColor || '#000000';
          ctx.font = `${component.props.fontWeight || 'normal'} ${component.props.fontSize || 14}px ${component.props.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = 'center';
          const centerX = component.x + component.width / 2;
          const centerY = component.y + component.height / 2 + (component.props.fontSize || 14) / 2; // Center vertically
          ctx.fillText(component.props.text, centerX, centerY);
        }
      }
    });

    // Wait for all images to load before exporting
    try {
      await Promise.all(imagePromises);
      
      // Convert to PNG and download
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'barcode-design.png';
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Error exporting PNG. Please try again.');
    }
  };

  const selectedComponentData = components.find(c => c.id === selectedComponent);

  const openMappingModal = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (component) {
      setComponentForMapping(component);
      setShowMappingModal(true);
    }
  };

  // Extract text based on extraction rule
  const extractTextFromValue = (value: string, rule: any) => {
    if (!value || !rule) {
      console.warn('[extractTextFromValue] Missing value or rule', { value, rule });
      return value || '';
    }
    
    // Debug logging for position_based rules
    if (rule.type === 'position_based' && rule.position_type === 'word_position') {
      console.log('[extractTextFromValue] Applying word_position rule:', {
        value,
        rule,
        wordPosition: rule.wordPosition ?? rule.word_position
      });
    }
    
    switch (rule.type) {
      case 'direct':
        return value;
      case 'first_word':
        // Use improved word splitting (handles multiple spaces)
        const firstWords = value.trim().split(/\s+/).filter(w => w.length > 0);
        return firstWords.length > 0 ? firstWords[0] : value;
      case 'last_word':
        // Use improved word splitting (handles multiple spaces)
        const lastWords = value.trim().split(/\s+/).filter(w => w.length > 0);
        return lastWords.length > 0 ? lastWords[lastWords.length - 1] : value;
      case 'regex':
        if (rule.value) {
          try {
            const regex = new RegExp(rule.value, 'gi');
            const match = value.match(regex);
            return match ? match[0] : value;
          } catch (e) {
            return value;
          }
        }
        return value;
      case 'manual':
        return rule.value || value;
      case 'context_based':
        return extractByContext(value, rule.context_type);
      case 'position_based':
        const extracted = extractByPosition(value, rule);
        console.log('[extractTextFromValue] position_based extraction result:', { input: value, output: extracted, rule });
        return extracted;
      default:
        console.warn('[extractTextFromValue] Unknown rule type:', rule.type);
        return value;
    }
  };

  const extractByContext = (value: string, contextType: string) => {
    if (!value) return value;
    
    switch (contextType) {
      case 'storage':
        // Look for storage patterns like "64+3", "128+4", etc.
        const storageMatch = value.match(/\b(\d+\+\d+)\b/);
        return storageMatch ? storageMatch[1] : value;
      case 'color':
        // Look for color patterns
        const colorMatch = value.match(/\b(BLACK|WHITE|BLUE|GOLD|SILVER|SLEEK|IRIS|TITANIUM|SHADOW|RED|GREEN|PURPLE|PINK|ORANGE|YELLOW|BROWN|GRAY|GREY)\b/i);
        return colorMatch ? colorMatch[1] : value;
      case 'model':
        // Look for model patterns like "A669L", "X6725B", etc.
        const modelMatch = value.match(/\b([A-Z]\d{2,3}[A-Z]?)\b/);
        return modelMatch ? modelMatch[1] : value;
      case 'imei':
        // Look for IMEI patterns (15-digit numbers)
        const imeiMatch = value.match(/\b(\d{15})\b/);
        return imeiMatch ? imeiMatch[1] : value;
      default:
        return value;
    }
  };

  // Analyze selected text position and create appropriate position-based rule
  const analyzeTextPosition = (fullText: string, selectedText: string, selectionStart: number, selectionEnd: number) => {
    const words = fullText.trim().split(/\s+/);
    const selectedTextTrimmed = selectedText.trim();
    
    // Build accurate word position map by reconstructing the text with spaces
    const wordPositions: Array<{start: number, end: number, index: number, word: string}> = [];
    let charIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      const wordStart = charIndex;
      const wordEnd = charIndex + words[i].length;
      wordPositions.push({ start: wordStart, end: wordEnd, index: i, word: words[i] });
      // Move to next word position (word + space)
      charIndex = wordEnd + 1; // +1 for the space after the word
    }
    
    // Find which word(s) contain the selection
    let selectedWordStart = -1;
    let selectedWordEnd = -1;
    
    // Method 1: Use character positions to find word indices
    for (const wp of wordPositions) {
      // Check if selection start is within this word's boundaries
      if (selectionStart >= wp.start && selectionStart <= wp.end) {
        selectedWordStart = wp.index;
      }
      // Check if selection end is within this word's boundaries
      if (selectionEnd > wp.start && selectionEnd <= wp.end + 1) { // +1 to include the space after
        selectedWordEnd = wp.index;
      }
    }
    
    // Method 2: If position-based detection failed, try exact word matching
    if (selectedWordStart === -1 || selectedWordEnd === -1) {
      // Try to find exact word match first
      const exactWordIndex = words.findIndex(w => w === selectedTextTrimmed);
      if (exactWordIndex !== -1) {
        selectedWordStart = exactWordIndex;
        selectedWordEnd = exactWordIndex;
      } else {
        // Try partial matching
        for (let i = 0; i < words.length; i++) {
          if (words[i] === selectedTextTrimmed || 
              words[i].includes(selectedTextTrimmed) || 
              selectedTextTrimmed.includes(words[i])) {
            if (selectedWordStart === -1) selectedWordStart = i;
            selectedWordEnd = i;
            break; // Only match the first occurrence
          }
        }
      }
    }
    
    // If selection spans multiple words, get the range
    if (selectedWordStart !== -1 && selectedWordEnd !== -1) {
      // Special case: Last word with integer+integer pattern (like "64+2")
      if (selectedWordStart === words.length - 1 && selectedWordEnd === words.length - 1) {
        const patternMatch = selectedTextTrimmed.match(/\b(\d+\+\d+)\b/);
        if (patternMatch) {
          return {
            type: 'position_based',
            position_type: 'last_segment_pattern',
            pattern: 'integer_plus_integer',
            description: 'Extract integer+integer pattern from last segment'
          };
        }
      }
      
      // ALWAYS use word_position for single word selections (dynamic position)
      if (selectedWordStart === selectedWordEnd) {
        return {
          type: 'position_based',
          position_type: 'word_position',
          wordPosition: selectedWordStart,
          description: `Extract word at position ${selectedWordStart + 1}`
        };
      }
      
      // Selection spans multiple words - extract range
      return {
        type: 'position_based',
        position_type: 'word_range',
        startWord: selectedWordStart,
        endWord: selectedWordEnd,
        description: `Extract words ${selectedWordStart + 1} to ${selectedWordEnd + 1}`
      };
    }
    
    // Fallback: try to find position by text matching
    const selectedIndex = fullText.indexOf(selectedTextTrimmed);
    if (selectedIndex !== -1) {
      // Count words before the selection to determine word position
      const textBeforeSelection = fullText.substring(0, selectedIndex).trim();
      const wordsBefore = textBeforeSelection ? textBeforeSelection.split(/\s+/) : [];
      const wordPosition = wordsBefore.length;
      
      // Check if it's the last word and matches integer+integer pattern
      if (wordPosition === words.length - 1) {
        const patternMatch = selectedTextTrimmed.match(/\b(\d+\+\d+)\b/);
        if (patternMatch) {
          return {
            type: 'position_based',
            position_type: 'last_segment_pattern',
            pattern: 'integer_plus_integer',
            description: 'Extract integer+integer pattern from last segment'
          };
        }
      }
      
      // Use word_position for dynamic extraction
      if (wordPosition < words.length) {
        return {
          type: 'position_based',
          position_type: 'word_position',
          wordPosition: wordPosition,
          description: `Extract word at position ${wordPosition + 1}`
        };
      }
      
      // Check if there's a space before it (might be after a marker)
      const beforeText = fullText.substring(0, selectedIndex).trim();
      const lastSpaceBefore = beforeText.lastIndexOf(' ');
      if (lastSpaceBefore !== -1) {
        const marker = beforeText.substring(lastSpaceBefore + 1);
        return {
          type: 'position_based',
          position_type: 'after',
          marker: marker,
          description: `Extract text after "${marker}"`
        };
      }
    }
    
    // Default: use word position if we can find it by text matching
    const wordIndexInText = words.findIndex(w => w === selectedTextTrimmed || w.includes(selectedTextTrimmed) || selectedTextTrimmed.includes(w));
    if (wordIndexInText !== -1) {
      // Check if it's the last word and matches integer+integer pattern
      if (wordIndexInText === words.length - 1) {
        const patternMatch = selectedTextTrimmed.match(/\b(\d+\+\d+)\b/);
        if (patternMatch) {
          return {
            type: 'position_based',
            position_type: 'last_segment_pattern',
            pattern: 'integer_plus_integer',
            description: 'Extract integer+integer pattern from last segment'
          };
        }
      }
      
      // Use word_position for dynamic extraction
      return {
        type: 'position_based',
        position_type: 'word_position',
        wordPosition: wordIndexInText,
        description: `Extract word at position ${wordIndexInText + 1}`
      };
    }
    
    // Ultimate fallback: return null to use literal regex
    return null;
  };

  const extractByPosition = (value: string, rule: any) => {
    if (!value) return value;
    
    const positionType = rule.position_type || 'after';
    const marker = rule.marker || '';
    const offset = rule.offset || 0;
    
    try {
      if (positionType === 'after') {
        // Find text after a marker
        if (marker) {
          const parts = value.split(marker, 1);
          if (parts.length > 1) {
            const afterText = parts[1].trim();
            const words = afterText.split(' ');
            if (offset < words.length) {
              return words[offset];
            }
          }
        }
        return value;
      } else if (positionType === 'before') {
        // Find text before a marker
        if (marker) {
          const parts = value.split(marker, 1);
          if (parts.length > 0) {
            const beforeText = parts[0].trim();
            const words = beforeText.split(' ');
            if (offset < words.length) {
              return words[words.length - 1 - offset];
            }
          }
        }
        return value;
      } else if (positionType === 'between') {
        // Find text between two markers
        const startMarker = rule.start_marker || '';
        const endMarker = rule.end_marker || '';
        if (startMarker && endMarker) {
          const startIdx = value.indexOf(startMarker);
          const endIdx = value.indexOf(endMarker);
          if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
            const betweenText = value.substring(startIdx + startMarker.length, endIdx).trim();
            return betweenText;
          }
        }
        return value;
      } else if (positionType === 'after_storage') {
        // NEW: Extract everything after storage pattern (digit+digit)
        const storageMatch = value.match(/\b(\d+\+\d+)\b/);
        if (storageMatch) {
          // Find the end position of the storage pattern
          const storageEnd = storageMatch.index! + storageMatch[0].length;
          // Extract everything after the storage pattern
          const afterStorage = value.substring(storageEnd).trim();
          return afterStorage;
        }
        return value;
      } else if (positionType === 'before_storage') {
        // NEW: Extract everything before storage pattern
        const storageMatch = value.match(/\b(\d+\+\d+)\b/);
        if (storageMatch) {
          // Find the start position of the storage pattern
          const storageStart = storageMatch.index!;
          // Extract everything before the storage pattern
          const beforeStorage = value.substring(0, storageStart).trim();
          return beforeStorage;
        }
        return value;
      } else if (positionType === 'last_segment_pattern') {
        // NEW: Extract integer+integer pattern from last segment (after last space)
        const lastSpaceIndex = value.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) {
          // Get everything after the last space
          const lastSegment = value.substring(lastSpaceIndex + 1).trim();
          // Try to match integer+integer pattern (like "64+2", "128+4")
          const patternMatch = lastSegment.match(/\b(\d+\+\d+)\b/);
          if (patternMatch) {
            // Return the integer+integer pattern
            return patternMatch[1];
          }
          // If no pattern found, return the entire last segment
          return lastSegment;
        }
        // If no space found, try to match pattern in the whole string
        const patternMatch = value.match(/\b(\d+\+\d+)\b/);
        if (patternMatch) {
          return patternMatch[1];
        }
        // Fallback: return the whole value
        return value;
      } else if (positionType === 'first_word') {
        // Extract first word (convert to word_position for consistency)
        const words = value.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length > 0) {
          const extractedWord = words[0];
          console.log(`[first_word extraction] Input: "${value}", Words: [${words.join(', ')}], Extracted: "${extractedWord}"`);
          return extractedWord;
        }
        return value;
      } else if (positionType === 'last_word') {
        // Extract last word (convert to word_position for consistency)
        const words = value.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length > 0) {
          const extractedWord = words[words.length - 1];
          console.log(`[last_word extraction] Input: "${value}", Words: [${words.join(', ')}], Extracted: "${extractedWord}"`);
          return extractedWord;
        }
        return value;
      } else if (positionType === 'word_position') {
        // Extract word at specific position (0-indexed) - ONLY that word, nothing else
        const trimmedValue = value.trim();
        if (!trimmedValue) return value;
        
        // Split by whitespace (handles multiple spaces, tabs, etc.)
        const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
        const wordPos = rule.wordPosition !== undefined ? rule.wordPosition : (rule.word_position !== undefined ? rule.word_position : 0);
        
        // Validate position and return ONLY the word at that position
        if (wordPos >= 0 && wordPos < words.length) {
          const extractedWord = words[wordPos];
          // Debug logging (can be removed in production)
          console.log(`[word_position extraction] Input: "${value}", Position: ${wordPos}, Words: [${words.join(', ')}], Extracted: "${extractedWord}"`);
          return extractedWord; // Return only this specific word
        }
        
        // If position is out of bounds, log warning and return empty string
        console.warn(`[word_position extraction] Position ${wordPos} out of bounds for value "${value}" with ${words.length} words`);
        return '';
      } else if (positionType === 'word_range') {
        // Extract range of words
        const words = value.trim().split(/\s+/);
        const startWord = rule.startWord !== undefined ? rule.startWord : 0;
        const endWord = rule.endWord !== undefined ? rule.endWord : words.length - 1;
        if (startWord >= 0 && endWord < words.length && startWord <= endWord) {
          return words.slice(startWord, endWord + 1).join(' ');
        }
        return value;
      }
      return value;
    } catch (e) {
      return value;
    }
  };

  const getExtractionExamples = (columnName: string, contextType?: string) => {
    if (!excelDataForMapping?.rows) return [];
    
    const examples = excelDataForMapping.rows.slice(0, 5).map(row => {
      const value = row[columnName] || '';
      if (contextType) {
        return {
          original: value,
          extracted: extractByContext(value, contextType),
          contextType
        };
      }
      return {
        original: value,
        extracted: value
      };
    });
    
    return examples;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Components */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen overflow-hidden">
        <div className="p-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Components</h2>
            <Badge variant="secondary">{components.length}</Badge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => addComponent("text")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Type className="w-5 h-5" />
            <span className="text-xs">Text</span>
          </Button>
          
          <Button
            onClick={() => addComponent("barcode")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Barcode</span>
          </Button>
          
          <Button
            onClick={() => addComponent("qr")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <QrCode className="w-5 h-5" />
            <span className="text-xs">QR Code</span>
          </Button>
          
          <Button
            onClick={() => addComponent("rectangle")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Square className="w-5 h-5" />
            <span className="text-xs">Rectangle</span>
          </Button>
          
          <Button
            onClick={() => addComponent("line")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Minus className="w-5 h-5" />
            <span className="text-xs">Line</span>
          </Button>
          
          <Button
            onClick={() => addComponent("circle")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Circle className="w-5 h-5" />
            <span className="text-xs">Circle</span>
          </Button>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex space-x-1">
            <Button
              onClick={undo}
              disabled={historyIndex <= 0}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={clearCanvas}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Clear Canvas
          </Button>
          
          <Button
            onClick={exportJSON}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          
          <Button
            onClick={exportPNG}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
          
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          
          <Button
            onClick={() => setShowSaveTemplateDialog(true)}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={components.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
          
          <Button
            onClick={() => {
              loadTemplatesForEdit();
              setShowEditTemplateDialog(true);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit Template
          </Button>
          
          {isEditingTemplate && (
            <>
              <Button
                onClick={updateTemplate}
                variant="default"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={components.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Update Template
              </Button>
              
              <Button
                onClick={cancelEditing}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel Edit
              </Button>
            </>
          )}
          
          <Button
            onClick={extractColumnsFromTemplate}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={components.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Extract Columns
          </Button>
          
          <Button
            onClick={() => {
              setShowMappingModal(true);
              // If Excel data already exists, we can use it
              // Otherwise, user will upload in the modal
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Excel & Map
          </Button>
        </div>
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {/* Multi-select indicator */}
        {isMultiSelectMode && selectedComponents.size > 1 && (
          <div className="absolute top-16 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg z-10">
            {selectedComponents.size} components selected
          </div>
        )}
        
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <h1 className="text-xl font-semibold">Barcode Designer</h1>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {components.length} components
            </Badge>
            <Badge variant="outline">
              Canvas: 800x600px
            </Badge>
            <Badge variant="outline">
              Zoom: {Math.round(zoom * 100)}%
            </Badge>
            <Badge variant="outline">
              Grid: {snapToGrid ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          className="absolute inset-0 pt-16 overflow-hidden"
          onClick={(e) => {
            // Clear selection when clicking on empty canvas
            // Check if the click target is the canvas container or its background
            const target = e.target as HTMLElement;
            if (target === e.currentTarget || target.classList.contains('canvas-background')) {
              clearSelection();
            }
          }}
          onMouseDown={(e) => {
            // Also handle mousedown for better empty space detection
            const target = e.target as HTMLElement;
            // If clicking on canvas background (not on a component), clear selection
            if (target === e.currentTarget || 
                (target.classList && !target.closest('[data-component-id]'))) {
              clearSelection();
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Zoom Controls */}
          <div className="absolute top-20 right-4 z-20 flex flex-col space-y-1">
            <Button
              onClick={zoomIn}
              variant="outline"
              size="sm"
              className="w-10 h-8 p-0"
            >
              +
            </Button>
            <Button
              onClick={zoomOut}
              variant="outline"
              size="sm"
              className="w-10 h-8 p-0"
            >
              -
            </Button>
            <Button
              onClick={resetZoom}
              variant="outline"
              size="sm"
              className="w-10 h-8 p-0 text-xs"
            >
              1:1
            </Button>
            <Button
              onClick={() => setSnapToGrid(!snapToGrid)}
              variant={snapToGrid ? "default" : "outline"}
              size="sm"
              className="w-10 h-8 p-0 text-xs"
            >
              Grid
            </Button>
            <Button
              onClick={() => setPreciseMode(!preciseMode)}
              variant={preciseMode ? "default" : "outline"}
              size="sm"
              className="w-10 h-8 p-0 text-xs"
              title="Precise Mode (1px movement)"
            >
              P
            </Button>
            <Button
              onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
              variant={showAlignmentGuides ? "default" : "outline"}
              size="sm"
              className="w-10 h-8 p-0 text-xs"
              title="Show Alignment Guides"
            >
              A
            </Button>
          </div>

          {/* Zoomed Canvas Container */}
          <div 
            className="absolute inset-0 pt-16 overflow-auto"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'top left',
              margin: '0',
              padding: '0'
            }}
            onClick={(e) => {
              // Clear selection when clicking on empty canvas (not on a component)
              const target = e.target as HTMLElement;
              if (target === e.currentTarget || !target.closest('[data-component-id]')) {
                clearSelection();
              }
            }}
          >
            {/* Grid Overlay */}
            {snapToGrid && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                  opacity: 0.3
                }}
              />
            )}

            {/* Alignment Guides Overlay */}
            {showAlignmentGuides && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Horizontal alignment guides */}
                {alignmentGuides.horizontal.map((y, index) => (
                  <div
                    key={`horizontal-${index}`}
                    className="absolute w-full border-t-2 border-blue-500 opacity-80"
                    style={{
                      top: y,
                      left: 0,
                      height: 0,
                      zIndex: 1000
                    }}
                  />
                ))}
                
                {/* Vertical alignment guides */}
                {alignmentGuides.vertical.map((x, index) => (
                  <div
                    key={`vertical-${index}`}
                    className="absolute h-full border-l-2 border-blue-500 opacity-80"
                    style={{
                      left: x,
                      top: 0,
                      width: 0,
                      zIndex: 1000
                    }}
                  />
                ))}
              </div>
            )}

          {components.map((component) => (
            <Rnd
              key={component.id}
              data-component-id={component.id}
              size={{ width: component.width, height: component.height }}
              position={{ x: component.x, y: component.y }}
              grid={snapToGrid && !preciseMode ? [gridSize, gridSize] : [1, 1]}
              disableDragging={false}
              enableResizing={true}
              bounds="parent"
              style={{
                margin: '0',
                padding: '0',
                border: 'none',
                outline: 'none'
              }}
              onDrag={(e, d) => {
                // Debug logging for QR code components
                if (component.type === 'qr') {
                  console.log(`🔍 QR DRAG: type=${component.type}, d.x=${d.x}, d.y=${d.y}, snapToGrid=${snapToGrid}, gridSize=${gridSize}`);
                }
                
                // For QR codes ONLY: Update position during drag to keep controlled position in sync
                // This prevents Rnd from reverting to original position on drag stop
                // We use requestAnimationFrame to batch updates and avoid performance issues
                if (component.type === 'qr') {
                  const snappedX = snapToGrid ? snapToGridPosition(d.x, preciseMode) : d.x;
                  const snappedY = snapToGrid ? snapToGridPosition(d.y, preciseMode) : d.y;
                  
                  // Update position during drag for QR codes
                  requestAnimationFrame(() => {
                    setComponents(prev => {
                      const currentComp = prev.find(c => c.id === component.id);
                      if (!currentComp || (currentComp.x === snappedX && currentComp.y === snappedY)) {
                        return prev; // No change needed
                      }
                      
                      return prev.map(comp => 
                        comp.id === component.id 
                          ? { ...comp, x: snappedX, y: snappedY }
                          : comp
                      );
                    });
                  });
                }
                
                // Calculate alignment guides during drag (only if enabled)
                if (showAlignmentGuides) {
                  const draggingComponent = {
                    ...component,
                    x: d.x,
                    y: d.y
                  };
                  const guides = calculateAlignmentGuides(draggingComponent, components);
                  setAlignmentGuides(guides);
                }
              }}
              onDragStop={(e, d) => {
                // Debug logging for QR code components
                if (component.type === 'qr') {
                  console.log(`🔍 QR DRAG STOP: d.x=${d.x}, d.y=${d.y}, snapToGrid=${snapToGrid}, preciseMode=${preciseMode}`);
                }
                
                // Clear alignment guides when drag stops
                setAlignmentGuides({ horizontal: [], vertical: [] });
                
                // Update state immediately - don't delay with requestAnimationFrame
                // This ensures Rnd's position prop stays in sync
                if (isMultiSelectMode && selectedComponents.size > 1) {
                  // Multi-select drag: move all selected components
                  setComponents(prev => {
                    const currentComp = prev.find(c => c.id === component.id);
                    if (!currentComp) return prev;
                    
                    const deltaX = d.x - currentComp.x;
                    const deltaY = d.y - currentComp.y;
                    
                    return prev.map(comp => {
                      if (selectedComponents.has(comp.id)) {
                        const snappedX = snapToGridPosition(comp.x + deltaX, e.shiftKey || preciseMode);
                        const snappedY = snapToGridPosition(comp.y + deltaY, e.shiftKey || preciseMode);
                        if (comp.type === 'qr') {
                          console.log(`🔍 QR MULTI-DRAG: comp.x=${comp.x}, deltaX=${deltaX}, snappedX=${snappedX}`);
                        }
                        return {
                          ...comp,
                          x: snappedX,
                          y: snappedY
                        };
                      }
                      return comp;
                    });
                  });
                  
                  // Save to history after state update
                  setTimeout(() => {
                    setComponents(prev => {
                      saveToHistory(prev);
                      return prev;
                    });
                  }, 0);
                } else {
                  // Single component drag - ensure snap is applied
                  // Get current component from state to avoid stale closure
                  setComponents(prev => {
                    const currentComp = prev.find(c => c.id === component.id);
                    if (!currentComp) return prev;
                    
                    // Calculate snap from the drag position
                    // Use d.x and d.y which are the actual drag stop positions
                    const snappedX = snapToGridPosition(d.x, e.shiftKey || preciseMode);
                    const snappedY = snapToGridPosition(d.y, e.shiftKey || preciseMode);
                    
                    if (component.type === 'qr') {
                      console.log(`🔍 QR SINGLE-DRAG STOP: d.x=${d.x}, d.y=${d.y}, snappedX=${snappedX}, snappedY=${snappedY}`);
                      console.log(`🔍 QR Current component position in state: x=${currentComp.x}, y=${currentComp.y}`);
                      console.log(`🔍 QR Component from closure: x=${component.x}, y=${component.y}`);
                    }
                    
                    // Always update position on drag stop - don't check if it's already correct
                    // Rnd reports the final drag position in d.x and d.y
                    const newComponents = prev.map(comp => 
                      comp.id === component.id 
                        ? { ...comp, x: snappedX, y: snappedY }
                        : comp
                    );
                    
                    if (component.type === 'qr') {
                      const updated = newComponents.find(c => c.id === component.id);
                      console.log(`🔍 QR Updated component position: x=${updated?.x}, y=${updated?.y}`);
                    }
                    
                    // Save to history
                    saveToHistory(newComponents);
                    
                    return newComponents;
                  });
                }
              }}
              onResizeStop={(e, direction, ref, delta, position) =>
                updateComponent(component.id, {
                  width: snapToGridPosition(parseInt(ref.style.width), e.shiftKey || preciseMode),
                  height: snapToGridPosition(parseInt(ref.style.height), e.shiftKey || preciseMode),
                  x: snapToGridPosition(position.x, e.shiftKey || preciseMode),
                  y: snapToGridPosition(position.y, e.shiftKey || preciseMode),
                })
              }
              className={
                selectedComponent === component.id 
                  ? "ring-2 ring-blue-500 ring-inset" 
                  : component.mapping?.isConnected 
                    ? "ring-1 ring-green-500 ring-inset" 
                    : "ring-1 ring-orange-500 ring-inset"
              }
              onClick={(e) => {
                e.stopPropagation();
                setSelectedComponent(component.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleClick(component.id);
              }}
              enableResizing={selectedComponent === component.id}
              disableDragging={false}
            >
              <div 
                className={`w-full h-full flex items-center justify-center bg-transparent hover:bg-gray-50 relative group ${
                  isComponentSelected(component.id) ? 'bg-blue-50' : ''
                }`}
                style={{ 
                  padding: '0',
                  margin: '0'
                }}
                onClick={(e) => handleComponentClick(component.id, e)}
              >
                {/* Collapsible Mapping Status - Only visible on hover for mapped components */}
                <div className="absolute -left-6 top-0 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Collapsible Arrow */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setComponentMappingCollapsed(prev => ({
                        ...prev,
                        [component.id]: !prev[component.id]
                      }));
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setComponentForMapping(component);
                      setShowMappingModal(true);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setComponentForMapping(component);
                      setShowMappingModal(true);
                    }}
                    className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition-colors z-10"
                    title="Click: Toggle status | Double-click/Right-click: Open mapping modal"
                  >
                    {componentMappingCollapsed[component.id] ? '▶' : '▼'}
                  </button>
                  
                  {/* Mapping Status Badge (collapsible) - Only for mapped components */}
                  {!componentMappingCollapsed[component.id] && component.mapping?.isConnected && (
                    <div className="absolute -top-6 left-6 bg-white border rounded px-1 py-0.5 text-xs shadow-sm whitespace-nowrap z-50">
                      <span className="text-green-600 flex items-center gap-1">
                        ✅ {component.mapping?.columnName || 'Static'}
                      </span>
                    </div>
                  )}
                </div>
                
                
                {/* Resize handles - only visible when selected */}
                {selectedComponent === component.id && (
                  <>
                    {/* Corner handles */}
                    <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize border-2 border-white" />
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize border-2 border-white" />
                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize border-2 border-white" />
                    <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border-2 border-white" />
                    
                    {/* Midpoint handles */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-n-resize border-2 border-white" />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-s-resize border-2 border-white" />
                    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-w-resize border-2 border-white" />
                    <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-e-resize border-2 border-white" />
                  </>
                )}
                
                {/* Component content with internal spacing */}
                <div
                  style={{ 
                    padding: `${component.props.padding || 0}px`,
                    margin: `${component.props.margin || 0}px`,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {component.type === "text" && (
                    <span 
                      className="block"
                      style={{ 
                        fontSize: `${component.props.fontSize || 16}px`,
                        fontFamily: component.props.fontFamily || 'Arial',
                        color: component.props.color || '#000000',
                        fontWeight: component.props.fontWeight || 'normal',
                        letterSpacing: `${component.props.letterSpacing || 0}px`,
                        wordSpacing: `${component.props.wordSpacing || 0}px`,
                        whiteSpace: 'pre', // Preserve manual spaces
                        lineHeight: '1',
                        padding: '0',
                        margin: '0'
                      }}
                    >
                      {component.props.text}
                    </span>
                  )}
                  {component.type === "barcode" && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      {barcodeImages[component.id] ? (
                        <img 
                          src={barcodeImages[component.id]} 
                          alt="Barcode" 
                          className="w-full h-full object-cover"
                          style={{ 
                            padding: '0', 
                            margin: '0',
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%'
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-xs text-gray-600">
                            Generating...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {component.type === "qr" && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      {qrImages[component.id] ? (
                        <img 
                          src={qrImages[component.id]} 
                          alt="QR Code" 
                          className="w-full h-full object-cover"
                          style={{ 
                            padding: '0', 
                            margin: '0',
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%'
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <QrCode className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-xs text-gray-600">
                            Generating...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {component.type === "rectangle" && (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        backgroundColor: component.props.fillColor === "transparent" ? "transparent" : component.props.fillColor,
                        border: `${component.props.strokeWidth}px solid ${component.props.strokeColor}`,
                        padding: '0',
                        margin: '0'
                      }}
                    >
                      {component.props.text && (
                        <span 
                          className="text-center break-words"
                          style={{
                            fontSize: `${component.props.fontSize || 14}px`,
                            fontFamily: component.props.fontFamily || 'Arial',
                            color: component.props.fontColor || '#000000',
                            fontWeight: component.props.fontWeight || 'normal',
                            letterSpacing: `${component.props.letterSpacing || 0}px`,
                            wordSpacing: `${component.props.wordSpacing || 0}px`,
                            whiteSpace: 'pre', // Preserve manual spaces
                            padding: '0',
                            margin: '0'
                          }}
                        >
                          {component.props.text}
                        </span>
                      )}
                    </div>
                  )}
                  {component.type === "line" && (
                    <div 
                      className="w-full flex items-center justify-center"
                      style={{
                        height: `${component.props.strokeWidth}px`,
                        backgroundColor: component.props.strokeColor
                      }}
                    >
                      {component.props.text && (
                        <span 
                          className="text-center break-words px-2 bg-white rounded"
                          style={{
                            fontSize: `${component.props.fontSize || 12}px`,
                            fontFamily: component.props.fontFamily || 'Arial',
                            color: component.props.fontColor || '#000000',
                            fontWeight: component.props.fontWeight || 'normal',
                            letterSpacing: `${component.props.letterSpacing || 0}px`,
                            wordSpacing: `${component.props.wordSpacing || 0}px`
                          }}
                        >
                          {component.props.text}
                        </span>
                      )}
                    </div>
                  )}
                  {component.type === "circle" && (
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: component.props.fillColor,
                        border: `${component.props.strokeWidth}px solid ${component.props.strokeColor}`
                      }}
                    >
                      {component.props.text && (
                        <span 
                          className="text-center break-words px-2"
                          style={{
                            fontSize: `${component.props.fontSize || 14}px`,
                            fontFamily: component.props.fontFamily || 'Arial',
                            color: component.props.fontColor || '#000000',
                            fontWeight: component.props.fontWeight || 'normal',
                            letterSpacing: `${component.props.letterSpacing || 0}px`,
                            wordSpacing: `${component.props.wordSpacing || 0}px`,
                            whiteSpace: 'pre' // Preserve manual spaces
                          }}
                        >
                          {component.props.text}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Rnd>
          ))}
          
          {/* Unmapped Badges - Only show when component is selected/clicked */}
          {components
            .filter(component => !component.mapping?.isConnected && selectedComponent === component.id)
            .map((component) => (
              <div 
                key={`unmapped-badge-${component.id}`}
                className="absolute bg-white border-2 border-orange-300 rounded px-2 py-1 text-xs shadow-lg whitespace-nowrap cursor-pointer"
                style={{
                  left: `${component.x + 6}px`,
                  top: `${component.y - 30}px`,
                  zIndex: 10000,
                  pointerEvents: 'auto',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('🔍 Unmapped badge clicked for component:', component.id);
                  // Get the latest component from state to ensure we have current mapping data
                  const componentWithMapping = components.find(c => c.id === component.id);
                  if (componentWithMapping) {
                    console.log('🔍 Setting componentForMapping with mapping:', componentWithMapping.mapping);
                    setComponentForMapping(componentWithMapping);
                    setShowMappingModal(true);
                  } else {
                    console.log('🔍 Setting componentForMapping (no mapping found)');
                    setComponentForMapping(component);
                    setShowMappingModal(true);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                }}
              >
                <span className="text-orange-600 flex items-center gap-1 hover:text-orange-700 hover:bg-orange-50 px-1 py-0.5 rounded transition-colors select-none">
                  ⚠️ Unmapped
                </span>
              </div>
            ))}
          
          {/* Text editing overlay */}
          {editingComponent && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-3">
                  Edit {components.find(c => c.id === editingComponent)?.type === 'text' ? 'Text' : 
                        components.find(c => c.id === editingComponent)?.type === 'barcode' ? 'Barcode Value' :
                        components.find(c => c.id === editingComponent)?.type === 'qr' ? 'QR Code Value' : 'Text'}
                </h3>
                
                {/* Manual spacing instructions for text components */}
                {components.find(c => c.id === editingComponent)?.type === 'text' && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    <strong>Manual Spacing:</strong> Use multiple spaces between words for custom spacing. 
                    Example: "Word1&nbsp;&nbsp;&nbsp;&nbsp;Word2&nbsp;&nbsp;Word3" 
                    (Use spacebar multiple times between words)
                  </div>
                )}
                
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={handleTextEditKeyPress}
                  className="w-full p-2 border border-gray-300 rounded mb-3 resize-none"
                  rows={3}
                  placeholder={
                    components.find(c => c.id === editingComponent)?.type === 'text' ? 'Enter text... Use multiple spaces for manual word spacing' :
                    components.find(c => c.id === editingComponent)?.type === 'barcode' ? 'Enter barcode value...' :
                    components.find(c => c.id === editingComponent)?.type === 'qr' ? 'Enter QR code value...' : 'Enter text...'
                  }
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={cancelTextEdit}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveTextEdit}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {components.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Empty Canvas</h3>
                <p className="text-sm">Click buttons in the sidebar to add components</p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-screen overflow-hidden">
        <div className="p-4 pb-2 flex-shrink-0">
          <h2 className="text-lg font-semibold">Properties</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
        
        {/* Grid Settings */}
        <Card className="mb-4">
          <div 
            className="pb-3 cursor-pointer hover:bg-gray-50 rounded-t-lg -m-2 p-2"
            onClick={() => setCollapsedCards(prev => ({ ...prev, grid: !prev.grid }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Grid Settings</CardTitle>
              <div className={`transform transition-transform ${collapsedCards.grid ? 'rotate-180' : ''}`}>
                ▽
              </div>
            </div>
          </div>
          {!collapsedCards.grid && (
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Snap to Grid</label>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Precise Mode</label>
              <input
                type="checkbox"
                checked={preciseMode}
                onChange={(e) => setPreciseMode(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Alignment Guides</label>
              <input
                type="checkbox"
                checked={showAlignmentGuides}
                onChange={(e) => setShowAlignmentGuides(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Grid Size (px)</label>
              <input
                type="number"
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value) || 5)}
                min="1"
                max="50"
                className="w-full px-2 py-1 text-sm border rounded mt-1"
              />
            </div>
          </CardContent>
          )}
        </Card>
        
        {selectedComponentData ? (
          <div className="space-y-4">
            <Card>
              <div 
                className="pb-3 cursor-pointer hover:bg-gray-50 rounded-t-lg -m-2 p-2"
                onClick={() => setCollapsedCards(prev => ({ ...prev, component: !prev.component }))}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">
                    {selectedComponentData.type} Component
                  </CardTitle>
                  <div className={`transform transition-transform ${collapsedCards.component ? 'rotate-180' : ''}`}>
                    ▽
                  </div>
                </div>
              </div>
              {!collapsedCards.component && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">X</label>
                    <input
                      type="number"
                      value={selectedComponentData.x}
                      onChange={(e) => updateComponent(selectedComponentData.id, { x: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Y</label>
                    <input
                      type="number"
                      value={selectedComponentData.y}
                      onChange={(e) => updateComponent(selectedComponentData.id, { y: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Width</label>
                    <input
                      type="number"
                      value={selectedComponentData.width}
                      onChange={(e) => updateComponent(selectedComponentData.id, { width: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Height</label>
                    <input
                      type="number"
                      value={selectedComponentData.height}
                      onChange={(e) => updateComponent(selectedComponentData.id, { height: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>

                {/* Margin and Padding Controls */}
                <div className="border-t pt-2 mt-2">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Spacing</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Margin (px)</label>
                      <input
                        type="number"
                        value={selectedComponentData.props.margin || 0}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { margin: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border rounded"
                        min="0"
                        max="50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Padding (px)</label>
                      <input
                        type="number"
                        value={selectedComponentData.props.padding || 0}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { padding: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border rounded"
                        min="0"
                        max="50"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => updateComponentProps(selectedComponentData.id, { margin: 0, padding: 0 })}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Reset to 0
                    </button>
                    <button
                      onClick={() => updateComponentProps(selectedComponentData.id, { margin: 5, padding: 5 })}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Default (5px)
                    </button>
                  </div>
                </div>

                {/* Component-specific properties */}
                {selectedComponentData.type === "text" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Text</label>
                      <input
                        type="text"
                        value={selectedComponentData.props.text}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { text: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    
                    {/* Font Controls */}
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Font Settings</h4>
                      <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Font Size</label>
                        <input
                          type="number"
                            value={selectedComponentData.props.fontSize || 16}
                          onChange={(e) => updateComponentProps(selectedComponentData.id, { fontSize: parseInt(e.target.value) || 16 })}
                          className="w-full px-2 py-1 text-sm border rounded"
                            min="8"
                            max="72"
                        />
                      </div>
                      <div>
                          <label className="text-xs font-medium text-gray-600">Font Family</label>
                          <select
                            value={selectedComponentData.props.fontFamily || 'Arial'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Color</label>
                        <input
                          type="color"
                            value={selectedComponentData.props.color || '#000000'}
                          onChange={(e) => updateComponentProps(selectedComponentData.id, { color: e.target.value })}
                          className="w-full h-8 border rounded"
                        />
                      </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Weight</label>
                          <select
                            value={selectedComponentData.props.fontWeight || 'normal'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontWeight: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Letter Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.letterSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Word Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.wordSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { wordSpacing: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponentData.type === "barcode" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Value</label>
                      <input
                        type="text"
                        value={selectedComponentData.props.value}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { value: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Format</label>
                      <select
                        value={selectedComponentData.props.format}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { format: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      >
                        <option value="CODE128">Code 128</option>
                        <option value="CODE39">Code 39</option>
                        <option value="EAN13">EAN 13</option>
                      </select>
                    </div>
                    
                    {/* Font Controls for Barcode Label */}
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Label Font</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Size</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.fontSize || 12}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontSize: parseInt(e.target.value) || 12 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Family</label>
                          <select
                            value={selectedComponentData.props.fontFamily || 'Arial'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Color</label>
                          <input
                            type="color"
                            value={selectedComponentData.props.fontColor || '#000000'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontColor: e.target.value })}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Weight</label>
                          <select
                            value={selectedComponentData.props.fontWeight || 'normal'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontWeight: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Letter Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.letterSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponentData.type === "qr" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Value</label>
                    <input
                      type="text"
                      value={selectedComponentData.props.value}
                      onChange={(e) => updateComponentProps(selectedComponentData.id, { value: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                )}

                {selectedComponentData.type === "rectangle" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Fill Color</label>
                      <input
                        type="color"
                        value={selectedComponentData.props.fillColor}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { fillColor: e.target.value })}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Border Color</label>
                      <input
                        type="color"
                        value={selectedComponentData.props.strokeColor}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeColor: e.target.value })}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Border Width</label>
                      <input
                        type="number"
                        value={selectedComponentData.props.strokeWidth}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeWidth: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    
                    {/* Font Controls */}
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Text Font</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Size</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.fontSize || 14}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontSize: parseInt(e.target.value) || 14 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Family</label>
                          <select
                            value={selectedComponentData.props.fontFamily || 'Arial'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Color</label>
                          <input
                            type="color"
                            value={selectedComponentData.props.fontColor || '#000000'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontColor: e.target.value })}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Weight</label>
                          <select
                            value={selectedComponentData.props.fontWeight || 'normal'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontWeight: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Letter Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.letterSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponentData.type === "line" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Color</label>
                      <input
                        type="color"
                        value={selectedComponentData.props.strokeColor}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeColor: e.target.value })}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Width</label>
                      <input
                        type="number"
                        value={selectedComponentData.props.strokeWidth}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeWidth: parseInt(e.target.value) || 2 })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    
                    {/* Font Controls */}
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Text Font</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Size</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.fontSize || 12}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontSize: parseInt(e.target.value) || 12 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Family</label>
                          <select
                            value={selectedComponentData.props.fontFamily || 'Arial'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Color</label>
                          <input
                            type="color"
                            value={selectedComponentData.props.fontColor || '#000000'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontColor: e.target.value })}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Weight</label>
                          <select
                            value={selectedComponentData.props.fontWeight || 'normal'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontWeight: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Letter Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.letterSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponentData.type === "circle" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Fill Color</label>
                      <input
                        type="color"
                        value={selectedComponentData.props.fillColor}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { fillColor: e.target.value })}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Border Color</label>
                      <input
                        type="color"
                        value={selectedComponentData.props.strokeColor}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeColor: e.target.value })}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Border Width</label>
                      <input
                        type="number"
                        value={selectedComponentData.props.strokeWidth}
                        onChange={(e) => updateComponentProps(selectedComponentData.id, { strokeWidth: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    
                    {/* Font Controls */}
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Text Font</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Size</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.fontSize || 14}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontSize: parseInt(e.target.value) || 14 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Family</label>
                          <select
                            value={selectedComponentData.props.fontFamily || 'Arial'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Color</label>
                          <input
                            type="color"
                            value={selectedComponentData.props.fontColor || '#000000'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontColor: e.target.value })}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Font Weight</label>
                          <select
                            value={selectedComponentData.props.fontWeight || 'normal'}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { fontWeight: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Letter Spacing (px)</label>
                          <input
                            type="number"
                            value={selectedComponentData.props.letterSpacing || 0}
                            onChange={(e) => updateComponentProps(selectedComponentData.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border rounded"
                            min="-5"
                            max="20"
                            step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => deleteComponent(selectedComponentData.id)}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Component
                </Button>
              </CardContent>
              )}
            </Card>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Select a component to edit its properties</p>
          </div>
        )}

        {/* Live JSON Export */}
        <Card className="mt-6">
          <div 
            className="pb-3 cursor-pointer hover:bg-gray-50 rounded-t-lg -m-2 p-2"
            onClick={() => setCollapsedCards(prev => ({ ...prev, liveJson: !prev.liveJson }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Live JSON</CardTitle>
              <div className={`transform transition-transform ${collapsedCards.liveJson ? 'rotate-180' : ''}`}>
                ▽
              </div>
            </div>
          </div>
          {!collapsedCards.liveJson && (
          <CardContent>
            <pre className="text-xs bg-gray-100 border rounded p-2 overflow-x-auto h-32">
              {JSON.stringify(components, null, 2)}
            </pre>
          </CardContent>
          )}
        </Card>

        {/* Excel Integration Component */}
        <ExcelIntegration
          selectedComponent={selectedComponentData}
          connectedComponents={componentExcelConnections}
          onConnectToExcel={(componentId, columnName) => {
            setComponentExcelConnections(prev => ({
              ...prev,
              [componentId]: { columnName }
            }));
          }}
          onDisconnectFromExcel={(componentId) => {
            const newConnections = { ...componentExcelConnections };
            delete newConnections[componentId];
            setComponentExcelConnections(newConnections);
          }}
          onExcelDataLoaded={(data) => {
            setExcelDataForMapping(data);
          }}
          onShowMappingModal={() => {
            setShowMappingModal(true);
          }}
        />
        </div>
      </div>
      
      {/* Import JSON Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Import JSON Template</h3>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportJson('');
                  setSelectedTemplateId('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Load Saved Template Option */}
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Select a saved template (optional):
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                  disabled={loadingTemplates}
                >
                  <option value="none">
                    {loadingTemplates ? 'Loading templates...' : '-- Select a template --'}
                  </option>
                  {savedTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name || `Template ${template.id}`}
                    </option>
                  ))}
                </select>
                {savedTemplates.length === 0 && !loadingTemplates && (
                  <p className="text-xs text-gray-500 mt-1">No saved templates found</p>
                )}
                {savedTemplates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {savedTemplates.length} template{savedTemplates.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              {/* Paste JSON Option */}
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Paste your JSON template:
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => {
                    setImportJson(e.target.value);
                    // Clear template selection if user manually edits JSON
                    if (selectedTemplateId) {
                      setSelectedTemplateId('');
                    }
                  }}
                  placeholder="Paste your JSON template here..."
                  className="w-full h-64 px-3 py-2 border rounded font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={importJSON}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                  disabled={!importJson.trim()}
                >
                  Import Template
                </button>
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportJson('');
                    setSelectedTemplateId('');
                  }}
                  className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Template Dialog */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Save Template</h3>
              <button
                onClick={() => setShowSaveTemplateDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Template Name:
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Template Preview:</strong>
                </div>
                <div className="text-xs text-gray-500">
                  • {components.length} components
                  • {components.filter(c => c.mapping?.isConnected).length} mapped to Excel
                  • Canvas size: 800x600px
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={saveTemplate}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                  disabled={!templateName.trim()}
                >
                  Save Template
                </button>
                <button
                  onClick={() => setShowSaveTemplateDialog(false)}
                  className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Template Dialog */}
      {showEditTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Template</h3>
              <button
                onClick={() => setShowEditTemplateDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Select Template to Edit:
                </label>
                <select
                  value={selectedTemplateToEdit}
                  onChange={(e) => setSelectedTemplateToEdit(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Choose a template...</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.components?.length || 0} components)
                    </option>
                  ))}
                </select>
              </div>
              
              {availableTemplates.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No templates available to edit.
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedTemplateToEdit) {
                      loadTemplateForEdit(selectedTemplateToEdit);
                    } else {
                      toast.error('Please select a template to edit');
                    }
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                  disabled={!selectedTemplateToEdit}
                >
                  Load for Editing
                </button>
                <button
                  onClick={() => setShowEditTemplateDialog(false)}
                  className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Excel Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">📊 Excel Mode - Component Mapping</h3>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-blue-800 mb-3">📄 Step 1: Upload Excel File</h4>
                <div className="space-y-3">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          const workbook = new ExcelJS.Workbook();
                          const arrayBuffer = await file.arrayBuffer();
                          await workbook.xlsx.load(arrayBuffer);
                          
                          const worksheet = workbook.worksheets[0];
                          if (!worksheet) throw new Error('No worksheets found');

                          const rows: any[] = [];
                          const headers: string[] = [];
                          
                          const headerRow = worksheet.getRow(1);
                          if (headerRow) {
                            headerRow.eachCell((cell, colNumber) => {
                              headers[colNumber] = cell.text?.toString() || `Column${colNumber}`;
                            });
                          }

                          worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber > 1) {
                              const rowData: any = {};
                              row.eachCell((cell, colNumber) => {
                                rowData[headers[colNumber]] = cell.text?.toString() || '';
                              });
                              rows.push(rowData);
                            }
                          });

                          const data = {
                            headers,
                            rows,
                            fileName: file.name
                          };
                          
                          setExcelDataForMapping(data);
                          toast.success(`Excel file "${file.name}" loaded successfully`);
                        } catch (error) {
                          toast.error('Error loading Excel file');
                        }
                      }}
                      className="hidden"
                      id="excel-modal-upload"
                    />
                    <label htmlFor="excel-modal-upload" className="cursor-pointer block">
                      <div className="text-4xl mb-2">📊</div>
                      <div className="text-sm font-medium text-blue-700">
                        Click to Upload Excel File
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Supports .xlsx, .xls, .csv files
                      </div>
                    </label>
                  </div>

                  {/* Mock Data Button */}
                  <button
                    onClick={() => {
                      const mockData = {
                        headers: ['Product', 'IMEI', 'Color', 'Storage', 'Price'],
                        rows: [
                          { Product: 'SAMSUNG GALAXY A55 BLACK', IMEI: '123456789012345', Color: 'BLACK', Storage: '128GB', Price: '599' },
                          { Product: 'APPLE IPHONE 15 PRO SILVER', IMEI: '987654321098765', Color: 'SILVER', Storage: '256GB', Price: '1299' },
                          { Product: 'XIAOMI NOTE 12 BLUE', IMEI: '555444333222111', Color: 'BLUE', Storage: '64GB', Price: '399' },
                        ],
                        fileName: 'Sample Data (Demo)'
                      };
                      setExcelDataForMapping(mockData);
                      toast.success('Mock Excel data loaded for demonstration');
                    }}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    📋 Load Mock Data (Demo)
                  </button>
                </div>
              </div>

              {/* Excel Data Summary */}
              {excelDataForMapping && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-green-800 mb-2">✅ Excel Data Loaded</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>File:</strong> {excelDataForMapping.fileName}
                    </div>
                    <div>
                      <strong>Columns:</strong> {excelDataForMapping.headers.length}
                    </div>
                    <div>
                      <strong>Rows:</strong> {excelDataForMapping.rows.length}
                    </div>
                    <div>
                      <strong>Preview:</strong> Row 1 ready
                    </div>
                  </div>
                  
                  {/* Column Preview */}
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Available Columns:</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {excelDataForMapping.headers.map((header, index) => (
                        <div key={index} className="bg-white border rounded p-2 text-xs">
                          <div className="font-medium text-gray-800">{header}</div>
                          <div className="text-gray-600">
                            Sample: "{excelDataForMapping.rows[0]?.[header] || ''}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Component Mapping Section */}
              {excelDataForMapping && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-yellow-800 mb-4">🔗 Step 2: Map Components to Excel Columns</h4>
                  
                  <div className="space-y-4">
                    {/* No Components State */}
                    {components.length === 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="text-4xl mb-3">🎨</div>
                        <h5 className="text-lg font-medium text-blue-800 mb-2">No Components on Canvas Yet</h5>
                        <p className="text-sm text-blue-600 mb-4">
                          Add components to your canvas first, then come back to map them to Excel columns.
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs text-blue-500">💡 <strong>Quick Start:</strong></p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white border rounded p-2">
                              <strong>1.</strong> Close this modal
                            </div>
                            <div className="bg-white border rounded p-2">
                              <strong>2.</strong> Drag components from left sidebar
                            </div>
                            <div className="bg-white border rounded p-2">
                              <strong>3.</strong> Reopen Excel Mode to map them
                            </div>
                            <div className="bg-white border rounded p-2">
                              <strong>4.</strong> Map each component to Excel columns
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMappingModal(false)}
                          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 text-sm"
                        >
                          🎨 Go Design Components
                        </button>
                      </div>
                    )}

                    {/* Canvas Components List */}
                    {components.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">
                          Canvas Components ({components.filter(c => c.mapping?.isConnected).length} of {components.length} mapped):
                        </h5>
                        <div className="space-y-2">
                          {components.map((component) => (
                            <div key={component.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                              componentForMapping?.id === component.id 
                                ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400' 
                                : 'bg-white'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                                  componentForMapping?.id === component.id 
                                    ? 'bg-blue-200 text-blue-800' 
                                    : 'bg-blue-100'
                                }`}>
                                  {component.type === 'text' ? '📝' : 
                                   component.type === 'barcode' ? '📊' : 
                                   component.type === 'qr' ? '🔲' : 
                                   component.type === 'rectangle' ? '⬜' : 
                                   component.type === 'line' ? '📏' : '⭕'}
                                </div>
                                <div>
                                  <div className={`font-medium text-sm ${
                                    componentForMapping?.id === component.id ? 'text-blue-900' : ''
                                  }`}>
                                    {component.type}
                                    {componentForMapping?.id === component.id && (
                                      <span className="text-xs text-blue-600 ml-2">← Currently mapping</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">ID: {component.id.slice(0, 8)}...</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Mapping Status */}
                                {component.mapping?.isConnected ? (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                    ✅ {component.mapping.columnName || 'Static'}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      // Restore existing mapping if component has one
                                      const componentWithMapping = components.find(c => c.id === component.id);
                                      setComponentForMapping(componentWithMapping || component);
                                    }}
                                    className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors cursor-pointer"
                                    title="Click to map this component"
                                  >
                                    ⚠️ Unmapped
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    // Restore existing mapping if component has one
                                    const componentWithMapping = components.find(c => c.id === component.id);
                                    setComponentForMapping(componentWithMapping || component);
                                  }}
                                  className={`text-xs px-3 py-1 rounded ${
                                    componentForMapping?.id === component.id
                                      ? 'bg-blue-600 text-white cursor-default'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                  disabled={componentForMapping?.id === component.id}
                                >
                                  {componentForMapping?.id === component.id ? 'Mapping...' : 'Map Column'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mapping Suggestions */}
                    {components.length > 0 && components.filter(c => c.mapping?.isConnected).length === 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-orange-800 mb-2">💡 Mapping Suggestions</h5>
                        <div className="text-xs text-orange-700 space-y-1">
                          <p><strong>Common mappings:</strong></p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Text components:</strong> Map to Product, Brand, Model columns</li>
                            <li><strong>Barcode components:</strong> Map to IMEI/SN, Box ID columns</li>
                            <li><strong>QR Code components:</strong> Map to IMEI/SN or Product columns</li>
                            <li><strong>Static components:</strong> Use manual values for labels like "Model:", "IMEI:"</li>
                          </ul>
                          <p className="mt-2"><strong>Tip:</strong> Click "Map Column" next to each component to configure its data source.</p>
                        </div>
                      </div>
                    )}

                    {/* Individual Component Mapping */}
                    {componentForMapping && (
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium text-lg">
                            Mapping: <span className="text-blue-600">{componentForMapping.type}</span>
                            <span className="text-sm text-gray-500 ml-2">(ID: {componentForMapping.id.slice(0, 8)}...)</span>
                          </h5>
                          <button
                            onClick={() => setComponentForMapping(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕ Cancel
                          </button>
                        </div>

                        {/* Component Preview Card */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <div className="text-sm font-medium text-blue-800 mb-2">🎯 Currently Mapping:</div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                              {componentForMapping.type === 'text' ? '📝' : 
                               componentForMapping.type === 'barcode' ? '📊' : 
                               componentForMapping.type === 'qr' ? '🔲' : 
                               componentForMapping.type === 'rectangle' ? '⬜' : 
                               componentForMapping.type === 'line' ? '📏' : '⭕'}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-blue-900">{componentForMapping.type.toUpperCase()}</div>
                              <div className="text-xs text-blue-700">
                                Position: ({componentForMapping.x}, {componentForMapping.y}) | 
                                Size: {componentForMapping.width}×{componentForMapping.height}px
                              </div>
                              {componentForMapping.mapping?.isConnected && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✅ Currently mapped to: {componentForMapping.mapping.columnName || 'Static value'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Column Selection */}
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-2">
                              Excel Column:
                            </label>
                            <select
                              value={componentForMapping.mapping?.columnName || ''}
                              onChange={(e) => {
                                const existingRule = componentForMapping.mapping?.extractionRule;
                                // Ensure component ID is preserved or added
                                const defaultRule = e.target.value 
                                  ? { type: 'direct' as const, componentId: componentForMapping.id, createdAt: Date.now() }
                                  : { type: 'manual' as const, componentId: componentForMapping.id, createdAt: Date.now() };
                                
                                const extractionRule = existingRule 
                                  ? { ...existingRule, componentId: componentForMapping.id } // Ensure component ID matches
                                  : defaultRule;
                                
                                const updatedComponent = {
                                  ...componentForMapping,
                                  mapping: {
                                    columnName: e.target.value || undefined,
                                    extractionRule,
                                    staticValue: componentForMapping.mapping?.staticValue,
                                    isConnected: !!e.target.value || !!componentForMapping.mapping?.staticValue
                                  }
                                };
                                setComponentForMapping(updatedComponent);
                              }}
                              className="w-full px-3 py-2 border rounded"
                            >
                              <option value="">Select Excel Column...</option>
                              {excelDataForMapping?.headers?.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                              <option value="">📝 Manual/Static Value</option>
                            </select>
                          </div>
                          
                          {/* Static Value Input */}
                          {(!componentForMapping.mapping?.columnName) && (
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-2">
                                Static Value:
                              </label>
                              <input
                                type="text"
                                value={componentForMapping.mapping?.staticValue || ''}
                                onChange={(e) => {
                                  const uniqueRule = {
                                    type: 'manual' as const,
                                    value: e.target.value,
                                    componentId: componentForMapping.id,
                                    createdAt: Date.now()
                                  };
                                  const updatedComponent = {
                                    ...componentForMapping,
                                    mapping: {
                                      ...componentForMapping.mapping,
                                      staticValue: e.target.value,
                                      extractionRule: uniqueRule,
                                      isConnected: !!e.target.value || !!componentForMapping.mapping?.columnName
                                    }
                                  };
                                  setComponentForMapping(updatedComponent);
                                }}
                                placeholder="Enter static value..."
                                className="w-full px-3 py-2 border rounded"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                This value will appear the same on all generated barcodes
                              </div>
                            </div>
                          )}
                          
                          {/* Text Extraction Rules */}
                          {componentForMapping.mapping?.columnName && (
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-2">
                                Text Extraction Rule:
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    const uniqueRule = {
                                      type: 'direct' as const,
                                      componentId: componentForMapping.id,
                                      createdAt: Date.now()
                                    };
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: uniqueRule
                                      }
                                    };
                                    console.log(`[Rule Creation] Component ${componentForMapping.id}: Created direct rule`);
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`p-2 text-xs border rounded ${
                                    componentForMapping.mapping?.extractionRule?.type === 'direct'
                                      ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  📄 Direct Use
                                </button>
                                <button
                                  onClick={() => {
                                    const uniqueRule = {
                                      type: 'context_based' as const,
                                      context_type: 'storage',
                                      componentId: componentForMapping.id,
                                      createdAt: Date.now()
                                    };
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: uniqueRule
                                      }
                                    };
                                    console.log(`[Rule Creation] Component ${componentForMapping.id}: Created storage context rule`);
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`p-2 text-xs border rounded ${
                                    componentForMapping.mapping?.extractionRule?.type === 'context_based' && 
                                    componentForMapping.mapping?.extractionRule?.context_type === 'storage'
                                      ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  💾 Storage (64+3)
                                </button>
                                <button
                                  onClick={() => {
                                    const uniqueRule = {
                                      type: 'context_based' as const,
                                      context_type: 'color',
                                      componentId: componentForMapping.id,
                                      createdAt: Date.now()
                                    };
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: uniqueRule
                                      }
                                    };
                                    console.log(`[Rule Creation] Component ${componentForMapping.id}: Created color context rule`);
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`p-2 text-xs border rounded ${
                                    componentForMapping.mapping?.extractionRule?.type === 'context_based' && 
                                    componentForMapping.mapping?.extractionRule?.context_type === 'color'
                                      ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  🎨 Color (BLACK)
                                </button>
                                <button
                                  onClick={() => {
                                    const uniqueRule = {
                                      type: 'position_based' as const,
                                      position_type: 'after_storage',
                                      componentId: componentForMapping.id,
                                      createdAt: Date.now()
                                    };
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: uniqueRule
                                      }
                                    };
                                    console.log(`[Rule Creation] Component ${componentForMapping.id}: Created after_storage rule`);
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`p-2 text-xs border rounded ${
                                    componentForMapping.mapping?.extractionRule?.type === 'position_based' && 
                                    componentForMapping.mapping?.extractionRule?.position_type === 'after_storage'
                                      ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  📍 After Storage
                                </button>
                                <button
                                  onClick={() => {
                                    const uniqueRule = {
                                      type: 'position_based' as const,
                                      position_type: 'last_segment_pattern',
                                      pattern: 'integer_plus_integer',
                                      componentId: componentForMapping.id,
                                      createdAt: Date.now()
                                    };
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: uniqueRule
                                      }
                                    };
                                    console.log(`[Rule Creation] Component ${componentForMapping.id}: Created last_segment_pattern rule`);
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`p-2 text-xs border rounded ${
                                    componentForMapping.mapping?.extractionRule?.type === 'position_based' && 
                                    componentForMapping.mapping?.extractionRule?.position_type === 'last_segment_pattern'
                                      ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  🎯 Last Segment (64+2)
                                </button>
                              </div>
                              
                              {/* Show examples */}
                              {(componentForMapping.mapping?.extractionRule?.type === 'context_based' || 
                                componentForMapping.mapping?.extractionRule?.type === 'position_based') && (
                                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                  <div className="font-medium text-gray-700 mb-1">Examples:</div>
                                  {componentForMapping.mapping?.extractionRule?.type === 'context_based' ? (
                                    getExtractionExamples(
                                      componentForMapping.mapping.columnName, 
                                      componentForMapping.mapping.extractionRule.context_type
                                    ).map((example, idx) => (
                                      <div key={idx} className="text-gray-600">
                                        <span className="font-mono">"{example.original}"</span> → 
                                        <span className="font-bold text-green-600"> "{example.extracted}"</span>
                                      </div>
                                    ))
                                  ) : (
                                    // Position-based examples
                                    excelDataForMapping?.rows.slice(0, 5).map((row, idx) => {
                                      const value = row[componentForMapping.mapping!.columnName!] || '';
                                      const extracted = extractByPosition(value, componentForMapping.mapping!.extractionRule!);
                                      return (
                                        <div key={idx} className="text-gray-600">
                                          <span className="font-mono">"{value}"</span> → 
                                          <span className="font-bold text-green-600"> "{extracted}"</span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                              
                              {/* Custom Regex */}
                              <div className="mt-3">
                                <button
                                  onClick={() => {
                                    const updatedComponent = {
                                      ...componentForMapping,
                                      mapping: {
                                        ...componentForMapping.mapping,
                                        extractionRule: { type: 'regex' as const, value: '' }
                                      }
                                    };
                                    setComponentForMapping(updatedComponent);
                                  }}
                                  className={`w-full p-2 text-xs border rounded text-left ${
                                    componentForMapping.mapping?.extractionRule?.type === 'regex'
                                      ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  🔍 Custom Regex Pattern
                                </button>
                                {componentForMapping.mapping?.extractionRule?.type === 'regex' && (
                                  <div className="mt-2 space-y-2">
                                    <input
                                      type="text"
                                      value={componentForMapping.mapping?.extractionRule?.value || ''}
                                      onChange={(e) => {
                                        const updatedComponent = {
                                          ...componentForMapping,
                                          mapping: {
                                            ...componentForMapping.mapping,
                                            extractionRule: { type: 'regex' as const, value: e.target.value }
                                          }
                                        };
                                        setComponentForMapping(updatedComponent);
                                      }}
                                      placeholder="/(SILVER|BLACK|BLUE)/gi"
                                      className="w-full px-3 py-2 text-sm border rounded"
                                    />
                                    
                                    {/* Interactive Text Selection */}
                                    {excelDataForMapping?.rows[0] && componentForMapping.mapping?.columnName && (
                                      <div className="bg-gray-50 rounded p-3">
                                        <div className="text-xs text-gray-600 mb-2">
                                          💡 <strong>Smart Position Extraction:</strong> Select any text to automatically extract values from the same position across all Excel rows. The system will detect word position, first/last word, or patterns.
                                        </div>
                                        <div 
                                          className="text-sm font-mono bg-white border rounded p-2 cursor-text select-text"
                                          onMouseUp={(e) => {
                                            const selection = window.getSelection();
                                            if (selection && selection.toString().trim()) {
                                              const selectedText = selection.toString().trim();
                                              const fullText = excelDataForMapping.rows[0][componentForMapping.mapping!.columnName!] || '';
                                              
                                              // Get selection range to determine position
                                              const range = selection.getRangeAt(0);
                                              
                                              // Try to get accurate selection position
                                              let selectionStart = 0;
                                              let selectionEnd = 0;
                                              
                                              // Method 1: Try to get position from text node
                                              const startContainer = range.startContainer;
                                              const endContainer = range.endContainer;
                                              
                                              if (startContainer.nodeType === Node.TEXT_NODE && endContainer.nodeType === Node.TEXT_NODE) {
                                                const startTextNode = startContainer as Text;
                                                const endTextNode = endContainer as Text;
                                                
                                                // Get the parent element that contains the full text
                                                const parentElement = startTextNode.parentElement;
                                                if (parentElement) {
                                                  const parentText = parentElement.textContent || '';
                                                  
                                                  // Find where the text node appears in the parent
                                                  const startNodeText = startTextNode.textContent || '';
                                                  const startNodeIndex = parentText.indexOf(startNodeText);
                                                  
                                                  if (startNodeIndex !== -1) {
                                                    selectionStart = startNodeIndex + range.startOffset;
                                                  } else {
                                                    // Fallback: use offset directly if text node is the full text
                                                    selectionStart = range.startOffset;
                                                  }
                                                  
                                                  // For end position
                                                  if (startTextNode === endTextNode) {
                                                    selectionEnd = selectionStart + (range.endOffset - range.startOffset);
                                                  } else {
                                                    const endNodeText = endTextNode.textContent || '';
                                                    const endNodeIndex = parentText.indexOf(endNodeText);
                                                    if (endNodeIndex !== -1) {
                                                      selectionEnd = endNodeIndex + range.endOffset;
                                                    } else {
                                                      selectionEnd = range.endOffset;
                                                    }
                                                  }
                                                } else {
                                                  // Fallback: use offsets directly
                                                  selectionStart = range.startOffset;
                                                  selectionEnd = range.endOffset;
                                                }
                                              } else {
                                                // Fallback: find position by text matching
                                                selectionStart = fullText.indexOf(selectedText);
                                                selectionEnd = selectionStart + selectedText.length;
                                              }
                                              
                                              // Analyze position and create appropriate rule
                                              const positionRule = analyzeTextPosition(fullText, selectedText, selectionStart, selectionEnd);
                                              
                                              if (positionRule) {
                                                // Create position-based rule with component ID for uniqueness
                                                const uniqueRule = {
                                                  ...positionRule,
                                                  componentId: componentForMapping.id, // Ensure rule is tied to this component
                                                  createdAt: Date.now() // Timestamp for uniqueness
                                                };
                                                
                                                const updatedComponent = {
                                                  ...componentForMapping,
                                                  mapping: {
                                                    ...componentForMapping.mapping,
                                                    extractionRule: uniqueRule as any
                                                  }
                                                };
                                                
                                                console.log(`[Rule Creation] Component ${componentForMapping.id} (${componentForMapping.type}): Created unique rule:`, uniqueRule);
                                                setComponentForMapping(updatedComponent);
                                                
                                                // Clear selection
                                                selection.removeAllRanges();
                                                toast.success(`Position-based rule created for ${componentForMapping.type} component: ${positionRule.description}`);
                                              } else {
                                                // Fallback: use literal regex if position can't be determined
                                                const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                const regexPattern = `/${escapedText}/gi`;
                                                
                                                const uniqueRule = {
                                                  type: 'regex' as const,
                                                  value: regexPattern,
                                                  componentId: componentForMapping.id, // Ensure rule is tied to this component
                                                  createdAt: Date.now() // Timestamp for uniqueness
                                                };
                                                
                                                const updatedComponent = {
                                                  ...componentForMapping,
                                                  mapping: {
                                                    ...componentForMapping.mapping,
                                                    extractionRule: uniqueRule
                                                  }
                                                };
                                                
                                                console.log(`[Rule Creation] Component ${componentForMapping.id} (${componentForMapping.type}): Created unique regex rule:`, uniqueRule);
                                                setComponentForMapping(updatedComponent);
                                                
                                                // Clear selection
                                                selection.removeAllRanges();
                                                toast.success(`Regex pattern generated for ${componentForMapping.type} component: ${regexPattern}`);
                                              }
                                            }
                                          }}
                                          title="Select any text to automatically create a position-based extraction rule"
                                        >
                                          {excelDataForMapping.rows[0][componentForMapping.mapping!.columnName!] || 'No data available'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          💡 <strong>Tip:</strong> Select any text to create a position-based extraction rule. The system automatically detects if it's the first word, last word, Nth word, or a pattern, and extracts from that same position in all rows.
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Quick Regex Templates */}
                                    <div className="bg-blue-50 rounded p-2">
                                      <div className="text-xs text-blue-700 mb-2 font-medium">Quick Templates:</div>
                                      <div className="grid grid-cols-2 gap-1">
                                        <button
                                          onClick={() => {
                                            const uniqueRule = {
                                              type: 'regex' as const,
                                              value: '/(SILVER|BLACK|BLUE|WHITE|GOLD)/gi',
                                              componentId: componentForMapping.id,
                                              createdAt: Date.now()
                                            };
                                            const updatedComponent = {
                                              ...componentForMapping,
                                              mapping: {
                                                ...componentForMapping.mapping,
                                                extractionRule: uniqueRule
                                              }
                                            };
                                            console.log(`[Rule Creation] Component ${componentForMapping.id}: Created Colors regex rule`);
                                            setComponentForMapping(updatedComponent);
                                          }}
                                          className="text-xs bg-white border rounded px-2 py-1 hover:bg-gray-50"
                                        >
                                          Colors
                                        </button>
                                        <button
                                          onClick={() => {
                                            const uniqueRule = {
                                              type: 'regex' as const,
                                              value: '/(\\d+GB|\\d+MB)/gi',
                                              componentId: componentForMapping.id,
                                              createdAt: Date.now()
                                            };
                                            const updatedComponent = {
                                              ...componentForMapping,
                                              mapping: {
                                                ...componentForMapping.mapping,
                                                extractionRule: uniqueRule
                                              }
                                            };
                                            console.log(`[Rule Creation] Component ${componentForMapping.id}: Created Storage regex rule`);
                                            setComponentForMapping(updatedComponent);
                                          }}
                                          className="text-xs bg-white border rounded px-2 py-1 hover:bg-gray-50"
                                        >
                                          Storage
                                        </button>
                                        <button
                                          onClick={() => {
                                            const uniqueRule = {
                                              type: 'regex' as const,
                                              value: '/(\\d{15})/gi',
                                              componentId: componentForMapping.id,
                                              createdAt: Date.now()
                                            };
                                            const updatedComponent = {
                                              ...componentForMapping,
                                              mapping: {
                                                ...componentForMapping.mapping,
                                                extractionRule: uniqueRule
                                              }
                                            };
                                            console.log(`[Rule Creation] Component ${componentForMapping.id}: Created IMEI regex rule`);
                                            setComponentForMapping(updatedComponent);
                                          }}
                                          className="text-xs bg-white border rounded px-2 py-1 hover:bg-gray-50"
                                        >
                                          IMEI
                                        </button>
                                        <button
                                          onClick={() => {
                                            const uniqueRule = {
                                              type: 'regex' as const,
                                              value: '/([A-Z]{2,}\\d+)/gi',
                                              componentId: componentForMapping.id,
                                              createdAt: Date.now()
                                            };
                                            const updatedComponent = {
                                              ...componentForMapping,
                                              mapping: {
                                                ...componentForMapping.mapping,
                                                extractionRule: uniqueRule
                                              }
                                            };
                                            console.log(`[Rule Creation] Component ${componentForMapping.id}: Created Model regex rule`);
                                            setComponentForMapping(updatedComponent);
                                          }}
                                          className="text-xs bg-white border rounded px-2 py-1 hover:bg-gray-50"
                                        >
                                          Model
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Preview */}
                          {(componentForMapping.mapping?.columnName || componentForMapping.mapping?.staticValue) && (
                            <div className="bg-gray-50 rounded p-3">
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                Preview (using first row of Excel data):
                              </div>
                              <div className="text-sm font-mono bg-white border rounded p-2">
                                {componentForMapping.mapping?.staticValue || 
                                 (componentForMapping.mapping?.columnName && excelDataForMapping?.rows[0] && componentForMapping.mapping?.extractionRule ? 
                                  extractTextFromValue(
                                    excelDataForMapping.rows[0][componentForMapping.mapping.columnName] || '', 
                                    componentForMapping.mapping.extractionRule
                                  ) : 
                                  (componentForMapping.mapping?.columnName && excelDataForMapping?.rows[0]?.[componentForMapping.mapping.columnName]) || 
                                  'No preview available')}
                              </div>
                              {componentForMapping.mapping?.extractionRule && componentForMapping.mapping.extractionRule.type !== 'direct' && (
                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                  <div>
                                    <span className="font-semibold">Rule applied:</span> {componentForMapping.mapping.extractionRule.type}
                                    {componentForMapping.mapping.extractionRule.type === 'position_based' && componentForMapping.mapping.extractionRule.position_type === 'word_position' && 
                                      ` - Word at position ${(componentForMapping.mapping.extractionRule.wordPosition ?? 0) + 1}`}
                                    {componentForMapping.mapping.extractionRule.type === 'position_based' && componentForMapping.mapping.extractionRule.position_type === 'last_segment_pattern' && 
                                      ` - Integer+integer pattern from last segment`}
                                    {componentForMapping.mapping.extractionRule.value && ` (${componentForMapping.mapping.extractionRule.value})`}
                                  </div>
                                  {componentForMapping.mapping.extractionRule.componentId && (
                                    <div className="text-xs text-blue-600 font-mono">
                                      🔒 Unique to: {componentForMapping.type} component ({componentForMapping.mapping.extractionRule.componentId.slice(0, 8)}...)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Save Button */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                // Validate that the rule is unique to this component
                                if (componentForMapping.mapping?.extractionRule) {
                                  const rule = componentForMapping.mapping.extractionRule;
                                  // Ensure component ID matches (safety check)
                                  if (rule.componentId && rule.componentId !== componentForMapping.id) {
                                    console.warn(`[Rule Validation] Rule componentId mismatch! Rule: ${rule.componentId}, Component: ${componentForMapping.id}`);
                                    // Fix the mismatch
                                    componentForMapping.mapping.extractionRule = {
                                      ...rule,
                                      componentId: componentForMapping.id
                                    };
                                  } else if (!rule.componentId) {
                                    // Add component ID if missing
                                    componentForMapping.mapping.extractionRule = {
                                      ...rule,
                                      componentId: componentForMapping.id
                                    };
                                  }
                                }
                                
                                // Save only this specific component's mapping
                                setComponents(prev => {
                                  const updated = prev.map(comp => {
                                    if (comp.id === componentForMapping.id) {
                                      console.log(`[Save Mapping] Saving unique rule for component ${comp.id} (${comp.type}):`, componentForMapping.mapping?.extractionRule);
                                      return componentForMapping;
                                    }
                                    // Ensure other components are not affected
                                    return comp;
                                  });
                                  return updated;
                                });
                                
                                setComponentForMapping(null);
                                toast.success(`Component mapping saved! Rule is unique to this ${componentForMapping.type} component.`);
                              }}
                              className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                            >
                              ✅ Save Mapping
                            </button>
                            <button
                              onClick={() => setComponentForMapping(null)}
                              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Summary */}
            <div className="border-t pt-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {components.filter(c => c.mapping?.isConnected).length} of {components.length} components mapped
                </div>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="bg-green-500 text-white py-2 px-6 rounded hover:bg-green-600"
                >
                  ✅ Close Mapping Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

