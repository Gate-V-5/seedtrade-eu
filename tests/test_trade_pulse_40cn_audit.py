import unittest,json,pathlib,decimal,hashlib
R=pathlib.Path(__file__).resolve().parents[1];D=decimal.Decimal
class TradePulse40CNAudit(unittest.TestCase):
 def read(self,n):return json.loads((R/'docs/trade-pulse-40cn-audit-v1'/f'{n}.json').read_text())
 def test_exact_reconciliation_and_complete_scope(self):
  r=self.read('RECONCILIATION');rows=self.read('CN_AUDIT_40');self.assertEqual(len(rows),40);self.assertEqual(len({x['cn8']for x in rows}),40);self.assertEqual(sum(x['baseline_status']=='NEW_CN'for x in rows),29);self.assertEqual(D(r['old_11_kg_exact'])+D(r['new_29_kg_exact']),D(r['total_40_kg_exact']));self.assertEqual(D(r['old_11_eur_exact'])+D(r['new_29_eur_exact']),D(r['total_40_eur_exact']));self.assertTrue(r['baseline_volume_display_match']);self.assertEqual(r['duplicate_full_source_grain'],0);self.assertTrue(all(x['public_safe']and x['sowing_use_confirmed']for x in rows))
 def test_semantic_blockers_are_not_silently_activated(self):
  g=self.read('RELEASE_GATE');self.assertEqual(g['release_gate'],'FAIL');self.assertFalse(g['implementation_repaired']);self.assertFalse(g['core_extended_split_required']);self.assertEqual(g['relabel_or_relink_codes'],['10019110','10019120']);self.assertEqual(g['category_allocation_withheld_codes'],['12091000','12092960']);self.assertEqual(g['excluded_headline_cn_codes'],[])
  for r in self.read('CN_AUDIT_40'):
   if r['audited_granularity']!='SPECIES_SPECIFIC':self.assertEqual(r['linked_botanical_species_measured'],[])
 def test_species_and_category_partition_no_allocation(self):
  s=self.read('SPECIES_COVERAGE');self.assertEqual(len(s),121);self.assertEqual(len({x['species_id']for x in s}),121);self.assertTrue(all(x['botanical']and not x['group_volume_allocated']for x in s));c=self.read('CATEGORY_ANALYSIS');self.assertEqual(len(c['categories']),10);rows=self.read('CN_AUDIT_40');self.assertEqual(sorted(c['unallocated_cn_codes']),sorted(x['cn8']for x in rows if x['allocated_category']is None));self.assertAlmostEqual(sum(x['trade_value_eur']for x in c['categories']if x['cn_count'])+c['unallocated_value_eur'],400438328)
