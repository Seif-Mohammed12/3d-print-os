"""Run OrcaSlicer on a mesh, letting it choose the orientation.

Everything the caller doesn't set comes from `orca_base.json`, the shop's own Orca settings (no
G-code, hosts or scripts), so a quote matches how the part will really be printed.
"""

import copy
import json
import os
import re
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import numpy as np
import structlog
import trimesh

from app.exceptions import SlicingFailedError
from app.slicing.config_builder import (
    SliceConfigError,
    resolve_first_layer_height,
    validate_override,
)
from app.slicing.engine import PrusaSlicerEngine, SliceOutput, score_estimate
from app.slicing.gcode_parser import parse_gcode_file
from app.slicing.models import (
    CandidateResult,
    OrientationMode,
    OrientationRequest,
    SelectionWeights,
    SliceResponse,
    SliceSettings,
    SlicerInfo,
    SupportMode,
    SupportStyle,
)

logger = structlog.get_logger(__name__)

_BASE = Path(__file__).with_name("orca_base.json")
_BEST_UP = re.compile(r"^best:\s*(\S+)\s+(\S+)\s+(\S+),", re.MULTILINE)

_PATTERNS = {
    "adaptivecubic": "adaptivecubic",
    "supportcubic": "supportcubic",
    "rectilinear": "zig-zag",
    "triangles": "triangles",
}

_SUPPORT_STYLES = {
    SupportStyle.GRID: ("normal(auto)", "grid"),
    SupportStyle.SNUG: ("normal(auto)", "snug"),
    SupportStyle.ORGANIC: ("tree(auto)", "organic"),
}

# Caller override -> (section, Orca keys). Anything else allowed for PrusaSlicer has no exact
# Orca equivalent and is refused rather than quietly mispriced.
_OVERRIDES: dict[str, tuple[str, tuple[str, ...]]] = {
    "slowdown_below_layer_time": ("filament", ("slow_down_layer_time",)),
    "min_print_speed": ("filament", ("slow_down_min_speed",)),
    "cooling": ("filament", ("slow_down_for_layer_cooling",)),
    "filament_max_volumetric_speed": ("filament", ("filament_max_volumetric_speed",)),
    "extrusion_multiplier": ("filament", ("filament_flow_ratio",)),
    "default_acceleration": ("process", ("default_acceleration",)),
    "perimeter_acceleration": ("process", ("inner_wall_acceleration",)),
    "external_perimeter_acceleration": ("process", ("outer_wall_acceleration",)),
    "infill_acceleration": ("process", ("sparse_infill_acceleration",)),
    "solid_infill_acceleration": ("process", ("internal_solid_infill_acceleration",)),
    "top_solid_infill_acceleration": ("process", ("top_surface_acceleration",)),
    "bridge_acceleration": ("process", ("bridge_acceleration",)),
    "first_layer_acceleration": ("process", ("initial_layer_acceleration",)),
    "travel_acceleration": ("process", ("travel_acceleration",)),
    "small_perimeter_speed": ("process", ("small_perimeter_speed",)),
    "gap_fill_speed": ("process", ("gap_infill_speed",)),
    "ironing_speed": ("process", ("ironing_speed",)),
    "extrusion_width": ("process", ("line_width",)),
    "perimeter_extrusion_width": ("process", ("inner_wall_line_width",)),
    "external_perimeter_extrusion_width": ("process", ("outer_wall_line_width",)),
    "infill_extrusion_width": ("process", ("sparse_infill_line_width",)),
    "solid_infill_extrusion_width": ("process", ("internal_solid_infill_line_width",)),
    "support_material_extrusion_width": ("process", ("support_line_width",)),
    "fill_angle": ("process", ("infill_direction",)),
    "support_material_interface_layers": ("process", ("support_interface_top_layers",)),
    "support_material_contact_distance": ("process", ("support_top_z_distance",)),
    "support_material_spacing": ("process", ("support_base_pattern_spacing",)),
    "support_material_interface_spacing": ("process", ("support_interface_spacing",)),
    "thick_bridges": ("process", ("thick_bridges",)),
    "avoid_crossing_perimeters": ("process", ("reduce_crossing_wall",)),
    "spiral_vase": ("process", ("spiral_mode",)),
    "machine_max_jerk_x": ("machine", ("machine_max_jerk_x",)),
    "machine_max_jerk_y": ("machine", ("machine_max_jerk_y",)),
    "machine_max_jerk_z": ("machine", ("machine_max_jerk_z",)),
    "machine_max_acceleration_retracting": ("machine", ("machine_max_acceleration_retracting",)),
    "retract_length": ("machine", ("retraction_length",)),
    "retract_speed": ("machine", ("retraction_speed",)),
    "retract_lift": ("machine", ("z_hop",)),
    "wipe": ("machine", ("wipe",)),
}


@lru_cache(maxsize=1)
def _base() -> dict[str, dict[str, Any]]:
    return json.loads(_BASE.read_text(encoding="utf-8"))


def _fmt(value: float) -> str:
    return f"{value:.6g}"


