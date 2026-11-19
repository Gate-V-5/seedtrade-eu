import test from 'node:test';
import assert from 'node:assert/strict';
import {tradingFixture} from './fixtures/tradingFixture.mjs';
import {createTradingAdmin} from '../server/b2b/tradingAdmin.mjs';
import {B2bError} from '../server/b2b/portalService.mjs';

test('existing MFA administrator ID format works only with explicit matching brokerage authority',async()=>{
 const f=await tradingFixture(),adminId='a'.repeat(32);
 // Synthetic isolated authentication result; no real admin, MFA secret or grant is created.
 const auth={authenticate:async(tx,token)=>{assert.equal(token,f.brokerToken);return {adminId,platformAdmin:true,conflictCompanyIds:[]};}};
 const binding={adminId,companyId:f.operatorCompanyId,operatorKey:'GATE_V',permissions:['broker:assign']};
 const make=bindings=>createTradingAdmin({repository:f.h.repository,auth,workflow:f.workflow,bindings,ErrorType:B2bError});
 assert.equal(await make([binding]).available(f.brokerToken),true);
 assert.equal(await make([]).available(f.brokerToken),false);
 assert.equal(await make([{...binding,adminId:'b'.repeat(32)}]).available(f.brokerToken),false);
 assert.equal(await make([{...binding,permissions:[]}]).available(f.brokerToken),false);
 for(const invalid of ['info@seedtrade.eu','',0,-1,'A'.repeat(32),'a'.repeat(31),'a'.repeat(33),null])assert.throws(()=>make([{...binding,adminId:invalid}]),/INVALID_BROKERAGE_BINDING/);
 assert.throws(()=>make([{...binding,operatorKey:'LAGRENAS'}]),/INVALID_BROKERAGE_BINDING/);
 assert.throws(()=>make([{...binding,permissions:['invoice:issue']}]),/INVALID_BROKERAGE_BINDING/);
});
