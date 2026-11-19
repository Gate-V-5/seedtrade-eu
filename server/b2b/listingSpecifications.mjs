// Shared listing data contract. Pure and browser-safe; no inference of certification.
export const QUALITY_PARAMETERS=Object.freeze(['germination','physicalPurity','moisture','otherCropSeeds','oilContent','proteinContent','other']);
export const QUALITY_OPERATORS=Object.freeze(['MIN','MAX','EXACT']);
export const LISTING_DIRECTIONS=Object.freeze(['OFFER','BUY_REQUEST']);
export const PRODUCT_TYPES=Object.freeze(['CERTIFIED_SEED','COMMODITY']);
const invalid=()=>{throw new TypeError('INVALID_LISTING_SPECIFICATIONS');};
const bounded=(value,max)=>{if(value==null)return '';if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f<>]/.test(value))invalid();return value.trim();};
export function normalizeListingSpecifications(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))invalid();
 const classification=(key,allowed)=>{const value=input[key];if(value==null||value==='')return null;if(!allowed.includes(value))invalid();return value;};
 const listingDirection=classification('listingDirection',LISTING_DIRECTIONS),productType=classification('productType',PRODUCT_TYPES);
 if(productType==='COMMODITY'&&(bounded(input.certificationClass,80)||input.seedCategory==='CERTIFIED_SOWING'))invalid();
 const raw=input.qualityParameters??[];if(!Array.isArray(raw)||raw.length>20)invalid();
 const seen=new Set(),qualityParameters=raw.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['parameter','operator','value','unit','label'].includes(k))||!QUALITY_PARAMETERS.includes(row.parameter)||!QUALITY_OPERATORS.includes(row.operator)||row.unit!=='%'||typeof row.value!=='string'||!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,12})?$/.test(row.value)||Number(row.value)>100)invalid();
  const label=bounded(row.label,80);if(row.parameter==='other'&&!label)invalid();
  const key=row.parameter==='other'?'other:'+label.toLowerCase():row.parameter;if(seen.has(key))invalid();seen.add(key);
  return {parameter:row.parameter,operator:row.operator,value:row.value,unit:'%',...(label?{label}:{})};
 });
 if(input.organic!=null&&typeof input.organic!=='boolean')invalid();
 return {listingDirection,productType,qualityParameters,packaging:bounded(input.packaging,200),deliveryTerms:bounded(input.deliveryTerms,200),organic:input.organic??null};
}
// Existing numeric observations remain exact observations, never minimum/maximum requirements.
export function readListingSpecifications(details={}){
 const d=details&&typeof details==='object'&&!Array.isArray(details)?details:{};
 let result;try{result=normalizeListingSpecifications(d);}catch{result=normalizeListingSpecifications();}
 const qualityParameters=[...result.qualityParameters];
 for(const [field,parameter]of [['germinationPercent','germination'],['purityPercent','physicalPurity'],['moisturePercent','moisture']]){
  const value=d[field];if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100&&!qualityParameters.some(q=>q.parameter===parameter))qualityParameters.push({parameter,operator:'EXACT',value:String(value),unit:'%'});
 }
 return {...result,qualityParameters};
}
