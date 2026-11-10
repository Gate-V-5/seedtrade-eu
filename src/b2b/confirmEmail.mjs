import {b2bFetch} from './apiFetch.mjs';
// Confirmation flow used by the isolated B2B verification page.
// The token lives in the URL fragment, which is cleared before any network call.
export async function confirmB2bEmail({location, history, fetcher, signal}) {
  if (!location || !history || typeof history.replaceState !== 'function' ||
      typeof fetcher !== 'function') throw new TypeError('INVALID_CONFIRMATION_CONTEXT');
  const url = new URL(location.href);
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : '';
  // Remove the token from the address bar before validation or asynchronous work.
  url.hash = '';
  history.replaceState(null, '', url.pathname + url.search);
  const params = new URLSearchParams(fragment);
  const user = params.get('user');
  const token = params.get('token');
  if (!/^[1-9][0-9]{0,15}$/.test(user || '') || !Number.isSafeInteger(Number(user)) ||
      !/^[a-f0-9]{64}$/.test(token || '') || params.getAll('user').length !== 1 || params.getAll('token').length !== 1 ||
      [...params.keys()].some(k => k !== 'user' && k !== 'token')) {
    return {status:'INVALID_LINK'};
  }
  try {
    const response = await b2bFetch('/api/b2b/v1/verify-email', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      cache:'no-store',
      referrerPolicy:'no-referrer',
      body:JSON.stringify({userId:Number(user),token}),
      signal
    }, fetcher);
    if (response.status === 200) {
      const result = await response.json();
      return {status:result.status === 'EMAIL_VERIFIED' ? 'EMAIL_VERIFIED' : 'UNAVAILABLE'};
    }
    if (response.status === 400) return {status:'INVALID_OR_EXPIRED'};
    return {status:'UNAVAILABLE'};
  } catch {
    return {status:'UNAVAILABLE'};
  }
}
