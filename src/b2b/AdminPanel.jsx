import TradingWorkspace from './TradingWorkspace.jsx';
import React,{useEffect,useState,useRef} from 'react';
import {useLanguage} from '../i18n/index.jsx';
import {b2bFetch} from './apiFetch.mjs';
import CompanyReview from './CompanyReview.jsx';
import {adminMessages} from './adminMessages.mjs';
import './companyReview.css';
export default function AdminPanel(){
 const {language}=useLanguage(),t=k=>adminMessages[language]?.[k]??adminMessages.EN[k]??k;
 const [session,setSession]=useState(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function request(path,body){const r=await b2bFetch('/api/b2b/v1/admin/'+path,body?{method:'POST',headers:{'Content-Type':'application/json',...(session?{'X-SeedTrade-CSRF':session.csrfToken}:{})},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok){if(r.status===401)setSession(null);throw Error(r.status===429?'limited':r.status===404?'unavailable':'failed');}return d;}
 useEffect(()=>{let live=true;request('session').then(s=>{if(live)setSession(s)}).catch(e=>{if(live&&e.message==='unavailable')setError('unavailable')}).finally(()=>{if(live)setReady(true)});return()=>{live=false}},[]);
 async function submit(e){e.preventDefault();if(lock.current)return;const form=e.currentTarget,values=new FormData(form);if(!form.checkValidity())return;lock.current=true;setBusy(true);setError('');try{setSession(await request('login',{email:values.get('email'),password:values.get('password'),otp:values.get('otp')}));}catch(e){setError(e.message)}finally{form.reset();lock.current=false;setBusy(false)}}
 return <main className="company-review"><h1>{t('title')}</h1><p>{t('separate')}</p>{!ready?<p role="status">{t('loading')}</p>:session?<><button type="button" disabled={busy} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await request('logout',{});setSession(null)}catch{setError('failed')}finally{lock.current=false;setBusy(false)}}}>{t('logout')}</button><CompanyReview session={session} onExpired={()=>setSession(null)}/>{session.tradingAvailable===true&&<TradingWorkspace operator session={session} onExpired={()=>setSession(null)}/>}</>:<form className="company-review-card" onSubmit={submit}><fieldset disabled={busy||error==='unavailable'}><label>{t('email')}<input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>{t('password')}<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={1024}/></label><label>{t('otp')}<input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label><button type="submit" disabled={!ready||busy}>{t('login')}</button></fieldset></form>}{error&&<p role="alert">{t(error)}</p>}</main>;
}
