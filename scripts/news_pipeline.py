"""Private news discovery/editorial preparation. Never grants approval or deploys.

Uses existing Python/Node infrastructure. All public promotion requires separately
supplied, exact-hash owner authorization and the existing evidence/image gates.
"""
from pathlib import Path
from datetime import datetime,date,timedelta,timezone
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
import argparse,hashlib,json,os,re,time,urllib.request,urllib.parse,xml.etree.ElementTree as ET,subprocess,socket,ipaddress,shutil
from email.utils import parsedate_to_datetime
ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parents[2]
WEIGHTS={'seed_relevance':.30,'source_reliability':.25,'freshness':.20,'commercial_value':.15,'european_relevance':.10}
STREAMS=['EU Weather','EU Agronomist','EU Trade Market','EU Events']
BRIEF_STANDARD={'format':'SHORT_NEWS_BRIEF','main_characters':[1000,2000],'paragraphs':[3,4,5],'languages':['en','de','fr','es','it'],'normal_source_age_days':7,'single_primary_source_allowed':True,'academic_research_required':False,'quantified_market_impact_required':False}
SEED_WORDS=r'\bseeds?\b|\bsemences?\b|\bsaatgut\b|\bsement[ei]\b|\bpoot(?:goed|aardappel\w*)\b|\bzaaiza\w*\b'

def positive_seed_evidence(value):
 return any(re.search(SEED_WORDS,clause,re.I) and not re.search(r'\b(no|not|unrelated|sans|pas|nicht|kein\w*)\b.{0,40}(seed|semence|saatgut|sement)',clause,re.I) for clause in re.split(r'[.;!?]',value or ''))

def trade_seed_connection(candidate):
 proof=candidate.get('editorial_verification',{}).get('seed_sector_connection') or {}
 allowed_sources={candidate.get('canonical_source_url'),*candidate.get('editorial_verification',{}).get('verified_source_urls',[])}
 if proof.get('verified') is True and proof.get('source_url') and proof.get('source_url') in allowed_sources and proof.get('evidence_locator') and proof.get('explanation') and positive_seed_evidence(proof.get('source_evidence')):return 'SUBSTANTIATED_SEED_CONNECTION'
 # Discovery metadata may identify a seed topic, but is not verification.
 if re.search(SEED_WORDS,candidate.get('title','')+' '+candidate.get('source_excerpt',''),re.I):return 'SEED_TOPIC_REQUIRES_SOURCE_EVIDENCE'
 return 'NO_SUBSTANTIATED_SEED_CONNECTION'

def publication_geography(asof,items=None):
 if items is None:items=load(ROOT/'src/generated/news.json')['items']
 published=sorted([i for i in items if i.get('publication_status')=='PUBLIC_SAFE' and i.get('publication_eligible') is not False and i.get('publication_date','9999')<=asof],key=lambda i:(i['publication_date'],i.get('slug','')),reverse=True)[:20]
 countries={};regions={}
 for item in published:
  for country in set(item.get('countries') or item.get('geography',{}).get('countries',[])):
   if re.fullmatch('[A-Z]{2}',country) and country!='EU':countries[country]=countries.get(country,0)+1
  region=item.get('geography',{}).get('region')
  if region:regions[region]=regions.get(region,0)+1
 return {'window':'20 most recent actually published snapshot articles, excluding drafts and future records','as_of':asof,'article_slugs':[i.get('slug') for i in published],'countries':countries,'regions':regions,'rule':'Underrepresentation breaks equal editorial-score ties only. No country quotas or EU-membership filter.'}

def candidate_geography(candidate,folder=None):
 verification=candidate.get('editorial_verification',{});countries=(verification.get('countries') or []) if verification.get('source_verified') else [];region=verification.get('region') if verification.get('source_verified') else None
 if folder and verification.get('source_verified') and candidate.get('brief_input'):
  file=(Path(folder)/candidate['brief_input']).resolve()
  if file.is_relative_to(Path(folder).resolve()):
   article=(load(file,{}) or {}).get('article',{});countries=article.get('countries',countries);region=article.get('geography',{}).get('region',region)
 # Never infer story geography from a publisher's home country/domain.
 return {'countries':sorted({c for c in countries if re.fullmatch('[A-Z]{2}',c) and c!='EU'}),'region':region}

def geographic_tiebreak(candidate,history,folder=None):
 geo=candidate_geography(candidate,folder);counts=history['countries'];regions=history['regions']
 country_score=sum(counts.get(c,0) for c in geo['countries'])/len(geo['countries']) if geo['countries'] else max(counts.values(),default=0)+1
 region_score=regions.get(geo['region'],0) if geo['region'] else max(regions.values(),default=0)+1
 return [country_score,region_score]

def candidate_score(candidate,asof):
 review=candidate.get('stage2_content_screening',{});original=review.get('verified_source_publication_date') if 'verified_source_publication_date' in review else candidate.get('original_publication_date')
 if candidate.get('editorial_verification'):original=candidate['editorial_verification'].get('source_published_at')
 return priority({**candidate,'original_publication_date':original},asof)

def rank_candidates(candidates,asof,history,folder=None):
 return sorted(candidates,key=lambda c:(-candidate_score(c,asof)[0],*geographic_tiebreak(c,history,folder),c['id']))
def relevant(title,excerpt=''):
 text=(title+' '+excerpt).lower()
 if re.search(r'\b(seed funding|seed round|seed capital|startup funding)\b',text) and not re.search(r'agricultur|agronom|sowing|plant variet|saatgut|semenc',text):return False
 if re.search(r'\b(seeds?|euroseeds|interpom|field days?|feldtage|journées techniques)\b',text):return True
 return bool(re.search(r'\b(agricultur\w*|agronom\w*|seedling\w*|sowing|plant\s+variet\w*|crop\w*|cereal\w*|wheat|barley|clover|potato\w*|legum\w*|rapeseed|oilseed\w*|grassland|pootgoed|zaaizaden|saatgut|semences|sementi|aardappel\w*|nacontrole|tarwe|gerst|blé|colza|getreide|weizen|gerste|frumento|orzo)\b',text))
