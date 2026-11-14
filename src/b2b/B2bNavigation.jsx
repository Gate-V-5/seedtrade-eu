import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLanguage,useT} from '../i18n/index.jsx';
import {b2bFetch} from './apiFetch.mjs';
import './navigation.css';

export default function B2bNavigation(){
  const t=useT(),{language}=useLanguage(),trigger=useRef(null),dialog=useRef(null),sending=useRef(false);
  const [open,setOpen]=useState(false),[view,setView]=useState('login'),[availability,setAvailability]=useState(null),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[feedback,setFeedback]=useState('');
  const close=()=>{dialog.current?.close();setOpen(false);setShow(false);setFeedback('');trigger.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    const panel=dialog.current;panel.showModal();
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    let active=true;
    b2bFetch('/api/b2b/v1/status').then(async r=>r.ok?r.json():{}).then(s=>{if(active)setAvailability(s);}).catch(()=>{if(active)setAvailability({});});
    const navigation=()=>close();window.addEventListener('popstate',navigation);window.addEventListener('pagehide',navigation);
    return()=>{active=false;panel.close();document.body.style.overflow=old;window.removeEventListener('popstate',navigation);window.removeEventListener('pagehide',navigation);};
  },[open]);
  const available=view==='login'?availability?.memberSignInAvailable===true:availability?.passwordResetAvailable===true;
  async function submit(event){
    event.preventDefault();if(!available||sending.current)return;
    const form=event.currentTarget,data=new FormData(form);sending.current=true;setBusy(true);setFeedback('');
    const email=form.elements.namedItem('email'),password=form.elements.namedItem('password');
    if(!email.value||!email.validity.valid||(view==='login'&&(password.value.length<12||password.value.length>1024))){
      const field=!email.value||!email.validity.valid?email:password;
      setFeedback(field===email?'Enter a valid business email address.':'Use a password of 12–1024 characters.');field.focus();sending.current=false;setBusy(false);return;
    }
    try{
      const response=await b2bFetch(view==='login'?'/api/b2b/v1/login':'/api/b2b/v1/password-reset/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),...(view==='login'?{password:data.get('password')}:{}),uiLanguage:language})});
      const result=await response.json();
      if(view==='login'&&response.ok&&result.user&&result.csrfToken){form.reset();close();window.location.assign('/b2b/account?lang='+language.toLowerCase());return;}
      if(view!=='login'&&response.status===202&&result.status==='REQUEST_ACCEPTED'){
        form.reset();setFeedback('If an eligible account exists, a password-reset link will be sent from network@seedtrade.eu.');
      }else if(response.status===429)setFeedback('Too many attempts. Please try again later.');
      else if(view==='login'&&[400,401].includes(response.status))setFeedback('Unable to sign in. Check your details and verify your email address.');
      else{setAvailability({});setFeedback('Member access is currently unavailable. Please try again later.');}
    }catch{setAvailability({});setFeedback('Member access is currently unavailable. Please try again later.');}
    finally{const password=form.elements.namedItem('password');if(password)password.value='';setShow(false);sending.current=false;setBusy(false);}
  }
  return <>
    <button ref={trigger} className="member-control" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?'member-dialog':undefined} onClick={()=>{setView('login');setAvailability(null);setOpen(true);}}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>
      <span>{t('Member')}</span><svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 4 4 4 4-4"/></svg>
    </button>
    {open&&createPortal(<dialog ref={dialog} id="member-dialog" className="member-dialog" aria-labelledby="member-title" onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const controls=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} onClick={event=>{if(event.target!==dialog.current)return;const r=dialog.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}}>
      <button className="member-close" type="button" aria-label={t('Close')} onClick={close}>×</button>
      <p className="member-eyebrow">SEEDTRADE.EU</p><h2 id="member-title">{t(view==='login'?'Member sign in':'Reset your password')}</h2>
      {!available&&<p className="member-status" role="status">{t(availability===null?'Checking member access…':'Member access is currently unavailable. Please try again later.')}</p>}
      {view!=='login'&&<p>{t('Enter your business email to request a secure reset link.')}</p>}
      <form noValidate onSubmit={submit} aria-label={t(view==='login'?'Member sign in':'Reset your password')}>
        <fieldset disabled={!available||busy}>
          <label htmlFor="member-email">{t('Business email')}</label><input id="member-email" name="email" type="email" autoComplete="username" autoCapitalize="none" maxLength={254} required/>
          {view==='login'&&<><label htmlFor="member-password">{t('Password')}</label><div className="member-password"><input id="member-password" name="password" type={show?'text':'password'} autoComplete="current-password" minLength={12} maxLength={1024} required/><button type="button" aria-controls="member-password" aria-pressed={show} aria-label={t(show?'Hide password':'Show password')} onClick={()=>setShow(!show)}>{t(show?'Hide':'Show')}</button></div></>}
          <button className="member-primary" type="submit">{t(busy?'Please wait…':view==='login'?'Sign in':'Send reset link')}</button>
        </fieldset>
        {feedback&&<p role="status" className="member-status">{t(feedback)}</p>}
      </form>
      <div className="member-links"><button type="button" disabled={busy||(view==='login'&&availability?.passwordResetAvailable!==true)} onClick={()=>{setView(view==='login'?'reset-request':'login');setFeedback('');setShow(false);}}>{t(view==='login'?'Forgot password?':'Back to sign in')}</button><a href={'/b2b/register?lang='+language.toLowerCase()} onClick={close}>{t('Register company')}</a></div>
    </dialog>,document.body)}
  </>;
}
