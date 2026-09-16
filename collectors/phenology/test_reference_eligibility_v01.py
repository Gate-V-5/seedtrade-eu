import unittest
from copy import deepcopy
from reference_eligibility_v01 import screen_manifest


def fixture():
    return {"reference_id": "SYNTHETIC_ONLY", "source_url": "https://example.invalid/reference",
            "license_evidence": "synthetic", "group_id": "synthetic-parcel",
            "geometry_evidence": "synthetic", "crs": "EPSG:32634",
            "position_quality_evidence": "synthetic", "label_definition_evidence": "synthetic",
            "training_provenance_evidence": "synthetic", "unit": "PARCEL", "season": "WINTER",
            "training_use": "EXCLUDED", "geometry_review": "VERIFIED", "label_review": "VERIFIED",
            "usage_review": "PERMITTED", "reference_year": 2023}


class ReferenceTests(unittest.TestCase):
    def test_padded_reference_id_rejected(self):
        a, b = fixture(), fixture()
        b["reference_id"] += " "
        rows = screen_manifest([a,b],2023)["records"]
        self.assertEqual(rows[1]["status"], "REJECTED")
        self.assertIn("reference_id:PADDED_ID", rows[1]["failed"])

    def test_padded_group_cannot_enter_holdout(self):
        a, b = fixture(), fixture()
        a.update(reference_id="a", split="DEVELOPMENT")
        b.update(reference_id="b", split="HELD_OUT", prior_inspection=False)
        b["group_id"] += "\t"
        rows = screen_manifest([a,b],2023)["records"]
        self.assertEqual(rows[1]["status"], "REJECTED")
        self.assertIn("group_id:PADDED_ID", rows[1]["failed"])

    def test_complete_metadata_is_only_candidate_and_immutable(self):
        rows = [fixture()]
        before = deepcopy(rows)
        result = screen_manifest(rows, 2023)
        self.assertEqual(result["records"][0]["status"], "CANDIDATE_FOR_REVIEW")
        self.assertFalse(result["independent_accuracy_established"])
        self.assertEqual(rows, before)

    def test_missing_geometry_or_unknown_training_is_pending(self):
        for field, value in (("geometry_evidence", None), ("training_use", "UNKNOWN")):
            r = fixture(); r[field] = value
            self.assertEqual(screen_manifest([r],2023)["records"][0]["status"], "PENDING_EVIDENCE")

    def test_unsuitable_reference_rejected(self):
        for field, value in (("unit", "AGGREGATE"), ("training_use", "USED"),
                             ("reference_year", 2022), ("reference_year", True),
                             ("season", "UNMAPPED"), ("geometry_review", [])):
            r = fixture(); r[field] = value
            self.assertEqual(screen_manifest([r],2023)["records"][0]["status"], "REJECTED")

    def test_duplicate_ids_reject_both(self):
        self.assertTrue(all(r["status"] == "REJECTED" for r in
                            screen_manifest([fixture(),fixture()],2023)["records"]))

    def test_group_cannot_cross_splits(self):
        a, b = fixture(), fixture()
        a.update(reference_id="a", split="DEVELOPMENT")
        b.update(reference_id="b", split="HELD_OUT", prior_inspection=False)
        rows = screen_manifest([a,b],2023)["records"]
        self.assertTrue(all("split:GROUP_LEAKAGE" in r["failed"] for r in rows))

    def test_previously_inspected_holdout_rejected(self):
        r = fixture(); r.update(split="HELD_OUT", prior_inspection=True)
        self.assertIn("split:PREVIOUSLY_INSPECTED", screen_manifest([r],2023)["records"][0]["failed"])

    def test_empty_manifest_does_not_establish_accuracy(self):
        result = screen_manifest([],2023)
        self.assertEqual(result["records"], [])
        self.assertFalse(result["independent_accuracy_established"])


if __name__ == "__main__":
    unittest.main()
