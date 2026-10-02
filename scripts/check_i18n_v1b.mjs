import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { localizedContentText as text } from '../src/i18n/content.mjs'

const baseline='2424fd0e5bc498a0de4c5b18eba95955952d1cbf'
const codes=['EN','DE','FR','ES','IT']
const data=Object.fromEntries(['news','insights','weather_public'].map(name=>[name,JSON.parse(readFileSync(`src/generated/${name}.json`,'utf8'))]))
const species=JSON.parse(readFileSync('src/data/species_master_v1_1.json','utf8')).species
const plain=value=>species.reduce((s,item)=>item.botanical_name?s.replaceAll(` (${item.botanical_name})`,''):s,value)
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='localizations').map(([key,item])=>[key,canonical(item)])):value
const fields=record=>record.headline?['headline','summary','why_it_matters',...(record.content||[]).flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])]:record.title?['title','summary',...(record.partner_disclosure?['partner_disclosure']:[]),...record.content.flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])]:['methodology_note',...record.regions.map((_,i)=>`regions.${i}.name`)]
for (const [name,record] of Object.entries(data)) {
  const original=JSON.parse(execFileSync('git',['show',`${baseline}:src/generated/${name}.json`],{encoding:'utf8'}))
  if(name==='news')assert.deepEqual(canonical(record.items.filter(item=>!item.stream)),original.items,'Historical News English/identity/provenance/evidence unchanged')
  else assert.deepEqual(canonical(record),original,`${name}: English/identity/provenance/evidence unchanged`)
  assert.equal(record.classification,'PUBLIC_SAFE')
}
for (const record of [...data.news.items,...data.insights.articles,data.weather_public]) {
  assert.equal(record.classification,'PUBLIC_SAFE')
  assert.deepEqual(Object.keys(record.localizations).sort(),['de','es','fr','it'])
  for(const field of fields(record)) {
    const en=text(record,'EN',field)
    assert.ok(en.trim())
    for(const code of codes) {
      const local=text(record,code,field)
      assert.ok(local.trim(),`${code}: ${field} nonblank`)
      assert.ok(!/\{\w+\}|undefined|\[object Object\]/.test(local))
      // Region names may be identical proper names; all narrative fields must differ.
      if(code!=='EN'&&!field.startsWith('regions.'))assert.notEqual(local,en,`${code}: ${field} has translation`)
      assert.deepEqual(local.match(/\d+(?:[.,/]\d+)*/g)||[],en.match(/\d+(?:[.,/]\d+)*/g)||[],'Numbers/dates preserved')
      const names=['Euroseeds','INTERPOM','Lagrenas','Kortrijk Xpo','Energy and Climate Intelligence Unit','Carbon Brief','Windsor Framework','UK Parliament','European Commission','Valencia Conference Centre','InnovAction','NextGen']
      for(const name of names)if(en.includes(name))assert.ok(local.includes(name),`${code}: proper name ${name}`)
      if(code!=='EN')for(const sentence of en.split(/(?<=[.!?])\s+/).filter(value=>value.length>45))assert.ok(!local.includes(sentence),`${code}: untranslated English sentence`)
    }
  }
}
const fixture={classification:'PUBLIC_SAFE',title:'Canonical title',summary:'Canonical summary',content:[{heading:'Canonical heading',body:'Qualified evidence.'}],source_url:'https://official.test',localizations:{de:{title:'Deutscher Titel',summary:'Deutsche Zusammenfassung',content:[{body:'Qualifizierte Evidenz.'}],source_url:'https://wrong.test'}}}
assert.equal(text(fixture,'DE','content.0.heading'),'Canonical heading')
assert.equal(text(fixture,'DE','content.0.body'),'Qualifizierte Evidenz.')
for(const missing of [undefined,null,'','  ',23,{},[]]) {
  const r=structuredClone(fixture);r.localizations.de.title=missing
  assert.equal(text(r,'DE','title'),'Canonical title')
  assert.equal(text(r,'DE','summary'),'Deutsche Zusammenfassung')
}
fixture.localizations.en={title:'Wrong override'}
assert.equal(text(fixture,'EN','title'),'Canonical title')
assert.equal(text(fixture,'invalid','title'),'Canonical title')
assert.equal(text(fixture,'DE','source_url'),'')
assert.equal(text({...fixture,classification:'PRIVATE_DATA'},'DE','title'),'')
assert.equal(text({...fixture,publication_eligible:false},'DE','title'),'')
assert.equal(text({...fixture,publication_status:'DRAFT'},'DE','title'),'')
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
  const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
  for(const [kind,records] of [['news',data.news.items],['insights',data.insights.articles]]) {
    const taxa=new Map()
    for(const code of codes) {
      for(const record of records) {
        globalThis.window={location:{pathname:`/${kind}/${record.slug}`}}
        const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:code})))
        const main=dom.window.document.querySelector('main'), displayed=plain(main.textContent)
        for(const field of fields(record))assert.ok(displayed.includes(plain(text(record,code,field))),`${code} ${kind} ${field}`)
        const latin=[...main.querySelectorAll('i.botanical')].map(el=>el.textContent)
        if(code==='EN')taxa.set(record.slug,new Set(latin))
        else for(const name of taxa.get(record.slug))assert.ok(latin.includes(name),`${code}: preserve botanical ${name}`)
        for(const source of record.sources||[{url:record.source_url,label:record.source_name}]) {
          const link=main.querySelector(`a[href="${source.url}"]`);assert.ok(link);assert.equal(link.textContent,source.label)
        }
        assert.equal(dom.window.document.querySelector('.language-select').value,code)
        dom.window.close()
      }
      for(const route of [`/${kind}`,'/']) {
        globalThis.window={location:{pathname:route}}
        const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:code})))
        const displayed=plain(dom.window.document.querySelector('main').textContent)
        for(const record of records.filter(item=>kind!=='news'||route!=='/'||item.stream))assert.ok(displayed.includes(plain(text(record,code,kind==='news'&&route==='/'?'headline':'summary'))),`${code} card discovery text`)
        dom.window.close()
      }
    }
  }
  for(const code of codes) {
    globalThis.window={location:{pathname:'/weather-evidence'}}
    const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:code})))
    const displayed=dom.window.document.querySelector('main').textContent
    for(const field of fields(data.weather_public))assert.ok(displayed.includes(text(data.weather_public,code,field)))
    assert.equal(dom.window.document.querySelectorAll('.weather-region-group li').length,23)
    dom.window.close()
  }
  // Future public Weather sections render through the same architecture.
  const {default:live}=await vite.ssrLoadModule('/src/generated/weather_public.json')
  live.content=[{heading:'Future context',body:'No validated impact.'}]
  for(const code of ['de','fr','es','it'])live.localizations[code].content=[{heading:`${code} context`,body:`${code} qualified evidence`}]
  for(const code of codes) {
    const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:code})))
    assert.ok(dom.window.document.querySelector('main').textContent.includes(text(live,code,'content.0.body')))
    dom.window.close()
  }
  delete live.content
  for(const code of ['de','fr','es','it'])delete live.localizations[code].content
  console.log('V1-B PASS: 5-language News/Insights/Weather/card rendering, completeness/mixed-language, per-field EN fallback, botanical names, canonical provenance/numbers, PUBLIC_SAFE and future Weather sections')
}finally{await vite.close()}
