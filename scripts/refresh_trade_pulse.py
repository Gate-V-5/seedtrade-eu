"""Bounded COMEXT refresh for the existing static-site publication path.

No deployment. Atomic publication of ONE validated Pulse snapshot; all related
Stage 1 metrics consume that same file. A failed run retains its previous bytes.
"""
from __future__ import annotations
import argparse
import calendar
import collections
import datetime as dt
from decimal import Decimal
import hashlib
import json
import math
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request

from generate_trade_pulse import EU27, VIEW_LABELS, activity_state, shift_month, yoy

EU = EU27 - {'EL'}
API = 'https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409'
PARTNERS = 'https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json'
VIEWS = tuple(VIEW_LABELS)
ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def atomic_bytes(path,payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_name(path.name + '.pending')
    pending.write_bytes(payload)
    os.replace(pending, path)


def atomic_json(path, value):
    atomic_bytes(path,(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))


def due(now, state):
    """Daily scheduler guard: month-end main check, then at most weekly retries.

    A weekly check also re-reads the published comparison window for revisions.
    Month-end is never skipped because a weekly check happened recently.
    """
    previous = state.get('last_check_at')
    if previous:
        last = dt.datetime.fromisoformat(previous)
        if last.date() == now.date():
            return False
    else:
        last = None
    return now.day == calendar.monthrange(now.year, now.month)[1] or last is None or (now - last).total_seconds() >= 7 * 86400


def query_url(code, start, end):
    pairs = [('lang','EN'), ('freq','M'), ('product',code)]
    pairs += [('reporter',reporter) for reporter in sorted(EU)]
    pairs += [('flow','1'),('flow','2'),('indicators','VALUE_IN_EUROS'),('indicators','QUANTITY_IN_100KG')]
    pairs += [('sinceTimePeriod',start),('untilTimePeriod',end)]
    return API + '?' + urllib.parse.urlencode(pairs)


def fetch_json(url):
    # Sequential requests only; bounded timeouts/backoff, never an unfiltered query.
    for attempt in range(2):
        try:
            request = urllib.request.Request(url, headers={'User-Agent':'SeedTrade-OfficialStatistics/1.0','Accept':'application/json'})
            with urllib.request.urlopen(request, timeout=90) as response:
                if response.status != 200:
                    raise ValueError(f'HTTP_{response.status}')
                raw = response.read()
            result = json.loads(raw)
            if result.get('error'):
                raise ValueError('EUROSTAT_ERROR_RESPONSE')
            # Async results are not datasets and can never be published as data.
            if result.get('class') != 'dataset' and url.startswith(API):
                raise ValueError('EUROSTAT_ASYNC_OR_NON_DATASET; retry later with narrower queries')
            return result, hashlib.sha256(raw).hexdigest()
        except Exception:
            if attempt:
                raise
            time.sleep(2)


def normalize(dataset, code, start, end, countries):
    """Existing grain/units: country-country-flow-CN8-month; no mirror imports.

    A missing measure, malformed number, unknown filter or unexpected dimension
    invalidates the extraction; suppressed/provisional status is retained.
    """
    ids, sizes = dataset.get('id',[]), dataset.get('size',[])
    if set(ids) != {'freq','reporter','partner','product','flow','indicators','time'} or len(sizes) != len(ids):
        raise ValueError('UNEXPECTED_DIMENSIONS')
    axes = {}
    for name,size in zip(ids,sizes):
        index = dataset['dimension'][name]['category']['index']
        if isinstance(index,list):
            index = {v:i for i,v in enumerate(index)}
        if len(index) != size or set(index.values()) != set(range(size)):
            raise ValueError('MALFORMED_DIMENSION_INDEX')
        axes[name] = {position:label for label,position in index.items()}
    for name,expected in [('freq',{'M'}),('product',{code}),('reporter',EU),('flow',{'1','2'}),('indicators',{'QUANTITY_IN_100KG','VALUE_IN_EUROS'})]:
        if set(axes[name].values()) != expected:
            raise ValueError('FILTER_MISMATCH_' + name)
    if not all(start <= p <= end for p in axes['time'].values()):
        raise ValueError('TIME_FILTER_MISMATCH')
    source_status = dataset.get('status',{})
    values = dataset.get('value',{})
    cells = values.items() if isinstance(values,dict) else enumerate(values)
    groups = {}
    total_cells = math.prod(sizes)
    for flat,value in cells:
        if value is None:
            continue
        n = int(flat)
        if n < 0 or n >= total_cells:
            raise ValueError('CELL_INDEX_OUT_OF_RANGE')
        positions = [0]*len(ids)
        for i in range(len(ids)-1,-1,-1):
            positions[i], n = n % sizes[i], n // sizes[i]
        dims = {name:axes[name][position] for name,position in zip(ids,positions)}
        if dims['partner'] not in countries or dims['partner'] == dims['reporter']:
            continue
        if dims['flow']=='1' and dims['partner'] in EU:
            continue
        if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value < 0:
            raise ValueError('INVALID_SOURCE_MEASURE')
        key = tuple(dims[k] for k in ('reporter','partner','flow','time'))
        group = groups.setdefault(key,{'values':{},'status':{}})
        group['values'][dims['indicators']] = Decimal(str(value))
        status = source_status.get(str(flat)) if isinstance(source_status,dict) else source_status[int(flat)] if isinstance(source_status,list) else None
        group['status'][dims['indicators']] = status
    rows = []
    for (reporter,partner,flow,period),group in groups.items():
        if set(group['values']) != {'QUANTITY_IN_100KG','VALUE_IN_EUROS'}:
            raise ValueError('UNPAIRED_MEASURES_' + period)
        if any(s and any(c in str(s).lower() for c in ('c','z')) for s in group['status'].values()):
            raise ValueError('CONFIDENTIAL_OR_NOT_APPLICABLE_NUMERIC_CELL')
        rows.append({'reporter':reporter,'partner':partner,'flow':flow,'period':period,'cn8':code,
                     'view':'eu_internal_trade' if partner in EU else 'eu_imports' if flow=='1' else 'eu_exports',
                     'kg':group['values']['QUANTITY_IN_100KG']*100,'eur':group['values']['VALUE_IN_EUROS'],
                     'official_status':group['status']})
    return rows


def validate_month(rows, period, codes, expected_reporters=None):
    rr = [r for r in rows if r['period']==period]
    if {r['reporter'] for r in rr} != (EU if expected_reporters is None else expected_reporters):
        return 'INCOMPLETE_REPORTER_COVERAGE'
    if {r['cn8'] for r in rr} != set(codes):
        return 'INCOMPLETE_CN_COVERAGE'
    if {r['view'] for r in rr} != set(VIEWS):
        return 'INCOMPLETE_FLOW_COVERAGE'
    if any(sum(r['kg'] for r in rr if r['view']==v)<=0 or sum(r['eur'] for r in rr if r['view']==v)<=0 for v in VIEWS):
        return 'MISSING_OR_NONPOSITIVE_FLOW_TOTAL'
    return None


def select_period(rows, codes, last_period, checked_through, supported_years, historical_coverage=None):
    """Require 24 consecutive comparable months, not just a nonempty time label.

    These are publication coverage rules, not a claim that official statistics
    are final/unrevisable. Confidential/absent source cells are never zero-filled.
    """
    reasons = {}
    historical_coverage=historical_coverage or {}
    for candidate in sorted({r['period'] for r in rows if last_period <= r['period'] <= checked_through}, reverse=True):
        for period in [shift_month(candidate,i) for i in range(-23,1)]:
            # Historical absent reporters are allowed only where the accepted
            # country snapshot independently records the exact same absence.
            expected=EU if period==candidate else historical_coverage.get(period,EU)
            issue = 'CN_YEAR_CONCORDANCE_REQUIRED' if int(period[:4]) not in supported_years else validate_month(rows,period,codes,expected)
            if issue:
                reasons[candidate] = f'{issue}:{period}'
                break
        else:
            return candidate,reasons
    raise ValueError('NO_COMPLETE_COMPARABLE_MONTH:' + json.dumps(reasons,sort_keys=True))


def build_snapshot(previous, rows, period, checked_at, source_updated, source_hash, scope):
    result = json.loads(json.dumps(previous))
    groups = collections.defaultdict(lambda: {'kg':Decimal(0),'eur':Decimal(0),'rows':0,'codes':set()})
    for row in rows:
        if row['period'] > period:
            continue
        for code in ('ALL',row['cn8']):
            b=groups[(code,row['view'],row['period'])]
            b['kg']+=row['kg'];b['eur']+=row['eur'];b['rows']+=1;b['codes'].add(row['cn8'])
    def point(code,view,month):
        b=groups[(code,view,month)]
        return {'period':month,'volume_tonnes':round(float(b['kg']/1000),2),'trade_value_eur':float(b['eur']),
                'unit_value_eur_kg':round(float(b['eur']/b['kg']),4) if b['kg']>0 else None,
                'observation_count':b['rows'],'cn_code_count':len(b['codes'])}
    def compared(code,view,month):
        a=point(code,view,month);b=point(code,view,shift_month(month,-12))
        reporters=lambda p:{r['reporter'] for r in rows if r['period']==p}
        comparable=reporters(month)==reporters(shift_month(month,-12))
        if not comparable:
            return {**a,'volume_yoy_percent':None,'value_yoy_percent':None,'unit_value_yoy_percent':None,
                    'comparison_status':'WITHHELD_REPORTER_COVERAGE_DIFFERS'}
        return {**a,'volume_yoy_percent':yoy(a['volume_tonnes'],b['volume_tonnes']),
                'value_yoy_percent':yoy(a['trade_value_eur'],b['trade_value_eur']),
                'unit_value_yoy_percent':yoy(a['unit_value_eur_kg'],b['unit_value_eur_kg'])}
    months=[shift_month(period,i) for i in range(-11,1)]
    for view in VIEWS:
        current=compared('ALL',view,period)
        target=result['views'][view]
        target['history']=[compared('ALL',view,p) for p in months]
        target['latest']=current
        target['trade_activity']=activity_state(current,point('ALL',view,shift_month(period,-12)))
        # Preserve the established species-specific eligibility and 100t/2-row rules.
        eligible=[]
        for code,item in scope.items():
            p=point(code,view,period)
            if item['granularity']=='SPECIES_SPECIFIC' and p['volume_tonnes']>=100 and p['observation_count']>=2 and p['unit_value_eur_kg'] and p['unit_value_eur_kg']>0:
                eligible.append({'slug':item['id'],'category':'CN '+code,'official_description':item['official_description'],'volume_tonnes':p['volume_tonnes'],
                                 'observation_count':p['observation_count'],'unit_value_eur_kg':p['unit_value_eur_kg']})
        eligible.sort(key=lambda p:(p['unit_value_eur_kg'],p['slug']))
        target['unit_value_range']={'status':'VERIFIED' if len(eligible)>=2 else 'INSUFFICIENT_EVIDENCE',
                                   'period':period,'eligible_category_count':len(eligible),
                                   'rule':'Species-specific CN scope only; >=100 tonnes and >=2 paired official observations; positive EUR/kg. Not a market or offer price.'}
        if len(eligible)>=2:
            target['unit_value_range'].update(low=eligible[0],high=eligible[-1])
    result['customs_entity_rankings']=[]
    for code,item in scope.items():
        p=compared(code,'eu_internal_trade',period)
        if p['observation_count']:
            result['customs_entity_rankings'].append({'crop':{'slug':item['id'],'crop':'CN '+code},'volume':p['volume_tonnes'],
                'value':p['trade_value_eur'],'volumeYoy':p['volume_yoy_percent'],'valueYoy':p['value_yoy_percent'],
                'granularity':item['granularity'],'definition':item['official_description'],'species_allocation':'NONE'})
    imports=result['views']['eu_imports']['latest'];exports=result['views']['eu_exports']['latest']
    result['extra_eu_balance'].update(period=period,volume_tonnes=round(exports['volume_tonnes']-imports['volume_tonnes'],2),
                                    trade_value_eur=round(exports['trade_value_eur']-imports['trade_value_eur'],2))
    balance=result['extra_eu_balance']['trade_value_eur']
    result['market_context']['text']=f"Extra-EU seed trade recorded a EUR {abs(balance):,.0f} {'surplus' if balance>=0 else 'deficit'} in {period}. Verified trade evidence confirms the balance and flow changes, but does not support a specific supply, price or weather explanation."
    peaks=[]
    for month in months:
        cur=sum(point('ALL',v,month)['volume_tonnes'] for v in VIEWS)
        prior=sum(point('ALL',v,shift_month(month,-12))['volume_tonnes'] for v in VIEWS)
        peaks.append({'period':month,'volume_tonnes':round(cur,2),'volume_yoy_percent':yoy(cur,prior)})
    result['peak_activity'].update(max(peaks,key=lambda p:(p['volume_tonnes'],p['period'])))
    result.update(latest_completed_period=period,latest_available_partial_period=shift_month(period,1),
                  generated_at=checked_at,source_artifact_sha256=source_hash,
                  accepted_observations=sum(1 for r in rows if r['period']<=period),
                  excluded_partial_observations=sum(1 for r in rows if r['period']>period))
    result['period_semantics']={'type':'MONTH_ONLY','period':period,'start':period+'-01',
        'end':period+f'-{calendar.monthrange(*map(int,period.split("-")))[1]:02d}',
        'selection':'40 sowing CN codes; intra-EU dispatches and extra-EU flows; no species allocation'}
    result['country_coverage']={'period':period,'validated':True,'reporters':sorted({r['reporter'] for r in rows if r['period']==period}),
        'definition':'EU reporting countries with eligible paired observations in this reporting month, across the three trade views; not partner-country count.'}
    result['refresh']={'last_check_at':checked_at,'last_success_at':checked_at,'source_updated_at':source_updated,
        'source_timestamp_verified':True,'source_manifest_sha256':source_hash,
        'publication_rule':'All bounded slices validated; newest month has all 27 reporters, 40 CN codes and 3 flows; 24-month coverage checked against accepted historical reporter sets. Unexplained gaps reject publication. YoY withheld if reporter coverage differs. Absent cells never zero-filled; official data can be revised.',
        'scheduler_status':'LOCAL_IMPLEMENTATION_ONLY_NOT_INSTALLED','errors':[]}
    # Preserve separate existing species context with its explicit period. This task
    # does not refresh catalogue price estimates or reallocate broad customs groups.
    return result


def publish_snapshot(root,work,previous,result):
    """Snapshot/manifest pair, with matching before-images and write-failure recovery."""
    target=root/'src/generated/trade_pulse_public.json'
    manifest_path=root/'src/generated/public_data_manifest.json'
    old_manifest=read(manifest_path)
    old_snapshot_bytes=target.read_bytes()
    old_manifest_bytes=manifest_path.read_bytes()
    if json.loads(old_snapshot_bytes)!=previous or old_manifest['datasets']['trade_pulse']['sha256']!=hashlib.sha256(old_snapshot_bytes).hexdigest():
        raise ValueError('LAST_GOOD_SNAPSHOT_MANIFEST_MISMATCH')
    atomic_bytes(work/'last-good-trade-pulse.json',old_snapshot_bytes)
    atomic_bytes(work/'last-good-public-data-manifest.json',old_manifest_bytes)
    manifest=json.loads(json.dumps(old_manifest))
    try:
        atomic_json(target,result)
        manifest['datasets']['trade_pulse'].update(sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
            latest_completed_period=result['latest_completed_period'],accepted_observations=result['accepted_observations'],period_semantics=result['period_semantics'])
        atomic_json(manifest_path,manifest)
    except Exception:
        atomic_bytes(target,old_snapshot_bytes)
        atomic_bytes(manifest_path,old_manifest_bytes)
        raise


def refresh(root, work, now, apply=False, scheduled=False, cached_release=False):
    target=root/'src/generated/trade_pulse_public.json'
    previous=read(target)
    state_path=work/'refresh-state.json'
    state=read(state_path) if state_path.exists() else {}
    if scheduled and not due(now,state):
        return {'status':'NOT_DUE','last_check_at':state.get('last_check_at')}
    checked=state.get('last_check_at',now.isoformat()) if cached_release else now.isoformat()
    work.mkdir(parents=True,exist_ok=True)
    lock=work/'refresh.lock'
    try:
        fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
    except FileExistsError:
        raise ValueError('REFRESH_ALREADY_RUNNING')
    os.close(fd)
    try:
        state.update(last_check_at=checked,status='CHECKING',errors=[])
        atomic_json(state_path,state)
        scope={item['cn8']:item for item in read(root/'docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json')}
        history=read(root/'docs/multisource-trade-v1/CN_HISTORY_EVIDENCE.json')
        if {r['cn8'] for r in history['code_decisions'] if r['status']=='COMPATIBLE_EXACT_HIERARCHY'} != set(scope):
            raise ValueError('CN_SCOPE_NOT_VALIDATED')
        years={int(r['year']) for r in history['sources']}
        years |= {int(y) for r in history['code_decisions'] for y in r.get('english_2025_2026',{})}
        if cached_release:
            countries_data=read(work/'partner-areas.json')
            countries_hash=hashlib.sha256((work/'partner-areas.json').read_bytes()).hexdigest()
        else:
            countries_data,countries_hash=fetch_json(PARTNERS)
        atomic_json(work/'partner-areas.json',countries_data)
        countries_hash=hashlib.sha256((work/'partner-areas.json').read_bytes()).hexdigest()
        countries={c.get('PartnerCodeIsoAlpha2') for c in countries_data['results'] if not c.get('isGroup') and len(c.get('PartnerCodeIsoAlpha2',''))==2} | {'XK'}
        countries -= {'XI','ZZ','EU','QP','QQ','QR','QS','QT','QU','QV','QW','QX','QY','QZ','XA','XB','XC','XD','XE','XF','XG','XH','XJ','XK_OLD','XL','XM','XN','XO','XP','XQ','XR','XS','XT','XU','XV','XW','XX','XY','XZ'}
        if not EU <= countries:
            raise ValueError('COUNTRY_REFERENCE_INCOMPLETE')
        start=shift_month(previous['latest_completed_period'],-23)
        end=now.strftime('%Y-%m')
        slices=[]
        while start<=end:
            stop=min(end,shift_month(start,11));slices.append((start,stop));start=shift_month(stop,1)
        rows=[];manifest=[];updates=set();seen=set()
        # Daily cache only reuses a source release with the same checked update
        # timestamp. Each invocation probes the source anew before cache reuse.
        if cached_release:
            available=sorted((work/'raw').glob('*/*.json'))
            if not available:
                raise ValueError('NO_CAPTURED_SOURCE_RELEASE')
            probe=max((read(p) for p in available),key=lambda p:p.get('updated',''))
        else:
            probe,_=fetch_json(query_url(next(iter(sorted(scope))),end,end))
        source_update=probe.get('updated')
        if not source_update:
            raise ValueError('SOURCE_UPDATE_TIMESTAMP_MISSING')
        release=hashlib.sha256(source_update.encode()).hexdigest()[:16]
        cache=work/'raw'/release;cache.mkdir(parents=True,exist_ok=True)
        # Reuse complete captured bounds for the SAME freshly probed source
        # release, including after the local headline advances. A new release
        # gets a distinct cache and re-reads history for revisions.
        captured=sorted({tuple(p.stem.split('_')[1:]) for p in cache.glob(next(iter(sorted(scope)))+'_*.json')})
        wanted_start=shift_month(previous['latest_completed_period'],-23)
        complete_cache=bool(captured) and captured[0][0]<=wanted_start and captured[-1][1]>=end and all(shift_month(a[1],1)==b[0] for a,b in zip(captured,captured[1:]))
        if complete_cache:
            slices=captured
        elif cached_release:
            raise ValueError('CAPTURED_TIME_WINDOW_INCOMPLETE')
        for code in sorted(scope):
            for start,stop in slices:
                url=query_url(code,start,stop);file=cache/f'{code}_{start}_{stop}.json'
                if file.exists():
                    dataset=read(file);digest=hashlib.sha256(file.read_bytes()).hexdigest()
                else:
                    if cached_release:
                        raise ValueError('CAPTURED_SOURCE_SLICE_MISSING')
                    dataset,_=fetch_json(url);atomic_json(file,dataset)
                    digest=hashlib.sha256(file.read_bytes()).hexdigest();time.sleep(.35)
                if dataset.get('updated') != source_update:
                    raise ValueError('SOURCE_RELEASE_CHANGED_DURING_EXTRACTION')
                updates.add(dataset['updated'])
                part=normalize(dataset,code,start,stop,countries)
                for row in part:
                    key=tuple(row[k] for k in ('reporter','partner','flow','period','cn8'))
                    if key in seen:
                        raise ValueError('DUPLICATE_SOURCE_GRAIN')
                    seen.add(key)
                rows.extend(part)
                manifest.append({'cn8':code,'start':start,'end':stop,'url':url,'sha256':digest,'rows':len(part),'source_updated':dataset['updated']})
            print(f'COMEXT {len(manifest)}/{len(scope)*len(slices)} slices checked',flush=True)
        country_snapshot_path=root/'src/generated/country_customs_totals.json'
        country_snapshot=read(country_snapshot_path)
        if country_snapshot.get('complete') is not True:
            raise ValueError('HISTORICAL_COVERAGE_NOT_VALIDATED')
        historical_coverage={}
        for entry in country_snapshot['rows']:
            if entry[1]!='EU' and entry[6]>0:
                historical_coverage.setdefault(entry[3],set()).add(entry[1])
        period,rejected=select_period(rows,scope,previous['latest_completed_period'],end,years,historical_coverage)
        evidence={'requests':manifest,'partner_reference_sha256':countries_hash,'rejected_periods':rejected}
        evidence_hash=hashlib.sha256(json.dumps(evidence,sort_keys=True).encode()).hexdigest()
        atomic_json(work/'source-manifest.json',evidence)
        result=build_snapshot(previous,rows,period,checked,source_update,evidence_hash,scope)
        result['generated_at']=now.isoformat()
        result['refresh'].update(last_success_at=now.isoformat(),verification_mode='CAPTURED_SOURCE_REPLAY' if cached_release else 'LIVE_SOURCE_CHECK',
            historical_coverage_sha256=hashlib.sha256(country_snapshot_path.read_bytes()).hexdigest())
        revisions=[]
        for view in VIEWS:
            old={p['period']:p for p in previous['views'][view]['history']}
            for point in result['views'][view]['history']:
                prior=old.get(point['period'])
                if prior and any(prior.get(k)!=point.get(k) for k in ('volume_tonnes','trade_value_eur','observation_count')):
                    revisions.append({'view':view,'period':point['period']})
        result['refresh']['revisions_detected']=bool(revisions)
        result['refresh']['revised_periods']=revisions
        atomic_json(work/'validated-trade-pulse.json',result)
        if apply:
            publish_snapshot(root,work,previous,result)
        state.update(status='VALIDATED',last_success_at=now.isoformat(),source_period=period,source_updated_at=source_update,
                     source_manifest_sha256=evidence_hash,applied_locally=apply,rejected_periods=rejected,errors=[])
        atomic_json(state_path,state)
        return state
    except Exception as exc:
        state.update(status='FAILED_RETAINED_LAST_GOOD',errors=[f'{type(exc).__name__}: {exc}'])
        atomic_json(state_path,state)
        raise
    finally:
        lock.unlink(missing_ok=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',type=Path,default=ROOT)
    parser.add_argument('--work',type=Path,default=ROOT/'.cache/comext-refresh')
    parser.add_argument('--apply',action='store_true',help='Replace validated local snapshot only; never deploy')
    parser.add_argument('--scheduled',action='store_true')
    parser.add_argument('--cached-release',action='store_true',help='Replay the captured source release without network requests; preserve actual source-check timestamp')
    args=parser.parse_args()
    print(json.dumps(refresh(args.root.resolve(),args.work.resolve(),dt.datetime.now(dt.timezone.utc),args.apply,args.scheduled,args.cached_release),indent=2))
