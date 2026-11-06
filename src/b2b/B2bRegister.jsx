import {useEffect, useState} from 'react';

// Availability comes from the server; the disabled default collects nothing.
export default function B2bRegister() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/b2b/v1/status', {cache:'no-store', credentials:'same-origin'})
      .then(async response => response.ok ? response.json() : {})
      .then(result => {if (active) setAvailable(result.registrationAvailable === true);})
      .catch(() => {});
    return () => {active = false;};
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (!available || busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    try {
      const response = await fetch('/api/b2b/v1/register', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', cache:'no-store',
        body:JSON.stringify({email:values.get('email'), password:values.get('password'),noticesAccepted:values.get('noticesAccepted')==='on', company:{
          legalName:values.get('legalName'), registrationCountry:values.get('registrationCountry'),
          registrationNumber:values.get('registrationNumber')}})
      });
      const result = await response.json();
      if (response.status === 202 && ['PENDING_EMAIL_DELIVERY','PENDING_EMAIL_VERIFICATION'].includes(result.status)) {
        form.reset();
        setAvailable(false);
        setStatus(result.status === 'PENDING_EMAIL_DELIVERY'
          ? 'Your registration was saved. Confirmation email delivery is pending. Your email is not yet verified.'
          : 'Please check your email to confirm your address. Company review may still be pending.');
      } else {
        setStatus(response.status === 400 ? 'Please check your registration details.' :
          response.status === 429 ? 'Too many attempts. Please try again later.' : 'Registration is unavailable. Please try again later.');
      }
    } catch {setStatus('Registration is unavailable. Please try again later.');}
    finally {form.elements.namedItem('password').value = ''; setBusy(false);}
  }
  return <main style={{maxWidth:600,margin:'8vh auto',padding:'2rem',fontFamily:'system-ui,sans-serif',lineHeight:1.5}}>
    <a href="/">SeedTrade.eu</a>
    <h1>Company registration</h1>
    <p>{available ? 'Register your company and confirm your business email address.' : 'Company registration is currently unavailable.'}</p>
    <form aria-label="Company registration" onSubmit={submit}>
      <fieldset disabled={!available || busy} style={{display:'grid',gap:'1rem',border:0,padding:0}}>
        <label>Company legal name<input name="legalName" autoComplete="organization" required minLength={2} maxLength={255} /></label>
        <label>Registration country (ISO 2-letter code)<input name="registrationCountry" required pattern="[A-Za-z]{2}" maxLength={2} /></label>
        <label>Company registration number<input name="registrationNumber" required minLength={2} maxLength={100} /></label>
        <label>Business email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} /></label>
        <label><input name="noticesAccepted" type="checkbox" required />I acknowledge the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a> and accept the <a href="/terms" target="_blank" rel="noreferrer">terms</a>.</label>
        <button type="submit">Register company</button>
      </fieldset>
    </form>
    <p role="status">{status || (available ? 'Your company remains subject to review after email confirmation.' : 'No registration data is submitted while this form is unavailable.')}</p>
    <a href="/b2b/account">Sign in or request another verification email</a>
  </main>;
}
