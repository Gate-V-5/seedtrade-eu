import subprocess
import unittest
from pathlib import Path

class CataloguePhotography1C(unittest.TestCase):
    def test_licenses_assets_responsive_images_and_fallback(self):
        root = Path(__file__).resolve().parents[1]
        for args in [['node', 'scripts/validate_catalogue_photographs.mjs'], ['node', 'scripts/check_catalogue_photography.mjs']]:
            result = subprocess.run(args, cwd=root, capture_output=True, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