def build_orca_profiles(settings: SliceSettings) -> dict[str, dict[str, Any]]:
    """The machine, process and filament profiles for one slice."""
    profiles = copy.deepcopy(_base())
    machine, process, filament = (profiles[k] for k in ("machine", "process", "filament"))
    m, p, f = settings.machine, settings.process, settings.filament

    max_layer = m.nozzle_diameter_mm * 0.8
    first_layer = resolve_first_layer_height(settings)
    if max(p.layer_height_mm, first_layer) > max_layer + 1e-9:
        raise SliceConfigError(
            f"Layer height {_fmt(max(p.layer_height_mm, first_layer))} mm is too thick for a "
            f"{_fmt(m.nozzle_diameter_mm)} mm nozzle (max {_fmt(max_layer)} mm)"
        )

    bx, by = _fmt(m.bed_x_mm), _fmt(m.bed_y_mm)
    machine.update(
        {
            "gcode_flavor": m.gcode_flavor.value,
            "printable_area": ["0x0", f"{bx}x0", f"{bx}x{by}", f"0x{by}"],
            "printable_height": _fmt(m.max_height_mm),
            "nozzle_diameter": [_fmt(m.nozzle_diameter_mm)],
            "use_relative_e_distances": "1",
            # Absent from the base; the limits then count towards time, not towards G-code.
            "emit_machine_limits_to_gcode": "0",
        }
    )
    if "max_acceleration_mm_s2" in m.model_fields_set:
        for axis in ("x", "y", "extruding", "travel"):
            machine[f"machine_max_acceleration_{axis}"] = [_fmt(m.max_acceleration_mm_s2)] * 2
    if "max_feedrate_xy_mm_s" in m.model_fields_set:
        for axis in "xy":
            machine[f"machine_max_speed_{axis}"] = [_fmt(m.max_feedrate_xy_mm_s)] * 2
    if "max_feedrate_z_mm_s" in m.model_fields_set:
        machine["machine_max_speed_z"] = [_fmt(m.max_feedrate_z_mm_s)] * 2

    given = p.model_fields_set
    process["layer_height"] = _fmt(p.layer_height_mm)
    process["initial_layer_print_height"] = _fmt(first_layer)
    numbers = {
        "perimeters": ("wall_loops",),
        "top_layers": ("top_shell_layers",),
        "bottom_layers": ("bottom_shell_layers",),
        "support_threshold_deg": ("support_threshold_angle",),
        "skirts": ("skirt_loops",),
        "perimeter_speed": ("inner_wall_speed",),
        "external_perimeter_speed": ("outer_wall_speed",),
        "infill_speed": ("sparse_infill_speed",),
        "solid_infill_speed": ("internal_solid_infill_speed",),
        "top_solid_infill_speed": ("top_surface_speed",),
        "support_speed": ("support_speed", "support_interface_speed"),
        "bridge_speed": ("bridge_speed",),
        "travel_speed": ("travel_speed",),
        "first_layer_speed": ("initial_layer_speed",),
    }
    for field, keys in numbers.items():
        if field in given:
            for key in keys:
                process[key] = _fmt(getattr(p, field))
    if "infill_percent" in given:
        process["sparse_infill_density"] = f"{_fmt(p.infill_percent)}%"
    if "infill_pattern" in given:
        process["sparse_infill_pattern"] = _PATTERNS.get(
            p.infill_pattern.value, p.infill_pattern.value
        )
    if "brim_width_mm" in given:
        process["brim_type"] = "outer_only" if p.brim_width_mm > 0 else "no_brim"
        process["brim_width"] = _fmt(p.brim_width_mm)
    process["enable_support"] = "0" if p.supports == SupportMode.OFF else "1"
    process["support_on_build_plate_only"] = (
        "1" if p.supports == SupportMode.BUILDPLATE_ONLY else "0"
    )
    if "support_style" in given:
        process["support_type"], process["support_style"] = _SUPPORT_STYLES[p.support_style]

    if "diameter_mm" in f.model_fields_set:
        filament["filament_diameter"] = [_fmt(f.diameter_mm)]
    if "density_g_cm3" in f.model_fields_set:
        filament["filament_density"] = [_fmt(f.density_g_cm3)]
    if "nozzle_temp_c" in f.model_fields_set:
        for key in ("nozzle_temperature", "nozzle_temperature_initial_layer"):
            filament[key] = [str(f.nozzle_temp_c)]
    if "bed_temp_c" in f.model_fields_set:
        for plate in ("hot", "textured", "cool", "eng"):
            for suffix in ("plate_temp", "plate_temp_initial_layer"):
                filament[f"{plate}_{suffix}"] = [str(f.bed_temp_c)]

    for key, value in settings.overrides.items():
        text = validate_override(key, value)  # refuses anything that isn't allowlisted
        if key not in _OVERRIDES:
            raise SliceConfigError(f"Slicer setting '{key}' is not supported by OrcaSlicer")
        section, orca_keys = _OVERRIDES[key]
        for orca_key in orca_keys:
            if section == "process":
                profiles[section][orca_key] = text
            else:
                profiles[section][orca_key] = text.split(",")

    for name, profile in profiles.items():
        profile.update(
            {"type": name, "name": f"quote-{name}", "from": "system", "instantiation": "true"}
        )
        if name != "machine":
            profile["compatible_printers"] = ["quote-machine"]
    machine.update(printer_model="quote", printer_variant=_fmt(m.nozzle_diameter_mm))
    return profiles


