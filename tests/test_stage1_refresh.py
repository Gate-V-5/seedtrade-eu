import copy
import datetime as dt
from decimal import Decimal
import itertools
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import refresh_trade_pulse as refresh


def fixture_rows(end='2026-08'):
    rows=[]
    for month in [refresh.shift_month(end,i) for i in range(-23,1)]:
        for reporter,code,view in itertools.product(sorted(refresh.EU),['12092100','12092210'],refresh.VIEWS):
            rows.append({'reporter':reporter,'partner':'US' if view!='eu_internal_trade' else ('DE' if reporter!='DE' else 'FR'),
                         'flow':'1' if view=='eu_imports' else '2','period':month,'cn8':code,'view':view,
                         'kg':Decimal('1234.5'),'eur':Decimal('2469'),'official_status':{}})
    return rows


def fixture_dataset():
    axes={'freq':['M'],'reporter':sorted(refresh.EU),'partner':['FR','US'],'product':['12092100'],
          'flow':['1','2'],'indicators':['VALUE_IN_EUROS','QUANTITY_IN_100KG'],'time':['2026-08']}
    ids=list(axes)
    data={'class':'dataset','id':ids,'size':[len(axes[k]) for k in ids],
          'dimension':{k:{'category':{'index':{v:i for i,v in enumerate(values)}}} for k,values in axes.items()},'value':{}}
    for i,values in enumerate(itertools.product(*(axes[k] for k in ids))):
        dims=dict(zip(ids,values))
        if dims['reporter']=='DE' and dims['partner']=='FR' and dims['flow']=='2':
            data['value'][str(i)]=100 if dims['indicators']=='VALUE_IN_EUROS' else 2
    return data


