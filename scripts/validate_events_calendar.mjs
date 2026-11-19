import fs from 'node:fs'
import assert from 'node:assert/strict'
import {validCalendarEvent,confirmedCalendarEvents} from '../src/eventsCalendar.mjs'
const register=JSON.parse(fs.readFileSync('src/data/events_calendar.json','utf8'))
assert.equal(register.schema,'SEEDTRADE_EVENTS_CALENDAR_V1')
assert.equal(new Set(register.events.map(e=>e.id)).size,register.events.length,'Duplicate event IDs')
assert.equal(confirmedCalendarEvents(register).length,register.events.length,'Unconfirmed, duplicate or invalid published calendar event')
for(const event of register.events){assert(validCalendarEvent(event),event.id);assert(event.source_evidence&&event.start_date>=register.coverage_start&&event.end_date<=register.coverage_end,event.id)}
console.log(`Events calendar PASS: ${register.events.length} unique official-source confirmed records; missing dates remain empty.`)
