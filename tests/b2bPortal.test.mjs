import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createB2bPortalService,sessionHash,csrfForSession,SESSION_COOKIE} from '../server/b2b/portalService.mjs';
import {createB2bPortalHttp} from '../server/b2b/portalHttp.mjs';
import {createMysqlB2bRepository} from '../server/b2b/mysqlRegistrationRepository.mjs';
import {portalFixture,approvedFixture,profileFor,offerInput} from './fixtures/b2bPortalFixture.mjs';

test('registration, verification, login, profile approval, offer and buyer/seller conversation form one transactional journey',async()=>{
  const {h,s,b,admin}=await approvedFixture();
  const saved=await h.service.saveOffer(s.sessionToken,offerInput);
  assert.equal(h.state.offers.get(saved.id).status,'DRAFT');
  assert.equal((await h.service.offers(b.sessionToken,{})).items.length,0);
  await h.service.publishOffer(s.sessionToken,{id:saved.id,version:0});
  const market=await h.service.offers(b.sessionToken,{});
  assert.equal(market.items.length,1);assert.equal(market.items[0].species.botanical,'Trifolium pratense');
  assert.equal(JSON.stringify(market).includes('Test Street'),false);assert.equal(JSON.stringify(market).includes('@example.test'),false);
  const inquiry=await h.service.sendEnquiry(b.sessionToken,{offerId:saved.id,body:'Please confirm seed availability.'});
  const inbox=await h.service.enquiries(s.sessionToken,{});
  assert.equal(inbox.items[0].id,inquiry.id);assert.equal(inbox.items[0].buyerCompanyId,b.company.id);
  await h.service.reply(s.sessionToken,{id:inquiry.id,body:'The seed is available.'});
  assert.deepEqual((await h.service.messages(b.sessionToken,{id:inquiry.id})).items.map(m=>m.body),['Please confirm seed availability.','The seed is available.']);
  assert.equal(h.state.enquiries.get(inquiry.id).status,'REPLIED');
  const restarted=createB2bPortalService(h.options);
  assert.equal((await restarted.me(s.sessionToken)).user.id,s.user.id);
  assert.equal((await restarted.enquiries(s.sessionToken,{})).items.length,1);
  assert.equal(h.state.sessions.has(s.sessionToken),false);assert.equal(h.state.sessions.has(sessionHash(s.sessionToken)),true);
  assert.equal(h.state.audit.some(a=>a.action==='NOTICES_ACKNOWLEDGED'),true);
  await h.service.closeEnquiry(b.sessionToken,{id:inquiry.id});
  await assert.rejects(h.service.reply(s.sessionToken,{id:inquiry.id,body:'Cannot reply.'}),e=>e.status===409);
  await h.service.closeOffer(s.sessionToken,{id:saved.id,version:1});
  assert.equal((await h.service.offers(b.sessionToken,{})).items.length,0);
  assert.equal((await h.service.reviewQueue(admin.sessionToken,{})).items.length,3);
});

test('unverified login, verification recovery, password errors, session rotation, expiry and logout fail closed',async()=>{
  const h=portalFixture(),user=await h.register('pending',{verify:false}),oldMessage=h.mail.at(-1);
  await assert.rejects(h.service.login(user),e=>e.status===401);
  await h.service.resendVerification({...user,password:'wrong synthetic password'});assert.equal(h.mail.length,1);
  await h.service.resendVerification(user);assert.equal(h.mail.length,2);
  assert.equal((await h.registration.verifyEmail({userId:oldMessage.userId,token:oldMessage.token})).status,'INVALID_OR_EXPIRED');
  const next=h.mail.at(-1);assert.equal((await h.registration.verifyEmail({userId:next.userId,token:next.token})).status,'EMAIL_VERIFIED');
  assert.equal((await h.registration.verifyEmail({userId:next.userId,token:next.token})).status,'INVALID_OR_EXPIRED');
  await assert.rejects(h.service.login({...user,password:'wrong synthetic password'}),e=>e.status===401);
  await assert.rejects(h.service.login({email:'missing@example.test',password:user.password}),e=>e.status===401);
  const a=await h.service.login(user),b=await h.service.login(user,a.sessionToken);
  assert.notEqual(a.sessionToken,b.sessionToken);await assert.rejects(h.service.me(a.sessionToken),e=>e.status===401);
  await h.service.logout(b.sessionToken);await assert.rejects(h.service.me(b.sessionToken),e=>e.status===401);
  const c=await h.service.login(user);h.advance(8*60*60*1000+1);await assert.rejects(h.service.me(c.sessionToken),e=>e.status===401);
});

