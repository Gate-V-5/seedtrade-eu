import {normalizeBuyerFilters} from './buyerOfferFilters.mjs';
import {createB2bRateLimiter} from './rateLimiter.mjs';
export const PUBLIC_PREVIEW_VERSION='public-preview-v1';
export const publicFilterKeys=Object.freeze(['cropId','variety','originCountry','seedCategory','certificationClass','minQuantityKg','maxQuantityKg']);
const contacts=/@|https?:|www\.|mailto:|tel:|\+\d[\d ()-]{6,}/i;
export const safePreviewText=value=>typeof value==='string'&&!contacts.test(value);
const integer=v=>{if(v==null)return 0;if(!/^(0|[1-9]\d{0,14})$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw TypeError('INVALID_OFFER_FILTER');return Number(v);};
export function previewQuery(search,crops){
 const allowed=new Set([...publicFilterKeys,'after','id']);const input={};
 for(const [k,v]of search){if(!allowed.has(k)||Object.hasOwn(input,k))throw TypeError('INVALID_OFFER_FILTER');input[k]=v;}
 if(input.id!=null&&(search.size!==1||integer(input.id)<1))throw TypeError('INVALID_OFFER_FILTER');
 return {filters:normalizeBuyerFilters(input,crops),after:integer(input.after),offerId:input.id==null?null:integer(input.id)};
}
// Explicit public DTO; never spread a repository row, company or unrestricted details.
export function previewDto(o,crops){
 const d=typeof o.details==='string'?JSON.parse(o.details):o.details??{},species=crops.get(o.cropId);
 if(!species||!safePreviewText(d.variety??'')||!safePreviewText(o.certificationClass??''))return null;
 return {id:Number(o.id),cropId:o.cropId,species:{id:species.id,name:species.name,botanical:species.botanical},
  variety:typeof d.variety==='string'?d.variety.slice(0,128):'',quantity:Number(o.quantity),unit:o.unit,
  originCountry:o.originCountry,seedCategory:o.seedCategory,certificationClass:String(o.certificationClass??'').slice(0,80),
  certificationDeclaration:'SELLER_DECLARED',availability:d.availability==='AVAILABLE_FROM'?'AVAILABLE_FROM':'AVAILABLE_NOW',
  availableFrom:d.availability==='AVAILABLE_FROM'&&/^\d{4}-\d{2}-\d{2}$/.test(d.availableFrom??'')?d.availableFrom:null,validUntil:o.validUntil};
}
export function createPublicPreviewService({repository,catalogue}){
 const crops=new Map(catalogue.map(c=>[c.id,c]));
 return {catalogue:()=>({items:[...crops.values()].map(c=>({id:c.id,name:c.name,botanical:c.botanical}))}),async offers(search){
  const q=previewQuery(search,crops);
  const rows=await repository.transaction(tx=>tx.listOffers({own:false,publicPreview:true,...q,eligibleCropIds:[...crops.keys()]}));
  const items=rows.slice(0,50).map(o=>previewDto(o,crops)).filter(Boolean);
  if(q.offerId)return items.length?{offer:items[0]}:null;
  return {items,next:rows.length>50?Number(rows[49].id):null};
 }};
}
export function createPublicPreviewHttp({service,enabled=false,resolveClient,allowedOrigins=[]}){
 const limit=createB2bRateLimiter({limit:60});
 return async(req,res)=>{
  const url=new URL(req.url,'https://api.seedtrade.eu');if(!['/api/b2b/v1/public/offers','/api/b2b/v1/public/catalogue'].includes(url.pathname))return false;
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'});res.end(JSON.stringify(body));return true;};
  if(!enabled||req.method!=='GET')return reply(404,{error:'NOT_FOUND'});
  if(req.headers.origin&&!allowedOrigins.includes(req.headers.origin))return reply(403,{error:'REQUEST_REJECTED'});
  const ip=resolveClient(req);if(!ip)return reply(403,{error:'REQUEST_REJECTED'});
  if(!await limit({url:url.pathname,socket:{remoteAddress:ip}}))return reply(429,{error:'RATE_LIMITED'});
  try{if(url.pathname.endsWith('/catalogue')){if(url.search)return reply(400,{error:'INVALID_OFFER_FILTER'});return reply(200,service.catalogue());}
   const result=await service.offers(url.searchParams);return reply(result?200:404,result??{error:'NOT_FOUND'});
  }catch(e){return reply(e instanceof TypeError?400:503,{error:e instanceof TypeError?'INVALID_OFFER_FILTER':'TEMPORARILY_UNAVAILABLE'});}
 };
}