def load(p,default=None):return json.loads(p.read_text(encoding='utf-8')) if p.exists() else default
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def write(p,value):
 p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_suffix(p.suffix+'.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');os.replace(temp,p)
def private_path(path):
 p=Path(path).resolve()
 if p.is_relative_to(ROOT.resolve()) or 'private' not in [x.lower() for x in p.parts] or any(x.lower() in ['public','dist','.github'] for x in p.parts):raise ValueError('CANDIDATES_MUST_REMAIN_OUTSIDE_WEBSITE_CHECKOUT')
 p.mkdir(parents=True,exist_ok=True);return p
def canonical_url(url):
 u=urllib.parse.urlsplit(url)
 if u.scheme!='https' or not u.hostname or u.username or u.password or u.port not in [None,443]:raise ValueError('PUBLIC_HTTPS_URL_REQUIRED')
 q=[(k,v) for k,v in urllib.parse.parse_qsl(u.query) if not k.lower().startswith('utm_') and k.lower() not in ['fbclid','gclid']]
 if any(re.search('token|password|secret|api_key',k,re.I) for k,v in q):raise ValueError('CREDENTIAL_URL_REJECTED')
 return urllib.parse.urlunsplit(('https',u.hostname.lower(),u.path or '/',urllib.parse.urlencode(sorted(q)),''))
def hosts(source):return {urllib.parse.urlsplit(source['public_url']).hostname,*source.get('approved_hosts',[])}
def allowed(url,source,resolve=False):
 url=canonical_url(url);host=urllib.parse.urlsplit(url).hostname
 if host not in hosts(source):raise ValueError('UNREGISTERED_SOURCE_HOST')
 if resolve:
  if any(not ipaddress.ip_address(r[4][0]).is_global for r in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)):raise ValueError('NON_PUBLIC_DESTINATION')
 return url
class SourceRedirect(urllib.request.HTTPRedirectHandler):
 def __init__(self,source):self.source=source
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  allowed(newurl,self.source,True);return super().redirect_request(req,fp,code,msg,headers,newurl)
def fetch(url,source):
 url=allowed(url,source,True)
 for attempt in range(2):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'SeedTrade-NewsDiscovery/1.0','Accept':'application/rss+xml,application/atom+xml,text/html,application/json'})
   with urllib.request.build_opener(SourceRedirect(source)).open(req,timeout=12) as response:
    raw=response.read(2_000_001)
    if len(raw)>2_000_000:raise ValueError('SOURCE_SIZE_LIMIT')
    return raw.decode('utf-8',errors='replace'),response.geturl()
  except urllib.error.HTTPError as error:
   if error.code in [401,403,404,429] or attempt:raise
   time.sleep(.3)
  except Exception:
   if attempt:raise
   time.sleep(.3)
