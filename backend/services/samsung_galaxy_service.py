"""
Samsung Galaxy S25 Barcode Generation Service
Creates barcodes matching the exact format shown in the reference image
"""

from PIL import Image, ImageDraw, ImageFont
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
import io
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
import random


class SamsungGalaxyService:
    def __init__(self, output_dir: str = "new-format-barcode"):
        self.output_dir = output_dir
        self.create_output_directories()
        
    def create_output_directories(self):
        """Create output directories if they don't exist"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir, exist_ok=True)

    def load_font(self, font_paths: List[str], size: int) -> ImageFont.FreeTypeFont:
        """Load font with fallbacks"""
        for font_path in font_paths:
            try:
                if os.path.exists(font_path):
                    return ImageFont.truetype(font_path, size)
            except Exception:
                continue
        
        # Fallback to default font
        try:
            return ImageFont.truetype("arial.ttf", size)
        except:
            return ImageFont.load_default()

    def generate_code128_barcode(self, data: str, width: int = 400, height: int = 50) -> Image.Image:
        """Generate Code128 barcode"""
        try:
            # Create barcode
            code = Code128(data, writer=ImageWriter())
            
            # Generate barcode image
            barcode_buffer = io.BytesIO()
            code.write(barcode_buffer, options={
                'module_width': width // len(data) if len(data) > 0 else 2,
                'module_height': height,
                'quiet_zone': 6.5,
                'font_size': 0,
                'text_distance': 0,
                'background': 'white',
                'foreground': 'black',
            })
            
            barcode_buffer.seek(0)
            barcode_img = Image.open(barcode_buffer)
            
            # Resize to exact dimensions
            barcode_img = barcode_img.resize((width, height), Image.Resampling.LANCZOS)
            return barcode_img
            
        except Exception as e:
            print(f"Error generating barcode: {e}")
            # Return a placeholder image
            placeholder = Image.new('RGB', (width, height), 'white')
            draw = ImageDraw.Draw(placeholder)
            draw.text((10, 10), f"BARCODE: {data}", fill='black')
            return placeholder

    def generate_qr_code(self, data: str, size: int = 80) -> Image.Image:
        """Generate QR code"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=1,  # Reduced from 4 to 1 for minimal padding
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)
            return qr_img
            
        except Exception as e:
            print(f"Error generating QR code: {e}")
            # Return a placeholder
            placeholder = Image.new('RGB', (size, size), 'white')
            draw = ImageDraw.Draw(placeholder)
            draw.text((5, 5), "QR", fill='black')
            return placeholder

    def generate_samsung_galaxy_barcode(self, 
                                      model: str = "A669L",
                                      color: str = "SAPPHIRE BLACK", 
                                      imei: str = "350544301197847",
                                      vc: str = "874478",
                                      storage: str = "64+2") -> str:
        """
        Generate Samsung Galaxy S25 format barcode matching the reference image exactly
        """
        # Label dimensions (matching reference)
        label_width = 600
        label_height = 250
        
        # Create white background
        label = Image.new('RGB', (label_width, label_height), 'white')
        draw = ImageDraw.Draw(label)
        
        # Font paths
        bold_font_paths = [
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 
            "/System/Library/Fonts/Arial Bold.ttf",
            "fonts/ARIALBD.TTF",
            "ARIALBD.TTF",
        ]
        
        regular_font_paths = [
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Arial.ttf", 
            "arial.ttf",
        ]
        
        # Load fonts
        font_large = self.load_font(bold_font_paths, 30)
        font_medium = self.load_font(bold_font_paths, 20)
        font_small = self.load_font(regular_font_paths, 14)
        font_circle = self.load_font(bold_font_paths, 24)
        
        # --- TOP ROW: Model and Color ---
        x_start = 20
        y_top = 15
        
        # Model (left side)
        draw.text((x_start, y_top), f"Model: {model}", fill='black', font=font_large)
        
        # Color (right side)
        color_text = color.upper()
        color_bbox = draw.textbbox((0, 0), color_text, font=font_large)
        color_width = color_bbox[2] - color_bbox[0]
        x_pos_color = label_width - color_width - 40
        draw.text((x_pos_color, y_top), color_text, fill='black', font=font_large)
        # Color indicator square with "C" (next to color)
        square_size = 40
        # Move the square to the extreme right, with a 20px margin from the right edge
        square_x = label_width - square_size - 4
        square_y = y_top + 1
        draw.rectangle([square_x, square_y, square_x + square_size, square_y + square_size], 
                       outline='black', width=4)
        # Increase the font size for "C" and center it in the square
        font_c_larger = self.load_font(bold_font_paths, 35)
        c_text = "C"
        c_bbox = draw.textbbox((1, 3), c_text, font=font_c_larger)
        c_width = c_bbox[2] - c_bbox[0]
        c_height = c_bbox[3] - c_bbox[1]
        c_x = square_x + (square_size - c_width) // 2
        c_y = square_y + (square_size - c_height) // 2 - 10  # Move "C" up by 3 pixels
        draw.text((c_x, c_y), c_text, fill='black', font=font_c_larger)
        # --- MIDDLE SECTION: Barcodes and IMEI ---
        barcode_width = 400
        barcode_height = 70
        y_barcode = 65

        # Linear barcode (Code128)
        linear_barcode = self.generate_code128_barcode(imei, barcode_width, barcode_height)
        label.paste(linear_barcode, (x_start, y_barcode))

        # IMEI text below barcode with width controls
        y_imei_text = y_barcode + barcode_height + 28
        imei_text = f"IMEI 1:{imei}"
        imei_bbox = draw.textbbox((0, 0), imei_text, font=font_medium)
        imei_text_width = imei_bbox[2] - imei_bbox[0]
        # Center the IMEI text under the barcode, but don't let it overflow barcode area
        imei_x = x_start + max(0, (barcode_width - imei_text_width) // 2)
        draw.text((imei_x, y_imei_text), imei_text, fill='black', font=font_medium)
        # QR Code (extreme right, moved up 1 step)
        qr_size = 150
        qr_x = label_width - qr_size - 2  # Move to extreme right with 20px margin
        qr_y = y_barcode + 2 - (qr_size // 20)  # Move QR code up by 1 step (~18px)
        qr_code = self.generate_qr_code(imei, qr_size)
        label.paste(qr_code, (qr_x, qr_y))
        # --- BOTTOM ROW: VC and Storage ---
        y_bottom = 150
        
        # VC (left side)
        vc_text = f"VC:{vc}"
        draw.text((x_start, y_bottom), vc_text, fill='black', font=font_medium)
        
        # Storage box (center)
        storage_text = storage
        storage_bbox = draw.textbbox((0, 0), storage_text, font=font_medium)
        storage_width = storage_bbox[2] - storage_bbox[0]
        storage_height = storage_bbox[3] - storage_bbox[1]
        
        # Calculate box position (center)
        box_width = storage_width + 20
        box_height = storage_height + 10
        box_x = (label_width - box_width) // 2
        box_y = y_bottom - 2
        
        # Draw storage box
        draw.rectangle([box_x, box_y, box_x + box_width, box_y + box_height], 
                      outline='black', width=2)
        
        # Draw storage text centered in box
        text_x = box_x + (box_width - storage_width) // 2
        text_y = box_y + (box_height - storage_height) // 2
        draw.text((text_x, text_y), storage_text, fill='black', font=font_medium)
        
        # Save the image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"samsung_galaxy_{model}_{timestamp}.png"
        filepath = os.path.join(self.output_dir, filename)
        
        label.save(filepath, 'PNG')
        print(f"✅ Generated Samsung Galaxy barcode: {filename}")
        
        return filepath

    def generate_samsung_galaxy_barcodes_from_excel(self, excel_file_path: str):
        """Generate Samsung Galaxy barcodes from Excel file and create a PDF"""
        import pandas as pd
        import glob
        import shutil
        from datetime import datetime
        
        # Import the barcode service for PDF creation
        from services.barcode_service import BarcodeService
        barcode_service = BarcodeService()
        
        generated_files = []
        
        try:
            df = pd.read_excel(excel_file_path)
            
            # Process each row and generate Samsung Galaxy barcodes
            for index, row in df.iterrows():
                try:
                    # Extract data with flexible column mapping
                    model = str(row.get("Model", row.get("model", "A669L"))).strip()
                    color = str(row.get("Color", row.get("color", "SAPPHIRE BLACK"))).strip()
                    imei = str(row.get("IMEI/sn", row.get("IMEI", row.get("imei", row.get("imei/sn", "350544301197847"))))).strip()
                    vc = str(row.get("VC", row.get("vc", "874478"))).strip()
                    storage = str(row.get("Storage", row.get("storage", "64+2"))).strip()
                    
                    # Generate Samsung Galaxy barcode
                    filepath = self.generate_samsung_galaxy_barcode(
                        model=model,
                        color=color,
                        imei=imei,
                        vc=vc,
                        storage=storage
                    )
                    
                    filename = os.path.basename(filepath)
                    generated_files.append(filename)
                    
                    print(f"Generated Samsung Galaxy barcode {index + 1}: {filename}")
                    
                except Exception as e:
                    print(f"Skipping row {index}: {str(e)}")
                    continue
            
            if not generated_files:
                raise Exception("No Samsung Galaxy barcodes were generated")
            
            # Copy Samsung Galaxy PNG files to downloads/barcodes/ for PDF creation
            downloads_barcodes_dir = "downloads/barcodes"
            os.makedirs(downloads_barcodes_dir, exist_ok=True)
            
            # Clear existing files first
            existing_files = glob.glob(os.path.join(downloads_barcodes_dir, "*.png"))
            for existing_file in existing_files:
                os.remove(existing_file)
            
            # Copy Samsung Galaxy files
            copied_count = 0
            for filename in generated_files:
                source_path = os.path.join(self.output_dir, filename)
                dest_path = os.path.join(downloads_barcodes_dir, filename)
                
                if os.path.exists(source_path):
                    shutil.copy2(source_path, dest_path)
                    copied_count += 1
            
            if copied_count == 0:
                raise Exception("Failed to copy Samsung Galaxy files for PDF creation")
            
            # Create PDF
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            
            pdf_path = barcode_service.create_pdf_from_barcodes(
                pdf_filename=pdf_filename,
                grid_cols=5,
                grid_rows=12
            )
            
            if pdf_path:
                print(f"✅ Created PDF successfully: {pdf_filename}")
                return pdf_filename, session_id
            else:
                raise Exception("PDF creation returned None")
                
        except Exception as e:
            print(f"Error in Samsung Galaxy Excel processing: {str(e)}")
            raise e

    def generate_test_barcodes(self):
        """Generate test barcodes with the exact data from the reference image"""
        test_data = [
            {
                "model": "A669L",
                "color": "SAPPHIRE BLACK", 
                "imei": "350544301197847",
                "vc": "874478",
                "storage": "64+2"
            },
            {
                "model": "A669L",
                "color": "MISTY VIOLET",
                "imei": "350544301197848", 
                "vc": "874479",
                "storage": "128+4"
            },
            {
                "model": "A669L",
                "color": "FOREST GREEN",
                "imei": "350544301197849",
                "vc": "874480", 
                "storage": "256+8"
            }
        ]
        
        generated_files = []
        for i, data in enumerate(test_data):
            filepath = self.generate_samsung_galaxy_barcode(**data)
            generated_files.append(filepath)
            print(f"📱 Generated test barcode {i+1}/3: {os.path.basename(filepath)}")
        
        return generated_files


if __name__ == "__main__":
    # Test the service
    service = SamsungGalaxyService()
    print("🚀 Testing Samsung Galaxy S25 Barcode Generation...")
    
    # Generate test barcodes
    files = service.generate_test_barcodes()
    
    print(f"\n✅ Generated {len(files)} test barcodes in '{service.output_dir}' folder")
    print("📁 Check the 'new-format-barcode' folder for the generated PNG files")
