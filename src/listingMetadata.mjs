// Presentation only: no changes to listing eligibility or commercial values.
// Whitelist approved public fields; never serialize the underlying record.
export const listingTitle = (item, t = text => text) => {
  const species = [t(item.species_common_name || 'Seed listing'), item.species_botanical_name ? `(${item.species_botanical_name})` : ''].filter(Boolean).join(' ')
  const attributes = [item.variety, item.certification_category || item.category].filter(value => value != null && value !== '').join(' ')
  const quantity = item.quantity != null && item.quantity_unit ? `${item.quantity} ${item.quantity_unit}` : ''
  return [species, attributes, t('Seed offer'), [quantity, item.location ? t(item.location) : ''].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
}
