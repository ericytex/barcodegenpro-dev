"""
Token-Based Barcode Generation Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import os
import json
from datetime import datetime

from services.token_service import TokenService
from services.samsung_galaxy_service import SamsungGalaxyService
from routes.auth import get_current_user
from utils.safe_logger import safe_logger
from security_deps import security_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/barcode", tags=["barcode-generation"])
token_service = TokenService()
samsung_galaxy_service = SamsungGalaxyService()


# ==================== Models ====================

class BarcodeItem(BaseModel):
    imei: str
    model: str
    color: str
    vc: Optional[str] = None
    storage: Optional[str] = None


class GenerateBarcodeRequest(BaseModel):
    items: List[BarcodeItem]
    template_id: Optional[str] = None


class GenerateBarcodeResponse(BaseModel):
    success: bool
    message: str
    tokens_used: int
    tokens_remaining: int
    generated_files: List[str]
    total_generated: int
    session_id: Optional[str] = None


# ==================== Token-Based Generation Endpoints ====================

@router.post("/generate", response_model=GenerateBarcodeResponse)
async def generate_barcodes_with_tokens(
    request: GenerateBarcodeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate barcodes using tokens (1 token = 1 barcode)"""
    try:
        # Calculate tokens needed
        tokens_needed = len(request.items)
        
        # Check if user has enough tokens
        check_result = token_service.check_and_use_tokens(
            user_id=current_user['id'],
            tokens_needed=tokens_needed,
            operation="barcode_generation"
        )
        
        if not check_result['success']:
            if check_result.get('error') == 'insufficient_tokens':
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "insufficient_tokens",
                        "required": check_result['required'],
                        "available": check_result['available'],
                        "missing": check_result['missing'],
                        "cost_ugx": check_result['cost_ugx']
                    }
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=check_result.get('message', 'Failed to use tokens')
            )
        
        # Generate barcodes
        generated_files = []
        session_id = f"session_{current_user['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        for item in request.items:
            try:
                filepath = samsung_galaxy_service.generate_samsung_galaxy_barcode(
                    model=item.model,
                    color=item.color,
                    imei=item.imei,
                    vc=item.vc or "",
                    storage=item.storage or "64+2"
                )
                generated_files.append(os.path.basename(filepath))
            except Exception as e:
                logger.error(f"Error generating barcode for IMEI {item.imei}: {e}")
                continue
        
        logger.info(f"User {current_user['id']} generated {len(generated_files)} barcodes using {tokens_needed} tokens")
        
        return GenerateBarcodeResponse(
            success=True,
            message=f"Successfully generated {len(generated_files)} barcodes",
            tokens_used=check_result['tokens_used'],
            tokens_remaining=check_result['tokens_remaining'],
            generated_files=generated_files,
            total_generated=len(generated_files),
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in barcode generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate barcodes: {str(e)}"
        )


@router.post("/generate-from-excel", response_model=GenerateBarcodeResponse)
async def generate_barcodes_from_excel_with_tokens(
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload Excel file and generate barcodes using tokens"""
    try:
        safe_logger.info(f"Excel barcode generation request from user {current_user['id']}: {file.filename}")
        
        # Security validations
        if not security_manager.validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only Excel files (.xlsx, .xls) are allowed"
            )
        
        # Save uploaded file
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"temp_user_{current_user['id']}_{timestamp}_{file.filename}"
        file_path = os.path.join("uploads", filename.replace(' ', '_'))
        
        # Ensure uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        safe_logger.info(f"File saved to: {file_path}")
        
        # Parse Excel file to get barcode count
        import pandas as pd
        df = pd.read_excel(file_path)
        
        safe_logger.info(f"Excel file parsed: {len(df)} rows found")
        safe_logger.info(f"Columns: {df.columns.tolist()}")
        
        # Validate required columns
        required_columns = ['IMEI', 'Model', 'Color']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Calculate tokens needed
        tokens_needed = len(df)
        
        # Check if user has enough tokens
        check_result = token_service.check_and_use_tokens(
            user_id=current_user['id'],
            tokens_needed=tokens_needed,
            operation="barcode_generation_excel"
        )
        
        if not check_result['success']:
            os.remove(file_path)
            if check_result.get('error') == 'insufficient_tokens':
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "insufficient_tokens",
                        "required": check_result['required'],
                        "available": check_result['available'],
                        "missing": check_result['missing'],
                        "cost_ugx": check_result['cost_ugx']
                    }
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=check_result.get('message', 'Failed to use tokens')
            )
        
        # Generate barcodes
        generated_files = []
        session_id = f"session_{current_user['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        for _, row in df.iterrows():
            try:
                imei = str(row['IMEI']).strip()
                model = str(row['Model']).strip()
                color = str(row['Color']).strip()
                vc = str(row.get('VC', '')).strip() if 'VC' in row else ""
                storage = str(row.get('Storage', '64+2')).strip() if 'Storage' in row else "64+2"
                
                filepath = samsung_galaxy_service.generate_samsung_galaxy_barcode(
                    model=model,
                    color=color,
                    imei=imei,
                    vc=vc,
                    storage=storage
                )
                generated_files.append(os.path.basename(filepath))
                
            except Exception as e:
                logger.error(f"Error generating barcode for row {_}: {e}")
                continue
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to delete uploaded file: {e}")
        
        logger.info(f"User {current_user['id']} generated {len(generated_files)} barcodes from Excel using {tokens_needed} tokens")
        
        return GenerateBarcodeResponse(
            success=True,
            message=f"Successfully generated {len(generated_files)} barcodes",
            tokens_used=check_result['tokens_used'],
            tokens_remaining=check_result['tokens_remaining'],
            generated_files=generated_files,
            total_generated=len(generated_files),
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Excel barcode generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate barcodes from Excel: {str(e)}"
        )


@router.get("/check-tokens")
async def check_tokens_for_generation(
    barcode_count: int,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has enough tokens for barcode generation"""
    try:
        balance = token_service.get_balance(current_user['id'])
        has_sufficient = balance >= barcode_count
        
        result = {
            "success": True,
            "has_sufficient": has_sufficient,
            "tokens_needed": barcode_count,
            "tokens_available": balance
        }
        
        if not has_sufficient:
            missing = barcode_count - balance
            result["tokens_missing"] = missing
            result["cost_ugx"] = token_service.calculate_amount_from_tokens(missing)
        else:
            result["tokens_remaining"] = balance - barcode_count
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check token balance"
        )

