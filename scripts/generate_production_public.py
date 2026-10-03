"""Deterministic, fail-closed V5 public projection. Run with the canonical V5 ZIP."""
import argparse, hashlib, io, json, pathlib, zipfile
EXPECTED = '12a5c499789336c69c280d6117b8ca6e73ed36d3111a8c2789957f3ce0a65b79'
ROOT = pathlib.Path(__file__).resolve().parents[1]
METRICS = {'SEED_PRODUCTION_AREA', 'CERTIFIED_SEED_AREA', 'CERTIFIED_QUANTITY'}
LOW = {'CY', 'LU', 'MT'}
def encode(v): return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def digest(v): return hashlib.sha256(encode(v).encode()).hexdigest()
def project(archive):
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == EXPECTED, 'V5 checksum mismatch'
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        manifest = json.loads(z.read('research_v5/outputs/PROVENANCE_MANIFEST_V05.json'))
        for f in manifest['files']:
            assert hashlib.sha256(z.read(f['path'])).hexdigest() == f['sha256']
        dependency = zipfile.ZipFile(io.BytesIO(z.read('SeedTrade-eu-seed-production-V041-20261003.zip')))
        canonical = {e['canonical_species_id']:e for e in json.loads(dependency.read('research_v41/outputs/EU_SEED_CANONICAL_SPECIES_V041.json'))}
        raw = z.read('research_v5/outputs/EU_SEED_PRODUCTION_PUBLIC_SAFE_V05.json')
        records = json.loads(raw)
        series = json.loads(z.read('research_v5/outputs/EU_SEED_PRODUCTION_V5_SERIES.json'))
    assert len(records) == 1835
    lookup = {r['observation_id']:r for r in records}
    assert len(lookup) == len(records)
    for r in records:
        assert r['public_safe'] and r['public_intelligence_eligible'] and r['comparable_eligible']
        assert not r['public_exclusion_reasons'] and not r['comparison_exclusion_reason']
        assert r['species_mapping_status'] not in {'REVIEW_REQUIRED','UNMAPPED'}
        assert r['metric_type'] in METRICS and r['canonical_species_id']
        assert r['source_url'].startswith('https://') and r['value'] >= 0
    entities, sources, observations, groups = {}, {}, {}, []
    for r in records:
        if r['country_code'] in LOW: continue
        c = canonical[r['canonical_species_id']]
        e = dict(id=c['canonical_species_id'], name=c['canonical_common_name'], botanical=c['canonical_botanical_name'], rank=c['taxonomic_rank'])
        assert e['id'] not in entities or entities[e['id']] == e
        entities[e['id']] = e
        source = dict(organisation=r['source_organisation'], title=r['source_title'], url=r['source_url'], accessed=r['source_access_date'], reporting_period=r['source_reporting_period'], terminology=r['original_terminology'])
        sid = 'src-'+digest(source)[:20]
        sources[sid] = source
        observations[r['observation_id']] = dict(id=r['observation_id'], entity=e['id'], country=r['country_code'], year=r['year'], metric=r['metric_type'], unit=r['unit'], value=r['value'], source=sid, evidence='VERIFIED_OFFICIAL_SOURCE', definition=r['metric_subtype'], season=r['season'], category=r['seed_category'], crop_use=r['crop_use'], species_scope=r['source_species_scope'], source_botanical=r['source_botanical_name'])
    seen = set()
    for s in series:
        if s['country_code'] in LOW: continue
        ids = s['observation_ids']
        assert all(i in observations for i in ids)
        assert len({lookup[i]['year'] for i in ids}) == len(ids)
        assert not seen.intersection(ids)
        seen.update(ids)
        grain = {k:s[k] for k in ('country_code','source_botanical_name','metric_type','unit','metric_subtype','seed_category','season','crop_use','source_species_scope','source_organisation')}
        for i in ids:
            assert all(lookup[i].get(k,'') == v for k,v in grain.items())
        groups.append(dict(id='series-'+digest(grain)[:20], entity=s['canonical_species_id'], country=s['country_code'], metric=s['metric_type'], unit=s['unit'], definition=s['metric_subtype'], season=s['season'], category=s['seed_category'], crop_use=s['crop_use'], species_scope=s['source_species_scope'], source_botanical=s['source_botanical_name'], organisation=s['source_organisation'], history_length=s['maximum_consecutive_years'], observations=sorted(ids,key=lambda i:observations[i]['year'])))
    assert seen == set(observations)
    countries = sorted({r['country'] for r in observations.values()})
    result = dict(version='V05', source_checkpoint_sha256=EXPECTED, source_public_safe_sha256=hashlib.sha256(raw).hexdigest(), source_records=len(records), cross_country_comparability='NOT_ESTABLISHED; no ranking or EU totals', countries=countries, entities=sorted(entities.values(),key=lambda x:x['id']), sources=dict(sorted(sources.items())), observations=sorted(observations.values(),key=lambda x:x['id']), series=sorted(groups,key=lambda x:x['id']))
    return result
if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('checkpoint',type=pathlib.Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    result=project(args.checkpoint); output=json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n';target=ROOT/'src/generated/production_public.json'
    proof = json.dumps(dict(checkpoint_sha256=EXPECTED, public_safe_source_sha256=result['source_public_safe_sha256'], source_records=result['source_records'], projected_record_hashes={r['id']:digest(r) for r in result['observations']}, public_artifact_sha256=hashlib.sha256(output.encode()).hexdigest()),sort_keys=True,indent=2)+'\n'
    proof_target=ROOT/'docs/production-intelligence/PROVENANCE.json'
    if args.check:
        assert target.read_text()==output, 'Non-reproducible public projection'
        assert proof_target.read_text()==proof, 'Non-reproducible provenance'
    else:
        target.write_text(output)
        proof_target.write_text(proof)
    print(json.dumps(dict(records=len(result['observations']),countries=len(result['countries']),entities=len(result['entities']),latest_year=max(r['year'] for r in result['observations']),sha256=hashlib.sha256(output.encode()).hexdigest())))
