import SimpleEmailVerification from './SimpleEmailVerification.jsx';
import {useT} from '../i18n/index.jsx';
import {useEffect, useRef, useState} from 'react';
import {confirmB2bEmail} from './confirmEmail.mjs';
import B2bLanguageNotice from './B2bLanguageNotice.jsx';

// Isolated confirmation view. Does not enable the registration API.
export function LegacyEmailVerification({originalUrl}) {
  const t=useT();
  const [status, setStatus] = useState('VERIFYING');
  const pending = useRef(null);
  useEffect(() => {
    let active = true;
    // Reuse the same verification attempt across React StrictMode effect replay.
    // Do not abort the first request and accidentally lose its one-time token.
    if (!pending.current) {
      pending.current = confirmB2bEmail({
        location: {href:originalUrl??window.location.href},
        history: window.history,
        fetcher: window.fetch.bind(window)
      });
    }
    pending.current.then(result => {
      if (active) setStatus(result.status);
    }).catch(() => {
      if (active) setStatus('UNAVAILABLE');
    });
    return () => { active = false; };
  }, []);
  const messages = {
    VERIFYING: ['Verifying your email', 'Please wait while we check your confirmation link.'],
    EMAIL_VERIFIED: ['Email verified', 'Your email address has been confirmed. Your company remains pending review.'],
    INVALID_LINK: ['Invalid confirmation link', 'The link is incomplete or invalid. Please contact us for help.'],
    INVALID_OR_EXPIRED: ['Link expired or already used', 'This confirmation link is no longer valid.'],
    UNAVAILABLE: ['Verification unavailable', 'We could not confirm the verification result. Please contact us for help.']
  };
  const [title, detail] = messages[status] || messages.UNAVAILABLE;
  return <main className="b2b-verification">
    <h1 aria-live="polite">{t(title)}</h1>
    <p role="status">{t(detail)}</p>
    <p className="b2b-contact">{t('For any questions, requests or further information, please contact the SeedTrade.eu team at')} <a href="mailto:info@seedtrade.eu">info@seedtrade.eu</a>.</p>
    <a href="/">{t("Return to SeedTrade.eu")}</a>
    <B2bLanguageNotice/>
  </main>;
}

export default function B2bVerifyEmail(){const [mode,setMode]=useState(null);const initial=useRef(null);useEffect(()=>{if(initial.current===null){initial.current=window.location.href;window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);}fetchStatus();async function fetchStatus(){try{const {b2bFetch}=await import('./apiFetch.mjs');const r=await b2bFetch('/api/b2b/v1/status');const s=await r.json();setMode(s.registrationPasswordAfterVerification===true);}catch{setMode(false);}}},[]);return mode===null?null:mode?<SimpleEmailVerification originalUrl={initial.current}/>:<LegacyEmailVerification originalUrl={initial.current}/>;}
