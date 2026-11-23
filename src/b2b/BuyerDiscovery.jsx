import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useLanguage,useT} from '../i18n/index.jsx';
import {b2bFetch} from './apiFetch.mjs';
import {buyerMessages} from './buyerMessages.mjs';
import {sellerMessages} from './sellerMessages.mjs';
import {offerCountries,offerCurrencies,seedCategories} from '../../server/b2b/offerOptions.mjs';
import './buyerDiscovery.css';
import {EnquiryForm} from './Messaging.jsx';
import QualitySpecifications from './QualitySpecifications.jsx';
const keys=['listingDirection','productType','cropId','variety','originCountry','seedCategory','certificationClass','minQuantityKg','maxQuantityKg','minPriceKg','maxPriceKg','currency'];
const blank=()=>Object.fromEntries(keys.map(k=>[k,'']));
const valuesFrom=search=>{const q=new URLSearchParams(search);return Object.fromEntries(keys.map(k=>[k,q.get(k)??'']));};
const categories={SOWING_STATUS_UNKNOWN:'Seed status not specified',CERTIFIED_SOWING:'Certified sowing seed',NON_CERTIFIED_SOWING:'Non-certified sowing seed'};
export default function BuyerDiscovery({session,onExpired,enquiriesAvailable=false,tradingAvailable=false,simpleMarketplace=false}){
 const {language}=useLanguage(),baseT=useT(),t=k=>buyerMessages[language]?.[k]??sellerMessages[language]?.[k]??baseT(k);
 const [reload,setReload]=useState(0);
 const [query,setQuery]=useState(window.location.search),[filters,setFilters]=useState(()=>valuesFrom(window.location.search)),[catalogue,setCatalogue]=useState([]),[rows,setRows]=useState([]),[next,setNext]=useState(null),[offer,setOffer]=useState(null),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[invalid,setInvalid]=useState('');
 const generation=useRef(0),controller=useRef(null),moreLock=useRef(false),form=useRef(null),approved=session.company.status==='VERIFIED';
 const params=new URLSearchParams(query),detail=params.has('offer'),offerId=params.get('offer');
 const countries=useMemo(()=>{const d=new Intl.DisplayNames([language.toLowerCase()],{type:'region'});return offerCountries.map(code=>({code,name:d.of(code)??code})).sort((a,b)=>a.name.localeCompare(b.name,language.toLowerCase()));},[language]);
 const country=code=>{try{return new Intl.DisplayNames([language.toLowerCase()],{type:'region'}).of(code)??code}catch{return code}};
 const number=v=>new Intl.NumberFormat(language.toLowerCase(),{maximumFractionDigits:3}).format(v);
 const price=o=>o.priceAmount==null?t('Price on enquiry'):new Intl.NumberFormat(language.toLowerCase(),{style:'currency',currency:o.currency}).format(o.priceAmount)+' / '+(o.priceUnit??o.details?.priceUnit??o.unit);
 function href(id=null){const q=new URLSearchParams(query);q.set('view','marketplace');q.set('lang',language.toLowerCase());q.delete('after');if(id==null)q.delete('offer');else q.set('offer',String(id));return '/b2b/account?'+q;}
 async function request(path,signal){const r=await b2bFetch('/api/b2b/v1'+path,{signal});const data=await r.json();if(!r.ok){if(r.status===401)onExpired?.();throw Object.assign(Error(data.error),{status:r.status})}return data;}
 const errorText=e=>e.status===403?'Your company must be approved before browsing offers.':e.status===401?'Please sign in again.':e.status===404?'This offer is no longer available.':e.status===400?'Check the filters and try again.':'Could not load offers. Please try again.';
 function listPath(search,after){const q=new URLSearchParams();for(const [k,v]of Object.entries(valuesFrom(search)))if(v)q.set(k,v);if(after!=null)q.set('after',String(after));return '/offers?'+q;}
 useEffect(()=>{const pop=()=>setQuery(window.location.search);window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)},[]);
 useEffect(()=>{const epoch=++generation.current;controller.current?.abort();const ac=new AbortController();controller.current=ac;moreLock.current=false;setFilters(valuesFrom(query));setRows([]);setNext(null);setOffer(null);setFeedback('');setInvalid('');if(!approved){setBusy(false);return()=>ac.abort()}
  setBusy(true);const task=detail?request('/offers/detail?id='+encodeURIComponent(offerId),ac.signal):Promise.all([request('/catalogue',ac.signal),request(listPath(query),ac.signal)]);
  task.then(data=>{if(epoch!==generation.current)return;if(detail)setOffer(data.offer);else{setCatalogue(data[0].items);setRows(data[1].items);setNext(data[1].next)}}).catch(e=>{if(e.name!=='AbortError'&&epoch===generation.current)setFeedback(errorText(e))}).finally(()=>{if(epoch===generation.current)setBusy(false)});return()=>ac.abort();
 },[query,reload,session.user.id,session.company.id,approved]);
 function apply(e,clear=false){e?.preventDefault();if(busy)return;const v=clear?blank():filters;setInvalid('');
  if(!clear){const bad=Array.from(form.current.elements).find(x=>x.willValidate&&!x.validity.valid);if(bad){setInvalid(bad.name);setFeedback('Check the filters and try again.');bad.focus();return}
   if((v.minPriceKg!==''||v.maxPriceKg!=='')&&!v.currency){setInvalid('currency');setFeedback('Choose a currency when filtering by price.');form.current.elements.namedItem('currency').focus();return}
   for(const [a,b]of [['minQuantityKg','maxQuantityKg'],['minPriceKg','maxPriceKg']])if(v[a]!==''&&v[b]!==''&&Number(v[a])>Number(v[b])){setInvalid(a);setFeedback('Minimum values must not exceed maximum values.');form.current.elements.namedItem(a).focus();return}
  }
  const q=new URLSearchParams({view:'marketplace',lang:language.toLowerCase()});for(const [k,value]of Object.entries(v))if(value.trim())q.set(k,['minQuantityKg','maxQuantityKg','minPriceKg','maxPriceKg'].includes(k)?String(Number(value)):value.trim());const search='?'+q;window.history.pushState({...window.history.state},'',window.location.pathname+search);if(search===query)setReload(n=>n+1);else setQuery(search);
 }
 async function more(){if(busy||moreLock.current||!next)return;moreLock.current=true;setBusy(true);setFeedback('');const epoch=generation.current;try{const data=await request(listPath(query,next),controller.current.signal);if(epoch===generation.current){setRows(old=>[...old,...data.items]);setNext(data.next)}}catch(e){if(e.name!=='AbortError'&&epoch===generation.current){if(e.status===401||e.status===403){setRows([]);setNext(null)}setFeedback(errorText(e))}}finally{moreLock.current=false;if(epoch===generation.current)setBusy(false)}}
 const change=e=>{setFilters(v=>({...v,[e.target.name]:e.target.value,...(e.target.name==='productType'&&e.target.value==='COMMODITY'?{seedCategory:'',certificationClass:''}:{})}));if(invalid===e.target.name)setInvalid('')};
 const select=(label,name,children)=><label><span>{t(label)}</span><select name={name} value={filters[name]} onChange={change} aria-invalid={invalid===name} aria-describedby={invalid===name?'buyer-feedback':undefined}>{children}</select></label>;
 const field=(label,name,numeric=false)=><label><span>{t(label)}</span><input name={name} value={filters[name]} onChange={change} type={numeric?'number':'text'} {...(numeric?{min:0,max:1e12,step:.001}:{maxLength:name==='variety'?128:80})} aria-invalid={invalid===name} aria-describedby={invalid===name?'buyer-feedback':undefined}/></label>;
 function summary(o){const direction=o.details?.listingDirection??null,product=o.details?.productType??null;return <>
  <div className="listing-classification"><strong>{t(direction==='BUY_REQUEST'?'TO BUY · DEMAND':'FOR SALE · OFFER')}</strong>{product&&<span>{t(product==='COMMODITY'?'COMMODITY':'CERTIFIED SEED')}</span>}</div>
  <h3>{baseT(o.species?.name??o.cropId)}{o.details.variety?' · '+o.details.variety:''}</h3><p className="buyer-botanical"><i>{o.species?.botanical}</i></p>
  <p>{t(direction==='BUY_REQUEST'?'Buyer company':'Listing company')}: <strong>{o.companyName}</strong>{o.companyCountry?' · '+country(o.companyCountry):''}</p>
  {o.quantity!=null&&<p>{t(direction==='BUY_REQUEST'?'Requested quantity':'Available quantity')}: {number(o.quantity)} {o.unit}</p>}{o.priceAmount!=null&&<p>{t('Price')}: {price(o)}</p>}
  {product!=='COMMODITY'&&(o.certificationClass||o.seedCategory==='CERTIFIED_SOWING')&&<p>{t('Seed category')}: {t(categories[o.seedCategory]??o.seedCategory)}{o.certificationClass?' · '+o.certificationClass:''}</p>}
  {o.originCountry&&<p>{t('Country of origin')}: {country(o.originCountry)}</p>}
  {o.details.availability&&<p>{t('Availability')}: {o.details.availability==='AVAILABLE_FROM'?t('Available from')+' '+o.details.availableFrom:t('Available now')}</p>}
  <p>{t('Listing valid until')}: <time dateTime={o.validUntil}>{o.validUntil}</time></p></>}
 return <section className="buyer-discovery" aria-labelledby="buyer-title" aria-busy={busy}>
  <h2 id="buyer-title">{t(detail?'Listing details':'Browse listings')}</h2><p>{t('Published listings from other approved companies. Drafts and withdrawn listings are excluded.')}</p>
  {detail&&<a className="buyer-back" href={href()}>{t('Back to listings')}</a>}
  {!approved?<p role="status">{t('Your company must be approved before browsing offers.')}</p>:<>
   <p id="buyer-feedback" role="status" aria-live="polite">{busy?t('Loading offers…'):t(feedback)}</p>
   {!detail&&<><form ref={form} aria-label={t('Filter offers')} noValidate onSubmit={apply}><fieldset disabled={busy}><legend>{t('Filter offers')}</legend><div className="buyer-filter-grid">
    {select('Listing direction','listingDirection',<><option value="">{t('All')}</option><option value="OFFER">{t('Offer for sale')}</option><option value="BUY_REQUEST">{t('Buying request')}</option></>)}
    {select('Product type','productType',<><option value="">{t('All')}</option><option value="CERTIFIED_SEED">{t('Certified seed')}</option><option value="COMMODITY">{t('Commodity')}</option></>)}
    {select('Seed species','cropId',<><option value="">{t('All species')}</option>{catalogue.map(c=><option key={c.id} value={c.id}>{baseT(c.name)} — {c.botanical}</option>)}</>)}
    {field('Variety','variety')}{select('Country of origin','originCountry',<><option value="">{t('All countries')}</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</>)}
    {filters.productType!=='COMMODITY'&&<>{select('Seed category','seedCategory',<><option value="">{t('All categories')}</option>{seedCategories.map(c=><option key={c} value={c}>{t(categories[c])}</option>)}</>)}{field('Certification class','certificationClass')}</>}
    {field('Minimum quantity (kg)','minQuantityKg',true)}{field('Maximum quantity (kg)','maxQuantityKg',true)}
    {select('Currency','currency',<><option value="">{t('All currencies')}</option>{offerCurrencies.map(c=><option key={c}>{c}</option>)}</>)}
    {field('Minimum price per kg','minPriceKg',true)}{field('Maximum price per kg','maxPriceKg',true)}
   </div><p>{t('Prices are compared per kg in the selected currency. No currency conversion is applied.')}</p><div className="buyer-actions"><button type="submit">{t('Apply filters')}</button><button type="button" onClick={e=>apply(e,true)}>{t('Clear filters')}</button></div></fieldset></form>
   {!busy&&!feedback&&!rows.length&&<p className="buyer-empty" role="status">{t(Object.values(valuesFrom(query)).some(Boolean)?'No offers match these filters. Try different filters.':'No published offers are available.')}</p>}
   <ul className="buyer-results">{rows.map(o=><li key={o.id} data-buyer-offer-id={o.id}>{summary(o)}<a className="buyer-detail-link" href={href(o.id)}>{t('View listing')}</a></li>)}</ul>
   {next&&<button type="button" disabled={busy} onClick={more}>{t('Load more offers')}</button>}
   </>}
   {detail&&offer&&<article className="buyer-detail">{summary(offer)}<QualitySpecifications parameters={offer.details.qualityParameters} legacy={offer.details} direction={offer.details.listingDirection} t={t}/>{offer.details.packaging&&<p><strong>{t('Packaging')}:</strong> {offer.details.packaging}</p>}{offer.details.deliveryTerms&&<p><strong>{t('Delivery terms')}:</strong> {offer.details.deliveryTerms}</p>}{typeof offer.details.organic==='boolean'&&<p><strong>{t('Organic status')}:</strong> {t(offer.details.organic?'Organic':'Non-organic')}</p>}{offer.details.qualitySpecifications&&<p className="buyer-notes">{offer.details.qualitySpecifications}</p>}{offer.details.commercialInformation&&<><h3>{t('Additional commercial information')}</h3><p className="buyer-notes">{offer.details.commercialInformation}</p></>}{enquiriesAvailable&&!offer.isOwn&&<EnquiryForm simpleMarketplace={simpleMarketplace} offer={offer} session={session} tradingAvailable={tradingAvailable} onExpired={onExpired}/>}</article>}
  </>}
 </section>;
}
