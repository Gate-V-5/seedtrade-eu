import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: AppV2 } = await server.ssrLoadModule('/src/AppV2.jsx')
  const { translate, languages } = await server.ssrLoadModule('/src/i18n/index.jsx')
  const { messages } = await server.ssrLoadModule('/src/i18n/messages.js')
  const pulse = JSON.parse(readFileSync('src/generated/trade_pulse_public.json', 'utf8'))
  const species = JSON.parse(readFileSync('src/data/species_master_v1_1.json', 'utf8')).species
  const dataLabels = [pulse.scope.rule, pulse.extra_eu_balance.definition,
    ...Object.values(pulse.views).flatMap(view => [view.label, view.definition, view.unit_value_range.rule]),
    ...species.map(item => item.common_name_en),
    ...JSON.parse(readFileSync('src/generated/europe_country_map_public.json', 'utf8')).countries.map(item => item.name)]
  for (const language of languages.slice(1)) {
    assert.deepEqual(dataLabels.filter(key => !Object.hasOwn(messages[language.code], key)), [], `${language.code}: known static data labels missing`)
  }
  assert.deepEqual(languages.map(item => item.code), ['EN', 'DE', 'FR', 'ES', 'IT'])
  assert.deepEqual(languages.map(item => item.flag), ['🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹'])
  for (const language of ['EN', 'DE', 'FR', 'ES', 'IT', 'unknown', 'constructor', '__proto__']) {
    for (const key of ['missing translation example', 'constructor', 'toString', '__proto__']) {
      assert.equal(translate(language, key), key)
    }
    assert.equal(translate(language, 'Missing {count}', { count: 0 }), 'Missing 0')
    assert.equal(translate(language, 'Missing {count}'), 'Missing {count}')
  }
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const [language, catalog] of Object.entries(messages)) {
    for (const [english, translated] of Object.entries(catalog)) {
      assert.equal(typeof translated, 'string')
      assert.ok(translated.trim(), `${language}: empty translation for ${english}`)
      assert.deepEqual(placeholders(translated), placeholders(english), `${language}: placeholders for ${english}`)
    }
  }
  const source = readFileSync('src/i18n/index.jsx', 'utf8')
  const appSource = readFileSync('src/AppV2.jsx', 'utf8')
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/)
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY, code\)/)
  assert.match(appSource, /value=\{language\} onChange=\{event=>setLanguage\(event.target.value\)\}/)
  for (const file of ['src/AppV2.jsx', 'src/WeatherEvidence.jsx']) {
    const content = readFileSync(file, 'utf8')
    const keys = [...content.matchAll(/<T>([^<]+)<\/T>/g)].map(match => match[1].replaceAll('&amp;', '&'))
      .concat([...content.matchAll(/<I18n text="([^"]+)"/g)].map(match => match[1]))
      .concat([...content.matchAll(/\bt\("([^"]+)"/g)].map(match => match[1]))
    for (const language of languages.slice(1)) {
      assert.deepEqual(keys.filter(key => !messages[language.code][key]), [], `${language.code} missing keys in ${file}`)
    }
  }
  const pages = [
    ['/', ['European seed market intelligence', 'Top News', 'Join the European seed market network', 'Company name', 'Business email', 'Register interest']],
    ['/market', ['Market Intelligence', 'What is moving, where and when?']],
    ['/trade-pulse', ['Trade activity over time', 'Market observations']],
    ['/buying-requests', ['Seed marketplace discovery', 'Search species or variety']],
    ['/methodology', ['Data and Market Intelligence Methodology', 'Metrics and evidence']],
    ['/about', ['From scattered evidence to commercial context', 'Contact SeedTrade', 'Send message']],
    ['/weather-evidence', ['European coverage', 'Monitored region', 'Weather observation']],
    ['/privacy', ['Privacy Policy (draft)']],
    ['/terms', ['Terms of Use (draft)']],
    ['/confidentiality', ['Commercial Confidentiality']],
    ['/disclaimer', ['Market Intelligence Disclaimer']],
    ['/market/red-clover', ['Representative price history', 'Leading exporters', 'YoY']],
    ['/buying-requests/flax-ls-riviera-c2-100t', ['Packaging', '1,000 kg Big Bag', 'Request contact']],
  ]
  for (const language of languages) {
    for (const [path, phrases] of pages) {
      globalThis.window = { location: { pathname: path, hash: '' } }
      const html = renderToStaticMarkup(React.createElement(AppV2, { initialLanguage: language.code }))
      assert.ok(html.includes(`${language.flag} ${language.code}`), `${language.code} selector flag missing`)
      for (const phrase of phrases) assert.ok(html.includes(translate(language.code, phrase).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')), `${language.code} ${path} missing ${phrase}`)
      if (language.code !== 'EN') for (const phrase of phrases) {
        if (translate(language.code, phrase) !== phrase) assert.ok(!html.includes(`>${phrase}<`), `${language.code} ${path} English UI: ${phrase}`)
      }
    }
    for (const phrase of ['Please complete all four fields with valid details.', 'Thank you. Your interest has been registered.', 'Unable to register your interest. Please try again later.']) {
      assert.ok(translate(language.code, phrase))
      if (language.code !== 'EN') assert.notEqual(translate(language.code, phrase), phrase)
    }
  }
  function routeFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name)
      return entry.isDirectory() ? routeFiles(file) : entry.name === 'index.html' ? [file] : []
    })
  }
  const files = routeFiles('dist')
  assert.equal(files.length, 40)
  for (const language of languages) for (const file of files) {
    globalThis.window = { location: { pathname: '/' + path.relative('dist', path.dirname(file)), hash: '' } }
    const html = renderToStaticMarkup(React.createElement(AppV2, { initialLanguage: language.code }))
    assert.ok(html.includes(`${language.flag} ${language.code}`))
    assert.ok(html.includes(translate(language.code, 'Optional analytics')))
  }
  console.log('200 route/language SSR combinations PASS')
  console.log('Five-language UI, flags, fallback, catalog, B2B messages and SSR coverage PASS')
} finally { await server.close() }
