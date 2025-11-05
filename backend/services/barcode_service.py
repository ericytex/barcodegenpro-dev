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
from services.archive_manager import ArchiveManager
from services.node_barcode_service import NodeBarcodeService
from models.database import BarcodeRecord
from models.template import TemplateManager


class BarcodeService:
    def __init__(self, output_dir: str = "downloads/barcodes", pdf_dir: str = "downloads/pdfs", logs_dir: str = "logs"):
        self.output_dir = output_dir
        self.pdf_dir = pdf_dir
        self.logs_dir = logs_dir
        self.imei_log_file = os.path.join(self.logs_dir, "imei_log.csv")
        self.archive_manager = ArchiveManager()
        self.node_barcode_service = NodeBarcodeService()
        self.create_output_directories()
        
    def create_output_directories(self):
        """Create output directories if they don't exist"""
        for directory in [self.output_dir, self.pdf_dir, self.logs_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)

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
                    os.rename(png_file, archive_path)
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
                    os.rename(pdf_file, archive_path)
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
        barcode_img = Image.open(buffer)
        barcode_img = barcode_img.resize((width, height), Image.Resampling.LANCZOS)
        
        return barcode_img
    
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
        imei_barcode_img = self.generate_code128_barcode(imei, width=barcode_width, height=barcode_height)
        label.paste(imei_barcode_img, (x_start, y_pos))
        
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
        
        # 2. Second Barcode (Box ID or IMEI2)
        if box_id:
            y_pos += 35  # Add vertical space for the next barcode
            box_barcode_img = self.generate_code128_barcode(box_id, width=barcode_width, height=barcode_height)
            label.paste(box_barcode_img, (x_start, y_pos))
            
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
            temp_img = Image.new('RGBA', (int(barcode_width * 2), 50), (0, 0, 0, 0))
            temp_draw = ImageDraw.Draw(temp_img)
            
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
            cropped = temp_img.crop((0, full_bbox[1], text_w, full_bbox[3]))
            # Stretch to fill barcode width
            stretched_img = cropped.resize((int(barcode_width), text_h), Image.Resampling.LANCZOS)
            label.paste(stretched_img, (int(x_start), int(y_pos)), mask=stretched_img)
            
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
        
        # Archive existing files before generating new ones
        archive_result = self.archive_existing_files(file_metadata=items)
        
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
                
                generated_files.append(filename)

                # Append to IMEI log if we generated a second IMEI
                if auto_generate_second_imei and second_value:
                    try:
                        self._append_imei_log(imei, second_value)
                    except Exception as e:
                        print(f"⚠️ Warning: Could not append to IMEI log: {e}")
                
                print(f"✅ Generated barcode {index + 1}/{len(items)}: {filename}")
                
            except Exception as e:
                print(f"❌ Error generating barcode for item {index + 1}: {e}")
                import traceback
                print(f"❌ Traceback: {traceback.format_exc()}")
                continue
        
        print(f"🎉 Barcode generation completed! Generated {len(generated_files)} files")
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
        # Archive existing files before generating new ones
        archive_result = self.archive_existing_files()
        
        # Create a consistent generation session ID
        session_id = f"template_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Load template
            template_manager = TemplateManager()
            template = template_manager.get_template(template_id)
            
            if not template:
                raise Exception(f"Template {template_id} not found")
            
            print(f"✅ Template loaded successfully: {template.name}")
            print(f"✅ Template components: {len(template.components)}")
            print(f"✅ Template canvas: {template.canvas_width}x{template.canvas_height}")
            
            # Read Excel file
            df = pd.read_excel(excel_file_path)
            items = df.to_dict('records')
            
            print(f"📊 Processing {len(items)} items with template {template_id}")
            print(f"📊 Template components: {len(template.components)}")
            
            generated_files = []
            
            for index, item in enumerate(items):
                try:
                    # Create barcode image using template
                    filename = f"barcode_{session_id}_{index + 1:04d}.png"
                    output_path = os.path.join(self.output_dir, filename)
                    
                    await self._create_barcode_with_json_template(template, item, output_path)
                    generated_files.append(output_path)
                    
                    print(f"✅ Generated barcode {index + 1}/{len(items)}: {filename}")
                    
                except Exception as e:
                    print(f"❌ Error generating barcode for item {index + 1}: {e}")
            
            # Create PDF
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            pdf_path = self.create_pdf_from_barcodes(pdf_filename, session_id=session_id)
            
            if pdf_path:
                print(f"📄 PDF created: {pdf_path}")
            
            return generated_files, session_id
            
        except Exception as e:
            print(f"❌ Error in template-based generation: {e}")
            return [], f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    def create_pdf_from_barcodes(self, pdf_filename: Optional[str] = None, 
                               grid_cols: int = 5, grid_rows: int = 12, # Dashboard default 5x12
                               session_id: str = None) -> Optional[str]:
        """Create a PDF with all generated barcode images arranged in a grid"""
        
        # Set default PDF filename if not provided
        if pdf_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            pdf_filename = f"barcode_collection_{timestamp}.pdf"
        
        # Use provided session_id or create a default one
        if session_id is None:
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        pdf_path = os.path.join(self.pdf_dir, pdf_filename)
        
        # Ensure PDF directory exists
        os.makedirs(self.pdf_dir, exist_ok=True)
        
        # Get all PNG files from the barcode directory
        barcode_files = glob.glob(os.path.join(self.output_dir, "*.png"))
        barcode_files.sort()  # Sort for consistent ordering
        
        print(f"🔍 Looking for PNG files in: {self.output_dir}")
        print(f"🔍 Found {len(barcode_files)} PNG files: {barcode_files}")
        
        if not barcode_files:
            print("❌ No barcode images found to include in PDF")
            return None
        
        print(f"📄 Creating PDF with {len(barcode_files)} barcode images...")
        print(f"📁 PDF will be saved as: {pdf_path}")
        
        # Create PDF canvas
        c = canvas.Canvas(pdf_path, pagesize=A4)
        page_width, page_height = A4
        
        # Calculate grid dimensions
        margin = 20  # Margin from page edges
        available_width = page_width - (2 * margin)
        available_height = page_height - (2 * margin)
        
        # Calculate cell dimensions
        cell_width = available_width / grid_cols
        cell_height = available_height / grid_rows
        
        # Calculate image size (leave some padding in each cell)
        image_padding = 2
        image_width = cell_width - (2 * image_padding)
        image_height = cell_height - (2 * image_padding)
        
        # Process images in batches of grid_cols * grid_rows
        images_per_page = grid_cols * grid_rows
        total_pages = (len(barcode_files) + images_per_page - 1) // images_per_page
        
        for page_num in range(total_pages):
            if page_num > 0:
                c.showPage()  # Start new page
            
            # Calculate which images to include on this page
            start_idx = page_num * images_per_page
            end_idx = min(start_idx + images_per_page, len(barcode_files))
            page_images = barcode_files[start_idx:end_idx]
            
            print(f"📄 Processing page {page_num + 1}/{total_pages} ({len(page_images)} images)")
            
            # Place images in grid
            for i, image_path in enumerate(page_images):
                # Calculate grid position
                row = i // grid_cols
                col = i % grid_cols
                
                # Calculate position on page
                x = margin + (col * cell_width) + image_padding
                y = page_height - margin - ((row + 1) * cell_height) + image_padding
                
                try:
                    # Add image to PDF
                    c.drawImage(ImageReader(image_path), x, y, 
                              width=image_width, height=image_height, 
                              preserveAspectRatio=True, anchor='sw')
                except Exception as e:
                    print(f"⚠️  Warning: Could not add image {os.path.basename(image_path)}: {e}")
        
        # Save the PDF
        c.save()
        
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
        
        pdf_record_id = self.archive_manager.db_manager.insert_barcode_record(pdf_record)
        print(f"✅ Saved PDF {pdf_filename} to database (ID: {pdf_record_id})")
        
        print(f"✅ PDF created successfully: {pdf_path}")
        print(f"📊 Total images included: {len(barcode_files)}")
        print(f"📄 Total pages: {total_pages}")
        print(f"📐 Grid layout: {grid_cols} columns × {grid_rows} rows")
        
        # Clean up PNG files immediately after PDF creation to prevent duplication
        try:
            png_files = glob.glob(os.path.join(self.output_dir, "*.png"))
            for png_file in png_files:
                try:
                    os.remove(png_file)
                    print(f"🧹 Cleaned up PNG file: {os.path.basename(png_file)}")
                except Exception as e:
                    print(f"⚠️  Warning: Could not remove PNG file {os.path.basename(png_file)}: {e}")
            if png_files:
                print(f"✅ Cleaned up {len(png_files)} PNG files after PDF creation")
        except Exception as e:
            print(f"⚠️  Warning: Error during PNG cleanup: {e}")
        
        return pdf_filename

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
                    generated_files.append(barcode_filename)
                    
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
            
            print(f"✅ Generated device barcode: {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error generating device barcode image: {str(e)}")
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

    async def _create_barcode_with_json_template(self, template, excel_row: Dict[str, Any], output_path: str):
        """Create barcode image using JSON template and Excel data with Python canvas renderer"""
        try:
            print(f"🎨 Using Python Canvas Renderer for template-based generation...")
            print(f"🔍 Template type: {type(template)}")
            print(f"🔍 Excel row: {excel_row}")
            
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
            
            # Create Python canvas renderer with reasonable scaling (like dashboard default)
            renderer = PythonCanvasRenderer(
                canvas_width=template_dict.get('canvas_width', 600),  # Use dashboard default
                canvas_height=template_dict.get('canvas_height', 200),  # Use dashboard default
                background_color=template_dict.get('background_color', '#ffffff'),
                scale_factor=2.0  # 2x scaling for good readability without size issues
            )
            
            print(f"✅ Python canvas renderer created")
            
            # Render the template with Excel data
            rendered_image = renderer.render_template(template_dict, excel_row)
            
            print(f"✅ Template rendered, image size: {rendered_image.size}")
            
            # Save the rendered image
            rendered_image.save(output_path, "PNG")
            print(f"✅ Generated barcode using Python Canvas Renderer: {output_path}")
            
        except Exception as e:
            print(f"❌ Error creating barcode with Python Canvas Renderer: {e}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            # Fallback to simple QR code
            await self._create_simple_qr_code("Error", output_path)

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
        else:
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
