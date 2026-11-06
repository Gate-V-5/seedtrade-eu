import {useEffect, useRef, useState} from 'react';
import {confirmB2bEmail} from './confirmEmail.mjs';

// Isolated confirmation view. Does not enable the registration API.
export default function B2bVerifyEmail() {
  const [status, setStatus] = useState('VERIFYING');
  const pending = useRef(null);
  useEffect(() => {
    let active = true;
    // Reuse the same verification attempt across React StrictMode effect replay.
    // Do not abort the first request and accidentally lose its one-time token.
    if (!pending.current) {
      pending.current = confirmB2bEmail({
        location: window.location,
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
    EMAIL_VERIFIED: ['Email verified', 'Your email address has been confirmed. Company review may still be pending.'],
    INVALID_LINK: ['Invalid confirmation link', 'The link is incomplete or invalid. Request a new link when registration is available.'],
    INVALID_OR_EXPIRED: ['Link expired or already used', 'This confirmation link is no longer valid.'],
    UNAVAILABLE: ['Verification unavailable', 'Please try again later. Your email has not been confirmed by this attempt.']
  };
  const [title, detail] = messages[status] || messages.UNAVAILABLE;
  return <main style={{maxWidth:560,margin:'8vh auto',padding:'2rem',fontFamily:'system-ui,sans-serif',lineHeight:1.5}}>
    <a href="/" style={{color:'inherit'}}>SeedTrade.eu</a>
    <h1 aria-live="polite">{title}</h1>
    <p role="status">{detail}</p>
    <p><a href="/b2b/account">Sign in to your company account</a></p>
    <a href="/">Return to SeedTrade.eu</a>
  </main>;
}
