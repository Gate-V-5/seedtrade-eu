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

// Initial registration accepts a structured address without inventing a company
// number. Keep normalizeCompany unchanged for existing records/profile review.
export function normalizeRegistrationCompany(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('INVALID_COMPANY');
  // Cached clients from the previous release continue to submit a real number.
  if (!Object.hasOwn(input,'registeredAddress')) return normalizeCompany(input);
  const legalName = typeof input.legalName === 'string' ? input.legalName.trim() : '';
  const registrationCountry = typeof input.registrationCountry === 'string' ? input.registrationCountry.trim().toUpperCase() : '';
  if (legalName.length < 2 || legalName.length > 255 || !country.test(registrationCountry)) throw new TypeError('INVALID_COMPANY');
  let registrationNumber = null;
  if (input.registrationNumber != null && input.registrationNumber !== '') {
    if (typeof input.registrationNumber !== 'string') throw new TypeError('INVALID_COMPANY');
    registrationNumber = input.registrationNumber.trim();
    if (registrationNumber.length < 2 || registrationNumber.length > 100) throw new TypeError('INVALID_COMPANY');
  }
  const address = input.registeredAddress;
  if (!address || typeof address !== 'object' || Array.isArray(address)) throw new TypeError('INVALID_REGISTERED_ADDRESS');
  const street = typeof address.street === 'string' ? address.street.trim() : '';
  const city = typeof address.city === 'string' ? address.city.trim() : '';
  const postalCode = typeof address.postalCode === 'string' ? address.postalCode.trim().toUpperCase() : '';
  const unsafe = /[\u0000-\u001f\u007f-\u009f<>]/;
  if (street.length < 2 || street.length > 200 || unsafe.test(street) || !/\p{L}/u.test(street) || !/\p{N}/u.test(street)) throw new TypeError('INVALID_ADDRESS_STREET');
  if (!city || city.length > 100 || unsafe.test(city) || !/\p{L}/u.test(city)) throw new TypeError('INVALID_ADDRESS_CITY');
  const postalPatterns = {LT:/^(?:LT[- ]?)?\d{5}$/,DE:/^\d{5}$/,FR:/^\d{5}$/,ES:/^\d{5}$/,IT:/^\d{5}$/};
  if (!/^[\p{L}\p{N}][\p{L}\p{N} -]{0,19}$/u.test(postalCode) || (postalPatterns[registrationCountry] && !postalPatterns[registrationCountry].test(postalCode))) throw new TypeError('INVALID_ADDRESS_POSTAL_CODE');
  if (address.country != null && (typeof address.country !== 'string' || address.country.trim().toUpperCase() !== registrationCountry)) throw new TypeError('INVALID_ADDRESS_COUNTRY');
  return {legalName,registrationCountry,registrationNumber,registeredAddress:{street,city,postalCode,country:registrationCountry}};
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
