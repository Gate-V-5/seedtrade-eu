import json
import pathlib
import subprocess
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = (ROOT / 'src/AppV2.jsx').read_text()
PULSE = json.loads((ROOT / 'src/generated/trade_pulse_public.json').read_text())


class RollingTradePulseClarityTests(unittest.TestCase):
    def test_window_derives_from_latest_and_excludes_partial(self):
        script = '''
import {rollingCompletedHistory,rollingCompletedRange} from './src/tradePulsePeriods.mjs';
const history=Array.from({length:14},(_,i)=>({period:`${2025+Math.floor((i+6)/12)}-${String((i+6)%12+1).padStart(2,'0')}`}));
const before=rollingCompletedRange(history,'2026-06','2026-07');
const after=rollingCompletedRange(history,'2026-07','2026-08');
const partial=rollingCompletedHistory(history,'2026-06','2026-07');
console.log(JSON.stringify({before,after,partial:partial.map(x=>x.period)}));
'''
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
        out = json.loads(result.stdout)
        self.assertEqual({'start': '2025-07', 'end': '2026-06', 'complete': True}, out['before'])
        self.assertEqual({'start': '2025-08', 'end': '2026-07', 'complete': True}, out['after'])
        self.assertNotIn('2026-07', out['partial'])

    def test_incomplete_or_gapped_history_fails_closed(self):
        script = '''
import {rollingCompletedRange} from './src/tradePulsePeriods.mjs';
const history=Array.from({length:12},(_,i)=>({period:`2025-${String(i+1).padStart(2,'0')}`}));
console.log(JSON.stringify([rollingCompletedRange(history.slice(1),'2025-12','2026-01'),rollingCompletedRange(history.filter(x=>x.period!=='2025-06'),'2025-12','2026-01')]));
'''
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
        self.assertEqual([False, False], [row['complete'] for row in json.loads(result.stdout)])

    def test_ui_explains_distinct_periods_and_yoy_basis(self):
        self.assertIn('Latest completed period: {tradePulse.latest_completed_period}', APP)
        self.assertIn('Rolling 12 completed months: ${completedRange.start} → ${completedRange.end}', APP)
        self.assertIn('Rolling 12-month trade activity', APP)
        self.assertIn('YoY compares each completed month with the same month one year earlier.', APP)
        self.assertIn('Partial {tradePulse.latest_available_partial_period} is excluded from this chart, trends and activity labels.', APP)
        self.assertIn('<small>{period}</small>', APP)
        self.assertIn('const periods=completedHistory(tradePulse.views.eu_internal_trade)', APP)
        self.assertNotIn('Rolling 12 completed months: 2025-07', APP)

    def test_current_public_data_invariants(self):
        self.assertEqual('2026-06', PULSE['latest_completed_period'])
        self.assertEqual('2026-07', PULSE['latest_available_partial_period'])
        self.assertTrue(PULSE['partial_period_excluded'])
        for view in PULSE['views'].values():
            self.assertEqual('2025-07', view['history'][0]['period'])
            self.assertEqual('2026-06', view['history'][-1]['period'])
            self.assertNotIn('2026-07', [p['period'] for p in view['history']])

    def test_static_first_output_if_built(self):
        html = ROOT / 'dist/index.html'
        pulse = ROOT / 'dist/trade-pulse/index.html'
        if not html.exists() or not pulse.exists():
            self.skipTest('run after Vite build to verify static-first output')
        home, dashboard = html.read_text(), pulse.read_text()
        self.assertIn('Rolling 12 completed months: 2025-07 → 2026-06', home)
        self.assertIn('Rolling 12-month trade activity', dashboard)
        self.assertIn('2025-07 → 2026-06', dashboard)
        self.assertRegex(dashboard, r'2026-07(?:<!-- -->)? is partial and excluded from trends')
        self.assertIn('2025-07', dashboard)


if __name__ == '__main__':
    unittest.main()
