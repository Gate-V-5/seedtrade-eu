import {useEffect,useRef,useState} from 'react'
import {useLanguage,useT,T} from './i18n/index.jsx'
import {languageHref} from './i18n/languageState.mjs'
import register from './data/events_calendar.json'
import {calendarSelection,monthCells,calendarEventsOnDate,nextCalendarEvent,calendarEventStatus,eventDateLabel,calendarEventTrack,DEFAULT_EVENT_TIMEZONE} from './eventsCalendar.mjs'
import './EventsCalendar.css'

// SSR is neutral. A stale pre-render can never advertise an expired event.
// Re-evaluate event-local dates on an open page, tab return and browser focus.
function useEventClock(){
 const [now,setNow]=useState(null)
 useEffect(()=>{
  const zones=[...new Set([DEFAULT_EVENT_TIMEZONE,...register.events.map(e=>e.timezone||e.processing_timezone).filter(Boolean)])],formats=zones.map(timeZone=>new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}));let previous=''
  const update=()=>{const n=new Date(),key=formats.map(f=>f.format(n)).join('|');if(key!==previous){previous=key;setNow(n)}}
  update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update)
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update)}
 },[])
 return now
}
function Location({event}){
 const t=useT();return event.format==='ONLINE'?t('Online'):[event.city,event.country?t(event.country):null].filter(Boolean).join(', ')
}
export function HomepageEventStrip(){
 const {language}=useLanguage(),t=useT(),now=useEventClock(),event=now?nextCalendarEvent(register,now):null,href=languageHref('/events',language)
 return <section className="seed-event-strip" aria-label={t('European Seed Industry Events')} data-event-ready={!!now}>
  {event?<>
   <time className="seed-event-date" dateTime={event.start_date}>{new Intl.DateTimeFormat(language.toLowerCase(),{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(event.start_date+'T12:00:00Z'))}</time>
   <div className="seed-event-name"><span>{t(calendarEventStatus(event,now)==='ONGOING'?'Ongoing event':'Upcoming event')}</span><a href={event.official_url} rel="noreferrer" onClick={()=>calendarEventTrack('calendar_official_click',event,language,event.official_url)}>{event.name}</a></div>
   <span className="seed-event-range">{eventDateLabel(event,language)}</span><span className="seed-event-location"><Location event={event}/></span>
  </>:<span className="seed-event-neutral"><T>European Seed Industry Events</T></span>}
  <a className="seed-event-view-all" href={href}><T>View All Events</T><span aria-hidden="true"> →</span></a>
 </section>
}

export default function EventsCalendar(){
 const {language}=useLanguage(),t=useT(),now=useEventClock(),initial=calendarSelection('',new Date(register.as_of+'T12:00:00Z')),[selection,setSelection]=useState(initial),[hovered,setHovered]=useState(null),[selectedDate,setSelectedDate]=useState(null)
 const dialog=useRef(null),trigger=useRef(null),scrollRequested=useRef(false),{year,month}=selection
 const monthName=m=>new Intl.DateTimeFormat(language.toLowerCase(),{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,m-1,1)))
 const dayLabel=day=>new Intl.DateTimeFormat(language.toLowerCase(),{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))
 useEffect(()=>{const restore=()=>{setSelection(calendarSelection(window.location.search));setSelectedDate(null)};restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[])
 useEffect(()=>{calendarEventTrack('calendar_view',null,language)},[language])
 useEffect(()=>{if(scrollRequested.current){document.getElementById(`events-month-${year}-${month}`)?.scrollIntoView({block:'start'});scrollRequested.current=false}},[year,month])
 useEffect(()=>{if(selectedDate&&!dialog.current.open)dialog.current.showModal();if(!selectedDate&&dialog.current.open){dialog.current.close();trigger.current?.focus()}},[selectedDate])
 const navigate=(y,m)=>{if(y<2000||y>2100)return;setSelection({year:y,month:m});setSelectedDate(null);scrollRequested.current=true;const url=new URL(window.location.href);url.searchParams.set('year',y);url.searchParams.set('month',m);window.history.replaceState(window.history.state,'',url.pathname+url.search)}
 const moveMonth=delta=>{const date=new Date(Date.UTC(year,month-1+delta,1));navigate(date.getUTCFullYear(),date.getUTCMonth()+1)}
 const select=(day,e)=>{trigger.current=e.currentTarget;setHovered(null);setSelectedDate(day);calendarEventTrack('calendar_event_select',calendarEventsOnDate(register,day)[0],language)}
 const weekday=i=>new Intl.DateTimeFormat(language.toLowerCase(),{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2024,0,i+1)))
 const events=selectedDate?calendarEventsOnDate(register,selectedDate):[]
 return <main className="events-calendar">
  <header className="page-head"><p className="eyebrow"><T>European seed sector</T></p><h1><T>European Seed Industry Events</T></h1><p><T>Verified congresses, training, breeding meetings and seed technology events. Select a green date for official details.</T></p></header>
  <div className="events-toolbar" role="group" aria-label={t('Calendar navigation')}>
   <div className="events-year-nav"><button type="button" onClick={()=>navigate(year-1,month)} disabled={year===2000} aria-label={t('Previous year')}>←</button><strong aria-live="polite">{year}</strong><button type="button" onClick={()=>navigate(year+1,month)} disabled={year===2100} aria-label={t('Next year')}>→</button></div>
   <div className="events-month-nav"><button type="button" aria-label={t('Previous month')} onClick={()=>moveMonth(-1)}>‹</button><label><span><T>Month</T></span><select aria-label={t('Month')} value={month} onChange={e=>navigate(year,Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{monthName(i+1)}</option>)}</select></label><button type="button" aria-label={t('Next month')} onClick={()=>moveMonth(1)}>›</button></div>
   <button type="button" onClick={()=>navigate(calendarSelection('').year,calendarSelection('').month)}><T>Current month</T></button>
  </div>
  <div className="events-calendar-key"><span className="events-key-dot" aria-hidden="true"/><T>Confirmed event dates</T><span><T>All dates remain available, including past events.</T></span></div>
  <div className="events-year-grid">{Array.from({length:12},(_,i)=>i+1).map(m=><section className="events-month" id={`events-month-${year}-${m}`} key={m} aria-labelledby={`events-month-title-${m}`}>
   <h2 id={`events-month-title-${m}`}>{monthName(m)} <span>{year}</span></h2>
   <div className="events-weekdays" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i}>{weekday(i)}</span>)}</div>
   <div className="events-days">{monthCells(year,m).map((day,i)=>{
    if(!day)return <span className="events-empty" key={i} aria-hidden="true"/>
    const matches=calendarEventsOnDate(register,day),number=Number(day.slice(-2))
    return matches.length?<div className="events-date-wrap" key={day}><button type="button" className="events-day" data-date={day} aria-label={`${dayLabel(day)}: ${matches.map(e=>e.name).join('; ')}`} aria-haspopup="dialog" aria-expanded={selectedDate===day} aria-describedby={hovered===day?'event-date-tooltip':undefined} onMouseEnter={()=>setHovered(day)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(day)} onBlur={()=>setHovered(null)} onKeyDown={e=>{if(e.key==='Escape')setHovered(null)}} onClick={e=>select(day,e)}>{number}{matches.length>1&&<span className="events-multiple" aria-hidden="true"/>}</button>{hovered===day&&<div className="events-tooltip" role="tooltip" id="event-date-tooltip">{matches.map(e=><p key={e.id}><b>{e.name}</b><span>{eventDateLabel(e,language)} · <Location event={e}/></span></p>)}</div>}</div>:<span className="events-plain-day" key={day}>{number}</span>
   })}</div>
  </section>)}</div>
  <p className="events-source-note"><T>Event details are checked against organizer sources. An empty date means no confirmed event is currently recorded.</T></p>
  <a className="events-back" href={languageHref('/#research-insights',language)}>← <T>Back to Insights</T></a>
  <dialog ref={dialog} className="events-detail" aria-labelledby="events-detail-title" onCancel={e=>{e.preventDefault();setSelectedDate(null)}} onClick={e=>{if(e.target===dialog.current)setSelectedDate(null)}}>
   <div className="events-detail-inner"><button type="button" className="events-close" onClick={()=>setSelectedDate(null)} aria-label={t('Close event details')}>×</button><h2 id="events-detail-title">{selectedDate?dayLabel(selectedDate):t('Event details')}</h2>
   {events.map(event=><article className="events-detail-item" key={event.id}><p className="category">{t(event.category)}</p><h3>{event.name}</h3><p><time dateTime={event.start_date}>{eventDateLabel(event,language,true)}</time> · <Location event={event}/></p><p>{event.localizations?.[language.toLowerCase()]?.description||t(event.description)}</p><dl><div><dt><T>Organizer</T></dt><dd>{event.organizer}</dd></div><div><dt><T>Time zone</T></dt><dd>{event.timezone||(event.processing_timezone?<>{event.processing_timezone} · <T>Location-based</T></>:t('Not specified by organizer'))}</dd></div><div><dt><T>Source checked</T></dt><dd>{event.verified_at}</dd></div></dl><div className="events-detail-links"><a href={event.official_url} rel="noreferrer" onClick={()=>calendarEventTrack('calendar_official_click',event,language,event.official_url)}><T>Official event website</T> ↗</a>{event.registration_url&&<a href={event.registration_url} rel="noreferrer" onClick={()=>calendarEventTrack('calendar_registration_click',event,language,event.registration_url)}><T>Registration</T> ↗</a>}<a href={event.source_url} rel="noreferrer"><T>Verified source</T></a></div></article>)}
   {events.some(e=>!e.timezone&&!e.processing_timezone)&&<p className="events-source-note"><T>When an event time zone is not established, date status uses Europe/Vilnius.</T></p>}</div>
  </dialog>
 </main>
}
