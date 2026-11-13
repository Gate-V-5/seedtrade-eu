// Static English legal page navigation only; no tracking, consent prompt or remote request.
(()=>{
  const valid=value=>typeof value==='string'&&['EN','DE','FR','ES','IT'].includes(value.toUpperCase())?value.toLowerCase():null;
  const current=new URL(location.href);let saved;try{saved=localStorage.getItem('seedtrade_language');}catch{}
  const language=(current.searchParams.getAll('lang').length===1?valid(current.searchParams.get('lang')):null)||valid(saved)||'en';
  for(const anchor of document.querySelectorAll('a[href]')){
    if(anchor.hasAttribute('download')||anchor.getAttribute('href').startsWith('#'))continue;
    const url=new URL(anchor.href,location.href);
    if(url.origin!==location.origin||url.pathname.startsWith('/api/')||/\.[a-z0-9]+$/i.test(url.pathname))continue;
    url.searchParams.set('lang',language);anchor.href=url.pathname+url.search+url.hash;
  }
})();
