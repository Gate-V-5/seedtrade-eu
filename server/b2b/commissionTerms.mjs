import {digest} from './legalAcceptance.mjs';
import {commissionDisclosure} from '../../shared/commissionDisclosure.mjs';
export const commissionTerms=Object.freeze({version:'brokerage-1pct-owner-proposed-v2',status:'OWNER_PROPOSED_NOT_PUBLISHED',rateBasisPoints:100,text:commissionDisclosure.EN.join('\n\n'),translations:commissionDisclosure});
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
