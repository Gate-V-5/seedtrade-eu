import unittest
from copy import deepcopy
from supply_v01 import build

def fixture():
    return dict(country='DE', reference_year=2024, source_url='https://example.test/source',
        metric='officially_recognized_seed_quantity_all_reported_classes', records=[dict(
        crop_group='red_clover', source_species='Rotklee', value='11115.77', unit='dt')])

class SupplyTests(unittest.TestCase):
    def test_exact_mass_conversion_and_no_inventory(self):
        result=build([fixture()],2024)
        self.assertEqual(result['observations'][0]['tonnes'],'1111.577')
        self.assertIsNone(result['available_supply'])
    def test_missing_distinct_from_zero(self):
        for value,status in [(None,'MISSING'),('0','OBSERVED')]:
            d=fixture(); d['records'][0]['value']=value
            self.assertEqual(build([d],2024)['observations'][0]['status'],status)
    def test_duplicates_rejected(self):
        with self.assertRaises(ValueError): build([fixture(),fixture()],2024)
    def test_bad_values_rejected(self):
        for v in ['NaN','Infinity','-1',True,'bad']:
            d=fixture(); d['records'][0]['value']=v
            with self.assertRaises(ValueError): build([d],2024)
    def test_unit_mismatch(self):
        d=fixture(); d['records'][0]['unit']='ha'
        with self.assertRaises(ValueError): build([d],2024)
    def test_period_and_country_gaps(self):
        r=build([fixture()],2023)
        self.assertEqual(r['observations'],[])
        self.assertEqual(len(r['coverage']),20)
        self.assertTrue(all(c['status']=='MISSING' for c in r['coverage']))
    def test_area_not_mass(self):
        d=fixture(); d['metric']='officially_controlled_seed_production_area'; d['records'][0]['unit']='ha'
        self.assertIsNone(build([d],2024)['observations'][0]['tonnes'])
    def test_inputs_unchanged(self):
        d=fixture(); old=deepcopy(d); build([d],2024); self.assertEqual(d,old)
    def test_assessment_reconciliation(self):
        d=fixture(); d['metric']='seed_field_assessment_area'; d['records'][0].update(assessed_area_ha='10',qualified_area_ha='9',disqualified_area_ha='2')
        with self.assertRaises(ValueError): build([d],2024)



class ProvenanceTests(unittest.TestCase):
    def test_source_metadata_preserved(self):
        d=fixture(); d.update(provisional=True,as_of='2025-08-26',source_sha256='abc',source_sheet='Sheet1')
        d['records'][0]['use_category']='forage'
        r=build([d],2024)['observations'][0]
        for k in ('provisional','as_of','source_sha256','source_sheet'):
            self.assertEqual(r.get(k),d[k])
        self.assertEqual(r.get('use_category'),'forage')
    def test_presented_area_and_year_separation(self):
        d=fixture(); d.update(reference_year=2025,provisional=True,as_of='2025-08-26',metric='presented_seed_production_area')
        d['records'][0]['unit']='ha'
        self.assertEqual(build([d],2024)['observations'],[])
        self.assertTrue(build([d],2025)['observations'][0]['provisional'])




class ProvisionalValidationTests(unittest.TestCase):
    def test_invalid_provisional_type_rejected(self):
        for value in ['false', 0, 1, [], {}]:
            with self.subTest(value=value):
                d=fixture(); d['provisional']=value
                with self.assertRaises(ValueError): build([d],2024)
    def test_provisional_needs_valid_as_of(self):
        for value in [None, '', '2025-02-30', '20250826', '2025-08-26T00:00:00', True]:
            with self.subTest(value=value):
                d=fixture(); d.update(provisional=True,as_of=value)
                with self.assertRaises(ValueError): build([d],2024)
    def test_unknown_status_not_final(self):
        self.assertIsNone(build([fixture()],2024)['observations'][0]['provisional'])

if __name__=='__main__': unittest.main()