class Stage1Refresh(unittest.TestCase):
    def test_month_end_main_check_overrides_recent_weekly_check(self):
        now=dt.datetime(2026,11,30,5,tzinfo=dt.timezone.utc)
        self.assertTrue(refresh.due(now,{'last_check_at':'2026-11-28T05:00:00+00:00'}))
        self.assertFalse(refresh.due(now,{'last_check_at':now.isoformat()}))

    def test_weekly_retry_and_leap_calendar(self):
        now=dt.datetime(2028,2,29,5,tzinfo=dt.timezone.utc)
        self.assertTrue(refresh.due(now,{'last_check_at':'2028-02-27T05:00:00+00:00'}))
        self.assertFalse(refresh.due(dt.datetime(2026,11,18,tzinfo=dt.timezone.utc),{'last_check_at':'2026-11-16T00:00:00+00:00'}))
        self.assertTrue(refresh.due(dt.datetime(2026,11,23,tzinfo=dt.timezone.utc),{'last_check_at':'2026-11-16T00:00:00+00:00'}))

    def test_units_and_filter_contract(self):
        result=refresh.normalize(fixture_dataset(),'12092100','2026-08','2026-08',refresh.EU|{'US'})
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['kg'],Decimal(200))
        self.assertEqual(result[0]['eur'],Decimal(100))
        bad=fixture_dataset();bad['dimension']['product']['category']['index']={'12099180':0}
        with self.assertRaisesRegex(ValueError,'FILTER_MISMATCH_product'):
            refresh.normalize(bad,'12092100','2026-08','2026-08',refresh.EU|{'US'})

    def test_unpaired_missing_not_zero_and_invalid_values_fail(self):
        data=fixture_dataset();data['value'].pop(next(iter(data['value'])))
        with self.assertRaisesRegex(ValueError,'UNPAIRED_MEASURES'):
            refresh.normalize(data,'12092100','2026-08','2026-08',refresh.EU|{'US'})
        for value in (-1,float('nan'),True):
            data=fixture_dataset();data['value'][next(iter(data['value']))]=value
            with self.assertRaisesRegex(ValueError,'INVALID_SOURCE_MEASURE'):
                refresh.normalize(data,'12092100','2026-08','2026-08',refresh.EU|{'US'})

    def test_latest_observed_period_is_not_automatically_complete(self):
        rows=fixture_rows()
        rows.append({**rows[-1],'period':'2026-09'})
        period,rejected=refresh.select_period(rows,['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026})
        self.assertEqual(period,'2026-08')
        self.assertIn('INCOMPLETE_REPORTER_COVERAGE',rejected['2026-09'])

    def test_missing_prior_year_or_unverified_cn_year_rejected(self):
        rows=[r for r in fixture_rows() if not(r['period']=='2025-08' and r['reporter']=='MT')]
        with self.assertRaisesRegex(ValueError,'NO_COMPLETE_COMPARABLE_MONTH'):
            refresh.select_period(rows,['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026})
        with self.assertRaisesRegex(ValueError,'CN_YEAR_CONCORDANCE_REQUIRED'):
            refresh.select_period(fixture_rows(),['12092100','12092210'],'2026-08','2026-11',{2024,2025})

    def test_rejected_month_is_reconsidered_when_new_observations_arrive(self):
        partial=fixture_rows()+[{**fixture_rows()[-1],'period':'2026-09'}]
        period,rejected=refresh.select_period(partial,['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026})
        self.assertEqual(period,'2026-08');self.assertIn('2026-09',rejected)
        period,rejected=refresh.select_period(fixture_rows('2026-09'),['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026})
        self.assertEqual(period,'2026-09');self.assertNotIn('2026-09',rejected)

    def test_manifest_write_failure_restores_matching_snapshot_pair(self):
        folder=ROOT/'tmp';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            root=Path(name);work=root/'work'
            target=root/'src/generated/trade_pulse_public.json';manifest=root/'src/generated/public_data_manifest.json'
            old={'latest_completed_period':'2026-08'}
            target.parent.mkdir(parents=True)
            original=b'{"latest_completed_period":"2026-08"}\n'
            target.write_bytes(original)
            old_manifest={'datasets':{'trade_pulse':{'sha256':hashlib.sha256(original).hexdigest()}}}
            refresh.atomic_json(manifest,old_manifest)
            candidate={'latest_completed_period':'2026-09','accepted_observations':10,'period_semantics':{'type':'MONTH_ONLY'}}
            writer=refresh.atomic_json;failure=[False]
            def fail_once(path,value):
                if Path(path)==manifest and not failure[0]:
                    failure[0]=True;raise OSError('SYNTHETIC_WRITE_FAILURE')
                writer(path,value)
            with patch.object(refresh,'atomic_json',side_effect=fail_once):
                with self.assertRaisesRegex(OSError,'SYNTHETIC_WRITE_FAILURE'):
                    refresh.publish_snapshot(root,work,old,candidate)
            self.assertEqual(refresh.read(target),old)
            self.assertEqual(target.read_bytes(),original)
            self.assertEqual(refresh.read(manifest),old_manifest)
            self.assertEqual(refresh.read(manifest)['datasets']['trade_pulse']['sha256'],hashlib.sha256(target.read_bytes()).hexdigest())
            self.assertEqual(refresh.read(work/'last-good-trade-pulse.json'),old)
            self.assertEqual(refresh.read(work/'last-good-public-data-manifest.json'),old_manifest)

    def test_only_independently_recorded_historical_absence_is_allowed(self):
        rows=[r for r in fixture_rows() if not(r['period']=='2024-11' and r['reporter']=='MT')]
        period,_=refresh.select_period(rows,['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026},{'2024-11':refresh.EU-{'MT'}})
        self.assertEqual(period,'2026-08')
        with self.assertRaisesRegex(ValueError,'INCOMPLETE_REPORTER_COVERAGE'):
            refresh.select_period(rows,['12092100','12092210'],'2026-08','2026-11',{2024,2025,2026},{'2024-11':refresh.EU-{'CY'}})

    def test_three_views_one_window_and_historical_revision(self):
        baseline=json.loads((ROOT/'src/generated/trade_pulse_public.json').read_text(encoding='utf-8'))
        rows=fixture_rows()
        scope={c:{'granularity':'SPECIES_SPECIFIC','id':'CN-'+c,'official_description':'Test seed'} for c in ['12092100','12092210']}
        before=refresh.build_snapshot(baseline,rows,'2026-08','2026-11-16T00:00:00+00:00','2026-11-13T00:00:00Z','fixture-only',scope)
        self.assertEqual(len(before['views']['eu_internal_trade']['history']),12)
        self.assertTrue(all(v['latest']['period']=='2026-08' for v in before['views'].values()))
        self.assertEqual(len(before['country_coverage']['reporters']),27)
        revised=copy.deepcopy(rows)
        next(r for r in revised if r['period']=='2025-10' and r['view']=='eu_internal_trade')['eur']+=Decimal(100)
        after=refresh.build_snapshot(before,revised,'2026-08','2026-11-23T00:00:00+00:00','2026-11-20T00:00:00Z','fixture-revised',scope)
        self.assertNotEqual(before['views']['eu_internal_trade']['history'][1]['trade_value_eur'],after['views']['eu_internal_trade']['history'][1]['trade_value_eur'])
        self.assertEqual(before['views']['eu_internal_trade']['latest'],after['views']['eu_internal_trade']['latest'])

    def test_network_failure_preserves_last_good_bytes_and_success(self):
        folder=ROOT/'tmp';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            root=Path(name);work=root/'work';target=root/'src/generated/trade_pulse_public.json'
            target.parent.mkdir(parents=True);target.write_bytes(b'{"latest_completed_period":"2026-06"}\n')
            original=target.read_bytes()
            refresh.atomic_json(work/'refresh-state.json',{'last_success_at':'2026-11-01T00:00:00+00:00'})
            refresh.atomic_json(root/'docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json',[{'cn8':'12092100'}])
            refresh.atomic_json(root/'docs/multisource-trade-v1/CN_HISTORY_EVIDENCE.json',{
                'code_decisions':[{'cn8':'12092100','status':'COMPATIBLE_EXACT_HIERARCHY'}],
                'sources':[{'year':2024}]})
            with patch.object(refresh,'fetch_json',side_effect=ConnectionError('SYNTHETIC_NETWORK_FAILURE')):
                with self.assertRaisesRegex(ConnectionError,'SYNTHETIC_NETWORK_FAILURE'):
                    refresh.refresh(root,work,dt.datetime(2026,11,16,tzinfo=dt.timezone.utc),apply=True)
            self.assertEqual(target.read_bytes(),original)
            state=json.loads((work/'refresh-state.json').read_text())
            self.assertEqual(state['status'],'FAILED_RETAINED_LAST_GOOD')
            self.assertEqual(state['last_success_at'],'2026-11-01T00:00:00+00:00')
            self.assertIn('SYNTHETIC_NETWORK_FAILURE',state['errors'][0])
            self.assertFalse((work/'refresh.lock').exists())

    def test_official_request_is_bounded_and_excludes_supplementary_units(self):
        url=refresh.query_url('12092100','2025-01','2025-12')
        self.assertEqual(url.count('reporter='),27)
        self.assertIn('indicators=QUANTITY_IN_100KG',url)
        self.assertNotIn('SUPPLEMENTARY',url)
        self.assertIn('sinceTimePeriod=2025-01',url)


if __name__=='__main__':
    unittest.main()
