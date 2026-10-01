import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class DynamicContentLocalizationV1B(unittest.TestCase):
    def test_render_fallback_identity_and_publication_safety(self):
        result = subprocess.run(['node', 'scripts/check_i18n_v1b.mjs'], cwd=ROOT,
                                capture_output=True, text=True, check=True)
        self.assertIn('V1-B PASS', result.stdout)
