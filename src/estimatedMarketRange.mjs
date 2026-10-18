import data from './generated/estimated_market_ranges_public.json' with {type:'json'}
export const rangeCopy=Object.freeze({
 EN:['Estimated Market Range','Price discovery in progress'],
 DE:['Geschätzte Marktpreisspanne','Preisermittlung läuft'],
 FR:['Fourchette de prix de marché estimée','Recherche de prix en cours'],
 ES:['Rango estimado de precios de mercado','Investigación de precios en curso'],
 IT:['Intervallo stimato dei prezzi di mercato','Ricerca dei prezzi in corso']
})
export function rangePresentation(entityId,language='EN') {
 const record=data.records[entityId]
 if(!record)return null
 const [label,discovery]=rangeCopy[language]||rangeCopy.EN
 const low=Number(record.lower_eur_kg),high=Number(record.upper_eur_kg)
 const valid=record.state==='RANGE'&&record.lower_eur_kg!==null&&record.upper_eur_kg!==null&&Number.isFinite(low)&&Number.isFinite(high)&&low>=0&&high>=low
 const locale={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language]||'en-GB'
 const fmt=n=>new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false}).format(n)
 return {label,state:valid?'RANGE':'DISCOVERY',value:valid?`€${fmt(low)} – €${fmt(high)}/kg`:discovery}
}
export const hasEstimatedRange=entityId=>Object.hasOwn(data.records,entityId)
