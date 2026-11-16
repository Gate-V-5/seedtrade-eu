import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {pulseComparisonPeriod,pulseCardPeriod,pulseBarPercent,pulseFormat,rollingCompletedRange} from '../src/tradePulsePeriods.mjs'
import {pulseCnRows} from '../src/i18n/stage1Messages.js'
const pulse=JSON.parse(fs.readFileSync(new URL('../src/generated/trade_pulse_public.json',import.meta.url),'utf8'))

test('cards use their actual one-month source period; comparison is same month one year earlier',()=>{
  for(const view of Object.values(pulse.views))assert.deepEqual(pulseCardPeriod(view),{period:view.latest.period,comparison:pulseComparisonPeriod(view.latest.period),aggregation:'MONTH_ONLY'})
  assert.equal(pulseComparisonPeriod('2026-08'),'2025-08')
  assert.equal(pulseComparisonPeriod('2026-01'),'2025-01')
  assert.equal(pulseComparisonPeriod('2026-13'),null)
  assert.equal(pulseCardPeriod({latest:{period:'invalid'}}).period,null)
})
test('rolling chart is 12 separate completed monthly observations, not a sum',()=>{
  for(const view of Object.values(pulse.views)){
    const range=rollingCompletedRange(view.history,pulse.latest_completed_period,pulse.latest_available_partial_period)
    assert.equal(range.complete,true);assert.equal(view.history.length,12)
    const point=view.history.find(p=>p.period===view.latest.period)
    assert.equal(view.latest.volume_tonnes,point.volume_tonnes)
    assert.equal(view.latest.trade_value_eur,point.trade_value_eur)
    assert.notEqual(view.latest.volume_tonnes,view.history.reduce((sum,p)=>sum+p.volume_tonnes,0))
  }
})
test('zero and small chart values are not inflated, missing data stays missing, signed movers use magnitude',()=>{
  assert.equal(pulseBarPercent(0,100),0)
  assert.equal(pulseBarPercent(1,100),1)
  assert.equal(pulseBarPercent(-25,100),25)
  assert.equal(pulseBarPercent(null,100),null)
  assert.equal(pulseBarPercent(Number.NaN,100),null)
  assert.equal(pulseBarPercent(0,0),null)
})
test('all selected eight-digit CN codes have explicit five-language names and sowing scope',()=>{
  const selected=pulse.scope.included_cn_codes.map(x=>x.cn8).sort()
  assert.deepEqual(pulseCnRows.map(x=>x[0]).sort(),selected)
  assert.equal(new Set(selected).size,40)
  assert(selected.every(code=>/^\d{8}$/.test(code)))
  assert(pulse.scope.included_cn_codes.every(x=>/sowing/i.test(x.crop)))
  assert(pulseCnRows.every(x=>x.length===6&&x.every(Boolean)))
})
test('financial, quantity and percentage presentation uses each selected locale without changing values',()=>{
  for(const [lang,locale] of Object.entries({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'})){
    const f=pulseFormat(lang)
    assert.equal(f.number(278038.07),new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(278038.07))
    assert.equal(f.percent(17.04),new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'}).format(.1704))
    assert(f.currency(366953818).includes('366'))
    assert(f.month('2026-08').includes('2026'))
  }
})
