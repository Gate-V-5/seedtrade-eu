export const UI_LANGUAGES=Object.freeze(['EN','DE','FR','ES','IT']);
export function uiLanguage(value) {
  const code=typeof value==='string'?value.toUpperCase():'';
  return UI_LANGUAGES.includes(code)?code:null;
}
export function languageFromUrl(href) {
  try {const url=new URL(href);return url.searchParams.getAll('lang').length===1?uiLanguage(url.searchParams.get('lang')):null;}catch{return null;}
}
export function languageHref(href,code,origin='https://seedtrade.eu',baseHref=origin) {
  if(typeof href!=='string'||href.startsWith('#'))return href;
  try {
    const url=new URL(href,baseHref);
    if(url.origin!==origin||!['http:','https:'].includes(url.protocol)||url.pathname.startsWith('/legal/snapshots/')||url.pathname.startsWith('/api/'))return href;
    url.searchParams.set('lang',(uiLanguage(code)??'EN').toLowerCase());
    return url.pathname+url.search+url.hash;
  }catch{return href;}
}
