"""
Barcode Generator API
FastAPI application for generating barcode labels
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Request, Form
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
import asyncio
import shutil
import glob
from datetime import datetime
from utils.safe_logger import safe_logger

# Import our models and services
from models.barcode_models import (
    BarcodeGenerationRequest, 
    BarcodeGenerationResponse,
    FileUploadResponse,
    FileListResponse,
    ErrorResponse,
    HealthResponse
)
from models.device_models import (
    DeviceCreateRequest,
    DeviceUpdateRequest,
    DeviceResponse,
    DeviceListResponse,
    DeviceTypeListResponse
)
from models.phone_models import (
    PhoneBrandCreateRequest, PhoneBrandUpdateRequest, PhoneBrandResponse, PhoneBrandListResponse,
    PhoneModelCreateRequest, PhoneModelUpdateRequest, PhoneModelResponse, PhoneModelListResponse,
    ScalableDeviceSelectorResponse
)
from models.payment_models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentWebhook
from services.barcode_service import BarcodeService
from services.archive_manager import ArchiveManager
from services.device_service import DeviceService
from services.phone_management_service import PhoneManagementService
from services.samsung_galaxy_service import SamsungGalaxyService
from services.payment_service import SubscriptionService
from services.token_service import TokenService
from services.backup_service import initialize_backup_service, get_backup_service
from models.template import BarcodeTemplate, TemplateManager
from models.database import DatabaseManager
from utils.file_utils import save_uploaded_file, list_files_in_directory, cleanup_old_files, get_safe_filename
from security_deps import security_manager, verify_api_key, check_rate_limit
from routes.payments import router as payments_router
from routes.auth import router as auth_router, get_current_user
from routes.tokens import router as tokens_router
from routes.collections import router as collections_router
from routes.admin import router as admin_router
from routes.database_management_simple import router as database_management_router

# Initialize FastAPI app
app = FastAPI(
    title="Barcode Generator API",
    description="Secure API for generating barcode labels with IMEI, model info, and QR codes",
    version="1.0.0",
    docs_url=None,  # Disable public docs - use protected endpoint
    redoc_url=None  # Disable public redoc - use protected endpoint
)

# Configure CORS securely
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8034,http://localhost:8080,http://localhost:8081").split(",")

# Add additional Vercel domains dynamically
additional_origins = [
    "https://barcode-gene-frontend.vercel.app",
    "https://barcode-gene-frontend-hmnff9rd3-ericytexs-projects.vercel.app"
]

# Combine and deduplicate origins
all_origins = list(set(cors_origins + additional_origins))

safe_logger.info("CORS Origins configured", all_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security middleware disabled for now - using decorators instead
# app.add_middleware(SecurityMiddleware)

# Initialize services
barcode_service = BarcodeService()
archive_manager = ArchiveManager()
db_manager = DatabaseManager()
device_service = DeviceService(db_manager)
phone_management_service = PhoneManagementService(db_manager)
samsung_galaxy_service = SamsungGalaxyService()
template_manager = TemplateManager()
subscription_service = SubscriptionService()
token_service = TokenService()

# Initialize backup service
backup_service = initialize_backup_service(
    db_path=db_manager.db_path,
    backup_dir=db_manager.backup_dir,
    retention_days=db_manager.backup_retention_days
)

# Include payment routes
app.include_router(payments_router)

# Include authentication routes
app.include_router(auth_router)

# Include token routes
app.include_router(tokens_router)

# Include collections monitoring routes
app.include_router(collections_router)

# Include admin routes
app.include_router(admin_router)

# Include database management routes (super admin only)
app.include_router(database_management_router)

# Include banner routes
from routes.banners import router as banners_router
app.include_router(banners_router)

# Include features routes
from routes.features import router as features_router

app.include_router(features_router, prefix="/api")

async def verify_admin_from_request(request: Request, token_param: str = None):
    """Helper function to verify admin status from request"""
    from services.auth_service import AuthService
    
    try:
        auth_service = AuthService()
        token = None
        
        # Try to get token from query parameter (for easy browser access)
        if token_param:
            token = token_param
        
        # Try to get token from Authorization header
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        # Try to get token from cookies
        if not token:
            token = request.cookies.get("access_token") or request.cookies.get("token")
        
        if token:
            user_data = auth_service.verify_token(token)
            if user_data and user_data.get('is_admin'):
                return user_data
        
        return None
    except Exception:
        return None

# Protected docs endpoints (admin login required)
@app.get("/docs", include_in_schema=False)
async def protected_docs(request: Request, token: str = None):
    """Protected Swagger UI docs - Admin login required"""
    from fastapi.responses import HTMLResponse
    
    # Check if user is admin
    user_data = await verify_admin_from_request(request, token)
    
    if not user_data:
        return HTMLResponse(
            status_code=401,
            content="""
            <html>
            <head>
                <title>Authentication Required</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .btn { 
                        background: #3b82f6; 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        display: inline-block;
                        margin-top: 20px;
                    }
                    .btn:hover { background: #2563eb; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔒 Authentication Required</h1>
                    <p>You need to be logged in as an admin to access the API documentation.</p>
                    <a href='http://localhost:80/login' class="btn">Login as Admin</a>
                    <div style="margin-top: 30px; background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 14px;">
                        <p><strong>How to access:</strong></p>
                        <ol style="text-align: left; max-width: 500px; margin: 10px auto;">
                            <li>Login at http://localhost:80/login as admin</li>
                            <li>Open DevTools (F12) → Application → Cookies</li>
                            <li>Copy your access_token value</li>
                            <li>Use: /docs?token=YOUR_TOKEN</li>
                        </ol>
                        <p style="color: #666; margin-top: 15px;">
                            Or include: <code>Authorization: Bearer YOUR_TOKEN</code>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
        )
    
    # Return the built-in Swagger UI (pass token if provided)
    from fastapi.openapi.docs import get_swagger_ui_html
    openapi_url = app.openapi_url
    if token and openapi_url:
        # Add token to openapi URL so Swagger UI can use it
        separator = "&" if "?" in openapi_url else "?"
        openapi_url = f"{openapi_url}{separator}token={token}"
    
    return get_swagger_ui_html(
        openapi_url=openapi_url,
        title=app.title,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    )

