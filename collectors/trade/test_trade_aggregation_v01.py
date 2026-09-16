import unittest
from dataclasses import replace, FrozenInstanceError
from decimal import Decimal as D
from test_trade_validation_v01 import fixture
from trade_aggregation_v01 import AggregationMap, aggregate_cn8


class AggregationTests(unittest.TestCase):
    def setUp(self):
        self.mapping = AggregationMap('2025', '2022', '120925',
            ('12092510', '12092590'), '2025-01-01', '2025-12-31', ('SYNTHETIC concordance',))
        self.rows = (fixture(), replace(fixture(), product_code='12092590', weight=D(200)))

    def test_complete_partition_and_lineage(self):
        result = aggregate_cn8(self.rows, self.mapping)
        self.assertEqual(result.observation.weight, D(300))
        self.assertEqual(result.observation.product_code, '120925')
        self.assertEqual(result.observation.product_code_edition, '2022')
        self.assertEqual(result.inputs, self.rows)
        self.assertIsNone(result.observation.quantity)
        self.assertEqual(self.rows[0].weight, D(100))
        with self.assertRaises(FrozenInstanceError): result.kind = 'RAW'

    def test_missing_duplicate_extra_and_parent_rejected(self):
        for rows in ((), self.rows[:1], self.rows + self.rows[:1],
                     self.rows + (replace(fixture(), product_code='12092210'),),
                     self.rows + (replace(fixture(), product_code_system='HS', product_code='120925'),)):
            with self.subTest(rows=rows), self.assertRaises(ValueError): aggregate_cn8(rows, self.mapping)

    def test_incompatible_dimensions_and_revisions(self):
        for change in ({'source':'B'}, {'source_vintage':'v2'}, {'period':'2025-07'},
                       {'weight_type':'GROSS'}, {'currency':'USD'}, {'product_code_edition':'2026'},
                       {'partner_definition':'ORIGIN'}, {'status':'CONFIDENTIAL'},
                       {'retrieved_at':'2026-09-15T01:00:00Z'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                aggregate_cn8((self.rows[0], replace(self.rows[1], **change)), self.mapping)

    def test_missing_metric_does_not_become_partial_total(self):
        result = aggregate_cn8((self.rows[0], replace(self.rows[1], weight=None)), self.mapping)
        self.assertIsNone(result.observation.weight)
        self.assertEqual(result.observation.trade_value, D(200))

    def test_unknown_units_remain_unknown(self):
        rows = tuple(replace(r, weight_type='UNKNOWN') for r in self.rows)
        self.assertIsNone(aggregate_cn8(rows, self.mapping).observation.weight)

    def test_zero_is_preserved(self):
        rows = tuple(replace(r, weight=D(0)) for r in self.rows)
        self.assertEqual(aggregate_cn8(rows, self.mapping).observation.weight, D(0))

    def test_mapping_validity_entire_month(self):
        for change in ({'valid_from':'2025-06-02'}, {'valid_to':'2025-06-29'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                aggregate_cn8(self.rows, replace(self.mapping, **change))

    def test_mapping_requires_immutable_explicit_evidence(self):
        for change in ({'evidence':()}, {'children':['12092510']}, {'hs_edition':'UNKNOWN'},
                       {'children':('12092510','12092510')}, {'children':('12092210',)}):
            with self.subTest(change=change), self.assertRaises(ValueError): replace(self.mapping, **change)

    def test_unknown_vintage_rejected(self):
        with self.assertRaises(ValueError):
            aggregate_cn8(tuple(replace(r, source_vintage='UNKNOWN') for r in self.rows), self.mapping)


if __name__ == '__main__': unittest.main()
