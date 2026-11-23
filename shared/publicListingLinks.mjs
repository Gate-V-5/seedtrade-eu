const languages=['EN','DE','FR','ES','IT'];
export const publicListingOrigin='https://seedtrade.eu';
// Public projections omit entire free-text fields containing contact coordinates.
// Stored listing data and authenticated Member records are never rewritten.
export function publicListingText(value,max=2000){if(typeof value!=='string')return '';const v=value.trim();return /@|https?:|www\.|mailto:|tel:|(?:\+?\d[\d\s().-]{5,}\d)/i.test(v)?'':v.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,max);}
export function publicListingUrl(id,language='EN'){if(!Number.isSafeInteger(id)||id<1)throw TypeError('INVALID_LISTING_ID');const u=new URL('/buying-requests',publicListingOrigin);u.searchParams.set('listing',String(id));u.searchParams.set('lang',(languages.includes(language)?language:'EN').toLowerCase());return u.href;}
export function brokerInterestMailto({id,product,variety='',direction='OFFER',url}){
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(String(id)))throw TypeError('INVALID_LISTING_ID');const listing=new URL(url);if(listing.origin!==publicListingOrigin||!listing.pathname.startsWith('/buying-requests')||listing.username||listing.password||!['OFFER','BUY_REQUEST'].includes(direction))throw TypeError('INVALID_LISTING_LINK');
 const name=[publicListingText(product,200),publicListingText(variety,128)].filter(Boolean).join(' / '),subject=`SEEDTRADE.EU — Interested in Listing ${id}`;
 const body=`Hello,\n\nI am interested in the following SEEDTRADE.EU listing:\n\nListing ID: ${id}\nProduct: ${name}\nDirection: ${direction==='OFFER'?'FOR SALE':'TO BUY'}\nListing URL: ${listing.href}\n\nPlease contact me to discuss the details.\n\nBest regards`;
 return 'mailto:info@seedtrade.eu?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}
