"""Request/response models for slicer-backed print estimation."""

from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator


class GcodeFlavor(str, Enum):
    KLIPPER = "klipper"
    MARLIN2 = "marlin2"
    MARLIN = "marlin"
    REPRAPFIRMWARE = "reprapfirmware"


class InfillPattern(str, Enum):
    GRID = "grid"
    GYROID = "gyroid"
    RECTILINEAR = "rectilinear"
    CUBIC = "cubic"
    ADAPTIVE_CUBIC = "adaptivecubic"
    SUPPORT_CUBIC = "supportcubic"
    HONEYCOMB = "honeycomb"
    TRIANGLES = "triangles"
    LIGHTNING = "lightning"
    LINE = "line"


class SupportMode(str, Enum):
    """`auto` lets the slicer place supports only where overhangs need them."""

    AUTO = "auto"
    BUILDPLATE_ONLY = "buildplate_only"
    OFF = "off"


class SupportStyle(str, Enum):
    GRID = "grid"
    SNUG = "snug"
    ORGANIC = "organic"


class MachineSettings(BaseModel):
    """Physical printer limits. Time estimates are only as good as these values."""

    bed_x_mm: float = Field(..., gt=0, le=2000)
    bed_y_mm: float = Field(..., gt=0, le=2000)
    max_height_mm: float = Field(..., gt=0, le=2000)
    nozzle_diameter_mm: float = Field(0.4, ge=0.1, le=2.0)
    gcode_flavor: GcodeFlavor = GcodeFlavor.KLIPPER
    max_acceleration_mm_s2: float = Field(3000, ge=100, le=100000)
    max_feedrate_xy_mm_s: float = Field(300, ge=10, le=2000)
    max_feedrate_z_mm_s: float = Field(10, ge=1, le=200)


class ProcessSettings(BaseModel):
    """Print process (quality) settings. Speeds are mm/s."""

    layer_height_mm: float = Field(0.2, ge=0.04, le=1.0)
    first_layer_height_mm: Optional[float] = Field(None, ge=0.04, le=1.0)
    perimeters: int = Field(2, ge=1, le=30)
    top_layers: int = Field(4, ge=0, le=100)
    bottom_layers: int = Field(4, ge=0, le=100)
    infill_percent: float = Field(20, ge=0, le=100)
    infill_pattern: InfillPattern = InfillPattern.GRID
    supports: SupportMode = SupportMode.AUTO
    support_style: SupportStyle = SupportStyle.GRID
    support_threshold_deg: float = Field(50, ge=0, le=90)
    brim_width_mm: float = Field(0, ge=0, le=50)
    skirts: int = Field(1, ge=0, le=20)

    perimeter_speed: float = Field(60, gt=0, le=1000)
    external_perimeter_speed: float = Field(40, gt=0, le=1000)
    infill_speed: float = Field(80, gt=0, le=1000)
    solid_infill_speed: float = Field(60, gt=0, le=1000)
    top_solid_infill_speed: float = Field(40, gt=0, le=1000)
    support_speed: float = Field(60, gt=0, le=1000)
    bridge_speed: float = Field(40, gt=0, le=1000)
    travel_speed: float = Field(150, gt=0, le=2000)
    first_layer_speed: float = Field(25, gt=0, le=500)


class FilamentSettings(BaseModel):
    diameter_mm: float = Field(1.75, ge=1.0, le=3.5)
    density_g_cm3: float = Field(1.24, ge=0.5, le=3.0)
    nozzle_temp_c: int = Field(210, ge=150, le=500)
    bed_temp_c: int = Field(60, ge=0, le=150)


OverrideValue = Union[bool, int, float, str]


class SliceSettings(BaseModel):
    machine: MachineSettings
    process: ProcessSettings = Field(default_factory=ProcessSettings)
    filament: FilamentSettings = Field(default_factory=FilamentSettings)
    # Extra tuned slicer keys; only allowlisted keys are accepted (see config_builder).
    overrides: dict[str, OverrideValue] = Field(default_factory=dict)


class OrientationMode(str, Enum):
    AUTO = "auto"  # slice several stable poses and keep the cheapest
    AS_IS = "as_is"  # keep the uploaded orientation
    FIXED = "fixed"  # caller-supplied rotation matrix


class OrientationRequest(BaseModel):
    mode: OrientationMode = OrientationMode.AUTO
    rotation: Optional[list[list[float]]] = Field(
        None, description="3x3 rotation matrix, required when mode is 'fixed'"
    )
    max_candidates: int = Field(4, ge=1, le=8)

    @field_validator("rotation")
    @classmethod
    def _rotation_is_3x3(cls, value: Optional[list[list[float]]]) -> Optional[list[list[float]]]:
        if value is not None and (len(value) != 3 or any(len(row) != 3 for row in value)):
            raise ValueError("rotation must be a 3x3 matrix")
        return value


class SelectionWeights(BaseModel):
    """Relative costs used to rank orientation candidates (any consistent currency unit)."""

    cost_per_hour: float = Field(100.0, ge=0)
    cost_per_gram: float = Field(1.0, ge=0)
    # Extra penalty for support material (removal labour, surface scarring).
    support_penalty_per_gram: float = Field(1.0, ge=0)


class SliceRequest(BaseModel):
    tenant_id: str
    model_file_id: str
    # Short-lived signed URL minted by the API; the bucket itself stays private.
    download_url: str = Field(..., pattern=r"^https?://", max_length=4096)
    file_type: str = Field("stl", pattern=r"^(stl|obj|3mf)$")
    scale: float = Field(1.0, gt=0.0001, le=1000)
    settings: SliceSettings
    orientation: OrientationRequest = Field(default_factory=OrientationRequest)
    selection: SelectionWeights = Field(default_factory=SelectionWeights)


class SliceUploadRequest(BaseModel):
    """Body of the `request` form field for direct-upload slicing."""

    file_type: str = Field("stl", pattern=r"^(stl|obj|3mf)$")
    scale: float = Field(1.0, gt=0.0001, le=1000)
    settings: SliceSettings
    orientation: OrientationRequest = Field(default_factory=OrientationRequest)
    selection: SelectionWeights = Field(default_factory=SelectionWeights)


class FeatureUsage(BaseModel):
    feature: str
    filament_mm: float
    grams: float


class SliceEstimate(BaseModel):
    print_time_s: int
    filament_mm: float
    filament_cm3: float
    filament_g: float
    support_g: float
    layer_count: int
    object_height_mm: float
    features: list[FeatureUsage]


class CandidateResult(BaseModel):
    label: str
    rotation: list[list[float]]
    size_mm: list[float]
    estimate: Optional[SliceEstimate] = None
    score: Optional[float] = None
    error: Optional[str] = None


class SlicerInfo(BaseModel):
    name: str
    version: str


class SliceResponse(BaseModel):
    slicer: SlicerInfo
    estimate: SliceEstimate
    orientation: CandidateResult
    candidates: list[CandidateResult]
    mesh_volume_mm3: float
    mesh_is_watertight: bool
    warnings: list[str]
