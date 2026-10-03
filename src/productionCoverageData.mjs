import baseline from './generated/production_public.json' with {type:'json'}
import additions from './generated/production_coverage_additions.json' with {type:'json'}
// Route-only imports. Region and certification stages remain separate source grains.
const entities = new Map(baseline.entities.map(e => [e.id, e]))
for (const e of additions.entities) entities.set(e.id, e)
export default {
  ...baseline,
  coverage_version: additions.version,
  baseline_records: baseline.observations.length,
  countries: [...new Set([...baseline.countries, ...additions.countries])].sort(),
  entities: [...entities.values()].sort((a,b) => a.id.localeCompare(b.id)),
  sources: {...baseline.sources, ...additions.sources},
  observations: [...baseline.observations, ...additions.observations],
  series: [...baseline.series, ...additions.series]
}
