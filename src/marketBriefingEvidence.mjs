import trade from './generated/market_briefing_trade_public.json' with {type:'json'}
import prices from './generated/price_evidence_public.json' with {type:'json'}
import {metricAvailable} from './commercialEvidence.mjs'
export const priceTypes=Object.freeze(['SUPPLIER_ASK','PUBLISHED_PRICE_LIST','MODELLED_RANGE','CUSTOMS_UNIT_VALUE'])
export const validPriceEvidence=r=>r?.status==='VERIFIED_SOURCE_FACTS'&&priceTypes.includes(r.type)&&metricAvailable(r.price)&&Number(r.price)>0&&r.unit==='kg'&&/^[A-Z]{3}$/.test(r.currency)&&/^[A-Z]{2}$/.test(r.country)&&/^https:\/\//.test(r.sourceUrl)&&/^[a-f0-9]{64}$/.test(r.evidenceSha256)&&!!r.species
export function supplierEvidence(entity,registry=prices.records){return registry.filter(r=>r.species===entity&&validPriceEvidence(r)).slice().sort((a,b)=>(b.observationDate||'').localeCompare(a.observationDate||'')||a.id.localeCompare(b.id))}
export function withLatestTrade(card){
 const observation=trade.records[card.market_entity_id]
 if(!observation||card.public_safe_status!=='PUBLIC_SAFE'||card.trade_volume_t==null||!['SPECIES_SPECIFIC','COMMERCIAL_ENTITY_SPECIFIC'].includes(card.customs_scope_type||'SPECIES_SPECIFIC')||observation.latest_trade_period<=card.latest_trade_period)return card
 const history=new Map((card.trade_history||[]).map(p=>[p.period,p]));for(const p of observation.trade_history)if(p.period>card.latest_trade_period)history.set(p.period,p)
 return {...card,...observation,trade_history:[...history.values()].sort((a,b)=>a.period.localeCompare(b.period)),latestTradeSource:trade}
}
export const priceTypeLabel=type=>({SUPPLIER_ASK:'Supplier asking price',PUBLISHED_PRICE_LIST:'Published price list',MODELLED_RANGE:'Modelled indicative range',CUSTOMS_UNIT_VALUE:'Customs trade unit value'}[type])
export function evidenceSummary(card){
 return {entity:card.market_entity_id,botanical:card.botanical_display_name,category:card.primary_category,sourceCount:card.sources.length,productionYears:card.production_evidence.years,sourceDates:card.last_updated||null,tradePeriod:card.latest_trade_period,tradeClassification:card.trade_volume_t==null?'NOT_ALLOCATED':'OBSERVED',prices:supplierEvidence(card.market_entity_id),publicationDate:null}
}
