// Reuses the existing SMTP transport and claim-before-send discipline. No scheduler/service.
const copy={EN:['New marketplace listing','Manage listing notifications'],DE:['Neues Marktplatzinserat','Benachrichtigungen verwalten'],FR:['Nouvelle annonce','Gérer les notifications'],ES:['Nuevo anuncio','Gestionar notificaciones'],IT:['Nuovo annuncio','Gestisci le notifiche']};
const directions={EN:['For sale','To buy'],DE:['Zu verkaufen','Gesucht'],FR:['À vendre','À acheter'],ES:['En venta','Se compra'],IT:['In vendita','Acquisto']};
const types={EN:['Certified seed','Commodity'],DE:['Zertifiziertes Saatgut','Handelsware'],FR:['Semences certifiées','Matière première'],ES:['Semilla certificada','Producto básico'],IT:['Sementi certificate','Materia prima']};
export function listingEmail(job,{origin,from}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.origin!==origin||base.username||base.password||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(job.email)||typeof from!=='string'||/[\r\n]/.test(from)||!Number.isSafeInteger(job.offerId)||job.offerId<1)throw Error('INVALID_LISTING_NOTICE');
 const lang=Object.hasOwn(copy,job.language)?job.language:'EN',url=new URL('/b2b/account',origin);url.searchParams.set('view','marketplace');url.searchParams.set('offer',String(job.offerId));url.searchParams.set('lang',lang.toLowerCase());
 const settings=new URL('/b2b/account',origin);settings.searchParams.set('view',job.simpleWorkflow?'seller':'transactions');if(job.simpleWorkflow)settings.hash='listing-notifications';settings.searchParams.set('lang',lang.toLowerCase());
 const safe=v=>String(v).replace(/[\r\n\x00-\x1f]/g,' ').slice(0,200);
 return {from,to:job.email,subject:'SEEDTRADE.EU — '+copy[lang][0],text:[copy[lang][0],directions[lang][job.direction==='BUY_REQUEST'?1:0],job.productType?types[lang][job.productType==='COMMODITY'?1:0]:'',safe(job.product),job.quantity!=null?safe(job.quantity)+' '+safe(job.unit):'',job.price!=null?safe(job.price)+' '+safe(job.currency)+'/'+safe(job.unit):'',url.href,copy[lang][1]+': '+settings.href].filter(Boolean).join('\n'),disableFileAccess:true,disableUrlAccess:true};
}
export function createListingNotifications({repository,transport,from,origin,timeoutMs=8000}){
 if(!transport?.sendMail||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)throw Error('INVALID_LISTING_TRANSPORT');
 const deliver=async id=>{
  const job=await repository.transaction(tx=>tx.claimListingNotice(id));if(!job)return {status:'NOT_CLAIMED'};
  let status='UNKNOWN',timer;try{const message=listingEmail(job,{origin,from}),r=await Promise.race([transport.sendMail(message),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SMTP_UNKNOWN')),timeoutMs)})]);status=r?.accepted?.length===1&&String(r.accepted[0]).toLowerCase()===job.email.toLowerCase()&&!r.rejected?.length&&!r.pending?.length?'SENT':'UNKNOWN';}catch{/* Unknown delivery outcomes must not be retried automatically. */}finally{clearTimeout(timer)}
  await repository.transaction(tx=>tx.finishListingNotice(id,status));return {status};
 };
 return {deliver,async drain(){const jobs=await repository.transaction(tx=>tx.pendingListingNotices());return Promise.allSettled(jobs.map(deliver));}};
}
