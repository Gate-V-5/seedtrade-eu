"""Reproduce the reviewed 2024 revision without overwriting prior reports."""
import hashlib
import json
from pathlib import Path
from supply_v01 import build

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/seed_production'
INPUTS = ['DE_BSA_2024_quantities_v01.json', 'PL_PIORIN_2024_areas_v01.json',
          'IT_CREA_2024_areas_v01.json', 'PL_PIORIN_2024_westerwolds_supplement.json',
          'DE_visual_verification_v01.json', 'PL_visual_verification_v01.json']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    before = {name: digest(DATA/name) for name in INPUTS}
    docs = [json.loads((DATA/name).read_text(encoding='utf-8-sig')) for name in INPUTS[:4]]
    evidence = {}
    for index, report_name in [(0, INPUTS[4]), (1, INPUTS[5])]:
        report = json.loads((DATA/report_name).read_text(encoding='utf-8-sig'))
        if digest(ROOT/report['source']) != report['sha256'].lower():
            raise ValueError('Source PDF hash differs from verification report')
        if report['result'] != 'VISUALLY_VERIFIED' or report['discrepancies'] != 0:
            raise ValueError('Verification report not accepted')
        docs[index]['source_sha256'] = report['sha256']
        for row in docs[index]['records']:
            row['extraction_status'] = 'VISUALLY_VERIFIED'
        evidence[docs[index]['country']] = report_name
    docs[0]['metric'] = 'officially_recognized_seed_quantity_all_reported_classes'
    result = build(docs, 2024)
    rows = result['observations']
    assert len(rows) == 47
    assert sum(r['status'] == 'MISSING' for r in rows) == 4
    assert len({(r['country'], r['species'], r['year'], r['metric']) for r in rows}) == 47
    assert all(r['tonnes'] is None for r in rows if r['unit'] == 'ha')
    assert all(c['status'] == 'MISSING' for c in result['coverage'] if c['country'] == 'FR')
    assert all(r['extraction_status'] == 'VISUALLY_VERIFIED' for r in rows if r['country'] in ('DE','PL'))
    assert all(r['source_sha256'] for r in rows)
    assert all(r['source_sheet'] == 'Storico_ha' for r in rows if r['country'] == 'IT')
    assert before == {name: digest(DATA/name) for name in INPUTS}
    result.update(revision='r02', supersedes='supply_v01_2024.json',
                  input_sha256=before, verification_reports=evidence,
                  revision_note='Adds separate Westerwolds category and current source metadata; original inputs preserved.')
    with (DATA/'supply_v01_2024_r02.json').open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2)
    print('Integration checks passed: 47 unique measurements, 43 observed, 4 missing; input hashes unchanged.')

if __name__ == '__main__':
    main()
