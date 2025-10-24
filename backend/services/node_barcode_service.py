import requests
import json
import base64
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class NodeBarcodeService:
    """
    Service to communicate with Node.js barcode generation microservice
    """
    
    def __init__(self, node_service_url="http://localhost:3002"):
        self.node_service_url = node_service_url
        self.session = requests.Session()
        self.session.timeout = 30
    
    def is_available(self):
        """Check if the Node.js service is available"""
        try:
            print(f"🔍 Checking Node.js service availability at {self.node_service_url}/health")
            response = self.session.get(f"{self.node_service_url}/health")
            is_available = response.status_code == 200
            print(f"🔍 Node.js service available: {is_available}")
            return is_available
        except Exception as e:
            print(f"❌ Node.js service health check failed: {e}")
            logger.error(f"Node.js service health check failed: {e}")
            return False
    
    def generate_barcode_from_template(self, template, excel_row):
        """
        Generate barcode using Node.js service with exact frontend matching
        
        Args:
            template: Template object with components
            excel_row: Excel row data
            
        Returns:
            PIL Image object
        """
        try:
            # Prepare request data
            request_data = {
                "template": template,
                "excelRow": excel_row
            }
            
            # Call Node.js service
            response = self.session.post(
                f"{self.node_service_url}/generate-from-template",
                json=request_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                logger.error(f"Node.js service error: {response.status_code} - {response.text}")
                return None
            
            result = response.json()
            
            if not result.get('success'):
                logger.error(f"Node.js service returned error: {result.get('error')}")
                return None
            
            # Convert data URL to PIL Image
            data_url = result.get('dataURL')
            if not data_url:
                logger.error("No dataURL returned from Node.js service")
                return None
            
            # Extract base64 data from data URL
            if data_url.startswith('data:image/png;base64,'):
                base64_data = data_url.split(',')[1]
            else:
                logger.error("Invalid data URL format")
                return None
            
            # Decode base64 and create PIL Image
            image_data = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(image_data))
            
            logger.info(f"Successfully generated barcode using Node.js service")
            return image
            
        except Exception as e:
            logger.error(f"Error generating barcode with Node.js service: {e}")
            return None
    
    def generate_batch_barcodes(self, template, excel_rows):
        """
        Generate multiple barcodes using Node.js service
        
        Args:
            template: Template object with components
            excel_rows: List of Excel row data
            
        Returns:
            List of PIL Image objects
        """
        try:
            # Prepare request data
            request_data = {
                "template": template,
                "excelRows": excel_rows
            }
            
            # Call Node.js service
            response = self.session.post(
                f"{self.node_service_url}/generate-batch",
                json=request_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                logger.error(f"Node.js service error: {response.status_code} - {response.text}")
                return []
            
            result = response.json()
            
            if not result.get('success'):
                logger.error(f"Node.js service returned error: {result.get('error')}")
                return []
            
            # Convert data URLs to PIL Images
            images = []
            results = result.get('results', [])
            
            for item in results:
                if item.get('success') and item.get('dataURL'):
                    try:
                        # Extract base64 data from data URL
                        data_url = item.get('dataURL')
                        if data_url.startswith('data:image/png;base64,'):
                            base64_data = data_url.split(',')[1]
                            image_data = base64.b64decode(base64_data)
                            image = Image.open(io.BytesIO(image_data))
                            images.append(image)
                        else:
                            logger.error(f"Invalid data URL format for item {item.get('index')}")
                    except Exception as e:
                        logger.error(f"Error processing image for item {item.get('index')}: {e}")
                else:
                    logger.error(f"Failed to generate image for item {item.get('index')}: {item.get('error')}")
            
            logger.info(f"Successfully generated {len(images)} barcodes using Node.js service")
            return images
            
        except Exception as e:
            logger.error(f"Error generating batch barcodes with Node.js service: {e}")
            return []
    
    def generate_single_barcode(self, options):
        """
        Generate a single barcode using Node.js service
        
        Args:
            options: Barcode generation options
            
        Returns:
            PIL Image object
        """
        try:
            # Call Node.js service
            response = self.session.post(
                f"{self.node_service_url}/generate-barcode",
                json=options,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                logger.error(f"Node.js service error: {response.status_code} - {response.text}")
                return None
            
            result = response.json()
            
            if not result.get('success'):
                logger.error(f"Node.js service returned error: {result.get('error')}")
                return None
            
            # Convert data URL to PIL Image
            data_url = result.get('dataURL')
            if not data_url:
                logger.error("No dataURL returned from Node.js service")
                return None
            
            # Extract base64 data from data URL
            if data_url.startswith('data:image/png;base64,'):
                base64_data = data_url.split(',')[1]
            else:
                logger.error("Invalid data URL format")
                return None
            
            # Decode base64 and create PIL Image
            image_data = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(image_data))
            
            logger.info(f"Successfully generated single barcode using Node.js service")
            return image
            
        except Exception as e:
            logger.error(f"Error generating single barcode with Node.js service: {e}")
            return None
