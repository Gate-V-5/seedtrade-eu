import {mfaKey} from './adminMfa.mjs';
export function adminConfiguration(env){
 const mode=env.B2B_ADMIN_MODE;
 if(mode==null||mode==='disabled'){if(env.B2B_ADMIN_MFA_KEY)throw Error('ADMIN_CONFIGURATION');return null;}
 if(mode!=='admin-review-v1'||env.B2B_MEMBER_AUTH_MODE!=='member-only-v1'||env.B2B_PORTAL_STORAGE_VERIFIED!=='true'||env.B2B_PLATFORM_ADMIN_ENABLED!=='false'||env.B2B_PORTAL_ENABLED!=='false'||env.B2B_PLATFORM_ADMIN_USER_IDS||env.B2B_COMPANY_REVIEW_USER_IDS||!['disabled',undefined].includes(env.B2B_COMPANY_REVIEW_MODE))throw Error('ADMIN_CONFIGURATION');
 return {key:mfaKey(env.B2B_ADMIN_MFA_KEY)};
}
