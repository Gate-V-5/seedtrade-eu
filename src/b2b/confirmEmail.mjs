// Browser-side confirmation flow. Not mounted in the public application yet.
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
  if (!/^[1-9][0-9]{0,15}$/.test(user || '') || !/^[a-f0-9]{64}$/.test(token || '') ||
      [...params.keys()].some(k => k !== 'user' && k !== 'token')) {
    return {status:'INVALID_LINK'};
  }
  try {
    const response = await fetcher('/api/b2b/v1/verify-email', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      cache:'no-store',
      referrerPolicy:'no-referrer',
      body:JSON.stringify({userId:Number(user),token}),
      signal
    });
    if (response.status === 200) return {status:'EMAIL_VERIFIED'};
    if (response.status === 400) return {status:'INVALID_OR_EXPIRED'};
    return {status:'UNAVAILABLE'};
  } catch {
    return {status:'UNAVAILABLE'};
  }
}
