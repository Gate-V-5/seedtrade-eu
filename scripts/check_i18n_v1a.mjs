import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: AppV2 } = await server.ssrLoadModule('/src/AppV2.jsx')
  const { translate, languages } = await server.ssrLoadModule('/src/i18n/index.jsx')
  const { messages } = await server.ssrLoadModule('/src/i18n/messages.js')
  assert.deepEqual(languages.map(item => item.code), ['EN', 'DE', 'FR', 'ES', 'IT'])
  assert.deepEqual(languages.map(item => item.flag), ['🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹'])
  assert.equal(translate('DE', 'missing translation example'), 'missing translation example')
  const source = readFileSync('src/i18n/index.jsx', 'utf8')
  const appSource = readFileSync('src/AppV2.jsx', 'utf8')
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/)
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY, code\)/)
  assert.match(appSource, /value=\{language\} onChange=\{event=>setLanguage\(event.target.value\)\}/)
  for (const file of ['src/AppV2.jsx', 'src/WeatherEvidence.jsx']) {
    const content = readFileSync(file, 'utf8')
    const keys = [...content.matchAll(/<T>([^<]+)<\/T>/g)].map(match => match[1].replaceAll('&amp;', '&'))
      .concat([...content.matchAll(/<I18n text="([^"]+)"/g)].map(match => match[1]))
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
  ]
  for (const language of languages) {
    for (const [path, phrases] of pages) {
      globalThis.window = { location: { pathname: path, hash: '' } }
      const html = renderToStaticMarkup(React.createElement(AppV2, { initialLanguage: language.code }))
      assert.ok(html.includes(`${language.flag} ${language.code}`), `${language.code} selector flag missing`)
      for (const phrase of phrases) assert.ok(html.includes(translate(language.code, phrase)), `${language.code} ${path} missing ${phrase}`)
      if (language.code !== 'EN') for (const phrase of phrases) {
        if (translate(language.code, phrase) !== phrase) assert.ok(!html.includes(`>${phrase}<`), `${language.code} ${path} English UI: ${phrase}`)
      }
    }
    for (const phrase of ['Please complete all four fields with valid details.', 'Thank you. Your interest has been registered.', 'Unable to register your interest. Please try again later.']) {
      assert.ok(translate(language.code, phrase))
      if (language.code !== 'EN') assert.notEqual(translate(language.code, phrase), phrase)
    }
  }
  console.log('Five-language UI, flags, fallback, catalog, B2B messages and SSR coverage PASS')
} finally { await server.close() }
