import unittest,tempfile,sys,json,hashlib
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import news_pipeline as p
from unittest.mock import patch
class Pipeline(unittest.TestCase):
 def test_bounded_network_retry_and_no_403_429_bypass(self):
  class Response:
   def __enter__(self):return self
   def __exit__(self,*a):pass
   def read(self,*a):return b'<rss/>'
   def geturl(self):return 'https://news.example.org/feed'
  class Opener:
   def __init__(self,error):self.calls=0;self.error=error
   def open(self,*a,**k):
    self.calls+=1
    if self.calls==1:raise self.error
    return Response()
  for error,expected in [(p.urllib.error.URLError('isolated'),2),(p.urllib.error.HTTPError('https://news.example.org/feed',403,'Forbidden',{},None),1),(p.urllib.error.HTTPError('https://news.example.org/feed',429,'Rate limited',{},None),1)]:
   opener=Opener(error)
   with patch.object(p,'allowed',side_effect=lambda url,*a:url),patch.object(p.urllib.request,'build_opener',return_value=opener),patch.object(p.time,'sleep'):
    try:p.fetch('https://news.example.org/feed',self.source())
    except p.urllib.error.HTTPError:pass
   self.assertEqual(opener.calls,expected)
 def source(self):return {'source_id':'isolated-fixture','source_name':'Isolated official fixture','source_type':'OFFICIAL_DATA','streams':['EU Trade Market'],'country_region':'GB','public_url':'https://news.example.org/feed','active':True}
 def fetch(self,url,source):
  if url.endswith('/feed'):return '<rss><channel>'+''.join('<item><title>Certified wheat seed trial results</title><link>https://news.example.org/story'+str(i)+'</link><pubDate>Sat, 14 Nov 2026 00:00:00 GMT</pubDate></item>' for i in [1,2])+'</channel></rss>',url
  return '<h1>Certified wheat seed trial results</h1><meta name="description" content="Wheat seed trial findings for editorial review.">',url
 def test_private_collection_deduplication_repeat_and_failure_preserve_content(self):
  base=ROOT.parents[2]/'private/stage2-news-v1/test-fixtures';base.mkdir(parents=True,exist_ok=True)
  original=(ROOT/'src/generated/news.json').read_bytes()
  with tempfile.TemporaryDirectory(dir=base) as folder:
   first=p.collect(folder,[self.source()],datetime(2026,11,16,tzinfo=timezone.utc),self.fetch);self.assertEqual(first['pending_candidates'],1)
   second=p.collect(folder,[self.source()],datetime(2026,11,16,1,tzinfo=timezone.utc),self.fetch);self.assertEqual(second['pending_candidates'],1)
   def fail(*a):raise TimeoutError('isolated failure')
   failed=p.collect(folder,[self.source()],datetime(2026,11,16,2,tzinfo=timezone.utc),fail);self.assertEqual(failed['pending_candidates'],1);self.assertEqual(failed['last_collection_status'],'PARTIAL')
   rows=p.load(Path(folder)/'candidates.json')['items'];self.assertTrue(all(r['status']=='PENDING_EDITORIAL_REVIEW' for r in rows));self.assertIsNone(rows[0]['commercial_implications'])
  self.assertEqual((ROOT/'src/generated/news.json').read_bytes(),original)
 def test_public_storage_and_unsafe_urls_rejected(self):
  for folder in [ROOT/'public/test',ROOT/'src/test',ROOT/'dist/test']:
   with self.assertRaises(ValueError):p.private_path(folder)
  for url in ['http://news.example.org/x','https://evil.example/x','https://news.example.org/x?token=secret']:
   with self.assertRaises(ValueError):p.allowed(url,self.source())
 def test_exact_weights_and_no_unrelated_seed_funding(self):
  self.assertEqual(p.WEIGHTS,{'seed_relevance':.3,'source_reliability':.25,'freshness':.2,'commercial_value':.15,'european_relevance':.1})
  self.assertFalse(p.relevant('Seed funding for AI chemistry'));self.assertTrue(p.relevant('Nacontrole aardappelen 2026'))
 def test_sunday_wednesday_dst_idempotency_and_catchup(self):
  for iso in ['2026-03-25T16:00:00+00:00','2026-04-01T15:00:00+00:00','2026-10-21T15:00:00+00:00','2026-10-25T16:00:00+00:00']:
   now=datetime.fromisoformat(iso);local=p.local_parts(now);self.assertEqual(local.hour,18);jobs=p.due(now,{});editor=[j for j in jobs if j[0]=='EDITORIAL'];self.assertEqual(len(editor),1);self.assertEqual(editor[0][1],local.replace(minute=0).isoformat());self.assertFalse(p.due(now,{'last_daily_date':local.date().isoformat(),'last_editorial_cycle':editor[0][1]}))
  self.assertIn(('EDITORIAL','2026-11-15T18:00:00'),p.due(datetime(2026,11,16,10,tzinfo=timezone.utc),{}))
 def test_cycle_creates_private_drafts_and_never_approves_or_publishes(self):
  base=ROOT.parents[2]/'private/stage2-news-v1/test-fixtures';base.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory(dir=base) as folder:
   out=p.cycle(folder,[self.source()],datetime(2026,11,18,16,tzinfo=timezone.utc),self.fetch);self.assertEqual(out['published'],0);self.assertFalse(out['approvalGranted']);drafts=list((Path(folder)/'drafts').glob('*.json'));self.assertEqual(len(drafts),1);self.assertEqual(p.load(drafts[0])['publication_approval'],None)
   cycle=p.load(next((Path(folder)/'cycles').glob('*.json')));self.assertEqual(len(cycle['stream_slots']),4);self.assertTrue(all(s['status']=='UNFILLED' for s in cycle['stream_slots']))
 def test_eight_weekly_slots_and_dst_offsets(self):
  for iso,hour in [('2026-11-16T10:00:00+00:00','16:00:00'),('2026-06-01T10:00:00+00:00','15:00:00')]:
   slots=p.week_slots(datetime.fromisoformat(iso));self.assertEqual(len(slots),8);self.assertEqual(len({s['slot_id'] for s in slots}),8)
   for stream in p.STREAMS:self.assertEqual(sum(s['stream']==stream for s in slots),2)
   self.assertTrue(all(s['scheduled_utc'][11:19]==hour for s in slots))
 def test_four_independent_shortlists_and_missed_slot_ledger(self):
  base=ROOT.parents[2]/'private/stage2-news-v1/test-fixtures';base.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory(dir=base) as folder:
   folder=Path(folder);titles=['European drought and soil moisture review','Wheat variety trial and seed quality findings','Seed certification and cross-border trade','European seed congress and field day']
   rows=[{'id':str(i),'title':title,'source_excerpt':'','source_type':'OFFICIAL_DATA','original_publication_date':'2026-11-16','topic_tags':[p.STREAMS[i]],'canonical_source_url':'https://news.example.org/'+str(i),'status':'PENDING_EDITORIAL_REVIEW'} for i,title in enumerate(titles)]
   rows += [{**rows[0],'id':'weather-extra-'+str(i)} for i in range(8)]
   p.write(folder/'candidates.json',{'items':rows});out=p.coverage(folder,datetime(2026,11,16,10,tzinfo=timezone.utc),[self.source()]);lists=p.load(folder/'shortlists.json')['streams']
   self.assertEqual([len(lists[s]) for s in p.STREAMS],[9,1,1,1]);self.assertEqual(len(out['slots']),8);self.assertTrue(all(s['readiness']=='UNFILLED' and s['published']==0 for s in out['slots']))
   later=p.coverage(folder,datetime(2026,11,23,10,tzinfo=timezone.utc),[]);self.assertEqual(len(later['slots']),16);old=[s for s in later['slots'] if s['slot_id'] not in later['current_week_slot_ids']];self.assertEqual(len(old),8);self.assertTrue(all(s['reason']=='CYCLE_MISSED_NO_VERIFIED_PUBLICATION' for s in old))
 def test_broad_source_remit_does_not_invent_event_or_agronomy_coverage(self):
  c={'title':'Certificering pootgoed aanvragen','source_excerpt':'NAK certificaat','topic_tags':['EU Agronomist','EU Trade Market','EU Events']}
  self.assertEqual(p.candidate_streams(c),['EU Trade Market']);self.assertTrue(p.relevant('Euroseeds Congress 2027'));self.assertFalse(p.relevant('Seed funding for a software startup'))
 def test_scheduled_wrong_date_and_completed_event_never_reach_publication(self):
  base=ROOT.parents[2]/'private/stage2-news-v1/test-fixtures';base.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory(dir=base) as directory:
   folder=Path(directory)
   for name,article in [('wrong-date',{'stream':'EU Weather','publication_date':'2026-11-16'}),('completed-event',{'stream':'EU Events','publication_date':'2026-11-18','event':{'end_date':'2026-11-17','status':'COMPLETED'}})]:
    package=folder/(name+'.json');p.write(package,{'article':article});p.write(folder/'approved'/(name+'.json'),{'package':str(package),'receipt':str(folder/'NO_REVIEW_GIVEN.json'),'authorization':str(folder/'NO_AUTHORIZATION_GIVEN.json')})
   with patch.object(p,'prepare_publication') as publish:
    p.cycle(folder,[],datetime(2026,11,18,16,tzinfo=timezone.utc));publish.assert_not_called()
   cycle=p.load(next((folder/'cycles').glob('*.json')));self.assertEqual({x['reason'] for x in cycle['held_packages']},{'SLOT_PUBLICATION_DATE_REBINDING_REQUIRED','VERIFIED_UPCOMING_EVENT_REQUIRED'});self.assertEqual(cycle['published'],0)
 def test_reviewed_background_links_do_not_exhaust_discovery_budget(self):
  calls=[];source={**self.source(),'streams':['EU Events']}
  def fetcher(url,source):
   calls.append(url)
   if url.endswith('/feed'):return ''.join('<a href="https://news.example.org/background'+str(i)+'">Agricultural seed research background page</a>' for i in range(3))+'<a href="https://news.example.org/field-day">European seed field day demonstration</a>',url
   return '<h1>European seed field day demonstration</h1>',url
  rows,errors=p.extract(source,datetime(2026,11,16,tzinfo=timezone.utc),fetcher,{'https://news.example.org/background'+str(i) for i in range(3)})
  self.assertEqual(len(rows),1);self.assertEqual(len(calls),2);self.assertEqual(errors,[]);self.assertIsNone(rows[0]['original_publication_date']);self.assertEqual(rows[0]['status'],'PENDING_EDITORIAL_REVIEW')
 def test_simple_regional_source_eligibility_and_current_future_event(self):
  recent={'editorial_verification':{'source_verified':True,'source_published_at':'2026-11-12','event':None}}
  self.assertEqual(p.brief_eligibility(recent,'2026-11-16'),'ELIGIBLE_RECENT_SOURCE');self.assertIn('STALE',p.brief_eligibility(recent,'2026-11-19'))
  event={'editorial_verification':{'source_verified':True,'source_published_at':None,'checked_at':'2026-11-16','event':{'end_date':'2026-12-01','status':'CONFIRMED'},'current_relevance_reason':'Current visitor programme'}}
  self.assertEqual(p.brief_eligibility(event,'2026-11-22'),'ELIGIBLE_CURRENT_FUTURE_EVENT');self.assertIn('STALE',p.brief_eligibility(event,'2026-11-23'));self.assertEqual(p.brief_eligibility({},'2026-11-16'),'SOURCE_VERIFICATION_REQUIRED')
 def test_automatic_brief_assembly_requires_real_multilingual_inputs(self):
  source={'id':'fixture','label':'ISOLATED_TEST_SOURCE','url':'https://news.example.org/fixture','published_at':'2026-11-12'}
  language={'headline':'Isolated test headline','summary':'Isolated test summary','paragraphs':['Isolated source-based paragraph for a local test. '*6,'Second isolated paragraph for a local test only. '*6]}
  data={'article':{'slug':'isolated-brief-fixture','stream':'EU Agronomist'},'languages':{k:dict(language) for k in p.BRIEF_STANDARD['languages']},'sources':[source],'references':{source['url']:{'title':'Isolated fixture'}},'scope':'ISOLATED_TEST_ONLY','visual':{}}
  packet=p.assemble_brief(data,'2026-11-16');self.assertEqual(packet['article']['review_status'],'PENDING_OWNER_APPROVAL');self.assertFalse(packet['article']['publication_eligible']);self.assertEqual(packet['article']['valid_until'],'2026-11-18');self.assertEqual(len(packet['article']['localizations']),4);self.assertEqual(len(packet['article']['content']),2)
  del data['languages']['de']
  with self.assertRaises(KeyError):p.assemble_brief(data,'2026-11-16')
 def test_trade_rule_cannot_be_bypassed_by_explicit_category_or_generic_usefulness(self):
  c={'id':'commodity','title':'Grain prices and energy costs','source_excerpt':'Useful for agricultural businesses','editorial_streams':['EU Trade Market'],'canonical_source_url':'https://news.example.org/commodity','editorial_verification':{'source_verified':True,'source_published_at':'2026-11-12'}}
  self.assertEqual(p.candidate_streams(c),[]);self.assertEqual(p.brief_eligibility(c,'2026-11-16'),'SEED_SECTOR_CONNECTION_REQUIRED')
  c['editorial_verification']['seed_sector_connection']={'verified':True,'source_url':c['canonical_source_url'],'evidence_locator':'Seed-processing section','explanation':'The source explains energy consumption in seed cleaning.','source_evidence':'A seed-cleaning plant reports energy use for its processing operations.'}
  self.assertEqual(p.candidate_streams(c),['EU Trade Market']);self.assertEqual(p.brief_eligibility(c,'2026-11-16'),'ELIGIBLE_RECENT_SOURCE')
  self.assertFalse(p.positive_seed_evidence('Commodity prices, not seed prices.'))
  c['editorial_verification']['seed_sector_connection']['source_url']='https://unrelated.example.org/'
  self.assertNotEqual(p.trade_seed_connection(c),'SUBSTANTIATED_SEED_CONNECTION')
 def test_geographic_diversity_only_breaks_equal_value_ties_and_counts_real_publications(self):
  history=p.publication_geography('2026-11-16',[{'slug':'published-fr','publication_date':'2026-11-15','publication_status':'PUBLIC_SAFE','countries':['FR'],'geography':{'region':'Occitanie'}},{'slug':'draft-gb','publication_date':'2026-11-15','publication_status':'DRAFT','countries':['GB']},{'slug':'future-no','publication_date':'2026-12-01','publication_status':'PUBLIC_SAFE','countries':['NO']}])
  self.assertEqual(history['countries'],{'FR':1});self.assertEqual(history['article_slugs'],['published-fr'])
  common={'title':'Seed variety trial','source_excerpt':'','source_type':'OFFICIAL_DATA','original_publication_date':'2026-11-16'}
  france={**common,'id':'fr','editorial_verification':{'source_published_at':'2026-11-16','source_verified':True,'countries':['FR'],'region':'Occitanie'}};britain={**common,'id':'gb','editorial_verification':{'source_published_at':'2026-11-16','source_verified':True,'countries':['GB'],'region':'England'}}
  self.assertEqual(p.rank_candidates([france,britain],'2026-11-16',history)[0]['id'],'gb')
  france['title']='Seed variety trial certification research';self.assertEqual(p.rank_candidates([britain,france],'2026-11-16',history)[0]['id'],'fr')
  unknown={**common,'id':'unknown','country_region':'GB'};self.assertEqual(p.candidate_geography(unknown)['countries'],[])
if __name__=='__main__':unittest.main()
