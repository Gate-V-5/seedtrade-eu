import legacyMetadata from './data/news_legacy_metadata.json' with {type:'json'}
// Shared by React, prerender and validation. No fetching or automatic publishing.
export const NEWS_STREAMS = ['EU Weather', 'EU Agronomist', 'EU Trade Market', 'EU Events']
// Explicitly grandfather only the four canonical pre-stream archive records.
const HISTORICAL_NEWS_SLUGS = new Set(['interpom-2026-exhibitor-profile', 'europe-potato-crop-drought-estimate-2026', 'northern-ireland-seed-potato-rules-update-2026', 'europe-summer-crop-heat-drought-2026'])
export const EVIDENCE_CLASSES = ['CONFIRMED', 'SUPPORTED', 'INDICATIVE', 'SCENARIO', 'INSUFFICIENT']
export const SOURCE_TYPES = ['OFFICIAL_DATA', 'RESEARCH_ADVISORY', 'INDUSTRY_SIGNAL', 'COMPANY_SIGNAL', 'SPECIALIST_MEDIA']
export const EVENT_STATUSES = ['ANNOUNCED', 'CONFIRMED', 'CHANGED', 'CANCELLED', 'COMPLETED']
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const text = value => typeof value === 'string' && Boolean(value.trim())
const publicUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ![...url.searchParams.keys()].some(key => /^(?:token|access_token|api_key|password)$/i.test(key)) } catch { return false }
}
const host = value => new URL(value).hostname.replace(/^www\./, '')
const registeredUrl = (url, family) => publicUrl(url) && family && [host(family.public_url), ...(family.approved_hosts || [])].includes(host(url))
const hasPrivatePayload = value => Array.isArray(value) ? value.some(hasPrivatePayload) : value && typeof value === 'object' ?
  Object.entries(value).some(([key, item]) => /^(?:password|smtp_pass|token|credentials|private_documents|personal_contact)$/i.test(key) ||
    (['classification', 'publication_status'].includes(key) && item === 'PRIVATE_DATA') || hasPrivatePayload(item)) : false

export function seedSectorConnectionErrors(item){
  if(item?.stream!=='EU Trade Market')return []
  const seedWords=/\bseed(?:s|[- ](?:production|processing|cleaning|treatment|storage|certification|logistics))?\b|\bsemences?\b|\bsaatgut\b|\bsement[ei]\b|\bpoot(?:goed|aardappel\w*)\b|\bzaaiza\w*\b/i
  const positiveEvidence=value=>String(value||'').split(/[.;!?]/).some(clause=>seedWords.test(clause)&&!/(?:\bno\b|\bnot\b|\bunrelated\b|\bsans\b|\bpas\b|\bnicht\b|\bkein\w*\b).{0,40}(?:\bseeds?\b|semence|saatgut|sement)/i.test(clause))
  const sources=item.sources||[]
  // Existing verified seed-specific source scope/locator is sufficient for a
  // direct seed story. Article prose saying "useful for seed businesses" is not.
  if(sources.some(s=>s.public_access==='VERIFIED_PUBLIC'&&positiveEvidence([s.scope,s.evidence_locator].filter(Boolean).join('; '))))return []
  const link=item.seed_sector_connection
  if(link&&['DIRECT_SEED_ACTIVITY','WIDER_AGRICULTURE_LINK'].includes(link.kind)&&text(link.explanation)&&text(link.evidence_locator)&&positiveEvidence(link.source_evidence)&&Array.isArray(link.source_ids)&&link.source_ids.length&&link.source_ids.every(id=>sources.some(s=>s.id===id&&s.public_access==='VERIFIED_PUBLIC')))return []
  return ['SEED_SECTOR_CONNECTION_REQUIRED: verified seed-specific source evidence or an explained, source-backed seed-sector link is mandatory']
}

function checkSourceRegistry(registry) {
  const errors = [], ids = new Set()
  for (const source of registry?.sources || []) {
    if (!text(source.source_id) || ids.has(source.source_id)) errors.push('Duplicate/missing source identity')
    ids.add(source.source_id)
    if (!text(source.source_name) || !text(source.country_region) || !SOURCE_TYPES.includes(source.source_type) ||
      !Array.isArray(source.streams) || !source.streams.length || source.streams.some(stream => !NEWS_STREAMS.includes(stream)) ||
      !publicUrl(source.public_url) || (source.approved_hosts && (!Array.isArray(source.approved_hosts) || source.approved_hosts.some(value => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)))) || source.access_type !== 'PUBLIC_WEB' || typeof source.active !== 'boolean' ||
      !text(source.expected_update_frequency) || !text(source.reliability_notes) || !text(source.limitations)) errors.push(`Invalid source: ${source.source_id}`)
    if (source.last_checked != null && !validDate(source.last_checked)) errors.push(`Invalid source check date: ${source.source_id}`)
  }
  if (!ids.size || hasPrivatePayload(registry)) errors.push('Empty/unsafe registry')
  return errors
}

