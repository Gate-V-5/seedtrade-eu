// B2B V1 domain validation. Pure functions: no database, network, or side effects.
const allowedRoles = new Set(['MEMBER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN']);
const companyStates = new Set(['PENDING', 'VERIFIED', 'MORE_INFO', 'REJECTED']);
const offerStates = new Set(['DRAFT', 'PUBLISHED', 'CLOSED']);
const country = /^[A-Z]{2}$/;
const cropId = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

export function normalizeCompany(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('INVALID_COMPANY');
  const legalName = typeof input.legalName === 'string' ? input.legalName.trim() : '';
  const registrationCountry = typeof input.registrationCountry === 'string' ? input.registrationCountry.trim().toUpperCase() : '';
  const registrationNumber = typeof input.registrationNumber === 'string' ? input.registrationNumber.trim() : '';
  if (legalName.length < 2 || legalName.length > 255 || !country.test(registrationCountry) ||
      registrationNumber.length < 2 || registrationNumber.length > 100) throw new TypeError('INVALID_COMPANY');
  return {legalName, registrationCountry, registrationNumber};
}

export function normalizeOffer(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('INVALID_OFFER');
  const id = input.cropId;
  const quantity = input.quantity;
  const unit = input.unit;
  if (typeof id !== 'string' || !cropId.test(id) ||
      typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 ||
      !['kg', 't'].includes(unit)) throw new TypeError('INVALID_OFFER');
  if (input.varietyId != null && (typeof input.varietyId !== 'string' || !cropId.test(input.varietyId))) throw new TypeError('INVALID_OFFER');
  if (input.priceAmount != null && (typeof input.priceAmount !== 'number' || !Number.isFinite(input.priceAmount) || input.priceAmount < 0)) throw new TypeError('INVALID_OFFER');
  return {cropId: id, varietyId: input.varietyId ?? null, quantity, unit,
    priceAmount: input.priceAmount ?? null};
}

export function canPublishOffer({companyStatus, memberRole}) {
  return companyStatus === 'VERIFIED' && ['COMPANY_ADMIN', 'PLATFORM_ADMIN'].includes(memberRole);
}

export function canCreateEnquiry({companyStatus, memberRole, buyerCompanyId, sellerCompanyId}) {
  return companyStatus === 'VERIFIED' && allowedRoles.has(memberRole) &&
    buyerCompanyId != null && sellerCompanyId != null &&
    String(buyerCompanyId) !== String(sellerCompanyId);
}

export function isCompanyState(value) { return companyStates.has(value); }
export function isOfferState(value) { return offerStates.has(value); }
