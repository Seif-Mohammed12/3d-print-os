"""Predict which orientation prints cheapest from the mesh alone, without slicing.

Two things separate orientations of the same part: the support it needs and its height. Support
is estimated by sampling the surface: for every overhanging point, how far down to the next
surface below it (or the bed). The constants were fitted on real slices of real models; they
only need to rank orientations, the price always comes from a real slice.
"""

from dataclasses import dataclass

import numpy as np
import trimesh

from app.slicing.models import SelectionWeights, SliceSettings, SupportMode

_SAMPLES = 40_000
# Support grams per (mm3 of space under overhangs) ** 0.8, in PLA. Sparse support is far from
# solid, and gets sparser relative to its volume as it grows.
_SUPPORT_G = 0.003356
_SUPPORT_EXPONENT = 0.8
_PLA_DENSITY = 1.24
# Hours per mm of height at 0.2 mm layers (travel, layer changes, slow outer walls).
_HOURS_PER_MM = 0.019
# How much dearer than the best guess the runner-up may look and still deserve a real slice.
TIE_MARGIN = 0.12
# Non-support cost relative to its plastic alone.
_BODY_COST_FACTOR = 1.3


@dataclass(frozen=True)
class SurfaceSample:
    points: np.ndarray
    normals: np.ndarray
    area_each: float


def sample_surface(mesh: trimesh.Trimesh) -> SurfaceSample:
    """Evenly spread surface points; the same mesh always gives the same sample."""
    rng = np.random.default_rng(0)
    cumulative = np.cumsum(mesh.area_faces)
    total = float(cumulative[-1])
    if not np.isfinite(total) or total <= 0:
        raise ValueError("Mesh has no surface area")
    picks = (np.arange(_SAMPLES) + rng.random(_SAMPLES)) / _SAMPLES * total
    faces = np.searchsorted(cumulative, picks).clip(0, len(cumulative) - 1)
    r, s = np.sqrt(rng.random(_SAMPLES)), rng.random(_SAMPLES)
    corners = mesh.triangles[faces]
    points = (
        (1 - r)[:, None] * corners[:, 0]
        + (r * (1 - s))[:, None] * corners[:, 1]
        + (r * s)[:, None] * corners[:, 2]
    )
    return SurfaceSample(points, mesh.face_normals[faces], total / _SAMPLES)


def support_volume_and_height(
    sample: SurfaceSample, rotation: np.ndarray, threshold_deg: float, layer_height_mm: float
) -> tuple[float, float]:
    """Space under overhangs (mm3) and height (mm) when printed in this orientation."""
    points = sample.points @ rotation.T
    up = sample.normals @ rotation[2]
    z = points[:, 2] - points[:, 2].min()
    footprint = sample.area_each * np.abs(up)

    on_bed = z < max(layer_height_mm, 0.2) * 1.5
    # The slicer's threshold is measured from horizontal: 90 supports every overhang.
    overhang = (up < -1e-3) & ~on_bed & (-up > np.cos(np.radians(threshold_deg)))

    # Columns wide enough to hold several samples each.
    cell = max(1.0, float(np.sqrt(max(footprint.sum() / 2, 1.0) * 12 / len(z))))
    ij = np.floor((points[:, :2] - points[:, :2].min(axis=0)) / cell).astype(np.int64)
    column = ij[:, 0] * (int(ij[:, 1].max()) + 1) + ij[:, 1]

    # Walk each column upwards, remembering the last upward-facing surface.
    order = np.lexsort((z, column))
    column, z_sorted = column[order], z[order]
    last_up = np.maximum.accumulate(np.where(up[order] > 0.05, np.arange(len(order)), -1))
    found = last_up >= 0
    last_up = last_up.clip(0)
    found &= column[last_up] == column
    below = np.where(found, z_sorted[last_up], 0.0)

    volume = float((footprint[order] * (z_sorted - below))[overhang[order]].sum())
    return volume, float(z.max())


def predicted_extra_cost(
    sample: SurfaceSample, rotation: np.ndarray, settings: SliceSettings, weights: SelectionWeights
) -> float:
    """The part of the cost that depends on orientation, in the caller's cost units."""
    process = settings.process
    volume, height = support_volume_and_height(
        sample, rotation, process.support_threshold_deg, process.layer_height_mm
    )
    if process.supports == SupportMode.OFF:
        volume = 0.0
    support_g = (
        _SUPPORT_G * volume**_SUPPORT_EXPONENT * settings.filament.density_g_cm3 / _PLA_DENSITY
    )
    hours = _HOURS_PER_MM * height * 0.2 / process.layer_height_mm
    return (
        support_g * (weights.cost_per_gram + weights.support_penalty_per_gram)
        + hours * weights.cost_per_hour
    )


def worth_slicing_too(
    best_extra: float, other_extra: float, body_g: float, weights: SelectionWeights
) -> bool:
    """Is the runner-up too close to the best guess to call without slicing it?"""
    body = body_g * weights.cost_per_gram * _BODY_COST_FACTOR
    return body + other_extra < (body + best_extra) * (1 + TIE_MARGIN)
