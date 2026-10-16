import subprocess
import unittest
from pathlib import Path
class NewsPhotography(unittest.TestCase):
    def test_license_boundaries(self):
        r=subprocess.run(['node','--test','tests/newsImagePolicy.test.mjs'],cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)
    def test_multilingual_photo_and_fallback_dom(self):
        r=subprocess.run(['node','scripts/check_news_photography.mjs'],cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)
