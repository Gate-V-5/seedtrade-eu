import {useMemo,useState} from 'react'
import {useT,useLanguage} from './i18n/index.jsx'
import data from './productionCoverageData.mjs'
import {metricLabels,selectEvidence,coverage,countryLabel} from './productionEvidence.mjs'

function EntityName({entity}) {
  const t=useT()
  return <>{t(entity.name)}{entity.botanical&&<> <i>({entity.botanical})</i></>}{!['SPECIES','SUBSPECIES','HYBRID_SPECIES'].includes(entity.rank)&&<> · {t('Explicit group; source scopes remain separate')}</>}</>
}
function HistoryPlot({group,format}) {
  const t=useT(),points=group.points,min=Math.min(...points.map(p=>p.year)),max=Math.max(...points.map(p=>p.year)),top=Math.max(...points.map(p=>p.value),1)
  const x=year=>64+(year-min)/Math.max(max-min,1)*480,y=value=>170-value/top*135
  const years=[...new Set(points.map(p=>p.year))]
  return <figure className="production-chart"><svg viewBox="0 0 600 220" role="img" aria-label={t('Official observations; missing years are not filled')}>
    {[0,.5,1].map(q=><g key={q}><line x1="64" x2="550" y1={y(top*q)} y2={y(top*q)} stroke="#d9e4df"/><text x="58" y={y(top*q)+4} textAnchor="end">{format(top*q)}</text></g>)}
    {years.filter((_,i)=>years.length<7||i%Math.ceil(years.length/6)===0||i===years.length-1).map(year=><text key={year} x={x(year)} y="195" textAnchor="middle">{year}</text>)}
    {points.map(p=><circle key={p.id} cx={x(p.year)} cy={y(p.value)} r="5" fill="#26735a"><title>{`${p.year}: ${format(p.value)} ${group.unit}`}</title></circle>)}
    <text x="64" y="17">{group.unit}</text>
  </svg><figcaption>{t('Points show reported values only. No interpolation or EU total.')}</figcaption></figure>
}
export default function ProductionIntelligence() {
  const t=useT(),{language}=useLanguage(),[entity,setEntity]=useState('alfalfa'),[country,setCountry]=useState('CZ'),[metric,setMetric]=useState('SEED_PRODUCTION_AREA'),[year,setYear]=useState(''),[history,setHistory]=useState('0'),[grain,setGrain]=useState('')
  const format=value=>new Intl.NumberFormat({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language]||'en-GB',{maximumFractionDigits:2}).format(value)
  const selectedEntity=data.entities.find(e=>e.id===entity)
  const groups=useMemo(()=>selectEvidence(data,{entity,country,metric,year,history}),[entity,country,metric,year,history])
  const summary=coverage(groups),active=groups.find(s=>s.id===grain)||groups[0]
  const comparisons=useMemo(()=>selectEvidence(data,{entity,metric,year,history}).sort((a,b)=>countryLabel(a.country,language).localeCompare(countryLabel(b.country,language),language.toLowerCase())||a.id.localeCompare(b.id)),[entity,metric,year,history,language])
  const years=[...new Set(data.observations.filter(r=>r.entity===entity&&r.metric===metric&&(!country||r.country===country)).map(r=>r.year))].sort((a,b)=>b-a)
  const human=value=>t(value)!==value?t(value):value.replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase())
  const scopeLabel=s=>[t(s.definition.replaceAll('_',' ').toLowerCase()),human(s.season),human(s.category),s.crop_use!=='NOT_SPECIFIED'?human(s.crop_use):null,s.source_botanical,s.species_scope].filter(Boolean).join(' · ')
  return <main className="production-intelligence">
    <div className="page-head"><p className="eyebrow">{t('European Seed Market Intelligence')}</p><h1>{t('Seed Production Intelligence')}</h1><p>{t('Official seed multiplication and certification evidence by species, country, metric and year. Seed-production area is distinct from commodity crop area.')}</p><a href="/market">{t('Market Intelligence')} →</a></div>
    <section className="production-filters" aria-label={t('Production evidence filters')}>
      <label>{t('Species')}<select value={entity} onChange={e=>{setEntity(e.target.value);setGrain('');setYear('')}}>{data.entities.map(e=><option key={e.id} value={e.id}>{t(e.name)}{e.botanical?` (${e.botanical})`:''}</option>)}</select></label>
      <label>{t('Country')}<select value={country} onChange={e=>{setCountry(e.target.value);setGrain('');setYear('')}}><option value="">{t('All countries')}</option>{data.countries.map(c=><option key={c} value={c}>{countryLabel(c,language)}</option>)}</select></label>
      <label>{t('Metric')}<select value={metric} onChange={e=>{setMetric(e.target.value);setGrain('');setYear('')}}>{Object.entries(metricLabels).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>
      <label>{t('Year')}<select value={year} onChange={e=>setYear(e.target.value)}><option value="">{t('All available years')}</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
      <label>{t('Comparable history')}<select value={history} onChange={e=>setHistory(e.target.value)}><option value="0">{t('Any available history')}</option>{[2,3,4,5].map(n=><option key={n} value={n}>{t('At least {count} consecutive years',{count:n})}</option>)}</select></label>
    </section>
    <dl className="production-kpis" aria-label={t('Selected evidence coverage')}>{[['Countries',summary.countries],['Canonical entities',summary.entities],['Observations',summary.observations],['Comparable series',summary.comparable],['Latest data year',summary.latest??'—']].map(([label,value])=><div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>
    <p className="production-note">{t('Coverage reflects your filters. Comparable series require at least two consecutive years within the same official source scope.')}</p>
    {!active?<section className="empty-state"><h2>{t('No compatible evidence for these filters')}</h2><p>{t('Missing observations are not zero. Try another country, metric or history length.')}</p></section>:<section className="production-history">
      <h2><EntityName entity={selectedEntity}/></h2><p>{countryLabel(active.country,language)} · {t(metricLabels[active.metric])} · {active.unit}</p>
      <label className="production-scope">{t('Official source scope')}<select value={active.id} onChange={e=>setGrain(e.target.value)}>{groups.map(s=><option key={s.id} value={s.id}>{countryLabel(s.country,language)} · {scopeLabel(s)} · {s.organisation}</option>)}</select></label>
      <p className="production-note">{scopeLabel(active)}</p>
      <p className="production-history-status">{active.history_length>=2?t('{count}-year comparable history available',{count:active.history_length}):t('Insufficient comparable history for a trend')}</p>
      {active.points.length>=2&&<HistoryPlot group={active} format={format}/>}
      <div className="production-table-wrap"><table className="production-table"><caption>{t('Official observations and sources')}</caption><thead><tr><th>{t('Year')}</th><th>{t('Reported value')}</th><th>{t('Source and definition')}</th></tr></thead><tbody>{active.points.map(p=>{const s=data.sources[p.source];return <tr key={p.id}><td>{p.year}</td><td>{format(p.value)} {p.unit}</td><td><a href={s.url} target="_blank" rel="noreferrer">{s.organisation} · {s.title}</a><small>{human(s.terminology)} · {t('Official source')} · {t('Accessed')} {s.accessed}</small></td></tr>})}</tbody></table></div>
      {active.metric==='CERTIFIED_QUANTITY'&&<p className="production-note">{t('Certified quantity is not assumed to equal domestic production.')}</p>}
    </section>}
    <section className="production-comparison"><h2>{t('Available European evidence')}</h2><p>{t('National definitions are not established as equivalent. Countries are listed alphabetically, without ranking, summation or an EU-wide supply conclusion.')}</p><div className="production-comparison-grid">{comparisons.map(s=>{const last=s.points.at(-1),src=data.sources[last.source];return <article key={s.id}><h3>{countryLabel(s.country,language)}</h3><strong>{format(last.value)} {s.unit} · {last.year}</strong><p>{scopeLabel(s)}</p><small>{t('{count} consecutive years',{count:s.history_length})}</small><a href={src.url} target="_blank" rel="noreferrer">{src.organisation} · {t('Official source')} ↗</a></article>})}</div>{!comparisons.length&&<p>{t('No compatible evidence for these filters')}</p>}</section>
    <aside className="production-limitations"><h2>{t('Coverage and limitations')}</h2><p>{t('Official national reporting differs. Coverage varies by species and year; missing values are not zero. Area and certified quantity remain separate. Original certification stages, seasons and source scopes are preserved.')}</p><p>{t('Groups and aggregates retain their original botanical scope; canonical navigation does not permit pooling source categories.')}</p></aside>
  </main>
}
