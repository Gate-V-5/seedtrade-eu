import {useEffect} from 'react'
import {useLanguage,useT,T} from './i18n/index.jsx'
import {localizedContentText} from './i18n/content.mjs'
import {languageHref} from './i18n/languageState.mjs'
import audience from './data/partner_audience.json'
import visuals from './data/partner_visuals.json'
import {audienceMetrics,insightEvent} from './partnerInsights.mjs'
import './PartnerInsights.css'

export function InsightVisual({article,hero=false}){
 const {language}=useLanguage(),v=visuals[article.slug]
 if(!v)return null
 return <div className={`insight-image-frame${hero?' insight-image-frame-hero':''}`}><img className="news-editorial-image context-image" src={v.src} width={v.width} height={v.height} alt={v.localizations?.[language.toLowerCase()]?.alt||v.alt} loading={hero?'eager':'lazy'} decoding="async" style={{maxWidth:`min(100%, ${v.width}px)`,maxHeight:`min(100%, ${v.height}px)`}}/></div>
}
export function InsightContext({article}){
 const {language}=useLanguage(),date=d=>new Intl.DateTimeFormat(language.toLowerCase(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'))
 return <p className="insight-context">
  {article.event ? <><time dateTime={article.event.startDate}>{date(article.event.startDate)}</time>
    {article.event.endDate!==article.event.startDate&&<> – <time dateTime={article.event.endDate}>{date(article.event.endDate)}</time></>}
   </> : <T>Lithuania</T>}
  {article.event&&<> · {article.event.attendanceMode==='OnlineEventAttendanceMode'?<T>Online webinar</T>:<T>Toronto, Canada</T>}</>}
 </p>
}
export function PartnerAudience(){
 const {language}=useLanguage(),t=useT(),m=audienceMetrics(audience)
 if(!m)return null
 // The short public label retains the existing 30-minute realtime data key.
 const metrics=[['businessMembers','Business Members','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],['activeUsers30Days','Active Users, Last 30 Days','M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 15h3M8 18h6'],['activeUsers30Minutes','Active Users','M2 12h5l3-8 4 16 3-8h5']]
 return <section className="partner-audience" aria-label={t('Audience statistics')} data-audience-mode={m.mode}>
  <dl>{metrics.map(([k,label,path])=><div key={k}><dt><T>{label}</T></dt><dd><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>{new Intl.NumberFormat(language.toLowerCase()).format(m.values[k])}</dd></div>)}</dl>
  <div className="partner-audience-footer">{m.mode==='DEMO'&&<span className="audience-demo"><T>Demo Statistics</T></span>}<a href="mailto:info@seedtrade.eu"><T>Discuss a Partner Insight</T> <span aria-hidden="true">→</span></a></div>
 </section>
}
export function InsightArticle({article}){
 const {language}=useLanguage(),t=useT(),l=field=>localizedContentText(article,language,field),v=visuals[article.slug]
 useEffect(()=>{insightEvent('article_view',article,language)},[article.slug,language])
 const click=(e,kind)=>insightEvent(kind,article,language,e.currentTarget.href)
 const href=path=>languageHref(path,language,'https://seedtrade.eu','https://seedtrade.eu/')
 return <main className="article editorial-page partner-article">
  <a href={href('/insights')}><T>← All insights</T></a>
  <header className="partner-article-head"><p className="eyebrow"><T>{article.category}</T></p><InsightContext article={article}/><h1>{l('title')}</h1><p className="lead">{l('summary')}</p><p className="article-meta"><span>{article.author}</span><span><T>Source checked</T> <time dateTime={article.source_checked_date}>{article.source_checked_date}</time></span></p></header>
  <figure className="partner-hero"><InsightVisual article={article} hero/>{v&&<figcaption>{v.credit||v.creator} · <T>{v.caption}</T>{v.license_url&&<> · <a href={v.license_url} rel="noreferrer">{v.license}</a></>}</figcaption>}</figure>
  {article.partner_disclosure&&<aside className="partner"><T>Partner Insight disclosure:</T> {l('partner_disclosure')}</aside>}
  <div className="partner-article-body">{article.content.map((s,i)=><section key={i}><h2>{l(`content.${i}.heading`)}</h2><p>{l(`content.${i}.body`)}</p></section>)}</div>
  <aside className="insight-cta"><a className="insight-primary-cta" href={article.cta.url} rel="noreferrer" onClick={e=>click(e,article.cta.kind)}><T>{article.cta.label}</T><span aria-hidden="true"> ↗</span></a>{article.secondary_cta&&<a href={article.secondary_cta.url} rel="noreferrer" onClick={e=>click(e,article.secondary_cta.kind)}><T>{article.secondary_cta.label}</T></a>}</aside>
  {article.supporting_images&&<div className="partner-photo-grid">{article.supporting_images.map(key=>{const p=visuals[key];return <figure key={key}><img src={p.src} width={p.width} height={p.height} loading="lazy" decoding="async" alt={p.localizations?.[language.toLowerCase()]?.alt||p.alt}/><figcaption><T>{p.caption}</T> · <a href={p.source_url} rel="noreferrer" onClick={e=>click(e,'external_website_click')}>{p.creator}</a> · <a href={p.license_url} rel="license noreferrer">{p.license}</a></figcaption></figure>})}</div>}
  <section className="source-panel"><h2><T>Sources and provenance</T></h2><ul>{article.sources.map(s=><li key={s.url}><a href={s.url} rel="noreferrer" onClick={e=>click(e,'external_website_click')}>{s.label}</a></li>)}</ul></section>
  <nav className="insight-footer" aria-label={t('Article navigation')}><a href={href('/market')}><T>Explore Seed Market Intelligence</T></a><a className="insight-back" href={href('/#research-insights')}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M15 9H3m5-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span><T>Back to Insights</T></span></a><a href={href('/b2b/register')}><T>Register company</T></a></nav>
 </main>
}
