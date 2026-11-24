import json
import os
import re
import shutil
import threading

import numpy as np
import pytest
import trimesh

from app.exceptions import SlicingFailedError
from app.slicing import orca
from app.slicing.config_builder import SliceConfigError
from app.slicing.engine import SliceOutput
from app.slicing.gcode_parser import parse_gcode_lines
from app.slicing.models import (
    FilamentSettings,
    MachineSettings,
    OrientationMode,
    OrientationRequest,
    ProcessSettings,
    SelectionWeights,
    SliceEstimate,
    SlicerInfo,
    SliceSettings,
    SupportMode,
    SupportStyle,
)
from app.slicing.orca import OrcaSlicerEngine, build_orca_profiles, rotation_to_up
from app.slicing.orientation import apply_rotation, stable_pose_candidates


def _settings(**process) -> SliceSettings:
    return SliceSettings(
        machine=MachineSettings(
            bed_x_mm=235, bed_y_mm=235, max_height_mm=250, nozzle_diameter_mm=0.6
        ),
        process=ProcessSettings(**process),
    )


def _table() -> trimesh.Trimesh:
    post = trimesh.creation.box((6, 6, 20))
    post.apply_translation((0, 0, 10))
    top = trimesh.creation.box((40, 40, 5))
    top.apply_translation((0, 0, 22.5))
    return trimesh.util.concatenate([post, top])


class TestOrcaProfiles:
    def test_given_settings_replace_the_shop_base(self):
        profiles = build_orca_profiles(
            _settings(infill_percent=35, perimeters=3, supports=SupportMode.OFF)
        )
        assert profiles["process"]["sparse_infill_density"] == "35%"
        assert profiles["process"]["wall_loops"] == "3"
        assert profiles["process"]["enable_support"] == "0"
        assert profiles["machine"]["printable_area"] == ["0x0", "235x0", "235x235", "0x235"]

    def test_settings_not_given_come_from_the_shop_base(self):
        base = json.loads(orca._BASE.read_text(encoding="utf-8"))
        profiles = build_orca_profiles(_settings())
        for key in ("sparse_infill_density", "support_threshold_angle", "outer_wall_speed"):
            assert profiles["process"][key] == base["process"][key]
        assert profiles["filament"]["filament_density"] == base["filament"]["filament_density"]

    def test_building_never_changes_the_base(self):
        build_orca_profiles(_settings(infill_percent=99))
        assert build_orca_profiles(_settings())["process"]["sparse_infill_density"] != "99%"

    def test_support_style(self):
        process = build_orca_profiles(_settings(support_style=SupportStyle.ORGANIC))["process"]
        assert process["support_type"] == "tree(auto)"

    def test_filament(self):
        settings = _settings()
        settings.filament = FilamentSettings(density_g_cm3=1.27)
        assert build_orca_profiles(settings)["filament"]["filament_density"] == ["1.27"]

    def test_overrides_are_translated(self):
        settings = _settings()
        settings.overrides = {"default_acceleration": 4000, "machine_max_jerk_x": 9}
        profiles = build_orca_profiles(settings)
        assert profiles["process"]["default_acceleration"] == "4000"
        assert profiles["machine"]["machine_max_jerk_x"] == ["9", "9"]

    @pytest.mark.parametrize("key", ["post_process", "start_gcode", "infill_every_layers"])
    def test_unknown_overrides_are_refused(self, key):
        settings = _settings()
        settings.overrides = {key: 2}
        with pytest.raises(SliceConfigError):
            build_orca_profiles(settings)

    def test_rejects_layer_too_thick_for_nozzle(self):
        with pytest.raises(SliceConfigError, match="too thick"):
            build_orca_profiles(_settings(layer_height_mm=0.6))

    def test_base_holds_no_gcode_hosts_or_secrets(self):
        keys = [k for section in orca._base().values() for k in section]
        assert not [
            k
            for k in keys
            if k != "gcode_flavor" and re.search(r"gcode$|host|post_process|api|password|user", k)
        ]


