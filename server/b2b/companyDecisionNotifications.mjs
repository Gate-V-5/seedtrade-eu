import {randomBytes} from 'node:crypto';
import {B2bError} from './portalService.mjs';
const languages=['EN','DE','FR','ES','IT'];
const copy={
 EN:['Registration Approved','Congratulations!\n\nYour company registration has been approved. You are now a verified SEEDTRADE.EU member.\n\nSign in to start using the Marketplace.','Registration Not Approved','We regret to inform you that we could not approve your company registration.\n\nYou may submit a new registration if you wish to apply again.'],
 DE:['Registrierung genehmigt','Herzlichen Glückwunsch!\n\nIhre Unternehmensregistrierung wurde genehmigt. Sie sind jetzt verifiziertes SEEDTRADE.EU-Mitglied.\n\nMelden Sie sich an, um den Marktplatz zu nutzen.','Registrierung nicht genehmigt','Leider konnten wir Ihre Unternehmensregistrierung nicht genehmigen.\n\nSie können eine neue Registrierung einreichen, wenn Sie sich erneut bewerben möchten.'],
 FR:['Inscription approuvée','Félicitations !\n\nL’inscription de votre entreprise a été approuvée. Vous êtes désormais membre vérifié de SEEDTRADE.EU.\n\nConnectez-vous pour utiliser la place de marché.','Inscription non approuvée','Nous regrettons de vous informer que nous n’avons pas pu approuver l’inscription de votre entreprise.\n\nVous pouvez soumettre une nouvelle inscription si vous souhaitez faire une nouvelle demande.'],
 ES:['Registro aprobado','¡Enhorabuena!\n\nEl registro de su empresa ha sido aprobado. Ahora es miembro verificado de SEEDTRADE.EU.\n\nInicie sesión para utilizar el Marketplace.','Registro no aprobado','Lamentamos informarle de que no hemos podido aprobar el registro de su empresa.\n\nPuede enviar un nuevo registro si desea volver a solicitarlo.'],
 IT:['Registrazione approvata','Congratulazioni!\n\nLa registrazione della sua azienda è stata approvata. Ora è un membro verificato di SEEDTRADE.EU.\n\nAcceda per iniziare a utilizzare il Marketplace.','Registrazione non approvata','Siamo spiacenti di informarla che non abbiamo potuto approvare la registrazione della sua azienda.\n\nPuò inviare una nuova registrazione se desidera ripresentare la domanda.']};
export function companyDecisionEmail(job,{origin,from}){
 const base=new URL(origin);if(base.origin!==origin||base.protocol!=='https:'||base.username||base.password||!['VERIFIED','REJECTED'].includes(job.decision)||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(job.email)||typeof from!=='string'||/[\r\n]/.test(from))throw Error('INVALID_DECISION_MESSAGE');
 const language=languages.includes(job.language)?job.language:'EN',c=copy[language],approved=job.decision==='VERIFIED',url=new URL(approved?'/b2b/account':'/b2b/register',origin);url.searchParams.set('lang',language.toLowerCase());
 return {from,to:job.email,subject:'SEEDTRADE.EU – '+c[approved?0:2],text:c[approved?1:3]+'\n\n'+url.href,disableFileAccess:true,disableUrlAccess:true};
}
export async function stageCompanyDecision(tx,{company,status,adminId,passwordHasher,now=()=>Date.now()}){
 if(!['VERIFIED','REJECTED'].includes(status))return {ids:[]};
 const recipients=await tx.companyDecisionRecipients(company.companyId);if(!recipients.length)throw new B2bError(400,'COMPANY_MEMBER_REQUIRED');
 let rejectedProfile;
 if(status==='REJECTED'){
  const members=await tx.retirementMembers(company.companyId);if(members.some(m=>m.companyIds.length!==1||m.companyIds[0]!==company.companyId))throw new B2bError(409,'SHARED_IDENTITY_REQUIRES_REVIEW');
  for(const m of members){await tx.retireMember({userId:m.userId,email:m.email,passwordHash:await passwordHasher.hash(randomBytes(32).toString('hex')),retiredEmail:`retired-${m.userId}-${randomBytes(16).toString('hex')}@seedtrade.invalid`});await tx.appendAudit({actorUserId:null,adminActorId:adminId,companyId:company.companyId,action:'REJECTED_MEMBER_EMAIL_RELEASED',entityType:'retired_member',entityId:String(m.userId)});}
  const profile=typeof company.profile==='string'?JSON.parse(company.profile):company.profile??{};
  rejectedProfile={...profile,accountState:'CLOSED',accessSuspended:true,identityReleasedAt:new Date(now()).toISOString(),retainedIdentity:{legalName:company.legalName,country:company.country,registrationNumber:company.number},releasedMemberIds:members.map(m=>m.userId)};
 }
 const ids=[];for(const r of recipients)ids.push(await tx.enqueueCompanyDecision({companyId:company.companyId,version:company.version+1,userId:r.userId,email:r.email,language:languages.includes(r.language)?r.language:'EN',decision:status,adminId}));
 return {ids,rejectedProfile};
}
export function createCompanyDecisionNotifications({repository,transport,origin,from,timeoutMs=8000}){
 if(!repository?.transaction||!transport?.sendMail||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)throw Error('INVALID_DECISION_TRANSPORT');
 const deliver=async id=>{
  const job=await repository.transaction(tx=>tx.claimCompanyDecision(id));if(!job)return {status:'NOT_CLAIMED'};let timer,status='UNKNOWN',code=null;
  try{const r=await Promise.race([transport.sendMail(companyDecisionEmail(job,{origin,from})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SMTP_UNKNOWN')),timeoutMs)})]);if(r?.accepted?.length===1&&String(r.accepted[0]).toLowerCase()===job.email.toLowerCase()&&!r.rejected?.length&&!r.pending?.length)status='SENT';}
  catch(e){if(Number.isInteger(e.responseCode)){code=e.responseCode;status=code>=400&&code<500&&job.attempt<3?'RETRY':'FAILED';}}finally{clearTimeout(timer)}
  await repository.transaction(async tx=>{await tx.finishCompanyDecision(id,status,code);await tx.appendAudit({actorUserId:null,adminActorId:job.adminId,companyId:job.companyId,action:'COMPANY_DECISION_EMAIL_'+status,entityType:'decision_notification',entityId:String(id)});});return {id,status};
 };
 const deliverMany=ids=>Promise.allSettled(ids.map(deliver));
 return {deliver,deliverMany,async drain(){return deliverMany(await repository.transaction(tx=>tx.pendingCompanyDecisions()));}};
}
