// Presentation evidence only, used AFTER a successful original /profile/read response.
// This never grants API access, persists a login or replaces server authorization.
export function profileResponseConfirmsMember(value){return !!(value&&['EMAIL_CONFIRMED','PROFILE_DRAFT','PROFILE_SUBMITTED'].includes(value.status)&&typeof value.company==='string'&&value.company.length>0&&typeof value.email==='string'&&value.email.includes('@')&&typeof value.companyVerified==='boolean')}
export function memberEntry(search){return new URLSearchParams(search.replace(/^[?#]/,'')).get('entry')==='signin'?'signin':'join'}
