import './marketplaceUi.css';
import CompanyProfile from './CompanyProfile.jsx';
import ListingPreferences from './ListingPreferences.jsx';
import EnquiryConfirmation from './EnquiryConfirmation.jsx';
import {simpleFullTerms} from '../../shared/simpleBrokerageTerms.mjs';
import TradingWorkspace from './TradingWorkspace.jsx';
import {tradingMessages} from './tradingMessages.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {useLanguage,useT} from '../i18n/index.jsx';
import {b2bFetch} from './apiFetch.mjs';
import B2bNavigation from './B2bNavigation.jsx';
import SellerOffers from './SellerOffers.jsx';
import BuyerDiscovery from './BuyerDiscovery.jsx';
import {buyerMessages} from './buyerMessages.mjs';
import Conversations from './Messaging.jsx';
import {messagingMessages} from './messagingMessages.mjs';

export default function B2bMemberPage(){
  const t=useT(),{language}=useLanguage(),reset=window.location.pathname.replace(/\/$/,'')==='/b2b/reset-password';
  const [capability,setCapability]=useState(null),[session,setSession]=useState(null),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[show,setShow]=useState(false);
  const enquiryCredential=useRef(null);
  const credential=useRef(null),sending=useRef(false);
  const [tradingPolicy,setTradingPolicy]=useState(null);
  useEffect(()=>{if(capability?.tradingAvailable!==true||!session)return;let live=true;b2bFetch('/api/b2b/v1/trading/policy').then(async r=>{if(!r.ok)return;const p=await r.json();if(live)setTradingPolicy(p);}).catch(()=>{});return()=>{live=false};},[capability?.tradingAvailable,session?.user?.id]);
  useEffect(()=>{
    if(new URLSearchParams(location.search).get('view')==='confirm-enquiry'&&enquiryCredential.current===null){const p=new URLSearchParams(location.hash.slice(1));enquiryCredential.current={id:Number(p.get('enquiry')),token:p.get('token')};history.replaceState(history.state,'',location.pathname+location.search);}
    if(reset&&credential.current===null){
      const fragment=new URLSearchParams(window.location.hash.slice(1)),userId=Number(fragment.get('user')),token=fragment.get('token');
      // Strip secrets before fetching anything. Never persist credentials in storage.
      window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
      credential.current=Number.isSafeInteger(userId)&&userId>0&&/^[a-f0-9]{64}$/.test(token??'')?{userId,token}:false;
    }
    let active=true;
    b2bFetch('/api/b2b/v1/status').then(async r=>r.ok?r.json():{}).then(async state=>{
      if(!active)return;setCapability(state);
      if(!reset&&state.memberSignInAvailable===true){const r=await b2bFetch('/api/b2b/v1/session');const s=await r.json();if(active&&r.ok)setSession(s);}
    }).catch(()=>{if(active)setCapability({});});
    return()=>{active=false;};
  },[]);
  async function submit(event){
    event.preventDefault();if(sending.current||!credential.current||capability?.passwordResetAvailable!==true)return;
    const form=event.currentTarget,data=new FormData(form);setFeedback('');
    if(String(data.get('password')).length<12||String(data.get('password')).length>1024){setFeedback('Use a password of 12–1024 characters.');form.elements.namedItem('password').focus();return;}
    if(data.get('password')!==data.get('confirmPassword')){setFeedback('Passwords must match.');return;}
    sending.current=true;setBusy(true);
    try{
      const r=await b2bFetch('/api/b2b/v1/password-reset/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credential.current,password:data.get('password')})});
      const result=await r.json();
      if(r.ok&&result.status==='PASSWORD_RESET'){credential.current=false;setDone(true);setFeedback('Your password has been reset. Please sign in with your new password.');}
      else if(r.status===429)setFeedback('Too many attempts. Please try again later.');
      else if(r.status===400){credential.current=false;setFeedback('This reset link is invalid, expired or already used. Please request a new link.');}
      else setFeedback('Member access is currently unavailable. Please try again later.');
    }catch{setFeedback('We could not confirm the reset result. Please try signing in or request a new link.');}
    finally{form.reset();setShow(false);sending.current=false;setBusy(false);}
  }
  async function logout(){
    if(busy||!session)return;setBusy(true);
    try{const r=await b2bFetch('/api/b2b/v1/logout',{method:'POST',headers:{'Content-Type':'application/json','X-SeedTrade-CSRF':session.csrfToken},body:'{}'});if(r.ok){setSession(null);setFeedback('You have signed out.');}else setFeedback('Member access is currently unavailable. Please try again later.');}
    catch{setFeedback('Member access is currently unavailable. Please try again later.');}finally{setBusy(false);}
  }
  const query=new URLSearchParams(window.location.search),memberView=query.get('view')??(query.has('enquiry')?'conversation':'seller'),marketplaceView=memberView==='marketplace',tradingView=memberView==='transactions',messagingView=['inbox','sent','conversation'].includes(memberView);
  const mt=key=>tradingMessages[language]?.[key]??messagingMessages[language]?.[key]??buyerMessages[language]?.[key]??t(key);
  const available=reset?capability?.passwordResetAvailable===true:capability?.memberSignInAvailable===true;
  return <main className="member-page"><p className="member-eyebrow">SEEDTRADE.EU</p><h1>{t(reset?'Reset your password':'Member account')}</h1>
    {!available&&<p role="status">{t(capability===null?'Checking member access…':'Member access is currently unavailable. Please try again later.')}</p>}
    {reset&&available&&!done&&(credential.current?<form noValidate onSubmit={submit} aria-label={t('Reset your password')}>
      <label htmlFor="new-password">{t('New password')}</label><div className="member-password"><input id="new-password" name="password" autoComplete="new-password" type={show?'text':'password'} required minLength={12} maxLength={1024} disabled={busy} aria-describedby="reset-guidance"/><button type="button" aria-label={t(show?'Hide password':'Show password')} aria-pressed={show} aria-controls="new-password" disabled={busy} onClick={()=>setShow(!show)}>{t(show?'Hide':'Show')}</button></div>
      <p id="reset-guidance">{t('Use at least 12 characters. A unique passphrase is a good choice.')}</p>
      <label htmlFor="confirm-password">{t('Confirm new password')}</label><input id="confirm-password" name="confirmPassword" type={show?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={1024} disabled={busy}/>
      <button type="submit" className="member-primary" disabled={busy}>{t(busy?'Please wait…':'Reset password')}</button>
    </form>:<p role="status">{t('This reset link is invalid, expired or already used. Please request a new link.')}</p>)}
    {!reset&&session&&<><p>{session.user?.email}</p><p><strong>{session.company?.legalName}</strong></p><p>{t('Company status')}: {t(({PENDING:'Pending review',VERIFIED:'Verified company',MORE_INFO:'More information required',REJECTED:'Company not approved'})[session.company?.status]??'Pending review')}</p>{session.company.status==='PENDING'&&<p className="member-status member-status-pending" role="status">{t('Your email is verified. Your company is pending approval. We will email the decision; you can keep using your account.')}</p>}{capability?.buyerDiscoveryAvailable===true&&<nav className="member-market-nav" aria-label={mt('Member marketplace navigation')}><a href={'/b2b/account?view=seller&lang='+language.toLowerCase()} aria-current={!marketplaceView&&!messagingView&&!tradingView?'page':undefined}>{t('My listings')}</a><a href={'/b2b/account?view=marketplace&lang='+language.toLowerCase()} aria-current={marketplaceView?'page':undefined}>{t('Browse listings')}</a>{capability?.tradingAvailable===true&&!capability?.simpleMarketplace&&<a href={'/b2b/account?view=transactions&lang='+language.toLowerCase()} aria-current={tradingView?'page':undefined}>{mt('Transactions')}</a>}{capability?.enquiriesAvailable===true&&<><a href={'/b2b/account?view=inbox&lang='+language.toLowerCase()} aria-current={memberView==='inbox'?'page':undefined}>{mt('Inbox')}</a><a href={'/b2b/account?view=sent&lang='+language.toLowerCase()} aria-current={memberView==='sent'?'page':undefined}>{mt('Sent enquiries')}</a></>}</nav>}
    {capability?.simpleMarketplace&&memberView==='seller'&&session.company.status!=='VERIFIED'&&<CompanyProfile session={session} onSaved={setSession}/>}
    {capability?.simpleMarketplace&&memberView==='seller'&&<ListingPreferences session={session}/>}
    {capability?.simpleMarketplace&&memberView==='confirm-enquiry'?<EnquiryConfirmation session={session} credential={enquiryCredential.current}/>:capability?.simpleMarketplace&&memberView==='brokerage-terms'?<section><h2>{t('Read Full Brokerage Terms')}</h2>{!tradingPolicy?.publicationApproved&&<p>{t('Draft for owner review — not published terms')}</p>}{simpleFullTerms[language].map((p,i)=><p key={i}>{p}</p>)}</section>:capability?.tradingAvailable===true&&tradingView&&!capability?.simpleMarketplace?<TradingWorkspace session={session} onExpired={()=>setSession(null)}/>:capability?.enquiriesAvailable===true&&messagingView?<Conversations session={session} tradingAvailable={capability?.tradingAvailable===true&&!capability?.simpleMarketplace} view={memberView} onExpired={()=>setSession(null)}/>:capability?.buyerDiscoveryAvailable===true&&marketplaceView?<BuyerDiscovery session={session} tradingAvailable={capability?.tradingAvailable===true} onExpired={()=>setSession(null)} enquiriesAvailable={capability?.enquiriesAvailable===true} simpleMarketplace={capability?.simpleMarketplace===true}/>:capability?.sellerOffersAvailable===true?<SellerOffers session={session} tradingPolicy={tradingPolicy} tradingRequired={capability?.tradingAvailable===true} onExpired={()=>setSession(null)}/>:<p>{t('Marketplace functions are not available in this registration phase.')}</p>}<button type="button" className="member-primary" disabled={busy} onClick={logout}>{t('Sign out')}</button></>}
    {feedback&&<p className="member-status" role="status">{t(feedback)}</p>}
    {(!session||reset)&&<B2bNavigation onAuthenticated={setSession}/>}
    <p><a href={'/b2b/register?lang='+language.toLowerCase()}>{t('Register company')}</a></p>
  </main>;
}
