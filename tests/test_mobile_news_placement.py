import subprocess
import unittest
from pathlib import Path

class MobileNewsPlacement(unittest.TestCase):
    def test_legacy_defect_explicit_cells_and_desktop_parity(self):
        result = subprocess.run(['node', 'scripts/check_mobile_news_placement.mjs'],
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, check=True)
        self.assertIn('Mobile placement PASS', result.stdout)
