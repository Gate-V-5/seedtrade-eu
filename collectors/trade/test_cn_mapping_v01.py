import unittest
from cn_mapping_v01 import assess

class MappingTests(unittest.TestCase):
    def test_specific_codes(self):
        for target,code in [('red_clover','12092210'),('italian_ryegrass','12092510'),('perennial_ryegrass','12092590'),('flax_for_sowing','12040010')]:
            self.assertTrue(assess(target,code,2026)['eligible_for_target_statistics'])
    def test_mixed_species(self):
        for target,code in [('white_clover','12092280'),('vetch','12092945')]:
            self.assertEqual(assess(target,code,2026)['reason'],'MIXED_SPECIES_CODE')
    def test_historical_year_not_assumed(self):
        for year in [2024,2025,2027,True,'2026']:
            self.assertEqual(assess('red_clover','12092210',year)['reason'],'UNVERIFIED_YEAR')
    def test_exact_code_required(self):
        for code in ['120922',12092210,'12092210 ','１２０９２２１０']:
            self.assertEqual(assess('red_clover',code,2026)['reason'],'EXACT_CN8_REQUIRED')
    def test_non_sowing_flax_rejected(self):
        self.assertFalse(assess('flax_for_sowing','12040090',2026)['eligible_for_target_statistics'])
    def test_hybrid_and_unknown_not_guessed(self):
        for target in ['hybrid_ryegrass','ryegrass',None]:
            self.assertEqual(assess(target,'12092510',2026)['reason'],'UNMAPPED_TARGET')
    def test_wrong_species_rejected(self):
        self.assertFalse(assess('red_clover','12092280',2026)['eligible_for_target_statistics'])

if __name__=='__main__': unittest.main()
