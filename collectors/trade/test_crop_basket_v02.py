import unittest
from dataclasses import replace, FrozenInstanceError
from crop_basket_v02 import Relationship, assess_basket


def fixture():
    return Relationship('test', 'CN', '2025', 'EU', '12092510', 'synthetic species scope',
        'DIRECT', 'DOCUMENT_VERIFIED_SCOPED', ('synthetic evidence',), '2025-01-01',
        '2025-12-31', ('synthetic inclusion',), ('synthetic exclusion',))


def assess(rows):
    return assess_basket(rows, crop='test', period='2025-06', edition='2025', jurisdiction='EU', code_system='CN')


class BasketV02Tests(unittest.TestCase):
    def test_direct_and_metadata_preserved(self):
        r=fixture(); decision=assess((r,))['relationships'][0]
        self.assertTrue(decision['mapping_allows_crop_quantity'])
        self.assertEqual(decision['relationship'],r)
        with self.assertRaises(FrozenInstanceError): r.role='PROXY'

    def test_proxy_never_species_quantity(self):
        d=assess((replace(fixture(),role='PROXY'),))['relationships'][0]
        self.assertTrue(d['mapping_allows_code_trend'])
        self.assertFalse(d['mapping_allows_crop_quantity'])
        self.assertIsNone(d['species_share']); self.assertIsNone(d['numerical_weight'])

    def test_parent_overlap_and_no_total(self):
        r=fixture(); result=assess((r,replace(r,code='120925',role='CONTEXT')))
        self.assertEqual(result['overlapping_codes'],(('12092510','120925'),))
        self.assertIsNone(result['aggregate_quantity'])
        self.assertFalse(result['relationships'][1]['mapping_allows_crop_quantity'])

    def test_unknown_and_invalid_scope_fail_closed(self):
        for patch in ({'valid_from':'UNKNOWN'}, {'valid_to':'2025-06-29'}, {'valid_from':'2025-06-02'},
                      {'edition':'2026'}, {'jurisdiction':'UK'}, {'evidence_quality':'UNKNOWN'}, {'evidence':('UNKNOWN',)}):
            with self.subTest(patch=patch):
                self.assertFalse(assess((replace(fixture(),**patch),))['relationships'][0]['mapping_allows_crop_quantity'])

    def test_duplicate_and_cross_crop_rejected(self):
        for rows in ((fixture(),fixture()),(replace(fixture(),crop='other'),)):
            with self.assertRaises(ValueError): assess(rows)

    def test_no_implicit_hs_concordance(self):
        r=fixture(); result=assess((r,replace(r,code_system='HS',code='120925',role='CONTEXT')))
        self.assertEqual(result['cross_system_overlap'],'UNKNOWN_REQUIRES_CONCORDANCE')
        self.assertFalse(result['relationships'][1]['mapping_allows_context'])

    def test_invalid_metadata_rejected(self):
        for patch in ({'inclusions':[]},{'evidence':()},{'valid_to':'2024-01-01'}, {'code':'120925','role':'DIRECT'}):
            with self.subTest(patch=patch),self.assertRaises(ValueError): replace(fixture(),**patch)


if __name__=='__main__': unittest.main()
