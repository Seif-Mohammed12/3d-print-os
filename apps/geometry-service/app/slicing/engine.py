"""Run PrusaSlicer on a mesh and turn the G-code into a print estimate."""

import io
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Optional

import numpy as np
import structlog
import trimesh

from app.exceptions import (
    AnalysisLimitExceededError,
    InvalidSTLError,
    SlicerUnavailableError,
    SlicingFailedError,
    SlicingTimeoutError,
)
from app.slicing.config_builder import build_config, render_ini
from app.slicing.gcode_parser import GcodeParseError, parse_gcode_file
from app.slicing.models import (
    CandidateResult,
    OrientationMode,
    OrientationRequest,
    SelectionWeights,
    SliceEstimate,
    SlicerInfo,
    SliceResponse,
    SliceSettings,
)
from app.slicing.orientation import (
    Candidate,
    apply_rotation,
    fit_on_bed,
    fixed_candidate,
    stable_pose_candidates,
)

logger = structlog.get_logger(__name__)

_STDERR_TAIL_CHARS = 600


@dataclass(frozen=True)
class _SliceOutput:
    estimate: SliceEstimate
    slicer: SlicerInfo


def load_mesh(data: bytes, file_type: str, scale: float, max_triangles: int) -> trimesh.Trimesh:
    try:
        mesh = trimesh.load(io.BytesIO(data), file_type=file_type, force="mesh")
    except Exception as exc:
        raise InvalidSTLError(f"Could not read {file_type.upper()} file: {exc}") from exc
    if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
        raise InvalidSTLError("Model contains no printable geometry")
    if len(mesh.faces) > max_triangles:
        raise AnalysisLimitExceededError(
            f"Model has {len(mesh.faces)} triangles; the limit is {max_triangles}"
        )
    if scale != 1.0:
        mesh.apply_scale(scale)
    return mesh


def score_estimate(estimate: SliceEstimate, weights: SelectionWeights) -> float:
    hours = estimate.print_time_s / 3600
    return (
        hours * weights.cost_per_hour
        + estimate.filament_g * weights.cost_per_gram
        + estimate.support_g * weights.support_penalty_per_gram
    )


