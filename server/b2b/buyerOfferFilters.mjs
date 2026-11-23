import {offerOrigins,offerCurrencies,seedCategories} from './offerOptions.mjs';
import {LISTING_DIRECTIONS,PRODUCT_TYPES} from './listingSpecifications.mjs';
const invalid=()=>{throw new TypeError('INVALID_OFFER_FILTER');};
const bounded=(value,max)=>{if(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value))invalid();return value.trim();};
export const buyerFilterKeys=['cropId','variety','originCountry','seedCategory','certificationClass','minQuantityKg','maxQuantityKg','minPriceKg','maxPriceKg','currency','listingDirection','productType'];
export function normalizeBuyerFilters(input,cropIds){
 const out={};for(const key of buyerFilterKeys){if(input[key]==null||input[key]==='')continue;const raw=bounded(input[key],key==='variety'?128:key==='certificationClass'?80:128);if(!raw)continue;
  if(['minQuantityKg','maxQuantityKg','minPriceKg','maxPriceKg'].includes(key)){if(!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,3})?$/.test(raw))invalid();const value=Number(raw);if(!Number.isFinite(value)||value<0||value>1e12)invalid();out[key]=value;}else out[key]=raw;
 }
 if(out.cropId&&!cropIds.has(out.cropId))invalid();if(out.originCountry&&!offerOrigins.includes(out.originCountry))invalid();if(out.seedCategory&&!seedCategories.includes(out.seedCategory))invalid();if(out.currency&&!offerCurrencies.includes(out.currency))invalid();
 if(out.listingDirection&&!LISTING_DIRECTIONS.includes(out.listingDirection))invalid();if(out.productType&&!PRODUCT_TYPES.includes(out.productType))invalid();
 for(const [min,max]of [['minQuantityKg','maxQuantityKg'],['minPriceKg','maxPriceKg']])if(out[min]!=null&&out[max]!=null&&out[min]>out[max])invalid();
 if((out.minPriceKg!=null||out.maxPriceKg!=null)&&!out.currency)invalid();return out;
}
// SQL wildcards are literal user text, never a pattern language or SQL fragment.
export const literalContains=value=>'%'+value.replace(/[!%_]/g,'!$&')+'%';
