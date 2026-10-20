"""Build a PrusaSlicer .ini config from typed slice settings.

Only explicitly mapped or allowlisted keys are ever written. Free-form keys such as
`post_process` or `start_gcode` can execute commands or inject G-code, so they are never
accepted from callers.
"""

from dataclasses import dataclass
from typing import Optional

from app.slicing.models import OverrideValue, SliceSettings, SupportMode


class SliceConfigError(ValueError):
    """Settings cannot produce a valid slicer config."""


@dataclass(frozen=True)
class _Numeric:
    min: float
    max: float
    integer: bool = False
    # Machine limits take "normal,stealth" pairs.
    pair: bool = False


@dataclass(frozen=True)
class _Enum:
    values: frozenset[str]


_BOOL = "bool"

_SOLID_PATTERNS = frozenset(
    {
        "rectilinear",
        "monotonic",
        "monotoniclines",
        "alignedrectilinear",
        "concentric",
        "hilbertcurve",
        "archimedeanchords",
        "octagramspiral",
    }
)

ALLOWED_OVERRIDES: dict[str, object] = {
    # Cooling slowdown matters a lot for small parts' print time.
    "slowdown_below_layer_time": _Numeric(0, 300),
    "min_print_speed": _Numeric(1, 500),
    "cooling": _BOOL,
    # Accelerations
    "default_acceleration": _Numeric(0, 100000),
    "perimeter_acceleration": _Numeric(0, 100000),
    "external_perimeter_acceleration": _Numeric(0, 100000),
    "infill_acceleration": _Numeric(0, 100000),
    "solid_infill_acceleration": _Numeric(0, 100000),
    "top_solid_infill_acceleration": _Numeric(0, 100000),
    "bridge_acceleration": _Numeric(0, 100000),
    "first_layer_acceleration": _Numeric(0, 100000),
    "travel_acceleration": _Numeric(0, 100000),
    "machine_max_jerk_x": _Numeric(0, 200, pair=True),
    "machine_max_jerk_y": _Numeric(0, 200, pair=True),
    "machine_max_jerk_z": _Numeric(0, 200, pair=True),
    "machine_max_acceleration_retracting": _Numeric(100, 100000, pair=True),
    # Speeds / flow
    "small_perimeter_speed": _Numeric(0, 1000),
    "gap_fill_speed": _Numeric(0, 1000),
    "ironing_speed": _Numeric(1, 1000),
    "travel_speed_z": _Numeric(0, 500),
    "max_volumetric_speed": _Numeric(0, 200),
    "filament_max_volumetric_speed": _Numeric(0, 200),
    "extrusion_multiplier": _Numeric(0.5, 2.0),
    "extrusion_width": _Numeric(0, 3),
    "perimeter_extrusion_width": _Numeric(0, 3),
    "external_perimeter_extrusion_width": _Numeric(0, 3),
    "infill_extrusion_width": _Numeric(0, 3),
    "solid_infill_extrusion_width": _Numeric(0, 3),
    "support_material_extrusion_width": _Numeric(0, 3),
    "infill_every_layers": _Numeric(1, 20, integer=True),
    "fill_angle": _Numeric(0, 360),
    # Retraction
    "retract_length": _Numeric(0, 20),
    "retract_speed": _Numeric(1, 300),
    "retract_lift": _Numeric(0, 10),
    "wipe": _BOOL,
    # Supports
    "support_material_interface_layers": _Numeric(0, 20, integer=True),
    "support_material_contact_distance": _Numeric(0, 2),
    "support_material_spacing": _Numeric(0, 20),
    "support_material_interface_spacing": _Numeric(0, 20),
    "support_material_synchronize_layers": _BOOL,
    # Quality
    "ironing": _BOOL,
    "ironing_type": _Enum(frozenset({"top", "topmost", "solid"})),
    "thick_bridges": _BOOL,
    "overhangs": _BOOL,
    "ensure_vertical_shell_thickness": _BOOL,
    "avoid_crossing_perimeters": _BOOL,
    "only_retract_when_crossing_perimeters": _BOOL,
    "spiral_vase": _BOOL,
    "seam_position": _Enum(frozenset({"random", "nearest", "aligned", "rear"})),
    "top_fill_pattern": _Enum(_SOLID_PATTERNS),
    "bottom_fill_pattern": _Enum(_SOLID_PATTERNS),
}


def _fmt(value: float) -> str:
    return f"{value:.6g}"


def _pair(value: float) -> str:
    return f"{_fmt(value)},{_fmt(value)}"


def _validate_override(key: str, value: OverrideValue) -> str:
    rule = ALLOWED_OVERRIDES.get(key)
    if rule is None:
        raise SliceConfigError(f"Slicer setting '{key}' is not allowed")

    if rule == _BOOL:
        if not isinstance(value, bool):
            raise SliceConfigError(f"Slicer setting '{key}' must be true or false")
        return "1" if value else "0"

    if isinstance(rule, _Enum):
        if not isinstance(value, str) or value not in rule.values:
            allowed = ", ".join(sorted(rule.values))
            raise SliceConfigError(f"Slicer setting '{key}' must be one of: {allowed}")
        return value

    assert isinstance(rule, _Numeric)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SliceConfigError(f"Slicer setting '{key}' must be a number")
    if not rule.min <= value <= rule.max:
        raise SliceConfigError(
            f"Slicer setting '{key}' must be between {_fmt(rule.min)} and {_fmt(rule.max)}"
        )
    if rule.integer and int(value) != value:
        raise SliceConfigError(f"Slicer setting '{key}' must be a whole number")
    number = int(value) if rule.integer else float(value)
    return _pair(number) if rule.pair else _fmt(number)


