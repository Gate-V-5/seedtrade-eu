import test from 'node:test';
import assert from 'node:assert/strict';
import {adminTransactionMethods} from '../server/b2b/adminRepository.mjs';
test('owner-authorized review needs no asserted exhaustive affiliation list; email exclusions remain',async()=>{
 let email;
 const tx=adminTransactionMethods({execute:async(q,args)=>{email=args[0];return [[{company_id:2},{company_id:9}]];}});
 assert.deepEqual(await tx.adminConflicts({email:'info@seedtrade.eu',conflict_company_ids:null,conflicts_confirmed_at:null,owner_authorization_ref:'Owner authorized minimum company review'}),[2,9]);
 assert.equal(email,'info@seedtrade.eu');
 assert.deepEqual(await tx.adminConflicts({email:'info@seedtrade.eu',conflict_company_ids:'[7]',owner_authorization_ref:'Owner authorized minimum company review'}),[7,2,9]);
});
test('missing owner authorization and malformed exclusions remain rejected before database access',async()=>{
 const tx=adminTransactionMethods({execute:async()=>{throw Error('unexpected database access');}});
 for(const a of [{conflict_company_ids:null},{conflict_company_ids:[0],owner_authorization_ref:'owner'},{conflict_company_ids:{},owner_authorization_ref:'owner'}])await assert.rejects(tx.adminConflicts(a),/ADMIN_CONFLICT_RECORD_REQUIRED/);
});
