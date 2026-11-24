"""Slice a small model with the configured slicer: python -m app.slicing.selftest"""

import time

import trimesh

from app.api.slicing_routes import engine
from app.config import settings
from app.slicing.models import (
    MachineSettings,
    OrientationRequest,
    SelectionWeights,
    SliceSettings,
)


def main() -> None:
    started = time.monotonic()
    result = engine.slice(
        trimesh.creation.torus(22, 8, major_sections=160, minor_sections=80),
        SliceSettings(
            machine=MachineSettings(
                bed_x_mm=220, bed_y_mm=220, max_height_mm=250, nozzle_diameter_mm=0.6
            )
        ),
        OrientationRequest(),
        SelectionWeights(),
    )
    expected = {"orca": "OrcaSlicer", "prusa": "PrusaSlicer"}[settings.slicer_engine]
    if result.slicer.name != expected:
        raise SystemExit(f"Expected {expected} but {result.slicer.name} did the slicing")
    print(
        f"{result.slicer.name} {result.slicer.version}: {result.estimate.filament_g:.1f} g, "
        f"{result.estimate.print_time_s // 60} min, took {time.monotonic() - started:.1f} s"
    )


if __name__ == "__main__":
    main()