class TestOrcaOrientation:
    @pytest.mark.parametrize("up", [(0, 0, -1), (1, 0, 0), (0, -1, 0), (0.6, 0, -0.8)])
    def test_rotation_turns_the_chosen_direction_up(self, up):
        rotation = rotation_to_up(np.array(up, dtype=float))
        assert rotation @ np.array(up) == pytest.approx([0, 0, 1], abs=1e-6)
        assert np.linalg.det(rotation) == pytest.approx(1)

    def test_falls_back_to_other_poses_when_its_choice_does_not_print(self, monkeypatch):
        engine = OrcaSlicerEngine(executable="", timeout_s=1, max_parallel=1)
        asked = []

        def fake(mesh, config, orient):
            asked.append(orient)
            if orient:
                raise SlicingFailedError("too tall")
            estimate = SliceEstimate(
                print_time_s=60,
                filament_mm=1,
                filament_cm3=1,
                filament_g=1,
                support_g=0,
                layer_count=1,
                object_height_mm=1,
                features=[],
            )
            return SliceOutput(estimate, SlicerInfo(name="OrcaSlicer", version="0")), None

        monkeypatch.setattr(engine, "_orca", fake)
        result = engine.slice(_table(), _settings(), OrientationRequest(), SelectionWeights())
        assert asked[0] is True and False in asked
        assert result.estimate.print_time_s == 60

    def test_broken_mesh_does_not_hang_the_pose_search(self, monkeypatch):
        mesh = _table()
        monkeypatch.setattr(type(mesh), "is_volume", property(lambda self: True))
        monkeypatch.setattr(
            type(mesh), "center_mass", property(lambda self: np.array([500.0, 0, 0]))
        )
        found = []
        worker = threading.Thread(
            target=lambda: found.extend(stable_pose_candidates(mesh, 4)), daemon=True
        )
        worker.start()
        worker.join(20)
        assert not worker.is_alive(), "pose search never finished"
        assert len(found) == 4


def test_orca_support_features_count_as_support():
    estimate, name, version = parse_gcode_lines(
        [
            "; generated by OrcaSlicer 2.5.1 on 2026-11-24 at 18:06:32",
            ";LAYER_CHANGE",
            ";Z:0.2",
            ";TYPE:Outer wall",
            "G1 X1 Y1 E3",
            ";TYPE:Support",
            "G1 X2 Y2 E1",
            "; filament used [mm] = 4",
            "; filament used [cm3] = 0.01",
            "; filament used [g] = 8",
            "; estimated printing time (normal mode) = 1m 5s",
        ]
    )
    assert (name, version) == ("OrcaSlicer", "2.5.1")
    assert estimate.support_g == pytest.approx(2)
    assert estimate.print_time_s == 65


ORCA = next(
    (
        c
        for c in (
            os.environ.get("ORCA_EXECUTABLE"),
            shutil.which("orca-slicer"),
            r"C:\Program Files\OrcaSlicer\orca-slicer.exe",
        )
        if c and os.path.exists(c)
    ),
    None,
)


@pytest.mark.skipif(ORCA is None, reason="OrcaSlicer not installed")
class TestRealOrca:
    engine = OrcaSlicerEngine(executable=ORCA or "", timeout_s=120, max_parallel=2)

    def test_auto_orientation_is_reported_and_repeatable(self):
        tilted = apply_rotation(
            _table(), trimesh.transformations.rotation_matrix(0.5, [1, 0.3, 0])[:3, :3]
        )
        auto = self.engine.slice(tilted, _settings(), OrientationRequest(), SelectionWeights())
        assert auto.slicer.name == "OrcaSlicer"
        assert auto.estimate.support_g == 0
        again = self.engine.slice(
            tilted,
            _settings(),
            OrientationRequest(mode=OrientationMode.FIXED, rotation=auto.orientation.rotation),
            SelectionWeights(),
        )
        assert again.estimate.filament_g == pytest.approx(auto.estimate.filament_g, rel=0.02)

    def test_supports_are_weighed(self):
        as_is = self.engine.slice(
            _table(),
            _settings(),
            OrientationRequest(mode=OrientationMode.AS_IS),
            SelectionWeights(),
        )
        assert as_is.estimate.support_g > 1

    def test_part_as_wide_as_the_bed_still_prices(self):
        result = self.engine.slice(
            trimesh.creation.box((234, 100, 20)),
            _settings(),
            OrientationRequest(),
            SelectionWeights(),
        )
        assert result.estimate.filament_g > 0
