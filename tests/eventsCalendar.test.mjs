import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {validCalendarEvent,confirmedCalendarEvents,calendarEventStatus,nextCalendarEvent,calendarEventsOnDate,monthCells,calendarSelection,calendarEventTrack} from '../src/eventsCalendar.mjs'
import {eventsRows} from '../src/i18n/eventsMessages.js'
const register=JSON.parse(fs.readFileSync('src/data/events_calendar.json','utf8'))
const fixture=(id,start,end,extra={})=>({...register.events[0],id,name:id,start_date:start,end_date:end,timezone:'Europe/Vilnius',processing_timezone:null,...extra})
test('One officially sourced, unique register; every confirmed date has provenance and valid values',()=>{
 assert(register.events.length>=20);assert.equal(new Set(register.events.map(e=>e.id)).size,register.events.length)
 for(const e of register.events){assert(validCalendarEvent(e),e.id);assert.equal(e.confirmation_status,'CONFIRMED');assert(e.source_evidence&&e.verified_at==='2026-11-19');assert(e.start_date>=register.coverage_start&&e.end_date<=register.coverage_end)}
 assert.equal(confirmedCalendarEvents(register).length,register.events.length)
 for(const e of register.events)assert(eventsRows.some(r=>r[0]===e.description),'Description translation: '+e.id)
 for(const row of eventsRows){assert.equal(row.length,5);assert(row.every(s=>typeof s==='string'&&s.length))}
})
test('Ongoing events take priority; deterministic overlaps, future rollover, neutral empty state',()=>{
 const a=fixture('a','2027-05-17','2027-05-19'),b=fixture('b','2027-05-18','2027-05-20'),c=fixture('c','2027-06-01','2027-06-01'),r={events:[c,b,a]}
 assert.equal(nextCalendarEvent(r,new Date('2027-05-18T10:00Z')).id,'a')
 assert.equal(nextCalendarEvent(r,new Date('2027-05-20T10:00Z')).id,'b')
 assert.equal(nextCalendarEvent(r,new Date('2027-05-21T10:00Z')).id,'c')
 assert.equal(nextCalendarEvent(r,new Date('2028-01-01T10:00Z')),null)
 assert.equal(nextCalendarEvent({events:[]}),null)
})
test('Inclusive final local day and timezone/DST boundary; no expired event labelled upcoming',()=>{
 const toronto=fixture('toronto','2027-05-17','2027-05-19',{timezone:'America/Toronto'})
 assert.equal(calendarEventStatus(toronto,new Date('2027-05-20T03:59:59Z')),'ONGOING')
 assert.equal(calendarEventStatus(toronto,new Date('2027-05-20T04:00:00Z')),'PAST')
 const berlin=fixture('berlin','2027-03-28','2027-03-28',{timezone:null,processing_timezone:'Europe/Berlin'})
 assert.equal(calendarEventStatus(berlin,new Date('2027-03-28T21:59:59Z')),'ONGOING')
 assert.equal(calendarEventStatus(berlin,new Date('2027-03-28T22:00:00Z')),'PAST')
 assert.equal(nextCalendarEvent({events:[toronto]},new Date('2027-05-20T04:00:00Z')),null)
})
test('Multi-day and simultaneous events are returned on every date; empty dates stay empty',()=>{
 const a=fixture('a','2026-11-29','2026-12-01'),b=fixture('b','2026-11-30','2026-11-30'),r={events:[a,b]}
 assert.deepEqual(calendarEventsOnDate(r,'2026-11-29').map(e=>e.id),['a'])
 assert.deepEqual(calendarEventsOnDate(r,'2026-11-30').map(e=>e.id),['a','b'])
 assert.deepEqual(calendarEventsOnDate(r,'2026-12-01').map(e=>e.id),['a'])
 assert.deepEqual(calendarEventsOnDate(r,'2026-12-02'),[])
 assert.deepEqual(calendarEventsOnDate(register,'2027-12-31'),[])
})
test('Monday-first calendar, leap days, month/year selection and invalid values',()=>{
 const nov=monthCells(2026,11);assert.equal(nov[6],'2026-11-01');assert.equal(nov[7],'2026-11-02')
 assert(monthCells(2028,2).includes('2028-02-29'));assert(!monthCells(2027,2).includes('2027-02-29'))
 assert.throws(()=>monthCells(2027,13));assert.deepEqual(calendarSelection('?year=2027&month=4'),{year:2027,month:4})
 assert.equal(calendarSelection('?year=NaN&month=-1',new Date('2026-11-19T10:00Z')).year,2026)
})
test('Unconfirmed, malformed and duplicate records cannot create green calendar dates',()=>{
 const a=fixture('a','2027-02-01','2027-02-02');assert.equal(confirmedCalendarEvents({events:[a,a]}).length,1)
 for(const bad of [{...a,start_date:'2027-02-30'},{...a,official_url:'javascript:alert(1)'},{...a,end_date:'2027-01-01'},{...a,timezone:'Fake/Zone'},{...a,confirmation_status:'UNCONFIRMED'}])assert.equal(confirmedCalendarEvents({events:[bad]}).length,0)
})
test('Calendar measurement stays policy-disabled and strips link queries and private data',()=>{
 assert.equal(calendarEventTrack('calendar_view'),false)
 let got;calendarEventTrack('calendar_official_click',{id:'event'},'de','https://example.org/?token=secret',(...args)=>{got=args;return true});assert.equal(got[1].target,'example.org');assert(!JSON.stringify(got).includes('secret'))
 assert.equal(calendarEventTrack('unknown'),false)
})
