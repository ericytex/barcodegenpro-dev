"""
Barcode Template Models and Management
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import json
import os


class BarcodeComponent(BaseModel):
    id: str
    type: str  # 'text' | 'barcode' | 'qr' | 'rectangle' | 'line' | 'circle'
    x: int
    y: int
    width: Optional[int] = None
    height: Optional[int] = None
    properties: Dict[str, Any] = {}
    mapping: Optional[Dict[str, Any]] = None  # Excel mapping information


class BarcodeTemplate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    components: List[BarcodeComponent]
    canvas_width: int = 600
    canvas_height: int = 200
    background_color: str = "#ffffff"
    created_at: str
    updated_at: str


class TemplateManager:
    def __init__(self, templates_dir: str = "templates"):
        self.templates_dir = templates_dir
        self.ensure_templates_dir()

    def ensure_templates_dir(self):
        """Ensure templates directory exists"""
        if not os.path.exists(self.templates_dir):
            os.makedirs(self.templates_dir, exist_ok=True)

    def save_template(self, template: BarcodeTemplate) -> str:
        """Save template to file"""
        template_path = os.path.join(self.templates_dir, f"{template.id}.json")
        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(template.model_dump(), f, indent=2, ensure_ascii=False)
        return template.id

    def get_template(self, template_id: str) -> Optional[BarcodeTemplate]:
        """Load template from file"""
        template_path = os.path.join(self.templates_dir, f"{template_id}.json")
        if not os.path.exists(template_path):
            return None
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return BarcodeTemplate(**data)
        except Exception as e:
            print(f"Error loading template {template_id}: {e}")
            return None

    def list_templates(self) -> List[BarcodeTemplate]:
        """List all available templates"""
        templates = []
        if not os.path.exists(self.templates_dir):
            return templates
        
        for filename in os.listdir(self.templates_dir):
            if filename.endswith('.json'):
                template_id = filename[:-5]  # Remove .json extension
                template = self.get_template(template_id)
                if template:
                    templates.append(template)
        
        # Sort by updated_at descending
        templates.sort(key=lambda t: t.updated_at, reverse=True)
        return templates

    def delete_template(self, template_id: str) -> bool:
        """Delete template file"""
        template_path = os.path.join(self.templates_dir, f"{template_id}.json")
        if os.path.exists(template_path):
            try:
                os.remove(template_path)
                return True
            except Exception as e:
                print(f"Error deleting template {template_id}: {e}")
        return False

    def create_default_template(self) -> BarcodeTemplate:
        """Create default Samsung Galaxy template"""
        now = datetime.now().isoformat()
        return BarcodeTemplate(
            id="default-samsung-galaxy",
            name="Default Samsung Galaxy",
            description="Default Samsung Galaxy barcode layout",
            canvas_width=600,
            canvas_height=200,
            background_color="#ffffff",
            components=[
                BarcodeComponent(
                    id="model-text",
                    type="text",
                    x=20,
                    y=15,
                    width=150,
                    height=30,
                    properties={
                        "text": "Model: A669L",
                        "fontSize": 30,
                        "fontFamily": "Arial",
                        "color": "#000000"
                    }
                ),
                BarcodeComponent(
                    id="color-text",
                    type="text",
                    x=400,
                    y=15,
                    width=150,
                    height=30,
                    properties={
                        "text": "SAPPHIRE BLACK",
                        "fontSize": 30,
                        "fontFamily": "Arial",
                        "color": "#000000"
                    }
                ),
                BarcodeComponent(
                    id="barcode",
                    type="barcode",
                    x=20,
                    y=65,
                    width=400,
                    height=50,
                    properties={
                        "data": "350544301197847",
                        "barcodeType": "code128"
                    }
                ),
                BarcodeComponent(
                    id="imei-text",
                    type="text",
                    x=20,
                    y=120,
                    width=200,
                    height=20,
                    properties={
                        "text": "IMEI 1: 350544301197847",
                        "fontSize": 18,
                        "fontFamily": "Arial",
                        "color": "#000000"
                    }
                ),
                BarcodeComponent(
                    id="qr-code",
                    type="qr",
                    x=500,
                    y=65,
                    width=80,
                    height=80,
                    properties={
                        "data": "350544301197847"
                    }
                ),
                BarcodeComponent(
                    id="vc-text",
                    type="text",
                    x=20,
                    y=150,
                    width=100,
                    height=20,
                    properties={
                        "text": "VC: 874478",
                        "fontSize": 18,
                        "fontFamily": "Arial",
                        "color": "#000000"
                    }
                ),
                BarcodeComponent(
                    id="storage-box",
                    type="rectangle",
                    x=250,
                    y=145,
                    width=100,
                    height=30,
                    properties={
                        "borderWidth": 2,
                        "fillColor": "transparent",
                        "strokeColor": "#000000"
                    }
                ),
                BarcodeComponent(
                    id="storage-text",
                    type="text",
                    x=270,
                    y=150,
                    width=60,
                    height=20,
                    properties={
                        "text": "64+2",
                        "fontSize": 18,
                        "fontFamily": "Arial",
                        "color": "#000000"
                    }
                )
            ],
            created_at=now,
            updated_at=now
        )
