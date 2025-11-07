"""
Python Canvas Renderer for Barcode Generation
Recreates the frontend canvas functionality in Python for proper sizing control
"""

import os
import io
import re
from typing import Dict, Any, Optional, List
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
import logging

logger = logging.getLogger(__name__)

class PythonCanvasRenderer:
    """Python implementation of the frontend canvas for barcode generation"""
    
    def __init__(self, canvas_width: int = 800, canvas_height: int = 600, 
                 background_color: str = '#ffffff', scale_factor: float = 2.0):
        """
        Initialize the Python canvas renderer
        
        Args:
            canvas_width: Width of the canvas
            canvas_height: Height of the canvas
            background_color: Background color of the canvas
            scale_factor: Factor to scale up the output for better readability
        """
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.background_color = background_color
        self.scale_factor = scale_factor
        
        # Use exact canvas dimensions - no scaling for 1:1 match with design
        # When scale_factor=1.0, render at exact canvas size
        self.scaled_width = canvas_width
        self.scaled_height = canvas_height
        
        # Font cache for performance
        self.font_cache = {}
        
        # Create the main canvas at exact canvas dimensions
        self.canvas = Image.new('RGB', (self.scaled_width, self.scaled_height), background_color)
        self.draw = ImageDraw.Draw(self.canvas)
        
        logger.info(f"🎨 Python Canvas Renderer initialized: {self.scaled_width}x{self.scaled_height} (scale: {scale_factor}x, exact match)")
    
    def get_font(self, font_size: int, font_weight: str = 'normal', font_family: str = 'Arial') -> ImageFont.FreeTypeFont:
        """Get font with caching for performance"""
        cache_key = f"{font_size}_{font_weight}_{font_family}"
        
        if cache_key not in self.font_cache:
            try:
                # Map font family names to system font paths
                font_family_lower = font_family.lower() if font_family else 'arial'
                
                # Define font family mappings
                font_paths_map = {
                    'arial': [
                        '/System/Library/Fonts/Supplemental/Arial.ttf',  # macOS
                        '/System/Library/Fonts/Arial.ttf',  # macOS (older)
                        'C:/Windows/Fonts/arial.ttf',  # Windows
                        'C:/Windows/Fonts/Arial.ttf',  # Windows
                        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',  # Linux
                        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',  # Linux fallback
                    ],
                    'helvetica': [
                        '/System/Library/Fonts/Helvetica.ttc',  # macOS
                        '/System/Library/Fonts/Supplemental/Helvetica.ttc',  # macOS
                        'C:/Windows/Fonts/arial.ttf',  # Windows fallback
                        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',  # Linux
                    ],
                    'times': [
                        '/System/Library/Fonts/Supplemental/Times New Roman.ttf',  # macOS
                        'C:/Windows/Fonts/times.ttf',  # Windows
                        'C:/Windows/Fonts/timesnr.ttf',  # Windows
                        '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',  # Linux
                    ],
                    'times new roman': [
                        '/System/Library/Fonts/Supplemental/Times New Roman.ttf',  # macOS
                        'C:/Windows/Fonts/times.ttf',  # Windows
                        'C:/Windows/Fonts/timesnr.ttf',  # Windows
                        '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',  # Linux
                    ],
                    'courier': [
                        '/System/Library/Fonts/Supplemental/Courier New.ttf',  # macOS
                        'C:/Windows/Fonts/cour.ttf',  # Windows
                        'C:/Windows/Fonts/courbd.ttf',  # Windows
                        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',  # Linux
                    ],
                    'courier new': [
                        '/System/Library/Fonts/Supplemental/Courier New.ttf',  # macOS
                        'C:/Windows/Fonts/cour.ttf',  # Windows
                        'C:/Windows/Fonts/courbd.ttf',  # Windows
                        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',  # Linux
                    ],
                }
                
                # Get font paths for the requested family, or default to Arial
                font_paths = font_paths_map.get(font_family_lower, font_paths_map['arial'])
                
                font_path = None
                for path in font_paths:
                    if os.path.exists(path):
                        font_path = path
                        break
                
                if font_path:
                    # Handle font weight (bold)
                    if font_weight == 'bold' or font_weight == '700':
                        # Try to find bold variant
                        bold_paths = [
                            font_path.replace('.ttf', '-Bold.ttf'),
                            font_path.replace('.ttf', 'Bold.ttf'),
                            font_path.replace('Regular', 'Bold'),
                            font_path.replace('regular', 'bold'),
                        ]
                        for bold_path in bold_paths:
                            if os.path.exists(bold_path):
                                font_path = bold_path
                                break
                    
                    # Scale fonts to match browser visual rendering
                    # PIL fonts render smaller visually than browser fonts for the same pixel size
                    # We use a 1.5x multiplier to match visual appearance
                    font_scale = 1.5  # Match browser font visual size
                    scaled_font_size = int(font_size * font_scale)
                    self.font_cache[cache_key] = ImageFont.truetype(font_path, scaled_font_size)
                    logger.info(f"✅ Loaded font: {font_path} (family: {font_family}, size: {scaled_font_size} (from {font_size} * {font_scale}), weight: {font_weight})")
                else:
                    # Fallback to default font
                    # Use font size directly - no scaling
                    self.font_cache[cache_key] = ImageFont.load_default()
                    logger.warning(f"⚠️ Font not found: {font_family}, using default font for size {font_size}")
                    
            except Exception as e:
                logger.error(f"❌ Font loading error: {e}")
                self.font_cache[cache_key] = ImageFont.load_default()
        
        return self.font_cache[cache_key]
    
    def extract_text_value(self, component: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Extract text value from component properties or Excel data with explicit mapping priority"""
        properties = component.get('properties', {})
        
        # PRIORITY 1: Check if component has explicit mapping information from frontend
        mapping = component.get('mapping', {})
        if mapping and mapping.get('isConnected'):
            if mapping.get('columnName'):
                # Get value from Excel column (case-insensitive matching)
                excel_value = self._get_excel_value_case_insensitive(excel_row, mapping['columnName'])
                if excel_value:
                    # Apply extraction rule if present
                    extraction_rule = mapping.get('extractionRule', {})
                    if extraction_rule:
                        extracted_value = self.apply_extraction_rule(str(excel_value), extraction_rule)
                        print(f"🎯 Explicit mapping: {mapping['columnName']} -> '{extracted_value}' (rule: {extraction_rule.get('type', 'direct')})")
                        return extracted_value
                    print(f"🎯 Explicit mapping: {mapping['columnName']} -> '{excel_value}' (direct)")
                    return str(excel_value)
            elif mapping.get('staticValue'):
                # Use static value
                print(f"🎯 Static value: '{mapping['staticValue']}'")
                return mapping['staticValue']
        
        # PRIORITY 2: Fallback to inference-based mapping (for backward compatibility)
        print(f"⚠️ No explicit mapping found, using inference for component at ({component.get('x', 0)}, {component.get('y', 0)})")
        component_text = properties.get('text', '')
        component_x = component.get('x', 0)
        component_y = component.get('y', 0)
        
        excel_columns = list(excel_row.keys())

        # Specific mapping for the actual Model value (e.g., "A669L")
        # This component is at x=100, y=90 and its text matches a model pattern
        if re.match(r'^[A-Z]\d{2,3}L$', component_text) and 90 <= component_x <= 110 and 80 <= component_y <= 100:
            model_col = self._find_column_by_keywords(excel_columns, ['model', 'device_model', 'product_model'])
            if model_col:
                return str(excel_row.get(model_col, ''))
        
        # Specific mapping for Color (e.g., "SAPPHIRE BLACK")
        # This component is at x=180, y=90
        if ("black" in component_text.lower() or "white" in component_text.lower() or "blue" in component_text.lower() or "gold" in component_text.lower()) and 170 <= component_x <= 190 and 80 <= component_y <= 100:
            product_col = self._find_column_by_keywords(excel_columns, ['product', 'device', 'item'])
            if product_col:
                product_value = str(excel_row.get(product_col, ''))
                # Extract color from product string like "GALAXY A25 128+4 WHITE"
                match = re.search(r'\b(BLACK|WHITE|BLUE|GOLD)\b', product_value, re.IGNORECASE)
                if match:
                    return match.group(1).upper()
                return component_text # Fallback to original if color not found
        
        # Specific mapping for IMEI text component (e.g., "IMEI/SN:350544301197847")
        # This component is likely at x=45, y=163 (below the barcode)
        if "imei/sn:" in component_text.lower() and 40 <= component_x <= 60 and 160 <= component_y <= 180:
            imei_col = self._find_column_by_keywords(excel_columns, ['imei', 'imei/sn', 'serial', 'sn'])
            if imei_col:
                return f"IMEI/SN:{str(excel_row.get(imei_col, ''))}"
        
        # Specific mapping for VC (e.g., "VC:874478")
        # This component is at x=45, y=192
        if "vc:" in component_text.lower() and 40 <= component_x <= 60 and 180 <= component_y <= 200:
            vc_col = self._find_column_by_keywords(excel_columns, ['vc', 'verification_code', 'code'])
            if vc_col:
                vc_value = str(excel_row.get(vc_col, ''))
                return f"VC:{vc_value}"

        # Fallback to component properties if no specific mapping or smart mapping applies
        print(f"⚠️ Using fallback text: '{component_text}'")
        return component_text
    
    def _find_column_by_keywords(self, columns: List[str], keywords: List[str]) -> Optional[str]:
        """Find a column that matches any of the given keywords"""
        for column in columns:
            column_lower = column.lower()
            for keyword in keywords:
                if keyword.lower() in column_lower:
                    return column
        return None
    
    def _get_excel_value_case_insensitive(self, excel_row: Dict[str, Any], column_name: str) -> Any:
        """Get Excel value with case-insensitive column name matching"""
        if not column_name:
            return ''
        
        # First try exact match (fastest)
        if column_name in excel_row:
            return excel_row[column_name]
        
        # Try case-insensitive match
        column_name_lower = column_name.lower()
        for key, value in excel_row.items():
            if key.lower() == column_name_lower:
                return value
        
        # Try partial match (e.g., "IMEI/SN" matches "IMEI/SN" or "imei/sn")
        for key, value in excel_row.items():
            if key.lower().replace('/', '').replace('_', '').replace('-', '') == column_name_lower.replace('/', '').replace('_', '').replace('-', ''):
                return value
        
        return ''
    
    def _format_barcode_value(self, template_value: str, excel_value: str) -> str:
        """Format barcode value to preserve template format (e.g., "IMEI 1 : {value}")"""
        if not template_value or not excel_value:
            return excel_value or template_value
        
        # Check if template has a pattern like "IMEI 1 : 350544301197847"
        # Try to extract the prefix (e.g., "IMEI 1 : ") and preserve it
        import re
        
        # Pattern: text before digits (e.g., "IMEI 1 : " before "350544301197847")
        # Match patterns like "IMEI 1 :", "IMEI:", "SN:", etc.
        prefix_pattern = r'^([^0-9]+?)(\s*[:\-]\s*)?(\d+.*)$'
        match = re.match(prefix_pattern, template_value)
        
        if match:
            prefix = match.group(1).strip()
            separator = match.group(2) if match.group(2) else ' : '
            # Preserve the format: prefix + separator + excel_value
            formatted = f"{prefix}{separator}{excel_value}"
            return formatted
        
        # If no pattern found, just return the excel value
        return excel_value
    
    def apply_extraction_rule(self, value: str, rule: Dict[str, Any]) -> str:
        """Apply text extraction rule to a value"""
        if not rule or not value:
            return value
        
        rule_type = rule.get('type', 'direct')
        
        try:
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
                    # Handle JavaScript-style regex patterns (e.g., "/pattern/gi" -> "pattern")
                    if regex_pattern.startswith('/') and '/' in regex_pattern[1:]:
                        # Extract pattern from JavaScript format: /pattern/flags
                        parts = regex_pattern[1:].rsplit('/', 1)
                        if len(parts) == 2:
                            pattern = parts[0]
                            flags_str = parts[1].lower()
                            
                            # Convert JavaScript flags to Python flags
                            flags = 0
                            if 'i' in flags_str:
                                flags |= re.IGNORECASE
                            if 'g' in flags_str:
                                # Python doesn't have global flag, but we can handle it
                                pass
                            
                            try:
                                # Use raw string to handle escape sequences properly
                                match = re.search(pattern, value, flags)
                                return match.group(0) if match else value
                            except re.error as e:
                                print(f"❌ Regex error: {e} for pattern: {pattern}")
                                return value
                        else:
                            # Fallback: try to use the pattern as-is
                            try:
                                match = re.search(regex_pattern, value)
                                return match.group(0) if match else value
                            except re.error:
                                return value
                    else:
                        # Use pattern as-is (already in Python format)
                        try:
                            match = re.search(regex_pattern, value)
                            return match.group(0) if match else value
                        except re.error:
                            return value
                return value
            elif rule_type == 'manual':
                return rule.get('value', value)
            elif rule_type == 'position_based':
                # New intelligent position-based extraction
                return self._extract_by_position(value, rule)
            elif rule_type == 'context_based':
                # New context-aware extraction
                return self._extract_by_context(value, rule)
            else:
                return value
        except Exception as e:
            logger.error(f"❌ Extraction rule error: {e}")
            return value
    
    def _extract_by_position(self, value: str, rule: Dict[str, Any]) -> str:
        """Extract data based on position patterns (e.g., 'after MODEL:', 'before GB')"""
        if not value:
            return value
            
        position_type = rule.get('position_type', 'after')
        marker = rule.get('marker', '')
        offset = rule.get('offset', 0)
        
        try:
            if position_type == 'after':
                # Find text after a marker
                if marker:
                    parts = value.split(marker, 1)
                    if len(parts) > 1:
                        after_text = parts[1].strip()
                        words = after_text.split()
                        if offset < len(words):
                            return words[offset]
                return value
            elif position_type == 'before':
                # Find text before a marker
                if marker:
                    parts = value.split(marker, 1)
                    if len(parts) > 0:
                        before_text = parts[0].strip()
                        words = before_text.split()
                        if offset < len(words):
                            return words[-(offset + 1)]
                return value
            elif position_type == 'between':
                # Find text between two markers
                start_marker = rule.get('start_marker', '')
                end_marker = rule.get('end_marker', '')
                if start_marker and end_marker:
                    start_idx = value.find(start_marker)
                    end_idx = value.find(end_marker)
                    if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                        between_text = value[start_idx + len(start_marker):end_idx].strip()
                        return between_text
                return value
            elif position_type == 'after_storage':
                # NEW: Extract everything after storage pattern (digit+digit)
                import re
                storage_pattern = r'\b(\d+\+\d+)\b'
                match = re.search(storage_pattern, value)
                if match:
                    # Find the end position of the storage pattern
                    storage_end = match.end()
                    # Extract everything after the storage pattern
                    after_storage = value[storage_end:].strip()
                    return after_storage
                return value
            elif position_type == 'before_storage':
                # NEW: Extract everything before storage pattern
                import re
                storage_pattern = r'\b(\d+\+\d+)\b'
                match = re.search(storage_pattern, value)
                if match:
                    # Find the start position of the storage pattern
                    storage_start = match.start()
                    # Extract everything before the storage pattern
                    before_storage = value[:storage_start].strip()
                    return before_storage
                return value
            elif position_type == 'last_segment_pattern':
                # NEW: Extract integer+integer pattern from last segment (after last space)
                import re
                last_space_index = value.rfind(' ')
                if last_space_index != -1:
                    # Get everything after the last space
                    last_segment = value[last_space_index + 1:].strip()
                    # Try to match integer+integer pattern (like "64+2", "128+4")
                    pattern_match = re.search(r'\b(\d+\+\d+)\b', last_segment)
                    if pattern_match:
                        # Return the integer+integer pattern
                        return pattern_match.group(1)
                    # If no pattern found, return the entire last segment
                    return last_segment
                # If no space found, try to match pattern in the whole string
                pattern_match = re.search(r'\b(\d+\+\d+)\b', value)
                if pattern_match:
                    return pattern_match.group(1)
                # Fallback: return the whole value
                return value
            elif position_type == 'first_word':
                # Extract first word
                words = value.strip().split()
                return words[0] if words else value
            elif position_type == 'last_word':
                # Extract last word
                words = value.strip().split()
                return words[-1] if words else value
            elif position_type == 'word_position':
                # Extract word at specific position (0-indexed) - ONLY that word
                trimmed_value = value.strip()
                if not trimmed_value:
                    return value
                
                # Split by whitespace and filter out empty strings (handles multiple spaces, tabs, etc.)
                words = [w for w in trimmed_value.split() if w]
                # Support both camelCase and snake_case
                word_pos = rule.get('wordPosition') or rule.get('word_position', 0)
                
                if 0 <= word_pos < len(words):
                    extracted_word = words[word_pos]
                    print(f"[word_position extraction] Input: '{value}', Position: {word_pos}, Words: {words}, Extracted: '{extracted_word}'")
                    return extracted_word  # Return ONLY the word at this position
                
                # If position is out of bounds, log warning and return empty string
                print(f"[word_position extraction] WARNING: Position {word_pos} out of bounds for value '{value}' with {len(words)} words")
                return ''
            elif position_type == 'word_range':
                # Extract range of words
                words = value.strip().split()
                start_word = rule.get('startWord', 0)
                end_word = rule.get('endWord', len(words) - 1)
                if 0 <= start_word <= end_word < len(words):
                    return ' '.join(words[start_word:end_word + 1])
                return value
            else:
                return value
        except Exception as e:
            print(f"❌ Position-based extraction error: {e}")
            return value
    
    def _extract_by_context(self, value: str, rule: Dict[str, Any]) -> str:
        """Extract data based on context patterns (e.g., storage patterns, color patterns)"""
        if not value:
            return value
            
        context_type = rule.get('context_type', 'storage')
        
        try:
            if context_type == 'storage':
                # Look for storage patterns like "64+3", "128+4", etc.
                import re
                storage_pattern = r'\b(\d+\+\d+)\b'
                match = re.search(storage_pattern, value)
                return match.group(1) if match else value
            elif context_type == 'color':
                # Look for color patterns
                import re
                color_pattern = r'\b(BLACK|WHITE|BLUE|GOLD|SILVER|SLEEK|IRIS|TITANIUM|SHADOW|RED|GREEN|PURPLE|PINK|ORANGE|YELLOW|BROWN|GRAY|GREY)\b'
                match = re.search(color_pattern, value, re.IGNORECASE)
                return match.group(1) if match else value
            elif context_type == 'model':
                # Look for model patterns like "A669L", "X6725B", etc.
                import re
                model_pattern = r'\b([A-Z]\d{2,3}[A-Z]?)\b'
                match = re.search(model_pattern, value)
                return match.group(1) if match else value
            elif context_type == 'imei':
                # Look for IMEI patterns (15-digit numbers)
                import re
                imei_pattern = r'\b(\d{15})\b'
                match = re.search(imei_pattern, value)
                return match.group(1) if match else value
            else:
                return value
        except Exception as e:
            print(f"❌ Context-based extraction error: {e}")
            return value
    
    def extract_barcode_value(self, component: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Extract barcode value from component properties or Excel data with explicit mapping priority"""
        properties = component.get('properties', {})
        template_value = properties.get('value', '')  # Original template value (e.g., "IMEI 1 : 350544301197847")
        
        # PRIORITY 1: Check if component has explicit mapping information from frontend
        mapping = component.get('mapping', {})
        if mapping and mapping.get('isConnected'):
            if mapping.get('columnName'):
                # Get value from Excel column (case-insensitive matching)
                excel_value = self._get_excel_value_case_insensitive(excel_row, mapping['columnName'])
                if excel_value:
                    # Apply extraction rule if present
                    extraction_rule = mapping.get('extractionRule', {})
                    if extraction_rule:
                        extracted_value = self.apply_extraction_rule(str(excel_value), extraction_rule)
                        # Preserve template format if it contains a placeholder pattern
                        formatted_value = self._format_barcode_value(template_value, extracted_value)
                        print(f"🎯 Barcode explicit mapping: {mapping['columnName']} -> '{formatted_value}' (rule: {extraction_rule.get('type', 'direct')})")
                        return formatted_value
                    # Preserve template format if it contains a placeholder pattern
                    formatted_value = self._format_barcode_value(template_value, str(excel_value))
                    print(f"🎯 Barcode explicit mapping: {mapping['columnName']} -> '{formatted_value}' (direct)")
                    return formatted_value
            elif mapping.get('staticValue'):
                # Use static value
                print(f"🎯 Barcode static value: '{mapping['staticValue']}'")
                return mapping['staticValue']
        
        # PRIORITY 2: Fallback to inference-based mapping (for backward compatibility)
        print(f"⚠️ No explicit barcode mapping found, using inference for component at ({component.get('x', 0)}, {component.get('y', 0)})")
        component_x = component.get('x', 0)
        component_y = component.get('y', 0)
        
        # Barcode components are usually positioned around x=44, y=111
        if 40 <= component_x <= 60 and 100 <= component_y <= 120:
            # This is likely the main IMEI barcode
            imei_col = self._find_column_by_keywords(list(excel_row.keys()), ['imei', 'imei/sn', 'serial', 'sn'])
            if imei_col:
                imei_value = str(excel_row.get(imei_col, ''))
                print(f"🎯 Barcode inference: IMEI column '{imei_col}' -> '{imei_value}'")
                return imei_value
        
        # Fallback to component properties
        fallback_value = properties.get('value', '123456789012')
        print(f"⚠️ Barcode using fallback value: '{fallback_value}'")
        return fallback_value
    
    def extract_qr_value(self, component: Dict[str, Any], excel_row: Dict[str, Any]) -> str:
        """Extract QR code value from component properties or Excel data with explicit mapping priority"""
        properties = component.get('properties', {})
        
        # PRIORITY 1: Check if component has explicit mapping information from frontend
        mapping = component.get('mapping', {})
        if mapping and mapping.get('isConnected'):
            if mapping.get('columnName'):
                # Get value from Excel column (case-insensitive matching)
                excel_value = self._get_excel_value_case_insensitive(excel_row, mapping['columnName'])
                if excel_value:
                    # Apply extraction rule if present
                    extraction_rule = mapping.get('extractionRule', {})
                    if extraction_rule:
                        extracted_value = self.apply_extraction_rule(str(excel_value), extraction_rule)
                        print(f"🎯 QR explicit mapping: {mapping['columnName']} -> '{extracted_value}' (rule: {extraction_rule.get('type', 'direct')})")
                        return extracted_value
                    print(f"🎯 QR explicit mapping: {mapping['columnName']} -> '{excel_value}' (direct)")
                    return str(excel_value)
            elif mapping.get('staticValue'):
                # Use static value
                print(f"🎯 QR static value: '{mapping['staticValue']}'")
                return mapping['staticValue']
        
        # PRIORITY 2: Fallback to inference-based mapping (for backward compatibility)
        print(f"⚠️ No explicit QR mapping found, using inference for component at ({component.get('x', 0)}, {component.get('y', 0)})")
        component_x = component.get('x', 0)
        component_y = component.get('y', 0)
        
        # QR components are usually positioned around x=265, y=115
        if 250 <= component_x <= 280 and 100 <= component_y <= 130:
            # This is likely the main QR code - create URL from IMEI
            imei_col = self._find_column_by_keywords(list(excel_row.keys()), ['imei', 'imei/sn', 'serial', 'sn'])
            if imei_col:
                imei_value = str(excel_row.get(imei_col, ''))
                qr_url = f"https://example.com/device/{imei_value}"
                print(f"🎯 QR inference: IMEI column '{imei_col}' -> '{qr_url}'")
                return qr_url
        
        # Fallback to component properties
        fallback_value = properties.get('value', 'https://example.com')
        print(f"⚠️ QR using fallback value: '{fallback_value}'")
        return fallback_value
    
    def render_text_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a text component"""
        try:
            # Use exact positions and dimensions from component - no scaling
            # This ensures 1:1 match with canvas design
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Extract text value
            text = self.extract_text_value(component, excel_row)
            if not text:
                logger.warning(f"⚠️ No text value for component {component.get('id', 'unknown')}")
                return
            
            # Get font properties
            font_size = properties.get('fontSize', 12)
            color = properties.get('color', '#000000')
            font_weight = properties.get('fontWeight', 'normal')
            font_family = properties.get('fontFamily', 'Arial')  # Get font family from properties
            letter_spacing = properties.get('letterSpacing', 0)  # Get letter spacing
            
            # Get font (with font family support)
            font = self.get_font(font_size, font_weight, font_family)
            
            # Draw text with letter spacing support
            if letter_spacing != 0:
                self._draw_text_with_letter_spacing(text, x, y, width, height, font, color, letter_spacing)
            else:
                # Draw text normally (no letter spacing)
                self.draw.text((x, y), text, font=font, fill=color)
            
            logger.debug(f"✅ Rendered text: '{text}' at ({x}, {y}) with letter spacing: {letter_spacing}")
            
        except Exception as e:
            logger.error(f"❌ Text rendering error: {e}")
    
    def _draw_text_with_letter_spacing(self, text: str, x: int, y: int, width: int, height: int, 
                                       font: ImageFont.FreeTypeFont, color: str, letter_spacing: float):
        """Draw text with letter spacing by rendering characters individually"""
        try:
            current_x = x
            current_y = y
            line_height = font.size if hasattr(font, 'size') else font.getsize('A')[1]
            
            # Split text into words for word wrapping
            words = text.split(' ')
            
            for word in words:
                # Calculate word width with letter spacing
                word_width = 0
                for i, char in enumerate(word):
                    if hasattr(font, 'getsize'):
                        char_width = font.getsize(char)[0]
                    else:
                        # For newer Pillow versions
                        bbox = font.getbbox(char)
                        char_width = bbox[2] - bbox[0]
                    word_width += char_width
                    if i < len(word) - 1:  # Not the last character
                        word_width += letter_spacing
                
                # Check if word fits on current line
                if current_x + word_width > x + width and current_x > x:
                    # Move to next line
                    current_x = x
                    current_y += line_height
                    
                    # Check if we've exceeded height
                    if current_y + line_height > y + height:
                        break
                
                # Render word character by character with letter spacing
                for char in word:
                    self.draw.text((current_x, current_y), char, font=font, fill=color)
                    
                    # Get character width and advance position
                    if hasattr(font, 'getsize'):
                        char_width = font.getsize(char)[0]
                    else:
                        # For newer Pillow versions
                        bbox = font.getbbox(char)
                        char_width = bbox[2] - bbox[0]
                    
                    current_x += char_width + letter_spacing
                
                # Add space after word (except for last word)
                if words.index(word) < len(words) - 1:
                    if hasattr(font, 'getsize'):
                        space_width = font.getsize(' ')[0]
                    else:
                        bbox = font.getbbox(' ')
                        space_width = bbox[2] - bbox[0]
                    current_x += space_width
                    
        except Exception as e:
            logger.error(f"❌ Error rendering text with letter spacing: {e}")
            # Fallback to normal text rendering
            self.draw.text((x, y), text, font=font, fill=color)
    
    def render_barcode_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a barcode component"""
        try:
            # Use exact positions and dimensions - no scaling for 1:1 match
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Extract barcode value
            barcode_value = self.extract_barcode_value(component, excel_row)
            if not barcode_value:
                logger.warning(f"⚠️ No barcode value for component {component.get('id', 'unknown')}")
                return
            
            # Get barcode format
            barcode_format = properties.get('format', 'CODE128')
            
            # Generate barcode
            if barcode_format.upper() == 'CODE128':
                code = Code128(barcode_value, writer=ImageWriter())
                
                # Create barcode image
                barcode_buffer = io.BytesIO()
                code.write(barcode_buffer, options={
                    'module_width': min(4, max(1, width // len(barcode_value))) if len(barcode_value) > 0 else 2,
                    'module_height': min(height - 20, 100),  # Limit height to prevent huge images
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
                
                # Paste to canvas
                self.canvas.paste(barcode_img, (x, y))
                
                logger.debug(f"✅ Rendered barcode: '{barcode_value}' at ({x}, {y})")
            else:
                logger.warning(f"⚠️ Unsupported barcode format: {barcode_format}")
                
        except Exception as e:
            logger.error(f"❌ Barcode rendering error: {e}")
    
    def render_qr_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a QR code component - matches frontend approach exactly"""
        try:
            # Use exact positions and dimensions - no scaling for 1:1 match
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Extract QR value
            qr_value = self.extract_qr_value(component, excel_row)
            if not qr_value:
                logger.warning(f"⚠️ No QR value for component {component.get('id', 'unknown')}")
                return
            
            # Match frontend approach: generate QR at Math.min(width, height) with margin=0
            # Frontend uses: width: Math.min(component.width, component.height), margin: 0
            target_size = min(width, height)
            
            # Get error correction level from properties (default 'M' to match frontend)
            error_level = properties.get('errorCorrectionLevel', 'M')
            error_correction_map = {
                'L': qrcode.constants.ERROR_CORRECT_L,
                'M': qrcode.constants.ERROR_CORRECT_M,
                'Q': qrcode.constants.ERROR_CORRECT_Q,
                'H': qrcode.constants.ERROR_CORRECT_H,
            }
            error_correction = error_correction_map.get(error_level, qrcode.constants.ERROR_CORRECT_M)
            
            # Match frontend approach: generate QR at target_size with border=0 (margin=0)
            # Strategy: Generate QR with auto-fit to determine version, then calculate box_size
            # to get as close as possible to target_size, then resize if needed
            
            # Step 1: Generate QR with auto-fit to determine the required version
            qr_temp = qrcode.QRCode(
                version=None,  # Auto-determine version based on data
                error_correction=error_correction,
                box_size=1,  # Temporary, we'll recalculate
                border=0,  # Match frontend margin=0
            )
            qr_temp.add_data(qr_value)
            qr_temp.make(fit=True)
            
            # Get the version that was determined
            # QR code version determines the number of modules (squares)
            # Version 1 = 21x21 modules, Version 2 = 25x25, etc.
            # Formula: modules = (version - 1) * 4 + 21
            qr_version = qr_temp.version
            modules_per_side = (qr_version - 1) * 4 + 21
            
            # Step 2: Calculate box_size to get close to target_size
            # With border=0, the QR image size = modules_per_side * box_size
            # So: box_size = target_size / modules_per_side
            estimated_box_size = max(1, int(target_size / modules_per_side))
            
            # Step 3: Generate QR with calculated box_size
            qr = qrcode.QRCode(
                version=qr_version,
                error_correction=error_correction,
                box_size=estimated_box_size,
                border=0,  # Match frontend margin=0
            )
            qr.add_data(qr_value)
            qr.make(fit=False)  # Use the version we determined, don't refit
            
            # Create QR code image
            qr_img = qr.make_image(fill_color='black', back_color='white')
            
            # Step 4: Resize to exact target_size (like frontend does)
            # Frontend generates at exact width, so we resize to match
            qr_img = qr_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            
            # Now place the QR code at the component position
            # If component is not square, we center it or scale to fit
            # Frontend draws it at (x, y) with (width, height), so we should do the same
            if width == height:
                # Square component: paste directly
                self.canvas.paste(qr_img, (x, y))
            else:
                # Non-square: resize to fit component dimensions (like frontend does)
                qr_img_final = qr_img.resize((width, height), Image.Resampling.LANCZOS)
                self.canvas.paste(qr_img_final, (x, y))
            
            logger.debug(f"✅ Rendered QR code: '{qr_value}' at ({x}, {y}) size {width}x{height}, QR size {target_size}x{target_size}")
            
        except Exception as e:
            logger.error(f"❌ QR code rendering error: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
    
    def render_rectangle_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a rectangle component"""
        try:
            # Use exact positions and dimensions - no scaling for 1:1 match
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Get rectangle properties
            fill_color = properties.get('fillColor', '#ffffff')
            stroke_color = properties.get('strokeColor', '#000000')
            stroke_width = properties.get('strokeWidth', 1)  # No scaling
            
            # Draw rectangle
            if fill_color != 'transparent':
                self.draw.rectangle([x, y, x + width, y + height], fill=fill_color)
            
            if stroke_width > 0:
                self.draw.rectangle([x, y, x + width, y + height], outline=stroke_color, width=stroke_width)
            
            # Handle text inside rectangle
            text_content = properties.get('text', '')
            if text_content:
                # Get text value from mapping or use static value
                text_value = self.extract_text_value(component, excel_row)
                
                if text_value:
                    # Get text properties - scale fonts to match browser visual rendering
                    base_font_size = properties.get('fontSize', 16)
                    font_scale = 1.5  # Match browser font visual size
                    font_size = int(base_font_size * font_scale)
                    font_color = properties.get('color', '#000000')
                    font_weight = properties.get('fontWeight', 'normal')
                    
                    # Load font
                    font_paths = [
                        '/System/Library/Fonts/Helvetica.ttc',
                        '/System/Library/Fonts/Arial.ttf',
                        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
                    ]
                    
                    try:
                        if font_weight == 'bold':
                            font = ImageFont.truetype(font_paths[0], font_size)
                        else:
                            font = ImageFont.truetype(font_paths[0], font_size)
                    except:
                        try:
                            font = ImageFont.load_default()
                        except:
                            font = None
                    
                    if font:
                        # Center text in rectangle
                        bbox = self.draw.textbbox((0, 0), text_value, font=font)
                        text_width = bbox[2] - bbox[0]
                        text_height = bbox[3] - bbox[1]
                        
                        text_x = x + (width - text_width) // 2
                        text_y = y + (height - text_height) // 2
                        
                        self.draw.text((text_x, text_y), text_value, fill=font_color, font=font)
                        logger.debug(f"✅ Rendered rectangle text: '{text_value}' at ({text_x}, {text_y})")
            
            logger.debug(f"✅ Rendered rectangle at ({x}, {y})")
            
        except Exception as e:
            logger.error(f"❌ Rectangle rendering error: {e}")
    
    def render_line_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a line component"""
        try:
            # Use exact positions and dimensions - no scaling for 1:1 match
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Get line properties
            stroke_color = properties.get('strokeColor', '#000000')
            stroke_width = properties.get('strokeWidth', 1)  # No scaling
            
            # Draw line
            self.draw.line([x, y, x + width, y + height], fill=stroke_color, width=stroke_width)
            
            logger.debug(f"✅ Rendered line at ({x}, {y})")
            
        except Exception as e:
            logger.error(f"❌ Line rendering error: {e}")
    
    def render_circle_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a circle component"""
        try:
            # Use exact positions and dimensions - no scaling for 1:1 match
            x = component['x']
            y = component['y']
            width = component['width']
            height = component['height']
            properties = component.get('properties', {})
            
            # Get circle properties
            fill_color = properties.get('fillColor', '#ffffff')
            stroke_color = properties.get('strokeColor', '#000000')
            stroke_width = properties.get('strokeWidth', 1)  # No scaling
            
            # Draw circle (as ellipse)
            if fill_color != 'transparent':
                self.draw.ellipse([x, y, x + width, y + height], fill=fill_color)
            
            if stroke_width > 0:
                self.draw.ellipse([x, y, x + width, y + height], outline=stroke_color, width=stroke_width)
            
            logger.debug(f"✅ Rendered circle at ({x}, {y})")
            
        except Exception as e:
            logger.error(f"❌ Circle rendering error: {e}")
    
    def render_component(self, component: Dict[str, Any], excel_row: Dict[str, Any]):
        """Render a single component based on its type"""
        component_type = component.get('type', '')
        
        try:
            if component_type == 'text':
                self.render_text_component(component, excel_row)
            elif component_type == 'barcode':
                self.render_barcode_component(component, excel_row)
            elif component_type == 'qr':
                self.render_qr_component(component, excel_row)
            elif component_type == 'rectangle':
                self.render_rectangle_component(component, excel_row)
            elif component_type == 'line':
                self.render_line_component(component, excel_row)
            elif component_type == 'circle':
                self.render_circle_component(component, excel_row)
            else:
                logger.warning(f"⚠️ Unknown component type: {component_type}")
                
        except Exception as e:
            logger.error(f"❌ Component rendering error for {component_type}: {e}")
    
    def render_template(self, template: Dict[str, Any], excel_row: Dict[str, Any]) -> Image.Image:
        """Render a complete template with Excel data"""
        print(f"🎨 CANVAS RENDERER: Starting template rendering")
        print(f"🎨 CANVAS RENDERER: Template keys: {list(template.keys())}")
        print(f"🎨 CANVAS RENDERER: Template name: {template.get('name', 'N/A')}")
        print(f"🎨 CANVAS RENDERER: Template ID: {template.get('id', 'N/A')}")
        print(f"🎨 CANVAS RENDERER: Components count: {len(template.get('components', []))}")
        print(f"🎨 CANVAS RENDERER: Excel row keys: {list(excel_row.keys())}")
        print(f"🎨 CANVAS RENDERER: Canvas size: {template.get('canvas_width', 'N/A')}x{template.get('canvas_height', 'N/A')}")
        try:
            logger.info(f"🎨 Starting template rendering...")
            logger.info(f"🎨 Template: {template.get('name', 'unknown')}")
            logger.info(f"🎨 Excel row keys: {list(excel_row.keys())}")
            
            # Use template's exact canvas dimensions (preserve original design layout)
            components = template.get('components', [])
            if not components:
                logger.warning("⚠️ No components found in template")
                return Image.new('RGB', (400, 200), self.background_color)
            
            # Use the template's canvas dimensions exactly as designed
            template_canvas_width = template.get('canvas_width', 800)
            template_canvas_height = template.get('canvas_height', 600)
            
            self.canvas_width = template_canvas_width
            self.canvas_height = template_canvas_height
            self.background_color = template.get('background_color', self.background_color)
            
            # Use exact canvas dimensions - no scaling
            self.scaled_width = self.canvas_width
            self.scaled_height = self.canvas_height
            
            logger.info(f"🎨 Using template canvas dimensions: {self.canvas_width}x{self.canvas_height}")
            logger.info(f"🎨 Scaled canvas dimensions: {self.scaled_width}x{self.scaled_height} (scale: {self.scale_factor}x)")
            
            # Create new canvas with exact template dimensions
            self.canvas = Image.new('RGB', (self.scaled_width, self.scaled_height), self.background_color)
            self.draw = ImageDraw.Draw(self.canvas)
            
            # Use components with their ORIGINAL positions (no offsetting)
            # This preserves the exact layout as designed on the frontend canvas
            logger.info(f"🎨 Rendering {len(components)} components for template {template.get('name', 'unknown')}")
            print(f"🎨 CANVAS RENDERER: Rendering {len(components)} components with original positions")
            
            for i, component in enumerate(components):
                comp_type = component.get('type', 'unknown')
                comp_id = component.get('id', 'unknown')
                logger.info(f"🎨 Rendering component {i+1}/{len(components)}: {comp_type} (ID: {comp_id})")
                print(f"🎨 CANVAS RENDERER: Component {i+1}/{len(components)}: {comp_type} at ({component.get('x', 0)}, {component.get('y', 0)})")
                
                # Log mapping info for this component
                mapping = component.get('mapping', {})
                if mapping:
                    print(f"   📋 Mapping: isConnected={mapping.get('isConnected', False)}, columnName={mapping.get('columnName', 'N/A')}")
                
                self.render_component(component, excel_row)
            
            logger.info(f"✅ Template rendered successfully: {self.scaled_width}x{self.scaled_height}")
            return self.canvas
            
        except Exception as e:
            logger.error(f"❌ Template rendering error: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Return a blank canvas on error
            return Image.new('RGB', (self.scaled_width, self.scaled_height), self.background_color)
    
    def save_canvas(self, file_path: str) -> bool:
        """Save the canvas to a file"""
        try:
            self.canvas.save(file_path, 'PNG')
            logger.info(f"✅ Canvas saved to: {file_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Canvas save error: {e}")
            return False
    
    def get_canvas_bytes(self) -> bytes:
        """Get the canvas as bytes"""
        try:
            buffer = io.BytesIO()
            self.canvas.save(buffer, format='PNG')
            return buffer.getvalue()
        except Exception as e:
            logger.error(f"❌ Canvas bytes error: {e}")
            return b''
