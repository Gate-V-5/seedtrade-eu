import React,{useState} from 'react'
import {networkText} from './copy.mjs'
import {messages} from '../i18n/messages.js'
import {copy as listingText} from '../networkStageD/copy.mjs'
const keys=['publicId','type','species','seedStatus','cropYear','originCountry','validUntil'].sort().join(',')
export function validProjection(value){return value&&Array.isArray(value.items)&&value.items.length<=100&&value.items.every(i=>i&&Object.keys(i).sort().join(',')===keys&&typeof i.publicId==='string'&&['SELL_OFFER','BUY_REQUEST'].includes(i.type)&&i.species&&Object.keys(i.species).sort().join(',')===['id','commonName','botanical','category'].sort().join(',')&&Object.values(i.species).every(v=>typeof v==='string'))}
export default function PrivateMarketplace({call,language='EN'}){
 const[items,setItems]=useState([]),[state,setState]=useState(''),[busy,setBusy]=useState(false),t=k=>networkText(language,k)
 const refresh=async()=>{if(busy)return;setBusy(true);try{const r=await call('/pilot-marketplace');if(!validProjection(r))throw Error();setItems(r.items);setState('ready')}catch{setItems([]);setState('denied')}finally{setBusy(false)}}
 return <section className="network-marketplace" aria-labelledby="network-marketplace-title"><h2 id="network-marketplace-title">{t('market')}</h2><button type="button" disabled={busy} onClick={refresh}>{t('refresh')}</button><p role="status">{state==='denied'?t('denied'):state==='ready'&&!items.length?t('empty'):''}</p><ul>{items.map(i=><li key={i.publicId}><h3>{t(i.type==='SELL_OFFER'?'offer':'request')} · {messages[language]?.[i.species.commonName]||i.species.commonName}</h3><p><i>{i.species.botanical}</i></p><p>{listingText(language,i.seedStatus)} · {i.cropYear} · {i.originCountry}</p><time dateTime={i.validUntil}>{i.validUntil}</time></li>)}</ul></section>
}
