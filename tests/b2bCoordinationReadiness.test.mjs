import test from 'node:test';import assert from 'node:assert/strict';
import {brokerageCoordination,brokerageOperators} from '../server/b2b/brokerageOperators.mjs';
import {tradingFixture} from './fixtures/tradingFixture.mjs';
test('owner-approved coordination recipient retains explicit attestation scope without granting authority',()=>{
 assert.deepEqual(Object.keys(brokerageOperators),['GATE_V']);assert.equal(brokerageCoordination.email,'info@seedtrade.eu');assert.equal(brokerageCoordination.verified,true);assert(brokerageCoordination.evidenceRef.endsWith('#stage6FinalProductionReadiness.coordination'));assert(brokerageCoordination.verificationBasis.includes('NOT_INDEPENDENT_DELIVERY'));assert.equal(brokerageCoordination.adminId,undefined);assert.equal(brokerageCoordination.companyId,undefined);assert(Object.isFrozen(brokerageCoordination));
});
test('local tests still use the explicit synthetic recipient and never send real coordination mail',async()=>{const f=await tradingFixture({simple:true});assert.equal(f.delivered.length,0);assert(f.confirmation);});
