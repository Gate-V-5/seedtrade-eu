import test from 'node:test';import assert from 'node:assert/strict';
import {portalFixture} from './fixtures/b2bPortalFixture.mjs';import {createRegistrationService} from '../server/b2b/registrationService.mjs';import {currentLegalRegistry} from '../server/b2b/legalAcceptance.mjs';
test('register → single-use email verification/password creation → login; company stays pending',async()=>{
 const h=portalFixture(),service=createRegistrationService({...h.options,simpleRegistration:true}),password='new synthetic password only';
 const input={email:'simple-member@example.invalid',termsAccepted:true,locale:'en',legalBundleId:currentLegalRegistry.bundleId,company:{legalName:'Synthetic Simple Company',registrationNumber:'SYN-SIMPLE-001',registrationCountry:'LT',registeredAddress:{street:'Test Street 1',city:'Vilnius',postalCode:'LT-00000'},vat:'',contactFirstName:'Test',contactLastName:'Member'}};
 const r=await service.register(input);assert.equal(r.status,'PENDING_EMAIL_VERIFICATION');const m=h.mail.at(-1),u=h.state.users.get(r.userId);assert(u.passwordHash.startsWith('scrypt$'));assert(!u.passwordHash.includes(password));
 await assert.rejects(h.service.login({email:input.email,password}));await assert.rejects(service.verifyEmail({userId:r.userId,token:m.token,password:'short'}));
 await assert.rejects(service.register(input));assert.equal(h.state.companies.size,1);assert.equal(h.state.users.size,1);
 assert.equal((await service.verifyEmail({userId:r.userId,token:m.token,password})).status,'EMAIL_VERIFIED');
 assert.equal((await service.verifyEmail({userId:r.userId,token:m.token,password})).status,'INVALID_OR_EXPIRED');const login=await h.service.login({email:input.email,password});assert.equal(login.company.status,'PENDING');
 assert.equal(h.state.companies.get(r.companyId).profile.contactFirstName,'Test');assert.equal(h.state.mail,undefined);await assert.rejects(h.service.publishOffer(login.sessionToken,{id:1,version:0}),e=>e.status===403);
});
test('new registration requires company number and representative names, without inventing VAT',async()=>{const h=portalFixture(),r=createRegistrationService({...h.options,simpleRegistration:true});await assert.rejects(r.register({email:'x@example.invalid',termsAccepted:true,locale:'en',legalBundleId:currentLegalRegistry.bundleId,company:{legalName:'Test Company',registrationCountry:'LT',registeredAddress:{street:'Test 1',city:'Test',postalCode:'00000'}}}),/INVALID_COMPANY/);assert.equal(h.state.users.size,0);});
