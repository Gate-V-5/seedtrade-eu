import {createEnquiryConfirmation} from '../../server/b2b/enquiryConfirmation.mjs';
import {brokeragePermissions} from '../../server/b2b/brokerageOperators.mjs';
import {approvedFixture} from './b2bPortalFixture.mjs';
import {createB2bPortalService,B2bError} from '../../server/b2b/portalService.mjs';
import {createTradingWorkflow} from '../../server/b2b/tradingWorkflow.mjs';
import {createListingNotifications} from '../../server/b2b/listingNotifications.mjs';
import {createMarketplaceNotifications} from '../../server/b2b/marketplaceNotifications.mjs';
import {createTradingAdmin} from '../../server/b2b/tradingAdmin.mjs';
export async function tradingFixture({simple=false}={}){
 const f=await approvedFixture(),{h}=f;
 h.state.trades=new Map();h.state.preferences=new Map();h.state.listingJobs=new Map();h.state.listingCounter=0;
 const base=h.repository.transaction.bind(h.repository);
 h.repository.transaction=work=>base(tx=>work(Object.assign(tx,{
  async tradingRecord(id){return structuredClone(h.state.trades.get(id)??null);},
  async listTradingRecords(companyId,after){return [...h.state.trades.values()].filter(r=>r.enquiryId>after&&[r.buyerCompanyId,r.sellerCompanyId].includes(companyId)).slice(0,51).map(r=>structuredClone(r));},
  async saveTradingRecord(r,version){const old=h.state.trades.get(r.enquiryId);if(version==null?!!old:old?.version!==version)throw Error('Fixture version conflict');h.state.trades.set(r.enquiryId,structuredClone(r));},
  async setCommissionAcceptance({id,acceptance}){h.state.offers.get(id).details.commissionAcceptance=structuredClone(acceptance);},
  async listingPreference(userId){return structuredClone(h.state.preferences.get(userId)??{enabled:false,language:'EN',cropIds:[]});},
  async saveListingPreference(p){h.state.preferences.set(p.userId,structuredClone(p));},
  async eligibleListingRecipients(ownerId){return [...h.state.preferences.values()].filter(p=>p.enabled).flatMap(p=>{const u=h.state.users.get(p.userId),m=h.state.members.find(m=>m.userId===p.userId);return u?.verifiedAt&&m?.companyId!==ownerId&&h.state.companies.get(m.companyId).status==='VERIFIED'?[{...p,email:u.email}]:[];});},
  async enqueueListingNotice(job){if([...h.state.listingJobs.values()].some(j=>j.offerId===job.offerId&&j.offerVersion===job.offerVersion&&j.userId===job.userId))return;h.state.listingJobs.set(++h.state.listingCounter,{...structuredClone(job),id:h.state.listingCounter,status:'PENDING'});},
  async pendingListingNotices(){return [...h.state.listingJobs.values()].filter(j=>j.status==='PENDING').map(j=>j.id);},
  async claimListingNotice(id){const j=h.state.listingJobs.get(id);if(!j||j.status!=='PENDING')return null;const p=h.state.preferences.get(j.userId),o=h.state.offers.get(j.offerId),u=h.state.users.get(j.userId),m=h.state.members.find(m=>m.userId===j.userId);if(!p?.enabled||!u?.verifiedAt||u.email!==j.email||!m||h.state.companies.get(m.companyId).status!=='VERIFIED'||o.status!=='PUBLISHED'||o.version!==j.offerVersion){j.status='BLOCKED';return null;}j.status='SENDING';return structuredClone(j);},
  async finishListingNotice(id,status){h.state.listingJobs.get(id).status=status;}
 })));
 const delivered=[],transport={async sendMail(m){delivered.push(m);return {accepted:[m.to],rejected:[]};}};
 const workflow=createTradingWorkflow({localOnly:true,simple,ErrorType:B2bError,now:h.options.now,catalogue:h.catalogue});
 const notices=createListingNotifications({repository:h.repository,transport,from:'network@seedtrade.eu',origin:'https://staging.seedtrade.eu'});
 const notifications=createMarketplaceNotifications({repository:h.repository,transport,from:'network@seedtrade.eu',origin:'https://staging.seedtrade.eu'});
 const confirmation=simple?createEnquiryConfirmation({repository:h.repository,transport,from:'network@seedtrade.eu',origin:'https://staging.seedtrade.eu',operatorRecipient:{email:'operations@example.invalid',verified:true,evidenceRef:'ISOLATED_SYNTHETIC_FIXTURE_ONLY'},now:h.options.now,ErrorType:B2bError}):null;
 const service=createB2bPortalService({...h.options,trading:workflow,listingDelivery:notices,notifications,communications:true,enquiryConfirmation:confirmation});
 h.state.companies.get(f.admin.company.id).status='VERIFIED';
 const brokerToken='f'.repeat(64),auth={async authenticate(tx,token){if(token!==brokerToken)throw new B2bError(401,'SIGN_IN_REQUIRED');return {adminId:99,platformAdmin:true,conflictCompanyIds:[]};}};
 const bindings=[{adminId:99,companyId:f.admin.company.id,operatorKey:'GATE_V',permissions:[...new Set(Object.values(brokeragePermissions))]}],admin=createTradingAdmin({repository:h.repository,auth,workflow,bindings,ErrorType:B2bError});
 return {...f,confirmation,memberAdmin:f.admin,operatorCompanyId:f.admin.company.id,service,workflow,notices,notifications,delivered,transport,admin,auth,bindings,brokerToken};
}
