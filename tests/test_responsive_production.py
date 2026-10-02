import subprocess
import unittest
from pathlib import Path

class ResponsiveProduction(unittest.TestCase):
    def test_media_aware_discovery_metrics_and_language_controls(self):
        result = subprocess.run(['node', 'scripts/check_responsive_production.mjs'],
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, check=True)
        self.assertIn('Responsive CSS/DOM PASS', result.stdout)
