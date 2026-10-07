import {useT,useLanguage} from './i18n/index.jsx'
import intelligence from './generated/snapshot_intelligence_public.json'
import {evidenceDate} from './SnapshotIntelligence.jsx'
import {latestTradeUnitValue} from './commercialEvidence.mjs'
import './marketDetailBriefing.css'

// Approved twelve-market scope. Reuses the canonical public projection, never a second dataset.
export const detailPilotIds=Object.freeze(['barley','red-clover','flax','sunflower','rye','italian-ryegrass','perennial-ryegrass','meadow-fescue','field-pea','alfalfa','soybean','fodder-beet'])
const records=new Map(intelligence.records.filter(r=>r.classification==='PUBLIC_SAFE').map(r=>[r.entity_id,r]))
export const detailPilotRecord=id=>detailPilotIds.includes(id)?records.get(id):undefined
const copy={
 'Current situation':['Aktuelle Marktlage','Situation actuelle','Situación actual','Situazione attuale'],
 'Demand':['Nachfrage','Demande','Demanda','Domanda'],
 'Market briefing':['Marktüberblick','Synthèse du marché','Resumen del mercado','Quadro di mercato'],
 'Market drivers':['Markttreiber','Facteurs de marché','Factores del mercado','Fattori di mercato'],
 'Trade & value':['Handel und Wert','Échanges et valeur','Comercio y valor','Scambi e valore'],
 'Supply evidence':['Angebotsnachweise','Données sur l’offre','Evidencia de oferta','Evidenze sull’offerta'],
 'Evidence & sources':['Nachweise und Quellen','Données et sources','Evidencia y fuentes','Evidenze e fonti'],
 'Supply':['Angebot','Offre','Oferta','Offerta'],
 'Trade':['Handel','Échanges','Comercio','Scambi'],
 'Value':['Wert','Valeur','Valor','Valore'],
 'Seed multiplication area':['Saatgutvermehrungsfläche','Surface de multiplication des semences','Superficie de multiplicación de semillas','Superficie di moltiplicazione delle sementi'],
 'Geography':['Geografie','Géographie','Geografía','Geografia'],
 'Indicator':['Indikator','Indicateur','Indicador','Indicatore'],
 'Evidence basis':['Datengrundlage','Base factuelle','Base de evidencia','Base delle evidenze'],
 'Historical seed evidence; not available stock.':['Historische Saatgutdaten; kein verfügbarer Bestand.','Données historiques sur les semences ; pas de stock disponible.','Evidencia histórica de semillas; no existencias disponibles.','Dati storici sulle sementi; non scorte disponibili.'],
 'Customs shipment value, not a seed offer.':['Zollwert der Lieferungen, kein Saatgutangebot.','Valeur douanière des expéditions, pas une offre de semences.','Valor aduanero de los envíos, no una oferta de semillas.','Valore doganale delle spedizioni, non un’offerta di sementi.'],
 'National / regional seed evidence':['Nationale / regionale Saatgutdaten','Données nationales / régionales sur les semences','Evidencia nacional / regional de semillas','Dati nazionali / regionali sulle sementi'],
 'Evidence source identifiers; observation dates are not publication dates.':['Quellenkennungen; Beobachtungsdaten sind keine Veröffentlichungsdaten.','Identifiants des sources ; les dates d’observation ne sont pas des dates de publication.','Identificadores de fuentes; las fechas de observación no son fechas de publicación.','Identificativi delle fonti; le date di osservazione non sono date di pubblicazione.']
}
export const briefingLabel=(key,language)=>copy[key]?.[{DE:0,FR:1,ES:2,IT:3}[language]]||key
const metricNames={SEED_PRODUCTION_AREA:'Seed production area',SEED_MULTIPLICATION_AREA:'Seed multiplication area',CERTIFIED_SEED_AREA:'Certified seed area',CERTIFIED_QUANTITY:'Certified seed quantity',CERTIFIED_SEED_QUANTITY:'Certified seed quantity'}
export default function MarketDetailBriefing({card,primary,Metric,Tags,tradeEvidence}){
 const t=useT(),{language}=useLanguage(),l=key=>briefingLabel(key,language),record=detailPilotRecord(card.market_entity_id)
 if(!record)return null
 const production=card.production_evidence,price=latestTradeUnitValue(card.price_observations),hasTrade=card.trade_volume_t!=null
 const metricName=m=>m==='SEED_MULTIPLICATION_AREA'?l('Seed multiplication area'):t(metricNames[m]||'Official seed evidence')
 return <main className="market-catalogue catalogue-detail market-detail-briefing" data-pilot-entity={card.market_entity_id}>
  <nav className="catalogue-breadcrumb" aria-label={t('Breadcrumb')}><a href="/market">{t('All categories')}</a><span aria-hidden="true">/</span><a href={`/market/${primary.slug}`}>{t(primary.title)}</a></nav>
  <header className="catalogue-page-head"><p className="eyebrow">{l('Market briefing')}</p><h1>{t(card.common_name_en)}</h1><p className="catalogue-botanical"><em>{card.botanical_display_name}</em></p><Tags card={card}/><p className="briefing-status snapshot-as-of"><span className="briefing-status-label">{t(record.presentation==='MARKET_WATCH'?'Market watch':'Market situation')}</span> · {t('As of')} <time dateTime={record.as_of} data-precision={record.as_of_precision}>{evidenceDate(record,language)}</time></p><dl className="briefing-header-metrics">{price&&<div><dl><Metric label="Trade unit value" value={price.price_eur_kg} unit=" €/kg"/></dl><p>{t('Observed · {period}',{period:price.period})}</p></div>}{hasTrade&&<div><dl><Metric label="Trade volume" value={card.trade_volume_t} unit=" t"/></dl><p>{t('Completed {period}',{period:card.latest_trade_period})}</p></div>}</dl></header>
  <section className="briefing-primary" aria-labelledby="briefing-situation"><h2 id="briefing-situation">{l('Current situation')}</h2><div className="catalogue-detail-intelligence"><section className="snapshot-intelligence" data-presentation={record.presentation} aria-label={l('Current situation')}><p className="snapshot-situation">{t(record.market_situation)}</p>{record.presentation==='MARKET_WATCH'&&record.market_watch.length>0&&<div className="snapshot-watch"><h4>{t('What to watch')}</h4><ul>{record.market_watch.map(item=><li key={item}>{t(item)}</li>)}</ul></div>}{record.presentation==='MARKET_WATCH'&&record.b2b_view&&<div className="snapshot-b2b"><h4>{t('B2B view')}</h4><p>{t(record.b2b_view)}</p></div>}</section></div></section>
  {record.entity_id==='sunflower'&&<section className="briefing-drivers" aria-labelledby="briefing-drivers"><h2 id="briefing-drivers">{l('Market drivers')}</h2><dl><div><dt>{l('Trade')}</dt><dd>{t(record.market_situation).split('. ')[0]}.</dd></div></dl></section>}
  <section id="briefing-trade" className="briefing-trade"><h2>{l('Trade & value')}</h2>{hasTrade&&<dl className="catalogue-detail-metrics"><Metric label="Trade value" value={card.trade_value_eur} money/><Metric label="Volume YoY" value={card.trade_volume_yoy} unit="%" trend/></dl>}{tradeEvidence}</section>
  <section id="briefing-supply" className="briefing-supply"><h2>{l('Supply evidence')}</h2>{production.strict_entity_records>0?<><p>{t('Official seed-production evidence available.')}</p><dl className="catalogue-evidence-summary"><div><dt>{t('Years covered')}</dt><dd>{production.years.join(', ')}</dd></div><div><dt>{t('Reported metrics')}</dt><dd>{production.metrics.map(metricName).join(' · ')}</dd></div></dl><a href={card.production_detail_url}>{t('Explore production evidence →')}</a></>:<p>{t('Production evidence for this commercial seed type is developing.')}</p>}</section>
  <details className="catalogue-provenance briefing-evidence"><summary>{l('Evidence & sources')}</summary><div><h2>{l('Evidence basis')}</h2><dl className="briefing-evidence-table"><div><dt>{t('Market situation')}</dt><dd>{record.as_of_source_basis}</dd></div><div><dt>{l('Indicator')}</dt><dd>{t('Trade unit value')} · {price?.period||'—'}; {t('Trade volume')} · {hasTrade?card.latest_trade_period:'—'}</dd></div><div><dt>{l('Geography')}</dt><dd>EU-27 · {l('National / regional seed evidence')}</dd></div><div><dt>{t('Sources / provenance')}</dt><dd>{record.source_checkpoint_sha256}</dd></div></dl><p>{l('Evidence source identifiers; observation dates are not publication dates.')}</p>{record.latest_market_evidence&&<div className="snapshot-latest"><h4>{t('Latest market evidence')}</h4><p>{t(record.latest_market_evidence)}</p></div>}<p>{l('Historical seed evidence; not available stock.')}</p><p>{l('Customs shipment value, not a seed offer.')}</p><p>{t('National definitions remain separate; no combined EU production total is inferred.')}</p><h3>{t('CN / TARIC customs scope')}</h3><p>{t(card.customs_scope_type==='GROUP_LEVEL_CUSTOMS_SCOPE'?'Group-level customs scope':'Customs precision varies by commercial seed type.')}</p><p>{t('Customs-group and parent-taxon quantities are not assigned to individual commercial forms.')}</p>{card.CN_status==='PARTIAL'&&<p>{t('This customs scope covers only part of the seed market.')}</p>}{price&&<p>{t(price.scope)}</p>}<ul>{card.customs_descriptions.map(x=><li key={x.code}><b>{x.code}</b> — {x.description}</li>)}</ul><h3>{t('Sources / provenance')}</h3><ul>{card.sources.map((s,i)=><li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.organisation} — {s.title}</a></li>)}</ul><p>{t('Missing evidence is not zero. No interpolation or customs-group allocation.')}</p><a href="/methodology">{t('Full methodology →')}</a></div></details>
 </main>
}
