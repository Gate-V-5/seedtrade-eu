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

// Presentation metadata only: the published report source and its approved
// article stay byte-for-byte unchanged. Never relabel a different draft.
(async()=>{
  if(location.pathname.replace(/\/$/,'')!=='/legal/report'||!globalThis.crypto?.subtle)return;
  const article=document.querySelector('article[lang="en"]');
  const notice=[...document.querySelectorAll('main>p')].find(p=>p.textContent==='English legal text - UNAPPROVED review.');
  if(!article||!notice)return;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(article.textContent));
  const hash=[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(hash==='b20fb3d8386e4041cbe53dc00c65427e220f6e46e814d0e501315794d2a79e4f')notice.textContent='English legal text.';
})().catch(()=>{});
