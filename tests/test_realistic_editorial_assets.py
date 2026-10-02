import subprocess
import unittest
from pathlib import Path

class RealisticEditorialAssets(unittest.TestCase):
    def test_article_licences_and_immutable_owner_originals(self):
        result = subprocess.run(['node', 'scripts/validate_editorial_assets.mjs'],
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, check=True)
        self.assertIn('Editorial assets PASS', result.stdout)
