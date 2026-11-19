// Hosted Marketplace V1 is an explicit, bounded activation. Existing evidence gates remain mandatory.
export const marketplaceTrueGates=Object.freeze(['B2B_PORTAL_STORAGE_VERIFIED','B2B_MARKETPLACE_NOTIFICATIONS_ENABLED','B2B_ENQUIRIES_ENABLED','B2B_RUNTIME_VERIFIED','B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED','B2B_DELIVERY_ENABLED','B2B_PROXY_VERIFIED','B2B_RETENTION_DELETION_APPROVED']);
export function hostedMarketplaceEnabled(env){
 const mode=env.B2B_MARKETPLACE_MODE;if(mode==null||mode==='disabled')return false;
 if(mode!=='marketplace-v1'||env.SEEDTRADE_RUNTIME_ENV!=='production'||env.B2B_MEMBER_AUTH_MODE!=='member-only-v1'||env.B2B_PRODUCTION_RELEASE_APPROVED!=='true'||marketplaceTrueGates.some(key=>env[key]!=='true')||env.B2B_PORTAL_ENABLED!=='false'||env.B2B_PLATFORM_ADMIN_ENABLED!=='false'||env.B2B_PLATFORM_ADMIN_USER_IDS||env.B2B_REGISTRATION_MAIL_TRANSPORT!=='smtp')throw Error('MARKETPLACE_ACTIVATION_GATES_REQUIRED');
 return true;
}
