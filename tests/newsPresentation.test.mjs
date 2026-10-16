import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {test} from 'node:test'
import {localizedContentText} from '../src/i18n/content.mjs'
import {publicNewsText} from '../src/newsPresentation.mjs'
const raw=readFileSync('src/generated/news.json','utf8')
const items=JSON.parse(raw).items
const story=items.find(x=>x.slug==='europe-summer-crop-heat-drought-2026')
for(const language of ['EN','DE','FR','ES','IT'])test(`${language}: only approved sentence suppressed; original evidence intact`,()=>{
 const before=JSON.stringify(story), original=localizedContentText(story,language,'why_it_matters')
 const expected=original.slice(0,original.indexOf('. ')+1)
 assert.equal(publicNewsText(story,language,'why_it_matters'),expected)
 assert.ok(original.startsWith(expected+' '));assert.ok(original.includes('Market Signal'))
 assert.equal(JSON.stringify(story),before)
 for(const field of ['headline','summary',...(story.content||[]).flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])])assert.equal(publicNewsText(story,language,field),localizedContentText(story,language,field))
})
test('every unrelated article and localized narrative remains identical',()=>{
 for(const item of items.filter(x=>x!==story))for(const language of ['EN','DE','FR','ES','IT'])for(const field of ['headline','summary','why_it_matters',...(item.content||[]).flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])])assert.equal(publicNewsText(item,language,field),localizedContentText(item,language,field))
 assert.equal(raw,execFileSync('git',['show','87d60c30ba7187b4c3222906531dc0dc50a57fdc:src/generated/news.json'],{encoding:'utf8'}))
})
test('no keyword filtering, altered/repeated text, other slug or field',()=>{
 for(const value of [story.why_it_matters+' Extra fact.',story.why_it_matters+' '+story.why_it_matters,story.why_it_matters.toUpperCase(),'Market Signal research remains editorial evidence.'])assert.equal(publicNewsText({...story,why_it_matters:value},'EN','why_it_matters'),value)
 assert.equal(publicNewsText({...story,slug:'unrelated'},'EN','why_it_matters'),story.why_it_matters)
 assert.equal(publicNewsText({...story,summary:story.why_it_matters},'EN','summary'),story.why_it_matters)
})
test('exact English fallback; private and unpublished records remain hidden',()=>{
 const fallback={...story,localizations:{}}
 for(const language of ['EN','DE','FR','ES','IT','unknown'])assert.equal(publicNewsText(fallback,language,'why_it_matters'),story.why_it_matters.split('. ')[0]+'.')
 for(const change of [{classification:'PRIVATE_DATA'},{publication_eligible:false},{publication_status:'DRAFT'}])assert.equal(publicNewsText({...story,...change},'EN','why_it_matters'),'')
})
