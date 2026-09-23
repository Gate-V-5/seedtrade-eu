#!/usr/bin/env node
/** Create unique SEO route shells and fail-closed noindex private shells. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const readJson = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'))
const market = await readJson('src/generated/market_public.json')
const insights = await readJson('src/generated/insights.json')
const news = await readJson('src/generated/news.json')
const marketplace = await readJson('src/generated/rfqs_public.json')

const routes = [
  ['market', 'EU Seed Market Dashboard', 'Representative prices and trade volumes for eleven European seed categories.', true],
  ['methodology', 'SeedTrade data methodology', 'How SeedTrade validates official trade data, representative prices and evidence status.', true],
  ['about', 'About SeedTrade', 'EU Seed Market Intelligence for professional market participants.', true],
  ['privacy', 'Privacy Policy', 'SeedTrade privacy information.', true],
  ['terms', 'Terms of Use', 'SeedTrade terms of use.', true],
  ['confidentiality', 'Commercial Confidentiality', 'How commercially sensitive information is controlled.', true],
  ['disclaimer', 'Market Intelligence Disclaimer', 'Important limitations of derived market intelligence.', true],
  ['insights', 'Research & Partner Insights', 'European seed research, events and transparently labelled partner insights.', true],
  ['news', 'Daily Seed Market News', 'Verified, source-linked developments across the European seed chain.', true],
  ['buying-requests', 'Active Seed Marketplace Listings', 'Verified PUBLIC_SAFE seed offers and buying requests; sensitive company and contact details remain private.', true],
]

for (const crop of market.crops) routes.push([
  `market/${crop.slug}`,
  `${crop.crop} market data`,
  `Representative price, trade volume and evidence status for ${crop.crop}.`,
  true,
])
for (const article of insights.articles) routes.push([
  `insights/${article.slug}`,
  article.seo.title,
  article.seo.description,
  true,
])
for (const item of news.items) routes.push([
  `news/${item.slug}`,
  `${item.headline} | SeedTrade.eu`,
  item.summary,
  true,
])
for (const listing of marketplace.items) routes.push([
  `buying-requests/${listing.slug}`,
  `${listing.species_common_name} ${listing.variety} seed offer`,
  `Active PUBLIC_SAFE ${listing.species_common_name} seed offer: ${listing.quantity} ${listing.quantity_unit}, ${listing.incoterm} ${listing.location}.`,
  true,
])
for (const privateRoute of ['rfq', 'offer', 'account', 'admin']) routes.push([
  privateRoute,
  'SeedTrade private application',
  'Private application route.',
  false,
])

const articleByRoute = new Map(insights.articles.map(item => [`insights/${item.slug}`, item]))
const newsByRoute = new Map(news.items.map(item => [`news/${item.slug}`, item]))
const cropByRoute = new Map(market.crops.map(item => [`market/${item.slug}`, item]))

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
}

function replaceOnce(source, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`Required HTML tag not found: ${pattern}`)
  return source.replace(pattern, replacement)
}

const source = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
for (const [route, title, description, indexable] of routes) {
  const canonical = `https://seedtrade.eu/${route}`
  let page = source
  page = replaceOnce(page, /<title>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`)
  page = replaceOnce(page, /<meta\s+name="description"[^>]*>/is, `<meta name="description" content="${escapeHtml(description)}">`)
  page = replaceOnce(page, /<meta\s+name="robots"[^>]*>/is, `<meta name="robots" content="${indexable ? 'index,follow' : 'noindex,nofollow'}">`)
  page = replaceOnce(page, /<link\s+rel="canonical"[^>]*>/is, `<link rel="canonical" href="${canonical}">`)
  page = replaceOnce(page, /<meta\s+property="og:title"[^>]*>/is, `<meta property="og:title" content="${escapeHtml(title)}">`)
  page = replaceOnce(page, /<meta\s+property="og:description"[^>]*>/is, `<meta property="og:description" content="${escapeHtml(description)}">`)
  page = replaceOnce(page, /<meta\s+property="og:url"[^>]*>/is, `<meta property="og:url" content="${canonical}">`)

  const structured = []
  if (route === 'market' || cropByRoute.has(route)) {
    const crop = cropByRoute.get(route)
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: title,
      description,
      url: canonical,
      creator: { '@type': 'Organization', name: 'SeedTrade.eu' },
      isBasedOn: 'Eurostat COMEXT DS-045409',
      temporalCoverage: crop ? crop.latest_completed_period : market.latest_completed_period,
      license: 'https://ec.europa.eu/eurostat/about-us/policies/copyright',
    })
  }
  if (articleByRoute.has(route)) {
    const article = articleByRoute.get(route)
    structured.push({
      '@context': 'https://schema.org',
      '@type': article.seo.structured_data_type,
      name: article.title,
      headline: article.title,
      description: article.summary,
      datePublished: article.publication_date,
      dateModified: article.updated_date ?? article.publication_date,
      url: article.seo.canonical,
      publisher: { '@type': 'Organization', name: 'SeedTrade.eu' },
    })
  }
  if (newsByRoute.has(route)) {
    const item = newsByRoute.get(route)
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: item.headline,
      description: item.summary,
      datePublished: item.publication_date,
      url: item.canonical_url,
      publisher: { '@type': 'Organization', name: 'SeedTrade.eu' },
    })
  }
  for (const item of structured) {
    const json = JSON.stringify(item, null, 2).replaceAll('</', '<\\/')
    page = page.replace('</head>', `<script type="application/ld+json">${json}</script></head>`)
  }

  const target = path.join(dist, route, 'index.html')
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, page, 'utf8')
}

process.stdout.write(`prerendered ${routes.filter(([, , , indexable]) => indexable).length} public routes and 4 noindex private routes\n`)
