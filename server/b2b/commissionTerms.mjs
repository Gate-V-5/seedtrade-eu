import {digest} from './legalAcceptance.mjs';
// Proposed implementation text, NOT an approved public legal document.
export const commissionTerms=Object.freeze({version:'brokerage-1pct-draft-v1',status:'DRAFT',rateBasisPoints:100,
 text:'Membership, listing publication, listing notifications and enquiries are free. The author of the originating listing pays one success-based commission of 1% of the actually executed goods value excluding VAT. For a sale offer the seller pays; for a buying request the buyer pays. No commission is due merely for an enquiry. Partial execution, cancellations, corrections and refunds adjust the same transaction commission. Commission becomes payable on confirmed actual execution and is invoiced separately by the assigned brokerage operator; applicable service VAT is assessed separately. Direct completion of the specific transaction introduced through this listing does not by itself remove this agreed obligation. This does not cover all future business between the parties or impose an additional post-introduction period.'});
export const commissionTermsHash=digest(commissionTerms);

export function decimal(value,places=2){
 if(typeof value!=='string'||!new RegExp('^(0|[1-9][0-9]{0,8})(\\.[0-9]{1,'+places+'})?$').test(value))throw TypeError('INVALID_DECIMAL');
 const [whole,fraction='']=value.split('.');return BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0'));
}
export const money=value=>{const n=BigInt(value);return (n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');};
export const roundHalfUp=(n,d)=>(n+d/2n)/d;
export function executedValue(quantity,unit,price,priceUnit){
 if(!['kg','t'].includes(unit)||!['kg','t'].includes(priceUnit))throw TypeError('INVALID_UNIT');
 const q=decimal(quantity,3),p=decimal(price,2);if(q<=0n||p<=0n)throw TypeError('INVALID_DECIMAL');
 return roundHalfUp(q*(unit==='t'?1000n:1n)*p,1000n*(priceUnit==='t'?1000n:1n));
}
export function totals(deliveries){
 const goods=deliveries.reduce((sum,d)=>sum+BigInt(d.goodsMinor),0n);if(goods<0n)throw TypeError('INVALID_EXECUTION');
 const commission=roundHalfUp(goods,100n);return {goodsMinor:goods.toString(),commissionMinor:commission.toString(),goodsValue:money(goods),commission:money(commission),rateBasisPoints:100};
}
