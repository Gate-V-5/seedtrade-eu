import subprocess
import unittest
from pathlib import Path

class NewsVisuals(unittest.TestCase):
    def test_canonical_visual_reuse_and_article_traceability(self):
        result = subprocess.run(['node', 'scripts/check_news_visuals.mjs'],
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, check=True)
        self.assertIn('News visuals PASS', result.stdout)
