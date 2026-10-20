import httpx
from urllib.parse import urlparse
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

    async def fetch_url_bytes(self, url: str) -> bytes:
        """Fetch a model from a pre-signed URL, enforcing the host allowlist and size limit."""
        host = (urlparse(url).hostname or "").lower()
        allowed = {
            h.strip().lower()
            for h in settings.slicer_allowed_download_hosts.split(",")
            if h.strip()
        }
        if allowed and host not in allowed:
            raise ValueError(f"Download host '{host}' is not allowed")

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
            try:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    chunks: list[bytes] = []
                    received = 0
                    async for chunk in response.aiter_bytes():
                        received += len(chunk)
                        if received > settings.max_file_size_bytes:
                            raise ValueError(
                                f"File too large: more than {settings.max_file_size_bytes} bytes"
                            )
                        chunks.append(chunk)
                    return b"".join(chunks)
            except httpx.HTTPStatusError as e:
                # Never log the signed URL itself; it is a bearer credential.
                self.logger.error("Model download failed", status=e.response.status_code, host=host)
                raise ValueError(f"Model download failed: {e.response.status_code}")
            except httpx.HTTPError as e:
                self.logger.error("Model download failed", error=type(e).__name__, host=host)
                raise ValueError("Model download failed")
