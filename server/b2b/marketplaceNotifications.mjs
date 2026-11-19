import {createHash} from 'node:crypto';

export function marketplaceOperation(kind,actorUserId,targetId,body,requestId) {
  const fingerprint=createHash('sha256').update(JSON.stringify({kind,actorUserId,targetId,body})).digest('hex');
  if(requestId!==undefined&&(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(requestId)))throw new TypeError('INVALID_REQUEST');
  // Old clients have no request ID: identical actor/target/content is a retry.
  // A caller may supply a new requestId for an intentionally repeated message.
  return {kind,actorUserId,requestKey:requestId??fingerprint,fingerprint};
}

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLabel=value=>String(value).replace(/[\x00-\x1f\x7f]/g,' ').slice(0,200);
const integer=value=>{if(!Number.isSafeInteger(value)||value<1)throw Error('INVALID_NOTIFICATION_REFERENCE');return value;};

export function marketplaceEmail({from,origin,job}) {
  const base=new URL(origin);
  if(base.protocol!=='https:'||base.origin!==origin||base.username||base.password)throw Error('INVALID_NOTIFICATION_ORIGIN');
  if(!['ENQUIRY','SELLER_REPLY'].includes(job.kind)||typeof from!=='string'||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(from)||
    typeof job.recipientEmail!=='string'||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(job.recipientEmail))throw Error('INVALID_NOTIFICATION_MAILBOX');
  const p=typeof job.payload==='string'?JSON.parse(job.payload):job.payload;
  const offerId=integer(p.offerId),enquiryId=integer(p.enquiryId);
  const product=safeLabel(p.product),quantity=Number(p.quantity);
  if(!Number.isFinite(quantity)||quantity<=0||!['kg','t'].includes(p.unit))throw Error('INVALID_NOTIFICATION_PRODUCT');
  const messages={
    EN:['New buyer enquiry','Seller replied to your enquiry','A buyer has enquired about this offer.','The seller has added a reply to this enquiry.','Sign in to read the conversation'],
    DE:['Neue Kaufanfrage','Der Verkäufer hat auf Ihre Anfrage geantwortet','Ein Käufer hat eine Anfrage zu diesem Angebot gesendet.','Der Verkäufer hat auf diese Anfrage geantwortet.','Anmelden, um die Unterhaltung zu lesen'],
    FR:['Nouvelle demande d’achat','Le vendeur a répondu à votre demande','Un acheteur a envoyé une demande pour cette offre.','Le vendeur a répondu à cette demande.','Connectez-vous pour lire la conversation'],
    ES:['Nueva consulta de compra','El vendedor ha respondido a su consulta','Un comprador ha enviado una consulta sobre esta oferta.','El vendedor ha respondido a esta consulta.','Inicie sesión para leer la conversación'],
    IT:['Nuova richiesta di acquisto','Il venditore ha risposto alla tua richiesta','Un acquirente ha inviato una richiesta per questa offerta.','Il venditore ha risposto a questa richiesta.','Accedi per leggere la conversazione']};
  const buying={
    EN:['New seller response','Buyer replied to your response','A supplier has responded to this buying request.','The buyer has added a reply to this conversation.','Sign in to read the conversation'],
    DE:['Neue Lieferantenantwort','Der Käufer hat auf Ihre Antwort geantwortet','Ein Lieferant hat auf diese Kaufanfrage geantwortet.','Der Käufer hat der Unterhaltung eine Antwort hinzugefügt.','Anmelden, um die Unterhaltung zu lesen'],
    FR:['Nouvelle réponse fournisseur','L’acheteur a répondu','Un fournisseur a répondu à cette demande d’achat.','L’acheteur a ajouté une réponse à cette conversation.','Connectez-vous pour lire la conversation'],
    ES:['Nueva respuesta de un proveedor','El comprador ha respondido','Un proveedor ha respondido a esta solicitud de compra.','El comprador ha añadido una respuesta a esta conversación.','Inicie sesión para leer la conversación'],
    IT:['Nuova risposta di un fornitore','L’acquirente ha risposto','Un fornitore ha risposto a questa richiesta di acquisto.','L’acquirente ha aggiunto una risposta alla conversazione.','Accedi per leggere la conversazione']};
  const language=Object.hasOwn(messages,p.language)?p.language:'EN',copy=(p.listingDirection==='BUY_REQUEST'?buying:messages)[language],isNew=job.kind==='ENQUIRY';
  const url=new URL('/b2b/account/',origin);url.searchParams.set('view','conversation');url.searchParams.set('enquiry',String(enquiryId));url.searchParams.set('lang',language.toLowerCase());
  const title=copy[isNew?0:1],summary=copy[isNew?2:3],cta=copy[4],staging=base.hostname==='staging.seedtrade.eu';
  const notice='Synthetic staging test — no commercial transaction.';
  // Only the validated product label is included. No free-form conversation, private profile or public technical IDs.
  return {from,to:job.recipientEmail,subject:`${staging?'[STAGING TEST] ':''}SEEDTRADE.EU — ${title}`,
    text:[...(staging?[notice]:[]),title,product,summary,cta,url.toString()].join('\n'),
    html:`${staging?`<p>${escape(notice)}</p>`:''}<h1>${escape(title)}</h1><p>${escape(product)}</p><p>${escape(summary)}</p><p><a href="${escape(url.toString())}">${escape(cta)}</a></p>`,disableFileAccess:true,disableUrlAccess:true};

}

