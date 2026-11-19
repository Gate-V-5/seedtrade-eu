// Existing separate MFA auth is mandatory. Company-review permission alone grants nothing here.
export function createTradingAdmin({repository,auth,workflow,bindings=[],ErrorType}){
 if(!auth?.authenticate||!Array.isArray(bindings)||bindings.some(b=>!Number.isSafeInteger(b.adminId)||!Number.isSafeInteger(b.companyId)||b.adminId<1||b.companyId<1))throw Error('INVALID_BROKERAGE_BINDING');
 const actor=async(tx,token)=>{const a=await auth.authenticate(tx,token);if(!bindings.some(b=>b.adminId===a.adminId))throw new ErrorType(403,'BROKERAGE_ASSIGNMENT_REQUIRED');return a;};
 return {
  available:token=>repository.transaction(async tx=>{const a=await auth.authenticate(tx,token);return bindings.some(b=>b.adminId===a.adminId);}),
  action:(token,input)=>repository.transaction(async tx=>workflow.operatorAction(tx,await actor(tx,token),input,bindings)),
  detail:(token,input)=>repository.transaction(async tx=>{const a=await actor(tx,token),r=await tx.tradingRecord(input.id);if(!r||!Array.isArray(a.conflictCompanyIds)||a.conflictCompanyIds.some(id=>[r.buyerCompanyId,r.sellerCompanyId].includes(id)))throw new ErrorType(404,'NOT_FOUND');if(!r.operator)return {transaction:null,assignment:{id:r.enquiryId,version:r.version,buyerName:r.buyerName,sellerName:r.sellerName}};if(!bindings.some(b=>b.adminId===a.adminId&&b.companyId===r.operator.companyId))throw new ErrorType(404,'NOT_FOUND');return {transaction:r,messages:await tx.enquiryMessages({enquiryId:r.enquiryId,after:0})};})
 };
}
