import {indicativeAssessment} from './marketPricePresentation.mjs'
import {rangePresentation} from './estimatedMarketRange.mjs'
import BriefingPriceEvidence from './BriefingPriceEvidence.jsx'
import BriefingStage3 from './BriefingStage3.jsx'
import MarketBriefingNavigation from './MarketBriefingNavigation.jsx'
import {supplierEvidence} from './marketBriefingEvidence.mjs'
import {useT,useLanguage} from './i18n/index.jsx'
import intelligence from './generated/snapshot_intelligence_public.json'
import {evidenceDate} from './SnapshotIntelligence.jsx'
import {latestTradeUnitValue} from './commercialEvidence.mjs'
import './marketBriefingV2.css'
import CatalogueProductionLink from './CatalogueProductionLink.jsx'
import {catalogueProductionLink} from './catalogueProduction.mjs'

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
export default function MarketDetailBriefing({card,primary,Metric,Tags,pricePresentation,tradeEvidence,rankings,productionSearch}){
 const t=useT(),{language}=useLanguage(),l=key=>briefingLabel(key,language),record=detailPilotRecord(card.market_entity_id),production=card.production_evidence,price=latestTradeUnitValue(card.price_observations),hasTrade=card.trade_volume_t!=null,range=rangePresentation(card.market_entity_id),assessment=indicativeAssessment(card.market_entity_id),asks=supplierEvidence(card.market_entity_id)
 const productionLink=catalogueProductionLink(card.market_entity_id,productionSearch),hasSupply=production.strict_entity_records>0||productionLink.href
 return <main className="market-catalogue catalogue-detail market-detail-briefing" data-market-entity={card.market_entity_id} data-pilot-entity={record?card.market_entity_id:undefined}>
  <nav className="catalogue-breadcrumb" aria-label={t('Breadcrumb')}><a href="/market">{t('European Seed Market')}</a><span aria-hidden="true">/</span><a href={`/market/${primary.slug}`}>{t(primary.title)}</a></nav>
  <header className="catalogue-page-head"><p className="eyebrow">{l('Market briefing')}</p><h1>{t(card.common_name_en)}</h1><p className="catalogue-botanical"><em>{card.botanical_display_name}</em></p><Tags card={card}/>{record&&<p className="briefing-status snapshot-as-of"><span className="briefing-status-label">{t(record.presentation==='MARKET_WATCH'?'Market watch':'Market situation')}</span> · {t('Evidence as of')} <time dateTime={record.as_of} data-precision={record.as_of_precision}>{evidenceDate(record,language)}</time></p>}
  <div className="briefing-key-metrics">{assessment&&<div className="briefing-modelled-range">{pricePresentation}</div>}{price&&<div><dl><Metric label="Trade unit value" value={price.price_eur_kg} unit=" €/kg"/></dl><p className="catalogue-period">{t('Observed · {period}',{period:price.period})}</p></div>}{hasTrade&&<div><dl><Metric label="Trade volume" value={card.trade_volume_t} unit=" t" compact/></dl><p className="catalogue-period">{t('Completed {period}',{period:card.latest_trade_period})}</p></div>}</div>
  </header>
  <section className="briefing-primary" aria-labelledby="briefing-situation"><h2 id="briefing-situation">{t('Market situation')}</h2><div className="snapshot-intelligence" data-presentation={record?.presentation||'EVIDENCE_SUMMARY'}><p className="snapshot-situation">{record?t(record.market_situation):production.years.length?t('Reported seed evidence covers {years}. National and regional definitions remain separate.',{years:production.years.join(', ')}):asks.length?t('Supplier-source price evidence is available; validity and commercial terms remain offer-specific.'):t('No comparable species-specific trade balance or current seed-price observation is established.')}</p></div>{hasTrade&&<p className="catalogue-note">{t('Latest validated trade observation')}: {card.latest_trade_period} · {card.trade_volume_yoy!=null&&<>{t('Volume YoY')}: {new Intl.NumberFormat(language.toLowerCase(),{maximumFractionDigits:1}).format(card.trade_volume_yoy)}%</>}</p>}</section>
  <BriefingPriceEvidence entityId={card.market_entity_id}/>
  {(hasTrade||price)&&<section id="briefing-trade" className="briefing-trade"><h2>{t('Price and trade trends')}</h2><div className="briefing-history-grid">{tradeEvidence}</div></section>}
  <BriefingStage3 card={card} search={productionSearch}/>
  {hasSupply&&<section id="briefing-supply" className="briefing-supply"><h2>{l('Supply evidence')}</h2>{production.strict_entity_records>0&&<p>{t('Years covered')}: {production.years.join(', ')} · {t('Reported metrics')}: {production.metrics.map(m=>t(metricNames[m]||'Official seed evidence')).join(' · ')}</p>}<CatalogueProductionLink card={card} search={productionSearch}/></section>}
  <div className="briefing-rankings">{rankings}</div>
  <details className="catalogue-provenance briefing-evidence"><summary>{l('Evidence & sources')}</summary><div>
  {record&&<><h3>{t('Historical market context')}</h3>{record.market_watch.length>0&&<div className="snapshot-watch"><ul>{record.market_watch.map(item=><li key={item}>{t(item)}</li>)}</ul></div>}{record.b2b_view&&<div className="snapshot-b2b"><p>{t(record.b2b_view)}</p></div>}{record.latest_market_evidence&&<div className="snapshot-latest"><p>{t(record.latest_market_evidence)}</p></div>}</>}
  {range?.state==='RANGE'&&<p>{t('Individual source dates and citations are absent from the retained modelled-range projection. Its bounds are unchanged; current validity is unverified.')}</p>}
  <p>{l('Historical seed evidence; not available stock.')}</p><p>{l('Customs shipment value, not a seed offer.')}</p><p>{t('National definitions remain separate; no combined EU production total is inferred.')}</p>
  {price&&<p>{t(price.scope)} · {price.period} <a href={price.source_url}>{price.source}</a></p>}
  {card.latestTradeSource&&<p>{t('Latest validated trade observation')}: {card.latest_trade_period} · <a href={card.latestTradeSource.source_url}>{card.latestTradeSource.source}</a>. {t('Intra-EU dispatches are activity, not additional EU-wide supply.')}</p>}
  <h3>{t('CN / TARIC customs scope')}</h3><p>{t(card.customs_scope_type==='GROUP_LEVEL_CUSTOMS_SCOPE'?'Group-level customs scope':'Customs precision varies by commercial seed type.')}</p><p>{t('Customs-group and parent-taxon quantities are not assigned to individual commercial forms.')}</p>{card.CN_status==='PARTIAL'&&<p>{t('This customs scope covers only part of the seed market.')}</p>}<ul>{card.customs_descriptions.map(x=><li key={x.code}><b>{x.code}</b> — {x.description}</li>)}</ul>
  <h3>{t('Sources / provenance')}</h3><ul>{card.sources.map((s,i)=><li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.organisation} — {s.title}</a></li>)}</ul><p>{t('Missing evidence is not zero. No interpolation or customs-group allocation.')}</p><a href="/methodology">{t('Full methodology →')}</a></div></details>
  <MarketBriefingNavigation category={primary}/>
 </main>
}
