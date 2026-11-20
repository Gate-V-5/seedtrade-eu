// One separately authorized SMTP-to-inbox probe; never creates a Member or DB record.
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createB2bRegistrationMail} from '../server/b2b/verificationMailer.mjs';
import {createEnquiryConfirmation} from '../server/b2b/enquiryConfirmation.mjs';
import {brokerageCoordination} from '../server/b2b/brokerageOperators.mjs';
import {brokerageProvider} from '../shared/brokerageProvider.mjs';

export async function checkDelivery({execute=false,recipient,authorizationRef}={},env=process.env,mailFactory=createB2bRegistrationMail){
 if(!execute)return {status:'NOT_SENT',messages:0,proposedRecipient:brokerageCoordination.email,authorizationRequired:true};
 if(recipient!==brokerageCoordination.email||typeof authorizationRef!=='string'||authorizationRef.trim().length<3||authorizationRef.length>200)throw Error('EXPLICIT_SINGLE_MAIL_AUTHORIZATION_REQUIRED');
 const marker='SEEDTRADE-CONTROLLED-DELIVERY-'+randomUUID();
 const record={enquiryId:1,listingId:1,version:0,operator:brokerageProvider,
  enquiryConfirmation:{state:'CONFIRMED',operatorMail:'PENDING',summary:{testOnly:true,marker,message:'Synthetic delivery probe. No real listing, member, order, contract or fee.'},operatorContacts:{company:'SYNTHETIC TEST ONLY',email:'synthetic@example.invalid'},confirmedAt:new Date().toISOString(),userId:null}};
 const repository={transaction:async work=>work({tradingRecord:async()=>structuredClone(record),saveTradingRecord:async value=>Object.assign(record,structuredClone(value)),appendAudit:async()=>{}})};
 const mail=mailFactory(env);
 try{
  const confirmation=createEnquiryConfirmation({repository,...mail,origin:'https://seedtrade.eu',operatorRecipient:brokerageCoordination,ErrorType:Error});
  const outcome=await confirmation.deliverOperator(1);
  return {status:outcome.status==='SENT'?'SMTP_ACCEPTED_INBOX_CONFIRMATION_REQUIRED':outcome.status,messagesAttempted:1,marker,authorizationRef:authorizationRef.trim(),databaseWrites:0,realMemberAccounts:0,automaticRetry:false};
 }finally{mail.transport.close();}
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
 try{
  const result=await checkDelivery({execute:args.includes('--execute'),recipient:args.includes('--recipient')?value('--recipient'):undefined,authorizationRef:args.includes('--authorization-ref')?value('--authorization-ref'):undefined});
  console.log(JSON.stringify(result));
 }catch{console.error('DELIVERY_CHECK_STOPPED; no retry. Verify the explicit recipient, authorization and existing private SMTP configuration.');process.exitCode=1;}
}
