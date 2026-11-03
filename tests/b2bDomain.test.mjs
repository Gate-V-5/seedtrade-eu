import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCompany, normalizeOffer, canPublishOffer, canCreateEnquiry, isCompanyState, isOfferState} from '../server/b2b/domain.mjs';

test('company registration validates and normalizes legal identity', () => {
  assert.deepEqual(normalizeCompany({legalName:'  Seed Company  ',registrationCountry:'lt',registrationNumber:' 12345 '}),{
    legalName:'Seed Company',registrationCountry:'LT',registrationNumber:'12345'
  });
  assert.throws(()=>normalizeCompany({legalName:'X',registrationCountry:'Lithuania',registrationNumber:''}), /INVALID_COMPANY/);
});
test('offer uses canonical crop IDs and rejects invalid quantities', () => {
  assert.deepEqual(normalizeOffer({cropId:'wheat.winter',quantity:24,unit:'t'}),{
    cropId:'wheat.winter',varietyId:null,quantity:24,unit:'t',priceAmount:null
  });
  assert.throws(()=>normalizeOffer({cropId:'wheat',quantity:-1,unit:'kg'}),/INVALID_OFFER/);
  assert.throws(()=>normalizeOffer({cropId:'wheat',quantity:NaN,unit:'kg'}),/INVALID_OFFER/);
});
test('unverified company cannot publish offers or submit enquiries', () => {
  assert.equal(canPublishOffer({companyStatus:'PENDING',memberRole:'COMPANY_ADMIN'}),false);
  assert.equal(canPublishOffer({companyStatus:'VERIFIED',memberRole:'COMPANY_ADMIN'}),true);
  assert.equal(canPublishOffer({companyStatus:'VERIFIED',memberRole:'MEMBER'}),false);
  assert.equal(canCreateEnquiry({companyStatus:'PENDING',memberRole:'MEMBER',buyerCompanyId:1,sellerCompanyId:2}),false);
  assert.equal(canCreateEnquiry({companyStatus:'VERIFIED',memberRole:'MEMBER',buyerCompanyId:1,sellerCompanyId:2}),true);
  assert.equal(canCreateEnquiry({companyStatus:'VERIFIED',memberRole:'MEMBER',buyerCompanyId:1,sellerCompanyId:1}),false);
});
test('state allowlists are explicit', () => {
  assert.equal(isCompanyState('VERIFIED'),true);
  assert.equal(isCompanyState('UNKNOWN'),false);
  assert.equal(isOfferState('PUBLISHED'),true);
  assert.equal(isOfferState('REMOVED'),false);
});
