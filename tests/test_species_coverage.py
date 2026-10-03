import csv,hashlib,json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class SpeciesCoverageTests(unittest.TestCase):
 def test_complete_inventory_and_provenance(self):
  rows=json.loads((ROOT/'docs/species-coverage-v1/SPECIES_COVERAGE_121.json').read_text())
  self.assertEqual(len(rows),121);self.assertEqual(len({r['biological_species_key'] for r in rows}),121)
  self.assertEqual(sum(r['catch_crop'] for r in rows),52)
  for r in rows:
   self.assertTrue(r['botanical_name']);self.assertTrue(r['identity_provenance']);self.assertTrue(r['sowing_non_sowing_separated'])
   if r['any_production_metric']:self.assertTrue(r['source_provenance'])
   if not r['any_production_metric']:self.assertIsNone(r['latest_year'])
  for r in json.loads((ROOT/'docs/species-coverage-v1/PROVENANCE_MANIFEST.json').read_text())['inputs']:
   self.assertEqual(hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest(),r['sha256'])
  for p in (ROOT/'docs/species-coverage-v1').glob('*.csv'):
   data=json.loads(p.with_suffix('.json').read_text())
   with p.open(newline='') as f:csvrows=list(csv.DictReader(f))
   self.assertEqual(len(data),len(csvrows))
   for a,b in zip(data,csvrows):
    for k,v in a.items():self.assertEqual(b[k],json.dumps(v,ensure_ascii=False,separators=(',',':')) if isinstance(v,(dict,list,bool)) or v is None else str(v))
 def test_additive_scope_and_homepage_guard(self):
  subprocess.run(['node','--test','tests/speciesCoverage.test.mjs'],cwd=ROOT,check=True,capture_output=True)
  text=(ROOT/'src/AppV2.jsx').read_text()
  self.assertIn('{expanded&&<div className="intelligence-number"><b>{market.latest_completed_period}',text)
  self.assertIn('Latest completed month',text);self.assertIn('countDistinctSeedSpecies(cropMasterSummary.entities)',text)
  self.assertIn('fmt.format(internal.volume_tonnes)',text)
