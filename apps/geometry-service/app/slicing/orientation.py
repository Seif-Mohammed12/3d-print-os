"""Orientation candidates for slicing.

The slicer is the judge: we propose a handful of physically stable resting poses, slice each,
and keep the cheapest. Candidates that only differ by a spin around Z slice identically, so they
are de-duplicated by their "up" direction.
"""

from dataclasses import dataclass

import numpy as np
import trimesh

_SAME_UP_DOT = 0.999


@dataclass(frozen=True)
class Candidate:
    label: str
    rotation: np.ndarray  # 3x3


def _up_vector(rotation: np.ndarray) -> np.ndarray:
    # Direction in the original model frame that ends up pointing +Z.
    return rotation.T @ np.array([0.0, 0.0, 1.0])


def _is_duplicate(rotation: np.ndarray, chosen: list[Candidate]) -> bool:
    up = _up_vector(rotation)
    return any(float(up @ _up_vector(c.rotation)) > _SAME_UP_DOT for c in chosen)


def _axis_aligned_rotations() -> list[tuple[str, np.ndarray]]:
    rx = trimesh.transformations.rotation_matrix
    poses = [
        ("rotate_x_90", rx(np.pi / 2, [1, 0, 0])),
        ("rotate_x_-90", rx(-np.pi / 2, [1, 0, 0])),
        ("rotate_y_90", rx(np.pi / 2, [0, 1, 0])),
        ("rotate_y_-90", rx(-np.pi / 2, [0, 1, 0])),
        ("upside_down", rx(np.pi, [1, 0, 0])),
    ]
    return [(label, matrix[:3, :3]) for label, matrix in poses]


def stable_pose_candidates(mesh: trimesh.Trimesh, max_candidates: int) -> list[Candidate]:
    """Uploaded orientation first, then the most probable stable poses."""
    chosen: list[Candidate] = [Candidate("as_uploaded", np.eye(3))]
    if max_candidates <= 1:
        return chosen

    proposals: list[tuple[str, np.ndarray]] = []
    try:
        center = mesh.center_mass if mesh.is_volume else mesh.convex_hull.center_mass
        transforms, probabilities = mesh.compute_stable_poses(center_mass=center)
        order = np.argsort(probabilities)[::-1]
        for rank, index in enumerate(order):
            proposals.append(
                (
                    f"stable_pose_{rank + 1}_p{probabilities[index]:.2f}",
                    np.asarray(transforms[index])[:3, :3],
                )
            )
    except Exception:  # degenerate hulls (flat or broken meshes)
        proposals = []

    proposals.extend(_axis_aligned_rotations())

    for label, rotation in proposals:
        if len(chosen) >= max_candidates:
            break
        if not _is_duplicate(rotation, chosen):
            chosen.append(Candidate(label, rotation))
    return chosen


def fixed_candidate(rotation: list[list[float]]) -> Candidate:
    matrix = np.asarray(rotation, dtype=float)
    if not np.allclose(matrix @ matrix.T, np.eye(3), atol=1e-3) or np.linalg.det(matrix) < 0:
        raise ValueError("rotation must be a proper rotation matrix")
    return Candidate("fixed", matrix)


def apply_rotation(mesh: trimesh.Trimesh, rotation: np.ndarray) -> trimesh.Trimesh:
    """Rotated copy resting on Z=0."""
    transform = np.eye(4)
    transform[:3, :3] = rotation
    rotated = mesh.copy()
    rotated.apply_transform(transform)
    rotated.apply_translation([0.0, 0.0, -rotated.bounds[0][2]])
    return rotated


def fit_on_bed(
    mesh: trimesh.Trimesh, bed_x: float, bed_y: float, max_height: float
) -> tuple[bool, np.ndarray]:
    """Return (fits, z-spin rotation). Tries a 90 degree spin when that makes it fit."""
    size = mesh.extents
    if size[2] > max_height:
        return False, np.eye(3)
    if size[0] <= bed_x and size[1] <= bed_y:
        return True, np.eye(3)
    if size[1] <= bed_x and size[0] <= bed_y:
        spin = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 0, 1])[:3, :3]
        return True, spin
    return False, np.eye(3)