def rotation_to_up(up: np.ndarray) -> np.ndarray:
    """Rotation that turns the model-frame direction `up` to +Z."""
    matrix = trimesh.geometry.align_vectors(up, [0.0, 0.0, 1.0])
    return np.asarray(matrix)[:3, :3]


class OrcaSlicerEngine(PrusaSlicerEngine):
    """Orca picks the orientation (one slice); poses are only tried if that can't be printed."""

    def _prepare(self, settings: SliceSettings) -> Any:
        return build_orca_profiles(settings)

    def _run(
        self,
        mesh: trimesh.Trimesh,
        config: dict[str, dict[str, Any]],
        bed_center: tuple[float, float],
    ) -> SliceOutput:
        placed = mesh.copy()
        middle = placed.bounds.mean(axis=0)
        placed.apply_translation([bed_center[0] - middle[0], bed_center[1] - middle[1], 0.0])
        return self._orca(placed, config, orient=False)[0]

    def _orca(
        self, mesh: trimesh.Trimesh, config: dict[str, dict[str, Any]], orient: bool
    ) -> tuple[SliceOutput, Optional[np.ndarray]]:
        """Slice; also the model direction Orca turned upwards, when it was asked to."""
        with tempfile.TemporaryDirectory(prefix="slice-") as workdir:
            paths = {}
            for name, profile in config.items():
                paths[name] = os.path.join(workdir, f"{name}.json")
                with open(paths[name], "w", encoding="utf-8") as handle:
                    json.dump(profile, handle)
            datadir = os.path.join(workdir, "datadir")
            os.mkdir(datadir)
            model_path = os.path.join(workdir, "model.stl")
            mesh.export(model_path, file_type="stl")

            command = [
                self.executable,
                "--datadir",
                datadir,
                "--debug",
                "2",
                "--load-settings",
                f"{paths['machine']};{paths['process']}",
                "--load-filaments",
                paths["filament"],
                "--ensure-on-bed",
            ]
            if orient:
                command += ["--orient", "1", "--arrange", "1", "--allow-rotations"]
            else:
                command += ["--orient", "0", "--arrange", "0"]
            command += ["--slice", "0", "--outputdir", workdir, model_path]

            gcode_path = os.path.join(workdir, "plate_1.gcode")
            output = self._execute(command, gcode_path)
            estimate, name, version = self._parse(gcode_path)

        up = None
        if orient:
            match = _BEST_UP.search(output)
            if match:
                up = np.array([float(match.group(i)) for i in (1, 2, 3)])
        return SliceOutput(estimate, SlicerInfo(name=name, version=version)), up

    def slice(
        self,
        mesh: trimesh.Trimesh,
        settings: SliceSettings,
        orientation: OrientationRequest,
        selection: SelectionWeights,
    ) -> SliceResponse:
        if orientation.mode == OrientationMode.AUTO:
            try:
                return self._slice_auto(mesh, settings, selection)
            except SlicingFailedError as exc:
                # Typically its choice is too tall for this printer; another pose may fit.
                logger.info("Orca's own orientation failed, trying others", details=exc.details)
        return super().slice(mesh, settings, orientation, selection)

    def _slice_auto(
        self, mesh: trimesh.Trimesh, settings: SliceSettings, selection: SelectionWeights
    ) -> SliceResponse:
        output, up = self._orca(mesh, self._prepare(settings), orient=True)
        if up is None or not np.isfinite(up).all() or np.linalg.norm(up) < 0.5:
            raise SlicingFailedError("OrcaSlicer did not report the orientation it chose")
        as_uploaded = float(up[2] / np.linalg.norm(up)) > 0.999
        rotation = np.eye(3) if as_uploaded else rotation_to_up(up)
        rotated = mesh.vertices @ rotation.T
        chosen = CandidateResult(
            label="as_uploaded" if as_uploaded else "orca_auto_orient",
            rotation=[[round(float(v), 6) for v in row] for row in rotation],
            size_mm=[round(float(v), 3) for v in np.ptp(rotated, axis=0)],
            estimate=output.estimate,
            score=round(score_estimate(output.estimate, selection), 4),
        )
        warnings = self._mesh_warnings(mesh)
        if not as_uploaded:
            warnings.append("Model re-oriented for printing (orca_auto_orient)")
        return SliceResponse(
            slicer=output.slicer,
            estimate=output.estimate,
            orientation=chosen,
            candidates=[chosen],
            mesh_volume_mm3=round(float(abs(mesh.volume)), 3) if mesh.is_volume else 0.0,
            mesh_is_watertight=bool(mesh.is_watertight),
            warnings=warnings,
        )
