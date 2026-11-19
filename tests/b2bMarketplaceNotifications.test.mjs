import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketplaceNotifications,marketplaceEmail,marketplaceOperation} from '../server/b2b/marketplaceNotifications.mjs';
import {createB2bPortalService} from '../server/b2b/portalService.mjs';
import {createMysqlB2bRepository} from '../server/b2b/mysqlRegistrationRepository.mjs';
import {approvedFixture,offerInput} from './fixtures/b2bPortalFixture.mjs';

async function fixture(send){
 const f=await approvedFixture(),messages=[];
 const transport={async sendMail(message){messages.push(message);return send?send(message):{accepted:[message.to],rejected:[],response:'250 queued',messageId:'synthetic@example.test'};}};
 const notifications=createMarketplaceNotifications({repository:f.h.repository,transport,from:'sender@example.test',origin:'https://staging.seedtrade.eu',timeoutMs:30});
 f.h.service=createB2bPortalService({...f.h.options,notifications});
 const offer=await f.h.service.saveOffer(f.s.sessionToken,offerInput);await f.h.service.publishOffer(f.s.sessionToken,{id:offer.id,version:0});
 return {...f,offer,messages,notifications};
}

test('enquiry and seller reply commit before SMTP, use verified database owners, and expose safe plain/HTML references',async()=>{
 let f;f=await fixture(async message=>{assert.equal(f.h.state.enquiries.size,1);assert.ok(f.h.state.messages.length>=1);return {accepted:[message.to],rejected:[],response:'250 queued'};});
 const enquiry=await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Private commercial text PASSWORD and token='+ 'a'.repeat(64),email:'attacker@example.test'});
 assert.equal(f.messages.length,1);assert.equal(f.messages[0].to,f.seller.email);
 assert.match(f.messages[0].subject,/^\[STAGING TEST\]/);assert.match(f.messages[0].text,/Synthetic staging test/);
 await f.h.service.reply(f.s.sessionToken,{id:enquiry.id,body:'Private reply: <script>alert(1)</script>',to:'attacker@example.test'});
 assert.equal(f.messages.length,2);assert.equal(f.messages[1].to,f.buyer.email);
 for(const message of f.messages){assert.ok(message.text.includes('Red clover'));assert.ok(message.text.includes('/b2b/account/?view=conversation'));assert.ok(message.html.includes('<a href='));assert.equal(message.disableFileAccess,true);assert.equal(message.disableUrlAccess,true);assert.equal(JSON.stringify(message).includes('Private'),false);assert.equal(JSON.stringify(message).includes('PASSWORD'),false);assert.equal(JSON.stringify(message).includes('a'.repeat(64)),false);assert.equal(JSON.stringify(message).includes(f.b.sessionToken),false);}
 assert.deepEqual([...f.h.state.notifications.values()].map(n=>[n.status,n.attemptCount]),[['ACCEPTED',1],['ACCEPTED',1]]);
});

test('concurrent retries and restarts create only one enquiry/reply, audit event and submission for each request',async()=>{
 const f=await fixture(),input={offerId:f.offer.id,body:'Synthetic enquiry',requestId:'enquiry-request-0001'};
 const enquiries=await Promise.all([f.h.service.sendEnquiry(f.b.sessionToken,input),f.h.service.sendEnquiry(f.b.sessionToken,input)]);
 assert.deepEqual(enquiries[0],enquiries[1]);assert.equal(f.messages.length,1);assert.equal(f.h.state.messages.length,1);
 const reply={id:enquiries[0].id,body:'Synthetic seller reply',requestId:'reply-request-000001'};
 await Promise.all([f.h.service.reply(f.s.sessionToken,reply),f.h.service.reply(f.s.sessionToken,reply)]);
 const restarted=createB2bPortalService({...f.h.options,notifications:f.notifications});await restarted.reply(f.s.sessionToken,reply);
 assert.equal(f.messages.length,2);assert.equal(f.h.state.messages.length,2);
 assert.equal(f.h.state.audit.filter(a=>a.action==='ENQUIRY_CREATED').length,1);assert.equal(f.h.state.audit.filter(a=>a.action==='ENQUIRY_REPLY').length,1);
 await assert.rejects(restarted.reply(f.s.sessionToken,{...reply,body:'Different payload with same key'}),e=>e.status===409&&e.message==='IDEMPOTENCY_CONFLICT');
});

test('legacy clients deduplicate identical retries; explicit new request IDs permit intentional repeated content',async()=>{
 const f=await fixture(),input={offerId:f.offer.id,body:'Synthetic enquiry'};
 const e=await f.h.service.sendEnquiry(f.b.sessionToken,input);await f.h.service.sendEnquiry(f.b.sessionToken,input);
 await f.h.service.reply(f.s.sessionToken,{id:e.id,body:'Same reply'});await f.h.service.reply(f.s.sessionToken,{id:e.id,body:'Same reply'});
 assert.equal(f.messages.length,2);
 await f.h.service.reply(f.s.sessionToken,{id:e.id,body:'Same reply',requestId:'intentional-new-reply-01'});assert.equal(f.messages.length,3);
});

test('SMTP rejection preserves committed records, records FAILED, and does not automatically retry',async()=>{
 const f=await fixture(()=>{throw Object.assign(Error('secret SMTP details must not escape'),{responseCode:550});});
 const e=await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});
 assert.ok(f.h.state.enquiries.has(e.id));assert.equal(f.h.state.messages.length,1);
 const n=[...f.h.state.notifications.values()][0];assert.equal(n.status,'FAILED');assert.equal(n.smtpCode,550);assert.equal(n.failureCode,'SMTP_REJECTED');
 await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});assert.equal(f.messages.length,1);
});

