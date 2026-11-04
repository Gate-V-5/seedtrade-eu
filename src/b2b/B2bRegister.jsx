// Private B2B registration remains disabled until owner-approved runtime activation.
export default function B2bRegister() {
  return <main style={{maxWidth:600,margin:'8vh auto',padding:'2rem',fontFamily:'system-ui,sans-serif',lineHeight:1.5}}>
    <a href="/">SeedTrade.eu</a>
    <h1>Company registration</h1>
    <p>Professional company registration is not yet available. The secure registration service is being validated before activation.</p>
    <form aria-label="Company registration (not yet available)" onSubmit={event=>event.preventDefault()}>
      <fieldset disabled style={{display:'grid',gap:'1rem',border:0,padding:0}}>
        <label>Company legal name<input name="legalName" autoComplete="organization" /></label>
        <label>Registration country (ISO 2-letter code)<input name="registrationCountry" maxLength={2} /></label>
        <label>Company registration number<input name="registrationNumber" /></label>
        <label>Business email<input name="email" type="email" autoComplete="email" /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" /></label>
        <button type="submit">Register company</button>
      </fieldset>
    </form>
    <p>No data entered on this page is submitted or stored.</p>
  </main>;
}
