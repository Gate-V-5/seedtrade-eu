// One biological identity can have several commercial/source entities.
export function countDistinctSeedSpecies(entities) {
  return new Set(entities.filter(entity => entity.classification === "PUBLIC_SAFE" && ["SPECIES", "SUBSPECIES", "HYBRID_SPECIES"].includes(entity.rank) && entity.kpi_eligible && entity.biological_species_key).map(entity => entity.biological_species_key)).size
}

// Metadata joins preserve existing observation identity and numeric fields.
export function cropEntityForProduction(record, master) {
  return master.entities.find(entity => entity.id === record.entity && entity.production_mapping?.observation_ids.includes(record.id)) || null
}

export function cropEntitiesForTrade(cn8, master) {
  return master.entities.filter(entity => entity.trade_mapping?.cn8.includes(String(cn8))).map(entity => ({ entity, resolution: entity.trade_mapping.status, speciesValuesAvailable: entity.trade_mapping.status === "SPECIES_SPECIFIC" }))
}