test('timeout/unknown submission remains UNKNOWN and is never automatically retried',async()=>{
 const f=await fixture(()=>new Promise(()=>{}));
 const e=await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});
 const n=[...f.h.state.notifications.values()][0];assert.equal(n.status,'UNKNOWN');assert.ok(f.h.state.enquiries.has(e.id));
 await f.notifications.deliver(n.id);assert.equal(f.messages.length,1);
});

test('outcome-store failure after acceptance leaves a durable SENDING claim, not a second SMTP attempt',async()=>{
 const f=await fixture();f.h.faults.notificationOutcome=true;
 await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});
 const n=[...f.h.state.notifications.values()][0];assert.equal(n.status,'SENDING');assert.equal(n.attemptCount,1);
 f.h.faults.notificationOutcome=false;await f.notifications.deliver(n.id);assert.equal(f.messages.length,1);
});

test('business transaction rollback sends nothing and leaves no queued notification',async()=>{
 const f=await fixture();f.h.faults.audit=true;
 await assert.rejects(f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'}));
 assert.equal(f.h.state.enquiries.size,0);assert.equal(f.h.state.messages.length,0);assert.equal(f.h.state.notifications.size,0);assert.equal(f.messages.length,0);
});

test('cross-company and self-enquiry checks run before notification creation; buyer reply does not email itself',async()=>{
 const f=await fixture();
 await assert.rejects(f.h.service.sendEnquiry(f.s.sessionToken,{offerId:f.offer.id,body:'Self'}),e=>e.status===403);
 const e=await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});
 f.h.state.companies.get(f.admin.company.id).status='VERIFIED';
 await assert.rejects(f.h.service.reply(f.admin.sessionToken,{id:e.id,body:'Intrusion',email:f.buyer.email}),e=>e.status===404);
 await f.h.service.reply(f.b.sessionToken,{id:e.id,body:'Buyer follow-up'});
 assert.equal(f.messages.length,1);assert.equal([...f.h.state.notifications.values()].at(-1).status,'SKIPPED');
});

test('ambiguous or unverified company recipients are recorded BLOCKED instead of emailing an arbitrary user',async()=>{
 const f=await fixture();f.h.state.members.push({userId:f.admin.user.id,companyId:f.s.company.id,role:'COMPANY_ADMIN'});
 const e=await f.h.service.sendEnquiry(f.b.sessionToken,{offerId:f.offer.id,body:'Synthetic enquiry'});
 assert.ok(e.id);assert.equal(f.messages.length,0);assert.equal([...f.h.state.notifications.values()][0].status,'BLOCKED');
});

test('email templates escape HTML and never use arbitrary body/profile/recipient fields',()=>{
 const email=marketplaceEmail({from:'sender@example.test',origin:'https://staging.seedtrade.eu',job:{kind:'ENQUIRY',recipientEmail:'seller@example.test',payload:{offerId:1,enquiryId:2,product:'<img src=x onerror="x"> & wheat',quantity:20,unit:'t',body:'private',password:'secret'}}});
 assert.ok(email.html.includes('&lt;img'));assert.ok(email.html.includes('&quot;'));assert.ok(!email.html.includes('<img'));assert.ok(email.text.includes('<img'));
 assert.ok(!JSON.stringify(email).includes('secret'));assert.ok(!JSON.stringify(email).includes('private'));
 assert.throws(()=>marketplaceOperation('ENQUIRY',1,2,'body','bad\nkey'),/INVALID_REQUEST/);
});

test('SQL adapter uses durable conditional claims, ownership joins and bound notification values',async()=>{
 const calls=[];const db={async beginTransaction(){},async commit(){},async rollback(){},release(){},async execute(sql,args){calls.push({sql,args});if(sql.includes('SELECT e.id AS enquiryId'))return [[{enquiryId:1,offerId:2,sellerCompanyId:3,buyerCompanyId:4,buyerUserId:5}]];if(sql.includes('SELECT u.id AS userId'))return [[{userId:6,email:'owner@example.test'}]];if(sql.includes('SELECT n.id FROM b2b_marketplace_notifications'))return [[{id:7}]];if(sql.includes('SELECT id,kind,recipient_email'))return [[{id:7}]];return sql.trim().startsWith('SELECT')?[[]]:[{insertId:7,affectedRows:1}];}};
 const repo=createMysqlB2bRepository({async getConnection(){return db;}});
 await repo.transaction(async tx=>{await tx.marketplaceNotificationContext(1,'SELLER_REPLY');await tx.marketplaceOperation({actorUserId:1,kind:'ENQUIRY',requestKey:'key'});await tx.claimMarketplaceNotification(7);await tx.finishMarketplaceNotification({id:7,status:'ACCEPTED',failureCode:null,smtpCode:250,messageIdHash:null});});
 assert.match(calls.find(c=>c.sql.includes("status='SENDING'")).sql,/status='PENDING' AND attempt_count=0/);
 assert.match(calls.find(c=>c.sql.includes('JOIN b2b_company_members m ON m.user_id=u.id')).sql,/u\.id=\? AND m\.company_id=\?/);
 assert.ok(calls.every(c=>!c.sql.includes('owner@example.test')));
});
