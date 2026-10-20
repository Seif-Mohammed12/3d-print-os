import asyncio

import structlog
from fastapi import APIRouter, File, Form, UploadFile
from pydantic import ValidationError

from app.config import settings
from app.exceptions import AnalysisLimitExceededError, SlicingFailedError, StorageError
from app.slicing.config_builder import SliceConfigError
from app.slicing.engine import PrusaSlicerEngine, load_mesh
from app.slicing.models import SliceRequest, SliceResponse, SliceUploadRequest
from app.storage.client import StorageClient

router = APIRouter(prefix="/slice", tags=["slicing"])
logger = structlog.get_logger(__name__)

engine = PrusaSlicerEngine(
    executable=settings.slicer_executable,
    timeout_s=settings.slicer_timeout_seconds,
    max_parallel=settings.slicer_max_parallel,
)
storage_client = StorageClient()


async def _slice_bytes(data: bytes, body: SliceUploadRequest | SliceRequest) -> SliceResponse:
    if len(data) > settings.max_file_size_bytes:
        raise AnalysisLimitExceededError(
            f"File too large: {len(data)} > {settings.max_file_size_bytes} bytes"
        )

    def work() -> SliceResponse:
        mesh = load_mesh(data, body.file_type, body.scale, settings.slicer_max_triangles)
        try:
            return engine.slice(mesh, body.settings, body.orientation, body.selection)
        except SliceConfigError as exc:
            raise SlicingFailedError(str(exc), code="invalid_slice_settings") from exc

    # Slicing is CPU-bound and runs external processes; keep the event loop free.
    return await asyncio.to_thread(work)


@router.post("", response_model=SliceResponse)
async def slice_stored_model(request: SliceRequest) -> SliceResponse:
    """Slice a model from a signed storage URL and return slicer-accurate time and material."""
    logger.info(
        "Slicing stored model",
        tenant_id=request.tenant_id,
        model_file_id=request.model_file_id,
        orientation=request.orientation.mode.value,
    )
    try:
        data = await storage_client.fetch_url_bytes(request.download_url)
    except ValueError as exc:
        raise StorageError(str(exc)) from exc

    result = await _slice_bytes(data, request)
    logger.info(
        "Slicing completed",
        tenant_id=request.tenant_id,
        model_file_id=request.model_file_id,
        print_time_s=result.estimate.print_time_s,
        filament_g=result.estimate.filament_g,
        orientation=result.orientation.label,
    )
    return result


@router.post("/upload", response_model=SliceResponse)
async def slice_uploaded_model(
    file: UploadFile = File(...),
    request: str = Form(..., description="JSON-encoded SliceUploadRequest"),
) -> SliceResponse:
    """Slice a directly uploaded model (testing and tools)."""
    try:
        body = SliceUploadRequest.model_validate_json(request)
    except ValidationError as exc:
        raise SlicingFailedError(
            "Invalid slice request", code="invalid_slice_settings", details=exc.errors()
        ) from exc
    return await _slice_bytes(await file.read(), body)