test('tenant boundaries, approval, membership and operator authorization are enforced server-side',async()=>{
  const {h,s,b,admin}=await approvedFixture();
  const saved=await h.service.saveOffer(s.sessionToken,offerInput);await h.service.publishOffer(s.sessionToken,{id:saved.id,version:0});
  await assert.rejects(h.service.closeOffer(b.sessionToken,{id:saved.id,version:1}),e=>e.status===404);
  await assert.rejects(h.service.saveOffer(b.sessionToken,{...offerInput,id:saved.id,version:1,companyId:s.company.id}),e=>e.status===404);
  await assert.rejects(h.service.reviewCompany(b.sessionToken,{companyId:s.company.id,version:2,status:'VERIFIED',reason:'Spoofed'}),e=>e.status===403);
  await assert.rejects(h.service.reviewCompany(admin.sessionToken,{companyId:admin.company.id,version:0,status:'VERIFIED',reason:'Self approval'}),e=>e.status===403);
  const incomplete=await h.register('incomplete');
  await assert.rejects(h.service.reviewCompany(admin.sessionToken,{companyId:incomplete.companyId,version:0,status:'VERIFIED',reason:'No profile'}),e=>e.status===400);
  await assert.rejects(h.service.sendEnquiry(s.sessionToken,{offerId:saved.id,body:'Self inquiry'}),e=>e.status===403);
  const inquiry=await h.service.sendEnquiry(b.sessionToken,{offerId:saved.id,body:'Private buyer message'});
  await assert.rejects(h.service.messages(admin.sessionToken,{id:inquiry.id}),e=>e.status===404);
  await assert.rejects(h.service.reply(admin.sessionToken,{id:inquiry.id,body:'Intrusion'}),e=>e.status===403||e.status===404);
  const membership=h.state.members.find(m=>m.userId===b.user.id);membership.role='MEMBER';
  await assert.rejects(h.service.saveOffer(b.sessionToken,offerInput),e=>e.status===403);
  await assert.rejects(h.service.saveProfile(b.sessionToken,profileFor((await h.service.me(b.sessionToken)).company)),e=>e.status===403);
  const sellerCompany=(await h.service.me(s.sessionToken)).company;
  await h.service.reviewCompany(admin.sessionToken,{companyId:sellerCompany.id,version:sellerCompany.version,status:'REJECTED',reason:'Identity no longer verified'});
  assert.equal((await h.service.me(s.sessionToken)).company.reviewReason,'Identity no longer verified');
  assert.equal((await h.service.offers(b.sessionToken,{})).items.length,0);
  await assert.rejects(h.service.publishOffer(s.sessionToken,{id:saved.id,version:2}),e=>e.status===403);
  await assert.rejects(h.service.sendEnquiry(b.sessionToken,{offerId:saved.id,body:'Hidden listing'}),e=>e.status===404);
  h.state.members.push({userId:b.user.id,companyId:s.company.id,role:'COMPANY_ADMIN'});
  await assert.rejects(h.service.me(b.sessionToken),e=>e.status===401);
});

test('profile changes revoke approval/publication, stale versions and invalid crops fail, audit errors roll back',async()=>{
  const {h,s,b,admin}=await approvedFixture();
  const offer=await h.service.saveOffer(s.sessionToken,offerInput);await h.service.publishOffer(s.sessionToken,{id:offer.id,version:0});
  const before=(await h.service.me(s.sessionToken)).company;
  await h.service.saveProfile(s.sessionToken,profileFor(before));
  const changed=(await h.service.me(s.sessionToken)).company;
  assert.equal(changed.status,'PENDING');assert.equal(h.state.offers.get(offer.id).status,'DRAFT');
  assert.equal((await h.service.offers(b.sessionToken,{})).items.length,0);
  await assert.rejects(h.service.saveOffer(s.sessionToken,offerInput),e=>e.status===403);
  await assert.rejects(h.service.reviewCompany(admin.sessionToken,{companyId:changed.id,version:before.version,status:'VERIFIED',reason:'Stale review'}),e=>e.status===409);
  await h.service.reviewCompany(admin.sessionToken,{companyId:changed.id,version:changed.version,status:'VERIFIED',reason:'Rechecked changes'});
  await assert.rejects(h.service.publishOffer(s.sessionToken,{id:offer.id,version:1}),e=>e.status===409);
  for(const input of [{...offerInput,cropId:'not-a-canonical-crop'},{...offerInput,quantity:0.0001},
    {...offerInput,validUntil:'2026-02-31'},{...offerInput,priceAmount:0.001}])await assert.rejects(h.service.saveOffer(s.sessionToken,input),e=>e.status===400||e instanceof TypeError);
  h.faults.audit=true;const size=h.state.offers.size;
  await assert.rejects(h.service.saveOffer(s.sessionToken,offerInput));assert.equal(h.state.offers.size,size);
  h.faults.audit=false;
  await h.service.publishOffer(s.sessionToken,{id:offer.id,version:2});
  h.faults.audit=true;
  await assert.rejects(h.service.sendEnquiry(b.sessionToken,{offerId:offer.id,body:'Must roll back message and inquiry'}));
  assert.equal(h.state.enquiries.size,0);assert.equal(h.state.messages.length,0);
});

const origin='https://staging.seedtrade.eu';
async function http(handler,route,{body,token,csrf,headers={},method=body===undefined?'GET':'POST',client='127.0.0.1',encrypted=true}={}) {
  const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
  Object.assign(req,{url:'/api/b2b/v1'+route,method,socket:{remoteAddress:client,encrypted},headers:{origin,'content-type':'application/json',...(token?{cookie:SESSION_COOKIE+'='+token}:{}),...(csrf?{'x-seedtrade-csrf':csrf}:{}),...headers}});
  const response={writeHead(status,headers){this.status=status;this.headers=headers;},end(bytes){this.body=JSON.parse(bytes);}};
  assert.equal(await handler(req,response),true);return response;
}