class PrusaSlicerEngine:
    def __init__(self, executable: str, timeout_s: float, max_parallel: int):
        self.executable = executable
        self.timeout_s = timeout_s
        self.max_parallel = max(1, max_parallel)

    def _run(self, mesh: trimesh.Trimesh, ini_text: str, bed_center: tuple[float, float]) -> _SliceOutput:
        with tempfile.TemporaryDirectory(prefix="slice-") as workdir:
            model_path = os.path.join(workdir, "model.stl")
            ini_path = os.path.join(workdir, "profile.ini")
            gcode_path = os.path.join(workdir, "out.gcode")
            datadir = os.path.join(workdir, "datadir")
            os.mkdir(datadir)

            mesh.export(model_path, file_type="stl")
            with open(ini_path, "w", encoding="utf-8") as handle:
                handle.write(ini_text)

            command = [
                self.executable,
                "--export-gcode",
                # Isolate from any user-level slicer configuration on the host.
                "--datadir",
                datadir,
                "--load",
                ini_path,
                "--center",
                f"{bed_center[0]:.3f},{bed_center[1]:.3f}",
                "--ensure-on-bed",
                "--output",
                gcode_path,
                model_path,
            ]
            try:
                completed = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_s,
                    check=False,
                )
            except FileNotFoundError as exc:
                raise SlicerUnavailableError(
                    f"Slicer executable not found: {self.executable}"
                ) from exc
            except subprocess.TimeoutExpired as exc:
                raise SlicingTimeoutError(
                    f"Slicing took longer than {self.timeout_s:.0f}s"
                ) from exc

            if completed.returncode != 0 or not os.path.exists(gcode_path):
                output = (completed.stderr or completed.stdout or "").strip()
                raise SlicingFailedError(
                    "Slicer rejected the model",
                    details={"slicer_output": output[-_STDERR_TAIL_CHARS:]},
                )

            try:
                estimate, name, version = parse_gcode_file(gcode_path)
            except GcodeParseError as exc:
                raise SlicingFailedError(str(exc), code="gcode_parse_failed") from exc
            return _SliceOutput(estimate, SlicerInfo(name=name, version=version))

    def _candidates(self, mesh: trimesh.Trimesh, orientation: OrientationRequest) -> list[Candidate]:
        if orientation.mode == OrientationMode.FIXED:
            if orientation.rotation is None:
                raise SlicingFailedError("A rotation is required for fixed orientation", code="invalid_orientation")
            try:
                return [fixed_candidate(orientation.rotation)]
            except ValueError as exc:
                raise SlicingFailedError(str(exc), code="invalid_orientation") from exc
        if orientation.mode == OrientationMode.AS_IS:
            return [Candidate("as_uploaded", np.eye(3))]
        return stable_pose_candidates(mesh, orientation.max_candidates)

    def slice(
        self,
        mesh: trimesh.Trimesh,
        settings: SliceSettings,
        orientation: OrientationRequest,
        selection: SelectionWeights,
    ) -> SliceResponse:
        ini_text = render_ini(build_config(settings))
        machine = settings.machine
        bed_center = (machine.bed_x_mm / 2, machine.bed_y_mm / 2)

        warnings: list[str] = []
        if not mesh.is_watertight:
            warnings.append("Mesh is not watertight; the slicer repaired it and volumes may be off")

        candidates = self._candidates(mesh, orientation)
        results: list[CandidateResult] = []
        jobs: list[tuple[int, trimesh.Trimesh]] = []
        for candidate in candidates:
            rotated = apply_rotation(mesh, candidate.rotation)
            fits, spin = fit_on_bed(rotated, machine.bed_x_mm, machine.bed_y_mm, machine.max_height_mm)
            rotation = spin @ candidate.rotation
            if fits and not np.allclose(spin, np.eye(3)):
                rotated = apply_rotation(mesh, rotation)
            size = [round(float(v), 3) for v in rotated.extents]
            results.append(
                CandidateResult(
                    label=candidate.label,
                    rotation=[[round(float(v), 6) for v in row] for row in rotation],
                    size_mm=size,
                    error=None if fits else (
                        f"Does not fit the build volume ({size[0]} x {size[1]} x {size[2]} mm "
                        f"vs {machine.bed_x_mm:g} x {machine.bed_y_mm:g} x {machine.max_height_mm:g} mm)"
                    ),
                )
            )
            if fits:
                jobs.append((len(results) - 1, rotated))

        if not jobs:
            raise SlicingFailedError(
                "Model does not fit the printer's build volume in any orientation tried",
                code="model_too_large",
                details={"candidates": [r.model_dump() for r in results]},
            )

        slicer_info: Optional[SlicerInfo] = None
        hard_errors: list[Exception] = []
        with ThreadPoolExecutor(max_workers=min(self.max_parallel, len(jobs))) as pool:
            futures = {
                index: pool.submit(self._run, rotated, ini_text, bed_center) for index, rotated in jobs
            }
            for index, future in futures.items():
                try:
                    output = future.result()
                except (SlicerUnavailableError, SlicingTimeoutError) as exc:
                    hard_errors.append(exc)
                    results[index].error = exc.message
                    continue
                except SlicingFailedError as exc:
                    results[index].error = exc.message
                    logger.warning("Candidate failed to slice", label=results[index].label, details=exc.details)
                    continue
                slicer_info = output.slicer
                results[index].estimate = output.estimate
                results[index].score = round(score_estimate(output.estimate, selection), 4)

        scored = [r for r in results if r.score is not None]
        if not scored:
            if hard_errors:
                raise hard_errors[0]
            raise SlicingFailedError(
                "Slicer could not process the model in any orientation",
                details={"candidates": [r.model_dump() for r in results]},
            )

        best = min(scored, key=lambda r: r.score)
        assert best.estimate is not None and slicer_info is not None
        if best.label != "as_uploaded" and len(scored) > 1:
            warnings.append(f"Model re-oriented for printing ({best.label})")

        return SliceResponse(
            slicer=slicer_info,
            estimate=best.estimate,
            orientation=best,
            candidates=results,
            mesh_volume_mm3=round(float(abs(mesh.volume)), 3) if mesh.is_volume else 0.0,
            mesh_is_watertight=bool(mesh.is_watertight),
            warnings=warnings,
        )
