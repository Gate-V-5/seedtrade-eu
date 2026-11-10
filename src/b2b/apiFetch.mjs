// Public, fixed API location; never a secret or a user-selectable credential target.
export const B2B_API_ORIGIN='https://api.seedtrade.eu';
export function b2bFetch(relative,options={},fetcher=globalThis.fetch.bind(globalThis)) {
  if(typeof relative!=='string'||!relative.startsWith('/api/b2b/v1/')||/[\\#\r\n]/.test(relative))throw TypeError('INVALID_B2B_API_PATH');
  const url=new URL(relative,B2B_API_ORIGIN);
  if(url.origin!==B2B_API_ORIGIN||!url.pathname.startsWith('/api/b2b/v1/'))throw TypeError('INVALID_B2B_API_PATH');
  return fetcher(url.href,{...options,mode:'cors',credentials:'include',cache:'no-store',referrerPolicy:'no-referrer'});
}
