// Superseded by dedicated administrator identities. Old bindings fail closed.
export function companyReviewBinding(env){if(env.B2B_COMPANY_REVIEW_USER_IDS||!['disabled',undefined].includes(env.B2B_COMPANY_REVIEW_MODE))throw Error('MEMBER_REVIEWER_MODE_RETIRED');return [];}
