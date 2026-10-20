from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration."""

    # Service
    service_name: str = "geometry-analysis-service"
    environment: str = "development"
    debug: bool = False

    # API
    host: str = "0.0.0.0"
    port: int = 8000
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://printos:printos@localhost:5432/printos"

    # Storage (for fetching STL files)
    storage_base_url: Optional[str] = None
    storage_bucket: str = "model-files"

    # Analysis limits
    max_file_size_bytes: int = 100 * 1024 * 1024  # 100MB
    max_triangles: int = 1000000  # Safety limit

    # Slicing (PrusaSlicer CLI)
    slicer_executable: str = "prusa-slicer"
    slicer_timeout_seconds: float = 300.0  # per orientation candidate
    slicer_max_parallel: int = 4
    slicer_max_triangles: int = 2000000
    # Comma-separated hostnames the slicer may download models from (e.g. the Supabase
    # project host). Empty allows any host; set it in every shared environment.
    slicer_allowed_download_hosts: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
