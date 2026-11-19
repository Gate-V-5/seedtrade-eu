// Trusted server policy boundary. Future billing types are reserved, not implemented.
export const futureMembershipTypes=Object.freeze(['FREE_LAUNCH','ONE_TIME','MONTHLY','ANNUAL']);
export function marketplaceEntitled(actor,capability,entitlement={type:'FREE_LAUNCH'}){
 return ['VIEW_FULL_OFFERS','PUBLISH_OFFERS','COMMUNICATE'].includes(capability)&&actor.company.status==='VERIFIED'&&entitlement.type==='FREE_LAUNCH';
}
