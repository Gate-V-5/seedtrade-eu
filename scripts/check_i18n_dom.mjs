// DOM integration: hydrate the production prerender, then exercise React events.
// JSDOM does not replace a visual browser check. No email/network is permitted.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createServer } from 'vite'

const dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
  url: 'https://seedtrade.test/', pretendToBeVisual: true,
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.HTMLElement.prototype.scrollIntoView = () => {}
// Display rotation is unrelated to language persistence; suppress its timers.
window.setInterval = () => 0
window.clearInterval = () => {}
const { hydrateRoot } = await import('react-dom/client')
const vite = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' })
const errors = []
const editorialEnglish = new Map()
let root, requests = [], responseMode = 'success'
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  assert.equal(url, '/api/network-interest')
  assert.equal(options.method, 'POST')
  requests.push(JSON.parse(options.body))
  if (responseMode === 'network-error') throw Error('Mock network error')
  return {
    ok: responseMode === 'success',
    json: async () => ({ message: responseMode === 'success'
      ? 'Thank you. Your interest has been registered.' : 'Mock server error' }),
  }
}
function routeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? routeFiles(file) : entry.name === 'index.html' ? [file] : []
  })
}
try {
  const { default: App } = await vite.ssrLoadModule('/src/AppV2.jsx')
  const { languages, translate } = await vite.ssrLoadModule('/src/i18n/index.jsx')
  const files = routeFiles('dist')
  assert.equal(files.length, 40)
  async function load(file, savedLanguage) {
    if (root) await act(async () => root.unmount())
    dom.reconfigure({ url: 'https://seedtrade.test/' + path.relative('dist', path.dirname(file)) + '/' })
    window.localStorage.clear()
    if (savedLanguage) window.localStorage.setItem('seedtrade_language', savedLanguage)
    const html = readFileSync(file, 'utf8')
    const markup = html.split('<div id="root">')[1].split('</div><noscript>')[0]
    document.getElementById('root').innerHTML = markup
    await act(async () => {
      root = hydrateRoot(document.getElementById('root'), React.createElement(App), {
        onRecoverableError: error => errors.push(error.message),
      })
    })
  }
  async function select(code) {
    const selector = document.querySelector('.language-select')
    await act(async () => {
      selector.value = code
      selector.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
  }
  async function fillInput(input, value) {
    await act(async () => {
      if (input.tagName === 'SELECT') input.value = value
      else Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
    })
  }
  const fill = (name, value) => fillInput(document.querySelector(`.network-interest [name="${name}"]`), value)
  async function submit() {
    await act(async () => {
      document.querySelector('.network-interest form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    })
  }
  for (const { code, flag } of languages) {
    await load('dist/index.html')
    assert.equal(document.querySelector('.language-select').value, 'EN')
    await select(code)
    assert.equal(window.localStorage.getItem('seedtrade_language'), code)
    assert.equal(document.documentElement.lang, code.toLowerCase())
    assert.equal(document.querySelector('.language-select option:checked').textContent, `${flag} ${code}`)
    assert.equal(document.querySelector('.network-interest h2').textContent, translate(code, 'Join the European seed market network'))
    await act(async () => document.querySelector('.network-interest form').reportValidity())
    assert.equal(document.querySelector('[name="company"]').validationMessage, translate(code, 'Please complete this required field.'))
    await submit()
    assert.equal(document.querySelector('.network-feedback').textContent, translate(code, 'Please complete all four fields with valid details.'))
    assert.equal(requests.length, 0)
    for (const [name, value] of Object.entries({ company: 'Test Seed', email: 'invalid', role: 'Buyer', country: 'Lithuania' })) await fill(name, value)
    await act(async () => document.querySelector('.network-interest form').reportValidity())
    assert.equal(document.querySelector('[name="email"]').validationMessage, translate(code, 'Please enter a valid business email address.'))
    await fill('email', 'test@example.org')
    assert.equal(document.querySelector('[name="email"]').validationMessage, '')
    for (const mode of ['server-error', 'network-error', 'success']) {
      responseMode = mode
      await submit()
      assert.equal(requests.at(-1).role, 'Buyer', 'Translated role must retain canonical server value')
      assert.equal(document.querySelector('.network-feedback').textContent, translate(code, mode === 'success'
        ? 'Thank you. Your interest has been registered.' : 'Unable to register your interest. Please try again later.'))
    }
    requests = []
    const saved = window.localStorage.getItem('seedtrade_language')
    await load('dist/buying-requests/index.html', saved)
    await fillInput(document.getElementById('marketplace-search'), translate(code, 'Flax'))
    assert.equal(document.querySelectorAll('.request-card').length, 3)
    assert.ok(document.querySelector('.request-card h3').textContent.includes('Linum usitatissimum'))
    await fillInput(document.getElementById('marketplace-search'), 'no-such-species-123')
    assert.equal(document.querySelector('.empty-state h2').textContent, translate(code, 'No matching listings'))
    await fillInput(document.getElementById('marketplace-search'), 'LS Riviera')
    assert.equal(document.querySelectorAll('.request-card').length, 2)
    await load('dist/market/index.html', saved)
    await fillInput(document.getElementById('market-search'), translate(code, 'Red clover'))
    assert.equal(document.querySelectorAll('.crop-card').length, 1)
    assert.ok(document.querySelector('.crop-card h3').textContent.includes('Trifolium pratense'))
    // New roots simulate full-document navigation/refresh using origin storage.
    for (const file of files) {
      await load(file, saved)
      assert.equal(document.querySelector('.language-select').value, code, file)
      assert.equal(document.documentElement.lang, code.toLowerCase(), file)
      assert.equal(document.querySelector('.language-select option:checked').textContent, `${flag} ${code}`)
      if (/\/(news|insights)\/[^/]+\/index.html$/.test(file)) {
        const narrative = [document.querySelector('main h1').textContent, document.querySelector('main .lead').textContent]
        if (code === 'EN') editorialEnglish.set(file, narrative)
        else assert.deepEqual(narrative, editorialEnglish.get(file), 'V1-B editorial copy must remain English')
      }
    }
  }
  await load('dist/index.html', 'invalid')
  assert.equal(document.querySelector('.language-select').value, 'EN')
  // Storage failure still permits in-memory selection and an English refresh.
  const getItem = window.Storage.prototype.getItem, setItem = window.Storage.prototype.setItem
  window.Storage.prototype.getItem = () => { throw Error('Storage blocked') }
  window.Storage.prototype.setItem = () => { throw Error('Storage blocked') }
  await load('dist/index.html')
  assert.equal(document.querySelector('.language-select').value, 'EN')
  await select('DE')
  assert.equal(document.querySelector('.language-select').value, 'DE')
  if (root) await act(async () => root.unmount())
  root = null
  window.Storage.prototype.getItem = getItem
  window.Storage.prototype.setItem = setItem
  assert.deepEqual(errors, [], 'Hydration must not require recovery')
  console.log('DOM hydration: 200 route/language combinations, selection, refresh/navigation storage, invalid/blocked storage and mocked B2B validation/success/error PASS; real email sends=0')
} finally {
  if (root) await act(async () => root.unmount())
  globalThis.fetch = originalFetch
  await vite.close()
  dom.window.close()
}
