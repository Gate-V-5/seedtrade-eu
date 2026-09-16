"""Local research observations; never infer available inventory."""
from decimal import Decimal, InvalidOperation
from datetime import date
from copy import deepcopy
import json
from pathlib import Path

COUNTRIES = ('FR', 'DE', 'PL', 'IT')
GROUPS = ('red_clover', 'white_clover', 'ryegrass', 'vetch', 'flax')
METRICS = {'officially_recognized_seed_quantity_all_reported_classes': 'dt',
           'officially_controlled_seed_production_area': 'ha',
           'presented_seed_production_area': 'ha',
           'assessed_area': 'ha', 'qualified_area': 'ha', 'disqualified_area': 'ha'}

def number(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError('Invalid measurement')
    try:
        n = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError('Invalid measurement') from exc
    if not n.is_finite() or n < 0:
        raise ValueError('Measurement must be finite and nonnegative')
    return n

def build(documents, year):
    if type(year) is not int:
        raise ValueError('Year must be an integer')
    out, seen = [], set()
    for source in documents:
        country = source['country']
        if country not in COUNTRIES or type(source['reference_year']) is not int:
            raise ValueError('Invalid country/year')
        if source['reference_year'] != year:
            continue
        provisional = source.get('provisional')
        if provisional is not None and type(provisional) is not bool:
            raise ValueError('Provisional status must be boolean or unknown')
        as_of = source.get('as_of')
        if provisional is True and as_of is None:
            raise ValueError('Provisional observations require an as-of date')
        if as_of is not None:
            if not isinstance(as_of, str) or len(as_of) != 10:
                raise ValueError('As-of date must be YYYY-MM-DD')
            if date.fromisoformat(as_of).isoformat() != as_of:
                raise ValueError('As-of date must be YYYY-MM-DD')
        if not source.get('source_url'):
            raise ValueError('Missing source')
        for row in source['records']:
            group, species = row['crop_group'], row['source_species']
            if group not in GROUPS or not isinstance(species, str) or not species.strip() or species != species.strip():
                raise ValueError('Invalid species/group')
            if source['metric'] == 'seed_field_assessment_area':
                a, q, d = [number(row[k + '_area_ha']) for k in ('assessed', 'qualified', 'disqualified')]
                if None not in (a, q, d) and a != q + d:
                    raise ValueError('Assessment reconciliation failed')
                measurements = [(k + '_area', row[k + '_area_ha'], 'ha') for k in ('assessed', 'qualified', 'disqualified')]
            else:
                measurements = [(row.get('metric', source.get('metric')), row['value'], row['unit'])]
            for metric, raw, unit in measurements:
                if metric not in METRICS or unit != METRICS[metric]:
                    raise ValueError('Unsupported metric/unit')
                key = (country, species, year, metric)
                if key in seen:
                    raise ValueError('Duplicate observation')
                seen.add(key)
                value = number(raw)
                out.append(dict(country=country, crop_group=group, species=species,
                    year=year, marketing_year=source.get('marketing_year'), metric=metric,
                    value=None if value is None else str(value), unit=unit,
                    tonnes=str(value / Decimal(10)) if unit == 'dt' and value is not None else None,
                    status='MISSING' if value is None else 'OBSERVED',
                    source_url=source['source_url'], source_locator=row.get('source_cell', row.get('page')),
                    provisional=source.get('provisional'), as_of=source.get('as_of'),
                    source_sha256=source.get('source_sha256'), source_sheet=source.get('source_sheet'),
                    use_category=row.get('use_category'), source_date=source.get('source_date'),
                    limitations=deepcopy(source.get('limitations', [])),
                    extraction_status=row.get('extraction_status', 'SOURCE_CELL_READ'),
                    available_supply=None))
    coverage = [dict(country=c, crop_group=g,
        status='HAS_OBSERVATIONS_NOT_FULL_COVERAGE' if any(r['country']==c and r['crop_group']==g and r['status']=='OBSERVED' for r in out) else 'MISSING')
        for c in COUNTRIES for g in GROUPS]
    return dict(version='0.1', reference_year=year, observations=out, coverage=coverage,
                available_supply=None, cross_country_supply_total=None,
                publication_status='LOCAL_RESEARCH_ONLY')

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    files = ['DE_BSA_2024_quantities_v01.json', 'PL_PIORIN_2024_areas_v01.json', 'IT_CREA_2024_areas_v01.json']
    docs = [json.loads((root/'data/seed_production'/f).read_text(encoding='utf-8-sig')) for f in files]
    # DE source stores the metric on each row; leave original untouched.
    docs[0]['metric'] = 'officially_recognized_seed_quantity_all_reported_classes'
    result = build(docs, 2024)
    target = root/'data/seed_production/supply_v01_2024.json'
    with target.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2, ensure_ascii=True)
    print(f"Saved {len(result['observations'])} observations")


