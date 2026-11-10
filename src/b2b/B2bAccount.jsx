import {b2bFetch} from './apiFetch.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {emptyListing} from '../networkStageD/defaults.mjs';
import '../networkStageAB/style.css';
import '../networkStageC/style.css';
import '../networkStageD/style.css';

const emptyProfile=()=>({contactName:'',contactRole:'',phone:'',vat:'',registeredAddress:{street:'',city:'',postalCode:'',country:''},roles:['SELLER'],speciesIds:[],authorityConfirmed:false});
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
    setProfile(session.company.profile??{...emptyProfile(),registeredAddress:{...emptyProfile().registeredAddress,country:session.company.country}});
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
    try{await request('/resend-verification',{email:data.get('email'),password:data.get('password')});}
    finally{form.elements.namedItem('password').value='';}
  },'If these details match an unverified account, a new confirmation email has been requested.');
  const field=(label,name,value,change,options={})=><label>{label}<input name={name} value={value} onChange={e=>change(e.target.value)} {...options}/></label>;
  const verified=auth?.company.status==='VERIFIED',editable=auth?.role==='COMPANY_ADMIN';
  async function openThread(item,after=null) {
    const epoch=generation.current;
    const result=await request('/messages?id='+item.id+(after==null?'':'&after='+after));
    if(epoch!==generation.current)return;
    setThread({...item,...result.enquiry});setMessages(old=>({...result,items:after==null?result.items:[...old.items,...result.items]}));
  }
  return <div className="seedtrade-network"><div className="ab-shell"><header><a href="/">SeedTrade.eu</a><a href="/b2b/register">Register company</a></header><main>
    <h1>Company account</h1><p role="status" aria-live="polite">{feedback}</p>
    {available!==true?<p>{available===null?'Checking account availability…':'Company accounts are currently unavailable.'}</p>:!auth?<>
      <p>Sign in after confirming your email. Company approval is required before creating offers or contacting sellers.</p>
      <form id="b2b-signin" aria-label="Company sign in" onSubmit={login}>
        <fieldset disabled={busy}><legend>Sign in</legend>
          <label>Business email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={1024}/></label>
          <button type="submit">Sign in</button>{resendAvailable&&<button type="button" onClick={resend}>Request new verification email</button>}
        </fieldset>
      </form>
    </>:<>
      <p>Signed in as {auth.user.email} · {auth.company.legalName}</p>
      <nav className="ab-actions"><a href="#company">Company</a><a href="#offers">My offers</a><a href="#market">Find seed</a><a href="#inquiries">Inquiries</a>{auth.platformAdmin&&<a href="#reviews">Company reviews</a>}</nav>
      <div className="ab-actions"><button disabled={busy} onClick={run(refresh,'Refreshed.')}>Refresh account</button><button disabled={busy} onClick={run(async()=>{generation.current++;await request('/logout',{});clearAccount();},'Signed out.')}>Sign out</button></div>
      <section id="company" aria-labelledby="company-title"><h2 id="company-title">Company identity and profile</h2>
        <p role="status" data-company-review={auth.company.status}>{statusText[auth.company.status]}</p>
        {auth.company.reviewReason&&<p>Reviewer feedback: {auth.company.reviewReason}</p>}
        <p>Saving company changes requests a new review and returns published offers to draft.</p>
        <form aria-label="Company profile" onSubmit={run(async()=>{await request('/profile',{version:auth.company.version,company:identity,profile});await refresh();},'Company profile submitted for review.')}>
          <fieldset disabled={busy||!editable}><legend>Company details</legend>
            {field('Legal company name','legalName',identity.legalName,v=>setIdentity({...identity,legalName:v}),{required:true,minLength:2,maxLength:255})}
            {field('Registration country (ISO 2 letters)','registrationCountry',identity.registrationCountry,v=>setIdentity({...identity,registrationCountry:v.toUpperCase()}),{required:true,pattern:'[A-Z]{2}',maxLength:2})}
            {field('Registration number','registrationNumber',identity.registrationNumber,v=>setIdentity({...identity,registrationNumber:v}),{required:true,minLength:2,maxLength:100})}
            {['contactName','contactRole','phone','vat'].map((name,index)=><React.Fragment key={name}>{field(['Contact name','Contact role','Phone (optional)','VAT number (optional)'][index],name,profile[name],v=>setProfile({...profile,[name]:v}),{required:name==='contactName',maxLength:name==='contactName'?100:name==='contactRole'?80:50})}</React.Fragment>)}
            <fieldset><legend>Registered address</legend>{['street','city','postalCode','country'].map(name=><React.Fragment key={name}>{field(({street:'Street',city:'City',postalCode:'Postal code',country:'Address country (ISO 2 letters)'})[name],name,profile.registeredAddress[name],v=>setProfile({...profile,registeredAddress:{...profile.registeredAddress,[name]:name==='country'?v.toUpperCase():v}}),{required:true,maxLength:name==='country'?2:name==='street'?200:name==='city'?100:20,...(name==='country'?{pattern:'[A-Z]{2}'}:{})})}</React.Fragment>)}</fieldset>
            <label>Company activities<select name="roles" multiple required value={profile.roles} onChange={e=>setProfile({...profile,roles:Array.from(e.target.selectedOptions,o=>o.value)})}>{['BUYER','SELLER','PRODUCER'].map(role=><option key={role}>{role}</option>)}</select></label>
            <label>Seed species (optional)<select name="speciesIds" multiple value={profile.speciesIds} onChange={e=>setProfile({...profile,speciesIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{catalogue.map(c=><option key={c.id} value={c.id}>{c.name} — {c.botanical}</option>)}</select></label>
            <label className="ab-check"><input name="authorityConfirmed" type="checkbox" required checked={profile.authorityConfirmed} onChange={e=>setProfile({...profile,authorityConfirmed:e.target.checked})}/>I am authorized to represent this company.</label>
            <button type="submit">Submit company profile</button>
          </fieldset>
        </form>
      </section>
      <section id="offers" className="stage-d"><h2>My seed offers</h2>
        {!verified&&<p>Your company must be approved before creating or publishing offers.</p>}
        <ul>{own.items.map(o=><li key={o.id}>{o.species?.name??o.cropId} · {o.quantity} {o.unit} · {o.status} · expires {o.validUntil}
          <button type="button" disabled={busy||o.status!=='DRAFT'||!verified||!editable} onClick={()=>setOffer({...o,quantity:String(o.quantity),priceAmount:o.priceAmount==null?'':String(o.priceAmount)})}>Edit draft {o.id}</button>
          <button type="button" disabled={busy||o.status!=='DRAFT'||!verified||!editable} onClick={run(async()=>{await request('/offers/publish',{id:o.id,version:o.version});await refresh();},'Offer published.')}>Publish offer {o.id}</button>
          <button type="button" disabled={busy||o.status==='CLOSED'||!editable} onClick={run(async()=>{await request('/offers/close',{id:o.id,version:o.version});await refresh();},'Offer closed.')}>Close offer {o.id}</button>
        </li>)}</ul>{own.next&&<button disabled={busy} onClick={run(()=>loadPage('own',own.next,true),'More offers loaded.')}>More my offers</button>}
        <button disabled={busy||!verified||!editable} onClick={()=>setOffer(emptyOffer())}>New offer</button>
        <form aria-label="Seed offer" onSubmit={run(async()=>{await request('/offers/save',{...offer,quantity:Number(offer.quantity),priceAmount:offer.priceAmount===''?null:Number(offer.priceAmount)});setOffer(emptyOffer());await refresh();},'Offer saved as draft.')}>
          <fieldset disabled={busy||!verified||!editable}><legend>{offer.id?'Edit draft':'New seed offer'}</legend>
            <label>Seed species<select name="cropId" required value={offer.cropId} onChange={e=>setOffer({...offer,cropId:e.target.value})}><option value="">Select species</option>{catalogue.map(c=><option key={c.id} value={c.id}>{c.name} — {c.botanical}</option>)}</select></label>
            {field('Quantity','quantity',offer.quantity,v=>setOffer({...offer,quantity:v}),{required:true,type:'number',min:0.001,max:1e9,step:0.001})}
            <label>Quantity unit<select name="unit" value={offer.unit} onChange={e=>setOffer({...offer,unit:e.target.value})}><option value="kg">kg</option><option value="t">tonnes</option></select></label>
            {field('Price (EUR per selected unit, optional)','priceAmount',offer.priceAmount,v=>setOffer({...offer,priceAmount:v}),{type:'number',min:0,max:1e9,step:0.01})}
            <label>Seed status<select name="seedCategory" value={offer.seedCategory} onChange={e=>setOffer({...offer,seedCategory:e.target.value})}><option value="SOWING_STATUS_UNKNOWN">Sowing status not specified</option><option value="CERTIFIED_SOWING">Certified sowing seed</option><option value="NON_CERTIFIED_SOWING">Non-certified sowing seed</option></select></label>
            {field('Seed origin country (ISO 2 letters)','originCountry',offer.originCountry,v=>setOffer({...offer,originCountry:v.toUpperCase()}),{required:true,pattern:'[A-Z]{2}',maxLength:2})}
            {field('Valid until','validUntil',offer.validUntil,v=>setOffer({...offer,validUntil:v}),{required:true,type:'date'})}
            <button type="submit">Save offer draft</button>
          </fieldset>
        </form>
      </section>
      <section id="market" className="stage-d"><h2>Find seed offers</h2>
        {!verified?<p>Company approval is required to browse trading offers.</p>:<>
          <button disabled={busy} onClick={run(()=>loadPage('market'),'Offers refreshed.')}>Refresh offers</button>
          {!market.items.length&&<p>No current offers from other approved companies.</p>}
          {market.items.map(o=><article key={o.id}><h3>{o.species?.name??o.cropId} — {o.companyName}</h3><p>{o.quantity} {o.unit} · {o.priceAmount==null?'Price on inquiry':`EUR ${o.priceAmount} / ${o.unit}`} · origin {o.originCountry} · expires {o.validUntil}</p>
            <form aria-label={'Inquiry for offer '+o.id} onSubmit={event=>{const form=event.currentTarget,data=new FormData(form);run(async()=>{await request('/enquiries/send',{offerId:o.id,body:data.get('message')});form.reset();await loadPage('inbox');},'Inquiry sent to the seller.')(event);}}>
              <label>Message to seller<textarea name="message" required maxLength={2000} disabled={busy}/></label><button disabled={busy} type="submit">Send inquiry</button>
            </form>
          </article>)}{market.next&&<button disabled={busy} onClick={run(()=>loadPage('market',market.next,true),'More offers loaded.')}>More offers</button>}
        </>}
      </section>
      <section id="inquiries" className="stage-d"><h2>Buyer and seller inquiries</h2><p>Messages stay private to the buyer and seller companies. Do not include sensitive documents or payment credentials.</p>
        <button disabled={busy} onClick={run(()=>loadPage('inbox'),'Inquiries refreshed.')}>Refresh inquiries</button>
        {!inbox.items.length&&<p>No inquiries yet.</p>}
        <ul>{inbox.items.map(item=><li key={item.id}><button disabled={busy} onClick={run(()=>openThread(item),'Inquiry opened.')}>{item.buyerName} → {item.sellerName} · {item.cropId} · {item.status}</button></li>)}</ul>
        {inbox.next&&<button disabled={busy} onClick={run(()=>loadPage('inbox',inbox.next,true),'More inquiries loaded.')}>More inquiries</button>}
        {thread&&<article aria-label="Inquiry conversation"><h3>Inquiry {thread.id}</h3><button disabled={busy} onClick={run(()=>openThread(thread),'Conversation refreshed.')}>Refresh conversation</button>
          {messages.items.map(message=><p key={message.id}><b>{message.authorCompanyId===auth.company.id?'Your company':'Counterparty'}:</b> {message.body}</p>)}
          {messages.next&&<button disabled={busy} onClick={run(()=>openThread(thread,messages.next),'More messages loaded.')}>More messages</button>}
          <form aria-label="Inquiry reply" onSubmit={event=>{const form=event.currentTarget,data=new FormData(form);run(async()=>{await request('/enquiries/reply',{id:thread.id,body:data.get('message')});form.reset();await openThread(thread);await loadPage('inbox');},'Reply saved.')(event);}}>
            <fieldset disabled={busy||!verified||thread.status==='CLOSED'}><legend>Reply</legend><label>Message<textarea name="message" required maxLength={2000}/></label><button type="submit">Send reply</button></fieldset>
          </form><button disabled={busy||thread.status==='CLOSED'} onClick={run(async()=>{await request('/enquiries/close',{id:thread.id});setThread({...thread,status:'CLOSED'});await loadPage('inbox');},'Inquiry closed.')}>Close inquiry</button>
        </article>}
      </section>
      {auth.platformAdmin&&<section id="reviews" className="stage-d"><h2>Company reviews</h2><p>Review identity evidence before approving a company. Email confirmation alone is not company approval.</p>
        {reviews.items.map(c=><article key={c.id}><h3>{c.legalName} · {c.country} · {c.number}</h3><p>{statusText[c.status]}</p>
          {c.profile&&<p>{c.profile.contactName} · {c.profile.registeredAddress.street}, {c.profile.registeredAddress.city}, {c.profile.registeredAddress.postalCode}, {c.profile.registeredAddress.country} · {c.profile.roles.join(', ')}</p>}
          <form aria-label={'Review company '+c.id} onSubmit={event=>{const data=new FormData(event.currentTarget);run(async()=>{await request('/companies/review',{companyId:c.id,version:c.version,status:data.get('decision'),reason:data.get('reason')});await refresh();},'Company review saved.')(event);}}>
            <fieldset disabled={busy||c.id===auth.company.id}><legend>Company decision</legend><label>Decision<select name="decision" defaultValue={c.profile?'VERIFIED':'MORE_INFO'}><option value="VERIFIED" disabled={!c.profile}>Approve</option><option value="MORE_INFO">Request more information</option><option value="REJECTED">Reject</option></select></label><label>Review reason<input name="reason" required maxLength={100}/></label><button type="submit">Save company decision</button></fieldset>
          </form>
        </article>)}{reviews.next&&<button disabled={busy} onClick={run(()=>loadPage('reviews',reviews.next,true),'More reviews loaded.')}>More company reviews</button>}
      </section>}
    </>}
    <footer><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/">Public SeedTrade website</a></footer>
  </main></div></div>;
}
