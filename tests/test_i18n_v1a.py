import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MultilingualUiV1ATests(unittest.TestCase):
    def test_five_language_catalog_and_render(self):
        result = subprocess.run(
            ["node", "scripts/check_i18n_v1a.mjs"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        self.assertIn("SSR coverage PASS", result.stdout)


if __name__ == "__main__":
    unittest.main()