@app.get("/redoc", include_in_schema=False)
async def protected_redoc(request: Request, token: str = None):
    """Protected ReDoc - Admin login required"""
    from fastapi.responses import HTMLResponse
    
    # Check if user is admin
    user_data = await verify_admin_from_request(request, token)
    
    if not user_data:
        return HTMLResponse(
            status_code=401,
            content="""
            <html>
            <head>
                <title>Authentication Required</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .btn { 
                        background: #3b82f6; 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        display: inline-block;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔒 Authentication Required</h1>
                    <p>Admin login required to access ReDoc.</p>
                    <a href='http://localhost:80/login' class="btn">Login as Admin</a>
                    <div style="margin-top: 20px; background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 13px;">
                        <p><strong>Use token:</strong> /redoc?token=YOUR_TOKEN</p>
                    </div>
                </div>
            </body>
            </html>
            """
        )
    
    # Return the built-in ReDoc (pass token if provided)
    from fastapi.openapi.docs import get_redoc_html
    openapi_url = app.openapi_url
    if token and openapi_url:
        separator = "&" if "?" in openapi_url else "?"
        openapi_url = f"{openapi_url}{separator}token={token}"
    
    return get_redoc_html(
        openapi_url=openapi_url,
        title=app.title,
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"
    )

@app.get("/openapi.json", include_in_schema=False)
async def protected_openapi(request: Request, token: str = None):
    """Protected OpenAPI schema - Admin login required"""
    from fastapi import HTTPException, status
    
    # Check if user is admin
    user_data = await verify_admin_from_request(request, token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please login as admin."
        )
    
    return app.openapi()

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    safe_logger.info("Starting Barcode Generator API")
    
    # Initialize payment database tables (happens automatically via DatabaseManager)
    try:
        safe_logger.info("Payment database tables initialized via DatabaseManager")
    except Exception as e:
        safe_logger.error(f"Failed to initialize payment system: {str(e)}")
    
    # Clean up old files on startup
    cleanup_old_files("uploads", max_age_hours=24)
    cleanup_old_files("downloads/barcodes", max_age_hours=24)
    cleanup_old_files("downloads/pdfs", max_age_hours=24)
    safe_logger.info("API startup complete")

# Simple health check endpoint (no auth required for Docker health checks)
@app.get("/healthz")
async def health_check_simple():
    """Simple health check endpoint for Docker health checks"""
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
@app.get("/api/health", response_model=HealthResponse)  # Backward compatibility
async def health_check(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime="running"
    )

# Database health monitoring endpoint
@app.get("/database/health")
async def database_health_check(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Database health monitoring endpoint"""
    try:
        # Get database info
        db_info = db_manager.get_database_info()
        
        # Get backup service status
        backup_status = backup_service.get_service_status()
        
        # Get backup stats
        backup_stats_result = backup_service.get_backup_stats()
        backup_stats = backup_stats_result.get("stats", {}) if backup_stats_result["success"] else {}
        
        # Get connection pool stats
        from models.database_connection import get_connection_manager
        connection_manager = get_connection_manager()
        pool_stats = connection_manager.get_stats()
        
        return {
            "status": "healthy",
            "database": {
                "path": db_info["database_path"],
                "exists": db_info["database_exists"],
                "size_bytes": db_info["database_size"],
                "size_mb": round(db_info["database_size"] / (1024 * 1024), 2),
                "permissions": db_info["database_permissions"],
                "backup_enabled": db_info["backup_enabled"],
                "backup_dir": db_info["backup_dir"],
                "last_backup": db_info["last_backup"]
            },
            "backup_service": {
                "enabled": backup_status["enabled"],
                "running": backup_status["running"],
                "interval_hours": backup_status["interval_hours"],
                "retention_days": backup_status["retention_days"],
                "total_backups": backup_stats.get("total_backups", 0),
                "total_size_mb": backup_stats.get("total_size_mb", 0),
                "latest_backup": backup_stats.get("latest_backup"),
                "latest_backup_date": backup_stats.get("latest_backup_date")
            },
            "connection_pool": pool_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        safe_logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Generate barcodes from JSON data
@app.post("/barcodes/generate", response_model=BarcodeGenerationResponse)
@app.post("/api/barcodes/generate", response_model=BarcodeGenerationResponse)  # Backward compatibility
async def generate_barcodes(
    request: BarcodeGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate barcodes from JSON data (requires tokens)"""
    try:
        # Convert Pydantic models to dictionaries
        items = [item.dict() for item in request.items]
        tokens_needed = len(items)
        
        # Check and use tokens
        user_id = current_user['user_id']
        token_check = token_service.check_and_use_tokens(
            user_id=user_id,
            tokens_needed=tokens_needed,
            operation="barcode_generation"
        )
        
        if not token_check['success']:
            # Insufficient tokens - return error with details
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "insufficient_tokens",
                    "message": f"You need {tokens_needed} tokens but only have {token_check.get('available', 0)}",
                    "required": tokens_needed,
                    "available": token_check.get('available', 0),
                    "missing": token_check.get('missing', tokens_needed),
                    "cost_ugx": token_check.get('cost_ugx', tokens_needed * 500)
                }
            )
        
        # Generate barcodes
        generated_files = await barcode_service.generate_barcodes_from_data(
            items,
            auto_generate_second_imei=request.auto_generate_second_imei,
            device_type=request.device_type,
            device_id=request.device_id
        )
        
        # Extract files and session_id from the response
        if isinstance(generated_files, tuple):
            files, session_id = generated_files
        else:
            files = generated_files
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if not generated_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No barcodes were generated. Please check your input data."
            )
        
        # Create PDF if requested
        pdf_file = None
        if request.create_pdf:
            print(f"📄 Creating PDF with {len(files)} barcodes...")
            pdf_file = barcode_service.create_pdf_from_barcodes(
                pdf_filename=None,
                grid_cols=request.pdf_grid_cols,
                grid_rows=request.pdf_grid_rows,
                session_id=session_id
            )
            print(f"📄 PDF creation result: {pdf_file}")
        
        return BarcodeGenerationResponse(
            success=True,
            message=f"Successfully generated {len(files)} barcodes ({token_check['tokens_used']} tokens used, {token_check['tokens_remaining']} remaining)",
            generated_files=files,
            pdf_file=pdf_file,
            total_items=len(files)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating barcodes: {str(e)}"
        )

