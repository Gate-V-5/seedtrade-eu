import {publicListingUrl} from '../../shared/publicListingLinks.mjs';
import {CommissionPublication} from './TradingWorkspace.jsx';
﻿import './publicPreview.css';
import {previewMessages} from './previewMessages.mjs';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useLanguage,useT} from '../i18n/index.jsx';
import {b2bFetch} from './apiFetch.mjs';
import {offerCountries,offerCurrencies,seedCategories} from '../../server/b2b/offerOptions.mjs';
import {sellerMessages} from './sellerMessages.mjs';
import './sellerOffers.css';
import {qualityRows,qualityLabels,conditionLabels} from './QualitySpecifications.jsx';

const emptyOffer=()=>({listingDirection:'',productType:'',qualityParameters:[],packaging:'',deliveryTerms:'',organic:null,cropId:'',variety:'',seedCategory:'SOWING_STATUS_UNKNOWN',certificationClass:'',quantity:'',unit:'kg',priceAmount:'',currency:'EUR',originCountry:'',availability:'AVAILABLE_NOW',availableFrom:'',validUntil:'',germinationPercent:'',purityPercent:'',moisturePercent:'',qualitySpecifications:'',commercialInformation:''});
const statusKey={DRAFT:'Draft',PUBLISHED:'Published',CLOSED:'Withdrawn'};
const categoryKey={SOWING_STATUS_UNKNOWN:'Seed status not specified',CERTIFIED_SOWING:'Certified sowing seed',NON_CERTIFIED_SOWING:'Non-certified sowing seed'};
const errors={SIGN_IN_REQUIRED:'Please sign in again.',RELOAD_REQUIRED:'This offer changed. Refresh offers before trying again.',NOT_FOUND:'This offer is unavailable.',RATE_LIMITED:'Too many attempts. Please try again later.',COMPANY_APPROVAL_REQUIRED:'Your company must be independently approved before creating or publishing offers.',COMPANY_ADMIN_REQUIRED:'Only your company administrator can manage offers.',INVALID_REQUEST:'Please check the highlighted field.'};
const numeric=['quantity','priceAmount','germinationPercent','purityPercent','moisturePercent'];
export default function SellerOffers({session,onExpired,tradingPolicy=null,tradingRequired=false}){
 const {language}=useLanguage(),baseT=useT(),t=key=>previewMessages[language]?.[key]??sellerMessages[language]?.[key]??baseT(key);
 const [catalogue,setCatalogue]=useState([]),[page,setPage]=useState({items:[],next:null}),[offer,setOffer]=useState(emptyOffer),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[feedback,setFeedback]=useState(''),[invalid,setInvalid]=useState('');
 const [publishTarget,setPublishTarget]=useState(null),[publishedId,setPublishedId]=useState(null);
 const lock=useRef(false),mounted=useRef(true),formRef=useRef(null);
 const permitted=session.company.status==='VERIFIED'&&session.role==='COMPANY_ADMIN';
 const today=new Date().toISOString().slice(0,10);
 const countries=useMemo(()=>{const names=new Intl.DisplayNames([language.toLowerCase()],{type:'region'});return offerCountries.map(code=>({code,label:names.of(code)??code})).sort((a,b)=>a.label.localeCompare(b.label,language.toLowerCase()));},[language]);
 async function request(path,input){
  const r=await b2bFetch('/api/b2b/v1'+path,input==null?{}:{method:'POST',headers:{'Content-Type':'application/json','X-SeedTrade-CSRF':session.csrfToken},body:JSON.stringify(input)});
  const data=await r.json();if(!r.ok){if(r.status===401)onExpired?.();throw Error(data.error??'TEMPORARILY_UNAVAILABLE');}return data;
 }
 async function refresh(after=null){const data=await request('/offers?own=true'+(after?'&after='+after:''));if(mounted.current)setPage(old=>({...data,items:after?[...old.items,...data.items]:data.items}));}
 useEffect(()=>{mounted.current=true;let active=true;lock.current=true;setBusy(true);Promise.all([request('/catalogue'),request('/offers?own=true')]).then(([c,o])=>{if(active){setCatalogue(c.items);setPage(o);setLoaded(true);}}).catch(e=>{if(active)setFeedback(errors[e.message]??'Changes not saved. Please try again.');}).finally(()=>{if(active){lock.current=false;setBusy(false);}});return()=>{active=false;mounted.current=false;};},[session.user.id,session.company.id]);
 async function run(work){if(lock.current)return;lock.current=true;setBusy(true);setFeedback('');try{await work();}catch(e){if(mounted.current)setFeedback(errors[e.message]??'Changes not saved. Please try again.');}finally{lock.current=false;if(mounted.current)setBusy(false);}}
 const update=e=>{const {name,value}=e.target;setOffer(old=>({...old,[name]:value,...(name==='productType'&&value==='COMMODITY'?{certificationClass:'',seedCategory:'SOWING_STATUS_UNKNOWN'}:{})}));if(invalid===name)setInvalid('');};
 const control=(label,name,options={})=><label className="seller-field" key={name}><span>{t(label)}{!options.required&&<small>{t('Optional')}</small>}</span><input id={'offer-'+name} name={name} value={offer[name]??''} onChange={update} aria-invalid={invalid===name} aria-describedby={invalid===name?'seller-feedback':undefined} {...options}/></label>;
 const selection=(label,name,children,required=true)=><label className="seller-field"><span>{t(label)}</span><select name={name} value={offer[name]??''} onChange={update} required={required} aria-invalid={invalid===name}>{children}</select></label>;
 const note=(label,name)=><label className="seller-field"><span>{t(label)}<small>{t('Optional')}</small></span><textarea name={name} value={offer[name]??''} onChange={update} maxLength={2000} rows={3}/></label>;
 function start(item){setInvalid('');setFeedback('');setOffer(item?{...emptyOffer(),...item,...item.details,...Object.fromEntries(numeric.map(k=>[k,(item.details?.[k]??item[k])==null?'':String(item.details?.[k]??item[k])])),listingDirection:item.details?.listingDirection??item.listingDirection??'',productType:item.details?.productType??item.productType??'',qualityParameters:qualityRows(item.details?.qualityParameters??item.qualityParameters,item.details).map(row=>({...row}))}:emptyOffer());setTimeout(()=>formRef.current?.querySelector('select')?.focus(),0);}
 function qualityChange(parameter,field,value){setOffer(old=>{const rows=old.qualityParameters??[],index=rows.findIndex(row=>row.parameter===parameter),existing=rows[index],row={parameter,operator:'EXACT',value:'',unit:'%',...existing,[field]:value};return {...old,qualityParameters:field==='operator'&&value===''?rows.filter((_,i)=>i!==index):index<0?[...rows,row]:rows.map((entry,i)=>i===index?row:entry)};});setInvalid('');}
 function qualityControls(){return <><h3>{t(offer.listingDirection==='BUY_REQUEST'?'Required Product Quality':'Declared Product Quality')}</h3><p className="quality-editor-note">{t(offer.listingDirection==='BUY_REQUEST'?'Buyer requirements are not laboratory verification.':'Seller declarations are not laboratory verification.')}</p>{Object.entries(qualityLabels).map(([parameter,label])=>{const row=offer.qualityParameters?.find(x=>x.parameter===parameter);return <div className="quality-editor-grid" key={parameter}><span className="quality-editor-name">{t(label)}</span><label className="quality-editor-field"><span>{t('Quality condition')}</span><select aria-label={t(label)+': '+t('Quality condition')} value={row?.operator??''} onChange={e=>qualityChange(parameter,'operator',e.target.value)}><option value="">{t('Not specified')}</option>{Object.entries(conditionLabels).map(([value,text])=><option key={value} value={value}>{t(text)}</option>)}</select></label><label className="quality-editor-field"><span>{t('Value (%)')}</span><input name={'quality-'+parameter} inputMode="decimal" type="text" value={row?.value??''} disabled={!row} required={Boolean(row)} pattern="(?:0|[1-9][0-9]{0,2})([.,][0-9]{1,12})?" aria-label={t(label)+': '+t('Value (%)')} aria-invalid={invalid==='quality-'+parameter} onChange={e=>qualityChange(parameter,'value',e.target.value)} /></label>{parameter==='other'&&row&&<label className="quality-editor-field quality-other-label"><span>{t('Parameter name')}</span><input name="quality-other-label" value={row.label??''} maxLength={80} required onChange={e=>qualityChange(parameter,'label',e.target.value)}/></label>}</div>})}</>}

 async function mutation(path,input,success){
  await request(path,input);if(!mounted.current)return;
  setOffer(emptyOffer());setInvalid('');setFeedback(success);
  try{await refresh();}catch{if(mounted.current){setLoaded(false);setFeedback('Offer saved; the list could not be refreshed. Refresh offers before making another change.');}}
 }
 function save(e,acceptance=null){e.preventDefault();if(!permitted||!loaded)return;
  const bad=Array.from(e.currentTarget.elements).find(x=>x.willValidate&&!x.validity.valid);
  if(bad){setInvalid(bad.name);setFeedback('Please check the highlighted field.');bad.focus();return;}
  if(offer.availability==='AVAILABLE_FROM'&&(!offer.availableFrom||offer.availableFrom>offer.validUntil)){setInvalid('availableFrom');setFeedback('Choose an availability date on or before the offer expiry date.');formRef.current.elements.namedItem('availableFrom').focus();return;}
  const qualityParameters=(offer.qualityParameters??[]).map(row=>({...row,value:String(row.value).replace(',','.')}));
  const invalidQuality=qualityParameters.find(row=>!Number.isFinite(Number(row.value))||Number(row.value)<0||Number(row.value)>100);
  if(invalidQuality){setInvalid('quality-'+invalidQuality.parameter);setFeedback('Choose a quality condition and enter a value from 0 to 100.');formRef.current.elements.namedItem('quality-'+invalidQuality.parameter).focus();return;}
  // Preserve unchanged legacy exact observations for existing API consumers.
  // A deliberately changed structured condition must not retain a contradictory exact value.
  const legacyQuality=Object.fromEntries([['germinationPercent','germination'],['purityPercent','physicalPurity'],['moisturePercent','moisture']].map(([field,parameter])=>{const row=qualityParameters.find(q=>q.parameter===parameter),value=offer[field];return [field,value!==''&&value!=null&&row?.operator==='EXACT'&&Number(row.value)===Number(value)?Number(value):null]}));
  const input={...offer,...Object.fromEntries(numeric.map(k=>[k,offer[k]===''?null:Number(offer[k])])),listingDirection:offer.listingDirection||null,productType:offer.productType||null,organic:offer.organic==='true'?true:offer.organic==='false'?false:offer.organic===true?true:offer.organic===false?false:null,qualityParameters,...legacyQuality};
  // Keep the payload explicit; never send tenant IDs or immutable acceptance data.
  delete input.companyId;delete input.companyName;delete input.species;delete input.details;delete input.status;
  run(async()=>{
   let saved;try{saved=await request('/offers/save',input);}catch(error){setLoaded(false);throw error;}
   if(acceptance){setOffer(old=>({...old,id:saved.id,version:saved.version}));const result=await request('/offers/publish',{id:saved.id,version:saved.version,...acceptance});setPublishedId(result.id??saved.id);setFeedback('Listing published. It is now visible in the Member Marketplace.');}
   else setFeedback('Offer saved as draft.');
   setOffer(emptyOffer());setInvalid('');await refresh();
  });
 }
 return <section className="seller-offers" id="seller-offers" aria-labelledby="seller-title">
  <header className="seller-heading"><div><h2 id="seller-title">{t('My listings')}</h2><p>{t('Drafts are private. Complete offers are restricted to approved members. Public previews require your separate confirmation.')}</p></div><button type="button" disabled={busy} onClick={()=>run(async()=>{const c=await request('/catalogue');if(mounted.current)setCatalogue(c.items);await refresh();if(mounted.current)setLoaded(true);})}>{t('Refresh listings')}</button></header>
  {publishedId&&<p className="publication-success"><a href={publicListingUrl(publishedId,language)}>{t('View published listing')}</a></p>}<p id="seller-feedback" role="status" aria-live="polite">{busy?t('Working…'):t(feedback)}</p>
  {!permitted&&<p>{t(session.company.status!=='VERIFIED'?'Your company must be independently approved before creating or publishing offers.':'Only your company administrator can manage offers.')}</p>}
  {loaded&&!page.items.length&&<p>{t('No listings yet.')}</p>}
  <ul className="seller-list">{page.items.map(item=><li key={item.id} data-offer-id={item.id} data-offer-status={item.status}>
   <div><h4>{baseT(item.species?.name??item.cropId)}</h4><p><i>{item.species?.botanical}</i></p>{item.details?.variety&&<p>{t('Variety')}: {item.details.variety}</p>}<p>{t((item.details?.listingDirection??item.listingDirection)==='BUY_REQUEST'?'TO BUY · DEMAND':(item.details?.listingDirection??item.listingDirection)==='OFFER'?'FOR SALE · OFFER':'Not specified')} · {t(({CERTIFIED_SEED:'CERTIFIED SEED',COMMODITY:'COMMODITY'})[item.details?.productType??item.productType]??'Not specified')}</p><p>{new Intl.NumberFormat(language.toLowerCase()).format(item.quantity)} {item.unit}{item.priceAmount!=null&&<> · {new Intl.NumberFormat(language.toLowerCase(),{style:'currency',currency:item.currency}).format(item.priceAmount)+' / '+(item.priceUnit??item.details?.priceUnit??item.unit)}</>}</p><p>{t('Listing valid until')}: <time dateTime={item.validUntil}>{item.validUntil}</time></p></div>
   <div className="seller-offer-state"><span className={'seller-status seller-status-'+item.status.toLowerCase()}>{t(statusKey[item.status]??item.status)}</span>{item.validUntil<today&&<span>{t('Expired')}</span>}<div className="seller-actions"><button type="button" disabled={busy||!permitted||!loaded} onClick={()=>start(item)}>{t('Edit listing')}</button><button type="button" disabled={busy||!permitted||!loaded||item.status!=='DRAFT'||item.validUntil<today||(tradingRequired&&!tradingPolicy)} onClick={()=>tradingPolicy?setPublishTarget(item):run(()=>mutation('/offers/publish',{id:item.id,version:item.version},'Offer published.'))}>{t('Publish Listing')}</button><button type="button" disabled={busy||session.role!=='COMPANY_ADMIN'||!loaded||item.status==='CLOSED'} onClick={()=>run(()=>mutation('/offers/close',{id:item.id,version:item.version},'Offer withdrawn.'))}>{t('Withdraw listing')}</button></div></div>
  </li>)}</ul>
  {page.next&&<button type="button" disabled={busy} onClick={()=>run(()=>refresh(page.next))}>{t('More offers')}</button>}
  <button type="button" disabled={busy||!permitted||!loaded} onClick={()=>start()}>{t('New listing')}</button>
  {publishTarget&&tradingPolicy&&<CommissionPublication policy={tradingPolicy} listing={publishTarget} busy={busy} onCancel={()=>setPublishTarget(null)} onConfirm={acceptance=>run(async()=>{await mutation('/offers/publish',{id:publishTarget.id,version:publishTarget.version,...acceptance},'Listing published. It is now visible in the Member Marketplace.');setPublishedId(publishTarget.id);setPublishTarget(null);})}/>}
  <form ref={formRef} aria-label={t('My listings')} noValidate onSubmit={save}><fieldset disabled={busy||!permitted||!loaded}><legend>{t(offer.id?'Edit listing':'New listing')}</legend>
   <p>{t('Editing a listing returns it to draft. Publish it again to make the changes visible.')}</p><div className="seller-grid">
    {selection('Listing direction','listingDirection',<><option value="">{t('Not specified')}</option><option value="OFFER">{t('Offer for sale')}</option><option value="BUY_REQUEST">{t('Buying request')}</option></>,!offer.id)}
    {selection('Product type','productType',<><option value="">{t('Not specified')}</option><option value="CERTIFIED_SEED">{t('Certified seed')}</option><option value="COMMODITY">{t('Commodity')}</option></>,!offer.id)}
    {selection('Seed species','cropId',<><option value="">{t('Select species')}</option>{catalogue.map(c=><option key={c.id} value={c.id}>{baseT(c.name)} — {c.botanical}</option>)}</>)}
    {control('Variety','variety',{maxLength:128})}
    {offer.productType!=='COMMODITY'&&selection('Seed category','seedCategory',seedCategories.map(c=><option key={c} value={c}>{t(categoryKey[c])}</option>))}
    {offer.productType!=='COMMODITY'&&control('Certification class','certificationClass',{maxLength:80})}
    {control(offer.listingDirection==='BUY_REQUEST'?'Requested quantity':'Available quantity','quantity',{type:'number',required:true,min:0.001,max:1e9,step:0.001})}
    {selection('Unit','unit',<><option value="kg">kg</option><option value="t">t</option></>)}
    {control('Price indication','priceAmount',{type:'number',min:0,max:1e9,step:0.01})}
    {selection('Currency','currency',offerCurrencies.map(c=><option key={c}>{c}</option>))}
    {selection('Country of origin','originCountry',<><option value="">{t('Select country')}</option>{countries.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}</>)}
    {selection('Availability','availability',<><option value="AVAILABLE_NOW">{t('Available now')}</option><option value="AVAILABLE_FROM">{t('Available from')}</option></>)}
    {offer.availability==='AVAILABLE_FROM'&&control('Available from','availableFrom',{type:'date',required:true,max:offer.validUntil||undefined})}
    {control('Listing valid until','validUntil',{type:'date',required:true,min:today,max:new Date(Date.now()+366*86400000).toISOString().slice(0,10)})}
       {control('Packaging','packaging',{maxLength:200})}
    {control('Delivery terms','deliveryTerms',{maxLength:200})}
    {selection('Organic status','organic',<><option value="">{t('Not specified')}</option><option value="true">{t('Organic')}</option><option value="false">{t('Non-organic')}</option></>,false)}
   </div><details className="listing-optional"><summary>{t('Quality parameters (optional)')}</summary>{qualityControls()}</details>
   <details className="listing-optional" open={Boolean(offer.qualitySpecifications||offer.commercialInformation)}><summary>{t('Additional notes (optional)')}</summary>{note('Quality notes','qualitySpecifications')}{note('Additional commercial information','commercialInformation')}</details>
   {tradingPolicy&&permitted&&!publishTarget&&<CommissionPublication key={JSON.stringify(offer)} policy={tradingPolicy} listing={{...offer,species:catalogue.find(c=>c.id===offer.cropId)}} busy={busy||!loaded} onCancel={()=>start()} onConfirm={acceptance=>save({preventDefault(){},currentTarget:formRef.current},acceptance)}/>}<div className="seller-actions"><button type="submit" className="member-primary">{t(offer.id?'Save changes as draft':'Save draft')}</button>{offer.id&&<button type="button" onClick={()=>start()}>{t('Cancel editing')}</button>}</div>
  </fieldset></form>
 </section>;
}
