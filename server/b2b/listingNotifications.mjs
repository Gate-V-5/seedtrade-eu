import {publicListingText,publicListingUrl,brokerInterestMailto} from '../../shared/publicListingLinks.mjs';
// Reuses the existing SMTP transport and claim-before-send discipline. No scheduler/service.
const copy={EN:['New marketplace listing','Manage listing notifications'],DE:['Neues Marktplatzinserat','Benachrichtigungen verwalten'],FR:['Nouvelle annonce','Gérer les notifications'],ES:['Nuevo anuncio','Gestionar notificaciones'],IT:['Nuovo annuncio','Gestisci le notifiche']};
const directions={EN:['For sale','To buy'],DE:['Zu verkaufen','Gesucht'],FR:['À vendre','À acheter'],ES:['En venta','Se compra'],IT:['In vendita','Acquisto']};
const types={EN:['Certified seed','Commodity'],DE:['Zertifiziertes Saatgut','Handelsware'],FR:['Semences certifiées','Matière première'],ES:['Semilla certificada','Producto básico'],IT:['Sementi certificate','Materia prima']};
const announcement={EN:['New Selling Offer','A new selling offer has been published on SEEDTRADE.EU.','New Buying Request','A new buying request has been published on SEEDTRADE.EU.','Sign in to view the details.'],DE:['Neues Verkaufsangebot','Ein neues Verkaufsangebot wurde auf SEEDTRADE.EU veröffentlicht.','Neue Kaufanfrage','Eine neue Kaufanfrage wurde auf SEEDTRADE.EU veröffentlicht.','Melden Sie sich an, um die Details anzusehen.'],FR:['Nouvelle offre de vente','Une nouvelle offre de vente a été publiée sur SEEDTRADE.EU.','Nouvelle demande d’achat','Une nouvelle demande d’achat a été publiée sur SEEDTRADE.EU.','Connectez-vous pour consulter les détails.'],ES:['Nueva oferta de venta','Se ha publicado una nueva oferta de venta en SEEDTRADE.EU.','Nueva solicitud de compra','Se ha publicado una nueva solicitud de compra en SEEDTRADE.EU.','Inicie sesión para ver los detalles.'],IT:['Nuova offerta di vendita','È stata pubblicata una nuova offerta di vendita su SEEDTRADE.EU.','Nuova richiesta di acquisto','È stata pubblicata una nuova richiesta di acquisto su SEEDTRADE.EU.','Acceda per visualizzare i dettagli.']};
export function listingEmail(job,{origin,from}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.origin!==origin||base.username||base.password||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(job.email)||typeof from!=='string'||/[\r\n]/.test(from)||!Number.isSafeInteger(job.offerId)||job.offerId<1)throw Error('INVALID_LISTING_NOTICE');
 const lang=Object.hasOwn(copy,job.language)?job.language:'EN',url=publicListingUrl(job.offerId,lang),settings=new URL('/b2b/account',origin);settings.searchParams.set('view',job.simpleWorkflow?'seller':'transactions');if(job.simpleWorkflow)settings.hash='listing-notifications';settings.searchParams.set('lang',lang.toLowerCase());
 const a=announcement[lang],buy=job.direction==='BUY_REQUEST',interest=brokerInterestMailto({id:job.offerId,product:job.product,variety:job.variety,direction:buy?'BUY_REQUEST':'OFFER',url});
 const product=publicListingText(job.product,200)+(job.botanical?' ('+publicListingText(job.botanical,200)+')':'')+(job.variety?' / '+publicListingText(job.variety,128):'');
 const quantity=Number.isFinite(Number(job.quantity))&&Number(job.quantity)>0?new Intl.NumberFormat(lang.toLowerCase()).format(Number(job.quantity))+' '+job.unit:'';
 const price=job.price!=null&&Number.isFinite(Number(job.price))&&Number(job.price)>=0&&/^[A-Z]{3}$/.test(job.currency??'')?new Intl.NumberFormat(lang.toLowerCase(),{style:'currency',currency:job.currency}).format(Number(job.price))+' / '+(job.priceUnit??job.unit):'';
 const lines=[a[buy?3:1],directions[lang][buy?1:0],job.productType?types[lang][job.productType==='COMMODITY'?1:0]:'',product,quantity,price,url,'https://seedtrade.eu',copy[lang][1]+': '+settings.href].filter(Boolean);
 const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return {from,to:job.email,subject:'SEEDTRADE.EU – '+a[buy?2:0],text:lines.join('\n\n')+"\n\nI'M INTERESTED\n"+interest,
 html:lines.slice(0,-1).map(l=>/^https:\/\//.test(l)?'<p><a href="'+escape(l)+'">'+escape(l)+'</a></p>':'<p>'+escape(l)+'</p>').join('')+'<p><a href="'+escape(settings.href)+'">'+escape(copy[lang][1])+'</a></p>'+'<p><a style="display:inline-block;padding:14px 20px;background:#155c3e;color:#fff;font-weight:bold" href="'+escape(interest)+'">I’M INTERESTED</a></p>',disableFileAccess:true,disableUrlAccess:true};
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
