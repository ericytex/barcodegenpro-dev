export interface BarcodeTemplate {
  id: string;
  name: string;
  description?: string;
  components: BarcodeComponent[] | string; // Can be array or JSON string for backend compatibility
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
}

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
  };
}

export class TemplateManager {
  private static readonly STORAGE_KEY = 'barcode-templates';
  private static readonly API_BASE_URL = 'http://localhost:8034'; // Backend API URL

  // Fetch templates from backend API
  static async fetchTemplatesFromBackend(): Promise<BarcodeTemplate[]> {
    try {
      // Import getApiConfig function
      const { getApiConfig } = await import('@/lib/api');
      const { baseUrl, apiKey } = getApiConfig();
      
      const response = await fetch(`${baseUrl}/api/templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch templates from backend:', response.statusText);
        return [];
      }

      const data = await response.json();
      
      // The backend returns { success: true, templates: [...] }
      const backendTemplates = data.success ? data.templates : [];
      
      // Convert backend format to frontend format
      return backendTemplates.map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        components: template.components || [], // Keep as array since backend sends it as array
        canvasWidth: template.canvas_width || template.canvasWidth || 600,
        canvasHeight: template.canvas_height || template.canvasHeight || 200,
        backgroundColor: template.background_color || template.backgroundColor || '#ffffff',
        createdAt: template.created_at || template.createdAt || new Date().toISOString(),
        updatedAt: template.updated_at || template.updatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching templates from backend:', error);
      return [];
    }
  }

  // Get all templates (combines localStorage and backend)
  static async getAllTemplates(): Promise<BarcodeTemplate[]> {
    try {
      // Try to fetch from backend first
      const backendTemplates = await this.fetchTemplatesFromBackend();
      
      // Also get local templates
      const localTemplates = this.getLocalTemplates();
      
      // Combine and deduplicate (backend templates take precedence)
      const allTemplates = [...backendTemplates];
      localTemplates.forEach(localTemplate => {
        if (!allTemplates.find(t => t.id === localTemplate.id)) {
          allTemplates.push(localTemplate);
        }
      });
      
      return allTemplates;
    } catch (error) {
      console.error('Error getting all templates:', error);
      // Fallback to local templates only
      return this.getLocalTemplates();
    }
  }

  static getLocalTemplates(): BarcodeTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading local templates:', error);
      return [];
    }
  }

  static async getTemplate(id: string): Promise<BarcodeTemplate | null> {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  static updateTemplate(id: string, updates: Partial<BarcodeTemplate>): boolean {
    const templates = this.getLocalTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return false;

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    return true;
  }

  static deleteTemplate(id: string): boolean {
    const templates = this.getLocalTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) return false;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  static async exportTemplate(id: string): Promise<string | null> {
    const template = await this.getTemplate(id);
    return template ? JSON.stringify(template, null, 2) : null;
  }

  static importTemplate(templateJson: string): string | null {
    try {
      const template = JSON.parse(templateJson) as BarcodeTemplate;
      
      // Validate template structure
      if (!template.name || !template.components || !Array.isArray(template.components)) {
        throw new Error('Invalid template format');
      }

      // Generate new ID and timestamps
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const importedTemplate: BarcodeTemplate = {
        ...template,
        id,
        name: `${template.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
      };

      const templates = this.getLocalTemplates();
      templates.push(importedTemplate);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      
      return id;
    } catch (error) {
      console.error('Error importing template:', error);
      return null;
    }
  }

  static createDefaultTemplate(): BarcodeTemplate {
    return {
      id: 'default',
      name: 'Default Samsung Galaxy',
      description: 'Default Samsung Galaxy barcode layout',
      canvasWidth: 600,
      canvasHeight: 200,
      backgroundColor: '#ffffff',
      components: [
        {
          id: 'model-text',
          type: 'text',
          x: 20,
          y: 15,
          width: 150,
          height: 30,
          properties: {
            text: 'Model: A669L',
            fontSize: 30,
            fontFamily: 'Arial',
            color: '#000000',
          },
        },
        {
          id: 'color-text',
          type: 'text',
          x: 400,
          y: 15,
          width: 150,
          height: 30,
          properties: {
            text: 'SAPPHIRE BLACK',
            fontSize: 30,
            fontFamily: 'Arial',
            color: '#000000',
          },
        },
        {
          id: 'barcode',
          type: 'barcode',
          x: 20,
          y: 65,
          width: 400,
          height: 50,
          properties: {
            data: '350544301197847',
            barcodeType: 'code128',
          },
        },
        {
          id: 'imei-text',
          type: 'text',
          x: 20,
          y: 120,
          width: 200,
          height: 20,
          properties: {
            text: 'IMEI 1: 350544301197847',
            fontSize: 18,
            fontFamily: 'Arial',
            color: '#000000',
          },
        },
        {
          id: 'qr-code',
          type: 'qr',
          x: 500,
          y: 65,
          width: 80,
          height: 80,
          properties: {
            data: '350544301197847',
          },
        },
        {
          id: 'vc-text',
          type: 'text',
          x: 20,
          y: 150,
          width: 100,
          height: 20,
          properties: {
            text: 'VC: 874478',
            fontSize: 18,
            fontFamily: 'Arial',
            color: '#000000',
          },
        },
        {
          id: 'storage-box',
          type: 'rectangle',
          x: 250,
          y: 145,
          width: 100,
          height: 30,
          properties: {
            borderWidth: 2,
            fillColor: 'transparent',
            strokeColor: '#000000',
          },
        },
        {
          id: 'storage-text',
          type: 'text',
          x: 270,
          y: 150,
          width: 60,
          height: 20,
          properties: {
            text: '64+2',
            fontSize: 18,
            fontFamily: 'Arial',
            color: '#000000',
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
