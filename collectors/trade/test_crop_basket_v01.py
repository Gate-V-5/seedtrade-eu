import unittest
from dataclasses import FrozenInstanceError, replace
from crop_basket_v01 import Relationship, initial_basket, assess_basket

class BasketTests(unittest.TestCase):
    def test_multiple_codes_retained(self):
        r=assess_basket(initial_basket('red_clover'),crop='red_clover',year=2026)
        self.assertEqual([x['code'] for x in r['relationships']],['12092210','120922'])
    def test_proxy_trend_without_crop_quantity(self):
        for crop in ('white_clover','vetch'):
            with self.subTest(crop=crop):
                r=assess_basket(initial_basket(crop),crop=crop,year=2026)
                self.assertTrue(r['relationships'][0]['mapping_allows_code_trend'])
                self.assertFalse(r['relationships'][0]['mapping_allows_crop_quantity'])
                self.assertIsNone(r['aggregate_quantity'])
    def test_context_not_crop_quantity_or_direct_trend(self):
        r=assess_basket(initial_basket('red_clover'),crop='red_clover',year=2026)['relationships'][1]
        self.assertTrue(r['mapping_allows_context'])
        self.assertFalse(r['mapping_allows_crop_quantity'])
        self.assertFalse(r['mapping_allows_code_trend'])
    def test_wrong_year_edition_jurisdiction_fail_closed(self):
        for kwargs in ({'year':2025},{'year':True},{'year':'2026'},
                       {'year':2026,'edition':'HS2022'},{'year':2026,'jurisdiction':'US'}):
            with self.subTest(kwargs=kwargs):
                rows=assess_basket(initial_basket('red_clover'),crop='red_clover',**kwargs)['relationships']
                self.assertTrue(all(not x['mapping_allows_code_trend'] and not x['mapping_allows_crop_quantity'] and not x['mapping_allows_context'] for x in rows))
    def test_unknown_evidence_does_not_authorize(self):
        row=replace(initial_basket('red_clover')[0],evidence_level='UNVERIFIED')
        self.assertFalse(assess_basket([row],crop='red_clover',year=2026)['relationships'][0]['mapping_allows_crop_quantity'])
    def test_parent_child_overlap_not_aggregated(self):
        r=assess_basket(initial_basket('red_clover'),crop='red_clover',year=2026)
        self.assertEqual(r['overlapping_codes'],(('12092210','120922'),))
        self.assertIsNone(r['aggregate_quantity'])
    def test_duplicate_and_cross_crop_rejected(self):
        row=initial_basket('red_clover')[0]
        for rows in ([row,row],[row,initial_basket('white_clover')[0]]):
            with self.assertRaises(ValueError): assess_basket(rows,crop='red_clover',year=2026)
    def test_no_invented_share_weight_signal_or_permission(self):
        r=assess_basket(initial_basket('vetch'),crop='vetch',year=2026)
        self.assertTrue(all(x['species_share'] is None and x['numerical_weight'] is None for x in r['relationships']))
        self.assertIsNone(r['trade_signal'])
        self.assertEqual(r['retrieval_permission'],'NOT_ASSESSED')
    def test_invalid_relationships_rejected(self):
        row=initial_basket('red_clover')[0]
        for patch in ({'code':'１２０９２２１０'},{'code':12092210},{'code':'12092210 '},
                      {'role':'GUESS'},{'evidence_level':0.9},{'evidence':[]},
                      {'evidence':('',)},{'code':'120922'},{'scope':' '}):
            with self.subTest(patch=patch),self.assertRaises(ValueError): replace(row,**patch)
    def test_inputs_immutable(self):
        rows=initial_basket('red_clover')
        before=repr(rows)
        assess_basket(rows,crop='red_clover',year=2026)
        self.assertEqual(repr(rows),before)
        with self.assertRaises(FrozenInstanceError): rows[0].role='PROXY'
    def test_unmapped_crop_not_guessed(self):
        with self.assertRaises(ValueError): initial_basket('hybrid_ryegrass')

if __name__=='__main__': unittest.main()