test('HTTP uses secure cookies, real session checks and CSRF; wrong origin/proxy/JSON and infrastructure errors cannot succeed',async()=>{
  const {h,seller}=await approvedFixture();
  const handler=createB2bPortalHttp({service:h.service,allowedOrigin:origin,enabled:true,resolveClient:req=>req.socket.encrypted?req.socket.remoteAddress:null});
  const login=await http(handler,'/login',{body:seller});assert.equal(login.status,200);
  assert.match(login.headers['Set-Cookie'],/^__Host-seedtrade_b2b_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict;/);
  assert.equal(login.body.sessionToken,undefined);
  const token=login.headers['Set-Cookie'].split('=')[1].split(';')[0],csrf=login.body.csrfToken;
  assert.equal(csrf,csrfForSession(token));
  assert.equal((await http(handler,'/session',{token})).status,200);
  const profile=profileFor(login.body.company);
  assert.equal((await http(handler,'/profile',{body:profile,token})).status,403);
  assert.equal((await http(handler,'/profile',{body:profile,token,csrf,headers:{origin:'https://attacker.test'}})).status,403);
  assert.equal((await http(handler,'/profile',{body:profile,token,csrf,encrypted:false})).status,403);
  assert.equal((await http(handler,'/profile',{body:'{invalid',token,csrf})).status,400);
  assert.equal((await http(handler,'/profile',{body:'x'.repeat(16385),token,csrf})).status,400);
  const forged='a'.repeat(64);
  assert.equal((await http(handler,'/profile',{body:profile,token:forged,csrf:csrfForSession(forged)})).status,401);
  assert.equal((await http(handler,'/session',{headers:{cookie:`${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`}})).status,401);
  h.faults.audit=true;
  const failed=await http(handler,'/profile',{body:profile,token,csrf});assert.equal(failed.status,503);assert.deepEqual(failed.body,{error:'TEMPORARILY_UNAVAILABLE'});
  h.faults.audit=false;
  const logout=await http(handler,'/logout',{body:{},token,csrf});assert.equal(logout.status,200);assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
  assert.equal((await http(handler,'/session',{token})).status,401);
  const closed=createB2bPortalHttp({enabled:false});assert.equal((await http(closed,'/login',{body:seller})).status,404);
});

test('login and verification recovery share account limits across client addresses',async()=>{
  const h=portalFixture();
  const handler=createB2bPortalHttp({service:h.service,allowedOrigin:origin,enabled:true,resolveClient:r=>r.socket.remoteAddress});
  for(let i=0;i<5;i++)assert.equal((await http(handler,i%2?'/resend-verification':'/login',{body:{email:'same@example.test',password:'wrong synthetic password'},client:'192.0.2.'+(i+1)})).status,i%2?202:401);
  assert.equal((await http(handler,'/login',{body:{email:'same@example.test',password:'wrong synthetic password'},client:'192.0.2.99'})).status,429);
});

test('persistent adapter binds hostile values and scopes queries to session hash and company ownership',async()=>{
  const calls=[];let committed=false,released=false;
  const connection={async beginTransaction(){},async commit(){committed=true;},async rollback(){},release(){released=true;},async execute(sql,args){calls.push({sql,args});return sql.trim().startsWith('SELECT')?[[]]:[{insertId:7,affectedRows:1}];}};
  const repository=createMysqlB2bRepository({async getConnection(){return connection;}}),hostile="Synthetic ' ; DROP TABLE users; --";
  await repository.transaction(async tx=>{
    await tx.findLogin(hostile);await tx.sessionContext('b'.repeat(64));
    await tx.saveProfile({companyId:8,legalName:hostile,country:'LT',number:'SYN',profile:{contactName:hostile},version:3});
    await tx.saveOffer({...offerInput,id:7,companyId:8,version:3});
    await tx.listOffers({companyId:8,own:false,after:0});
    await tx.listEnquiries({companyId:8,after:0});await tx.enquiryMessages({enquiryId:7,after:0});
    await tx.insertMessage({enquiryId:7,userId:9,companyId:8,body:hostile});
  });
  assert.equal(committed,true);assert.equal(released,true);
  assert.equal(calls.every(c=>!c.sql.includes(hostile)),true);
  assert.match(calls.find(c=>c.sql.includes('FROM b2b_sessions')).sql,/s\.token_hash=\?.*s\.expires_at>UTC_TIMESTAMP\(3\).*FOR UPDATE/s);
  assert.match(calls.find(c=>c.sql.includes('UPDATE b2b_offers SET crop_id')).sql,/company_id=\?.*version=\?.*status='DRAFT'/s);
  assert.match(calls.find(c=>c.sql.includes('FROM b2b_enquiries e')).sql,/e\.buyer_company_id=\? OR o\.company_id=\?/);
  assert.equal(calls.some(c=>c.args.includes(hostile)),true);
});
