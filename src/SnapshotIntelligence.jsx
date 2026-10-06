import {useT,useLanguage} from './i18n/index.jsx'
import intelligence from './generated/snapshot_intelligence_public.json'
const records=new Map(intelligence.records.map(record=>[record.entity_id,record]))
const locales={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}
export function evidenceDate(record,language='EN') {
  if(record.as_of_precision==='YEAR')return record.as_of
  const date=new Date(`${record.as_of}${record.as_of_precision==='MONTH'?'-01':''}T00:00:00Z`)
  return new Intl.DateTimeFormat(locales[language]||'en-GB',{...(record.as_of_precision==='DAY'?{day:'numeric'}:{}),month:'short',year:'numeric',timeZone:'UTC'}).format(date)
}
export default function SnapshotIntelligence({entityId}) {
  const t=useT(),{language}=useLanguage(),record=records.get(entityId)
  if(!record||record.classification!=='PUBLIC_SAFE')return null
  const watch=record.presentation==='MARKET_WATCH'
  return <section className="snapshot-intelligence" data-presentation={record.presentation} aria-label={t(watch?'Market watch':'Market situation')}>
    <p className="snapshot-intelligence-badge">{t(watch?'Market watch':'Market situation')}</p>
    <p className="snapshot-situation">{t(record.market_situation)}</p>
    {watch?<><div className="snapshot-watch"><h4>{t('What to watch')}</h4><ul>{record.market_watch.slice(0,2).map(item=><li key={item}>{t(item)}</li>)}</ul></div>{record.b2b_view&&<div className="snapshot-b2b"><h4>{t('B2B view')}</h4><p>{t(record.b2b_view)}</p></div>}</>:record.latest_market_evidence&&<div className="snapshot-latest"><h4>{t('Latest market evidence')}</h4><p>{t(record.latest_market_evidence)}</p></div>}
    <p className="snapshot-as-of"><span>{t('As of')}</span> <time dateTime={record.as_of} data-precision={record.as_of_precision}>{evidenceDate(record,language)}</time></p>
  </section>
}
