import subprocess
import unittest
from pathlib import Path
class NewsExperienceV3(unittest.TestCase):
    def test_unified_news_contract_and_integrity(self):
        r=subprocess.run(['node','scripts/check_news_v3.mjs'],cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)

    def test_exact_owner_approved_public_exception(self):
        r=subprocess.run(['node','--test','tests/newsPresentation.test.mjs'],cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)
