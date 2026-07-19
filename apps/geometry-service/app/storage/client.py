import httpx
from typing import Optional
import structlog

from app.config import settings


class StorageClient:
    """Client for fetching STL files from object storage."""

    def __init__(self):
        self.base_url = settings.storage_base_url
        self.logger = structlog.get_logger(__name__)
        
        if not self.base_url:
            self.logger.warning("Storage base URL not configured, direct file upload required")

    async def fetch_stl_bytes(
        self, 
        storage_key: str, 
        bucket: Optional[str] = None
    ) -> bytes:
        """
        Fetch STL file bytes from storage.
        
        Args:
            storage_key: Storage key for the file
            bucket: Storage bucket (uses default if not provided)
            
        Returns:
            Raw STL file bytes
            
        Raises:
            ValueError: If storage is not configured or fetch fails
        """
        if not self.base_url:
            raise ValueError("Storage base URL not configured")
        
        bucket = bucket or settings.storage_bucket
        url = f"{self.base_url}/{bucket}/{storage_key}"
        
        self.logger.info("Fetching STL from storage", url=url, bucket=bucket, key=storage_key)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                
                content_length = len(response.content)
                if content_length > settings.max_file_size_bytes:
                    raise ValueError(
                        f"File too large: {content_length} > {settings.max_file_size_bytes}"
                    )
                
                self.logger.info(
                    "STL file fetched successfully",
                    size_bytes=content_length,
                    url=url
                )
                
                return response.content
                
            except httpx.HTTPStatusError as e:
                self.logger.error("Failed to fetch STL from storage", error=str(e), status=e.response.status_code)
                raise ValueError(f"Storage fetch failed: {e.response.status_code}")
            except Exception as e:
                self.logger.error("Failed to fetch STL from storage", error=str(e))
                raise ValueError(f"Storage fetch failed: {str(e)}")