def resolve_first_layer_height(settings: SliceSettings) -> float:
    explicit: Optional[float] = settings.process.first_layer_height_mm
    if explicit is not None:
        return explicit
    nozzle = settings.machine.nozzle_diameter_mm
    return round(min(max(settings.process.layer_height_mm, nozzle * 0.5), nozzle * 0.75), 3)


def build_config(settings: SliceSettings) -> dict[str, str]:
    """Return the full key/value config written to the slicer .ini."""
    machine = settings.machine
    process = settings.process
    filament = settings.filament

    max_layer = machine.nozzle_diameter_mm * 0.8
    if process.layer_height_mm > max_layer + 1e-9:
        raise SliceConfigError(
            f"Layer height {_fmt(process.layer_height_mm)} mm is too thick for a "
            f"{_fmt(machine.nozzle_diameter_mm)} mm nozzle (max {_fmt(max_layer)} mm)"
        )
    first_layer = resolve_first_layer_height(settings)
    if first_layer > max_layer + 1e-9:
        raise SliceConfigError(
            f"First layer height {_fmt(first_layer)} mm is too thick for the nozzle"
        )

    bx, by = machine.bed_x_mm, machine.bed_y_mm
    config: dict[str, str] = {
        # Machine
        "gcode_flavor": machine.gcode_flavor.value,
        "bed_shape": f"0x0,{_fmt(bx)}x0,{_fmt(bx)}x{_fmt(by)},0x{_fmt(by)}",
        "max_print_height": _fmt(machine.max_height_mm),
        "nozzle_diameter": _fmt(machine.nozzle_diameter_mm),
        "machine_limits_usage": "time_estimate_only",
        "machine_max_acceleration_x": _pair(machine.max_acceleration_mm_s2),
        "machine_max_acceleration_y": _pair(machine.max_acceleration_mm_s2),
        "machine_max_acceleration_extruding": _pair(machine.max_acceleration_mm_s2),
        "machine_max_acceleration_travel": _pair(machine.max_acceleration_mm_s2),
        "machine_max_feedrate_x": _pair(machine.max_feedrate_xy_mm_s),
        "machine_max_feedrate_y": _pair(machine.max_feedrate_xy_mm_s),
        "machine_max_feedrate_z": _pair(machine.max_feedrate_z_mm_s),
        # Output shape needed by the G-code parser
        "use_relative_e_distances": "1",
        "gcode_comments": "0",
        "complete_objects": "0",
        # Filament
        "filament_diameter": _fmt(filament.diameter_mm),
        "filament_density": _fmt(filament.density_g_cm3),
        "temperature": str(filament.nozzle_temp_c),
        "first_layer_temperature": str(filament.nozzle_temp_c),
        "bed_temperature": str(filament.bed_temp_c),
        "first_layer_bed_temperature": str(filament.bed_temp_c),
        # Process
        "layer_height": _fmt(process.layer_height_mm),
        "first_layer_height": _fmt(first_layer),
        "perimeters": str(process.perimeters),
        "top_solid_layers": str(process.top_layers),
        "bottom_solid_layers": str(process.bottom_layers),
        "fill_density": f"{_fmt(process.infill_percent)}%",
        "fill_pattern": process.infill_pattern.value,
        "support_material": "0" if process.supports == SupportMode.OFF else "1",
        "support_material_auto": "1",
        "support_material_buildplate_only": (
            "1" if process.supports == SupportMode.BUILDPLATE_ONLY else "0"
        ),
        "support_material_threshold": _fmt(process.support_threshold_deg),
        "support_material_style": process.support_style.value,
        "brim_width": _fmt(process.brim_width_mm),
        "skirts": str(process.skirts),
        # Speeds (mm/s)
        "perimeter_speed": _fmt(process.perimeter_speed),
        "external_perimeter_speed": _fmt(process.external_perimeter_speed),
        "infill_speed": _fmt(process.infill_speed),
        "solid_infill_speed": _fmt(process.solid_infill_speed),
        "top_solid_infill_speed": _fmt(process.top_solid_infill_speed),
        "support_material_speed": _fmt(process.support_speed),
        "support_material_interface_speed": _fmt(process.support_speed),
        "bridge_speed": _fmt(process.bridge_speed),
        "travel_speed": _fmt(process.travel_speed),
        "first_layer_speed": _fmt(process.first_layer_speed),
    }

    for key, value in settings.overrides.items():
        config[key] = _validate_override(key, value)

    return config


def render_ini(config: dict[str, str]) -> str:
    lines = []
    for key, value in config.items():
        if "\n" in value or "\r" in value:
            raise SliceConfigError(f"Slicer setting '{key}' contains a line break")
        lines.append(f"{key} = {value}")
    return "\n".join(lines) + "\n"
