// Read adapter for explicitly authorized legacy public fields; no record mutation.
export function listingTrading(item) {
  const listingDirection=item.listingDirection || item.listing_type || 'BUY_REQUEST'
  const direction=listingDirection==='OFFER'?'OFFER':'BUY_REQUEST'
  const certification=item.certificationCategory || item.certification_category || null
  // Existing certification is explicit evidence. A species never implies certification.
  const productType=item.productType || (certification?'CERTIFIED_SEED':null)
  const price=item.askingPrice ?? item.price
  const quantity=item.quantity
  return {
    direction, productType,
    certification:productType==='CERTIFIED_SEED'?certification:null,
    commonName:item.species_common_name || item.speciesName || item.crop,
    botanicalName:item.species_botanical_name || item.botanicalName,
    quantity:quantity!=null&&quantity!==''?`${quantity} ${item.quantity_unit || item.quantityUnit || item.unit || ''}`.trim():null,
    price:price!=null&&price!==''&&Number.isFinite(Number(price))?`${item.currency==='EUR'||!item.currency?'€':`${item.currency} `}${Number(price).toFixed(2)}/${item.price_unit || item.priceUnit || item.quantityUnit || 'kg'}`:null,
    origin:item.origin_country || item.originCountry || item.acceptable_origin || null,
    delivery:item.deliveryTerms || [item.incoterm,item.location].filter(Boolean).join(' ') || null,
    packaging:item.packaging || null,
    organic:item.organic===true?'Organic':item.organic===false?'Non-organic':item.organic_display || null,
  }
}