export function validateSourceRegistry(registry) {
  try { return checkSourceRegistry(registry) } catch { return ['Malformed source registry'] }
}

function checkNewsRecord(item, registry) {
  const errors = []
  const brief=item?.format==='SHORT_NEWS_BRIEF'
  if (!item || item.classification !== 'PUBLIC_SAFE' || item.publication_status !== 'PUBLIC_SAFE' ||
    item.publication_eligible === false || item.market_engine_input !== false || hasPrivatePayload(item)) return ['Not public publication-eligible editorial content']
  if (!text(item.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) ||
    item.canonical_url !== `https://seedtrade.eu/news/${item.slug}` || !validDate(item.publication_date) ||
    !(brief?['headline','summary']:['headline', 'summary', 'why_it_matters']).every(field => text(item[field])) || !publicUrl(item.source_url) || !text(item.source_name)) errors.push('Invalid canonical fields')
  // The four existing, independently verified historical records keep their model.
  if (!item.stream) return HISTORICAL_NEWS_SLUGS.has(item.slug) ? errors : [...errors, 'New record requires a reviewed editorial stream']
  if (!NEWS_STREAMS.includes(item.stream) || item.schema_version !== 2 || item.publication_eligible !== true ||
    item.review_status !== 'APPROVED' || !text(item.id) || !text(item.category) ||
    !validDate(item.updated_at) || !validDate(item.checked_at) || !validDate(item.valid_until) ||
    item.updated_at < item.publication_date || item.checked_at < item.publication_date || item.valid_until < item.publication_date ||
    !Number.isInteger(item.revision) || item.revision < 1 || !/^[a-f0-9]{64}$/.test(item.fingerprint || '') ||
    !Array.isArray(item.corrections) || !Array.isArray(item.related_item_ids) || !text(item.series_id) ||
    !(item.previous_item_id === null || text(item.previous_item_id)) || !text(item.assessment_outcome)) errors.push('Invalid editorial identity/review/continuity')
  const measuredPeriod=validDate(item.observation_period?.start)&&validDate(item.observation_period?.end)&&item.observation_period.start<=item.observation_period.end
  const explicitNoMeasuredPeriod=item.observation_period===null&&((item.editorial_type==='EDITORIAL_ANALYSIS'&&['SOURCE_OBSERVATION_WINDOW_NOT_VERIFIED','NO_MEASURED_PERIOD_PROCUREMENT_GUIDANCE'].includes(item.observation_period_basis))||(brief&&item.observation_period_basis==='NO_MEASURED_PERIOD_NEWS_BRIEF'))
  if (![item.countries, item.region_codes, item.species_ids].every(Array.isArray) ||
    item.countries.some(code => !/^[A-Z]{2}$/.test(code)) || !text(item.coverage_limitations) ||
    !(measuredPeriod||explicitNoMeasuredPeriod) ||
    !(item.source_published_at === null || validDate(item.source_published_at))) errors.push('Invalid scope/time metadata')
  const sections = item.content || [], sectionIds = new Set()
  if (!Array.isArray(sections) || !sections.length) errors.push('Missing article sections')
  else for (const section of sections) {
    if (!text(section.id) || sectionIds.has(section.id) || (!brief&&!text(section.heading)) || !text(section.body)) errors.push('Invalid/duplicate article section')
    sectionIds.add(section.id)
  }
  if(brief){
    if(![3,4,5].includes(sections.length))errors.push('News brief requires three to five paragraphs')
    for(const lang of ['en','de','fr','es','it']){
      const locale=lang==='en'?item:item.localizations?.[lang],paragraphs=locale?.content||[],length=paragraphs.map(p=>p.body||'').join('\n\n').length
      if(paragraphs.length!==sections.length||paragraphs.some(p=>!text(p.body))||length<1000||length>2000)errors.push('Short brief main text must be 1000–2000 characters: '+lang)
    }
    const age=item.source_published_at?(Date.parse(item.publication_date)-Date.parse(item.source_published_at))/86400000:null
    const eventException=item.stream==='EU Events'&&item.event?.end_date>=item.publication_date&&text(item.current_relevance_reason)&&validDate(item.current_relevance_checked_at)&&item.current_relevance_checked_at<=item.publication_date&&(Date.parse(item.publication_date)-Date.parse(item.current_relevance_checked_at))/86400000<7
    if(!(age!==null&&age>=0&&age<7)&&!eventException)errors.push('Recent source or verified current future-event relevance required')
  }
  const sourceIds = new Set(), claimIds = new Set()
  if (!Array.isArray(item.sources) || !item.sources.length) errors.push('Missing evidence sources')
  else for (const source of item.sources) {
    const family = registry?.sources?.find(row => row.source_id === source.source_id)
    if (!text(source.id) || sourceIds.has(source.id) || !family || !family.streams.includes(item.stream) ||
      source.source_type !== family.source_type || !text(source.label) || !registeredUrl(source.url, family) ||
      source.public_access !== 'VERIFIED_PUBLIC' || !validDate(source.checked_at) || source.checked_at > item.checked_at ||
      !(source.published_at === null || validDate(source.published_at)) || (source.published_at != null && source.published_at > source.checked_at) ||
      !text(source.date_basis) || !text(source.scope) || !text(source.evidence_locator) || !text(source.origin_id)) errors.push('Unverified/invalid evidence source')
    sourceIds.add(source.id)
  }
  if (!Array.isArray(item.claims) || !item.claims.length) errors.push('Missing claim evidence')
  else for (const claim of item.claims) {
    if (!text(claim.id) || claimIds.has(claim.id) || !text(claim.statement) ||
      !EVIDENCE_CLASSES.includes(claim.evidence_class) || !Array.isArray(claim.source_ids) ||
      !claim.source_ids.length || claim.source_ids.some(id => !sourceIds.has(id)) ||
      !text(claim.scope) || !text(claim.limitations)) errors.push('Invalid claim evidence')
    if (claim.evidence_class === 'INSUFFICIENT' && claim.publish_conclusion !== false) errors.push('Insufficient claim cannot publish a conclusion')
    if (claim.evidence_class === 'CONFIRMED' && claim.source_ids.every(id =>
      ['COMPANY_SIGNAL', 'SPECIALIST_MEDIA'].includes(item.sources?.find(source => source.id === id)?.source_type))) errors.push('Signal cannot establish a confirmed market fact')
    if (claim.evidence_class === 'SUPPORTED') {
      const refs = item.sources?.filter(source => claim.source_ids.includes(source.id)) || []
      if (!refs.some(source => ['OFFICIAL_DATA', 'RESEARCH_ADVISORY'].includes(source.source_type)) &&
        new Set(refs.map(source => source.origin_id)).size < 2) errors.push('Repeated original is not independent corroboration')
    }
    claimIds.add(claim.id)
  }
  for (const section of sections) {
    if (!Array.isArray(section.claim_ids) || !section.claim_ids.length || section.claim_ids.some(id => !claimIds.has(id))) errors.push('Section lacks valid claim references')
  }
  if (item.stream === 'EU Events') {
    const event = item.event
    if (!event || !text(event.name) || !validDate(event.start_date) || !validDate(event.end_date) ||
      event.end_date < event.start_date || !/^[A-Z]{2}$/.test(event.country || '') ||
      !(text(event.location) || event.online === true) || !text(event.organizer) || !text(event.type) ||
      !text(event.sector_relevance) || !publicUrl(event.source_url) || !item.sources.some(source => source.url === event.source_url) || !validDate(event.checked_at) || event.checked_at > item.checked_at ||
      !EVENT_STATUSES.includes(event.status) || !text(event.timezone)) errors.push('Invalid event')
  }
  errors.push(...seedSectorConnectionErrors(item))
  return errors
}

