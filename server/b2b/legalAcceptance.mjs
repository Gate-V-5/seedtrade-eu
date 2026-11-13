import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function verifyLegalRegistry(registry) {
  if(!registry||registry.format!=='seedtrade-legal-registry-v1')throw Error('LEGAL_REGISTRY_INVALID');
  const keys=['authority','privacy','terms'];
  if(Object.keys(registry.documents??{}).sort().join(',')!==keys.join(','))throw Error('LEGAL_DOCUMENT_SET_INVALID');
  for(const kind of keys){const d=registry.documents[kind];if(d.document.kind!==kind||digest(d.document)!==d.id||d.path!==`/legal/snapshots/${d.id}.html`||!d.document.version||!d.document.sections?.length)throw Error('LEGAL_SNAPSHOT_INTEGRITY');}
  const binding={documents:Object.fromEntries(keys.map(k=>[k,registry.documents[k].id])),approval:registry.approval,missingFacts:registry.missingFacts,ownerFactsSha256:registry.ownerFactsSha256};
  if(digest(binding)!==registry.bundleId)throw Error('LEGAL_BUNDLE_INTEGRITY');
  return freeze(registry);
}
export const currentLegalRegistry=verifyLegalRegistry(JSON.parse(readFileSync(new URL('./legal/registry.json',import.meta.url),'utf8')));
export function legalPublicationApproved(registry=currentLegalRegistry) {
  return registry.approval?.status==='APPROVED'&&typeof registry.approval.reference==='string'&&registry.approval.reference.trim().length>0&&
    /^\d{4}-\d{2}-\d{2}$/.test(registry.approval.effectiveDate??'')&&registry.missingFacts?.length===0&&
    Object.values(registry.documents).every(d=>d.document.status==='APPROVED');
}
export function validateLegalAcceptance(input,registry=currentLegalRegistry) {
  verifyLegalRegistry(registry);
  if(!legalPublicationApproved(registry))throw Error('LEGAL_PUBLICATION_NOT_APPROVED');
  if(input.termsAccepted!==true)throw new TypeError('INVALID_TERMS_ACCEPTANCE');
  if(!['lt','en'].includes(input.locale))throw new TypeError('INVALID_LEGAL_LOCALE');
  if(input.legalBundleId!==registry.bundleId)throw new TypeError('INVALID_LEGAL_VERSION');
  // Registration must not acquire marketing permission from unknown/extra fields.
  if(input.marketing===true||input.marketingConsent===true)throw new TypeError('INVALID_MARKETING_DISABLED');
  return {registry,locale:input.locale};
}
export async function appendLegalAcceptance(tx,{userId,companyId},{registry,locale}) {
  const events=[['TERMS_ACCEPTED','terms'],['PRIVACY_NOTICE_PROVIDED','privacy'],['REPRESENTATIVE_AUTHORITY_CONFIRMED','authority']];
  await tx.appendAudit({actorUserId:userId,companyId,action:'LEGAL_BUNDLE_ACCEPTED',entityType:'legal_bundle',entityId:registry.bundleId});
  await tx.appendAudit({actorUserId:userId,companyId,action:'LEGAL_PRESENTATION_'+locale.toUpperCase(),entityType:'legal_bundle',entityId:registry.bundleId});
  for(const [action,kind] of events)await tx.appendAudit({actorUserId:userId,companyId,action,entityType:'legal_snapshot',entityId:registry.documents[kind].id});
}
