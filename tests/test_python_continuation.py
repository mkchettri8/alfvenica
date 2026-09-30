"""Focused source-of-plotting-data check for the optional Python continuation."""
import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


HELPER = Path(__file__).resolve().parents[1] / "examples/wind_pilot/replay.py"
spec = importlib.util.spec_from_file_location("wind_replay_helper", HELPER)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class PlottingSourceTest(unittest.TestCase):
    def test_uses_validated_bundle_rows_instead_of_sibling_csv(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "analysis.json"
            bundle.write_text(json.dumps({
                "schema": {"name": "org.alfvenica.wind-analysis-bundle", "version": "1.0.0"},
                "plottingData": [{"timestampUtc": "2020-01-01T16:00:00Z",
                                  "proton_inertial_length": 123.0,
                                  "proton_gyroradius_perp_sigma": 45.0}],
            }))
            bundle.with_name("plotting-data.csv").write_text(
                "timestampUtc,proton_inertial_length,proton_gyroradius_perp_sigma\n"
                "2020-01-01T16:00:00Z,999.0,888.0\n")
            output = io.StringIO()
            with patch.object(helper.subprocess, "run") as replay, \
                 patch.object(sys, "argv", ["replay.py", str(bundle)]), \
                 contextlib.redirect_stdout(output):
                helper.main()
            replay.assert_called_once_with(
                ["node", str(helper.ROOT / "tools/replay-analysis.js"), str(bundle)], check=True)
            self.assertIn("123.0", output.getvalue())
            self.assertIn("45.0", output.getvalue())
            self.assertNotIn("999.0", output.getvalue())


if __name__ == "__main__":
    unittest.main()