// Malformed future submissions fail closed, rather than crashing public pages.
export function validateNewsRecord(item, registry) {
  try { return checkNewsRecord(item, registry) } catch { return ['Malformed editorial record'] }
}

export const publicNewsItems = (items, registry) => (Array.isArray(items) ? items : []).filter(item => validateNewsRecord(item, registry).length === 0)
export function eventStatus(item, asOf) {
  const event = newsEvent(item)
  if (!event) return null
  if (['CANCELLED','COMPLETED'].includes(event.status)) return event.status
  return event.end_date < asOf ? 'COMPLETED' : event.start_date<=asOf ? 'ONGOING' : event.status
}
export const eventStatusLabel = status => ({COMPLETED:'Completed event',ONGOING:'Ongoing event',CONFIRMED:'Upcoming event',ANNOUNCED:'Announced event',CHANGED:'Updated event',CANCELLED:'Cancelled event'})[status] || 'Announced event'
export const newsStream = item => item?.stream || legacyMetadata[item?.slug]?.stream || ''
export const newsEvent = item => item?.event || legacyMetadata[item?.slug]?.event || null
export const newsDate = (now=new Date()) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
export function isCurrentNews(item,asOf) {
  if(!validDate(asOf)||!validDate(item?.publication_date)||item.publication_date>asOf)return false
  const age=(Date.parse(asOf)-Date.parse(item.publication_date))/86400000
  return age>=0&&age<7&&(!item.valid_until||item.valid_until>=asOf)&&(!newsEvent(item)||!['CANCELLED','COMPLETED'].includes(eventStatus(item,asOf)))
}
export function selectStreamHighlights(items,asOf,registry) {
  const eligible=publicNewsItems(items,registry).filter(item=>isCurrentNews(item,asOf)),seen=new Set(),result=[]
  for(const stream of NEWS_STREAMS){const item=eligible.filter(i=>newsStream(i)===stream).sort((a,b)=>b.publication_date.localeCompare(a.publication_date)||a.slug.localeCompare(b.slug)).find(i=>!seen.has(i.slug));if(item){seen.add(item.slug);result.push({stream,item})}}
  return result
}
export const NEWS_FILTER_DEFAULTS={stream:'ALL',q:'',crop:'ALL',country:'ALL',period:'ALL',from:'',to:'',page:1}
export function parseNewsFilters(search='') {
  const q=new URLSearchParams(search),out={...NEWS_FILTER_DEFAULTS}
  for(const k of ['stream','q','crop','country','period','from','to'])if(q.has(k))out[k]=q.get(k).slice(0,200)
  if(!NEWS_STREAMS.includes(out.stream))out.stream='ALL'
  if(!['ALL','RECENT','UPCOMING'].includes(out.period))out.period='ALL'
  for(const k of ['from','to'])if(!validDate(out[k]))out[k]=''
  out.page=Math.min(10000,Math.max(1,Number.parseInt(q.get('page'),10)||1));return out
}
export function newsFilterUrl(path,search,filters) {
  const params=new URLSearchParams(search)
  for(const key of Object.keys(NEWS_FILTER_DEFAULTS)){if(String(filters[key])===String(NEWS_FILTER_DEFAULTS[key])||!filters[key])params.delete(key);else params.set(key,String(filters[key]))}
  return path+(params.size?'?'+params.toString():'')
}
export function filterNewsArchive(items, filters, asOf, registry) {
  const start = new Date(`${asOf}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 19)
  const recentStart = start.toISOString().slice(0, 10)
  return publicNewsItems(items, registry).filter(item => item.publication_date <= asOf &&
    (!filters.stream || filters.stream === 'ALL' || newsStream(item) === filters.stream) &&
    (!filters.country || filters.country === 'ALL' || (item.countries || item.geography?.countries || []).includes(filters.country)) &&
    (!filters.crop || filters.crop === 'ALL' || (item.links?.crops || []).includes(filters.crop)) &&
    (!filters.q || [item.headline,item.summary,item.variety,...(item.tags||[]),...(item.links?.crops||[]),...(item.countries||item.geography?.countries||[]),...(item.countries||item.geography?.countries||[]).flatMap(c=>/^[A-Z]{2}$/.test(c)?['en','de','fr','es','it'].map(lang=>new Intl.DisplayNames([lang],{type:'region'}).of(c)):[]),...Object.values(item.localizations||{}).flatMap(l=>[l.headline,l.summary]),item.geography?.region,newsStream(item)].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(filters.q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())) &&
    (!filters.from || item.publication_date >= filters.from) && (!filters.to || item.publication_date <= filters.to) &&
    (filters.period !== 'RECENT' || isCurrentNews(item,asOf)) &&
    (filters.period !== 'UPCOMING' || (newsEvent(item) && !['CANCELLED', 'COMPLETED'].includes(eventStatus(item, asOf)))))
    .sort((a, b) => b.publication_date.localeCompare(a.publication_date) || a.slug.localeCompare(b.slug))
}
