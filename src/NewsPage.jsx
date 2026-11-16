import React,{useState,useEffect} from 'react'
import {useT,useLanguage} from './i18n/index.jsx'
import {NEWS_STREAMS,NEWS_FILTER_DEFAULTS,parseNewsFilters,newsFilterUrl,filterNewsArchive,isCurrentNews,newsStream} from './news.mjs'
import {newsCropLabel} from './newsCropLabels.mjs'

export default function NewsPage({items,registry,asOf,Card,cropLabel=value=>value}) {
 const t=useT(),{language}=useLanguage(),[filters,setFilters]=useState(()=>parseNewsFilters(window.location.search))
 useEffect(()=>{const back=()=>setFilters(parseNewsFilters(window.location.search));window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)},[])
 const change=patch=>{const next={...filters,...patch,page:patch.page??1};window.history.pushState({},'',newsFilterUrl('/news',window.location.search,next));setFilters(next)}
 const names=new Intl.DisplayNames([language.toLowerCase()],{type:'region'}),country=code=>/^[A-Z]{2}$/.test(code)?names.of(code):code
 const crops=[...new Set(items.flatMap(i=>i.links?.crops||[]))].sort(),countries=[...new Set(items.flatMap(i=>i.countries||i.geography?.countries||[]))].sort()
 const invalidRange=filters.from&&filters.to&&filters.from>filters.to
 const matching=invalidRange?[]:filterNewsArchive(items,filters,asOf,registry)
 const current=matching.filter(i=>isCurrentNews(i,asOf)),featured=[]
 for(const stream of NEWS_STREAMS){const item=current.find(i=>newsStream(i)===stream);if(item)featured.push(item)}
 const leading=featured.slice(0,4),latest=current.filter(i=>!leading.includes(i)),archive=matching.filter(i=>!current.includes(i)),pages=Math.max(1,Math.ceil(archive.length/6)),page=Math.min(filters.page,pages)
 const empty=<p className="news-empty" role="status">{t('No current reviewed stories match these filters.')} <a href="#news-archive">{t('Browse earlier coverage')}</a></p>
 return <main className="news-page">
  <header className="news-page-heading"><h1>{t('European Seed Market News')}</h1><p>{t('European seed trade, agronomy, weather risks and industry events.')}</p></header>
  <nav className="news-browse" aria-label={t('Browse News')}><h2>{t('Browse News')}</h2><div>{['ALL',...NEWS_STREAMS].map(stream=><button key={stream} type="button" aria-pressed={filters.stream===stream} onClick={()=>change({stream})}>{t(stream==='ALL'?'All News':stream)}</button>)}</div></nav>
  <form className="news-search-filters" onSubmit={e=>e.preventDefault()} aria-label={t('Search news')}>
   <label>{t('Search news')}<input type="search" maxLength={200} value={filters.q} placeholder={t('Headline, crop, variety or keyword')} onChange={e=>change({q:e.target.value})}/></label>
   <label>{t('Country or region')}<select value={filters.country} onChange={e=>change({country:e.target.value})}><option value="ALL">{t('All countries and regions')}</option>{countries.map(c=><option key={c} value={c}>{country(c)}</option>)}</select></label>
   <label>{t('Topic or crop')}<select value={filters.crop} onChange={e=>change({crop:e.target.value})}><option value="ALL">{t('All topics and crops')}</option>{crops.map(c=><option key={c} value={c}>{newsCropLabel(c,language)}</option>)}</select></label>
   <label>{t('Publication period')}<select value={filters.period} onChange={e=>change({period:e.target.value})}><option value="ALL">{t('All publication dates')}</option><option value="RECENT">{t('Published in the last 7 days')}</option><option value="UPCOMING">{t('Upcoming events')}</option></select></label>
   <button type="button" onClick={()=>change({...NEWS_FILTER_DEFAULTS})}>{t('Clear filters')}</button>
   <details className="news-date-range"><summary>{t('Date range')}</summary><div><label>{t('From date')}<input type="date" value={filters.from} onChange={e=>change({from:e.target.value})}/></label><label>{t('To date')}<input type="date" value={filters.to} onChange={e=>change({to:e.target.value})}/></label></div></details>
  </form>
  {invalidRange&&<p role="alert">{t('Choose an end date on or after the start date.')}</p>}
  <p className="news-results-count" role="status" aria-live="polite">{t('{count} matching articles',{count:matching.length})}</p>
  <section className="news-featured" aria-labelledby="news-featured-title"><h2 id="news-featured-title">{t('Featured news')}</h2>{leading.length?<div className="news-featured-grid">{leading.map(item=><Card key={item.slug} story={item} expanded/>)}</div>:empty}</section>
  <section aria-labelledby="news-latest-title"><h2 id="news-latest-title">{t('Latest articles')}</h2>{latest.length?<div className="news-grid">{latest.slice(0,6).map(item=><Card key={item.slug} story={item} expanded/>)}</div>:<p className="news-empty">{t('No additional recent articles.')} {t('Earlier coverage remains available in the archive.')}</p>}</section>
  <section id="news-archive" aria-labelledby="news-archive-title"><h2 id="news-archive-title">{t('News archive')}</h2><p>{t('Earlier coverage remains available in the archive.')}</p>{archive.length?<><div className="news-grid">{archive.slice((page-1)*6,page*6).map(item=><Card key={item.slug} story={item} expanded/>)}</div><nav className="news-pagination" aria-label={t('News archive')}><button type="button" disabled={page<=1} onClick={()=>change({page:page-1})}>{t('Previous page')}</button><span>{t('Page {page} of {pages}',{page,pages})}</span><button type="button" disabled={page>=pages} onClick={()=>change({page:page+1})}>{t('Next page')}</button></nav></>:<p className="news-empty" role="status">{t('No matching archived articles.')}</p>}</section>
 </main>
}
