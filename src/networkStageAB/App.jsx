import React,{useEffect,useRef,useState} from 'react'
import {copy,languages} from './copy.mjs'
import {messages} from '../i18n/messages.js'
import ListingsPanel from '../networkStageD/ListingsPanel.jsx'
import CompanyReviewStatus from '../networkStageC/CompanyReviewStatus.jsx'
import './style.css'
import PrivateMarketplace from '../networkReview/PrivateMarketplace.jsx'
import {networkText} from '../networkReview/copy.mjs'

const emptyAddress=()=>({street:'',city:'',postalCode:'',country:''})
const emptyProfile=()=>({legalName:'',registrationNumber:'',registrationExplanation:'',vat:'',registeredAddress:emptyAddress(),correspondenceAddress:null,productionAddress:null,contactName:'',contactRole:'',phone:'',roles:[],speciesIds:[],countries:[],authorityConfirmed:false})
export default function App({request=fetch,embedded=false,initialLanguage="EN",entry="join",onMemberSessionChange=()=>{},initialSession=null}){
 const[lang,setLang]=useState(initialLanguage),[boot,setBoot]=useState(initialSession?.bootstrap||null),[step,setStep]=useState(initialSession?'profile':entry==='signin'?'signin':'register'),[token,setToken]=useState(''),[next,setNext]=useState(''),[notice,setNotice]=useState(null),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false)
 const[form,setForm]=useState({company:'',email:'',country:'',role:'',termsAccepted:false,marketing:false}),[choices,setChoices]=useState({termsAccepted:false,marketing:false}),[profile,setProfile]=useState(emptyProfile),[marketing,setMarketing]=useState(false)
 const[companyReview,setCompanyReview]=useState(null)
 const Content=embedded?'section':'main';
 const csrf=useRef(initialSession?.csrf||''),generation=useRef(0);const t=k=>copy(lang,k)
 const call=async(route,body={},extra={})=>{
  const response=await request('/api/network-preview'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-SeedTrade-CSRF':csrf.current,...extra},body:JSON.stringify(body)})
  const result=await response.json();if(!response.ok){if(response.status===401)onMemberSessionChange(null);throw Error('STEP_FAILED')};if(result.csrf)csrf.current=result.csrf;return result
 }
 const run=fn=>async e=>{e?.preventDefault();if(busy)return;setBusy(true);setFeedback('');try{await fn()}catch{setFeedback(t('error'))}finally{setBusy(false)}}
 const refreshReview=async()=>{const r=await call('/profile/read');setCompanyReview(r.companyReview||null);onMemberSessionChange(r);return r}
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.slice(1)),purpose=fragment.get('purpose'),secret=fragment.get('token')
  const legal=new URL(window.location.href).searchParams.get('notice');if(['privacy','terms','legal'].includes(legal))setNotice(legal)
  // Never put a bearer token into storage, analytics, referrers or errors.
  window.history.replaceState(null,'',window.location.pathname)
  if(secret&&['EMAIL','PROFILE'].includes(purpose)){setToken(secret);setStep(purpose==='EMAIL'?'confirm':'exchange')}
 },[])
 useEffect(()=>{if(embedded&&initialLanguage!==lang)setLang(initialLanguage)},[embedded,initialLanguage])
 useEffect(()=>{setStep(current=>['register','signin'].includes(current)?entry==='signin'?'signin':'register':current)},[entry])
 useEffect(()=>{if(initialSession)return;document.documentElement.lang=lang.toLowerCase();if(boot&&['profile','confirmed','exchange'].includes(step))return;const n=++generation.current;call('/bootstrap',{locale:lang}).then(r=>{if(n===generation.current){setBoot(r);setChoices({termsAccepted:false,marketing:false})}}).catch(()=>setFeedback(t('error')))},[lang])
 useEffect(()=>{if(initialSession)refreshReview().then(r=>{if(r.profile)setProfile(r.profile);setMarketing(Boolean(r.marketing))}).catch(()=>setFeedback(t('error')))},[])
 const input=(key,object,update,type='text',required=false)=><label key={key}>{t(key)}<input name={key} type={type} maxLength={key==='email'?254:200} required={required} value={object[key]} onChange={e=>update({...object,[key]:e.target.value})}/></label>
 const country=(value,onChange)=><select required value={value} onChange={e=>onChange(e.target.value)} aria-label={t('country')}><option value="">{t('select')}</option>{boot?.countries.map(c=><option key={c} value={c}>{new Intl.DisplayNames([lang.toLowerCase()],{type:'region'}).of(c)}</option>)}</select>
 const legalLinks=<p className="ab-legal-links">{['privacy','terms','legal'].map(k=><a key={k} href={'?notice='+k} onClick={e=>{e.preventDefault();setNotice(k)}}>{t(k)}</a>)}</p>
 const choiceFields=(value,set)=><><label className="ab-check"><input type="checkbox" required checked={value.termsAccepted} onChange={e=>set({...value,termsAccepted:e.target.checked})}/>{boot?.notices.short.terms}</label><label className="ab-check"><input type="checkbox" checked={value.marketing} onChange={e=>set({...value,marketing:e.target.checked})}/>{boot?.notices.short.marketing}</label></>
 const address=(key)=><fieldset key={key}><legend>{t(key)}</legend>{['street','city','postalCode'].map(k=>input(k,profile[key],v=>setProfile({...profile,[key]:v}),'text',true))}<label>{t('country')}{country(profile[key].country,v=>setProfile({...profile,[key]:{...profile[key],country:v}}))}</label></fieldset>
 return <div className="ab-shell">{!embedded&&<header><a href="/">SeedTrade.eu</a><label>Language<select value={lang} disabled={['profile','confirmed'].includes(step)} onChange={e=>setLang(e.target.value)}>{languages.map(l=><option key={l}>{l}</option>)}</select></label></header>}<Content className="network-content"><p className="ab-preview">{t('draft')}</p><h1>{step==='profile'?t('questionnaire'):step==='signin'?networkText(lang,'signIn'):t('title')}</h1><p>{t('pending')}</p>
 {feedback&&<p role="status" className="ab-feedback">{feedback}</p>}
 {!boot?<p role="status">…</p>:notice?<section aria-labelledby="notice-title"><h2 id="notice-title">{t(notice)}</h2><p>{notice==='legal'?'SeedTrade.eu — legal operator/controller: MB GATE-V (Lithuania). Registration number, registered address and privacy contact have not been supplied. Unapproved offline draft.':boot.notices.documents[notice].text}</p><button type="button" onClick={()=>setNotice(null)}>← {t('continue')}</button></section>:<>
 {step==='signin'&&<form onSubmit={run(async()=>{await call('/profile-link',{email:form.email});setFeedback(t('received'))})}><p className="ab-wide">{networkText(lang,'signInHelp')}</p>{input('email',form,setForm,'email',true)}<button disabled={busy}>{networkText(lang,'requestLink')}</button><p className="ab-wide"><a href="/network#entry=join">{networkText(lang,'join')}</a></p></form>}
 {step==='register'&&<p className="network-recovery-note">{networkText(lang,'recovery')}</p>}
 {step==='register'&&<form onSubmit={run(async()=>{await call('/register',{...form,locale:lang});setFeedback(t('received'))})}>
 {input('company',form,setForm,'text',true)}{input('email',form,setForm,'email',true)}<label>{t('country')}{country(form.country,v=>setForm({...form,country:v}))}</label><label>{t('role')}<select required value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="">{t('select')}</option>{['Buyer','Seller','Partner'].map(k=><option key={k} value={k}>{t(k)}</option>)}</select></label>
 <p className="ab-wide">{boot.notices.short.privacy}</p><div className="ab-wide">{legalLinks}</div><div className="ab-wide">{choiceFields(form,setForm)}</div><button disabled={busy}>{t('register')}</button>
 <div className="ab-wide ab-actions"><button type="button" disabled={busy} onClick={run(async()=>{await call('/resend',{email:form.email});setFeedback(t('received'))})}>{t('resend')}</button><button type="button" disabled={busy} onClick={run(async()=>{await call('/profile-link',{email:form.email});setFeedback(t('received'))})}>{t('profileLink')}</button></div></form>}
 {step==='confirm'&&<form onSubmit={run(async()=>{const r=await call('/confirm',{token,...choices});setToken('');setNext(r.profileUrl);setMarketing(choices.marketing);setStep('confirmed')})}><div className="ab-wide"><p>{boot.notices.short.privacy}</p>{legalLinks}{choiceFields(choices,setChoices)}</div><button disabled={busy}>{t('confirm')}</button></form>}
 {step==='confirmed'&&<a className="ab-button" href={next} onClick={e=>{e.preventDefault();const f=new URLSearchParams(new URL(next).hash.slice(1));setToken(f.get('token')||'');setNext('');setStep('exchange')}}>{t('continue')}</a>}
 {step==='exchange'&&<button disabled={busy} onClick={run(async()=>{await call('/profile/exchange',{token});setToken('');const r=await refreshReview();if(r.profile)setProfile(r.profile);setMarketing(Boolean(r.marketing));setStep('profile')})}>{t('continue')}</button>}
 {step==='profile'&&<><CompanyReviewStatus review={companyReview} language={lang} onRefresh={run(refreshReview)}/><form id="company-profile" onSubmit={run(async()=>{await call('/profile/submit',profile);await refreshReview();setFeedback(t('saved'))})}>
 {['legalName','registrationNumber','registrationExplanation','vat','contactName','contactRole','phone'].map(k=>input(k,profile,setProfile,'text',['legalName','contactName','contactRole'].includes(k)))}{address('registeredAddress')}
 {['correspondenceAddress','productionAddress'].map(k=><div className="ab-wide" key={k}><label className="ab-check"><input type="checkbox" checked={profile[k]!==null} onChange={e=>setProfile({...profile,[k]:e.target.checked?emptyAddress():null})}/>{t(k)}</label>{profile[k]&&address(k)}</div>)}
 {['roles','speciesIds','countries'].map(k=><label key={k}>{t(k)}<select multiple size={6} required value={profile[k]} onChange={e=>setProfile({...profile,[k]:Array.from(e.target.selectedOptions,o=>o.value)})}>{(k==='roles'?['Buyer','Seller','Partner','Producer','Processor','Cooperative'].map(id=>({id,name:t(id)})):k==='countries'?boot.countries.map(id=>({id,name:new Intl.DisplayNames([lang.toLowerCase()],{type:'region'}).of(id)})):boot.species.map(s=>({id:s.id,name:(messages[lang]?.[s.name]||s.name)+' — '+s.botanical}))).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>)}
 <label className="ab-check ab-wide"><input type="checkbox" required checked={profile.authorityConfirmed} onChange={e=>setProfile({...profile,authorityConfirmed:e.target.checked})}/>{t('authority')}</label><button type="button" disabled={busy} onClick={run(async()=>{await call('/profile/save',profile);await refreshReview();setFeedback(t('saved'))})}>{t('save')}</button><button disabled={busy}>{t('submit')}</button></form>
 <ListingsPanel call={call} language={lang} countries={boot.countries}/>{embedded&&<PrivateMarketplace call={call} language={lang}/>}<section><label className="ab-check"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/>{boot.notices.short.marketing}</label><button disabled={busy} onClick={run(async()=>{await call('/marketing',{granted:marketing});setFeedback(t('preferenceSaved'))})}>{t('updateMarketing')}</button><button disabled={busy} onClick={run(async()=>{await call('/logout');onMemberSessionChange(null);setProfile(emptyProfile());setCompanyReview(null);setForm({company:'',email:'',country:'',role:'',termsAccepted:false,marketing:false});setBoot(await call('/bootstrap',{locale:lang}));setStep('register')})}>{t('logout')}</button></section></>}
 </>}
 </Content>{!embedded&&<footer>SeedTrade.eu · European B2B seed network</footer>}</div>
}