export function createMarketplaceNotifications({repository,transport,from,origin,timeoutMs=8000}) {
  if(!repository?.transaction||typeof transport?.sendMail!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)throw Error('NOTIFICATION_CONFIGURATION');
  return {
    async deliver(notificationId) {
      let job,timer;
      try {
        // Claim and commit BEFORE SMTP. SENDING/UNKNOWN are never auto-retried.
        job=await repository.transaction(tx=>tx.claimMarketplaceNotification(notificationId));
        if(!job)return {status:'NOT_CLAIMED'};
      } catch {return {status:'RECORDING_UNAVAILABLE'};}
      let status='UNKNOWN',failureCode=null,smtpCode=null,messageIdHash=null;
      try {
        const message=marketplaceEmail({from,origin,job});
        const result=await Promise.race([Promise.resolve().then(()=>transport.sendMail(message)),new Promise((_,reject)=>{
          timer=setTimeout(()=>reject(Error('SMTP_OUTCOME_UNKNOWN')),timeoutMs);
        })]);
        if(!Array.isArray(result?.accepted)||result.accepted.length!==1||typeof result.accepted[0]!=='string'||
          result.accepted[0].toLowerCase()!==job.recipientEmail.toLowerCase()||result.rejected?.length||result.pending?.length) {
          failureCode='SMTP_ACCEPTANCE_UNCONFIRMED';
        } else {
          status='ACCEPTED';
          if(typeof result.messageId==='string')messageIdHash=createHash('sha256').update(result.messageId).digest('hex');
          const code=/^([2-5][0-9]{2})(?:\s|$)/.exec(result.response??'');if(code)smtpCode=Number(code[1]);
        }
      } catch(error) {
        const response=error?.responseCode;
        if(Number.isInteger(response)&&response>=400&&response<=599){status='FAILED';smtpCode=response;failureCode='SMTP_REJECTED';}
        else{status='UNKNOWN';failureCode='SMTP_OUTCOME_UNKNOWN';}
      } finally {clearTimeout(timer);}
      try {
        await repository.transaction(tx=>tx.finishMarketplaceNotification({id:notificationId,status,failureCode,smtpCode,messageIdHash}));
        return {status};
      } catch {return {status:'UNKNOWN_RECORDING_UNAVAILABLE'};}
    }
  };
}
