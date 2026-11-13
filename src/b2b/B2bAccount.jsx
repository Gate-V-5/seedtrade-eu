import {useLanguage,useT} from '../i18n/index.jsx';
import legalRegistry from '../legal/registry.json';
import {b2bFetch} from './apiFetch.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {emptyListing} from '../networkStageD/defaults.mjs';
import '../networkStageAB/style.css';
import '../networkStageC/style.css';
import '../networkStageD/style.css';

const emptyProfile=()=>({contactName:'',contactRole:'',phone:'',vat:'',registeredAddress:{street:'',city:'',postalCode:'',country:''},roles:['SELLER'],speciesIds:[],authorityConfirmed:false,authorityDocumentId:legalRegistry.documents.authority.id});
const emptyOffer=()=>({cropId:'',quantity:'',unit:'kg',priceAmount:'',seedCategory:emptyListing().seedStatus,originCountry:'',validUntil:''});
const statusText={PENDING:'Pending company review',VERIFIED:'Company approved',MORE_INFO:'More company information required',REJECTED:'Company review rejected'};
const errorText={SIGN_IN_REQUIRED:'Please sign in again.',INVALID_CREDENTIALS:'Sign-in failed. Check your details and confirm your email first.',
  INVALID_REQUEST:'Please check all required fields.',RELOAD_REQUIRED:'This record changed. Refresh and try again.',
  COMPANY_APPROVAL_REQUIRED:'Your company must be approved before trading.',COMPANY_ADMIN_REQUIRED:'Only your company administrator can make this change.',
  ALREADY_EXISTS:'This record already exists. Check your company details or existing inquiries.',RATE_LIMITED:'Too many attempts. Please wait before trying again.',
  NOT_FOUND:'This record is unavailable.',DRAFT_REQUIRED:'Only drafts can be edited. Create a new offer for different terms.',
  VALID_DRAFT_REQUIRED:'Choose a current draft with a valid expiry date.',ENQUIRY_FORBIDDEN:'You cannot inquire about your own company offer.',
  ENQUIRY_CLOSED:'This inquiry is closed.',SELF_APPROVAL_FORBIDDEN:'Another reviewer must review your company.'};

