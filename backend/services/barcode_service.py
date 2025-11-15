"""
Barcode Generation Service for API
Copied and adapted from MAIN.PY
"""

import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
import io
import os
import shutil
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
import glob
from typing import List, Optional, Dict, Any, Set
import csv
import random
import aiofiles
import asyncio
import json
from services.archive_manager import ArchiveManager
from services.node_barcode_service import NodeBarcodeService
from models.database import BarcodeRecord
from models.template import TemplateManager


class BarcodeService:
    def __init__(self, output_dir: str = None, pdf_dir: str = None, logs_dir: str = None):
        # Use environment variables if available, otherwise use defaults
        # This ensures compatibility with both Docker (/app/...) and VPS deployments
        download_base = os.getenv("DOWNLOAD_DIR", "downloads")
        logs_base = os.getenv("LOGS_DIR", "logs")
        
        self.output_dir = output_dir or os.path.join(download_base, "barcodes")
        self.pdf_dir = pdf_dir or os.path.join(download_base, "pdfs")
        self.logs_dir = logs_dir or logs_base
        self.imei_log_file = os.path.join(self.logs_dir, "imei_log.csv")
        self.archive_manager = ArchiveManager()
        self.node_barcode_service = NodeBarcodeService()
        self.create_output_directories()
        
    def create_output_directories(self):
        """Create output directories if they don't exist with proper permissions"""
        for directory in [self.output_dir, self.pdf_dir, self.logs_dir]:
            try:
                if not os.path.exists(directory):
                    os.makedirs(directory, exist_ok=True, mode=0o755)
                    print(f"✅ Created directory: {directory}")
                else:
                    # Ensure directory is writable
                    if not os.access(directory, os.W_OK):
                        print(f"⚠️  Warning: Directory exists but is not writable: {directory}")
                        try:
                            os.chmod(directory, 0o755)
                            print(f"✅ Fixed permissions for directory: {directory}")
                        except Exception as e:
                            print(f"❌ Could not fix permissions for {directory}: {e}")
            except Exception as e:
                print(f"❌ Error creating directory {directory}: {e}")
                import traceback
                print(traceback.format_exc())

    def archive_existing_files(self, file_metadata: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Archive existing files to timestamped folders instead of deleting them"""
        print("📦 Archiving existing files...")
        
        try:
            # Check if there are any files to archive
            png_files = glob.glob(os.path.join(self.output_dir, "*.png"))
            pdf_files = glob.glob(os.path.join(self.pdf_dir, "*.pdf"))
            
            print(f"📁 Found {len(png_files)} PNG files and {len(pdf_files)} PDF files to archive")
            
            if not png_files and not pdf_files:
                print("✅ No files to archive - directories are already clean")
                return {
                    "session_id": None,
                    "archived_files": [],
                    "total_files": 0,
                    "png_count": 0,
                    "pdf_count": 0,
                    "total_size": 0
                }
            
            # Quick archive: just move files to timestamped folder
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            archive_dir = f"archives/session_{timestamp}"
            
            # Create archive directory
            os.makedirs(archive_dir, exist_ok=True)
            
            archived_files = []
            total_size = 0
            
            # Move PNG files
            for png_file in png_files:
                try:
                    filename = os.path.basename(png_file)
                    archive_path = os.path.join(archive_dir, filename)
                    # Use shutil.move() instead of os.rename() to handle cross-device moves
                    # This works when source and destination are on different filesystems (e.g., Docker volumes)
                    shutil.move(png_file, archive_path)
                    archived_files.append(filename)
                    total_size += os.path.getsize(archive_path)
                    print(f"📦 Archived: {filename}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not archive {png_file}: {e}")
            
            # Move PDF files
            for pdf_file in pdf_files:
                try:
                    filename = os.path.basename(pdf_file)
                    archive_path = os.path.join(archive_dir, filename)
                    # Use shutil.move() instead of os.rename() to handle cross-device moves
                    # This works when source and destination are on different filesystems (e.g., Docker volumes)
                    shutil.move(pdf_file, archive_path)
                    archived_files.append(filename)
                    total_size += os.path.getsize(archive_path)
                    print(f"📦 Archived: {filename}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not archive {pdf_file}: {e}")
            
            print(f"✨ Archive completed! Archived {len(archived_files)} files ({total_size} bytes)")
            return {
                "session_id": f"session_{timestamp}",
                "archived_files": archived_files,
                "total_files": len(archived_files),
                "png_count": len(png_files),
                "pdf_count": len(pdf_files),
                "total_size": total_size
            }
            
        except Exception as e:
            print(f"⚠️ Warning: Archive process failed: {e}")
            print("🔄 Continuing with barcode generation...")
            return {
                "session_id": None,
                "archived_files": [],
                "total_files": 0,
                "png_count": 0,
                "pdf_count": 0,
                "total_size": 0
            }

    # ---------------- IMEI2 utilities -----------------
    def _load_used_imeis(self) -> Set[str]:
        used: Set[str] = set()
        if os.path.exists(self.imei_log_file):
            try:
                with open(self.imei_log_file, "r", newline="") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        val = str(row.get("IMEI2", ""))
                        if val:
                            used.add(val)
            except Exception:
                pass
        return used

    def _append_imei_log(self, imei: str, imei2: str) -> None:
        file_exists = os.path.exists(self.imei_log_file)
        try:
            with open(self.imei_log_file, "a", newline="") as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(["IMEI", "IMEI2"])  # header
                writer.writerow([imei, imei2])
        except Exception:
            pass

    def generate_unique_imei(self, base_imei: str, used_set: Set[str]) -> str:
        prefix = str(base_imei)[:8]
        while True:
            suffix = str(random.randint(10**6, 10**7 - 1)).zfill(7)
            candidate = prefix + suffix
            if candidate not in used_set:
                used_set.add(candidate)
                return candidate
    
    def extract_color_from_product(self, product_string: str) -> str:
        """Extract color from product string like 'SMART 8 64+3 SHINY GOLD'"""
        if not product_string or product_string == 'nan':
            return 'Unknown Color'
        
        # Split the product string into parts
        parts = str(product_string).strip().split()
        
        if len(parts) < 2:
            return 'Unknown Color'
        
        # Look for the last part that contains a '+' (storage spec like +3, +8, +256)
        # The color should be everything after the storage specification
        color_start_index = 0
        
        for i, part in enumerate(parts):
            if '+' in part and any(char.isdigit() for char in part):
                # Found storage spec, color starts after this
                color_start_index = i + 1
                break
        
        # If we found a storage spec, extract everything after it as color
        if color_start_index > 0 and color_start_index < len(parts):
            color_parts = parts[color_start_index:]
            color = ' '.join(color_parts)
            return color.upper() if color else 'Unknown Color'
        
        # Fallback: if no storage spec found, assume last 1-2 words are color
        if len(parts) >= 2:
            # Try last 2 words first (for colors like "SLEEK BLACK")
            color = ' '.join(parts[-2:])
            return color.upper()
        else:
            return 'Unknown Color'
    
    def generate_qr_code(self, data: str, size: tuple = (100, 100)) -> Image.Image:
        """Generate QR code for given data"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=3,
            border=1,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img = qr_img.resize(size, Image.Resampling.LANCZOS)
        return qr_img
    
    def generate_code128_barcode(self, data: str, width: int = 200, height: int = 50) -> Image.Image:
        """Generate Code128 barcode for IMEI without text"""
        # Create barcode with writer options to exclude text
        code128 = Code128(data, writer=ImageWriter())
        
        # Generate barcode image in memory with options to remove text and make less bold
        buffer = io.BytesIO()
        options = {
            'write_text': False,  # Don't write text under barcode
            'quiet_zone': 0,      # No quiet zone
            'module_width': 0.15,  # Make bars even thinner (lighter)
            'module_height': 12,  # Adjust height for lighter bars
        }
        code128.write(buffer, options=options)
        buffer.seek(0)
        
        # Open and resize the image
        try:
            barcode_img = Image.open(buffer)
            barcode_img = barcode_img.resize((width, height), Image.Resampling.LANCZOS)
            return barcode_img
        finally:
            # Clean up buffer to free memory
            buffer.close()
    
    def create_barcode_label(self, imei: str, model: str, color: str, dn: str, 
                           box_id: Optional[str] = None, brand: str = "Infinix", second_label: str = "Box ID") -> Image.Image:
        """Create a clean, perfectly aligned barcode label matching the reference image."""
        
        # Dimensions to match the reference image layout
        label_width = 650
        label_height = 350  # Increased to accommodate all elements without cutoff 
        
        label = Image.new('RGB', (label_width, label_height), 'white')
        draw = ImageDraw.Draw(label)
        
        # Font loading with production-ready fallbacks
        def load_font(font_paths, size):
            """Try multiple font paths and return the first one that works"""
            for font_path in font_paths:
                try:
                    return ImageFont.truetype(font_path, size)
                except (OSError, IOError):
                    continue
            return ImageFont.load_default()
        
        # Define font paths for different environments
        bold_font_paths = [
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",  # Linux production
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux alternative
            "/System/Library/Fonts/Arial Bold.ttf",  # macOS
            "ARIALBD.TTF",  # Local development
        ]
        
        regular_font_paths = [
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",  # Linux production
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux alternative
            "/System/Library/Fonts/Arial.ttf",  # macOS
            "arial.ttf",  # Local development
        ]
        
        # Load fonts with fallbacks
        font_large = load_font(bold_font_paths, 40)
        font_medium = load_font(bold_font_paths, 20)
        font_circle = load_font(bold_font_paths, 40)
        font_regular = load_font(regular_font_paths, 18)

        # --- Top Text (Model and Color) - Match reference layout ---
        x_start = 30
        y_top = 15  # Slightly higher positioning
        
        # Draw model (left side)
        draw.text((x_start, y_top), model, fill='black', font=font_large)
        
        # Draw color (right side, aligned with model)
        color_text = color.upper()
        color_bbox = draw.textbbox((0, 0), color_text, font=font_large)
        color_width = color_bbox[2] - color_bbox[0]
        x_pos_color = label_width - color_width - 60  # Right-aligned
        draw.text((x_pos_color, y_top), color_text, fill='black', font=font_large)

        # --- Barcodes and Text - Match reference positioning exactly ---
        barcode_width = 460
        barcode_height = 60
        
        # 1. First Barcode (IMEI)
        y_pos = 70  # Start position for first barcode
        imei_barcode_img = None
        try:
            imei_barcode_img = self.generate_code128_barcode(imei, width=barcode_width, height=barcode_height)
            label.paste(imei_barcode_img, (x_start, y_pos))
        finally:
            # Clean up barcode image after pasting
            if imei_barcode_img is not None:
                imei_barcode_img.close()
                del imei_barcode_img
        
        # IMEI label directly under barcode - scale to fit barcode width
        y_pos += barcode_height + 8  # Move y_pos below the barcode
        
        # Split text: "IMEI" (bold) and the number (regular)
        imei_label = "IMEI"
        imei_number = imei
        
        # Calculate font size to fit barcode width
        test_font = font_medium
        full_text = f"{imei_label} {imei_number}"
        text_bbox = draw.textbbox((0, 0), full_text, font=test_font)
        text_width = text_bbox[2] - text_bbox[0]
        
        # Scale font size to fit barcode width
        if text_width < barcode_width:
            scale_factor = barcode_width / text_width
            new_font_size = int(16 * scale_factor)
            try:
                # Bold font for "IMEI"
                bold_font = load_font(bold_font_paths, new_font_size)
                # Regular font for the number
                regular_font = load_font(regular_font_paths, new_font_size)
            except:
                bold_font = font_medium
                regular_font = font_regular
        else:
            bold_font = font_medium
            regular_font = font_regular
        
        # Draw the complete IMEI text as one unit and stretch to match barcode width
        full_imei_text = f"{imei_label} {imei_number}"
        
        # Create a temporary image to render the complete text
        temp_img = None
        try:
            temp_img = Image.new('RGBA', (int(barcode_width * 2), 50), (0, 0, 0, 0))
            temp_draw = ImageDraw.Draw(temp_img)
            
            # Render the complete text with mixed formatting
            # First draw "IMEI" in bold
            temp_draw.text((0, 10), imei_label, fill='black', font=bold_font)
            # Then draw the number in regular font after "IMEI"
            imei_bbox = temp_draw.textbbox((0, 10), imei_label, font=bold_font)
            imei_width = imei_bbox[2] - imei_bbox[0]
            number_x = imei_width + 5  # Small space between "IMEI" and number
            temp_draw.text((number_x, 10), imei_number, fill='black', font=regular_font)
            
            # Get the complete text bounds
            full_bbox = temp_draw.textbbox((0, 10), full_imei_text, font=bold_font)
            text_w = full_bbox[2] - full_bbox[0]
            text_h = full_bbox[3] - full_bbox[1]
            
            # Crop to actual text bounds
            cropped = temp_img.crop((0, full_bbox[1], text_w, full_bbox[3]))
            # Stretch to fill barcode width
            stretched_img = cropped.resize((int(barcode_width), text_h), Image.Resampling.LANCZOS)
            label.paste(stretched_img, (int(x_start), int(y_pos)), mask=stretched_img)
        finally:
            # Clean up temporary images to free memory
            if temp_img is not None:
                temp_img.close()
                del temp_img
            if 'cropped' in locals():
                cropped.close()
                del cropped
            if 'stretched_img' in locals():
                stretched_img.close()
                del stretched_img
        
        # 2. Second Barcode (Box ID or IMEI2)
        if box_id:
            y_pos += 35  # Add vertical space for the next barcode
            box_barcode_img = None
            try:
                box_barcode_img = self.generate_code128_barcode(box_id, width=barcode_width, height=barcode_height)
                label.paste(box_barcode_img, (x_start, y_pos))
            finally:
                # Clean up barcode image after pasting
                if box_barcode_img is not None:
                    box_barcode_img.close()
                    del box_barcode_img
            
            # Second label directly under barcode - scale to fit barcode width
            y_pos += barcode_height + 8  # Move y_pos below the barcode
            
            # Split text: second_label (bold) and the number (Arial)
            box_label = second_label
            box_number = box_id
            
            # Calculate font size to fit barcode width
            test_font = font_medium
            full_text = f"{box_label} {box_number}"
            text_bbox = draw.textbbox((0, 0), full_text, font=test_font)
            text_width = text_bbox[2] - text_bbox[0]
            
            # Scale font size to fit barcode width
            if text_width < barcode_width:
                scale_factor = barcode_width / text_width
                new_font_size = int(16 * scale_factor)
                try:
                    # Bold font for "Box ID"
                    bold_font = load_font(bold_font_paths, new_font_size)
                    # Regular Arial for the number
                    number_font = load_font(regular_font_paths, new_font_size)
                except:
                    bold_font = font_medium
                    number_font = font_regular
            else:
                bold_font = font_medium
                number_font = font_medium
            
            # Draw the complete second label text as one unit and stretch to match barcode width
            full_second_text = f"{box_label} {box_number}"
            
            # Create a temporary image to render the complete text
            temp_img2 = None
            try:
                temp_img2 = Image.new('RGBA', (int(barcode_width * 2), 50), (0, 0, 0, 0))
                temp_draw = ImageDraw.Draw(temp_img2)
                
                # Render the complete text with mixed formatting
                # First draw the label in bold
                temp_draw.text((0, 10), box_label, fill='black', font=bold_font)
                # Then draw the number in regular font after the label
                box_bbox = temp_draw.textbbox((0, 10), box_label, font=bold_font)
                box_width = box_bbox[2] - box_bbox[0]
                number_x = box_width + 5  # Small space between label and number
                temp_draw.text((number_x, 10), box_number, fill='black', font=number_font)
                
                # Get the complete text bounds
                full_bbox = temp_draw.textbbox((0, 10), full_second_text, font=bold_font)
                text_w = full_bbox[2] - full_bbox[0]
                text_h = full_bbox[3] - full_bbox[1]
                
                # Crop to actual text bounds
                cropped2 = temp_img2.crop((0, full_bbox[1], text_w, full_bbox[3]))
                # Stretch to fill barcode width
                stretched_img2 = cropped2.resize((int(barcode_width), text_h), Image.Resampling.LANCZOS)
                label.paste(stretched_img2, (int(x_start), int(y_pos)), mask=stretched_img2)
            finally:
                # Clean up temporary images to free memory
                if temp_img2 is not None:
                    temp_img2.close()
                    del temp_img2
                if 'cropped2' in locals():
                    cropped2.close()
                    del cropped2
                if 'stretched_img2' in locals():
                    stretched_img2.close()
                    del stretched_img2
            
            # D/N Text - positioned directly below second barcode
            # Match the number font (regular Arial) and size used for IMEI/second number
            y_pos += 30  # Add space below label
            dn_label_text = "D/N:"
            # Use bold for label, same as other labels
            draw.text((x_start, y_pos), dn_label_text, fill='black', font=bold_font)
            # Position the value immediately after label
            dn_label_bbox = draw.textbbox((0, 0), dn_label_text, font=bold_font)
            dn_label_width = dn_label_bbox[2] - dn_label_bbox[0]
            dn_value_x = x_start + dn_label_width + 5
            # Use stretched_number_font if available (computed for second barcode), otherwise fall back to number_font or regular_font
            dn_value_font = 'stretched_number_font' in locals() and stretched_number_font or ('number_font' in locals() and number_font or font_regular)
            draw.text((dn_value_x, y_pos), str(dn), fill='black', font=dn_value_font)

        # --- QR Code and Circled 'A' - Match reference positioning exactly ---
        qr_size = 150
        qr_data = imei  # Only IMEI data in QR code
        qr_code_img = self.generate_qr_code(qr_data, size=(qr_size, qr_size))
        
        # Position QR code on the right side, aligned with first barcode
        qr_x_pos = label_width - qr_size - 0
        qr_y_pos = 65  # Align with first barcode
        label.paste(qr_code_img, (qr_x_pos, qr_y_pos))

        # Circled 'A' - positioned below QR code, aligned with bottom barcode
        circle_diameter = 60
        circle_x_center = 520 + (qr_size / 2) + 15 # Perfectly centered under QR code
        circle_y_center = 280  # Moved down to fit within increased height

        
        # Draw circle outline with precise positioning
        circle_left = circle_x_center - circle_diameter / 2
        circle_top = circle_y_center - circle_diameter / 2
        circle_right = circle_x_center + circle_diameter / 2
        circle_bottom = circle_y_center + circle_diameter / 2
        
        circle_bbox_coords = [circle_left, circle_top, circle_right, circle_bottom]
        draw.ellipse(circle_bbox_coords, outline='black', width=5)
        
        # Center the 'A' perfectly in the circle using textanchor
        a_bbox = draw.textbbox((0, 0), "A", font=font_circle)
        a_width = a_bbox[3] - a_bbox[1]
        a_height = a_bbox[3] - a_bbox[0]
        
        # Calculate exact center position for the 'A' within the circle
        # Account for PIL's text positioning quirks
        a_x = circle_x_center - a_width / 2
        a_y = circle_y_center - a_height / 2 - 3  # Increased adjustment for better centering
        
        # Draw the 'A' at the calculated center position
        draw.text((a_x, a_y), "A", fill='black', font=font_circle)
        
        return label
    
    def _normalize_column_name(self, columns: List[str], possible_names: List[str]) -> Optional[str]:
        """Find the best matching column name from a list of possible names"""
        columns_lower = [col.lower().strip() for col in columns]
        
        for possible_name in possible_names:
            possible_lower = possible_name.lower().strip()
            for i, col_lower in enumerate(columns_lower):
                if possible_lower in col_lower or col_lower in possible_lower:
                    return columns[i]
        
        return None

    def _determine_barcode_type(self, device_type: Optional[str]) -> str:
        """Determine barcode type based on device type"""
        if not device_type:
            return "default"  # Default barcode type for backward compatibility
        
        # Device-specific barcode type mapping
        # This will be expanded later based on specific barcode images you provide
        device_barcode_mapping = {
            # General Phone types - all map to IMEI-based barcodes
            "phone": "imei_based",
            "phone_android": "imei_based",
            "phone_ios": "imei_based", 
            "phone_basic": "imei_based",
            "phone_foldable": "imei_based",
            "phone_gaming": "imei_based",
            
            # Samsung Galaxy Series (Popular in Uganda)
            "samsung_galaxy_s25": "imei_based",
            "samsung_galaxy_a56": "imei_based",
            "samsung_galaxy_a06": "imei_based",
            "samsung_galaxy_a15": "imei_based",
            "samsung_galaxy_a25": "imei_based",
            
            # Tecno Series (Very Popular in Uganda)
            "tecno_phantom_x2_pro": "imei_based",
            "tecno_spark_40": "imei_based",
            "tecno_pova_6": "imei_based",
            "tecno_camon_30": "imei_based",
            "tecno_spark_go": "imei_based",
            "tecno_bg6_m": "imei_based",
            
            # Infinix Series (Popular in Uganda)
            "infinix_hot_50i": "imei_based",
            "infinix_smart_9": "imei_based",
            "infinix_note_40": "imei_based",
            "infinix_zero_30": "imei_based",
            "infinix_hot_12": "imei_based",
            
            # Xiaomi Redmi Series (Growing popularity in Uganda)
            "xiaomi_redmi_note_14": "imei_based",
            "xiaomi_redmi_14c": "imei_based",
            "xiaomi_redmi_13c": "imei_based",
            "xiaomi_redmi_note_13": "imei_based",
            
            # Itel Series (Very Popular in Uganda)
            "itel_vision_7_plus": "imei_based",
            "itel_p65": "imei_based",
            "itel_a90": "imei_based",
            "itel_a06": "imei_based",
            "itel_s23": "imei_based",
            
            # Apple iPhone Series (Premium market in Uganda)
            "iphone_14_pro_max": "imei_based",
            "iphone_15": "imei_based",
            "iphone_15_pro": "imei_based",
            "iphone_13": "imei_based",
            "iphone_se": "imei_based",
            
            # OnePlus Series (Premium Android)
            "oneplus_13r": "imei_based",
            "oneplus_nord_3": "imei_based",
            
            # Google Pixel Series
            "google_pixel_7a": "imei_based",
            "google_pixel_8": "imei_based",
            
            # Tablet types - all map to serial-based barcodes
            "tablet": "serial_based",
            "tablet_android": "serial_based",
            "tablet_ios": "serial_based",
            
            # Laptop types - all map to product-based barcodes
            "laptop": "product_based",
            "laptop_gaming": "product_based",
            "laptop_business": "product_based",
            
            # Watch types - all map to serial-based barcodes
            "watch": "serial_based",
            "watch_smart": "serial_based",
            "watch_fitness": "serial_based",
            
            # Headphone types - all map to serial-based barcodes
            "headphones": "serial_based",
            "headphones_wireless": "serial_based",
            "headphones_earbuds": "serial_based",
            
            # Speaker types - all map to serial-based barcodes
            "speaker": "serial_based",
            "speaker_bluetooth": "serial_based",
            "speaker_smart": "serial_based",
            
            # Camera types - all map to serial-based barcodes
            "camera": "serial_based",
            "camera_dslr": "serial_based",
            "camera_action": "serial_based",
            
            # Gaming console types - all map to product-based barcodes
            "gaming_console": "product_based",
            "gaming_handheld": "product_based",
            
            # TV types - all map to product-based barcodes
            "smart_tv": "product_based",
            "tv_4k": "product_based",
            "tv_streaming": "product_based",
            
            # Router types - all map to serial-based barcodes
            "router": "serial_based",
            "router_wifi": "serial_based",
            "router_mesh": "serial_based",
            
            # Other devices
            "other": "default"
        }
        
        return device_barcode_mapping.get(device_type.lower(), "default")

    async def generate_barcodes_from_data(self, items: List[Any], auto_generate_second_imei: bool = True, device_type: Optional[str] = None, device_id: Optional[int] = None) -> List[str]:
        """Generate barcodes from list of data items with optional device-specific generation"""
        # Convert BarcodeItem objects to dictionaries if needed
        if items and hasattr(items[0], 'dict'):
            # Items are Pydantic models, convert to dicts
            items = [item.dict() for item in items]
            print(f"🔄 Converted {len(items)} BarcodeItem objects to dictionaries in generate_barcodes_from_data")
        
        # Archive existing files before generating new ones (but don't archive files we're about to create)
        # Only archive if output directory has files from previous sessions
        archive_result = self.archive_existing_files(file_metadata=items)
        print(f"📦 Archive result: {archive_result.get('total_files', 0)} files archived")
        
        # Create a consistent generation session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Determine barcode type based on device type
        barcode_type = self._determine_barcode_type(device_type)
        print(f"🎯 Device Type: {device_type or 'Default'}")
        print(f"🎯 Barcode Type: {barcode_type}")
        
        generated_files = []
        used_imeis = self._load_used_imeis() if auto_generate_second_imei else set()
        
        # Get column names from first item for flexible mapping
        if items:
            print(f"🔍 First item type: {type(items[0])}")
            print(f"🔍 First item: {items[0]}")
            if hasattr(items[0], 'keys'):
                columns = list(items[0].keys())
            else:
                print(f"❌ Item does not have keys() method, converting to dict")
                items[0] = items[0].dict() if hasattr(items[0], 'dict') else dict(items[0])
            columns = list(items[0].keys())
            print(f"🔍 Available columns: {columns}")
            
            # Map flexible column names - expanded to handle more variations
            imei_col = self._normalize_column_name(columns, [
                'imei', 'imei/sn', 'imei_sn', 'serial', 'serial_number', 'sn', 'serial_no',
                'device_id', 'device_imei', 'phone_imei', 'mobile_imei', 'imei_number'
            ])
            model_col = self._normalize_column_name(columns, [
                'model', 'model_name', 'device_model', 'phone_model', 'mobile_model',
                'device_type', 'product_model', 'model_code'
            ])
            product_col = self._normalize_column_name(columns, [
                'product', 'product_name', 'device', 'device_name', 'phone_name',
                'mobile_name', 'product_description', 'item_name'
            ])
            color_col = self._normalize_column_name(columns, [
                'color', 'colour', 'device_color', 'phone_color', 'mobile_color',
                'color_name', 'finish', 'variant'
            ])
            dn_col = self._normalize_column_name(columns, [
                'dn', 'd/n', 'device_number', 'device_no', 'part_number',
                'part_no', 'sku', 'item_number'
            ])
            box_id_col = self._normalize_column_name(columns, [
                'box_id', 'boxid', 'box_number', 'box_no', 'package_id',
                'package_number', 'carton_id', 'container_id'
            ])
            
            print(f"🎯 Column mapping:")
            print(f"   IMEI: {imei_col}")
            print(f"   Model: {model_col}")
            print(f"   Product: {product_col}")
            print(f"   Color: {color_col}")
            print(f"   D/N: {dn_col}")
            print(f"   Box ID: {box_id_col}")
            
            # If no IMEI column found, try to use the first column or generate IMEIs
            if not imei_col:
                print("⚠️  No IMEI column found. Available columns:")
                for i, col in enumerate(columns):
                    print(f"   {i}: {col}")
                
                # Try to use the first column as IMEI if it looks like a number
                if columns:
                    first_col = columns[0]
                    print(f"🔄 Attempting to use first column '{first_col}' as IMEI...")
                    imei_col = first_col
        
        print(f"🔄 Starting barcode generation for {len(items)} items...")
        
        for index, item in enumerate(items):
            try:
                print(f"📝 Processing item {index + 1}/{len(items)}")
                
                # Extract data from item using flexible column mapping
                imei = str(item.get(imei_col, '')) if imei_col else str(item.get('imei', ''))
                box_id = str(item.get(box_id_col, '')) if box_id_col and item.get(box_id_col) else str(item.get('box_id', '')) if item.get('box_id') else None
                model = str(item.get(model_col, 'Unknown')) if model_col else str(item.get('model', 'Unknown'))
                
                print(f"🔍 Item {index + 1} data: IMEI='{imei}', Model='{model}', BoxID='{box_id}'")
                
                # Extract color from Product column if available, otherwise use color column
                product_string = str(item.get(product_col, '')) if product_col else str(item.get('product', '')) if item.get('product') else ''
                if product_string and product_string != 'nan':
                    color = self.extract_color_from_product(product_string)
                else:
                    color = str(item.get(color_col, 'Unknown Color')) if color_col else str(item.get('color', 'Unknown Color'))
                
                dn = str(item.get(dn_col, 'M8N7')) if dn_col else str(item.get('dn', 'M8N7'))
                
                print(f"🎨 Item {index + 1} styling: Color='{color}', DN='{dn}'")
                
                # Validate IMEI - use original value as-is without cleaning
                if not imei or imei.lower() in ['nan', 'none', 'null', '']:
                    print(f"⚠️ Skipping item {index + 1}: No IMEI found (value: '{imei}')")
                    continue
                
                # Use the original IMEI exactly as it appears in Excel - no cleaning
                imei = str(imei).strip()
                
                # Only validate length, don't modify the IMEI
                if len(imei) < 5:  # Reduced minimum length to be more flexible
                    print(f"⚠️ Skipping item {index + 1}: IMEI too short ({len(imei)} characters): '{imei}'")
                    continue
                
                print(f"✅ Item {index + 1} IMEI validated: '{imei}'")
                
                # Determine second barcode value and label
                second_value = box_id
                second_label = "Box ID"
                if auto_generate_second_imei:
                    # Prefer existing IMEI2 if provided
                    imei2 = str(item.get('imei2', '')) if item.get('imei2') else None
                    if not imei2:
                        print(f"🔄 Generating unique IMEI2 for item {index + 1}")
                        imei2 = self.generate_unique_imei(imei, used_imeis)
                    second_value = imei2
                    second_label = "IMEI"
                    print(f"📱 Item {index + 1} second barcode: '{second_value}' ({second_label})")

                print(f"🎨 Creating barcode label for item {index + 1}...")
                
                # Generate barcode label
                label = self.create_barcode_label(
                    imei=imei,
                    box_id=second_value,
                    model=model,
                    color=color,
                    dn=dn,
                    second_label=second_label
                )
                
                print(f"💾 Saving barcode label for item {index + 1}...")
                
                # Save the label
                filename = f"barcode_label_{imei}_{index+1}.png"
                filepath = os.path.join(self.output_dir, filename)
                label.save(filepath, 'PNG', dpi=(300, 300))
                
                # Clean up label image after saving
                label.close()
                del label
                
                print(f"💾 Saving barcode record to database for item {index + 1}...")
                
                # Save barcode details immediately to database
                file_size = os.path.getsize(filepath)
                record = BarcodeRecord(
                    filename=filename,
                    file_path=filepath,
                    archive_path=filepath,  # Will be updated when archived
                    file_type="png",
                    file_size=file_size,
                    created_at=datetime.now().isoformat(),
                    archived_at=datetime.now().isoformat(),
                    generation_session=session_id,
                    imei=imei,
                    box_id=second_value,
                    model=model,
                    product=product_string,
                    color=color,
                    dn=dn
                )
                
                print(f"🔍 Attempting database save for {filename}...")
                try:
                    record_id = self.archive_manager.db_manager.insert_barcode_record(record)
                    print(f"✅ Saved barcode {filename} to database (ID: {record_id})")
                except Exception as db_error:
                    print(f"❌ Database save failed: {db_error}")
                    print(f"❌ Error type: {type(db_error).__name__}")
                    import traceback
                    print(f"❌ Traceback: {traceback.format_exc()}")
                    print("🔄 Continuing with file generation...")
                    record_id = None
                
                # Verify file was actually created before adding to list
                if os.path.exists(filepath):
                    generated_files.append(filename)
                    print(f"✅ Generated barcode {index + 1}/{len(items)}: {filename} (verified on disk)")
                else:
                    print(f"❌ ERROR: File {filename} was not created at {filepath}")
                    print(f"❌ File path exists: {os.path.exists(os.path.dirname(filepath))}")
                    print(f"❌ Output directory: {self.output_dir}")

                # Append to IMEI log if we generated a second IMEI
                if auto_generate_second_imei and second_value:
                    try:
                        self._append_imei_log(imei, second_value)
                    except Exception as e:
                        print(f"⚠️ Warning: Could not append to IMEI log: {e}")
                
            except Exception as e:
                print(f"❌ Error generating barcode for item {index + 1}: {e}")
                import traceback
                print(f"❌ Traceback: {traceback.format_exc()}")
                continue
        
        print(f"🎉 Barcode generation completed! Generated {len(generated_files)} files")
        
        # Final memory cleanup after generation
        import gc
        gc.collect()
        print(f"🧹 Final garbage collection completed after barcode generation")
        
        return generated_files, session_id
    
    async def generate_barcodes_from_excel(self, file_path: str) -> tuple[List[str], str]:
        """Generate barcodes from Excel file"""
        # Archive existing files before generating new ones
        archive_result = self.archive_existing_files()
        
        # Create a consistent generation session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Debug: Print column names and first few rows
            print(f"📊 Excel file columns: {list(df.columns)}")
            print(f"📊 Excel file shape: {df.shape}")
            print(f"📊 First 3 rows:")
            print(df.head(3).to_string())
            
            items = df.to_dict('records')
            return await self.generate_barcodes_from_data(items)
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            return [], f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    async def generate_barcodes_from_template_and_excel(self, template_id: str, excel_file_path: str) -> tuple[List[str], str]:
        """Generate barcodes using a saved template and Excel data"""
        print(f"🎨 TEMPLATE SERVICE: Starting template-based generation")
        print(f"🎨 TEMPLATE SERVICE: template_id = '{template_id}'")
        print(f"🎨 TEMPLATE SERVICE: excel_file_path = '{excel_file_path}'")
        
        # Archive existing files before generating new ones
        archive_result = self.archive_existing_files()
        print(f"🎨 TEMPLATE SERVICE: Archive result: {archive_result.get('total_files', 0)} files archived")
        
        # Create a consistent generation session ID
        session_id = f"template_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"🎨 TEMPLATE SERVICE: Session ID: {session_id}")
        
        try:
            # Load template
            print(f"🎨 TEMPLATE SERVICE: Loading template with ID: '{template_id}'")
            template_manager = TemplateManager()
            template = template_manager.get_template(template_id)
            
            if not template:
                error_msg = f"Template {template_id} not found"
                print(f"❌ TEMPLATE SERVICE ERROR: {error_msg}")
                raise Exception(error_msg)
            
            print(f"✅ TEMPLATE SERVICE: Template loaded successfully!")
            print(f"✅ TEMPLATE SERVICE: Template name: '{template.name}'")
            print(f"✅ TEMPLATE SERVICE: Template ID: '{template.id}'")
            print(f"✅ TEMPLATE SERVICE: Template components count: {len(template.components)}")
            print(f"✅ TEMPLATE SERVICE: Template canvas: {template.canvas_width}x{template.canvas_height}")
            
            # Log first few components for debugging
            if template.components:
                print(f"🎨 TEMPLATE SERVICE: First 3 components:")
                for i, comp in enumerate(template.components[:3]):
                    comp_type = getattr(comp, 'type', 'unknown')
                    comp_id = getattr(comp, 'id', 'unknown')
                    print(f"   [{i+1}] Type: {comp_type}, ID: {comp_id}")
            
            # Read Excel file
            print(f"🎨 TEMPLATE SERVICE: Reading Excel file: {excel_file_path}")
            df = pd.read_excel(excel_file_path)
            items = df.to_dict('records')
            
            print(f"✅ TEMPLATE SERVICE: Excel file read successfully")
            print(f"✅ TEMPLATE SERVICE: Excel columns: {list(df.columns)}")
            print(f"✅ TEMPLATE SERVICE: Excel rows count: {len(items)}")
            print(f"✅ TEMPLATE SERVICE: Processing {len(items)} items with template '{template.name}' (ID: {template_id})")
            
            generated_files = []
            
            # Log initial setup once
            print(f"🎨 TEMPLATE SERVICE: Output dir: {self.output_dir}")
            print(f"🎨 TEMPLATE SERVICE: Output dir exists: {os.path.exists(self.output_dir)}")
            if not os.path.exists(self.output_dir):
                os.makedirs(self.output_dir, exist_ok=True, mode=0o755)
            
            # Create a reusable renderer to avoid memory accumulation
            # Convert template to dict for renderer initialization
            if hasattr(template, 'model_dump'):
                template_dict = template.model_dump()
            elif hasattr(template, 'dict'):
                template_dict = template.dict()
            else:
                template_dict = template
            
            from .python_canvas_renderer import PythonCanvasRenderer
            reusable_renderer = PythonCanvasRenderer(
                canvas_width=template_dict.get('canvas_width', 800),
                canvas_height=template_dict.get('canvas_height', 600),
                background_color=template_dict.get('background_color', '#ffffff'),
                scale_factor=1.0
            )
            print(f"✅ TEMPLATE SERVICE: Created reusable renderer to prevent memory accumulation")
            
            # Progress tracking
            progress_interval = max(1, len(items) // 10)  # Log every 10% or at least every item if < 10 items
            
            for index, item in enumerate(items):
                try:
                    # Create barcode image using template
                    filename = f"barcode_{session_id}_{index + 1:04d}.png"
                    output_path = os.path.join(self.output_dir, filename)
                    
                    # Log progress at intervals or for first/last item
                    should_log = (index == 0 or index == len(items) - 1 or 
                                 (index + 1) % progress_interval == 0 or 
                                 (index + 1) % 10 == 0)
                    
                    if should_log:
                        print(f"🎨 TEMPLATE SERVICE: Generating barcode {index + 1}/{len(items)} ({(index + 1) * 100 // len(items)}%)")
                    
                    # Wrap in try-except to prevent worker crash
                    try:
                        await self._create_barcode_with_json_template(template, item, output_path, reusable_renderer)
                    except Exception as render_error:
                        import sys
                        import traceback
                        error_msg = f"CRITICAL: Worker crash prevented - Error in _create_barcode_with_json_template for item {index + 1}: {render_error}"
                        traceback_str = traceback.format_exc()
                        print(f"❌ {error_msg}", flush=True)
                        print(f"❌ Full traceback: {traceback_str}", flush=True)
                        sys.stderr.write(f"❌ {error_msg}\n")
                        sys.stderr.write(f"❌ Full traceback: {traceback_str}\n")
                        sys.stderr.flush()
                        sys.stdout.flush()
                        # Re-raise to be caught by outer exception handler
                        raise
                    
                    # Force garbage collection every 5 barcodes to free memory
                    if (index + 1) % 5 == 0:
                        import gc
                        gc.collect()
                    
                    # Verify file was created
                    if os.path.exists(output_path):
                        file_size = os.path.getsize(output_path)
                        generated_files.append(filename)
                        if should_log:
                            print(f"✅ TEMPLATE SERVICE: Generated barcode {index + 1}/{len(items)}: {filename} ({file_size} bytes)")
                    else:
                        # Try absolute path
                        abs_path = os.path.abspath(output_path)
                        if os.path.exists(abs_path):
                            if should_log:
                                print(f"⚠️ TEMPLATE SERVICE: File found at absolute path: {abs_path}")
                            generated_files.append(filename)
                        else:
                            print(f"❌ TEMPLATE SERVICE ERROR: File was not created: {output_path}")
                            print(f"❌ TEMPLATE SERVICE ERROR: Absolute path also not found: {abs_path}")
                            # List directory contents for debugging only on error
                            if os.path.exists(self.output_dir):
                                dir_contents = os.listdir(self.output_dir)
                                print(f"❌ TEMPLATE SERVICE ERROR: Directory contents ({len(dir_contents)} files): {dir_contents[:10]}")
                    
                except Exception as e:
                    import sys
                    import traceback
                    error_msg = f"Error generating barcode for item {index + 1}: {e}"
                    traceback_str = traceback.format_exc()
                    print(f"❌ TEMPLATE SERVICE ERROR: {error_msg}", flush=True)
                    print(f"❌ TEMPLATE SERVICE ERROR: Traceback: {traceback_str}", flush=True)
                    sys.stderr.write(f"❌ TEMPLATE SERVICE ERROR: {error_msg}\n")
                    sys.stderr.write(f"❌ TEMPLATE SERVICE ERROR: Traceback: {traceback_str}\n")
                    sys.stderr.flush()
                    sys.stdout.flush()
                    # Continue processing other items even if one fails
                    # Don't re-raise to prevent worker crash
            
            # Create PDF
            print(f"🎨 TEMPLATE SERVICE: All {len(generated_files)} barcodes generated successfully!")
            print(f"🎨 TEMPLATE SERVICE: Creating PDF from {len(generated_files)} generated files")
            print(f"🎨 TEMPLATE SERVICE: Session ID for PDF: {session_id}")
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            print(f"🎨 TEMPLATE SERVICE: PDF filename will be: {pdf_filename}")
            # Pass template name to enable Itel detection for smaller grid
            pdf_path = self.create_pdf_from_barcodes(
                pdf_filename, 
                session_id=session_id,
                template_name=template.name
            )
            
            if pdf_path:
                print(f"✅ TEMPLATE SERVICE: PDF created successfully: {pdf_path}")
            else:
                print(f"⚠️ TEMPLATE SERVICE: PDF creation failed or returned None")
            
            print(f"✅ TEMPLATE SERVICE: Template generation completed successfully!")
            print(f"✅ TEMPLATE SERVICE: Generated {len(generated_files)} barcode files")
            print(f"✅ TEMPLATE SERVICE: Session ID: {session_id}")
            
            # Final memory cleanup after template generation
            import gc
            gc.collect()
            print(f"🧹 TEMPLATE SERVICE: Final garbage collection completed")
            
            return generated_files, session_id
            
        except Exception as e:
            import sys
            import traceback
            error_msg = f"Error in template-based generation: {e}"
            traceback_str = traceback.format_exc()
            print(f"❌ TEMPLATE SERVICE ERROR: {error_msg}", flush=True)
            print(f"❌ TEMPLATE SERVICE ERROR: Full traceback: {traceback_str}", flush=True)
            sys.stderr.write(f"❌ TEMPLATE SERVICE ERROR: {error_msg}\n")
            sys.stderr.write(f"❌ TEMPLATE SERVICE ERROR: Full traceback: {traceback_str}\n")
            sys.stderr.flush()
            sys.stdout.flush()
            return [], f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        finally:
            # Clean up reusable renderer to free memory
            if 'reusable_renderer' in locals():
                try:
                    if hasattr(reusable_renderer, 'canvas') and reusable_renderer.canvas is not None:
                        reusable_renderer.canvas.close()
                    del reusable_renderer
                    import gc
                    gc.collect()
                    print(f"✅ TEMPLATE SERVICE: Cleaned up reusable renderer")
                except Exception as cleanup_error:
                    print(f"⚠️ TEMPLATE SERVICE: Error cleaning up renderer: {cleanup_error}")
    
    def create_pdf_from_barcodes(self, pdf_filename: Optional[str] = None, 
                               grid_cols: int = 5, grid_rows: int = 12, # Dashboard default 5x12
                               session_id: str = None, 
                               device_type: Optional[str] = None,
                               template_name: Optional[str] = None,
                               barcode_filenames: Optional[List[str]] = None) -> Optional[str]:
        """Create a PDF with all generated barcode images arranged in a grid"""
        try:
            # Set default PDF filename if not provided
            if pdf_filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                pdf_filename = f"barcode_collection_{timestamp}.pdf"
            
            # Use provided session_id or create a default one
            if session_id is None:
                session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            pdf_path = os.path.join(self.pdf_dir, pdf_filename)
            
            # Ensure PDF directory exists with proper permissions
            try:
                os.makedirs(self.pdf_dir, exist_ok=True, mode=0o755)
                # Verify directory is writable
                if not os.access(self.pdf_dir, os.W_OK):
                    print(f"⚠️  Warning: PDF directory is not writable: {self.pdf_dir}")
                    try:
                        os.chmod(self.pdf_dir, 0o755)
                    except Exception as e:
                        print(f"❌ Could not fix PDF directory permissions: {e}")
            except Exception as e:
                print(f"❌ Error creating PDF directory {self.pdf_dir}: {e}")
                import traceback
                print(traceback.format_exc())
                raise
            
            # Ensure output directory exists
            if not os.path.exists(self.output_dir):
                print(f"⚠️  Warning: Output directory does not exist: {self.output_dir}")
                try:
                    os.makedirs(self.output_dir, exist_ok=True, mode=0o755)
                    print(f"✅ Created output directory: {self.output_dir}")
                except Exception as e:
                    print(f"❌ Error creating output directory: {e}")
                    raise
            
            # Get PNG files from the barcode directory
            # Priority: 1. Use provided filenames, 2. Match by session_id, 3. Get all PNG files
            if barcode_filenames:
                # Use the provided list of filenames directly
                barcode_files = []
                for filename in barcode_filenames:
                    file_path = os.path.join(self.output_dir, filename)
                    if os.path.exists(file_path):
                        barcode_files.append(file_path)
                    else:
                        print(f"⚠️  Warning: File not found: {file_path}")
                print(f"🔍 Using provided filenames: {len(barcode_files)} of {len(barcode_filenames)} files found")
            elif session_id:
                # Filter files by session_id pattern (e.g., barcode_template_session_20251108_092111_*.png)
                # The session_id format is: template_session_20251108_092827
                # File format is: barcode_template_session_20251108_092827_0001.png
                # So we need to match: *template_session_20251108_092827*.png
                pattern = os.path.join(self.output_dir, f"*{session_id}*.png")
                barcode_files = glob.glob(pattern)
                print(f"🔍 Looking for PNG files matching session_id '{session_id}' in: {self.output_dir}")
                print(f"🔍 Using pattern: {pattern}")
                
                # If no files found with session_id, try alternative patterns
                if not barcode_files:
                    # Try with "barcode_" prefix
                    alt_pattern = os.path.join(self.output_dir, f"barcode_{session_id}*.png")
                    barcode_files = glob.glob(alt_pattern)
                    print(f"🔍 Alternative pattern (with barcode_ prefix): {alt_pattern}")
                    print(f"🔍 Found {len(barcode_files)} files with alternative pattern")
            else:
                # Get all PNG files if no session_id provided
                barcode_files = glob.glob(os.path.join(self.output_dir, "*.png"))
                print(f"🔍 Looking for all PNG files in: {self.output_dir}")
            
            barcode_files.sort()  # Sort for consistent ordering
            
            # Log file count efficiently
            if len(barcode_files) > 0:
                print(f"🔍 Found {len(barcode_files)} PNG files for PDF creation")
                if len(barcode_files) <= 10:
                    print(f"🔍 Files: {[os.path.basename(f) for f in barcode_files]}")
                else:
                    print(f"🔍 Sample files: {[os.path.basename(f) for f in barcode_files[:5]]} ... ({len(barcode_files) - 5} more)")
            else:
                print(f"🔍 No PNG files found matching session_id '{session_id}'")
            
            # Debug: List all files in directory if no matches found
            if not barcode_files and session_id:
                all_files = glob.glob(os.path.join(self.output_dir, "*.png"))
                print(f"⚠️  DEBUG: No files matched session_id '{session_id}'")
                print(f"⚠️  DEBUG: Total PNG files in directory: {len(all_files)}")
                if all_files:
                    print(f"⚠️  DEBUG: Sample filenames: {[os.path.basename(f) for f in all_files[:5]]}")
                    print(f"⚠️  DEBUG: Session ID in pattern: {session_id}")
                    # Check if session_id appears in any filename
                    matching = [f for f in all_files if session_id in os.path.basename(f)]
                    print(f"⚠️  DEBUG: Files containing session_id string: {len(matching)}")
                    if matching:
                        print(f"⚠️  DEBUG: Using files containing session_id string")
                        barcode_files = matching
                        barcode_files.sort()
            
            if not barcode_files:
                print("❌ No barcode images found to include in PDF")
                return None
            
            # Detect if these are Itel barcodes by checking:
            # 1. device_type parameter (if provided)
            # 2. template_name parameter (if provided)
            # 3. Filenames (check first 5 files as sample)
            is_itel_barcodes = False
            
            # Check device_type parameter
            if device_type:
                device_type_lower = device_type.lower()
                if 'itel' in device_type_lower:
                    is_itel_barcodes = True
                    print(f"📱 Detected Itel from device_type: {device_type}")
            
            # Check template_name parameter
            if not is_itel_barcodes and template_name:
                template_name_lower = template_name.lower()
                if 'itel' in template_name_lower:
                    is_itel_barcodes = True
                    print(f"📱 Detected Itel from template_name: {template_name}")
            
            # Check filenames as fallback
            if not is_itel_barcodes:
                for barcode_file in barcode_files[:5]:  # Check first 5 files as sample
                    filename_lower = os.path.basename(barcode_file).lower()
                    if 'itel' in filename_lower:
                        is_itel_barcodes = True
                        print(f"📱 Detected Itel from filename: {os.path.basename(barcode_file)}")
                        break
            
            # Override grid for Itel barcodes ONLY (use 4 columns for better spacing)
            # Keep default 5x12 for all other barcodes
            if is_itel_barcodes:
                original_grid = f"{grid_cols}x{grid_rows}"
                grid_cols = 4  # Use 4 columns for Itel barcodes
                grid_rows = 12  # Keep 12 rows
                print(f"📱 Detected Itel barcodes - OVERRIDING grid from {original_grid} to 4x12 for better spacing")
            else:
                print(f"📐 Using default grid ({grid_cols}x{grid_rows})")
            
            print(f"📄 Creating PDF with {len(barcode_files)} barcode images...")
            print(f"📁 PDF will be saved as: {pdf_path}")
            
            # Create PDF canvas
            c = canvas.Canvas(pdf_path, pagesize=A4)
            page_width, page_height = A4
            
            # Calculate grid dimensions
            # For Itel: use margins to prevent clipping with larger images
            # For default: use standard margins
            if is_itel_barcodes:
                margin = 10  # Small margin to prevent edge clipping for scaled Itel images
            else:
                margin = 20  # Standard margin for default barcodes
            available_width = page_width - (2 * margin)
            available_height = page_height - (2 * margin)
            
            # Calculate cell dimensions
            cell_width = available_width / grid_cols
            cell_height = available_height / grid_rows
            
            # Calculate base image size
            # For Itel: no padding, use full cell for scaling
            # For default: use standard padding
            if is_itel_barcodes:
                image_padding = 0
                base_image_width = cell_width
                base_image_height = cell_height
            else:
                image_padding = 2  # Standard padding for default barcodes
                base_image_width = cell_width - (2 * image_padding)
                base_image_height = cell_height - (2 * image_padding)
            
            # Process images in batches of grid_cols * grid_rows
            images_per_page = grid_cols * grid_rows
            total_pages = (len(barcode_files) + images_per_page - 1) // images_per_page
            
            print(f"📄 Creating PDF: {total_pages} page(s), {images_per_page} images per page")
            
            for page_num in range(total_pages):
                if page_num > 0:
                    c.showPage()  # Start new page
                
                # Calculate which images to include on this page
                start_idx = page_num * images_per_page
                end_idx = min(start_idx + images_per_page, len(barcode_files))
                page_images = barcode_files[start_idx:end_idx]
                
                # Log page progress
                if total_pages > 1:
                    print(f"📄 Processing page {page_num + 1}/{total_pages} ({len(page_images)} images)")
                
                # Place images in grid
                for i, image_path in enumerate(page_images):
                    # Verify image file exists before trying to add it
                    if not os.path.exists(image_path):
                        print(f"⚠️  Warning: Image file not found: {image_path}")
                        continue
                    
                    # Calculate grid position
                    row = i // grid_cols
                    col = i % grid_cols
                    
                    try:
                        # Verify file is readable
                        if not os.access(image_path, os.R_OK):
                            print(f"⚠️  Warning: Image file is not readable: {image_path}")
                            continue
                        
                        # Add image to PDF with explicit memory management
                        image_reader = None
                        try:
                            # Calculate position and scale based on barcode type
                            # For Itel: use centered positioning with 150% scaling
                            # For default: use standard positioning, no scaling
                            if is_itel_barcodes:
                                # Get actual image dimensions and scale up for Itel
                                from PIL import Image as PILImage
                                with PILImage.open(image_path) as img:
                                    original_width, original_height = img.size
                                    
                                    # Calculate scale factor to make image larger (150% for Itel)
                                    scale_factor = 1.5  # 150% of cell size
                                    scaled_width = base_image_width * scale_factor
                                    scaled_height = base_image_height * scale_factor
                                    
                                    # Maintain aspect ratio based on original image
                                    img_aspect = original_width / original_height
                                    cell_aspect = base_image_width / base_image_height
                                    
                                    # If image aspect doesn't match cell, adjust to maintain image aspect
                                    if abs(img_aspect - cell_aspect) > 0.1:
                                        if img_aspect > cell_aspect:
                                            # Image is wider - use width as base
                                            scaled_height = scaled_width / img_aspect
                                        else:
                                            # Image is taller - use height as base
                                            scaled_width = scaled_height * img_aspect
                                    
                                    # Calculate cell boundaries (within margins)
                                    cell_left = margin + (col * cell_width)
                                    cell_bottom = page_height - margin - ((row + 1) * cell_height)
                                    
                                    # Center the scaled image in the cell
                                    cell_center_x = cell_left + (cell_width / 2)
                                    cell_center_y = cell_bottom + (cell_height / 2)
                                    
                                    # Calculate position for 'sw' anchor (bottom-left corner)
                                    x = cell_center_x - (scaled_width / 2)
                                    y = cell_center_y - (scaled_height / 2)
                                    
                                    # Constrain to page boundaries to prevent clipping
                                    if x < margin:
                                        x = margin
                                    if x + scaled_width > page_width - margin:
                                        x = page_width - margin - scaled_width
                                    if y < margin:
                                        y = margin
                                    if y + scaled_height > page_height - margin:
                                        y = page_height - margin - scaled_height
                                    
                                    if i == 0:  # Log first image for debugging
                                        print(f"📏 Itel image scaling: original={original_width}x{original_height}, cell={base_image_width:.1f}x{base_image_height:.1f}, scaled={scaled_width:.1f}x{scaled_height:.1f}, pos=({x:.1f}, {y:.1f})")
                                    
                                    image_reader = ImageReader(image_path)
                                    # Draw image at scaled size, constrained to page boundaries
                                    c.drawImage(image_reader, x, y, 
                                              width=scaled_width, height=scaled_height, 
                                              preserveAspectRatio=True, anchor='sw', mask='auto')
                            else:
                                # Default barcodes: standard positioning, no scaling
                                x = margin + (col * cell_width) + image_padding
                                y = page_height - margin - ((row + 1) * cell_height) + image_padding
                                
                                image_reader = ImageReader(image_path)
                                # Draw image at standard size, no scaling
                                c.drawImage(image_reader, x, y, 
                                          width=base_image_width, height=base_image_height, 
                                          preserveAspectRatio=True, anchor='sw', mask='auto')
                            
                            # Log progress every 10 images or for first/last
                            if (i + 1) % 10 == 0 or i == 0 or i == len(page_images) - 1:
                                print(f"✅ Added image {i+1}/{len(page_images)} to page {page_num + 1}")
                        finally:
                            # Explicitly clean up image reader to free memory
                            if image_reader is not None:
                                # ImageReader doesn't have explicit close, but we can help GC
                                del image_reader
                    except Exception as e:
                        print(f"⚠️  Warning: Could not add image {os.path.basename(image_path)}: {e}")
                        import traceback
                        print(f"⚠️  Image add error traceback: {traceback.format_exc()}")
                        # Continue with next image instead of failing entire PDF
                        continue
            
            # Save the PDF
            try:
                c.save()
                print(f"✅ PDF file saved to disk: {pdf_path}")
            except Exception as save_error:
                print(f"❌ Error saving PDF file: {save_error}")
                import traceback
                print(f"❌ PDF save traceback: {traceback.format_exc()}")
                # Clean up partial PDF file if it exists
                if os.path.exists(pdf_path):
                    try:
                        os.remove(pdf_path)
                    except:
                        pass
                raise  # Re-raise since PDF save failure is critical
            finally:
                # Clean up PDF canvas to free memory
                try:
                    if c is not None:
                        # ReportLab canvas doesn't have explicit close, but we can help GC
                        del c
                        import gc
                        gc.collect()
                        print(f"🧹 Cleaned up PDF canvas and ran garbage collection")
                except Exception as cleanup_error:
                    print(f"⚠️  Warning: Error cleaning up PDF canvas: {cleanup_error}")
            
            # Verify PDF was created and get file size
            if not os.path.exists(pdf_path):
                print(f"❌ Error: PDF file was not created at {pdf_path}")
                raise FileNotFoundError(f"PDF file not found after save: {pdf_path}")
            
            # Save PDF details immediately to database
            pdf_file_size = os.path.getsize(pdf_path)
            pdf_record = BarcodeRecord(
                filename=pdf_filename,
                file_path=pdf_path,
                archive_path=pdf_path,  # Will be updated when archived
                file_type="pdf",
                file_size=pdf_file_size,
                created_at=datetime.now().isoformat(),
                archived_at=datetime.now().isoformat(),
                generation_session=session_id,
                imei=None,  # PDFs don't have individual IMEI
                box_id=None,
                model=None,
                product=f"Collection of {len(barcode_files)} barcodes",
                color=None,
                dn=None
            )
            
            # Save PDF to database (non-fatal - don't crash if this fails)
            try:
                pdf_record_id = self.archive_manager.db_manager.insert_barcode_record(pdf_record)
                print(f"✅ Saved PDF {pdf_filename} to database (ID: {pdf_record_id})")
            except Exception as db_error:
                print(f"⚠️  Warning: Could not save PDF to database: {db_error}")
                print(f"⚠️  Error type: {type(db_error).__name__}")
                import traceback
                print(f"⚠️  Database save traceback: {traceback.format_exc()}")
                # Don't fail PDF creation if database save fails
                pdf_record_id = None
            
            print(f"✅ PDF created successfully: {pdf_path}")
            print(f"📊 Total images included: {len(barcode_files)}")
            print(f"📄 Total pages: {total_pages}")
            print(f"📐 Grid layout: {grid_cols} columns × {grid_rows} rows")
            
            # Final memory cleanup after PDF creation
            import gc
            gc.collect()
            print(f"🧹 Final garbage collection completed after PDF creation")
            
            # NOTE: PNG files are NOT cleaned up here. They will be archived when a new session starts.
            # This ensures files are available for verification and download until the next upload.
            # Cleanup happens in archive_existing_files() which is called at the start of new sessions.
            
            return pdf_filename
        
        except Exception as e:
            print(f"❌ CRITICAL ERROR in create_pdf_from_barcodes: {e}")
            import traceback
            print(f"❌ Full traceback: {traceback.format_exc()}")
            # Log the error but don't crash the worker - return None instead
            print(f"⚠️  PDF creation failed, returning None to allow request to continue")
            return None

    # Enhanced Device-Specific Barcode Generation
    async def generate_enhanced_barcodes(self, items: List[Any], device_type: Optional[str] = None, device_id: Optional[int] = None, auto_generate_second_imei: bool = True) -> Dict[str, Any]:
        """
        Enhanced barcode generation with device-specific logic and fallback to default
        
        Args:
            items: List of data items for barcode generation
            device_type: Type of device (phone, laptop, earphones, etc.)
            device_id: ID of the specific device model
            auto_generate_second_imei: Whether to auto-generate second IMEI
            
        Returns:
            Dict containing generation results and metadata
        """
        print(f"🚀 Starting Enhanced Barcode Generation")
        print(f"📱 Device Type: {device_type or 'Default (No Device Selected)'}")
        print(f"🆔 Device ID: {device_id or 'None'}")
        print(f"📊 Items Count: {len(items)}")
        
        # Determine generation strategy
        if device_type:
            # Device-specific generation
            print(f"🎯 Using DEVICE-SPECIFIC generation for: {device_type}")
            return await self._generate_device_specific_barcodes(items, device_type, device_id, auto_generate_second_imei)
        else:
            # Default generation (fallback)
            print(f"🎯 Using DEFAULT generation (no device selected)")
            return await self._generate_default_barcodes(items, auto_generate_second_imei)

    async def _generate_device_specific_barcodes(self, items: List[Any], device_type: str, device_id: Optional[int], auto_generate_second_imei: bool) -> Dict[str, Any]:
        """Generate barcodes with device-specific logic and images"""
        print(f"📱 Generating DEVICE-SPECIFIC barcodes for: {device_type}")
        
        # Convert BarcodeItem objects to dictionaries if needed
        if items and hasattr(items[0], 'dict'):
            # Items are Pydantic models, convert to dicts
            items = [item.dict() for item in items]
            print(f"🔄 Converted {len(items)} BarcodeItem objects to dictionaries")
        
        # Archive existing files
        archive_result = self.archive_existing_files(file_metadata=items)
        
        # Create generation session
        session_id = f"device_{device_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Determine barcode type and image template
        barcode_type = self._determine_barcode_type(device_type)
        image_template = self._get_device_image_template(device_type)
        
        print(f"🎯 Barcode Type: {barcode_type}")
        print(f"🖼️ Image Template: {image_template}")
        
        generated_files = []
        used_imeis = self._load_used_imeis() if auto_generate_second_imei else set()
        
        # Process each item with device-specific logic
        for i, item in enumerate(items):
            try:
                # Apply device-specific data processing
                processed_item = self._process_device_specific_data(item, device_type, device_id)
                
                # Generate barcode with device-specific template
                barcode_filename = await self._generate_device_barcode_image(
                    processed_item, 
                    device_type, 
                    image_template, 
                    barcode_type,
                    used_imeis,
                    session_id,
                    i + 1
                )
                
                if barcode_filename:
                    # Verify file exists before adding to list
                    filepath = os.path.join(self.output_dir, barcode_filename)
                    if os.path.exists(filepath):
                        generated_files.append(barcode_filename)
                        print(f"✅ Verified barcode file exists: {barcode_filename}")
                    else:
                        print(f"❌ ERROR: Barcode file {barcode_filename} not found at {filepath}")
                        print(f"❌ Output directory contents: {os.listdir(self.output_dir) if os.path.exists(self.output_dir) else 'Directory does not exist'}")
                    
                    # Log to database
                    self._log_barcode_generation(processed_item, barcode_filename, device_type, device_id, session_id)
                    
            except Exception as e:
                print(f"❌ Error generating barcode for item {i+1}: {str(e)}")
                continue
        
        # Save used IMEIs
        if auto_generate_second_imei:
            self._save_used_imeis(used_imeis)
        
        return {
            "success": True,
            "generated_files": generated_files,
            "device_type": device_type,
            "device_id": device_id,
            "barcode_type": barcode_type,
            "image_template": image_template,
            "session_id": session_id,
            "total_generated": len(generated_files),
            "archive_result": archive_result
        }

    async def _generate_default_barcodes(self, items: List[Any], auto_generate_second_imei: bool) -> Dict[str, Any]:
        """Generate barcodes using default logic and images (fallback)"""
        print(f"🔄 Generating DEFAULT barcodes (fallback mode)")
        
        # Use existing generation logic as fallback
        try:
            # Convert BarcodeItem objects to dictionaries if needed
            if items and hasattr(items[0], 'dict'):
                # Items are Pydantic models, convert to dicts
                items = [item.dict() for item in items]
                print(f"🔄 Converted {len(items)} BarcodeItem objects to dictionaries")
            
            result = await self.generate_barcodes_from_data(items, auto_generate_second_imei)
            if isinstance(result, tuple):
                generated_files, session_id = result
            else:
                generated_files = result
            
            return {
                "success": True,
                "generated_files": generated_files,
                "device_type": None,
                "device_id": None,
                "barcode_type": "default",
                "image_template": "default",
                "session_id": f"default_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "total_generated": len(generated_files),
                "mode": "fallback"
            }
        except Exception as e:
            print(f"❌ Error in default generation: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "mode": "fallback_error"
            }

    def _get_device_image_template(self, device_type: str) -> str:
        """Get device-specific image template path"""
        # Map device types to their specific image templates
        device_templates = {
            "phone": "templates/phone_barcode_template.png",
            "laptop": "templates/laptop_barcode_template.png", 
            "earphones": "templates/earphones_barcode_template.png",
            "watch": "templates/watch_barcode_template.png",
            "tablet": "templates/tablet_barcode_template.png",
            "speaker": "templates/speaker_barcode_template.png",
            "camera": "templates/camera_barcode_template.png",
            "gaming": "templates/gaming_barcode_template.png",
            "tv": "templates/tv_barcode_template.png",
            "router": "templates/router_barcode_template.png",
            "other": "templates/other_barcode_template.png"
        }
        
        template_path = device_templates.get(device_type, "templates/default_barcode_template.png")
        
        # Check if template exists, fallback to default if not
        if not os.path.exists(template_path):
            print(f"⚠️ Device template not found: {template_path}, using default")
            template_path = "templates/default_barcode_template.png"
            
        return template_path

    def _process_device_specific_data(self, item: Dict[str, Any], device_type: str, device_id: Optional[int]) -> Dict[str, Any]:
        """Process item data with device-specific logic"""
        processed_item = item.copy()
        
        # Apply device-specific data transformations
        if device_type == "phone":
            # Phone-specific processing
            processed_item = self._process_phone_data(processed_item, device_id)
        elif device_type == "laptop":
            # Laptop-specific processing
            processed_item = self._process_laptop_data(processed_item, device_id)
        elif device_type == "earphones":
            # Earphones-specific processing
            processed_item = self._process_earphones_data(processed_item, device_id)
        elif device_type == "watch":
            # Watch-specific processing
            processed_item = self._process_watch_data(processed_item, device_id)
        else:
            # Generic device processing
            processed_item = self._process_generic_device_data(processed_item, device_type, device_id)
        
        return processed_item

    def _process_phone_data(self, item: Dict[str, Any], device_id: Optional[int]) -> Dict[str, Any]:
        """Process phone-specific data"""
        # Add phone-specific fields
        item["device_category"] = "Mobile Phone"
        item["barcode_prefix"] = "PH"
        
        # Ensure IMEI format for phones
        if "imei" in item and item["imei"]:
            item["imei"] = self._format_imei(item["imei"])
        
        return item

    def _process_laptop_data(self, item: Dict[str, Any], device_id: Optional[int]) -> Dict[str, Any]:
        """Process laptop-specific data"""
        item["device_category"] = "Laptop Computer"
        item["barcode_prefix"] = "LP"
        
        # Ensure serial number format for laptops
        if "serial" in item and item["serial"]:
            item["serial"] = self._format_serial(item["serial"])
        
        return item

    def _process_earphones_data(self, item: Dict[str, Any], device_id: Optional[int]) -> Dict[str, Any]:
        """Process earphones-specific data"""
        item["device_category"] = "Audio Device"
        item["barcode_prefix"] = "EP"
        
        return item

    def _process_watch_data(self, item: Dict[str, Any], device_id: Optional[int]) -> Dict[str, Any]:
        """Process watch-specific data"""
        item["device_category"] = "Smart Watch"
        item["barcode_prefix"] = "SW"
        
        return item

    def _process_generic_device_data(self, item: Dict[str, Any], device_type: str, device_id: Optional[int]) -> Dict[str, Any]:
        """Process generic device data"""
        item["device_category"] = device_type.title()
        item["barcode_prefix"] = device_type[:2].upper()
        
        return item

    def _format_imei(self, imei: str) -> str:
        """Format IMEI number"""
        # Remove any non-digit characters
        imei = ''.join(filter(str.isdigit, str(imei)))
        # Ensure 15 digits
        if len(imei) == 15:
            return imei
        elif len(imei) < 15:
            # Pad with zeros if too short
            return imei.zfill(15)
        else:
            # Truncate if too long
            return imei[:15]

    def _format_serial(self, serial: str) -> str:
        """Format serial number"""
        # Clean and standardize serial number
        return str(serial).strip().upper()

    async def _generate_device_barcode_image(self, item: Dict[str, Any], device_type: str, template_path: str, barcode_type: str, used_imeis: Set[str], session_id: str, item_number: int) -> Optional[str]:
        """Generate barcode image using device-specific template"""
        try:
            # Check if device_type corresponds to a template (template names become device types)
            # Try to load template by name first
            template = self._load_template_by_name(device_type)
            
            if template:
                print(f"📱 Detected template-based device: {device_type}, using template: {template.get('name', 'Unknown')}")
                filename = f"{device_type}_{item_number:03d}_{datetime.now().strftime('%H%M%S')}.png"
                filepath = os.path.join(self.output_dir, filename)
                
                # Prepare item data for template rendering
                if self._is_itel_device(device_type):
                    # Use Itel-specific data preparation
                    itel_item_data = self._prepare_itel_item_data(item)
                    await self._create_barcode_with_json_template(template, itel_item_data, filepath)
                else:
                    # Use generic template data preparation
                    await self._create_barcode_with_json_template(template, item, filepath)
                
                # Verify file exists before returning
                if os.path.exists(filepath):
                    print(f"✅ Generated template-based barcode: {filename} (verified)")
                    return filename
                else:
                    print(f"❌ ERROR: Template barcode file not created: {filepath}")
                    return None
            
            # Check if this is an Itel device - use JSON template rendering (legacy support)
            if self._is_itel_device(device_type):
                print(f"📱 Detected Itel device: {device_type}, using Itel template")
                filename = f"{device_type}_{item_number:03d}_{datetime.now().strftime('%H%M%S')}.png"
                filepath = os.path.join(self.output_dir, filename)
                
                # Load Itel template and render with item data
                await self._create_itel_barcode_with_template(item, device_type, filepath)
                
                # Verify file exists before returning
                if os.path.exists(filepath):
                    print(f"✅ Generated Itel barcode: {filename} (verified)")
                    return filename
                else:
                    print(f"❌ ERROR: Itel barcode file not created: {filepath}")
                    return None
            
            # For non-Itel devices, use existing template logic
            # Create barcode content based on type
            if barcode_type == "imei_based":
                barcode_content = item.get("imei", f"IMEI_{item_number:06d}")
            elif barcode_type == "serial_based":
                barcode_content = item.get("serial", f"SERIAL_{item_number:06d}")
            elif barcode_type == "product_based":
                barcode_content = item.get("product", f"PRODUCT_{item_number:06d}")
            else:
                barcode_content = f"DEFAULT_{item_number:06d}"
            
            # Generate filename
            filename = f"{device_type}_{item_number:03d}_{datetime.now().strftime('%H%M%S')}.png"
            filepath = os.path.join(self.output_dir, filename)
            
            # Generate barcode image with device-specific template
            await self._create_device_barcode_with_template(item, barcode_content, template_path, filepath, device_type)
            
            # Verify file exists before returning
            if os.path.exists(filepath):
                print(f"✅ Generated device barcode: {filename} (verified)")
                return filename
            else:
                print(f"❌ ERROR: Device barcode file not created: {filepath}")
                return None
            
        except Exception as e:
            print(f"❌ Error generating device barcode image: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return None

    async def _create_device_barcode_with_template(self, item: Dict[str, Any], barcode_content: str, template_path: str, output_path: str, device_type: str):
        """Create barcode image using device-specific template"""
        try:
            # Load template image if it exists
            if os.path.exists(template_path):
                template_img = Image.open(template_path)
                template_img = template_img.convert('RGB')
            else:
                # Create default template if not found
                template_img = self._create_default_template(device_type)
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(barcode_content)
            qr.make(fit=True)
            
            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Resize QR code to fit template
            qr_size = min(template_img.width // 3, template_img.height // 3)
            qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
            
            # Paste QR code onto template
            paste_x = (template_img.width - qr_size) // 2
            paste_y = (template_img.height - qr_size) // 2
            template_img.paste(qr_img, (paste_x, paste_y))
            
            # Add text overlay with device information
            draw = ImageDraw.Draw(template_img)
            
            # Try to load a font, fallback to default if not available
            try:
                font = ImageFont.truetype("arial.ttf", 20)
            except:
                font = ImageFont.load_default()
            
            # Add device information text
            device_info = f"{item.get('brand', 'Unknown')} {item.get('model', 'Model')}"
            text_bbox = draw.textbbox((0, 0), device_info, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_x = (template_img.width - text_width) // 2
            text_y = template_img.height - 40
            
            draw.text((text_x, text_y), device_info, fill="black", font=font)
            
            # Save the final image
            template_img.save(output_path, "PNG")
            
        except Exception as e:
            print(f"❌ Error creating device barcode with template: {str(e)}")
            # Fallback to simple QR code generation
            await self._create_simple_qr_code(barcode_content, output_path)

    def _create_default_template(self, device_type: str) -> Image.Image:
        """Create a default template image for device type"""
        # Create a simple template based on device type
        width, height = 400, 300
        
        # Different background colors for different device types
        colors = {
            "phone": (240, 248, 255),      # Light blue
            "laptop": (255, 248, 240),     # Light orange
            "earphones": (248, 255, 248),  # Light green
            "watch": (255, 248, 255),      # Light pink
            "tablet": (248, 248, 255),     # Light purple
            "speaker": (255, 255, 240),    # Light yellow
            "camera": (240, 255, 255),     # Light cyan
            "gaming": (255, 240, 240),     # Light red
            "tv": (248, 248, 248),         # Light gray
            "router": (240, 240, 240),     # Darker gray
            "other": (255, 255, 255)       # White
        }
        
        bg_color = colors.get(device_type, (255, 255, 255))
        
        # Create image with background color
        img = Image.new('RGB', (width, height), bg_color)
        
        # Add border
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, width-1, height-1], outline="black", width=2)
        
        return img

    async def _create_simple_qr_code(self, content: str, output_path: str):
        """Create a simple QR code as fallback"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(content)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img.save(output_path, "PNG")

    def _is_itel_device(self, device_type: str) -> bool:
        """Check if device type is an Itel device"""
        if not device_type:
            return False
        return device_type.lower().startswith("itel_")

    def _load_template_by_name(self, device_type: str) -> Optional[Dict[str, Any]]:
        """Load template by device_type (which is template name converted to lowercase)"""
        try:
            templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
            
            if not os.path.exists(templates_dir):
                print(f"⚠️ Templates directory not found: {templates_dir}")
                return None
            
            # Convert device_type back to template name format (uppercase, spaces instead of underscores)
            # e.g., "itel2" -> "ITEL2", "itel_bar_code" -> "ITEL BAR CODE"
            template_name = device_type.replace('_', ' ').upper()
            template_name_lower = device_type.lower()
            
            print(f"🔍 Looking for template with name matching: '{template_name}' or '{template_name_lower}'")
            
            # Search for template by name in all template files
            for filename in os.listdir(templates_dir):
                if not filename.endswith(".json"):
                    continue
                    
                template_path = os.path.join(templates_dir, filename)
                try:
                    with open(template_path, 'r', encoding='utf-8') as f:
                        template = json.load(f)
                        template_name_in_file = template.get("name", "").upper()
                        template_name_in_file_lower = template.get("name", "").lower()
                        
                        # Check if template name matches (case-insensitive)
                        if (template_name_in_file == template_name or 
                            template_name_in_file_lower == template_name_lower or
                            template_name_in_file.replace(' ', '_').lower() == template_name_lower or
                            template_name_lower.replace('_', ' ') in template_name_in_file_lower):
                            print(f"✅ Loaded template for {device_type}: {template.get('name', filename)} (file: {filename})")
                            return template
                except Exception as e:
                    print(f"⚠️ Error reading template file {filename}: {str(e)}")
                    continue
            
            print(f"⚠️ No template found matching device_type '{device_type}' (looked for name: '{template_name}')")
            return None
            
        except Exception as e:
            print(f"❌ Error loading template by name: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return None

    def _load_itel_template(self, device_type: str) -> Optional[Dict[str, Any]]:
        """Load Itel JSON template from templates directory - now uses template name lookup"""
        # Use the new template name-based lookup
        return self._load_template_by_name(device_type)

    def _format_itel_imei(self, imei: str) -> str:
        """Format IMEI for Itel barcode (e.g., 'IMEI 1 : 350544301197847')"""
        # Clean and format IMEI
        imei_clean = ''.join(filter(str.isdigit, str(imei)))
        if len(imei_clean) == 15:
            return f"IMEI 1 : {imei_clean}"
        else:
            # Pad or truncate to 15 digits
            if len(imei_clean) < 15:
                imei_clean = imei_clean.zfill(15)
            else:
                imei_clean = imei_clean[:15]
            return f"IMEI 1 : {imei_clean}"

    def _prepare_itel_item_data(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare item data for Itel template rendering with proper field mapping"""
        # Create a copy of the item
        itel_data = item.copy()
        
        # Ensure IMEI is properly formatted
        imei = item.get("imei") or item.get("IMEI") or item.get("IMEI/SN") or ""
        if imei:
            # Clean IMEI for raw use
            imei_clean = ''.join(filter(str.isdigit, str(imei)))
            if len(imei_clean) < 15:
                imei_clean = imei_clean.zfill(15)
            elif len(imei_clean) > 15:
                imei_clean = imei_clean[:15]
            
            # Store raw IMEI for other components
            itel_data["imei"] = imei_clean
            itel_data["IMEI"] = imei_clean
            
            # Format IMEI for barcode component (barcode uses "IMEI/SN" mapping)
            # The barcode should encode "IMEI 1 : {imei}" format
            itel_data["IMEI/SN"] = self._format_itel_imei(imei_clean)
            
            # Also add formatted version for reference
            itel_data["itel_imei_formatted"] = self._format_itel_imei(imei_clean)
        
        # Map model field
        model = item.get("model") or item.get("Model") or item.get("MODEL") or ""
        if model:
            itel_data["model"] = model
            itel_data["Model"] = model
            itel_data["MODEL"] = model
        
        # Map product field (for color/storage info)
        product = item.get("product") or item.get("Product") or item.get("PRODUCT") or ""
        if product:
            itel_data["product"] = product
            itel_data["Product"] = product
            itel_data["PRODUCT"] = product
        
        # Map color field
        color = item.get("color") or item.get("Color") or item.get("COLOR") or ""
        if color:
            itel_data["color"] = color
            itel_data["Color"] = color
            itel_data["COLOR"] = color
        
        # Map DN field
        dn = item.get("dn") or item.get("DN") or item.get("d/n") or "M8N7"
        itel_data["dn"] = dn
        itel_data["DN"] = dn
        
        return itel_data

    async def _create_itel_barcode_with_template(self, item: Dict[str, Any], device_type: str, output_path: str):
        """Create Itel barcode using JSON template"""
        try:
            print(f"🎨 Creating Itel barcode for {device_type}")
            
            # Load Itel template
            template = self._load_itel_template(device_type)
            if not template:
                print(f"⚠️ No Itel template found, falling back to default generation")
                # Fallback to simple QR code
                imei = item.get("imei") or item.get("IMEI") or "DEFAULT_IMEI"
                await self._create_simple_qr_code(imei, output_path)
                return
            
            # Prepare item data with proper field mappings
            itel_item_data = self._prepare_itel_item_data(item)
            
            print(f"📊 Itel item data prepared: {list(itel_item_data.keys())}")
            
            # Use existing template rendering method
            await self._create_barcode_with_json_template(template, itel_item_data, output_path)
            
            print(f"✅ Itel barcode created successfully: {output_path}")
            
        except Exception as e:
            print(f"❌ Error creating Itel barcode: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            # Fallback to simple QR code
            imei = item.get("imei") or item.get("IMEI") or "DEFAULT_IMEI"
            await self._create_simple_qr_code(imei, output_path)

    async def _create_barcode_with_json_template(self, template, excel_row: Dict[str, Any], output_path: str, reusable_renderer=None):
        """Create barcode image using JSON template and Excel data with Python canvas renderer"""
        try:
            print(f"🎨 TEMPLATE RENDERER: Starting template rendering")
            print(f"🎨 TEMPLATE RENDERER: Template type: {type(template)}")
            print(f"🎨 TEMPLATE RENDERER: Excel row keys: {list(excel_row.keys())}")
            print(f"🎨 TEMPLATE RENDERER: Output path: {output_path}")
            
            # Ensure output directory exists before saving
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                print(f"📁 Creating output directory: {output_dir}")
                os.makedirs(output_dir, exist_ok=True, mode=0o755)
            
            # Verify directory is writable
            if output_dir and not os.access(output_dir, os.W_OK):
                error_msg = f"Output directory is not writable: {output_dir}"
                print(f"❌ {error_msg}")
                raise Exception(error_msg)
            
            # Import the Python canvas renderer
            from .python_canvas_renderer import PythonCanvasRenderer
            
            # Convert template to dict if it's a Pydantic model
            if hasattr(template, 'model_dump'):
                template_dict = template.model_dump()
                print(f"✅ Converted template using model_dump()")
            elif hasattr(template, 'dict'):
                template_dict = template.dict()
                print(f"✅ Converted template using dict()")
            else:
                template_dict = template
                print(f"✅ Using template as-is")
            
            print(f"🔍 Template dict keys: {list(template_dict.keys())}")
            print(f"🔍 Template components count: {len(template_dict.get('components', []))}")
            
            # Reuse renderer if provided, otherwise create new one
            if reusable_renderer is not None:
                renderer = reusable_renderer
                print(f"✅ Reusing provided renderer (prevents memory accumulation)")
            else:
                # Create Python canvas renderer at 1:1 scale to match canvas exactly
                # No scaling - render at exact canvas dimensions to match frontend design
                renderer = PythonCanvasRenderer(
                    canvas_width=template_dict.get('canvas_width', 600),  # Use dashboard default
                    canvas_height=template_dict.get('canvas_height', 200),  # Use dashboard default
                    background_color=template_dict.get('background_color', '#ffffff'),
                    scale_factor=1.0  # 1:1 scale - no scaling, match canvas exactly
                )
                print(f"✅ Python canvas renderer created")
            
            # Render the template with Excel data
            rendered_image = None
            file_size = 0
            try:
                rendered_image = renderer.render_template(template_dict, excel_row)
                
                print(f"✅ Template rendered, image size: {rendered_image.size}")
                
                # Verify we have a valid image before saving
                if rendered_image is None:
                    raise Exception("Rendered image is None")
                
                # Check if image is blank (all pixels are the same color)
                # This can happen if rendering fails silently
                if rendered_image.size[0] == 0 or rendered_image.size[1] == 0:
                    raise Exception(f"Rendered image has invalid size: {rendered_image.size}")
                
                # Save the rendered image at scaled size (2x for quality)
                # The scaled size ensures fonts and elements render at proper visual size
                # PIL fonts render smaller than browser fonts for the same point size, so the 2x scale compensates
                rendered_image.save(output_path, "PNG")
                print(f"✅ Generated barcode using Python Canvas Renderer: {output_path}")
                
                # Verify file was actually created
                if not os.path.exists(output_path):
                    error_msg = f"File was not created after save: {output_path}"
                    print(f"❌ {error_msg}")
                    raise Exception(error_msg)
                
                file_size = os.path.getsize(output_path)
                
                if file_size == 0:
                    error_msg = f"File was created but is empty: {output_path}"
                    print(f"❌ {error_msg}")
                    raise Exception(error_msg)
            finally:
                # Explicitly clean up rendered image to free memory
                if rendered_image is not None:
                    rendered_image.close()
                    del rendered_image
                # Only clean up renderer if we created it (not if it's reusable)
                if reusable_renderer is None:
                    # Clean up renderer canvas only if we own it
                    if hasattr(renderer, 'canvas') and renderer.canvas is not None:
                        renderer.canvas.close()
                        del renderer.canvas
                    if hasattr(renderer, 'draw') and renderer.draw is not None:
                        del renderer.draw
                    del renderer
                else:
                    # For reusable renderer, just reset the canvas for next use
                    if hasattr(renderer, 'canvas') and renderer.canvas is not None:
                        # Reset canvas to blank for next barcode
                        renderer.canvas = Image.new('RGB', (renderer.scaled_width, renderer.scaled_height), renderer.background_color)
                        renderer.draw = ImageDraw.Draw(renderer.canvas)
            
            print(f"✅ File verified: {output_path} ({file_size} bytes)")
            
        except Exception as e:
            print(f"❌ Error creating barcode with Python Canvas Renderer: {e}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            # Fallback to simple QR code
            try:
                await self._create_simple_qr_code("Error", output_path)
                # Verify fallback file was created
                if not os.path.exists(output_path):
                    raise Exception(f"Fallback QR code file was not created: {output_path}")
            except Exception as fallback_error:
                print(f"❌ Fallback QR code creation also failed: {fallback_error}")
                raise Exception(f"Failed to create barcode file: {e}. Fallback also failed: {fallback_error}")

    async def _render_component(self, draw: ImageDraw.Draw, component, excel_row: Dict[str, Any], base_img: Image.Image):
        """Render a single component from the template"""
        try:
            component_type = component.type
            props = component.properties
            x, y = component.x, component.y
            width, height = component.width, component.height
            
            if component_type == 'text':
                # Get text value from Excel row or use default
                text_value = self._get_text_value(props, excel_row)
                await self._render_text(draw, text_value, x, y, width, height, props)
                
            elif component_type == 'barcode':
                # Get barcode value from Excel row or use default
                barcode_value = self._get_barcode_value(props, excel_row)
                await self._render_barcode(barcode_value, x, y, width, height, base_img)
                
            elif component_type == 'qr':
                # Get QR value from Excel row or use default
                qr_value = self._get_qr_value(props, excel_row)
                await self._render_qr(qr_value, x, y, width, height, base_img)
                
            elif component_type == 'rectangle':
                # Render rectangle shape
                await self._render_rectangle(draw, x, y, width, height, props)
                # Add text if present
                if props.get('text'):
                    text_value = self._get_text_value(props, excel_row)
                    await self._render_text(draw, text_value, x, y, width, height, props)
                    
            elif component_type == 'circle':
                # Render circle shape
                await self._render_circle(draw, x, y, width, height, props)
                # Add text if present
                if props.get('text'):
                    text_value = self._get_text_value(props, excel_row)
                    await self._render_text(draw, text_value, x, y, width, height, props)
                    
            elif component_type == 'line':
                # Render line shape
                await self._render_line(draw, x, y, width, height, props)
                # Add text if present
                if props.get('text'):
                    text_value = self._get_text_value(props, excel_row)
                    await self._render_text(draw, text_value, x, y, width, height, props)
                    
        except Exception as e:
            print(f"❌ Error rendering component {component.id}: {e}")

    def _get_text_value(self, props: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Get text value from Excel row or use default"""
        # Check if component has mapping information
        mapping = props.get('mapping', {})
        
        if mapping.get('isConnected') and mapping.get('columnName'):
            # Use Excel data from mapped column
            column_name = mapping['columnName']
            excel_value = excel_row.get(column_name, '')
            
            # Apply extraction rule if present
            extraction_rule = mapping.get('extractionRule', {})
            if extraction_rule:
                excel_value = self._apply_extraction_rule(excel_value, extraction_rule)
            
            return excel_value or props.get('text', '')
        elif mapping.get('staticValue'):
            # Use static value
            return mapping['staticValue']
        else:
            # Try smart mapping based on template text content
            template_text = props.get('text', '').lower()
            excel_value = self._smart_map_text(template_text, excel_row)
            return excel_value or props.get('text', '')

    def _get_barcode_value(self, props: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Get barcode value from Excel row or use default"""
        # Check if component has mapping information
        mapping = props.get('mapping', {})
        
        if mapping.get('isConnected') and mapping.get('columnName'):
            # Use Excel data from mapped column
            column_name = mapping['columnName']
            excel_value = excel_row.get(column_name, '')
            
            # Apply extraction rule if present
            extraction_rule = mapping.get('extractionRule', {})
            if extraction_rule:
                excel_value = self._apply_extraction_rule(excel_value, extraction_rule)
            
            return excel_value or props.get('value', '1234567890')
        elif mapping.get('staticValue'):
            # Use static value
            return mapping['staticValue']
        else:
            # Try smart mapping based on template value content
            template_value = props.get('value', '')
            excel_value = self._smart_map_barcode(template_value, excel_row)
            return excel_value or props.get('value', '1234567890')

    def _get_qr_value(self, props: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Get QR value from Excel row or use default"""
        # Check if component has mapping information
        mapping = props.get('mapping', {})
        
        if mapping.get('isConnected') and mapping.get('columnName'):
            # Use Excel data from mapped column
            column_name = mapping['columnName']
            excel_value = excel_row.get(column_name, '')
            
            # Apply extraction rule if present
            extraction_rule = mapping.get('extractionRule', {})
            if extraction_rule:
                excel_value = self._apply_extraction_rule(excel_value, extraction_rule)
            
            return excel_value or props.get('value', 'https://example.com')
        elif mapping.get('staticValue'):
            # Use static value
            return mapping['staticValue']
        else:
            # Try smart mapping based on template value content
            template_value = props.get('value', '')
            excel_value = self._smart_map_qr(template_value, excel_row)
            return excel_value or props.get('value', 'https://example.com')

    def _apply_extraction_rule(self, value: str, rule: Dict[str, Any]) -> str:
        """Apply text extraction rule to value"""
        if not value or not rule:
            return value
        
        rule_type = rule.get('type', 'direct')
        
        if rule_type == 'direct':
            return value
        elif rule_type == 'first_word':
            return value.split(' ')[0] if value else ''
        elif rule_type == 'last_word':
            return value.split(' ')[-1] if value else ''
        elif rule_type == 'regex':
            import re
            regex_pattern = rule.get('value', '')
            if regex_pattern:
                try:
                    match = re.search(regex_pattern, value, re.IGNORECASE)
                    return match.group(0) if match else value
                except:
                    return value
            return value
        elif rule_type == 'manual':
            return rule.get('value', value)
        elif rule_type == 'position_based':
            # Delegate to position-based extraction
            return self._extract_by_position(value, rule)
        elif rule_type == 'context_based':
            # Delegate to context-based extraction
            return self._extract_by_context(value, rule)
        else:
            return value
    
    def _extract_by_position(self, value: str, rule: Dict[str, Any]) -> str:
        """Extract data based on position patterns"""
        if not value:
            return value
        
        position_type = rule.get('position_type', 'after')
        
        if position_type == 'word_position':
            # Extract word at specific position (0-indexed) - ONLY that word
            trimmed_value = value.strip()
            if not trimmed_value:
                return value
            
            # Split by whitespace and filter out empty strings (handles multiple spaces, tabs, etc.)
            words = [w for w in trimmed_value.split() if w]
            word_pos = rule.get('wordPosition') or rule.get('word_position', 0)
            
            if 0 <= word_pos < len(words):
                extracted_word = words[word_pos]
                print(f"[word_position extraction] Input: '{value}', Position: {word_pos}, Words: {words}, Extracted: '{extracted_word}'")
                return extracted_word  # Return ONLY the word at this position
            
            # If position is out of bounds, log warning and return empty string
            print(f"[word_position extraction] WARNING: Position {word_pos} out of bounds for value '{value}' with {len(words)} words")
            return ''
        elif position_type == 'last_segment_pattern':
            # Extract integer+integer pattern from last segment
            import re
            last_space_index = value.rfind(' ')
            if last_space_index != -1:
                last_segment = value[last_space_index + 1:].strip()
                pattern_match = re.search(r'\b(\d+\+\d+)\b', last_segment)
                if pattern_match:
                    return pattern_match.group(1)
                return last_segment
            pattern_match = re.search(r'\b(\d+\+\d+)\b', value)
            if pattern_match:
                return pattern_match.group(1)
            return value
        elif position_type == 'first_word':
            words = value.strip().split()
            return words[0] if words else value
        elif position_type == 'last_word':
            words = value.strip().split()
            return words[-1] if words else value
        elif position_type == 'word_range':
            words = value.strip().split()
            start_word = rule.get('startWord', 0)
            end_word = rule.get('endWord', len(words) - 1)
            if 0 <= start_word <= end_word < len(words):
                return ' '.join(words[start_word:end_word + 1])
            return value
        # Add other position types as needed
        return value
    
    def _extract_by_context(self, value: str, rule: Dict[str, Any]) -> str:
        """Extract data based on context patterns"""
        if not value:
            return value
        
        import re
        context_type = rule.get('context_type', '')
        
        if context_type == 'storage':
            match = re.search(r'\b(\d+\+\d+)\b', value)
            return match.group(1) if match else value
        elif context_type == 'color':
            match = re.search(r'\b(BLACK|WHITE|BLUE|GOLD|SILVER|SLEEK|IRIS|TITANIUM|SHADOW|RED|GREEN|PURPLE|PINK|ORANGE|YELLOW|BROWN|GRAY|GREY)\b', value, re.IGNORECASE)
            return match.group(1) if match else value
        elif context_type == 'model':
            match = re.search(r'\b([A-Z]\d{2,3}[A-Z]?)\b', value)
            return match.group(1) if match else value
        elif context_type == 'imei':
            match = re.search(r'\b(\d{15})\b', value)
            return match.group(1) if match else value
        
        return value

    def _smart_map_text(self, template_text: str, excel_row: Dict[str, Any]) -> str:
        """Smart mapping of template text to Excel columns"""
        # Common mapping patterns
        if 'model' in template_text:
            return excel_row.get('Model', excel_row.get('model', ''))
        elif 'color' in template_text:
            return excel_row.get('Color', excel_row.get('color', ''))
        elif 'imei' in template_text:
            return excel_row.get('IMEI/sn', excel_row.get('imei', ''))
        elif 'vc' in template_text:
            return excel_row.get('VC', excel_row.get('vc', ''))
        elif 'storage' in template_text:
            return excel_row.get('Storage', excel_row.get('storage', ''))
        elif 'product' in template_text:
            return excel_row.get('Product', excel_row.get('product', ''))
        else:
            return ''

    def _smart_map_barcode(self, template_value: str, excel_row: Dict[str, Any]) -> str:
        """Smart mapping of template barcode value to Excel columns"""
        # For barcodes, prefer IMEI data
        if 'imei' in template_value.lower():
            return excel_row.get('IMEI/sn', excel_row.get('imei', template_value))
        else:
            # Try to find any numeric column
            for key, value in excel_row.items():
                if isinstance(value, str) and value.isdigit() and len(value) > 10:
                    return value
            return template_value

    def _smart_map_qr(self, template_value: str, excel_row: Dict[str, Any]) -> str:
        """Smart mapping of template QR value to Excel columns"""
        # For QR codes, use IMEI or a combination of data
        imei = excel_row.get('IMEI/sn', excel_row.get('imei', ''))
        if imei:
            return f"https://example.com/device/{imei}"
        else:
            return template_value

    async def _render_text(self, draw: ImageDraw.Draw, text: str, x: int, y: int, width: int, height: int, props: Dict[str, Any]):
        """Render text component"""
        try:
            font_size = props.get('fontSize', 16)
            font_color = props.get('color', props.get('fontColor', '#000000'))
            font_family = props.get('fontFamily', 'Arial')
            font_weight = props.get('fontWeight', 'normal')
            
            # Try to load font
            try:
                font_path = f"{font_family.lower()}.ttf"
                font = ImageFont.truetype(font_path, font_size)
            except:
                font = ImageFont.load_default()
            
            # Convert hex color to RGB
            if font_color.startswith('#'):
                font_color = font_color[1:]
            rgb_color = tuple(int(font_color[i:i+2], 16) for i in (0, 2, 4))
            
            # Draw text
            draw.text((x, y), text, fill=rgb_color, font=font)
            
        except Exception as e:
            print(f"❌ Error rendering text: {e}")

    async def _render_barcode(self, value: str, x: int, y: int, width: int, height: int, base_img: Image.Image):
        """Render barcode component"""
        try:
            # Generate barcode
            barcode = Code128(value, writer=ImageWriter())
            barcode_img = barcode.render()
            
            # Resize to fit component dimensions
            barcode_img = barcode_img.resize((width, height), Image.Resampling.LANCZOS)
            
            # Paste onto base image
            base_img.paste(barcode_img, (x, y))
            
        except Exception as e:
            print(f"❌ Error rendering barcode: {e}")

    async def _render_qr(self, value: str, x: int, y: int, width: int, height: int, base_img: Image.Image):
        """Render QR code component"""
        try:
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(value)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Resize to fit component dimensions
            qr_img = qr_img.resize((width, height), Image.Resampling.LANCZOS)
            
            # Paste onto base image
            base_img.paste(qr_img, (x, y))
            
        except Exception as e:
            print(f"❌ Error rendering QR code: {e}")

    async def _render_rectangle(self, draw: ImageDraw.Draw, x: int, y: int, width: int, height: int, props: Dict[str, Any]):
        """Render rectangle component"""
        try:
            stroke_color = props.get('strokeColor', '#000000')
            stroke_width = props.get('strokeWidth', 1)
            fill_color = props.get('fillColor', 'transparent')
            
            # Convert colors
            if stroke_color.startswith('#'):
                stroke_color = stroke_color[1:]
            stroke_rgb = tuple(int(stroke_color[i:i+2], 16) for i in (0, 2, 4))
            
            if fill_color != 'transparent' and fill_color.startswith('#'):
                fill_color = fill_color[1:]
                fill_rgb = tuple(int(fill_color[i:i+2], 16) for i in (0, 2, 4))
            else:
                fill_rgb = None
            
            # Draw rectangle
            if fill_rgb:
                draw.rectangle([x, y, x + width, y + height], fill=fill_rgb, outline=stroke_rgb, width=stroke_width)
            else:
                draw.rectangle([x, y, x + width, y + height], outline=stroke_rgb, width=stroke_width)
                
        except Exception as e:
            print(f"❌ Error rendering rectangle: {e}")

    async def _render_circle(self, draw: ImageDraw.Draw, x: int, y: int, width: int, height: int, props: Dict[str, Any]):
        """Render circle component"""
        try:
            stroke_color = props.get('strokeColor', '#000000')
            stroke_width = props.get('strokeWidth', 1)
            fill_color = props.get('fillColor', 'transparent')
            
            # Convert colors
            if stroke_color.startswith('#'):
                stroke_color = stroke_color[1:]
            stroke_rgb = tuple(int(stroke_color[i:i+2], 16) for i in (0, 2, 4))
            
            if fill_color != 'transparent' and fill_color.startswith('#'):
                fill_color = fill_color[1:]
                fill_rgb = tuple(int(fill_color[i:i+2], 16) for i in (0, 2, 4))
            else:
                fill_rgb = None
            
            # Calculate circle center and radius
            center_x = x + width // 2
            center_y = y + height // 2
            radius = min(width, height) // 2
            
            # Draw circle
            if fill_rgb:
                draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], 
                           fill=fill_rgb, outline=stroke_rgb, width=stroke_width)
            else:
                draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], 
                           outline=stroke_rgb, width=stroke_width)
                
        except Exception as e:
            print(f"❌ Error rendering circle: {e}")

    async def _render_line(self, draw: ImageDraw.Draw, x: int, y: int, width: int, height: int, props: Dict[str, Any]):
        """Render line component"""
        try:
            stroke_color = props.get('strokeColor', '#000000')
            stroke_width = props.get('strokeWidth', 2)
            
            # Convert color
            if stroke_color.startswith('#'):
                stroke_color = stroke_color[1:]
            stroke_rgb = tuple(int(stroke_color[i:i+2], 16) for i in (0, 2, 4))
            
            # Draw line (horizontal for now)
            draw.line([x, y, x + width, y], fill=stroke_rgb, width=stroke_width)
                
        except Exception as e:
            print(f"❌ Error rendering line: {e}")

    def _log_barcode_generation(self, item: Dict[str, Any], filename: str, device_type: str, device_id: Optional[int], session_id: str):
        """Log barcode generation to database"""
        try:
            # Create barcode record
            record = BarcodeRecord(
                filename=filename,
                file_type="device_specific",
                generation_session=session_id,
                device_type=device_type,
                device_id=device_id,
                item_data=str(item),
                created_at=datetime.now().isoformat()
            )
            
            # Log to database (if database manager is available)
            # This would be implemented based on your database setup
            
        except Exception as e:
            print(f"⚠️ Error logging barcode generation: {str(e)}")
