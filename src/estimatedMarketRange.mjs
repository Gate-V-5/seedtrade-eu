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

export const priceContextCopy=Object.freeze({
 EN:'Modelled merchant asking prices, excluding VAT; source dates vary. Not a current supplier quotation.',
 DE:'Modellierte Händler-Angebotspreise ohne MwSt.; Quelldaten variieren. Kein aktuelles Lieferantenangebot.',
 FR:'Prix demandés par les négociants, modélisés hors TVA ; dates des sources variables. Pas une offre fournisseur actuelle.',
 ES:'Precios solicitados por comerciantes, modelizados sin IVA; fechas de fuentes variables. No es una cotización actual del proveedor.',
 IT:'Prezzi richiesti dai commercianti, modellizzati IVA esclusa; date delle fonti variabili. Non è un’offerta attuale del fornitore.'
})
export const historicalContextCopy=Object.freeze({
 EN:'Historical evidence as of',DE:'Historischer Datenstand',FR:'Données historiques au',ES:'Datos históricos a',IT:'Dati storici al'
})

export const dillPriceContextCopy=Object.freeze({
 EN:'Estimate from a 10–24 kg sowing-seed quantity tier. VAT treatment and final pack sizes are unconfirmed; not a current supplier quotation.',
 DE:'Schätzung aus einer Saatgut-Mengenstaffel von 10–24 kg. MwSt.-Behandlung und endgültige Gebinde sind unbestätigt; kein aktuelles Lieferantenangebot.',
 FR:'Estimation issue d’un tarif de semences pour 10–24 kg. TVA et conditionnements finaux non confirmés ; pas une offre fournisseur actuelle.',
 ES:'Estimación de una tarifa de semillas para 10–24 kg. IVA y envases finales sin confirmar; no es una cotización actual del proveedor.',
 IT:'Stima da una fascia quantitativa di sementi di 10–24 kg. IVA e confezioni finali non confermate; non è un’offerta attuale del fornitore.'
})
export const priceContext=(entityId,language='EN')=>entityId==='dill'?(dillPriceContextCopy[language]||dillPriceContextCopy.EN):(priceContextCopy[language]||priceContextCopy.EN)