export default function B2bAccount() {
  const t=useT(); const {language}=useLanguage();
  const [available,setAvailable]=useState(null),[auth,setAuth]=useState(null),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
  const [resendAvailable,setResendAvailable]=useState(false);
  const [profile,setProfile]=useState(emptyProfile),[identity,setIdentity]=useState({legalName:'',registrationCountry:'',registrationNumber:''});
  const [catalogue,setCatalogue]=useState([]),[own,setOwn]=useState({items:[],next:null}),[market,setMarket]=useState({items:[],next:null});
  const [inbox,setInbox]=useState({items:[],next:null}),[reviews,setReviews]=useState({items:[],next:null}),[offer,setOffer]=useState(emptyOffer);
  const [thread,setThread]=useState(null),[messages,setMessages]=useState({items:[],next:null});
  const csrf=useRef(''),working=useRef(false),mounted=useRef(false),generation=useRef(0);
  function clearAccount() {
    generation.current++;csrf.current='';setAuth(null);setIdentity({legalName:'',registrationCountry:'',registrationNumber:''});
    setProfile(emptyProfile());setOffer(emptyOffer());setCatalogue([]);setOwn({items:[],next:null});setMarket({items:[],next:null});
    setInbox({items:[],next:null});setReviews({items:[],next:null});setThread(null);setMessages({items:[],next:null});
  }
  async function request(route,body) {
    const epoch=generation.current;
    const response=await b2bFetch('/api/b2b/v1'+route,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',
      headers:body===undefined?{}:{'Content-Type':'application/json','X-SeedTrade-CSRF':csrf.current},body:body===undefined?undefined:JSON.stringify(body)});
    let result;try{result=await response.json();}catch{throw Error('UNAVAILABLE');}
    if(!response.ok){if(response.status===401&&epoch===generation.current)clearAccount();throw Error(result.error??'UNAVAILABLE');}
    if(result.csrfToken&&epoch===generation.current)csrf.current=result.csrfToken;
    return result;
  }
  async function loadPage(kind,after=null,append=false) {
    const epoch=generation.current;
    const query=after==null?'':`&after=${after}`;
    if(kind==='own'||kind==='market') {
      const result=await request('/offers?own='+(kind==='own'?'true':'false')+query),set=kind==='own'?setOwn:setMarket;
      if(epoch===generation.current)set(old=>({...result,items:append?[...old.items,...result.items]:result.items}));
    } else {
      const result=await request((kind==='reviews'?'/review-queue':'/enquiries')+(after==null?'':`?after=${after}`)),set=kind==='reviews'?setReviews:setInbox;
      if(epoch===generation.current)set(old=>({...result,items:append?[...old.items,...result.items]:result.items}));
    }
  }
  async function refresh() {
    const epoch=generation.current,session=await request('/session');if(epoch!==generation.current)return;setAuth(session);
    setIdentity({legalName:session.company.legalName,registrationCountry:session.company.country,registrationNumber:session.company.number});
    const loadedProfile=session.company.profile??{...emptyProfile(),registeredAddress:{...emptyProfile().registeredAddress,country:session.company.country}};
    setProfile({...loadedProfile,authorityConfirmed:false,authorityDocumentId:legalRegistry.documents.authority.id});
    const tasks=[request('/catalogue').then(r=>{if(epoch===generation.current)setCatalogue(r.items);}),loadPage('own'),loadPage('inbox')];
    if(session.company.status==='VERIFIED')tasks.push(loadPage('market'));else setMarket({items:[],next:null});
    if(session.platformAdmin)tasks.push(loadPage('reviews'));else setReviews({items:[],next:null});
    await Promise.all(tasks);
  }
  useEffect(()=>{
    mounted.current=true;
    (async()=>{try{
      const response=await b2bFetch('/api/b2b/v1/status',{cache:'no-store',credentials:'same-origin'});
      const state=response.ok?await response.json():{};if(!mounted.current)return;
      setAvailable(state.portalAvailable===true);
      setResendAvailable(state.verificationResendAvailable===true);
      if(state.portalAvailable===true)try{await refresh();}catch(error){if(error.message!=='SIGN_IN_REQUIRED')setFeedback('Company account is temporarily unavailable.');}
    }catch{if(mounted.current)setAvailable(false);}})();
    return()=>{mounted.current=false;};
  },[]);
  const run=(action,success='Saved.')=>async event=>{
    event?.preventDefault();if(working.current)return;
    working.current=true;setBusy(true);setFeedback('');
    try{await action();setFeedback(success);}catch(error){setFeedback(errorText[error.message]??'The service is temporarily unavailable. Please refresh and try again.');}
    finally{working.current=false;setBusy(false);}
  };
  const login=run(async()=>{
    clearAccount();
    const form=document.getElementById('b2b-signin'),data=new FormData(form);
    try{await request('/login',{email:data.get('email'),password:data.get('password')});form.reset();await refresh();}
    finally{form.elements.namedItem('password').value='';}
  },'Signed in.');
  const resend=run(async()=>{
    const form=document.getElementById('b2b-signin'),data=new FormData(form);
    try{await request('/resend-verification',{email:data.get('email'),password:data.get('password'),uiLanguage:language});}
    finally{form.elements.namedItem('password').value='';}
  },'If these details match an unverified account, a new confirmation email has been requested.');
  const field=(label,name,value,change,options={})=><label>{t(label)}<input name={name} value={value} onChange={e=>change(e.target.value)} {...options}/></label>;
  const verified=auth?.company.status==='VERIFIED',editable=auth?.role==='COMPANY_ADMIN';
  async function openThread(item,after=null) {
    const epoch=generation.current;
    const result=await request('/messages?id='+item.id+(after==null?'':'&after='+after));
    if(epoch!==generation.current)return;
    setThread({...item,...result.enquiry});setMessages(old=>({...result,items:after==null?result.items:[...old.items,...result.items]}));
  }
  return <div className="seedtrade-network"><div className="ab-shell"><header><a href="/">{t("SeedTrade.eu")}</a><a href="/b2b/register">{t("Register company")}</a></header><main>
    <h1>{t("Company account")}</h1><p role="status" aria-live="polite">{t(feedback)}</p>
    {available!==true?<p>{t(available===null?'Checking account availability…':'Company accounts are currently unavailable.')}</p>:!auth?<>
      <p>{t("Sign in after confirming your email. Company approval is required before creating offers or contacting sellers.")}</p>
      <form id="b2b-signin" aria-label={t("Company sign in")} onSubmit={login}>
        <fieldset disabled={busy}><legend>{t("Sign in")}</legend>
          <label>{t("Business email")}<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
          <label>{t("Password")}<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={1024}/></label>
          <button type="submit">{t("Sign in")}</button>{resendAvailable&&<button type="button" onClick={resend}>{t("Request new verification email")}</button>}
        </fieldset>
      </form>
    </>:<>
      <p>{t('Signed in as')} {auth.user.email} · {auth.company.legalName}</p>
      <nav className="ab-actions"><a href="#company">{t("Company")}</a><a href="#offers">{t("My offers")}</a><a href="#market">{t("Find seed")}</a><a href="#inquiries">{t("Inquiries")}</a>{auth.platformAdmin&&<a href="#reviews">{t("Company reviews")}</a>}</nav>
      <div className="ab-actions"><button disabled={busy} onClick={run(refresh,'Refreshed.')}>{t("Refresh account")}</button><button disabled={busy} onClick={run(async()=>{generation.current++;await request('/logout',{});clearAccount();},'Signed out.')}>{t("Sign out")}</button></div>
      <section id="company" aria-labelledby="company-title"><h2 id="company-title">{t("Company identity and profile")}</h2>
        <p role="status" data-company-review={auth.company.status}>{t(statusText[auth.company.status])}</p>
        {auth.company.reviewReason&&<p>{t('Reviewer feedback:')} {auth.company.reviewReason}</p>}
        <p>{t("Saving company changes requests a new review and returns published offers to draft.")}</p>
        <form aria-label={t("Company profile")} onSubmit={run(async()=>{await request('/profile',{version:auth.company.version,company:identity,profile});await refresh();},'Company profile submitted for review.')}>
          <fieldset disabled={busy||!editable}><legend>{t("Company details")}</legend>
            {field('Legal company name','legalName',identity.legalName,v=>setIdentity({...identity,legalName:v}),{required:true,minLength:2,maxLength:255})}
            {field('Registration country (ISO 2 letters)','registrationCountry',identity.registrationCountry,v=>setIdentity({...identity,registrationCountry:v.toUpperCase()}),{required:true,pattern:'[A-Z]{2}',maxLength:2})}
            {field('Registration number','registrationNumber',identity.registrationNumber,v=>setIdentity({...identity,registrationNumber:v}),{required:true,minLength:2,maxLength:100})}
            {['contactName','contactRole','phone','vat'].map((name,index)=><React.Fragment key={name}>{field(['Contact name','Contact role','Phone (optional)','VAT number (optional)'][index],name,profile[name],v=>setProfile({...profile,[name]:v}),{required:name==='contactName',maxLength:name==='contactName'?100:name==='contactRole'?80:50})}</React.Fragment>)}
            <fieldset><legend>{t("Registered address")}</legend>{['street','city','postalCode','country'].map(name=><React.Fragment key={name}>{field(({street:'Street',city:'City',postalCode:'Postal code',country:'Address country (ISO 2 letters)'})[name],name,profile.registeredAddress[name],v=>setProfile({...profile,registeredAddress:{...profile.registeredAddress,[name]:name==='country'?v.toUpperCase():v}}),{required:true,maxLength:name==='country'?2:name==='street'?200:name==='city'?100:20,...(name==='country'?{pattern:'[A-Z]{2}'}:{})})}</React.Fragment>)}</fieldset>
            <label>{t("Company activities")}<select name="roles" multiple required value={profile.roles} onChange={e=>setProfile({...profile,roles:Array.from(e.target.selectedOptions,o=>o.value)})}>{['BUYER','SELLER','PRODUCER'].map(role=><option key={role} value={role}>{t(role)}</option>)}</select></label>
            <label>{t("Seed species (optional)")}<select name="speciesIds" multiple value={profile.speciesIds} onChange={e=>setProfile({...profile,speciesIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{catalogue.map(c=><option key={c.id} value={c.id}>{t(c.name)} — {c.botanical}</option>)}</select></label>
            <label className="ab-check"><input name="authorityConfirmed" type="checkbox" required checked={profile.authorityConfirmed} onChange={e=>setProfile({...profile,authorityConfirmed:e.target.checked,authorityDocumentId:legalRegistry.documents.authority.id})}/><span lang="en">{legalRegistry.documents.authority.document.sections[0].text}</span> <a href={legalRegistry.documents.authority.path}>{t("Declaration version")}</a></label>
            <button type="submit">{t("Submit company profile")}</button>
          </fieldset>
        </form>
      </section>
      <section id="offers" className="stage-d"><h2>{t("My seed offers")}</h2>
        <p>{t("Published B2B offers are visible to other approved business users. Company name, species, quantity/unit, price/currency if supplied, seed status, origin and expiry are shown below. Contacts and private messages are not part of this offer preview.")} <a href="/terms#listing-rules">{t("Listing rules")}</a></p>
        <p>{t("By publishing, you confirm this offer is accurate and you are entitled to offer the seed. Certification and organic claims require applicable evidence; company approval does not verify seed quality. No sale is automatically concluded by publication.")}</p>
        {!verified&&<p>{t("Your company must be approved before creating or publishing offers.")}</p>}
        <ul>{own.items.map(o=><li key={o.id}>{auth.company.legalName} · {t(o.species?.name??o.cropId)} · {o.quantity} {o.unit} · {o.priceAmount==null?t('Price on inquiry'):`EUR ${o.priceAmount} / ${o.unit}`} · {t(o.seedCategory)} · {t('origin')} {o.originCountry} · {t(o.status)} · {t('expires')} {o.validUntil}
          <button type="button" disabled={busy||o.status!=='DRAFT'||!verified||!editable} onClick={()=>setOffer({...o,quantity:String(o.quantity),priceAmount:o.priceAmount==null?'':String(o.priceAmount)})}>{t('Edit draft {id}',{id:o.id})}</button>
          <button type="button" disabled={busy||o.status!=='DRAFT'||!verified||!editable} onClick={run(async()=>{await request('/offers/publish',{id:o.id,version:o.version});await refresh();},'Offer published.')}>{t('Publish offer {id}',{id:o.id})}</button>
          <button type="button" disabled={busy||o.status==='CLOSED'||!editable} onClick={run(async()=>{await request('/offers/close',{id:o.id,version:o.version});await refresh();},'Offer closed.')}>{t('Close offer {id}',{id:o.id})}</button>
        </li>)}</ul>{own.next&&<button disabled={busy} onClick={run(()=>loadPage('own',own.next,true),'More offers loaded.')}>{t("More my offers")}</button>}
        <button disabled={busy||!verified||!editable} onClick={()=>setOffer(emptyOffer())}>{t("New offer")}</button>
        <form aria-label={t("Seed offer")} onSubmit={run(async()=>{await request('/offers/save',{...offer,quantity:Number(offer.quantity),priceAmount:offer.priceAmount===''?null:Number(offer.priceAmount)});setOffer(emptyOffer());await refresh();},'Offer saved as draft.')}>
          <fieldset disabled={busy||!verified||!editable}><legend>{t(offer.id?'Edit draft':'New seed offer')}</legend>
            <label>{t("Seed species")}<select name="cropId" required value={offer.cropId} onChange={e=>setOffer({...offer,cropId:e.target.value})}><option value="">{t("Select species")}</option>{catalogue.map(c=><option key={c.id} value={c.id}>{t(c.name)} — {c.botanical}</option>)}</select></label>
            {field('Quantity','quantity',offer.quantity,v=>setOffer({...offer,quantity:v}),{required:true,type:'number',min:0.001,max:1e9,step:0.001})}
            <label>{t("Quantity unit")}<select name="unit" value={offer.unit} onChange={e=>setOffer({...offer,unit:e.target.value})}><option value="kg">{t("kg")}</option><option value="t">{t("tonnes")}</option></select></label>
            {field('Price (EUR per selected unit, optional)','priceAmount',offer.priceAmount,v=>setOffer({...offer,priceAmount:v}),{type:'number',min:0,max:1e9,step:0.01})}
            <label>{t("Seed status")}<select name="seedCategory" value={offer.seedCategory} onChange={e=>setOffer({...offer,seedCategory:e.target.value})}><option value="SOWING_STATUS_UNKNOWN">{t("Sowing status not specified")}</option><option value="CERTIFIED_SOWING">{t("Certified sowing seed")}</option><option value="NON_CERTIFIED_SOWING">{t("Non-certified sowing seed")}</option></select></label>
            {field('Seed origin country (ISO 2 letters)','originCountry',offer.originCountry,v=>setOffer({...offer,originCountry:v.toUpperCase()}),{required:true,pattern:'[A-Z]{2}',maxLength:2})}
            {field('Valid until','validUntil',offer.validUntil,v=>setOffer({...offer,validUntil:v}),{required:true,type:'date'})}
            <button type="submit">{t("Save offer draft")}</button>
          </fieldset>
        </form>
      </section>
      <section id="market" className="stage-d"><h2>{t("Find seed offers")}</h2>
        {!verified?<p>{t("Company approval is required to browse trading offers.")}</p>:<>
          <button disabled={busy} onClick={run(()=>loadPage('market'),'Offers refreshed.')}>{t("Refresh offers")}</button>
          {!market.items.length&&<p>{t("No current offers from other approved companies.")}</p>}
          {market.items.map(o=><article key={o.id}><h3>{t(o.species?.name??o.cropId)} — {o.companyName}</h3><p>{o.quantity} {o.unit} · {o.priceAmount==null?t('Price on inquiry'):`EUR ${o.priceAmount} / ${o.unit}`} · {t('origin')} {o.originCountry} · {t('expires')} {o.validUntil}</p>
            <p>{t('Seller-declared seed status:')} {t(o.seedCategory)}. {t('Company approval does not certify this seed.')}</p>
            <form aria-label={t('Inquiry for offer {id}',{id:o.id})} onSubmit={event=>{const form=event.currentTarget,data=new FormData(form);run(async()=>{await request('/enquiries/send',{offerId:o.id,body:data.get('message')});form.reset();await loadPage('inbox');},'Inquiry sent to the seller.')(event);}}>
              <p>{t("Your enquiry will be sent to this offer's seller and visible to your two companies. Do not include unnecessary personal data.")} <a href="/terms#enquiries">{t("B2B Terms")}</a></p><label>{t("Message to seller")}<textarea name="message" required maxLength={2000} disabled={busy}/></label><button disabled={busy} type="submit">{t("Send inquiry")}</button>
            </form>
          </article>)}{market.next&&<button disabled={busy} onClick={run(()=>loadPage('market',market.next,true),'More offers loaded.')}>{t("More offers")}</button>}
        </>}
      </section>
      <section id="inquiries" className="stage-d"><h2>{t("Buyer and seller inquiries")}</h2><p>{t("Messages stay private to the buyer and seller companies. Do not include sensitive documents or payment credentials.")}</p>
        <button disabled={busy} onClick={run(()=>loadPage('inbox'),'Inquiries refreshed.')}>{t("Refresh inquiries")}</button>
        {!inbox.items.length&&<p>{t("No inquiries yet.")}</p>}
        <ul>{inbox.items.map(item=><li key={item.id}><button disabled={busy} onClick={run(()=>openThread(item),'Inquiry opened.')}>{item.buyerName} → {item.sellerName} · {item.cropId} · {t(item.status)}</button></li>)}</ul>
        {inbox.next&&<button disabled={busy} onClick={run(()=>loadPage('inbox',inbox.next,true),'More inquiries loaded.')}>{t("More inquiries")}</button>}
        {thread&&<article aria-label={t("Inquiry conversation")}><h3>{t('Inquiry {id}',{id:thread.id})}</h3><button disabled={busy} onClick={run(()=>openThread(thread),'Conversation refreshed.')}>{t("Refresh conversation")}</button>
          {messages.items.map(message=><p key={message.id}><b>{t(message.authorCompanyId===auth.company.id?'Your company':'Counterparty')}:</b> {message.body}</p>)}
          {messages.next&&<button disabled={busy} onClick={run(()=>openThread(thread,messages.next),'More messages loaded.')}>{t("More messages")}</button>}
          <form aria-label={t("Inquiry reply")} onSubmit={event=>{const form=event.currentTarget,data=new FormData(form);run(async()=>{await request('/enquiries/reply',{id:thread.id,body:data.get('message')});form.reset();await openThread(thread);await loadPage('inbox');},'Reply saved.')(event);}}>
            <fieldset disabled={busy||!verified||thread.status==='CLOSED'}><legend>{t("Reply")}</legend><label>{t("Message")}<textarea name="message" required maxLength={2000}/></label><button type="submit">{t("Send reply")}</button></fieldset>
          </form><button disabled={busy||thread.status==='CLOSED'} onClick={run(async()=>{await request('/enquiries/close',{id:thread.id});setThread({...thread,status:'CLOSED'});await loadPage('inbox');},'Inquiry closed.')}>{t("Close inquiry")}</button>
        </article>}
      </section>
      {auth.platformAdmin&&<section id="reviews" className="stage-d"><h2>{t("Company reviews")}</h2><p>{t("Review identity evidence before approving a company. Email confirmation alone is not company approval.")}</p>
        {reviews.items.map(c=><article key={c.id}><h3>{c.legalName} · {c.country} · {c.number}</h3><p>{t(statusText[c.status])}</p>
          {c.profile&&<p>{c.profile.contactName} · {c.profile.registeredAddress.street}, {c.profile.registeredAddress.city}, {c.profile.registeredAddress.postalCode}, {c.profile.registeredAddress.country} · {c.profile.roles.map(role=>t(role)).join(', ')}</p>}
          <form aria-label={t('Review company {id}',{id:c.id})} onSubmit={event=>{const data=new FormData(event.currentTarget);run(async()=>{await request('/companies/review',{companyId:c.id,version:c.version,status:data.get('decision'),reason:data.get('reason')});await refresh();},'Company review saved.')(event);}}>
            <fieldset disabled={busy||c.id===auth.company.id}><legend>{t("Company decision")}</legend><label>{t("Decision")}<select name="decision" defaultValue={c.profile?'VERIFIED':'MORE_INFO'}><option value="VERIFIED" disabled={!c.profile}>{t("Approve")}</option><option value="MORE_INFO">{t("Request more information")}</option><option value="REJECTED">{t("Reject")}</option></select></label><label>{t("Review reason")}<input name="reason" required maxLength={100}/></label><button type="submit">{t("Save company decision")}</button></fieldset>
          </form>
        </article>)}{reviews.next&&<button disabled={busy} onClick={run(()=>loadPage('reviews',reviews.next,true),'More reviews loaded.')}>{t("More company reviews")}</button>}
      </section>}
    </>}
    <footer><a href="/legal/report/">{t("Report content")}</a> · <a href="/privacy">{t("Privacy")}</a> · <a href="/terms">{t("Terms")}</a> · <a href="/">{t("Public SeedTrade website")}</a></footer>
  </main></div></div>;
}
