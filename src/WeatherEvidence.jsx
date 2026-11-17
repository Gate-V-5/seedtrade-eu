import { T, I18n, useT, useLanguage } from "./i18n/index.jsx"
import { localizedContentText } from "./i18n/content.mjs"
import weather from "./generated/weather_public.json"
import SeedIntelligence from "./SeedIntelligenceRoute.jsx"
import europeMap from "./generated/europe_country_map_public.json"
import MarketIntelligenceBackLink from './MarketIntelligenceBackLink.jsx'

const groups = weather.regions.reduce((result, region) => {
  const group = result.find(item => item.country === region.country)
  if (group) group.regions.push(region)
  else result.push({ country: region.country, regions: [region] })
  return result
}, [])

export default function WeatherEvidence() {
  const t=useT()
  const {language}=useLanguage()
  return <main className="weather-evidence-page">
    <div className="page-head">
      <p className="eyebrow"><T>Weather & Seed Risk</T></p>
      <h1><T>Weather exposure and seed supply decisions</T></h1>
      <p><T>Understand crop-stage exposure before applying a supply scenario. Observations, assumptions and market conclusions stay distinct.</T></p>
    </div>
    <SeedIntelligence mode="weather"/>
    <details className="weather-legacy-register"><summary>{t("Monitoring register and coverage reconciliation")}</summary><p>{t("23 configured region names and ten sampling cells are separate records. A matching name or code does not establish measured regional coverage.")}</p><section className="weather-coverage-layout" aria-label={t("Weather monitoring coverage")}>
      <div className="weather-map-panel">
        <h2><T>European coverage</T></h2>
        <svg className="europe-weather-map" viewBox={europeMap.view_box.join(" ")} role="img" aria-label={t("Europe map: {regions} monitored regions in {countries} countries; full region names follow below",{regions:weather.region_count,countries:groups.length})}>
          {europeMap.countries.map(country => <path key={country.name} d={country.path} className={europeMap.monitored_country_counts[country.code] ? "map-country monitored" : "map-country"}>
            <title>{europeMap.monitored_country_counts[country.code] ? t("{name} — {count} monitored regions",{name:t(country.name),count:europeMap.monitored_country_counts[country.code]}) : t("{name} — no monitored regions shown",{name:t(country.name)})}</title>
          </path>)}
          {europeMap.countries.filter(country => country.label && europeMap.monitored_country_counts[country.code]).map(country => <g key={country.code} className="map-count" transform={`translate(${country.label.join(" ")})`}>
            <circle r="16"/><text textAnchor="middle" dy="5">{europeMap.monitored_country_counts[country.code]}</text>
          </g>)}
        </svg>
        <p className="map-key"><span aria-hidden="true" className="map-swatch"/> <T>Countries with monitored regions · numbers show region counts, not risk severity</T></p>
        <p className="source"><T>Cartography:</T> <a href="https://www.naturalearthdata.com/">Natural Earth</a> <T>public-domain country boundaries. The canonical SeedTrade region names have no published subregional polygons or observation-point coordinates, so the map intentionally does not claim exact within-country locations.</T></p>
      </div>
      <aside className="weather-map-context">
        <h2><T>What the coverage means</T></h2>
        <dl>
          <div><dt><T>Monitored region</T></dt><dd><I18n text="A named geographic unit in the SeedTrade weather configuration; {count} are listed below." values={{count:weather.region_count}}/></dd></div>
          <div><dt><T>Weather observation</T></dt><dd><T>Open-Meteo descriptive weather snapshot dated</T> <time dateTime={weather.observed_date}>{weather.observed_date}</time>. <T>This is a shared dataset date, not a per-region update timestamp.</T></dd></div>
          <div><dt><T>Validated seed-production impact</T></dt><dd><T>Unavailable. Weather exposure and preliminary crop-stage context do not establish a change in certified-seed output or supply.</T></dd></div>
        </dl>
        <p className="source"><T>Model: preliminary rule-based; evidence status: limited. The legacy coverage map below does not contain regional crop-stage measurements.</T></p>
      </aside>
    </section>
    {weather.content?.map((section,index) => <section key={index}>
      <h2>{localizedContentText(weather,language,`content.${index}.heading`)}</h2>
      <p>{localizedContentText(weather,language,`content.${index}.body`)}</p>
    </section>)}
    <section className="weather-region-section">
      <div className="section-head"><div><p className="eyebrow"><T>Canonical monitored regions</T></p><h2><I18n text="All {count} regions" values={{count:weather.region_count}}/></h2></div></div>
      <div className="weather-region-groups">{groups.map(({country, regions}) => <section className="weather-region-group" key={country}>
        <h3>{t(country)} <span>{regions.length}</span></h3>
        <ul>{regions.map(region => <li key={region.code}><span>{localizedContentText(weather,language,`regions.${weather.regions.indexOf(region)}.name`)}</span><small><I18n text="{date} shared weather snapshot" values={{date:weather.observed_date}}/></small></li>)}</ul>
      </section>)}</div>
      <p className="source"><T>Region names and countries: existing SeedTrade weather coverage configuration. Individual monitored crops, phenology stages and observation timestamps are not available in the published regional records.</T> {localizedContentText(weather,language,"methodology_note")}</p>
    </section>
    </details>
    <MarketIntelligenceBackLink/>
  </main>
}
