import weather from "./generated/weather_public.json"
import europeMap from "./generated/europe_country_map_public.json"

const groups = weather.regions.reduce((result, region) => {
  const group = result.find(item => item.country === region.country)
  if (group) group.regions.push(region)
  else result.push({ country: region.country, regions: [region] })
  return result
}, [])

export default function WeatherEvidence() {
  return <main className="weather-evidence-page">
    <div className="page-head">
      <p className="eyebrow">Weather &amp; Seed Risk · PUBLIC_SAFE</p>
      <h1>Where SeedTrade monitors weather exposure</h1>
      <p>{weather.region_count} named regions across {groups.length} European countries. The map identifies countries containing monitored regions; shaded national territory does not mean every location in that country is monitored.</p>
    </div>
    <section className="weather-coverage-layout" aria-label="Weather monitoring coverage">
      <div className="weather-map-panel">
        <h2>European coverage</h2>
        <svg className="europe-weather-map" viewBox={europeMap.view_box.join(" ")} role="img" aria-label={`Europe map: ${weather.region_count} monitored regions in ${groups.length} countries; full region names follow below`}>
          {europeMap.countries.map(country => <path key={country.name} d={country.path} className={europeMap.monitored_country_counts[country.code] ? "map-country monitored" : "map-country"}>
            <title>{`${country.name}${europeMap.monitored_country_counts[country.code] ? ` — ${europeMap.monitored_country_counts[country.code]} monitored regions` : " — no monitored regions shown"}`}</title>
          </path>)}
          {europeMap.countries.filter(country => country.label && europeMap.monitored_country_counts[country.code]).map(country => <g key={country.code} className="map-count" transform={`translate(${country.label.join(" ")})`}>
            <circle r="16"/><text textAnchor="middle" dy="5">{europeMap.monitored_country_counts[country.code]}</text>
          </g>)}
        </svg>
        <p className="map-key"><span aria-hidden="true" className="map-swatch"/> Countries with monitored regions · numbers show region counts, not risk severity</p>
        <p className="source">Cartography: <a href="https://www.naturalearthdata.com/">Natural Earth</a> public-domain country boundaries. The canonical SeedTrade region names have no published subregional polygons or observation-point coordinates, so the map intentionally does not claim exact within-country locations.</p>
      </div>
      <aside className="weather-map-context">
        <h2>What the coverage means</h2>
        <dl>
          <div><dt>Monitored region</dt><dd>A named geographic unit in the SeedTrade weather configuration; {weather.region_count} are listed below.</dd></div>
          <div><dt>Weather observation</dt><dd>Open-Meteo descriptive weather snapshot dated <time dateTime={weather.observed_date}>{weather.observed_date}</time>. This is a shared dataset date, not a per-region update timestamp.</dd></div>
          <div><dt>Validated seed-production impact</dt><dd>Unavailable. Weather exposure and preliminary crop-stage context do not establish a change in certified-seed output or supply.</dd></div>
        </dl>
        <p className="source">Model: preliminary rule-based; evidence status: limited. No region-level crop or phenology values are published in this PUBLIC_SAFE dataset.</p>
      </aside>
    </section>
    <section className="weather-region-section">
      <div className="section-head"><div><p className="eyebrow">Canonical monitored regions</p><h2>All {weather.region_count} regions</h2></div></div>
      <div className="weather-region-groups">{groups.map(({country, regions}) => <section className="weather-region-group" key={country}>
        <h3>{country} <span>{regions.length}</span></h3>
        <ul>{regions.map(region => <li key={region.code}><span>{region.name}</span><small>{weather.observed_date} shared weather snapshot</small></li>)}</ul>
      </section>)}</div>
      <p className="source">Region names and countries: SeedTrade PUBLIC_SAFE weather configuration. Individual monitored crops, phenology stages and observation timestamps are not available in the published regional records. {weather.methodology_note}</p>
    </section>
  </main>
}
