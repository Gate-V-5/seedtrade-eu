import {countDistinctSeedSpecies} from './cropMasterModel.mjs'

export const tradeViewKeys = ['eu_internal_trade','eu_imports','eu_exports']
const validNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0

// Shared by public discovery and the summary. Authorization is explicit on the
// canonical public record; Marketplace V1 drafts are never a source here.
export function eligiblePublicListings(source, now = new Date()) {
  if (!Array.isArray(source?.items) || !Number.isFinite(now.getTime())) return []
  const seen = new Set(), time = now.getTime()
  const eligible = []
  for (const item of source.items) {
    if (!item || typeof item !== 'object') continue
    const published = Date.parse(item.publication_date)
    const expiries = [item.expiry_date,item.expires_at].filter(value=>value!=null)
    const approved = item.publication_authorization
    if (!['OFFER','BUY_REQUEST'].includes(item.listing_type) || item.status !== 'ACTIVE' || item.classification !== 'PUBLIC_SAFE' || item.is_demo !== false || item.demo === true) continue
    if (approved?.status !== 'APPROVED' || !approved.evidence_reference || item.genuine_source?.status !== 'VERIFIED') continue
    if (!Number.isFinite(published) || published > time || expiries.some(expiry=>!Number.isFinite(Date.parse(expiry)) || Date.parse(expiry)<=time)) continue
    if (typeof item.listing_id !== 'string' || !item.listing_id.trim() || item.listing_id!==item.listing_id.trim() || seen.has(item.listing_id)) continue
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0 || typeof item.quantity_unit !== 'string' || !item.quantity_unit.trim()) continue
    seen.add(item.listing_id)
    eligible.push(item)
  }
  return eligible
}

export function authorizedOfferCount(source, now = new Date()) {
  return Array.isArray(source?.items) ? eligiblePublicListings(source, now).filter(item=>item.listing_type==='OFFER').length : null
}

export function verifiedFreshUpdate(pulse, now = new Date()) {
  if (pulse.refresh?.source_timestamp_verified !== true) return false
  const updated = Date.parse(pulse.refresh.source_updated_at), age = now.getTime() - updated
  return Number.isFinite(updated) && age >= 0 && age <= 7 * 86400000
}

export function stage1Summary({pulse, species, weather, listings, now = new Date()}) {
  const period = pulse.latest_completed_period
  const views = tradeViewKeys.map(key => pulse.views?.[key]?.latest)
  const comparable = /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && views.every(view => view?.period === period && validNumber(view.trade_value_eur) && validNumber(view.volume_tonnes))
  const coverage = pulse.country_coverage
  return {
    period,
    species: countDistinctSeedSpecies(species.entities),
    tradeValue: comparable ? views.reduce((sum,view) => sum + view.trade_value_eur,0) : null,
    internalVolume: comparable ? pulse.views.eu_internal_trade.latest.volume_tonnes : null,
    offers: authorizedOfferCount(listings,now),
    countries: comparable && coverage?.period === period && coverage?.validated === true && Array.isArray(coverage.reporters) ? new Set(coverage.reporters).size : null,
    weatherRegions: Array.isArray(weather.regions) ? new Set(weather.regions.map(region=>region.code).filter(Boolean)).size : null,
    sourceFresh: verifiedFreshUpdate(pulse,now),
  }
}
