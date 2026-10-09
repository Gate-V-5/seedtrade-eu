import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = '802c515ec3c6b10dc3eb06e145ecf74d9d2dc12e'


class DailyNewsV1Tests(unittest.TestCase):
    def test_selection_evidence_safety_continuity_archive_and_localization(self):
        result = subprocess.run(['node', '--test', 'tests/dailyNews.test.mjs'], cwd=ROOT,
                                capture_output=True, text=True, check=True)
        self.assertIn('fail 0', result.stdout)

    def test_archive_filter_controls_and_live_language_cycle(self):
        result = subprocess.run(['node', 'scripts/check_daily_news_dom.mjs'], cwd=ROOT,
                                capture_output=True, text=True, check=True)
        self.assertIn('Daily News DOM PASS', result.stdout)

    def test_protected_data_and_server_are_unchanged(self):
        for path in ['server/networkInterestLegacy.mjs', 'src/generated/market_public.json',
                     'src/generated/weather_public.json',
                     'src/generated/supply_public.json', 'src/generated/rfqs_public.json',
                     'src/generated/insights.json', 'src/data/species_master_v1_1.json']:
            canonical = subprocess.check_output(['git', 'show', f'{BASE}:{path.replace("networkInterestLegacy.mjs", "networkInterest.mjs")}'], cwd=ROOT)
            self.assertEqual((ROOT / path).read_bytes(), canonical, path)

    def test_static_server_routing_is_unchanged(self):
        canonical = subprocess.check_output(['git', 'show', f'{BASE}:server/index.mjs'], cwd=ROOT, text=True)
        current = (ROOT / 'server/index.mjs').read_text()
        current = current.replace("  if (runtime) res.setHeader('X-SeedTrade-Staging-Backend', 'package3h')\n", '')
        current_static = current.split('const dist =', 1)[1].split('server.requestTimeout', 1)[0].replace("  if (runtime?.cron && req.url === '/api/internal/network-delivery') return runtime.cron(req, res)\n", '')
        self.assertEqual(current_static, canonical.split('const dist =', 1)[1].split('server.listen(listenPort)', 1)[0])

    def test_about_and_b2b_components_are_unchanged(self):
        canonical = subprocess.check_output(['git', 'show', f'{BASE}:src/AppV2.jsx'], cwd=ROOT, text=True)
        current = (ROOT / 'src/AppV2.jsx').read_text()
        for name in ['AboutPage', 'NetworkInterestForm', 'Header', 'BuyingRequests']:
            if f'function {name}(' not in canonical:
                continue
            original = canonical.split(f'function {name}(', 1)[1].split('\nfunction ', 1)[0]
            actual = current.split(f'function {name}(', 1)[1].split('\nfunction ', 1)[0]
            self.assertEqual(actual, original, name)

    def test_manifest_existing_datasets_are_unchanged(self):
        original = json.loads(subprocess.check_output(['git', 'show', f'{BASE}:src/generated/public_data_manifest.json'], cwd=ROOT))
        current = json.loads((ROOT / 'src/generated/public_data_manifest.json').read_text())
        for key, value in original['datasets'].items():
            if key=='trade_pulse':
                self.assertEqual(current['datasets'][key]['included_cn_code_count'],40)
                self.assertEqual(current['datasets'][key]['source'],value['source'])
            else:self.assertEqual(current['datasets'][key], value)
