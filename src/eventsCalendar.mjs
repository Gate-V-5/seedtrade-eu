import {newsDate} from './news.mjs'
import {track} from './legal/analyticsPolicy.mjs'

export const DEFAULT_EVENT_TIMEZONE='Europe/Vilnius'
export const EVENT_CATEGORIES=['Seed Trade','Seed Production','Plant Breeding','Seed Testing','Seed Technology','Agricultural Fair']
const confirmedCache=new WeakMap()
export function validEventDate(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false
 const date=new Date(day+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===day
}
const https=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export function validCalendarEvent(e){
 try{
  if(!e||!e.id||!e.name||!validEventDate(e.start_date)||!validEventDate(e.end_date)||e.end_date<e.start_date||!https(e.official_url)||!https(e.source_url)||!validEventDate(e.verified_at)||!EVENT_CATEGORIES.includes(e.category)||!['ONLINE','PHYSICAL','HYBRID'].includes(e.format)||!e.organizer||!e.description||!e.confirmation_status)return false
  if(e.registration_url!==null&&!https(e.registration_url))return false
  for(const zone of [e.timezone,e.processing_timezone].filter(Boolean))new Intl.DateTimeFormat('en',{timeZone:zone}).format()
  return true
 }catch{return false}
}
export function confirmedCalendarEvents(register){
 if(!register||typeof register!=='object')return []
 const cached=confirmedCache.get(register);if(cached?.input===register.events)return cached.output
 // Registers are static imported snapshots; additions replace the snapshot.
 // Validate once, not once for each of the year's 365 date cells.
 const seen=new Set();const output=(register.events||[]).filter(e=>{
  if(!validCalendarEvent(e)||e.confirmation_status!=='CONFIRMED')return false
  const key=e.name.toLowerCase().trim()+'|'+e.start_date+'|'+e.end_date
  if(seen.has(key))return false;seen.add(key);return true
 }).sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.id.localeCompare(b.id))
 confirmedCache.set(register,{input:register.events,output});return output
}
export function localEventDay(event,now=new Date()){
 const zone=event.timezone||event.processing_timezone
 return zone?new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now):newsDate(now)
}
export function calendarEventStatus(e,now=new Date()){
 if(e.confirmation_status!=='CONFIRMED')return 'UNCONFIRMED'
 const day=localEventDay(e,now);return e.end_date<day?'PAST':e.start_date<=day?'ONGOING':'UPCOMING'
}
export function nextCalendarEvent(register,now=new Date()){
 const events=confirmedCalendarEvents(register)
 const ongoing=events.filter(e=>calendarEventStatus(e,now)==='ONGOING').sort((a,b)=>a.end_date.localeCompare(b.end_date)||a.start_date.localeCompare(b.start_date)||a.id.localeCompare(b.id))
 return ongoing[0]||events.find(e=>calendarEventStatus(e,now)==='UPCOMING')||null
}
export function calendarEventsOnDate(register,day){return validEventDate(day)?confirmedCalendarEvents(register).filter(e=>e.start_date<=day&&e.end_date>=day):[]}
export function monthCells(year,month){
 if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(month)||month<1||month>12)throw Error('INVALID_CALENDAR_MONTH')
 const offset=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7,days=new Date(Date.UTC(year,month,0)).getUTCDate()
 return Array.from({length:42},(_,i)=>i<offset||i>=offset+days?null:`${year}-${String(month).padStart(2,'0')}-${String(i-offset+1).padStart(2,'0')}`)
}
export function calendarSelection(search='',now=new Date()){
 const url=new URLSearchParams(search),today=newsDate(now).split('-').map(Number),year=Number(url.get('year')),month=Number(url.get('month'))
 return{year:Number.isInteger(year)&&year>=2000&&year<=2100?year:today[0],month:Number.isInteger(month)&&month>=1&&month<=12?month:today[1]}
}
export function eventDateLabel(e,language='en',long=false){
 const f=new Intl.DateTimeFormat(language.toLowerCase(),{day:'numeric',month:long?'long':'short',year:'numeric',timeZone:'UTC'}),start=new Date(e.start_date+'T12:00:00Z'),end=new Date(e.end_date+'T12:00:00Z')
 return e.start_date===e.end_date?f.format(start):f.formatRange(start,end)
}
export function calendarEventTrack(name,event=null,language='en',url='',send=track){
 if(!['calendar_view','calendar_event_select','calendar_official_click','calendar_registration_click'].includes(name))return false
 let host='';try{host=new URL(url).hostname}catch{}
 return send(name,{event_id:event?.id||'',language:language.toLowerCase(),target:host})
}
