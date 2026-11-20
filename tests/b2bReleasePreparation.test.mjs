import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDelivery} from '../scripts/check_stage6_delivery.mjs';

test('delivery preparation never creates transport without explicit one-mail authorization',async()=>{
 let touched=0;const factory=()=>{touched++;throw Error('NO_REAL_TRANSPORT');};
 assert.equal((await checkDelivery({}, {}, factory)).status,'NOT_SENT');
 for(const input of [{execute:true},{execute:true,recipient:'another@example.invalid',authorizationRef:'synthetic-authority'},{execute:true,recipient:'info@seedtrade.eu',authorizationRef:''}])await assert.rejects(checkDelivery(input,{},factory),/EXPLICIT_SINGLE_MAIL_AUTHORIZATION_REQUIRED/);
 assert.equal(touched,0);
});

test('authorized synthetic adapter uses the existing coordination notification once and never claims inbox delivery',async()=>{
 const messages=[];let closed=0;
 const result=await checkDelivery({execute:true,recipient:'info@seedtrade.eu',authorizationRef:'SYNTHETIC_NOT_OWNER_APPROVAL'},{},()=>({from:'network@seedtrade.eu',transport:{sendMail:async message=>{messages.push(message);return {accepted:[message.to],rejected:[]};},close(){closed++;}}}));
 assert.equal(messages.length,1);assert.equal(closed,1);assert.equal(messages[0].to,'info@seedtrade.eu');assert.equal(result.status,'SMTP_ACCEPTED_INBOX_CONFIRMATION_REQUIRED');assert.equal(result.databaseWrites,0);assert.equal(result.automaticRetry,false);assert(messages[0].text.includes(result.marker));assert(!messages[0].text.includes('administration'));
});
