"""Synthetic failure-mode tests; no saved datasets or classifiers executed."""
import unittest
from copy import deepcopy
from selection_event_validation_v01 import analyse, component_sizes, fraction, index


class ValidationTests(unittest.TestCase):
    def fixture(self):
        ph = {"emergence_date": "2023-03-28", "emergence_uncertainty_days": 17,
              "duration_days": 119, "harvest_date": "2023-07-25"}
        raw_pixel = {"row": 0, "column": 0, "cty": 1110, **ph}
        baseline_pixel = {**raw_pixel, "classification": "SPRING_CYCLE_SIGNAL"}
        saved_pixel = {"row": 0, "column": 0, "cty": 1110, "phenology_inputs": ph,
                       "agronomic_validation_status": "AGRONOMIC_CONFLICT",
                       "seedtrade_v04_validation": {"classification": "SPRING_CYCLE_SIGNAL"}}
        return ({"width_pixels": 1, "height_pixels": 1, "pixels": [raw_pixel]},
                {"pixels": [baseline_pixel]}, {"pixels": [saved_pixel]})

    def test_successful_conflict_preserves_inputs(self):
        inputs = self.fixture()
        before = deepcopy(inputs)
        result = analyse(*inputs)
        self.assertEqual(inputs, before)
        self.assertEqual(result["conflict_fraction_selected"], 1)
        self.assertEqual(result["conflict_events"][0]["component_sizes"], [1])

    def test_changed_phenology_rejected(self):
        raw, baseline, saved = self.fixture()
        saved["pixels"][0]["phenology_inputs"]["duration_days"] = 120
        with self.assertRaisesRegex(ValueError, "Phenology mismatch"):
            analyse(raw, baseline, saved)

    def test_connectivity_excludes_diagonals(self):
        self.assertEqual(component_sizes({(0, 0), (0, 1), (1, 2)}), [2, 1])

    def test_duplicate_and_out_of_bounds_rejected(self):
        p = {"row": 0, "column": 0}
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            index([p, p], 2, 2)
        with self.assertRaisesRegex(ValueError, "Out-of-bounds"):
            index([{"row": -1, "column": 0}], 2, 2)

    def test_zero_denominator_is_unavailable(self):
        self.assertIsNone(fraction(0, 0))

    def test_selection_exclusions_and_missing_baseline_separated(self):
        raw = {"width_pixels": 2, "height_pixels": 1, "pixels": [
            {"row": 0, "column": 0, "cty": 1110},
            {"row": 0, "column": 1, "cty": 0}]}
        result = analyse(raw, {"pixels": []}, {"pixels": []})
        self.assertEqual(result["target_missing_baseline"], 1)
        self.assertEqual(result["non_target_exclusions"], 1)
        self.assertIsNone(result["conflict_fraction_selected"])

    def test_missing_selected_record_rejected(self):
        pixel = {"row": 0, "column": 0, "cty": 1110}
        raw = {"width_pixels": 1, "height_pixels": 1, "pixels": [pixel]}
        with self.assertRaisesRegex(ValueError, "selection differs"):
            analyse(raw, {"pixels": [pixel]}, {"pixels": []})

    def test_incomplete_grid_rejected(self):
        with self.assertRaisesRegex(ValueError, "Incomplete raw"):
            analyse({"width_pixels": 2, "height_pixels": 2, "pixels": []},
                    {"pixels": []}, {"pixels": []})


if __name__ == "__main__":
    unittest.main()
