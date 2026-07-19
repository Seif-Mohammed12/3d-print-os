from fastapi import Header, HTTPException, status
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)


async def validate_tenant_id(
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    Validate and extract tenant ID from headers.
    
    This is a simplified version. In production, this would validate
    against a JWT token or session.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant ID header required"
        )
    
    # Basic UUID format validation
    try:
        # Simple validation - in production use proper UUID validation
        if len(x_tenant_id) != 36 or x_tenant_id.count('-') != 4:
            raise ValueError("Invalid UUID format")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    return x_tenant_id


async def validate_content_type(
    content_type: Optional[str] = Header(None)
) -> str:
    """
    Validate content type for file uploads.
    """
    allowed_types = [
        "model/stl",
        "application/octet-stream",
        "application/sla"
    ]
    
    if content_type and content_type not in allowed_types:
        logger.warning(
            "Unexpected content type",
            content_type=content_type,
            allowed_types=allowed_types
        )
    
    return content_type or "application/octet-stream"
