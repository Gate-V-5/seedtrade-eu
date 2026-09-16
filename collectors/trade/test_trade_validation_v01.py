import unittest
from dataclasses import replace, FrozenInstanceError
from decimal import Decimal as D
from trade_observation_v01 import TradeObservation
from trade_validation_v01 import compare

def fixture():
    return TradeObservation(source='A',source_dataset='test',source_vintage='v1',retrieved_at='2026-09-15T00:00:00Z',
        reporter='DE',partner='PL',flow='EXPORT',period='2025-06',product_code_system='CN',product_code_edition='2025',
        product_code='12092510',product_description='synthetic fixture',weight=D('100'),weight_type='NET',quantity=None,
        supplementary_unit='UNKNOWN',trade_value=D('100'),currency='EUR',value_basis='FOB',status='OBSERVED',provenance=('fixture',),
        partner_definition='DESTINATION',trade_system='GENERAL',customs_scope='ALL',transport_scope='ALL',partner2_scope='ALL',methodology='REPORTED')

class ValidationTests(unittest.TestCase):
    def test_two_sources_exact_match(self):
        a=fixture();r=compare(a,replace(a,source='B'));self.assertEqual(r['status'],'MATCH')
        self.assertNotEqual(r['reference_key'],r['candidate_key'])
    def test_threshold_boundaries(self):
        for value,status in [('101.99','MATCH'),('102','ACCEPTABLE'),('105','ACCEPTABLE'),('105.01','WARNING'),('110','WARNING'),('110.01','CONFLICT')]:
            with self.subTest(value=value):
                a=fixture();self.assertEqual(compare(a,replace(a,weight=D(value),trade_value=D(value)))['status'],status)
    def test_missing_not_zero(self):
        a=fixture();self.assertEqual(compare(a,replace(a,weight=None))['metrics']['weight']['status'],'NOT_COMPARABLE')
    def test_zero_denominators(self):
        a=replace(fixture(),weight=D(0));r=compare(a,fixture())
        self.assertIsNone(r['metrics']['weight']['percent']);self.assertEqual(r['metrics']['weight']['difference'],D(100))
        self.assertEqual(compare(a,a)['metrics']['weight']['status'],'MATCH')
    def test_incompatible_dimensions_explained(self):
        a=fixture()
        for field,value in [('period','2025-07'),('product_code_edition','2026'),('partner_definition','ORIGIN'),('customs_scope','C03'),('transport_scope','ROAD'),('partner2_scope','899')]:
            with self.subTest(field=field):
                r=compare(a,replace(a,**{field:value}));self.assertIn('DIFFERENT_'+field,r['metrics']['weight']['reasons'])
    def test_weight_type_and_currency_checked_per_metric(self):
        a=fixture();r=compare(a,replace(a,weight_type='GROSS',currency='USD'))
        self.assertIn('DIFFERENT_weight_type',r['metrics']['weight']['reasons'])
        self.assertIn('DIFFERENT_currency',r['metrics']['trade_value']['reasons'])
    def test_value_basis_mismatch(self):
        a=fixture();self.assertEqual(compare(a,replace(a,value_basis='CIF'))['metrics']['trade_value']['status'],'NOT_COMPARABLE')
    def test_unknown_methodology_not_match(self):
        a=replace(fixture(),methodology='UNKNOWN');self.assertEqual(compare(a,a)['status'],'NOT_COMPARABLE')
    def test_confidential_not_compared(self):
        a=fixture();self.assertEqual(compare(a,replace(a,status='CONFIDENTIAL'))['status'],'NOT_COMPARABLE')
    def test_vintages_preserved_and_flagged(self):
        a=fixture();r=compare(a,replace(a,source_vintage='v2',weight=D(110)))
        self.assertIn('DIFFERENT_VINTAGES_REVIEW_REVISIONS',r['flags']);self.assertEqual(a.weight,D(100));self.assertNotEqual(r['reference_key'],r['candidate_key'])
    def test_raw_immutable(self):
        a=fixture()
        with self.assertRaises(FrozenInstanceError): a.weight=D(0)
        with self.assertRaises(ValueError): replace(a,provenance=['mutable'])
    def test_invalid_values_rejected(self):
        for value in (True,100,D('NaN'),D('-1'),D('Infinity')):
            with self.subTest(value=value),self.assertRaises(ValueError): replace(fixture(),weight=value)
    def test_invalid_period_code_timestamp(self):
        for patch in ({'period':'2025-13'},{'product_code':'120925'},{'retrieved_at':'2026-09-15T00:00:00'}):
            with self.subTest(patch=patch),self.assertRaises(ValueError): replace(fixture(),**patch)
    def test_unknown_vintage_flag(self):
        a=fixture();self.assertIn('UNKNOWN_VINTAGE',compare(a,replace(a,source_vintage='UNKNOWN'))['flags'])

if __name__=='__main__': unittest.main()
