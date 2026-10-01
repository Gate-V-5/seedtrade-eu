#!/usr/bin/env node
// Offline structural validation. Editorial approval still requires reading sources.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validateSourceRegistry, validateNewsRecord, validDate} from '../src/news.mjs'
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])) : value
export const fingerprint = item => createHash('sha256').update(JSON.stringify(stable(Object.fromEntries(Object.entries(item).filter(([key])=>!['fingerprint','localizations'].includes(key)))))).digest('hex')
export function validateDailyNews(news,registry) {
  const errors=validateSourceRegistry(registry),ids=new Set(),slugs=new Set()
  if(news.classification!=='PUBLIC_SAFE'||news.market_engine_input!==false||!validDate(news.as_of)||!Array.isArray(news.items))return [...errors,'Invalid public collection']
  for(const item of news.items) {
    const recordErrors=validateNewsRecord(item,registry)
    errors.push(...recordErrors.map(error=>`${item?.slug}: ${error}`))
    if(!item||slugs.has(item.slug)||item.id&&ids.has(item.id))errors.push('Duplicate content identity')
    if(!item || recordErrors.length)continue
    slugs.add(item.slug);if(item.id)ids.add(item.id)
    if(item.publication_date>news.as_of)errors.push(`${item.slug}: future publication`)
    if(!item.stream)continue
    if(item.fingerprint!==fingerprint(item))errors.push(`${item.slug}: stale fingerprint`)
    for(const language of ['de','fr','es','it']) {
      const locale=item.localizations?.[language]
      if(!locale)continue // Per-field canonical fallback is supported for future records.
      if(Object.keys(locale).some(key=>!['headline','summary','why_it_matters','content'].includes(key)))errors.push(`${item.slug}: localization changes metadata`)
      if(locale.content&&(!Array.isArray(locale.content)||locale.content.some((section,index)=>section.id!==item.content[index]?.id||Object.keys(section).some(key=>!['id','heading','body'].includes(key)))))errors.push(`${item.slug}: localization section identity mismatch`)
    }
    for(const ref of [item.previous_item_id,...item.related_item_ids].filter(Boolean)) {
      const other=news.items.find(row=>row.id===ref)
      if(!other||other.id===item.id||validateNewsRecord(other,registry).length||other.series_id!==item.series_id||other.publication_date>item.publication_date)errors.push(`${item.slug}: invalid continuity reference`)
    }
  }
  return errors
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const news=JSON.parse(fs.readFileSync('src/generated/news.json','utf8')),registry=JSON.parse(fs.readFileSync('src/data/news_sources.json','utf8'))
  const errors=validateDailyNews(news,registry)
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`Daily News validation PASS: ${news.items.length} public records; ${registry.sources.filter(source=>source.active).length} active source families`)
}
