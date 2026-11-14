import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useLanguage,useT} from '../i18n/index.jsx';
import legalRegistry from '../legal/registry.json';
import {b2bFetch} from './apiFetch.mjs';
import B2bLanguageNotice from './B2bLanguageNotice.jsx';

// Stable country values; display names follow the existing interface language.
const countries='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
export default function B2bRegister(){
  const {language}=useLanguage(),t=useT();
  const [available,setAvailable]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const [errors,setErrors]=useState({}),[country,setCountry]=useState(''),[showPassword,setShowPassword]=useState(false),[complete,setComplete]=useState(false);
  const submitting=useRef(false);
  const options=useMemo(()=>{
    let display;try{display=new Intl.DisplayNames([language.toLowerCase()],{type:'region'});}catch{}
    return countries.map(code=>({code,label:display?.of(code)??code})).sort((a,b)=>a.label.localeCompare(b.label,language.toLowerCase()));
  },[language]);
  useEffect(()=>{
    let active=true;
    b2bFetch('/api/b2b/v1/status',{cache:'no-store',credentials:'same-origin'})
      .then(async response=>response.ok?response.json():{})
      .then(result=>{if(active)setAvailable(result.registrationAvailable===true&&legalRegistry.approval.status==='APPROVED'&&legalRegistry.missingFacts.length===0);})
      .catch(()=>{if(active)setAvailable(false);});
    return()=>{active=false;};
  },[]);
  const clearError=name=>setErrors(current=>{if(!current[name])return current;const next={...current};delete next[name];return next;});
  const error=name=>errors[name]&&<p className="b2b-field-error" id={`${name}-error`}>{t(errors[name])}</p>;
  const inputProps=name=>({id:`registration-${name}`,name,'aria-invalid':errors[name]?true:undefined,'aria-describedby':[name==='password'?'password-help':null,errors[name]?`${name}-error`:null].filter(Boolean).join(' ')||undefined,onInput:()=>clearError(name)});
  async function submit(event){
    event.preventDefault();if(!available||submitting.current)return;
    const form=event.currentTarget,values=new FormData(form),invalid={};
    const legalName=String(values.get('legalName')??'').trim(),number=String(values.get('registrationNumber')??'').trim();
    if(legalName.length<2||legalName.length>255)invalid.legalName='Enter the company legal name (2–255 characters).';
    if(!countries.includes(values.get('registrationCountry')))invalid.registrationCountry='Select the company registration country.';
    if(number.length<2||number.length>100)invalid.registrationNumber='Enter the company registration number (2–100 characters).';
    if(!values.get('email')||!form.elements.namedItem('email').validity.valid)invalid.email='Enter a valid business email address.';
    const password=String(values.get('password')??'');
    if(password.length<12||password.length>1024)invalid.password='Use a password of 12–1024 characters.';
    if(values.get('termsAccepted')!=='on')invalid.termsAccepted='Please accept the English B2B Terms and authority declaration.';
    setErrors(invalid);setStatus('');
    if(Object.keys(invalid).length){form.elements.namedItem(Object.keys(invalid)[0]).focus();return;}
    submitting.current=true;setBusy(true);
    try{
      const response=await b2bFetch('/api/b2b/v1/register',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',
        body:JSON.stringify({email:values.get('email'),password:values.get('password'),termsAccepted:values.get('termsAccepted')==='on',locale:'en',uiLanguage:language,legalBundleId:legalRegistry.bundleId,
          company:{legalName:values.get('legalName'),registrationCountry:values.get('registrationCountry'),registrationNumber:values.get('registrationNumber')}})
      });
      const result=await response.json();
      if(response.status===202&&['PENDING_EMAIL_DELIVERY','PENDING_EMAIL_VERIFICATION'].includes(result.status)){
        form.reset();setCountry('');setAvailable(false);setComplete(true);
        setStatus(result.status==='PENDING_EMAIL_DELIVERY'?'Your registration was saved. Email delivery is pending. Please contact us before registering again.':'Check your inbox for a confirmation email from network@seedtrade.eu. Your company remains pending review.');
      }else if([400,403,404,415,429].includes(response.status)){
        setStatus(response.status===400?'Check your details. If the problem continues, refresh this page to load the current Terms.':response.status===429?'Too many attempts. Please try again later.':'Registration is currently unavailable.');
      }else{
        setAvailable(false);setStatus('We could not confirm the registration result. Please contact us before registering again.');
      }
    }catch{setAvailable(false);setStatus('We could not confirm the registration result. Please contact us before registering again.');}
    finally{form.elements.namedItem('password').value='';setShowPassword(false);submitting.current=false;setBusy(false);}
  }
  return <main className="b2b-registration">
    <section className="b2b-registration-intro" aria-labelledby="registration-heading">
      <p className="b2b-eyebrow">{t('B2B registration')}</p>
      <h1 id="registration-heading">{t('Register your company')}</h1>
      <p className="b2b-registration-lead">{t('Create your business account and confirm your email address.')}</p>
      <p className="b2b-phase-note">{t('Your company stays pending after email verification. Trading is not available in this registration phase.')}</p>
    </section>
    <section className="b2b-registration-card" aria-label={t('Company registration')}>
      {complete?<div className="b2b-result" role="status"><h2>{t('Registration saved')}</h2><p>{t(status)}</p></div>:<>
        {available!==true&&<p className="b2b-availability" role="status">{t(available===null?'Checking registration availability…':'Company registration is currently unavailable.')}</p>}
        <form noValidate aria-label={t('Company registration')} aria-describedby="registration-language" onSubmit={submit}>
          {Object.keys(errors).length>0&&<p className="b2b-error-summary" role="alert">{t('Please check the highlighted fields.')}</p>}
          <fieldset disabled={!available||busy}>
            <div className="b2b-field"><label htmlFor="registration-legalName">{t('Company legal name')}</label><input {...inputProps('legalName')} autoComplete="organization" required minLength={2} maxLength={255}/>{error('legalName')}</div>
            <div className="b2b-field"><label htmlFor="registration-registrationCountry">{t('Registration country')}</label><select {...inputProps('registrationCountry')} autoComplete="country" required value={country} onChange={event=>{setCountry(event.target.value);clearError('registrationCountry');}}><option value="">{t('Select a country')}</option>{options.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select>{error('registrationCountry')}</div>
            <div className="b2b-field"><label htmlFor="registration-registrationNumber">{t('Company registration number')}</label><input {...inputProps('registrationNumber')} autoComplete="off" required minLength={2} maxLength={100}/>{error('registrationNumber')}</div>
            <div className="b2b-field"><label htmlFor="registration-email">{t('Business email')}</label><input {...inputProps('email')} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254}/>{error('email')}</div>
            <div className="b2b-field"><label htmlFor="registration-password">{t('Password')}</label><div className="b2b-password"><input {...inputProps('password')} type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={1024}/><button type="button" className="b2b-password-toggle" aria-controls="registration-password" aria-label={t(showPassword?'Hide password':'Show password')} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{t(showPassword?'Hide':'Show')}</button></div><p className="b2b-field-help" id="password-help">{t('Use at least 12 characters. A unique passphrase is a good choice.')}</p>{error('password')}</div>
            <div className="b2b-registration-legal-links" aria-label={t('Registration legal documents')}><a href="/terms" target="_blank" rel="noopener noreferrer">{t('B2B Terms')}</a><a href="/privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Notice')}</a></div>
            <p className="b2b-field-help" id="registration-language">{t('Legal documents are provided in English.')}</p>
            <div className="b2b-acceptance"><input {...inputProps('termsAccepted')} type="checkbox" required/><label htmlFor="registration-termsAccepted" lang="en">{legalRegistry.documents.authority.document.declarations.en}</label></div>{error('termsAccepted')}
            <button className="b2b-submit" type="submit">{t(busy?'Submitting…':'Register company')}<span aria-hidden="true"> →</span></button>
          </fieldset>
          {status&&<p className="b2b-response" role="status">{t(status)}</p>}
        </form>
      </>}
      <p className="b2b-contact">{t('For any questions, requests or further information, please contact the SeedTrade.eu team at')} <a href="mailto:info@seedtrade.eu">info@seedtrade.eu</a>.</p>
      <B2bLanguageNotice/>
    </section>
  </main>;
}