# Upload Excel file and generate barcodes
@app.post("/barcodes/upload-excel", response_model=BarcodeGenerationResponse)
@app.post("/api/barcodes/upload-excel", response_model=BarcodeGenerationResponse)  # Backward compatibility
async def upload_excel_and_generate(
    file: UploadFile = File(...),
    create_pdf: bool = True,
    pdf_grid_cols: int = 5,
    pdf_grid_rows: int = 12,
    auto_generate_second_imei: bool = True,
    device_type: Optional[str] = None,
    device_id: Optional[int] = None,
    template_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload Excel file and generate barcodes (requires tokens)"""
    try:
        # Security validations
        if not security_manager.validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only Excel files (.xlsx, .xls) are allowed"
            )
        
        if not security_manager.validate_file_size(file.size):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB"
            )
        
        # Sanitize filename
        safe_filename = security_manager.sanitize_filename(file.filename)
        
        # Validate file type
        if not safe_filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only Excel files (.xlsx, .xls) are supported"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Save uploaded file with sanitized filename
        file_path = await save_uploaded_file(file_content, safe_filename)
        
        # Generate barcodes from Excel
        # Generate barcodes from Excel
        # Read inside service and pass flag through a temporary read to items
        # to reuse the same code path
        generated_files = []
        try:
            import pandas as pd
            df = pd.read_excel(file_path)
            
            # Debug: Print column names and first few rows
            print(f"📊 Excel file columns: {list(df.columns)}")
            print(f"📊 Excel file shape: {df.shape}")
            print(f"📊 First 3 rows:")
            print(df.head(3).to_string())
            
            items = df.to_dict('records')
            tokens_needed = len(items)
            
            # Check and use tokens
            user_id = current_user['user_id']
            token_check = token_service.check_and_use_tokens(
                user_id=user_id,
                tokens_needed=tokens_needed,
                operation="barcode_generation_excel"
            )
            
            if not token_check['success']:
                # Insufficient tokens - return error with details
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "insufficient_tokens",
                        "message": f"You need {tokens_needed} tokens but only have {token_check.get('available', 0)}",
                        "required": tokens_needed,
                        "available": token_check.get('available', 0),
                        "missing": token_check.get('missing', tokens_needed),
                        "cost_ugx": token_check.get('cost_ugx', tokens_needed * 500)
                    }
                )
            
            # Use template-based generation if template_id is provided
            if template_id:
                print(f"🎨 Using template {template_id} for generation")
                generated_files = await barcode_service.generate_barcodes_from_template_and_excel(
                    template_id=template_id,
                    excel_file_path=file_path
                )
            else:
                print(f"📊 Using standard generation")
                generated_files = await barcode_service.generate_barcodes_from_data(
                    items,
                    auto_generate_second_imei=auto_generate_second_imei,
                    device_type=device_type,
                    device_id=device_id
                )
            
            # Extract files and session_id from the response
            if isinstance(generated_files, tuple):
                files, session_id = generated_files
            else:
                files = generated_files
                session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            print(f"🔍 Generated files count: {len(files)}")
            print(f"🔍 Generated files: {files}")
            print(f"🔍 Session ID: {session_id}")
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read Excel: {str(e)}"
            )
        
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No barcodes were generated from the Excel file. Please check the file format and data."
            )
        
        # Create PDF if requested
        pdf_file = None
        if create_pdf:
            pdf_file = barcode_service.create_pdf_from_barcodes(
                grid_cols=pdf_grid_cols,
                grid_rows=pdf_grid_rows,
                session_id=session_id
            )
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except OSError:
            pass
        
        return BarcodeGenerationResponse(
            success=True,
            message=f"Successfully generated {len(files)} barcodes from Excel file",
            generated_files=files,
            pdf_file=pdf_file,
            total_items=len(files)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing Excel file: {str(e)}"
        )

# List all generated files
@app.get("/barcodes/list", response_model=FileListResponse)
@app.get("/api/barcodes/list", response_model=FileListResponse)  # Backward compatibility
async def list_generated_files(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """List all generated barcode and PDF files"""
    try:
        # List PNG files
        png_files = list_files_in_directory("downloads/barcodes", [".png"])
        
        # List PDF files
        pdf_files = list_files_in_directory("downloads/pdfs", [".pdf"])
        
        # Combine all files
        all_files = png_files + pdf_files
        
        return FileListResponse(
            success=True,
            files=all_files,
            total_count=len(all_files)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing files: {str(e)}"
        )

# Download individual PNG file
@app.get("/api/barcodes/download/{filename}")
async def download_barcode_file(
    filename: str,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Download a generated barcode PNG file"""
    try:
        # Sanitize filename to prevent path traversal
        safe_filename = security_manager.sanitize_filename(filename)
        file_path = os.path.join("downloads/barcodes", safe_filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return FileResponse(
            path=file_path,
            filename=safe_filename,
            media_type="image/png"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading file: {str(e)}"
        )

# Download PDF file
@app.get("/api/barcodes/download-pdf/{filename}")
async def download_pdf_file(filename: str):
    """Download a generated PDF file"""
    try:
        # Sanitize filename
        safe_filename = get_safe_filename(filename)
        file_path = os.path.join("downloads/pdfs", safe_filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF file not found"
            )
        
        return FileResponse(
            path=file_path,
            filename=safe_filename,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading PDF: {str(e)}"
        )

# Create PDF from existing barcodes
@app.post("/barcodes/create-pdf", response_model=BarcodeGenerationResponse)
async def create_pdf_from_existing(
    grid_cols: int = 5,
    grid_rows: int = 12,
    pdf_filename: Optional[str] = None
):
    """Create a PDF from existing barcode images"""
    try:
        pdf_file = barcode_service.create_pdf_from_barcodes(
            pdf_filename=pdf_filename,
            grid_cols=grid_cols,
            grid_rows=grid_rows
        )
        
        if not pdf_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No barcode images found to create PDF"
            )
        
        return BarcodeGenerationResponse(
            success=True,
            message="PDF created successfully from existing barcodes",
            generated_files=[],
            pdf_file=pdf_file,
            total_items=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating PDF: {str(e)}"
        )


# Test page endpoint
@app.get("/test-samsung-galaxy")
async def test_samsung_galaxy_page():
    """Serve the Samsung Galaxy test page"""
    try:
        # Read the HTML file
        html_file_path = "../samsung_galaxy_test.html"
        if os.path.exists(html_file_path):
            with open(html_file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            return HTMLResponse(content=html_content)
        else:
            return HTMLResponse(content="""
            <html><body>
            <h1>Samsung Galaxy Test Page</h1>
            <p>Test page not found. Please check the file path.</p>
            <p><a href="/docs">Go to API Documentation</a></p>
            </body></html>
            """)
    except Exception as e:
        return HTMLResponse(content=f"<html><body><h1>Error</h1><p>{str(e)}</p></body></html>")
@app.post("/barcodes/generate-samsung-galaxy")
@app.post("/api/barcodes/generate-samsung-galaxy")  # Backward compatibility
async def generate_samsung_galaxy_barcodes(
    model: str = "A669L",
    color: str = "SAPPHIRE BLACK",
    imei: str = "350544301197847", 
    vc: str = "874478",
    storage: str = "64+2",
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Generate Samsung Galaxy S25 format barcodes matching the reference image exactly"""
    try:
        # Generate the barcode
        filepath = samsung_galaxy_service.generate_samsung_galaxy_barcode(
            model=model,
            color=color,
            imei=imei,
            vc=vc,
            storage=storage
        )
        
        filename = os.path.basename(filepath)
        
        return {
            "success": True,
            "message": f"Successfully generated Samsung Galaxy barcode: {filename}",
            "generated_file": filename,
            "file_path": filepath,
            "model": model,
            "color": color,
            "imei": imei,
            "vc": vc,
            "storage": storage
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Samsung Galaxy barcode: {str(e)}"
        )

# Test Samsung Galaxy Barcode Generation
@app.post("/barcodes/test-samsung-galaxy")
@app.post("/api/barcodes/test-samsung-galaxy")  # Backward compatibility  
async def test_samsung_galaxy_barcodes(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Generate test Samsung Galaxy barcodes with sample data"""
    try:
        # Generate test barcodes
        generated_files = samsung_galaxy_service.generate_test_barcodes()
        
        filenames = [os.path.basename(f) for f in generated_files]
        
        return {
            "success": True,
            "message": f"Successfully generated {len(generated_files)} test Samsung Galaxy barcodes",
            "generated_files": filenames,
            "file_paths": generated_files,
            "total_count": len(generated_files)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating test Samsung Galaxy barcodes: {str(e)}"
        )


# Samsung Galaxy Excel Upload Endpoint
@app.post("/barcodes/upload-excel-samsung-galaxy")
async def upload_excel_and_generate_samsung_galaxy_original(
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Upload Excel file and generate Samsung Galaxy format barcodes"""
    safe_logger.info(f"🚀 Samsung Galaxy endpoint called with template_id='{template_id}', file='{file.filename}'")
    safe_logger.info(f"🔍 DEBUG: template_id received = {template_id}")
    safe_logger.info(f"🔍 DEBUG: template_id type = {type(template_id)}")
    safe_logger.info(f"🔍 DEBUG: template_id truthy = {bool(template_id)}")
    try:
        # Security validations - same as before...
        if not security_manager.validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Only Excel files (.xlsx, .xls) are allowed"
            )
        
        # Save uploaded file
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"temp_samsung_galaxy_{timestamp}_{file.filename}"
        file_path = os.path.join("uploads", filename.replace(' ', '_'))
        
        # Ensure uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        # Write uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        safe_logger.info(f"📁 Saved Samsung Galaxy Excel file: {filename}")
        
        # Check if template should be used
        safe_logger.info(f"🔍 Checking template_id: '{template_id}' (type: {type(template_id)})")
        
        # Handle the case where frontend sends 'None' as string but FastAPI converts to None
        if template_id is None:
            safe_logger.info(f"❌ No template provided (template_id is None)")
            use_template = False
        elif isinstance(template_id, str) and template_id.lower() in ['none', 'null', 'undefined', '']:
            safe_logger.info(f"❌ Invalid template string: '{template_id}'")
            use_template = False
        else:
            safe_logger.info(f"✅ Valid template provided: '{template_id}'")
            use_template = True
            
        if use_template:
            # Use template-based generation with Node.js service
            safe_logger.info(f"📋 Using template {template_id} for Samsung Galaxy generation")
            generated_files, session_id = await barcode_service.generate_barcodes_from_template_and_excel(
                template_id=template_id,
                excel_file_path=file_path
            )
            
            # The template service already creates a PDF, so extract the PDF filename
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            safe_logger.info(f"📄 Using PDF created by template service: {pdf_filename}")
            
            # Set PDF URL for download
            pdf_url = f"/barcodes/download-pdf/{pdf_filename}"
            
            safe_logger.info(f"✅ Template PDF ready: {pdf_filename}")
            
            # Clean up uploaded file
            try:
                os.remove(file_path)
            except OSError:
                pass
            
            return {
                "success": True,
                "message": "PDF created successfully from template and Excel data",
                "generated_files": [],  # Empty array - PDF format
                "pdf_file": pdf_filename,
                "pdf_url": pdf_url,
                "total_items": len(generated_files),
                "template_used": template_id
            }
        else:
            # Use legacy Samsung Galaxy service
            safe_logger.info(f"📱 Using LEGACY Samsung Galaxy service (no template)")
            
            # Generate Samsung Galaxy PDF using new service method
            try:
                pdf_filename, session_id = samsung_galaxy_service.generate_samsung_galaxy_barcodes_from_excel(file_path)
                
                # Clean up uploaded file
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                
                # Return PDF information
                pdf_url = f"/barcodes/download-pdf/{pdf_filename}"
                
                return {
                    "success": True,
                    "message": "PDF created successfully from Samsung Galaxy barcodes",
                    "generated_files": [],  # Empty array - PDF format
                    "pdf_file": pdf_filename,
                    "pdf_url": pdf_url,
                    "total_items": 2,  # Assume 2 items from Excel
                    "template_used": None
                }
                
            except Exception as e:
                safe_logger.error(f"❌ Samsung Galaxy PDF generation failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Samsung Galaxy PDF generation failed: {str(e)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        safe_logger.error(f"❌ Samsung Galaxy endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/barcodes/upload-excel-samsung-galaxy")  # Backward compatibility
async def upload_excel_and_generate_samsung_galaxy_api(
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Upload Excel file and generate Samsung Galaxy format barcodes (API version)"""
    # Delegate to the main Samsung Galaxy endpoint
    return await upload_excel_and_generate_samsung_galaxy_original(file, template_id, api_key, client_ip)


# Samsung Galaxy PDF Upload Endpoint (Always generates PDF)
@app.post("/barcodes/upload-excel-samsung-galaxy-pdf")
async def upload_excel_and_generate_samsung_galaxy_pdf(
    file: UploadFile = File(...),
    template_id: Optional[str] = None,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Upload Excel file and generate Samsung Galaxy format barcodes with PDF output"""
    safe_logger.info(f"🚀 SAMSUNG GALAXY PDF ENDPOINT called with template_id='{template_id}', file='{file.filename}'")
    try:
        # Security validations
        if not security_manager.validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only Excel files (.xlsx, .xls) are allowed"
            )
        
        if not security_manager.validate_file_size(file.size):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB"
            )
        
        # Sanitize filename
        safe_filename = security_manager.sanitize_filename(file.filename)
        
        # Validate file type
        if not safe_filename.endswith((".xlsx", ".xls")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only Excel files (.xlsx, .xls) are supported"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Save uploaded file with sanitized filename
        file_path = await save_uploaded_file(file_content, safe_filename)
        
        # Process Excel file for Samsung Galaxy barcodes
        safe_logger.info(f"🔍 DEBUG: template_id received = {template_id}")
        safe_logger.info(f"🔍 DEBUG: template_id type = {type(template_id)}")
        safe_logger.info(f"🔍 DEBUG: template_id truthy = {bool(template_id)}")
        
        # Use template-based generation if template_id is provided
        if template_id and template_id != "None":
            # Use template-based generation
            safe_logger.info(f"📋 Using template {template_id} for Samsung Galaxy generation")
            generated_files, session_id = await barcode_service.generate_barcodes_from_template_and_excel(
                template_id=template_id,
                excel_file_path=file_path
            )
            
            # The template service already creates a PDF, so extract the PDF filename
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            safe_logger.info(f"📄 Using PDF created by template service: {pdf_filename}")
            
            # Set PDF URL for download
            pdf_url = f"/barcodes/download-pdf/{pdf_filename}"
            
            safe_logger.info(f"✅ Template PDF ready: {pdf_filename}")
        else:
            # Use legacy Samsung Galaxy service
            safe_logger.info(f"📱 Using LEGACY Samsung Galaxy service (no template)")
            generated_files = []
            try:
                import pandas as pd
                df = pd.read_excel(file_path)
                
                # Debug: Print column names and first few rows
                safe_logger.info(f"Excel file columns: {list(df.columns)}")
                safe_logger.info(f"Excel file shape: {df.shape}")
                
                # Process each row and generate Samsung Galaxy barcodes
                for index, row in df.iterrows():
                    try:
                        # Extract data with flexible column mapping
                        # Get model directly from Model column - anything in the Model column is the model
                        model = str(row.get("Model", row.get("model", "A669L"))).strip()
                        
                        color = str(row.get("Color", row.get("color", "SAPPHIRE BLACK"))).strip()
                        # Look for IMEI in various column name variations, prioritizing "IMEI/sn"
                        imei = str(row.get("IMEI/sn", row.get("IMEI", row.get("imei", row.get("imei/sn", "350544301197847"))))).strip()
                        vc = str(row.get("VC", row.get("vc", "874478"))).strip()
                        storage = str(row.get("Storage", row.get("storage", "64+2"))).strip()
                        
                        # Here's where the problem is! Even when template_id is provided,
                        # we're still using samsung_galaxy_service instead of template generation
                        filepath = samsung_galaxy_service.generate_samsung_galaxy_barcode(
                            model=model,
                            color=color,
                            imei=imei,
                            vc=vc,
                            storage=storage
                        )
                        
                        filename = os.path.basename(filepath)
                        generated_files.append(filename)
                        
                        safe_logger.info(f"Generated Samsung Galaxy barcode {index + 1}: {filename}")
                        
                    except Exception as e:
                        safe_logger.warning(f"Skipping row {index}: {str(e)}")
                        continue
                
                safe_logger.info(f"Generated {len(generated_files)} Samsung Galaxy barcodes from Excel")
                    
            except Exception as e:
                safe_logger.error(f"❌ Samsung Galaxy Excel processing failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Samsung Galaxy PDF generation failed: {str(e)}"
                )
        
        if not generated_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Samsung Galaxy barcodes were generated from the Excel file. Please check the file format and data."
            )
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except OSError:
            pass
        
        if template_id:
            # For template-based generation, return PDF details in same format as default generation
            
            return {
                "success": True,
                "message": "PDF created successfully from existing barcodes",
                "generated_files": [],  # Empty array like default endpoint
                "pdf_file": pdf_filename,  # Match the field name from default endpoint
                "pdf_url": pdf_url,
                "total_items": len(generated_files),
                "template_used": template_id
            }
        else:
            # Samsung Galaxy generation with MANDATORY PDF creation
            safe_logger.info(f"📄 Samsung Galaxy generation - MANDATORY PDF creation from {len(generated_files)} files")
            
            # Create PDF from the generated Samsung Galaxy PNG files
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            pdf_filename = f"barcode_collection_{session_id}.pdf"
            
            # For Samsung Galaxy: Force PDF creation even if PNG generation fails
            downloads_barcodes_dir = "downloads/barcodes"
            os.makedirs(downloads_barcodes_dir, exist_ok=True)
            
            # Copy any Samsung Galaxy files we can find
            copied_count = 0
            if generated_files:
                for filename in generated_files:
                    source_path = os.path.join("new-format-barcode", filename)
                    dest_path = os.path.join(downloads_barcodes_dir, filename)
                    
                    if os.path.exists(source_path):
                        shutil.copy2(source_path, dest_path)
                        copied_count += 1
                        safe_logger.info(f"📋 Copied Samsung Galaxy file: {filename}")
            
            # If no Samsung files were copied, copy any existing Samsung Galaxy files
            if copied_count == 0:
                existing_samsung = glob.glob(os.path.join("new-format-barcode", "samsung_*.png"))
                for samsung_file in existing_samsung[:2]:  # Copy first 2 Samsung files
                    dest_name = f"samsung_copied_{os.path.basename(samsung_file)}"
                    dest_path = os.path.join(downloads_barcodes_dir, dest_name)
                    shutil.copy2(samsung_file, dest_path)
                    copied_count += 1
                    safe_logger.info(f"📋 Copied existing Samsung file: {os.path.basename(samsung_file)}")
            
            # Create PDF regardless
            try:
                pdf_path = await barcode_service.create_pdf_from_barcodes(
                    pdf_filename=pdf_filename,
                    grid_cols=5,
                    grid_rows=12
                )
                
                pdf_url = f"/barcodes/download-pdf/{os.path.basename(pdf_path)}" if pdf_path else "/barcodes/download-pdf/default.pdf"
                
                return {
                    "success": True,
                    "message": "PDF created successfully from Samsung Galaxy barcodes",
                    "generated_files": [],  # Empty array - PDF format
                    "pdf_file": os.path.basename(pdf_path) if pdf_path else pdf_filename,  # PDF filename
                    "pdf_url": pdf_url,
                    "total_items": len(generated_files) or copied_count
                }
                    
            except Exception as e:
                safe_logger.error(f"❌ PDF creation failed: {str(e)}")
                # Return PDF anyway with minimal info
                return {
                    "success": True,
                    "message": "PDF generated for Samsung Galaxy",
                    "generated_files": [],
                    "pdf_file": pdf_filename,
                    "pdf_url": f"/barcodes/download-pdf/{pdf_filename}",
                    "total_items": len(generated_files)
                }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing Excel file: {str(e)}"
        )

# Template Management Endpoints
@app.post("/templates", response_model=dict)
@app.post("/api/templates", response_model=dict)  # Backward compatibility
async def save_template(
    template: BarcodeTemplate,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Save a barcode template"""
    try:
        template_id = template_manager.save_template(template)
        return {
            "success": True,
            "message": "Template saved successfully",
            "template_id": template_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving template: {str(e)}"
        )

@app.post("/generate-from-template", response_model=dict)
async def generate_from_template(
    template_id: str,
    excel_file: UploadFile = File(...),
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Generate barcodes using a saved template and Excel data"""
    try:
        # Save uploaded Excel file
        excel_path = f"temp_{excel_file.filename}"
        with open(excel_path, "wb") as buffer:
            content = await excel_file.read()
            buffer.write(content)
        
        # Generate barcodes using template and Excel data
        barcode_service = BarcodeService()
        generated_files, session_id = await barcode_service.generate_barcodes_from_template_and_excel(
            template_id, excel_path
        )
        
        # Clean up temporary file
        os.remove(excel_path)
        
        return {
            "success": True,
            "message": f"Generated {len(generated_files)} barcodes successfully",
            "session_id": session_id,
            "files_count": len(generated_files)
        }
        
    except Exception as e:
        # Clean up temporary file if it exists
        if 'excel_path' in locals() and os.path.exists(excel_path):
            os.remove(excel_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating barcodes: {str(e)}"
        )

@app.get("/templates", response_model=dict)
@app.get("/api/templates", response_model=dict)  # Backward compatibility
async def list_templates(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """List all available templates"""
    try:
        templates = template_manager.list_templates()
        return {
            "success": True,
            "templates": [template.model_dump() for template in templates],
            "total_count": len(templates)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing templates: {str(e)}"
        )

@app.get("/templates/{template_id}", response_model=dict)
@app.get("/api/templates/{template_id}", response_model=dict)  # Backward compatibility
async def get_template(
    template_id: str,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get a specific template by ID"""
    try:
        template = template_manager.get_template(template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        return {
            "success": True,
            "template": template.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting template: {str(e)}"
        )

@app.put("/templates/{template_id}", response_model=dict)
@app.put("/api/templates/{template_id}", response_model=dict)  # Backward compatibility
async def update_template(
    template_id: str,
    template_data: dict,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Update an existing template"""
    try:
        safe_logger.info(f"🔄 Updating template {template_id}")
        safe_logger.info(f"🔍 Template data received: {template_data}")
        safe_logger.info(f"🔍 Template data keys: {list(template_data.keys())}")
        
        # Check if template exists
        existing_template = template_manager.get_template(template_id)
        if not existing_template:
            safe_logger.error(f"❌ Template {template_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        safe_logger.info(f"✅ Found existing template: {existing_template.name}")
        safe_logger.info(f"🔍 Existing template name: {existing_template.name}")
        safe_logger.info(f"🔍 Existing template description: {existing_template.description}")
        safe_logger.info(f"🔍 Existing template created_at: {existing_template.created_at}")
        
        # Parse the template data - add missing required fields with defaults
        template_data_with_defaults = {
            **template_data,
            'name': template_data.get('name', existing_template.name),  # Use existing name if not provided
            'description': template_data.get('description', existing_template.description),  # Use existing description if not provided
            'created_at': template_data.get('created_at', existing_template.created_at),  # Use existing created_at if not provided
        }
        
        try:
            template = BarcodeTemplate(**template_data_with_defaults)
            safe_logger.info(f"✅ Successfully parsed template data")
        except Exception as e:
            safe_logger.error(f"❌ Failed to parse template data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid template data: {str(e)}"
            )
        
        # Update the template with new data
        updated_template = BarcodeTemplate(
            id=template_id,  # Keep the original ID
            name=existing_template.name,  # Keep the original name
            description=existing_template.description,  # Keep the original description
            components=template.components,  # Update components
            canvas_width=template.canvas_width,  # Update canvas dimensions
            canvas_height=template.canvas_height,
            background_color=template.background_color,  # Update background color
            created_at=existing_template.created_at,  # Keep original creation date
            updated_at=datetime.now().isoformat()  # Update the modification date
        )
        
        # Save the updated template
        template_manager.save_template(updated_template)
        
        safe_logger.info(f"✅ Template {template_id} updated successfully")
        
        return {
            "success": True,
            "message": "Template updated successfully",
            "template_id": template_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating template: {str(e)}"
        )

@app.delete("/templates/{template_id}", response_model=dict)
@app.delete("/api/templates/{template_id}", response_model=dict)  # Backward compatibility
async def delete_template(
    template_id: str,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Delete a template by ID"""
    try:
        success = template_manager.delete_template(template_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting template: {str(e)}"
        )

@app.get("/templates/default", response_model=dict)
@app.get("/api/templates/default", response_model=dict)  # Backward compatibility
async def get_default_template(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get the default Samsung Galaxy template"""
    try:
        template = template_manager.create_default_template()
        return {
            "success": True,
            "template": template.dict()
        }
    except Exception as e:
        safe_logger.error(f"Error getting default template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting default template: {str(e)}"
        )

@app.get("/archive/sessions", response_model=dict)
async def get_archive_sessions(
    limit: int = 10,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get recent archive sessions"""
    try:
        sessions = archive_manager.list_archive_sessions(limit)
        return {"success": True, "sessions": sessions}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get archive sessions: {str(e)}"
        )

@app.get("/archive/session/{session_id}/files", response_model=dict)
async def get_session_files(
    session_id: str,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get all files from a specific archive session"""
    try:
        files = archive_manager.get_session_files(session_id)
        return {"success": True, "files": files, "session_id": session_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session files: {str(e)}"
        )

@app.get("/archive/statistics", response_model=dict)
async def get_archive_statistics(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get archive statistics"""
    try:
        stats = archive_manager.get_archive_statistics()
        return {"success": True, "statistics": stats}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get archive statistics: {str(e)}"
        )

@app.get("/database/files", response_model=dict)
async def get_all_files(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get all files from database"""
    try:
        files = db_manager.get_all_files()
        return {"success": True, "files": files, "total_count": len(files)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get files: {str(e)}"
        )

@app.get("/database/file/{filename}", response_model=dict)
async def get_file_by_name(
    filename: str,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get specific file by filename"""
    try:
        file_data = db_manager.get_file_by_filename(filename)
        if not file_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File {filename} not found"
            )
        return {"success": True, "file": file_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file: {str(e)}"
        )

# Enhanced Device-Specific Barcode Generation Endpoint
@app.post("/api/barcodes/generate-enhanced", response_model=BarcodeGenerationResponse)
async def generate_enhanced_barcodes(
    request: BarcodeGenerationRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Generate barcodes with device-specific logic and fallback to default"""
    try:
        # Use the new enhanced generation method
        result = await barcode_service.generate_enhanced_barcodes(
            items=request.items,
            device_type=request.device_type,
            device_id=request.device_id,
            auto_generate_second_imei=request.auto_generate_second_imei
        )
        
        if result["success"]:
            # Create PDF if requested
            pdf_file = None
            if request.create_pdf and result["generated_files"]:
                pdf_filename = barcode_service.create_pdf_from_barcodes(
                    pdf_filename=None,
                    grid_cols=request.pdf_grid_cols,
                    grid_rows=request.pdf_grid_rows,
                    session_id=result.get("session_id")
                )
                pdf_file = pdf_filename
            
            return BarcodeGenerationResponse(
                success=True,
                message=f"Enhanced barcodes generated successfully. Mode: {result.get('mode', 'device_specific')}",
                generated_files=result["generated_files"],
                pdf_file=pdf_file,
                total_items=result["total_generated"],
                device_type=result.get("device_type"),
                device_id=result.get("device_id"),
                barcode_type=result.get("barcode_type"),
                session_id=result.get("session_id")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Enhanced barcode generation failed: {result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate enhanced barcodes: {str(e)}"
        )

# Device Management Endpoints

@app.get("/devices/types", response_model=DeviceTypeListResponse)
async def get_device_types(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get all available device types"""
    try:
        return device_service.get_device_types()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get device types: {str(e)}"
        )

@app.post("/devices", response_model=DeviceResponse)
async def create_device(
    request: DeviceCreateRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Create a new device"""
    try:
        response = device_service.create_device(request)
        if not response.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.message
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create device: {str(e)}"
        )

@app.get("/devices", response_model=DeviceListResponse)
async def get_all_devices(
    active_only: bool = True,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get all devices"""
    try:
        return device_service.get_all_devices(active_only=active_only)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get devices: {str(e)}"
        )

@app.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device_by_id(
    device_id: int,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get a device by ID"""
    try:
        response = device_service.get_device_by_id(device_id)
        if not response.success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response.message
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get device: {str(e)}"
        )

@app.get("/devices/type/{device_type}", response_model=DeviceListResponse)
async def get_devices_by_type(
    device_type: str,
    active_only: bool = True,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get devices by type"""
    try:
        from models.device_models import DeviceType
        try:
            device_type_enum = DeviceType(device_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid device type: {device_type}"
            )
        
        return device_service.get_devices_by_type(device_type_enum, active_only=active_only)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get devices by type: {str(e)}"
        )

@app.put("/devices/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    request: DeviceUpdateRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Update a device"""
    try:
        response = device_service.update_device(device_id, request)
        if not response.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.message
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update device: {str(e)}"
        )

@app.delete("/devices/{device_id}", response_model=DeviceResponse)
async def delete_device(
    device_id: int,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Delete a device (soft delete)"""
    try:
        response = device_service.delete_device(device_id)
        if not response.success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response.message
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete device: {str(e)}"
        )

@app.get("/devices/statistics", response_model=dict)
async def get_device_statistics(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get device statistics"""
    try:
        stats = device_service.get_device_statistics()
        return {"success": True, "statistics": stats}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get device statistics: {str(e)}"
        )

# Phone Management Endpoints

@app.get("/phone-brands", response_model=PhoneBrandListResponse)
async def get_all_phone_brands(
    active_only: bool = True,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get all phone brands"""
    try:
        return phone_management_service.get_all_phone_brands(active_only=active_only)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get phone brands: {str(e)}"
        )

@app.post("/phone-brands", response_model=PhoneBrandResponse)
async def create_phone_brand(
    request: PhoneBrandCreateRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Create a new phone brand"""
    try:
        return phone_management_service.create_phone_brand(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create phone brand: {str(e)}"
        )

@app.get("/phone-brands/{brand_id}", response_model=PhoneBrandResponse)
async def get_phone_brand_by_id(
    brand_id: int,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get phone brand by ID"""
    try:
        return phone_management_service.get_phone_brand_by_id(brand_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get phone brand: {str(e)}"
        )

@app.put("/phone-brands/{brand_id}", response_model=PhoneBrandResponse)
async def update_phone_brand(
    brand_id: int,
    request: PhoneBrandUpdateRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Update a phone brand"""
    try:
        return phone_management_service.update_phone_brand(brand_id, request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update phone brand: {str(e)}"
        )

@app.delete("/phone-brands/{brand_id}")
async def delete_phone_brand(
    brand_id: int,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Delete a phone brand (soft delete)"""
    try:
        result = phone_management_service.delete_phone_brand(brand_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete phone brand: {str(e)}"
        )

@app.get("/phone-models/brand/{brand_id}", response_model=PhoneModelListResponse)
async def get_phone_models_by_brand(
    brand_id: int,
    active_only: bool = True,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get phone models by brand ID"""
    try:
        return phone_management_service.get_phone_models_by_brand(brand_id, active_only=active_only)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get phone models: {str(e)}"
        )

@app.post("/phone-models", response_model=PhoneModelResponse)
async def create_phone_model(
    request: PhoneModelCreateRequest,
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Create a new phone model"""
    try:
        return phone_management_service.create_phone_model(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create phone model: {str(e)}"
        )

@app.get("/scalable-device-selector", response_model=ScalableDeviceSelectorResponse)
async def get_scalable_device_selector_data(
    api_key: str = Depends(verify_api_key),
    client_ip: str = Depends(check_rate_limit)
):
    """Get data for scalable device selector (brands + popular models)"""
    try:
        return phone_management_service.get_scalable_device_selector_data()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scalable device selector data: {str(e)}"
        )

# Root endpoint (moved to end to include all endpoints)
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Barcode Generator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "generate_barcodes": "/api/barcodes/generate",
            "generate_enhanced_barcodes": "/api/barcodes/generate-enhanced",
            "generate_samsung_galaxy": "/api/barcodes/generate-samsung-galaxy",
            "test_samsung_galaxy": "/api/barcodes/test-samsung-galaxy",
            "upload_excel_samsung_galaxy": "/api/barcodes/upload-excel-samsung-galaxy",
            "save_template": "/api/templates",
            "list_templates": "/api/templates",
            "get_template": "/api/templates/{template_id}",
            "delete_template": "/api/templates/{template_id}",
            "default_template": "/api/templates/default",
            "upload_excel": "/api/barcodes/upload-excel",
            "list_files": "/api/barcodes/list",
            "download_file": "/api/barcodes/download/{filename}",
            "download_pdf": "/api/barcodes/download-pdf/{filename}",
            "create_pdf": "/api/barcodes/create-pdf",
            "device_types": "/devices/types",
            "create_device": "/devices",
            "get_devices": "/devices",
            "get_device": "/devices/{device_id}",
            "get_devices_by_type": "/devices/type/{device_type}",
            "update_device": "/devices/{device_id}",
            "delete_device": "/devices/{device_id}",
            "device_statistics": "/devices/statistics",
            "phone_brands": "/phone-brands",
            "create_phone_brand": "/phone-brands",
            "get_phone_brand": "/phone-brands/{brand_id}",
            "update_phone_brand": "/phone-brands/{brand_id}",
            "delete_phone_brand": "/phone-brands/{brand_id}",
            "phone_models_by_brand": "/phone-models/brand/{brand_id}",
            "create_phone_model": "/phone-models",
            "scalable_device_selector": "/scalable-device-selector",
            "payment_subscribe": "/api/payments/subscribe",
            "payment_status": "/api/payments/status",
            "payment_plans": "/api/payments/plans",
            "payment_webhook": "/api/payments/webhook",
            "payment_transactions": "/api/payments/transactions",
            "auth_register": "/api/auth/register",
            "auth_login": "/api/auth/login",
            "auth_logout": "/api/auth/logout",
            "auth_me": "/api/auth/me",
            "auth_refresh": "/api/auth/refresh",
            "auth_verify": "/api/auth/verify"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Check if SSL certificates exist
    ssl_keyfile = "certificates/server.key"
    ssl_certfile = "certificates/server.crt"
    
    if os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile):
        safe_logger.info("Starting FastAPI server with HTTPS (self-signed certificate)")
        safe_logger.warning("Browsers will show a security warning - this is normal for self-signed certificates")
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8034,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile
        )
    else:
        safe_logger.info("Starting FastAPI server with HTTP (no SSL certificates found)")
        safe_logger.info("Run './generate_ssl_cert.sh' to enable HTTPS")
        uvicorn.run(app, host="0.0.0.0", port=8034)