def parsed_date(value):
 if not isinstance(value,str):return None
 try:return date.fromisoformat(value[:10]).isoformat()
 except ValueError:
  try:return parsedate_to_datetime(value).date().isoformat()
  except Exception:return None
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.meta={};self.current=None;self.h1=False;self.title='';self.canonical=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='a' and a.get('href'):self.current=[a['href'],'']
  if tag=='h1':self.h1=True
  if tag=='meta':self.meta[a.get('property',a.get('name',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
 def handle_data(self,data):
  if self.current:self.current[1]+=data
  if self.h1:self.title+=data
 def handle_endtag(self,tag):
  if tag=='a' and self.current:self.links.append(tuple(self.current));self.current=None
  if tag=='h1':self.h1=False
def priority(candidate,asof):
 words=(candidate['title']+' '+candidate.get('source_excerpt','')).lower()
 seed=min(100,len(re.findall(r'seed|semenc|saat|sement|variet|certif|crop|cereal|grass|legum|sowing|poot|zaai|agronom|weather|drought',words))*25)
 reliability={'OFFICIAL_DATA':95,'RESEARCH_ADVISORY':85,'INDUSTRY_SIGNAL':65,'COMPANY_SIGNAL':50,'SPECIALIST_MEDIA':60}.get(candidate['source_type'],40)
 age=(date.fromisoformat(asof)-date.fromisoformat(candidate['original_publication_date'])).days if candidate.get('original_publication_date') else 999
 freshness=max(0,100-max(0,age)*3) if age>=0 else 0
 value=min(100,len(re.findall(r'certif|variet|seed|semenc|saat|regulat|trade|market|research|trial|event',words))*25)
 parts={'seed_relevance':seed,'source_reliability':reliability,'freshness':freshness,'commercial_value':value,'european_relevance':100}
 return round(sum(parts[k]*WEIGHTS[k] for k in WEIGHTS),2),parts
def extract(source,now,fetcher=fetch,excluded_urls=None):
 text,url=fetcher(source.get('discovery_url',source['public_url']),source);links=[]
 try:
  root=ET.fromstring(text)
  for node in list(root.findall('.//item'))+list(root.findall('.//{http://www.w3.org/2005/Atom}entry')):
   title=node.findtext('title') or node.findtext('{http://www.w3.org/2005/Atom}title') or ''
   link=node.findtext('link') or next((x.get('href') for x in node.findall('{http://www.w3.org/2005/Atom}link') if x.get('href')),None)
   published=node.findtext('pubDate') or node.findtext('{http://www.w3.org/2005/Atom}published')
   if link:links.append((link,title,parsed_date(published)))
 except ET.ParseError:
  page=Page();page.feed(text)
  for link,title in page.links:
   if len(title.strip())>20 and relevant(title):links.append((urllib.parse.urljoin(url,link),title,None))
 # Rank discoverable article links before the bounded detail budget is spent on
 # navigation. Previously reviewed background/index links are not reselected.
 links.sort(key=lambda x:(bool(x[2]),priority({'title':x[1],'source_excerpt':'','source_type':source['source_type'],'original_publication_date':x[2]},now.date().isoformat())[0]),reverse=True)
 results=[];seen=set();detail_errors=[];requests=0
 for link,title,published in links:
  if len(results)>=3 or requests>=8:break
  try:
   if not relevant(title):continue
   link=allowed(link,source)
   if link in seen or link==canonical_url(url) or link in (excluded_urls or set()):continue
   seen.add(link);requests+=1;detail,final=fetcher(link,source);p=Page();p.feed(detail)
   canonical=allowed(urllib.parse.urljoin(final,p.canonical or final),source)
   title=(p.meta.get('og:title') or p.title or title).strip();published=parsed_date(p.meta.get('article:published_time')) or published
   # JSON-LD dates are source evidence; a retrieval date is never substituted.
   for raw in re.findall(r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>',detail,re.S|re.I):
    try:
     obj=json.loads(raw);nodes=obj if isinstance(obj,list) else obj.get('@graph',[obj]);published=next((parsed_date(x.get('datePublished')) for x in nodes if parsed_date(x.get('datePublished'))),published)
    except Exception:pass
   if not title or published and published>now.date().isoformat():continue
   excerpt=(p.meta.get('description') or p.meta.get('og:description') or '')[:500]
   if not relevant(title,excerpt):continue
   row={'id':hashlib.sha256(canonical.encode()).hexdigest(),'canonical_source_url':canonical,'source_id':source['source_id'],'source_name':source['source_name'],'source_type':source['source_type'],'original_publication_date':published,'retrieved_at':now.isoformat(),'country_region':source['country_region'],'crop_tags':[k for k in ['seed','wheat','barley','maize','clover','grass','legume','oilseed','potato','cover crop'] if k in (title+' '+excerpt).lower()],'topic_tags':source['streams'],'title':title,'source_excerpt':excerpt,'content_fingerprint':hashlib.sha256(re.sub(r'\W+',' ',title+' '+excerpt).strip().lower().encode()).hexdigest(),'evidence_classification':'UNREVIEWED_'+source['source_type'],'source_availability':'RETRIEVED_PUBLIC','commercial_implications':None,'status':'PENDING_EDITORIAL_REVIEW'}
   row['id']=hashlib.sha256((canonical+'|'+row['content_fingerprint']+'|'+str(published)).encode()).hexdigest()
   row['date_basis']='SOURCE_METADATA_REQUIRES_EDITORIAL_CONFIRMATION' if published else 'UNKNOWN_NOT_INFERRED_FROM_RETRIEVAL'
   row['date_review_required']=True
   if 'EU Trade Market' in source['streams']:row['trade_seed_connection']=trade_seed_connection(row)
   row['priority_score'],row['priority_components']=priority(row,now.date().isoformat());results.append(row)
  except Exception as ex:detail_errors.append('HTTP_'+str(ex.code) if isinstance(ex,urllib.error.HTTPError) else type(ex).__name__);continue
 return results,detail_errors
def similar(a,b):
 if a['original_publication_date']!=b['original_publication_date']:return False
 if a['canonical_source_url']==b['canonical_source_url']:return a['content_fingerprint']==b['content_fingerprint']
 if a['content_fingerprint']==b['content_fingerprint']:return True
 x=set(re.findall(r'\w+',a['title'].lower()));y=set(re.findall(r'\w+',b['title'].lower()))
 return len(x&y)/max(1,len(x|y))>=.9
def collect(folder,sources,now=None,fetcher=fetch):
 now=now or datetime.now(timezone.utc);folder=private_path(folder);old=load(folder/'candidates.json',{'items':[]});rows=old['items'];outcomes=[]
 lock=folder/'collection.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.close(fd)
 try:
  def get(source):
   try:
    excluded={x['canonical_source_url'] for x in old['items'] if x.get('status','').startswith(('HELD_','DISMISSED_'))}
    rows,errors=extract(source,now,fetcher,excluded);return source,rows,errors
   except Exception as ex:return source,[],['HTTP_'+str(ex.code) if isinstance(ex,urllib.error.HTTPError) else type(ex).__name__]
  with ThreadPoolExecutor(max_workers=4) as pool:
   for source,new,errors in pool.map(get,[s for s in sources if s['active']]):
    outcomes.append({'source_id':source['source_id'],'checked_at':now.isoformat(),'status':'PARTIAL' if errors and new else 'FAILED' if errors else 'SUCCESS','error_type':errors or None,'candidates_found':len(new)})
    for row in new:
     existing=next((x for x in rows if similar(x,row)),None)
     if existing:
      existing['last_seen_at']=now.isoformat();existing['corroborating_source_urls']=sorted(set(existing.get('corroborating_source_urls',[])+[row['canonical_source_url']]))
     else:rows.append(row)
  rows.sort(key=lambda x:(-x['priority_score'],x['id']));write(folder/'candidates.json',{'classification':'PRIVATE_UNAPPROVED','items':rows})
  status=load(folder/'status.json',{});status.update(last_collection=now.isoformat(),last_collection_status='PARTIAL' if any(x['error_type'] for x in outcomes) else 'PASS',pending_candidates=sum(x['status']=='PENDING_EDITORIAL_REVIEW' for x in rows),sources=outcomes,last_editorial_review=status.get('last_editorial_review'),last_successful_publication=status.get('last_successful_publication'),failures_requiring_attention=[x['source_id'] for x in outcomes if x['error_type']]);write(folder/'status.json',status)
  coverage(folder,now,sources);return status
 finally:lock.unlink(missing_ok=True)
def local_parts(now):
 if now.tzinfo is None:raise ValueError('AWARE_TIMESTAMP_REQUIRED')
 # Node ICU is already used by the site. This avoids a new tzdata dependency on
 # Windows while using the IANA zone/DST rules on both local and Linux runners.
 js="const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(process.argv[1]));console.log(p)"
 return datetime.strptime(subprocess.check_output(['node','-e',js,now.isoformat()],text=True).strip(),'%Y-%m-%d %H:%M')
def due(now,state):
 local=local_parts(now);jobs=[]
 if local.hour>=7 and state.get('last_daily_date')!=local.date().isoformat():jobs.append(('DAILY',local.date().isoformat()))
 for ago in range(8):
  d=local.date()-timedelta(days=ago);cycle=datetime.combine(d,datetime.min.time()).replace(hour=18)
  if d.weekday() in [2,6] and cycle<=local:
   key=cycle.isoformat()
   if state.get('last_editorial_cycle')!=key:jobs.append(('EDITORIAL',key))
   break
 return jobs

def candidate_streams(candidate):
 """Topic evidence, not the source family's broad remit, determines shortlists.
 Classification is a proposal; it is never factual or publication approval.
 """
 explicit=candidate.get('editorial_streams')
 words=(candidate.get('title','')+' '+candidate.get('source_excerpt','')).lower()
 rules={
 'EU Weather':r'weather|drought|frost|precipitation|rainfall|soil moisture|climat|\bheat\b|\bhot\b|\bdry\b|waterlog|sécheresse|niederschlag',
 'EU Agronomist':r'research|trial|disease|seed quality|multiplication|agronom|variet|germination|breeding|essai|maladie|sorten|keim|ricerca',
 'EU Trade Market':r'certif|seed supply|seed demand|price|trade|export|import|logistic|regulat|cost|pootgoed|market|handel|marché',
 'EU Events':r'congress|conference|exhibition|field day|feldtag|salon|interpom|innovation day|demonstration|webinar|convegno|congrès|messe'}
 streams=[s for s in STREAMS if s in explicit] if explicit is not None else [s for s in STREAMS if s in candidate.get('topic_tags',[]) and re.search(rules[s],words)]
 if trade_seed_connection(candidate)=='NO_SUBSTANTIATED_SEED_CONNECTION':streams=[s for s in streams if s!='EU Trade Market']
 return streams

def brief_eligibility(candidate,asof,stream=None):
 verification=candidate.get('editorial_verification',{})
 if (stream=='EU Trade Market' or stream is None and candidate.get('editorial_streams')==['EU Trade Market']) and trade_seed_connection(candidate)!='SUBSTANTIATED_SEED_CONNECTION':return 'SEED_SECTOR_CONNECTION_REQUIRED'
 if not verification.get('source_verified'):return 'SOURCE_VERIFICATION_REQUIRED'
 original=verification.get('source_published_at')
 if original:
  age=(date.fromisoformat(asof)-date.fromisoformat(original)).days
  if 0<=age<7:return 'ELIGIBLE_RECENT_SOURCE'
 event=verification.get('event') or {};checked=verification.get('checked_at')
 if event.get('end_date','')>=asof and event.get('status') not in ['CANCELLED','COMPLETED'] and verification.get('current_relevance_reason') and checked and 0<=(date.fromisoformat(asof)-date.fromisoformat(checked)).days<7:return 'ELIGIBLE_CURRENT_FUTURE_EVENT'
 return 'STALE_OR_UNDATED_SOURCE_REQUIRES_NEW_EVIDENCE'

def assemble_brief(data,publication_date):
 """Compose verified multilingual inputs into the existing article schema.
 This does not translate unknown facts or replace genuine editorial approval.
 """
 base=data['article'];languages=data['languages'];sources=data['sources']
 article={**base,'format':'SHORT_NEWS_BRIEF','brief_standard_version':2,'schema_version':2,'canonical_url':'https://seedtrade.eu/news/'+base['slug'],'id':'brief-'+base['slug']+'-'+publication_date,'publication_date':publication_date,'updated_at':publication_date,'checked_at':publication_date,'valid_until':(date.fromisoformat(publication_date)+timedelta(days=6)).isoformat(),'classification':'PUBLIC_SAFE','publication_status':'DRAFT','publication_eligible':False,'review_status':'PENDING_OWNER_APPROVAL','market_engine_input':False,'revision':1,'corrections':[],'series_id':'brief-'+base['slug'],'previous_item_id':None,'related_item_ids':[],'assessment_outcome':'SOURCE_ATTRIBUTED_NEWS_BRIEF','observation_period':None,'observation_period_basis':'NO_MEASURED_PERIOD_NEWS_BRIEF','region_codes':[],'species_ids':base.get('species_ids',[]),'sources':sources,'source_name':sources[0]['label'],'source_url':sources[0]['url'],'source_published_at':sources[0]['published_at'],'source_tier':1,'provenance_class':'PUBLIC_SOURCE','coverage_limitations':data['scope'],'claims':[{'id':'source-brief','statement':'Source-attributed summary: '+data['references'][sources[0]['url']]['title'],'evidence_class':'CONFIRMED','source_ids':[s['id'] for s in sources],'scope':data['scope'],'limitations':'Source facts and dates only; no unsupported seed-price, demand or EU-wide conclusion.','publish_conclusion':True}]}
 if article['source_published_at']:article['valid_until']=min(article['valid_until'],(date.fromisoformat(article['source_published_at'])+timedelta(days=6)).isoformat())
 if article.get('current_relevance_checked_at'):article['valid_until']=min(article['valid_until'],(date.fromisoformat(article['current_relevance_checked_at'])+timedelta(days=6)).isoformat(),article.get('event',{}).get('end_date','9999-12-31'))
 article['localizations']={}
 for lang in BRIEF_STANDARD['languages']:
  loc=languages[lang];paragraphs=loc['paragraphs'];length=len('\n\n'.join(paragraphs))
  if len(paragraphs) not in [3,4,5] or not 1000<=length<=2000:raise ValueError('SHORT_BRIEF_LENGTH_OR_PARAGRAPHS_REQUIRED_'+lang)
  value={'headline':loc['headline'],'summary':loc['summary'],'why_it_matters':'','content':[{'id':str(i+1),'heading':'','body':body,**({'claim_ids':['source-brief']} if lang=='en' else {})} for i,body in enumerate(paragraphs)]}
  if lang=='en':article.update(value)
  else:article['localizations'][lang]=value
 article['fingerprint']=digest({k:v for k,v in article.items() if k not in ['fingerprint','localizations']})
 return {'article':article,'visual':data['visual'],'references':data['references']}

def prepare_briefs(folder,now=None):
 now=now or datetime.now(timezone.utc);folder=private_path(folder);asof=local_parts(now).date().isoformat();queue=load(folder/'candidates.json',{'items':[]});prepared=[];held=[];used=set();history=publication_geography(asof)
 for stream in STREAMS:
  rows=[c for c in queue['items'] if c.get('status')=='PENDING_EDITORIAL_REVIEW' and stream in candidate_streams(c)]
  rows=rank_candidates(rows,asof,history,folder)
  chosen=None
  for c in rows:
   if c['id'] in used or not brief_eligibility(c,asof,stream).startswith('ELIGIBLE'):continue
   if not c.get('brief_input'):continue
   file=(folder/c['brief_input']).resolve()
   if not file.is_relative_to(folder):raise ValueError('BRIEF_INPUT_MUST_REMAIN_PRIVATE')
   try:
    data=load(file);packet=assemble_brief(data,asof)
    if packet['article']['stream']!=stream:continue
    # A published primary source/topic is not repackaged as fresh news.
    existing=load(ROOT/'src/generated/news.json')['items']
    if any(i.get('source_url')==packet['article']['source_url'] for i in existing):raise ValueError('PRIMARY_TOPIC_ALREADY_PUBLISHED')
    target=folder/'brief-packages'/(packet['article']['slug']+'-'+asof+'.json');write(target,packet)
    check=subprocess.run(['node',str(ROOT/'scripts/validate_news_package.mjs'),'--draft',str(target)],cwd=ROOT,capture_output=True,text=True)
    if check.returncode:raise ValueError('COMPLETE_BRIEF_VALIDATION_REQUIRED')
    c['editorial_package']=str(target.relative_to(folder)).replace('\\','/');chosen={'stream':stream,'candidate_id':c['id'],'package':c['editorial_package'],**json.loads(check.stdout)};used.add(c['id']);prepared.append(chosen);break
   except (ValueError,KeyError,TypeError) as ex:held.append({'stream':stream,'candidate_id':c['id'],'reason':str(ex)})
  if not chosen:held.append({'stream':stream,'reason':'UNFILLED_VERIFIED_RECENT_SOURCE_MULTILINGUAL_INPUT_IMAGE_OR_APPROVAL_PENDING'})
 write(folder/'candidates.json',queue);result={'status':'PRIVATE_DRAFTS_ONLY','standard':BRIEF_STANDARD,'prepared':prepared,'held':held,'approval_granted':False,'published':0};write(folder/'brief-preparation.json',result);return result

def week_slots(now):
 local=local_parts(now);monday=local.date()-timedelta(days=local.weekday());times=[datetime.combine(monday+timedelta(days=d),datetime.min.time()).replace(hour=18).isoformat() for d in [2,6]]
 # 18:00 is unambiguous in this IANA zone, including transition Sundays.
 js="const xs=JSON.parse(process.argv[1]);console.log(JSON.stringify(xs.map(x=>{const d=new Date(x+'Z'),z=new Intl.DateTimeFormat('en',{timeZone:'Europe/Vilnius',timeZoneName:'shortOffset'}).formatToParts(d).find(p=>p.type==='timeZoneName').value;const h=Number(z.replace('GMT',''));return new Date(+d-h*3600000).toISOString()})))"
 utc=json.loads(subprocess.check_output(['node','-e',js,json.dumps(times)],text=True))
 return [{'slot_id':time+'|'+stream,'scheduled_local':time,'scheduled_utc':instant,'timezone':'Europe/Vilnius','stream':stream,'target_articles':1,'status':'SCHEDULED','published':0} for time,instant in zip(times,utc) for stream in STREAMS]

def coverage(folder,now=None,sources=None,cycle_key=None):
 folder=private_path(folder);lock=folder/'coverage.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.close(fd)
 try:return _coverage(folder,now,sources,cycle_key)
 finally:lock.unlink(missing_ok=True)

def _coverage(folder,now=None,sources=None,cycle_key=None):
 """Private rolling slot ledger: eight targets/week; no synthetic fulfilment.
 Future slots are planned, past unexecuted slots are UNFILLED, and a local
 approved build remains distinct from actual authorized publication.
 """
 now=now or datetime.now(timezone.utc);folder=private_path(folder);local=local_parts(now);asof=local.date().isoformat()
 candidates=load(folder/'candidates.json',{'items':[]})['items'];candidate_by_id={c['id']:c for c in candidates};lists={s:[] for s in STREAMS};history=publication_geography(asof);write(folder/'geographic_coverage.json',history)
 for c in candidates:
  if c.get('status')!='PENDING_EDITORIAL_REVIEW':continue
  review=c.get('stage2_content_screening',{});source_date=review.get('verified_source_publication_date') if 'verified_source_publication_date' in review else c.get('original_publication_date')
  if c.get('editorial_verification'):source_date=c['editorial_verification'].get('source_published_at')
  score,parts=priority({**c,'original_publication_date':source_date},asof)
  for stream in candidate_streams(c):lists[stream].append({'candidate_id':c['id'],'title':c['title'],'source_url':c['canonical_source_url'],'source_publication_date':source_date,'discovered_date_unconfirmed':c.get('original_publication_date'),'date_confirmation_required':not bool(review or c.get('editorial_verification')),'selection_eligibility':brief_eligibility(c,asof,stream),'priority_score':score,'priority_components':parts,'geography':candidate_geography(c,folder),'geographic_tiebreak':geographic_tiebreak(c,history,folder),'package':c.get('editorial_package'),'approval':'NOT_INFERRED'})
 for rows in lists.values():rows.sort(key=lambda r:(not r['selection_eligibility'].startswith('ELIGIBLE'),-r['priority_score'],*r['geographic_tiebreak'],r['candidate_id']))
 write(folder/'shortlists.json',{'as_of':asof,'classification':'PRIVATE_UNAPPROVED','ranking':'Independent per-stream ranking with unchanged 30/25/20/15/10 weights; date and category require editorial confirmation','streams':lists})
 ledger=load(folder/'editorial_slots.json',{'slots':[]});slots={s['slot_id']:s for s in ledger['slots']};planned=week_slots(now)
 for slot in planned:slots.setdefault(slot['slot_id'],slot)
 if cycle_key and not any(s['scheduled_local']==cycle_key for s in slots.values()):
  for slot in week_slots(datetime.fromisoformat(cycle_key).replace(tzinfo=timezone.utc)):
   if slot['scheduled_local']==cycle_key:slots.setdefault(slot['slot_id'],slot)
 # A late due-check never silently loses older planned slots or backfills a
 # missed publication with an unapproved story.
 for slot in slots.values():
  if slot['status']=='SCHEDULED' and slot['scheduled_local']<local.isoformat() and slot['scheduled_local']!=cycle_key:slot.update(status='UNFILLED',reason='CYCLE_MISSED_NO_VERIFIED_PUBLICATION',archive_fallback=True)
 used={}
 for slot in slots.values():
  if slot['slot_id'] not in {s['slot_id'] for s in planned} and slot['scheduled_local']!=cycle_key:continue
  if slot['status']=='UNFILLED' and slot['scheduled_local']<local.isoformat() and slot['scheduled_local']!=cycle_key:continue
  rows=lists[slot['stream']];slot['shortlist_count']=len(rows)
  slot['eligible_topics_for_slot']=sum(brief_eligibility(candidate_by_id[r['candidate_id']],slot['scheduled_local'][:10],slot['stream']).startswith('ELIGIBLE') for r in rows)
  slot['proposed_topic_candidate_id']=rows[0]['candidate_id'] if rows else None
  # A completed package's actual stream wins over broad candidate tags.
  prepared=[]
  for row in rows:
   if not row['package'] or not brief_eligibility(candidate_by_id[row['candidate_id']],slot['scheduled_local'][:10],slot['stream']).startswith('ELIGIBLE'):continue
   file=(folder/row['package']).resolve()
   if not file.is_relative_to(folder):continue
   packet=load(file,{})
   if packet.get('article',{}).get('stream')==slot['stream']:prepared.append(row)
  cycle_used=used.setdefault(slot['scheduled_local'],set())
  choice=next((r for r in prepared if r['candidate_id'] not in cycle_used),None)
  slot['proposed_candidate_id']=choice['candidate_id'] if choice else None
  slot['prepared_package']=choice['package'] if choice else None
  if choice:
   article=load((folder/choice['package']).resolve())['article']
   slot['publication_date_binding_required']=article.get('publication_date')!=slot['scheduled_local'][:10]
   slot['event_verification_required']=slot['stream']=='EU Events' and (not article.get('event') or article['event'].get('end_date','')<slot['scheduled_local'][:10])
  slot['content_state']='PREPARED_DRAFT_REQUIRES_GENUINE_APPROVAL' if choice else 'CANDIDATES_REQUIRE_COMPLETE_VERIFIED_PACKAGE' if rows else 'NO_SUITABLE_CANDIDATE'
  slot['readiness']='UNFILLED';slot['readiness_reason']='GENUINE_APPROVAL_AND_PUBLICATION_REQUIRED' if choice else 'COMPLETE_VERIFIED_ARTICLE_PACKAGE_REQUIRED' if rows else 'SUITABLE_VERIFIED_TOPIC_REQUIRED'
  if rows and not slot['eligible_topics_for_slot']:slot['readiness_reason']='SOURCE_VERIFICATION_OR_FRESHNESS_FOR_SLOT_REQUIRED'
  # One topic cannot satisfy two categories within a cycle. Neither a shortlist
  # entry nor an approved local build constitutes a published article.
  if choice:cycle_used.add(choice['candidate_id'])
  if slot['scheduled_local']==cycle_key:
   slot.update(status='UNFILLED',reason='EDITORIAL_APPROVAL_AND_PUBLICATION_NOT_VERIFIED' if choice else 'NO_COMPLETE_VERIFIED_FIVE_LANGUAGE_IMAGE_PACKAGE' if rows else 'NO_SUITABLE_VERIFIED_TOPIC',archive_fallback=True,checked_at=now.isoformat())
 # The same still-pending draft may remain a proposal for later cycles; it is
 # not counted as published or consumed until real publication evidence exists.
 summary={stream:{'candidate_count':len(lists[stream]),'eligible_candidate_count':sum(r['selection_eligibility'].startswith('ELIGIBLE') for r in lists[stream]),'prepared_packages':sum(bool(s.get('prepared_package')) for s in slots.values() if s['scheduled_local']==planned[0]['scheduled_local'] and s['stream']==stream),'active_discovery_sources':sum(s.get('active',False) and stream in s.get('streams',[]) for s in sources or []),'publication_approval':'NOT_INFERRED_FROM_SHORTLIST_OR_DRAFT'} for stream in STREAMS}
 active={s['slot_id'] for s in planned};result={'status':'TARGETS_TRACKED_NOT_PUBLICATION_APPROVAL','week_start':(local.date()-timedelta(days=local.weekday())).isoformat(),'weekly_target':8,'target_per_cycle':4,'slots':sorted(slots.values(),key=lambda x:x['slot_id']),'current_week_slot_ids':sorted(active),'category_availability':summary,'unfilled_slots':sum(s['status']=='UNFILLED' for s in slots.values()),'production_publication':0}
 write(folder/'editorial_slots.json',result)
 status=load(folder/'status.json',{});status['editorial_coverage']={k:result[k] for k in ['weekly_target','target_per_cycle','category_availability','unfilled_slots']};write(folder/'status.json',status)
 return result
def cycle(folder,sources,now=None,fetcher=fetch):
 folder=private_path(folder);lock=folder/'cycle.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.close(fd)
 try:return run_cycle(folder,sources,now,fetcher)
 finally:lock.unlink(missing_ok=True)
def run_cycle(folder,sources,now=None,fetcher=fetch):
 now=now or datetime.now(timezone.utc);folder=private_path(folder);ledger=load(folder/'schedule.json',{});actions=[]
 for kind,key in due(now,ledger):
  if kind=='DAILY':
   collect(folder,sources,now,fetcher);ledger['last_daily_date']=key
  else:
   brief_preparation=prepare_briefs(folder,now)
   candidates=load(folder/'candidates.json',{'items':[]})['items'];drafts=[]
   for c in candidates:
    if c['status']=='PENDING_EDITORIAL_REVIEW':
     draft={'candidate_id':c['id'],'status':'PENDING_EDITORIAL_SYNTHESIS','source_url':c['canonical_source_url'],'source_title':c['title'],'source_publication_date':c['original_publication_date'],'commercial_implications':None,'claim_review':'REQUIRED','localizations_reviewed':[],'image_rights_reviewed':False,'publication_approval':None,'priority_score':c['priority_score']};write(folder/'drafts'/(c['id']+'.json'),draft);drafts.append(c['id'])
   handoffs=[];held=[];prepared_streams=set()
   for index in (folder/'approved').glob('*.json'):
    try:
     refs=load(index);paths=[Path(refs[k]).resolve() for k in ['package','receipt','authorization']]
     if any(not path.is_relative_to(folder) for path in paths):raise ValueError('REVIEW_INPUTS_MUST_REMAIN_PRIVATE')
     article=load(paths[0])['article'];stream=article['stream']
     if key[:10]!=local_parts(now).date().isoformat() or article['publication_date']!=key[:10]:raise ValueError('SLOT_PUBLICATION_DATE_REBINDING_REQUIRED')
     if stream in prepared_streams:raise ValueError('ONE_ARTICLE_PER_STREAM_PER_CYCLE')
     if stream=='EU Events' and (not article.get('event') or article['event'].get('end_date','')<key[:10] or article['event'].get('status') in ['CANCELLED','COMPLETED']):raise ValueError('VERIFIED_UPCOMING_EVENT_REQUIRED')
     handoffs.append(prepare_publication(*paths,folder));prepared_streams.add(stream)
    except Exception as ex:held.append({'index':index.name,'reason':str(ex) if isinstance(ex,ValueError) else type(ex).__name__})
   stream_coverage=coverage(folder,now,sources,cycle_key=key)
   write(folder/'cycles'/(key.replace(':','-')+'.json'),{'scheduled_local':key,'timezone':'Europe/Vilnius','executed_at':now.isoformat(),'streams_review_queue':STREAMS,'stream_slots':[s for s in stream_coverage['slots'] if s['scheduled_local']==key],'brief_preparation':brief_preparation,'drafts_prepared':drafts,'editorial_review':'PENDING_HUMAN_REVIEW' if drafts else 'NO_NEW_CANDIDATES','approved_local_handoffs':handoffs,'held_packages':held,'published':0,'render_refresh_due':True,'publication_authorization_required':True})
   ledger['last_editorial_cycle']=key
  actions.append({'kind':kind,'key':key})
 write(folder/'schedule.json',ledger);return {'status':'PASS_LOCAL_CYCLE','actions':actions,'published':0,'approvalGranted':False}
def prepare_publication(package,receipt,authorization,folder):
 folder=private_path(folder);result=subprocess.run(['node',str(ROOT/'scripts/validate_news_package.mjs'),str(Path(package).resolve()),str(Path(receipt).resolve()),str(Path(authorization).resolve())],cwd=ROOT,capture_output=True,text=True)
 if result.returncode:raise ValueError('PUBLICATION_GATES_NOT_SATISFIED')
 verified=json.loads(result.stdout);packet=verified.pop('approvedPackage');target=folder/'publication-ready'/verified['packageSha256'];target.mkdir(parents=True,exist_ok=True)
 if load(target/'handoff.json',{}).get('status')=='PASS_APPROVED_LOCAL_BUILD_NOT_DEPLOYED':return {'status':'ALREADY_BUILT_NOT_DEPLOYED','path':str(target),'published':0}
 # Build only in a private isolated copy. Neither the development publication
 # snapshot nor production is modified, even after a real approval is supplied.
 write(target/'approved-package.json',packet)
 checkout=target/'source';shutil.copytree(ROOT,checkout,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git','node_modules','dist','.legal-ssr','.cache','tmp','__pycache__'))
 npm='npm.cmd' if os.name=='nt' else 'npm'
 install=subprocess.run([npm,'ci','--ignore-scripts','--offline'],cwd=checkout,capture_output=True,text=True,timeout=300)
 if install.returncode:raise ValueError('APPROVED_BUILD_DEPENDENCIES_UNAVAILABLE_NO_PUBLICATION')
 news=load(checkout/'src/generated/news.json');news['items'].append(packet['article']);news['as_of']=max(news['as_of'],packet['article']['publication_date']);write(checkout/'src/generated/news.json',news)
 visuals=load(checkout/'src/data/news_visuals.json');visuals[packet['article']['slug']]=packet['visual'];write(checkout/'src/data/news_visuals.json',visuals)
 # Reserve the real image only after genuine content-bound approval passed.
 # The build gate recomputes original identity and retains all prior uses.
 subprocess.run(['node','--input-type=module','-e',"import {registerApprovedPhotoUse} from './scripts/news_image_identity.mjs';import fs from 'node:fs';const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));registerApprovedPhotoUse(p.article,p.visual)",str(target/'approved-package.json')],cwd=checkout,check=True,capture_output=True)
 # This register is updated only AFTER genuine exact-package approval including
 # image-rights review and separate publication authorization have passed.
 rights=load(checkout/'docs/news-photography-v1/LICENSE_EVIDENCE.json',{})
 keys=['creator','title','original_source_url','original_file_url','licence','licence_url','license_verified_at','original_sha256','license_evidence_sha256','commercial_use_verified','redistribution_verified']
 rights[packet['article']['slug']]={key:packet['visual'][key] for key in keys};write(checkout/'docs/news-photography-v1/LICENSE_EVIDENCE.json',rights)
 refs=load(checkout/'src/data/news_presentation.json');refs['sources'].update(packet['references']);write(checkout/'src/data/news_presentation.json',refs)
 projection_hash=subprocess.check_output(['node','--input-type=module','-e',"import {packageHash} from './scripts/validate_news_package.mjs';import fs from 'node:fs';console.log(packageHash(JSON.parse(fs.readFileSync(process.argv[1],'utf8'))))",str(target/'approved-package.json')],cwd=ROOT,text=True).strip()
 reviews=load(checkout/'src/data/news_publication_receipts.json',{});reviews[packet['article']['slug']]={'status':'APPROVED_AFTER_PRIVATE_VALIDATION','package_sha256':projection_hash,'source_draft_sha256':verified['packageSha256'],'editorial_evidence_reference':load(Path(receipt))['evidence_reference'],'publication_authorization_reference':load(Path(authorization))['evidence_reference']};write(checkout/'src/data/news_publication_receipts.json',reviews)
 manifest=load(checkout/'src/generated/public_data_manifest.json');entry=manifest['datasets']['daily_news'];entry.update(as_of=news['as_of'],public_records=len(news['items']),stream_records=sum(bool(i.get('stream')) for i in news['items']),sha256=hashlib.sha256((checkout/'src/generated/news.json').read_bytes()).hexdigest());write(checkout/'src/generated/public_data_manifest.json',manifest)
 # Bind only the genuinely approved content additions to protected visual pins.
 # Existing immutable history is checked by the separate publication boundary.
 inventory_file=checkout/'docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json';visual_inventory=load(inventory_file)
 for row in visual_inventory['protected_mapping_files']:
  if row['path'] in ['src/generated/news.json','src/data/news_visuals.json','docs/news-photography-v1/LICENSE_EVIDENCE.json']:row['sha256']=hashlib.sha256((checkout/row['path']).read_bytes()).hexdigest()
 write(inventory_file,visual_inventory)
 validator=checkout/'scripts/validate_visual_assets.mjs';validator.write_text(re.sub(r"INVENTORY_SHA256='[a-f0-9]{64}'","INVENTORY_SHA256='"+hashlib.sha256(inventory_file.read_bytes()).hexdigest()+"'",validator.read_text(encoding='utf-8')),encoding='utf-8')
 npm='npm.cmd' if os.name=='nt' else 'npm'
 for cmd in [[npm,'run','build']]:
  run=subprocess.run(cmd,cwd=checkout,capture_output=True,text=True,timeout=300)
  with (target/'build.log').open('a',encoding='utf-8') as log:log.write(run.stdout+'\n'+run.stderr)
  if run.returncode:raise ValueError('APPROVED_BUILD_FAILED_NO_PUBLICATION')
 inventory={p.relative_to(checkout/'dist').as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (checkout/'dist').rglob('*') if p.is_file()}
 write(target/'handoff.json',{**verified,'status':'PASS_APPROVED_LOCAL_BUILD_NOT_DEPLOYED','runtime_inventory':inventory,'deployed':False,'explicitAuthorizationReference':load(Path(authorization))['evidence_reference']})
 status=load(folder/'status.json',{});status['last_editorial_review']=load(Path(receipt))['approved_at'];status['publication_handoff']=str(target);write(folder/'status.json',status);return {'status':'APPROVED_LOCAL_HANDOFF','path':str(target),'published':0}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['collect','tick','prepare-briefs','coverage','status','prepare-publication']);p.add_argument('--private-dir',type=Path,default=WORKSPACE/'private/stage2-news-v1');p.add_argument('--sources',default='');p.add_argument('--package',type=Path);p.add_argument('--receipt',type=Path);p.add_argument('--authorization',type=Path);p.add_argument('--detail',action='store_true');a=p.parse_args()
 registry=load(ROOT/'src/data/news_sources.json')['sources'];registry=[s for s in registry if not a.sources or s['source_id'] in a.sources.split(',')]
 if a.action=='collect':out=collect(a.private_dir,registry)
 elif a.action=='tick':out=cycle(a.private_dir,registry)
 elif a.action=='coverage':out=coverage(a.private_dir,sources=registry)
 elif a.action=='prepare-briefs':out=prepare_briefs(a.private_dir)
 elif a.action=='status':
  state=load(private_path(a.private_dir)/'status.json',{'status':'NOT_RUN','last_collection':None,'last_editorial_review':None,'last_successful_publication':None})
  out=state if a.detail else {k:state.get(k) for k in ['last_collection','last_collection_status','last_editorial_review','last_successful_publication','pending_candidates','failures_requiring_attention','editorial_coverage']}
  out['existing_public_articles']=len(load(ROOT/'src/generated/news.json')['items']);out['production_scheduler']='NOT_ACTIVATED_BY_THIS_LOCAL_IMPLEMENTATION'
 else:
  if not all([a.package,a.receipt,a.authorization]):p.error('Exact package, real review receipt and explicit authorization are required')
  out=prepare_publication(a.package,a.receipt,a.authorization,a.private_dir)
 print(json.dumps(out,indent=2))
