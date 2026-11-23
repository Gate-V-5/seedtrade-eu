import PublicMarketplace,{usePublicListings,publicCardRequest,requestInterestLink,publicMarketplaceCopy} from './b2b/PublicMarketplace.jsx'
import MarketplaceListingCard from './MarketplaceListingCard.jsx'
import QualitySpecifications from './b2b/QualitySpecifications.jsx'
import {listingTrading} from './listingTrading.mjs'
import EventsCalendar,{HomepageEventStrip} from './EventsCalendar.jsx'
import {languageHref} from './i18n/languageState.mjs'
import {PartnerAudience,InsightArticle,InsightVisual,InsightContext} from './PartnerInsights.jsx'
import {featuredInsights} from './partnerInsights.mjs'
import AnalysisContinuation from './AnalysisContinuation.jsx'
import MarketIntelligenceBackLink from './MarketIntelligenceBackLink.jsx'
import NewsPage from './NewsPage.jsx'
import {newsStream,newsEvent,newsDate,eventStatusLabel} from './news.mjs'
import B2bLanguageNotice from './b2b/B2bLanguageNotice.jsx'
import B2bNavigation from './b2b/B2bNavigation.jsx'
import LegalPage from './legal/LegalPage.jsx'
import {listingTitle} from './listingMetadata.mjs'
import {carouselCanAdvance} from './presentationAccessibility.mjs'
import { publicNewsText } from './newsPresentation.mjs'
import SnapshotCardTrain from './SnapshotCardTrain.jsx'
import {track,loadGTM} from './legal/analyticsPolicy.mjs'
import fixedEditorialVisuals from "./data/fixed_editorial_visuals.json"
import newsVisuals from "./data/news_visuals.json"
import newsPresentation from "./data/news_presentation.json"
import { useEffect, useMemo, useState } from "react"
import { localizedContentText } from "./i18n/content.mjs"
import { LanguageProvider, LanguageSelector, languages, translate, useLanguage, useT, T, I18n } from "./i18n/index.jsx"
import market from "./generated/market_public.json"
import EvidenceHistory from "./CommercialHistory.jsx"
import commercialRankings from "./generated/commercial_rankings_public.json"
import catalogueData from "./generated/market_snapshot_public.json"
import {snapshotCandidates} from "./commercialEvidence.mjs"
import {SeedCard as CommercialSeedCard} from "./CommercialSeedCard.jsx"
const catalogueSnapshot=snapshotCandidates(catalogueData.cards)
import tradeEntityScope from "./generated/trade_entity_scope.json"
import insights from "./generated/insights.json"
import news from "./generated/news.json"
import newsSources from "./data/news_sources.json"
import { NEWS_STREAMS, publicNewsItems, selectStreamHighlights, selectHomepageNews, filterNewsArchive, eventStatus } from "./news.mjs"
const publicNews = publicNewsItems(news.items, newsSources).filter(item => item.publication_date <= news.as_of)
import rfqs from "./generated/rfqs_public.json"
import weather from "./generated/weather_public.json"
import europeMap from "./generated/europe_country_map_public.json"
import WeatherEvidence from "./WeatherEvidence.jsx"
// SSR renders the existing page synchronously. Browser hydration waits for
// this route-only module before initial render; other routes never request it.
const productionPath = typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "") === "/production-intelligence"
const ProductionIntelligence = import.meta.env.SSR || productionPath
  ? (await import("./ProductionIntelligence.jsx")).default : null
const tradeCoveragePath = typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "") === "/market"
const TradeCoverage = import.meta.env.SSR || tradeCoveragePath ? (await import("./TradeCoverage.jsx")).default : null
const MarketCategories = import.meta.env.SSR || tradeCoveragePath ? (await import("./MarketCategories.jsx")).default : null
const catalogueRequestPath = typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "")
const catalogueModule = import.meta.env.SSR || (catalogueRequestPath && catalogueRequestPath.startsWith("/market"))
  ? await import("./MarketCatalogue.jsx") : null
const MarketCatalogue = catalogueModule?.default
import supply from "./generated/supply_public.json"
import publicData from "./generated/public_data_manifest.json"
import tradePulse from "./generated/trade_pulse_public.json"
import speciesMaster from "./data/species_master_v1_1.json"
import cropMasterSummary from "./generated/crop_master_summary.json"
import { countDistinctSeedSpecies } from "./cropMasterModel.mjs"
import {eligiblePublicListings,stage1Summary,verifiedFreshUpdate} from './stage1Metrics.mjs'
import {pulseCnRows} from './i18n/stage1Messages.js'
import { rollingCompletedHistory, rollingCompletedRange, pulseComparisonPeriod, pulseCardPeriod, pulseBarPercent, pulseFormat } from "./tradePulsePeriods.mjs"
import { priceConfidence, marketSignalConfidence } from "./evidenceConfidence.mjs"

const BASE = "https://seedtrade.eu"
const OFFICIAL_LOGO = "/seedtrade-official-logo.png"
const fmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 })
const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const tonnes = value => fmt.format(Number(value) / 1000)
const pct = value => value == null ? "n/a" : `${Number(value) >= 0 ? "+" : ""}${fmt.format(Number(value))}%`
const periodLabel = (period, language = "EN") => { const [year,month]=String(period).split("-"); return new Intl.DateTimeFormat({EN:"en-GB",DE:"de-DE",FR:"fr-FR",ES:"es-ES",IT:"it-IT"}[language], {month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(Number(year),Number(month)-1,1))) }
const completedHistory = view => rollingCompletedHistory(view.history, tradePulse.latest_completed_period, tradePulse.latest_available_partial_period)
const completedRange = rollingCompletedRange(tradePulse.views.eu_internal_trade.history, tradePulse.latest_completed_period, tradePulse.latest_available_partial_period)
const unitValueRangeLabel = range => range?.status === "VERIFIED" ? `€${fmt.format(range.low.unit_value_eur_kg)}–€${fmt.format(range.high.unit_value_eur_kg)}/kg` : "Range withheld · limited coverage"
const niceAxis = values => { const maximum=Math.max(0,...values.map(Number).filter(Number.isFinite)); if(maximum<=0)return {maximum:1,ticks:[0,.25,.5,.75,1]}; const rough=maximum/4, power=10**Math.floor(Math.log10(rough)), normalized=rough/power, step=(normalized<=1?1:normalized<=2?2:normalized<=5?5:10)*power, top=step*Math.ceil(maximum/step); return {maximum:top,ticks:[0,1,2,3,4].map(index=>top*index/4)} }
const axisLabel = (value, metric) => metric === "trade_value_eur" ? `€${fmt.format(value/1000000)}m` : value >= 1000 ? `${fmt.format(value/1000)}k t` : `${fmt.format(value)} t`
const speciesById = new Map(speciesMaster.species.map(item => [item.species_id, item]))
const speciesByCn = new Map(speciesMaster.species.flatMap(item => (item.cn_relationship?.codes || []).map(code => [code, item])))
const speciesForCrop = crop => speciesById.get(crop.species_id) || speciesByCn.get(String(crop.cn8))
const listingSpecies = listing => speciesById.get(listing.species_id) || speciesMaster.species.find(item => item.aliases.some(alias => alias.toLowerCase() === String(listing.crop || "").toLowerCase()))
const localizedSpeciesTerms = species => languages.map(({code})=>translate(code,species?.common_name_en || ""))
const searchSpecies = (query, species, variety = "") => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [species?.common_name_en, ...localizedSpeciesTerms(species), species?.botanical_name, ...(species?.aliases || []), ...(species?.search_terms || []), ...(species?.varieties || []).map(item=>item.name), variety].filter(Boolean).some(value => value.toLowerCase().includes(needle))
}
const marketplaceMatches = (query, listing) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const species = listingSpecies(listing)
  return [listing.variety, species?.common_name_en, ...localizedSpeciesTerms(species), species?.botanical_name, ...(species?.aliases || [])]
    .filter(Boolean).some(value => value.toLowerCase().includes(needle))
}
const speciesForName = name => speciesMaster.species.find(species=>species.aliases.some(alias=>alias.toLowerCase()===String(name).toLowerCase()) || species.common_name_en.toLowerCase()===String(name).toLowerCase())
const botanicalPlainName = (name, t) => { const species=speciesForName(name); return species?.botanical_name ? `${t(name)} (${species.botanical_name})` : t(name) }
function SpeciesName({ species, fallback, showReview = true }) { const t=useT(); return <>{t(species?.common_name_en || fallback)}{species?.botanical_name ? <> <i className="botanical">({species.botanical_name})</i></> : showReview && species?.status === "AMBIGUOUS_CN_CATEGORY" ? <small className="taxonomy-review"> <T>(broad CN category; species not asserted)</T></small> : null}</> }
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const botanicalAliases = speciesMaster.species.flatMap(species => species.botanical_name ? species.aliases.map(alias => ({ alias, species })) : []).sort((a,b)=>b.alias.length-a.alias.length)
const botanicalPattern = new RegExp(`\\b(${botanicalAliases.map(item=>escapeRegex(item.alias)).join("|")})\\b`, "gi")
const localizedBotanicalTerms = {
  DE: { 'Potato':['Kartoffel','Kartoffeln','Pflanzkartoffel','Pflanzkartoffeln','Kartoffelernte','Kartoffelwertschöpfungskette'], 'Flax':['Faser- oder Öllein'], 'Caraway':['Kümmel'], 'Common vetch':['Wickenarten'] },
  FR: { 'Potato':['pomme de terre','pommes de terre'], 'Flax':['lin textile ou oléagineux'], 'Caraway':['carvi'], 'Common vetch':['espèces de vesces'] },
  ES: { 'Potato':['patata','patatas'], 'Flax':['lino textil u oleaginoso'], 'Caraway':['alcaravea'], 'Common vetch':['especies de veza'] },
  IT: { 'Potato':['patata','patate'], 'Flax':['lino tessile o da olio'], 'Caraway':['carvi'], 'Common vetch':['specie di veccia'] },
}
function BotanicalText({ children }) { const {language}=useLanguage(); const aliases=language === "EN" ? botanicalAliases : [...botanicalAliases, ...Object.entries(localizedBotanicalTerms[language] || {}).flatMap(([name,terms]) => { const species=speciesMaster.species.find(item=>item.common_name_en===name); return species?.botanical_name ? terms.map(alias=>({alias,species})) : [] })].sort((a,b)=>b.alias.length-a.alias.length); const pattern=language === "EN" ? botanicalPattern : new RegExp(`\\b(${aliases.map(item=>escapeRegex(item.alias)).join("|")})\\b`,"gi"); const text=String(children ?? ""); if(!text) return null; const parts=[], matches=[...text.matchAll(pattern)]; let cursor=0; matches.forEach((match,index)=>{const before=text.slice(cursor,match.index); if(before) parts.push(before); const species=aliases.find(item=>item.alias.toLowerCase()===match[0].toLowerCase())?.species; const after=text.slice(match.index+match[0].length); const already=species?.botanical_name && after.trimStart().startsWith(`(${species.botanical_name})`); parts.push(<span key={`${match.index}-${index}`}>{match[0]}{species?.botanical_name&&!already&&<> <i className="botanical">({species.botanical_name})</i></>}</span>); cursor=match.index+match[0].length}); parts.push(text.slice(cursor)); return <>{parts}</> }

function circularSlice(items, start, count) {
  if (!items.length) return []
  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => items[(start + offset) % items.length])
}

function useCarousel(total, intervalMs = 2500, desktopCount = 4, tabletCount = desktopCount) {
  const [position,setPosition]=useState(0), [visible,setVisible]=useState(desktopCount), [manualPaused,setManualPaused]=useState(false), [hovered,setHovered]=useState(false), [focused,setFocused]=useState(false), [reduced,setReduced]=useState(false), [touchStart,setTouchStart]=useState(null)
  useEffect(()=>{
    const mobile=window.matchMedia?.("(max-width: 620px)"), tablet=window.matchMedia?.("(max-width: 1120px)"), motion=window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const update=()=>{setVisible(mobile?.matches?1:tablet?.matches?tabletCount:desktopCount);setReduced(Boolean(motion?.matches))}
    update(); tablet?.addEventListener?.("change",update); mobile?.addEventListener?.("change",update); motion?.addEventListener?.("change",update)
    return()=>{tablet?.removeEventListener?.("change",update);mobile?.removeEventListener?.("change",update);motion?.removeEventListener?.("change",update)}
  },[desktopCount,tabletCount])
  useEffect(()=>{if(!carouselCanAdvance({total,manualPaused,hovered,focused,reduced}))return undefined;const timer=window.setInterval(()=>setPosition(value=>(value+1)%total),intervalMs);return()=>window.clearInterval(timer)},[total,intervalMs,manualPaused,hovered,focused,reduced])
  const move=delta=>setPosition(value=>(value+delta+total)%total)
  const handlers={tabIndex:0,onMouseEnter:()=>setHovered(true),onMouseLeave:()=>setHovered(false),onFocus:()=>setFocused(true),onBlur:event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false)},onTouchStart:event=>setTouchStart(event.touches[0]?.clientX??null),onTouchEnd:event=>{const end=event.changedTouches[0]?.clientX;if(touchStart!=null&&end!=null&&Math.abs(end-touchStart)>35)move(end<touchStart?1:-1);setTouchStart(null)}}
  return {position,visible,move,handlers,reduced,manualPaused,togglePause:()=>setManualPaused(value=>!value)}
}

export function publicRoute(path) {
  return path === "/" || path === "/market" || path === "/trade-pulse" || path === "/weather-evidence" || path === "/production-intelligence" || path === "/methodology" || path === "/about" ||
    path === "/privacy" || path === "/terms" || path === "/confidentiality" || path === "/disclaimer" ||
    path === "/events" || path === "/insights" || path === "/news" || path === "/buying-requests" || path.startsWith("/buying-requests/") || path.startsWith("/market/") || path.startsWith("/insights/") || path.startsWith("/news/")
}

export function routeMeta(path, language = "EN") {
  if (path === "/") return { title: "EU Seed Market Intelligence | SeedTrade.eu", description: "Verified European seed trade, representative price and evidence-status intelligence.", index: true }
  const catalogueMeta = catalogueModule?.catalogueRouteMeta(path)
  if (catalogueMeta) return catalogueMeta
  if (path === "/events") return {title:`${translate(language,"European Seed Industry Events")} | SEEDTRADE.EU`,description:translate(language,"Verified congresses, training, breeding meetings and seed technology events. Select a green date for official details."),index:true}
  if (path === "/trade-pulse") return { title: "EU Seed Trade Pulse | SeedTrade.eu", description: "Verified EU internal, import and export seed trade volume, value and activity intelligence.", index: true }
  if (path === "/weather-evidence") return { title: "Weather & Seed Risk | SeedTrade.eu", description: "Explore crop-stage weather exposure, transparent yield sensitivities and their connection to seed production and trade.", index: true }
  if (path === "/production-intelligence") return { title: "Seed Production Intelligence | SeedTrade.eu", description: "Official European seed multiplication and certification evidence by species, country, metric and year.", index: true }
  const crop = market.crops.find(x => path === `/market/${x.slug}`)
  if (crop) return { title: `${crop.crop}${crop.botanical_name ? ` (${crop.botanical_name})` : ""} market data | SeedTrade.eu`, description: `${crop.crop}${crop.botanical_name ? ` (${crop.botanical_name})` : ""} representative price, EU trade volume, corridors and evidence status.`, index: true }
  const article = insights.articles.find(x => path === `/insights/${x.slug}`)
  if (article) return { title: `${localizedContentText(article,language,"title")} | SEEDTRADE.EU`, description: localizedContentText(article,language,"summary"), index: true }
  const story = publicNews.find(x => path === `/news/${x.slug}`)
  if (story) return { title: `${localizedContentText(story,language,"headline")} | SeedTrade.eu`, description: localizedContentText(story,language,"summary"), index: true }
  if (path.startsWith("/news/")) return { title: "Not found | SeedTrade.eu", description: "SeedTrade.eu information.", index: false }
  const request = rfqs.items.find(x => path === `/buying-requests/${x.slug}`)
  if (request) return { title: `${listingTitle(request, key=>translate(language,key))} | SeedTrade.eu`, description: `Active PUBLIC_SAFE ${request.species_common_name} seed offer: ${request.quantity} ${request.quantity_unit}, ${request.incoterm} ${request.location}.`, index: true }
  if (["/rfq", "/offer", "/account", "/admin"].includes(path)) return { title: "SeedTrade private application", description: "Private application route.", index: false }
  const names = { "/weather-evidence":"Weather & Seed Risk coverage", "/methodology":"Data methodology", "/about":"About SeedTrade", "/privacy":"Privacy Policy", "/terms":"Terms of Use", "/confidentiality":"Commercial Confidentiality", "/disclaimer":"Disclaimer", "/insights":"Research & Partner Insights", "/news":"European Seed Market News", "/buying-requests":"Active Marketplace Listings" }
  return { title: `${names[path] || "Not found"} | SeedTrade.eu`, description: "SeedTrade.eu information.", index: publicRoute(path) }
}

function useMetadata(path) {
  const {language}=useLanguage()
  useEffect(() => {
    const meta = routeMeta(path,language); document.title = meta.title
    const set = (selector, attr, value) => { let node = document.querySelector(selector); if (!node) { node = document.createElement("meta"); document.head.appendChild(node) }; Object.entries(attr).forEach(([k,v]) => node.setAttribute(k,v)); node.setAttribute("content", value) }
    set('meta[name="description"]', { name:"description" }, meta.description)
    set('meta[name="robots"]', { name:"robots" }, meta.index ? "index,follow" : "noindex,nofollow")
    set('meta[property="og:title"]', { property:"og:title" }, meta.title)
    set('meta[property="og:description"]', { property:"og:description" }, meta.description)
    set('meta[property="og:url"]', { property:"og:url" }, `${BASE}${path}`)
    set('meta[property="og:type"]', { property:"og:type" }, path.startsWith("/news/") || path.startsWith("/insights/") ? "article" : "website")
    let canonical = document.querySelector('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical) }; canonical.href = `${BASE}${path}`
  }, [path,language])
}

function useHashNavigation(path) {
  useEffect(() => {
    let frame = 0
    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const target = document.getElementById(id)
      if (target) target.scrollIntoView({ block: "start" })
    }
    const scheduleScroll = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(scrollToHash)
    }
    scheduleScroll()
    window.addEventListener("hashchange", scheduleScroll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("hashchange", scheduleScroll)
    }
  }, [path])
}

function Logo({ footer = false }) {
  const t=useT()
  return <a className={footer ? "official-logo footer-logo brand-plate" : "official-logo"} href="/" aria-label={t("SeedTrade.eu home")}><img src={OFFICIAL_LOGO} width="750" height="118" alt={t("SeedTrade.eu — European Seed Trading & Market Intelligence")}/></a>
}

function Header() {
  const { language, setLanguage } = useLanguage()
  const t = useT()
  const [open,setOpen]=useState(false); const path=window.location.pathname.replace(/\/$/,"") || "/"; return <header className={open ? "topbar menu-open" : "topbar"}><Logo/><button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">☰</span><b><T>Menu</T></b></button><nav id="primary-navigation" aria-label={t("Primary navigation")}><a aria-current={path.startsWith("/market")?"page":undefined} href="/market"><T>Market Intelligence</T></a><a aria-current={path.startsWith("/news")?"page":undefined} href="/news"><T>News</T></a><a aria-current={path.startsWith("/insights")?"page":undefined} href="/insights"><T>Insights</T></a><a aria-current={path==="/methodology"?"page":undefined} href="/methodology"><T>Methodology</T></a><a aria-current={path==="/about"?"page":undefined} href="/about"><T>About</T></a><a href="/about/#contact"><T>Contact</T></a><a className="mobile-marketplace-link" href="/buying-requests"><T>Marketplace</T></a></nav><div className="header-actions"><B2bNavigation/><LanguageSelector/><a className="nav-cta" href="/buying-requests"><T>Marketplace</T></a></div></header>
}

function PeriodNote() { return <p className="period-note"><b><T>Trend basis:</T></b> <I18n text="{period}, the latest completed period." values={{period:market.latest_completed_period}}/> <b><T>Latest available:</T></b> <I18n text="{period}, partial/unconfirmed and excluded from trend calculations." values={{period:market.latest_available_period}}/></p> }
function confidenceExplanation(explanation, t) {
  if (!explanation.startsWith("No directional Market Signal is published.")) return t(explanation)
  return explanation.split(/(?<=\.) /).map(part => part.split("; ").map(segment => (t(segment) !== segment ? t(segment) : segment.endsWith(".") ? t(segment.slice(0,-1)) + "." : t(segment))).join("; ")).join(" ")
}
function Confidence({ result, label }) { const t=useT(); return <span className="confidence-wrap"><span className={`status confidence ${result.tone}`}>{t(label)}: {t(result.level)}</span><details className="confidence-details"><summary><T>Why this level?</T></summary><p>{confidenceExplanation(result.explanation,t)}</p></details></span> }
function Status({ crop }) { return <Confidence label="Market Signal" result={marketSignalConfidence(crop.market_status,crop.supply?.state,crop.weather?.status)}/> }

function CropCard({ crop }) {
  const t=useT()
  const species=speciesForCrop(crop); const tradeGroup=tradeEntityScope[String(crop.cn8)]?.granularity === "GROUP_LEVEL"; return <article className="crop-card"><div className="card-head"><h3><SpeciesName species={species} fallback={crop.crop}/>{tradeGroup&&<small style={{display:"block",fontSize:12,fontWeight:500}}><T>Trade group · includes multiple species</T></small>}</h3><Status crop={crop}/></div><div className="metrics"><div><small><T>Trade unit value</T></small><b>€{fmt.format(crop.price_eur_kg)}/kg</b><Trend value={crop.price_yoy_percent}/></div><div><small><T>Trade volume</T></small><b>{tonnes(crop.volume_kg)} t</b><Trend value={crop.volume_yoy_percent}/></div></div><div className="crop-sparkline" aria-label={`${crop.crop} ${t("Trade unit value history")}`}>{crop.history.slice(-12).map(point=><i key={point.period} style={{height:`${Math.max(10,Math.min(100,Number(point.price_eur_kg)/Math.max(...crop.history.slice(-12).map(x=>Number(x.price_eur_kg)))*100))}%`}}/>)}</div><div className="muted"><I18n text="Completed {period}" values={{period:crop.latest_completed_period}}/> · <Confidence label="Trade unit value evidence" result={priceConfidence(crop.quality_status)}/></div><a href={`/market/${crop.slug}`}><T>Explore market →</T></a></article>
}
const visualKind = slug => slug.includes("euroseeds") ? "valencia" : slug.includes("interpom") || slug.includes("potato") ? "potato" : slug.includes("lagrenas") ? "fields" : slug.includes("regulation") ? "regulation" : "research"
function geographyLabel(item) {
  if (typeof item.geography === "string") return item.geography
  if (item.geography?.region) return item.geography.region
  if (Array.isArray(item.geography?.countries) && item.geography.countries.length) return item.geography.countries.join(" · ")
  return item.slug.includes("euroseeds") ? "VALENCIA" : item.slug.includes("interpom") ? "BELGIUM" : item.slug.includes("lagrenas") ? "LITHUANIA" : "EUROPE"
}
function visualText(visual,language,field) {
  return visual?.localizations?.[String(language).toLowerCase()]?.[field] || visual?.[field] || ""
}
function PhotoCredit({visual,slug}) {
  const t=useT()
  if(visual?.kind !== "EDITORIAL_PHOTOGRAPH") return null
  const title=visual.title || newsPresentation.photo_titles[slug]
  return <div className="news-photo-attribution"><span>{t("Photo")}: <a href={visual.original_source_url} rel="noreferrer">{title || visual.creator}</a> — {visual.creator}</span><details><summary>{t("Photo credits")}</summary><p><a href={visual.licence_url} rel="license">{visual.licence}</a> · {t("Image adapted for display.")}</p><p>{t("Illustrative photograph; not evidence of the reported event.")}</p></details></div>
}
export function NewsReferences({story}) {
  const t=useT()
  const sources=story.sources || [{label:story.source_name,url:story.source_url}]
  return <section className="news-references"><h2>{t("Sources & References")}</h2><ul>{sources.map((source,index)=>{
    const ref=newsPresentation.sources[source.url] || {},title=source.title || ref.title,safeUrl=(()=>{try{const u=new URL(source.url);return u.protocol==="https:" && !u.username && !u.password ? source.url : null}catch{return null}})()
    return <li key={source.id || index}><span className="reference-organization">{source.label || ref.organization || ""}</span>{title && <> · {safeUrl ? <a href={safeUrl} rel="noreferrer">{title}</a> : <span>{title}</span>}</>}{safeUrl && !title && <> · <a href={safeUrl} rel="noreferrer">{safeUrl}</a></>}{ref.publication_date && <> · <time dateTime={ref.publication_date}>{ref.publication_date}</time></>}</li>
  })}</ul></section>
}
function EditorialVisual({ item, type, hero = false }) {
  const t=useT(),{language}=useLanguage()
  const visual=type === "news" ? newsVisuals[item.slug] : fixedEditorialVisuals[item.slug]
  const [failedSrc,setFailedSrc]=useState(null)
  if(visual?.classification === "PUBLIC_SAFE" && visual.src && failedSrc !== visual.src) return <img className={`news-editorial-image ${type === "insight" ? "context-image" : ""}`} src={visual.src} onError={()=>setFailedSrc(visual.src)} width={visual.width || 1000} height={visual.height || 560} loading={hero ? "eager" : "lazy"} decoding="async" alt={visual.alt ? `${visualText(visual,language,"alt")} — ${localizedContentText(item,language,type === "news" ? "headline" : "title")}` : `${t("Editorial illustration")}: ${localizedContentText(item,language,"headline")}`} style={{objectPosition:visual.object_position || "50% 50%",...(hero && type === "news" && Number.isFinite(visual.width) ? {maxWidth:`min(100%, ${visual.width}px)`} : {})}} data-visual-kind={visual.kind} data-news-photo-policy={visual.image_policy_version}/>
  if(type === "news") return <div className="news-photo-unavailable" role="img" aria-label={visualText(visual,language,"fallback") || t("Photograph unavailable")}>{visualText(visual,language,"fallback") || t("Photograph unavailable")}</div>
  return <div className={`editorial-visual ${visualKind(item.slug)}`} role="img" aria-label={t("{category} editorial visual",{category:t(item.category)})}><span><I18n text={item.category}/></span><b>{t(geographyLabel(item))}</b><i aria-hidden="true"/></div>
}
function GeographicLabel({ item, context = false }) {
  const labels={LV:"LATVIA",NL:"NETHERLANDS",ES:"SPAIN",DE:"GERMANY",BE:"BELGIUM",LT:"LITHUANIA"}
  const countries=item.countries || item.geography?.countries || []
  const label=context ? item.slug.includes("euroseeds") ? "VALENCIA / SPAIN" : item.slug.includes("interpom") ? "BELGIUM" : item.slug.includes("lagrenas") ? "LITHUANIA" : geographyLabel(item) : countries.length===1 ? labels[countries[0]] || countries[0] : countries.length>1 || geographyLabel(item).includes("Europe") ? "EU" : geographyLabel(item)
  return <span className="geographic-label" data-geography={label}>{label === "EU" ? <><span className="geography-standard">EU</span><span className="geography-mobile">EUROPE</span></> : label}</span>
}
function FixedEvidenceImage({ name }) {
  const visual=fixedEditorialVisuals[name]
  return <img className="fixed-evidence-image" src={visual.src} width={visual.width} height={visual.height} alt={visual.alt} loading="lazy" decoding="async" data-fixed-editorial="true"/>
}
function LinkedSpecies({ item }) { const linked=(item.links?.crops || []).map(name=>speciesMaster.species.find(species=>species.aliases.some(alias=>alias.toLowerCase()===String(name).toLowerCase()) || species.common_name_en.toLowerCase()===String(name).toLowerCase())).filter(Boolean); return linked.length ? <p className="linked-species">{[...new Map(linked.map(species=>[species.species_id,species])).values()].map((species,index)=><span key={species.species_id}>{index ? " · " : ""}<SpeciesName species={species}/></span>)}</p> : null }
const homepageInsightTitles={"ista-seed-priming-webinar-2026":"Seed Priming: Science, Testing & Practice","isf-world-seed-congress-toronto-2027":"World Seed Congress 2027 \u2014 Toronto","lagrenas-contract-seed-multiplication-lithuania":"Contract Seed Multiplication in Lithuania"}
function ArticleCard({ article, homepage=false }) { const {language}=useLanguage(),t=useT(),articleHref=languageHref(`/insights/${article.slug}`,language); return <article className="article-card">{article.editorial_status?<InsightVisual article={article}/>:<EditorialVisual item={article} type="insight"/>}<div className="editorial-card-body"><span className="category"><I18n text={article.category}/></span>{article.editorial_status?<InsightContext article={article}/>:<GeographicLabel item={article} context/>}<h3>{homepage?<a className="insight-title-link" href={articleHref}><BotanicalText>{homepageInsightTitles[article.slug]?t(homepageInsightTitles[article.slug]):localizedContentText(article,language,"title")}</BotanicalText></a>:<BotanicalText>{localizedContentText(article,language,"title")}</BotanicalText>}</h3><LinkedSpecies item={article}/><p className={homepage?"insight-card-summary":undefined}><BotanicalText>{localizedContentText(article,language,"summary")}</BotanicalText></p><small>{article.publication_date} · {article.author}</small><a href={homepage?articleHref:`/insights/${article.slug}`}><T>Read insight →</T></a></div></article> }
// Match the build snapshot during hydration; apply the actual date afterwards.
function useNewsDate() {
  const [date,setDate]=useState(()=>globalThis.__SEEDTRADE_NEWS_DATE__ || (typeof document!=='undefined'&&document.querySelector('meta[name=seedtrade-news-render-date]')?.content) || newsDate())
  useEffect(()=>{
    const update=()=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Vilnius",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()); const get=key=>parts.find(part=>part.type===key).value; setDate(`${get("year")}-${get("month")}-${get("day")}`)}
    update(); const timer=setInterval(update,60000); return ()=>clearInterval(timer)
  },[])
  return date
}
function DailyNewsHighlights() {
  const asOf=useNewsDate(),t=useT(),{language}=useLanguage()
  const highlights=selectHomepageNews(publicNews,asOf,newsSources)
  return <><nav className="news-stream-links" aria-label={t("News streams")}>{NEWS_STREAMS.map(stream=><a key={stream} href={languageHref(`/news?stream=${encodeURIComponent(stream)}`,language)}><I18n text={stream}/></a>)}</nav>{highlights.length===0&&<p className="news-empty" role="status">{t("No recently published, reviewed update is available. Browse earlier coverage below.")} <a href={languageHref('/news#news-archive',language)}>{t("Browse earlier coverage")}</a></p>}{highlights.length>0 && <div className="news-list">{highlights.map(({stream,item,archived})=><NewsCard compact key={stream} story={item} archived={archived} asOf={asOf}/>)}</div>}</>
}
function NewsGeography({story}) {const {language}=useLanguage(),t=useT(),codes=story.countries||story.geography?.countries||[];const names=new Intl.DisplayNames([language.toLowerCase()],{type:'region'});return <span className="geography">{codes.length?codes.map(code=>code==='EU'?t('Europe'):names.of(code)).join(', '):t('Europe')}</span>}
function NewsCard({ story, compact = false, expanded=false, archived=false, asOf=newsDate() }) {
  const t=useT(),{language}=useLanguage(),event=newsEvent(story)
  const articleHref=languageHref(`/news/${story.slug}`,language)
  const date=new Intl.DateTimeFormat({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language],{day:"numeric",month:"short",year:"numeric"}).format(new Date(story.publication_date+"T12:00:00Z"))
  return <article className={`news-card ${compact ? "compact" : ""}`}>
    <a className="news-image-link" href={articleHref} aria-label={t("Read {title}",{title:localizedContentText(story,language,"headline")})}><EditorialVisual item={story} type="news"/></a>
    <div className="news-card-body">
      <div><span className="category"><I18n text={newsStream(story) || story.category}/></span><NewsGeography story={story}/><time dateTime={story.publication_date}>{date}</time></div>
      {compact&&<p className="news-coverage-status"><span>{t(archived?'Earlier coverage':'Recent coverage')}</span>{event&&<span>{t(eventStatusLabel(eventStatus(story,asOf)))}</span>}</p>}
      <h3><a href={articleHref}>{story.format==="SHORT_NEWS_BRIEF"?localizedContentText(story,language,"headline"):<BotanicalText>{localizedContentText(story,language,"headline")}</BotanicalText>}</a></h3>
      {expanded&&<><p className="news-card-summary">{localizedContentText(story,language,"summary")}</p><p className="news-card-source">{t('Source')}: {story.source_name}</p>{event&&<p className="news-card-event">{event.start_date} &ndash; {event.end_date} &middot; {t(eventStatusLabel(eventStatus(story,globalThis.__SEEDTRADE_NEWS_DATE__||newsDate())))}</p>}</>}
      <a href={articleHref}><T>Read more →</T></a>
    </div>
  </article>
}

function SignalPanel() {
  return <aside className="signal-panel"><div className="signal-top"><div><p className="eyebrow"><T>Market Signal</T></p><span className="data-available"><I18n text="Historical official statistics · {period}" values={{period:tradePulse.latest_completed_period}}/></span><SourceFreshness/></div></div><div className="signal-crops signal-single"><TradePulseSignal/></div><small><T>Activity labels are evidence-gated descriptions of completed trade, not forecasts or trading advice. Individual species intelligence remains available in Market Intelligence.</T></small></aside>
}

function SourceFreshness() {
  // Never bake an expiring freshness assertion into static HTML. Evaluate in
  // the browser, and remove the badge at the source timestamp's seven-day limit.
  const [fresh,setFresh]=useState(false)
  useEffect(()=>{
    const update=()=>setFresh(verifiedFreshUpdate(tradePulse))
    update()
    const remaining=Date.parse(tradePulse.refresh?.source_updated_at)+7*86400000-Date.now()
    const timer=remaining>=0&&remaining<2147483647?window.setTimeout(update,remaining+1):null
    window.addEventListener('focus',update)
    return()=>{if(timer!==null)window.clearTimeout(timer);window.removeEventListener('focus',update)}
  },[])
  return fresh?<span className="source-fresh"><T>Source updated within 7 days</T></span>:null
}

function PulseRefreshEvidence() {
  const {language}=useLanguage(), t=useT()
  const locale={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language]
  const date=value=>{const d=new Date(value);return value&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(d):null}
  const fields=[['Last source check: {date}',tradePulse.refresh?.last_check_at],['Last validated refresh: {date}',tradePulse.refresh?.last_success_at],['Source update: {date}',tradePulse.refresh?.source_updated_at]]
  return <div className="pulse-refresh-evidence">{fields.map(([key,value])=><span key={key}>{date(value)?t(key,{date:date(value)}):t('No verified refresh recorded')}</span>)}</div>
}

const pulseViews=Object.values(tradePulse.views)
const categoryRows=tradePulse.customs_entity_rankings || []
const pulseCnLabels=new Map(pulseCnRows.map(([code,label])=>[code,`CN ${code} · ${label}`]))
const pulseCategoryKey=code=>pulseCnLabels.get(String(code).replace(/^CN[- ]?/,'')) || String(code)
const pulseScopeLabels={
  'EU Internal Trade':'EU reporting countries → EU partners; exporter dispatches only.',
  'EU Imports':'Non-EU partners → EU reporting countries.',
  'EU Exports':'EU reporting countries → non-EU partners.',
}
function usePulseFormat() { const {language}=useLanguage();return pulseFormat(language) }
function PulseChange({value,period}) {
  const t=useT(), f=usePulseFormat()
  return typeof value!=='number'||!Number.isFinite(value)?<span className="pulse-comparison-missing">{t('No comparable data')}</span>:<em className={`trend ${value>=0?'up':'down'}`} title={t('YoY: compared with {period}',{period:pulseComparisonPeriod(period)})}>{value>0?'▲ ':value<0?'▼ ':''}{f.percent(value)}</em>
}
function PulseRange({range}) {
  const t=useT(), f=usePulseFormat()
  return range?.status==='VERIFIED'?<>{f.unitValue(range.low.unit_value_eur_kg)}–{f.unitValue(range.high.unit_value_eur_kg)}/kg</>:<>{t('Range withheld · limited coverage')}</>
}
function TradePulseSignal() {
  const t=useT(), f=usePulseFormat(), primary=tradePulse.views.eu_internal_trade
  const history=completedHistory(primary), max=Math.max(1,...history.map(x=>x.volume_tonnes).filter(Number.isFinite))
  return <article className="trade-pulse-card">
    <div><h2><T>EU Seed Trade Pulse</T></h2><span className={`activity ${primary.trade_activity.state.toLowerCase()}`}><I18n text="{state} activity" values={{state:t(primary.trade_activity.state)}}/></span></div>
    <div className="pulse-views">{pulseViews.map(view=><div className="pulse-flow" key={view.label}><small className="pulse-flow-label"><I18n text={view.label}/></small><dl>
      <div><dt><T>Volume</T></dt><dd>{f.number(view.latest.volume_tonnes)} t</dd></div>
      <div><dt><T>Volume YoY</T></dt><dd><PulseChange value={view.latest.volume_yoy_percent} period={view.latest.period}/></dd></div>
      <div><dt><T>Trade value</T></dt><dd>{f.currency(view.latest.trade_value_eur)}</dd></div>
      <div><dt><T>Trade value YoY</T></dt><dd><PulseChange value={view.latest.value_yoy_percent} period={view.latest.period}/></dd></div>
      <div><dt><T>Unit value range</T></dt><dd><PulseRange range={view.unit_value_range}/></dd></div>
    </dl></div>)}</div>
    <div className="pulse-period-context"><strong><I18n text="One month · {period}" values={{period:tradePulse.latest_completed_period}}/></strong><span><I18n text="YoY: compared with {period}" values={{period:pulseComparisonPeriod(tradePulse.latest_completed_period)}}/></span><span>{completedRange.complete?<I18n text="Reporting window: {start} → {end}" values={{start:completedRange.start,end:completedRange.end}}/>:<T>Fewer than 12 completed months available</T>}</span><small><T>Monthly observations, not a rolling total.</T></small></div>
    <div className="mini-chart trade-pulse-chart" role="img" aria-label={t('EU internal seed trade rolling 12-month volume')}>{history.map(point=><i key={point.period} title={`${point.period}: ${point.volume_tonnes==null?t('Data unavailable'):f.number(point.volume_tonnes)+' t'}`} style={{height:`${pulseBarPercent(point.volume_tonnes,max)??0}%`}}/>)}</div>
    <PulseRefreshEvidence/>
    <small className="pulse-evidence-types"><T>Official trade statistics; unit values are derived EUR/kg indicators. Estimated market prices and actual seller offer prices are separate evidence types.</T></small>
    <small><I18n text="YoY compares the completed month with the same month one year earlier. {period} and later months are excluded from trends." values={{period:tradePulse.latest_available_partial_period}}/> {tradePulse.source}</small><a href="/trade-pulse"><T>Open full Trade Pulse →</T></a>
  </article>
}

function PulsePrimaryCard({view}) {
  const t=useT(), f=usePulseFormat(), context=pulseCardPeriod(view), selected=tradePulse.scope.included_cn_codes.length
  return <article data-reporting-period={context.period} data-comparison-period={context.comparison} data-aggregation={context.aggregation}>
    <h2><I18n text={view.label}/></h2>
    <p className="pulse-card-period"><I18n text="Reporting period: {period}" values={{period:`${f.month(context.period)} (${context.period})`}}/><span><T>Monthly totals</T></span></p>
    <p className="pulse-card-comparison"><I18n text="YoY: compared with {period}" values={{period:`${f.month(context.comparison)} (${context.comparison})`}}/></p>
    <p className="pulse-card-scope">{t(pulseScopeLabels[view.label])}</p>
    <span className="pulse-metric-label"><T>Monthly volume (t)</T></span><strong>{f.number(view.latest.volume_tonnes)} t</strong>
    <dl>
      <div><dt><T>Volume YoY</T></dt><dd><PulseChange value={view.latest.volume_yoy_percent} period={context.period}/></dd></div>
      <div><dt><T>Trade value (EUR)</T></dt><dd>{f.currency(view.latest.trade_value_eur)}</dd></div>
      <div><dt><T>Value YoY</T></dt><dd><PulseChange value={view.latest.value_yoy_percent} period={context.period}/></dd></div>
      <div><dt><T>Unit value range</T> · EUR/kg</dt><dd><PulseRange range={view.unit_value_range}/></dd></div>
    </dl>
    <p className="pulse-card-coverage"><I18n text="Observed CN categories: {observed} / {selected} selected" values={{observed:view.latest.cn_code_count,selected}}/></p>
    {view.unit_value_range.status==='VERIFIED'&&<p className="range-attribution"><I18n text="Range endpoints: {low} to {high}" values={{low:t(pulseCategoryKey(view.unit_value_range.low.slug)),high:t(pulseCategoryKey(view.unit_value_range.high.slug))}}/><br/><I18n text="Eligible categories for unit-value range: {count}" values={{count:view.unit_value_range.eligible_category_count}}/></p>}
    <small className="pulse-range-note"><T>CN-category averages · EUR/kg; not an offer price.</T></small>
  </article>
}

function PulseBars({metric,label}) {
  const t=useT(), f=usePulseFormat(), periods=completedHistory(tradePulse.views.eu_internal_trade).map(point=>point.period)
  const values=pulseViews.flatMap(view=>completedHistory(view).map(point=>point[metric])).filter(Number.isFinite)
  const axis=niceAxis(values), isValue=metric==='trade_value_eur', yoyKey=isValue?'value_yoy_percent':'volume_yoy_percent'
  const metricLabel=isValue?'Trade value (EUR)':'Volume (t)', changeLabel=isValue?'Value YoY (%)':'Volume YoY (%)'
  const exact=value=>typeof value==='number'&&Number.isFinite(value)?(isValue?f.currency(value):`${f.number(value)} t`):t('Data unavailable')
  const rows=periods.flatMap(period=>pulseViews.map(view=>({view,period,point:completedHistory(view).find(item=>item.period===period)})))
  return <div className="pulse-history" aria-label={t(label)}>
    <p className="pulse-chart-units"><I18n text="Y-axis: {unit}; X-axis: reporting month." values={{unit:isValue?'EUR':t('Volume (t)')}}/></p>
    <div className="pulse-legend">{pulseViews.map(view=><span key={view.label}><I18n text={view.label}/></span>)}</div>
    <div className="pulse-plot" aria-hidden="true"><div className="pulse-y-axis">{[...axis.ticks].reverse().map(value=><small key={value} data-tick={value} style={{top:`${(1-value/axis.maximum)*100}%`}}>{isValue?f.currency(value):`${f.number(value)} t`}</small>)}</div>
      <div className="pulse-months">{periods.map(period=><div className="pulse-month" key={period}><div className="pulse-cluster">{pulseViews.map(view=>{
        const point=completedHistory(view).find(item=>item.period===period), height=pulseBarPercent(point?.[metric],axis.maximum), comparison=pulseComparisonPeriod(period)
        const title=`${f.month(period)} (${period}) · ${t(view.label)} · ${exact(point?.[metric])} · ${t('YoY: compared with {period}',{period:comparison})} · ${point?.[yoyKey]==null?t('No comparable data'):f.percent(point[yoyKey])}`
        return height==null?<span key={view.label} className="pulse-chart-missing" title={title}>—</span>:<i key={view.label} title={title} data-period={period} data-value={point[metric]} style={{height:`${height}%`}}/>
      })}</div><time className="pulse-month-label" dateTime={period}>{f.month(period)}</time></div>)}</div>
    </div>
    <details className="pulse-chart-data"><summary><T>Chart data and comparisons</T></summary><table>
      <caption><I18n text="Reporting window: {start} → {end}" values={{start:periods[0],end:periods.at(-1)}}/> · <T>Monthly observations, not a rolling total.</T></caption>
      <thead><tr>{['Reporting month','Flow',metricLabel,'Comparison period',changeLabel].map(key=><th scope="col" key={key}>{t(key)}</th>)}</tr></thead>
      <tbody>{rows.map(({view,period,point})=><tr key={`${period}-${view.label}`}>
        <td data-label={t('Reporting month')}>{period}</td><td data-label={t('Flow')}>{t(view.label)}</td><td data-label={t(metricLabel)}>{exact(point?.[metric])}</td><td data-label={t('Comparison period')}>{pulseComparisonPeriod(period)}</td><td data-label={t(changeLabel)}>{point?.[yoyKey]==null?t('No comparable data'):f.percent(point[yoyKey])}</td>
      </tr>)}</tbody>
    </table></details>
  </div>
}

function PulsePeriodSummary() {
  return <div className="pulse-period-summary"><b><T>Monthly observations, not a rolling total.</T></b><span>{completedRange.complete?<I18n text="Reporting window: {start} → {end}" values={{start:completedRange.start,end:completedRange.end}}/>:<T>Fewer than 12 completed months available</T>}</span><small><T>Each bar is one month. YoY compares that month with the same month one year earlier.</T></small></div>
}
function PulseTableContext() {
  return <p className="section-note pulse-table-context"><I18n text="EU internal dispatches · {period}; YoY against {comparison}." values={{period:tradePulse.latest_completed_period,comparison:pulseComparisonPeriod(tradePulse.latest_completed_period)}}/> <T>Customs-category statistics; no allocation to individual species.</T></p>
}
function Ranking({title,rows,metric,scale='volume',scaleLabel='Volume (t)'}) {
  const t=useT(), max=Math.max(0,...rows.map(row=>Math.abs(row[scale])).filter(Number.isFinite)), period=tradePulse.latest_completed_period
  return <article className="pulse-ranking"><h3><I18n text={title}/></h3><p className="pulse-bar-context"><I18n text="Bars show {metric}, relative to the largest displayed magnitude." values={{metric:t(scaleLabel)}}/></p>
    {!rows.length?<p><T>No eligible categories.</T></p>:<ol className="pulse-ranking-list">{rows.map(row=><li key={row.crop.slug} data-cn={row.crop.slug} data-scale={scale}>
      <span><b>{t(pulseCategoryKey(row.crop.slug))}</b>{row.granularity==='GROUP_LEVEL'&&<small><T>Trade group</T></small>}<small><T>Volume YoY</T> <PulseChange value={row.volumeYoy} period={period}/></small><small><T>Value YoY</T> <PulseChange value={row.valueYoy} period={period}/></small></span>
      <i aria-hidden="true" style={{width:`${pulseBarPercent(row[scale],max)??0}%`}}/><strong>{metric(row)}</strong>
    </li>)}</ol>}
  </article>
}

function TradePulseDashboard() {
  const t=useT(), f=usePulseFormat(), period=tradePulse.latest_completed_period, comparison=pulseComparisonPeriod(period)
  const topVolume=[...categoryRows].sort((a,b)=>b.volume-a.volume).slice(0,5), topValue=[...categoryRows].sort((a,b)=>b.value-a.value).slice(0,5)
  const eligibleMovers=categoryRows.filter(row=>row.volume>=100&&row.volumeYoy!=null), up=eligibleMovers.filter(row=>row.volumeYoy>0).sort((a,b)=>b.volumeYoy-a.volumeYoy).slice(0,3), down=eligibleMovers.filter(row=>row.volumeYoy<0).sort((a,b)=>a.volumeYoy-b.volumeYoy).slice(0,3)
  const internal=tradePulse.views.eu_internal_trade.latest, imports=tradePulse.views.eu_imports.latest, exports=tradePulse.views.eu_exports.latest, peak=tradePulse.peak_activity
  const change=value=>value==null?t('No comparable data'):f.percent(value)
  const observations=[t('EU internal seed trade volume was {change} YoY in {period}.',{change:change(internal.volume_yoy_percent),period}),t('Extra-EU imports were {volume} YoY by volume and {value} by value.',{volume:change(imports.volume_yoy_percent),value:change(imports.value_yoy_percent)}),t('Extra-EU exports were {volume} YoY by volume and {value} by value.',{volume:change(exports.volume_yoy_percent),value:change(exports.value_yoy_percent)}),t('The extra-EU trade balance was {value} (exports minus imports).',{value:f.currency(tradePulse.extra_eu_balance.trade_value_eur)})]
  const contextMatch=tradePulse.market_context.text.match(/^Extra-EU seed trade recorded a EUR ([\d,]+) (deficit|surplus) in ([\d-]+)\. (.*)$/)
  const marketContextText=contextMatch?`${t('Extra-EU seed trade recorded a EUR {amount} {direction} in {period}.',{amount:f.number(Number(contextMatch[1].replaceAll(',',''))),direction:t(contextMatch[2]),period:contextMatch[3]})} ${t(contextMatch[4])}`:t(tradePulse.market_context.text)
  return <main className="trade-pulse-dashboard">
    <header className="pulse-dashboard-head"><div><p className="eyebrow">Eurostat COMEXT · DS-045409</p><h1><T>EU Seed Trade Pulse</T></h1><p><I18n text="Reporting period: {period}" values={{period:`${f.month(period)} (${period})`}}/></p><p><I18n text="EU reporting countries: {count}; country partners only." values={{count:tradePulse.country_coverage?.reporters.length??t('Data unavailable')}}/> <I18n text="Selected seed-for-sowing CN categories: {count}." values={{count:tradePulse.scope.included_cn_codes.length}}/></p></div><span className={`activity ${tradePulse.views.eu_internal_trade.trade_activity.state.toLowerCase()}`}><I18n text="{state} activity" values={{state:t(tradePulse.views.eu_internal_trade.trade_activity.state)}}/></span></header>
    <section className="pulse-kpis" aria-label={t('Monthly totals')}>{pulseViews.map(view=><PulsePrimaryCard key={view.label} view={view}/>)}</section>
    <section className="pulse-dashboard-section"><h2><T>Trade activity over time</T></h2><PulsePeriodSummary/>
      <div className="pulse-chart-grid"><article><h3><T>Monthly volume, tonnes</T></h3><PulseBars metric="volume_tonnes" label="Monthly seed trade volume by flow"/></article><article><h3><T>Monthly trade value, EUR</T></h3><PulseBars metric="trade_value_eur" label="Monthly seed trade value by flow"/></article></div>
      <div className="peak-activity"><b><T>Peak activity</T></b><span><I18n text="Peak month: {period}; comparison: {comparison}." values={{period:`${f.month(peak.period)} (${peak.period})`,comparison:pulseComparisonPeriod(peak.period)}}/></span><span>{f.number(peak.volume_tonnes)} t · <T>Volume YoY</T> <PulseChange value={peak.volume_yoy_percent} period={peak.period}/></span><small><T>Peak is the largest combined monthly volume across the three trade views, not a 12-month total.</T></small></div>
    </section>
    <section className="pulse-dashboard-section seasonality"><h2><T>Seasonality</T></h2><div className="evidence-note"><b><T>Evidence insufficient for a robust seasonality claim.</T></b><span><T>The verified Trade Pulse comparison contains 12 completed months. At least two comparable annual cycles are required before a seasonal pattern is published.</T></span></div></section>
    <section className="pulse-dashboard-section"><h2><T>Leading CN categories</T></h2><PulseTableContext/><div className="pulse-rank-grid"><Ranking title="By volume" rows={topVolume} metric={row=>`${f.number(row.volume)} t`}/><Ranking title="By trade value" rows={topValue} metric={row=>f.currency(row.value)} scale="value" scaleLabel="Trade value (EUR)"/></div></section>
    <section className="pulse-dashboard-section"><h2><T>CN categories: volume changes</T></h2><PulseTableContext/><p className="section-note"><T>Latest completed month versus the same month one year earlier; categories below 100 tonnes are excluded from movers.</T></p><div className="pulse-rank-grid"><Ranking title="Largest increases" rows={up} metric={row=>change(row.volumeYoy)} scale="volumeYoy" scaleLabel="Volume YoY (%)"/><Ranking title="Largest decreases" rows={down} metric={row=>change(row.volumeYoy)} scale="volumeYoy" scaleLabel="Volume YoY (%)"/></div><p className="section-note"><T>Trade-value YoY uses declared official values. Customs-group volume is not allocated to individual species.</T></p></section>
    <section className="pulse-dashboard-section pulse-cn-explanation"><h2><T>Understanding CN codes</T></h2><p><T>The Combined Nomenclature (CN) is the European Union's official system for classifying goods in international trade statistics. Each product category is identified by an eight-digit code.</T></p><p><I18n text="EU Seed Trade Pulse analyses {count} selected CN codes associated with seeds for sowing, using official Eurostat COMEXT data. These codes define which products are included in the reported trade volumes, values and trends." values={{count:tradePulse.scope.included_cn_codes.length}}/></p><p><T>CN classification identifies traded product categories but does not independently verify seed certification, variety or quality.</T></p></section>
    <section className="pulse-dashboard-section"><h2><T>Extra-EU trade balance</T></h2><p className="section-note"><I18n text="One month · {period}" values={{period}}/> · <T>Units: EUR; one month.</T></p><div className="balance-card"><div><small><T>Imports</T></small><b>{f.currency(imports.trade_value_eur)}</b></div><div><small><T>Exports</T></small><b>{f.currency(exports.trade_value_eur)}</b></div><div><small><T>Balance</T></small><b>{f.currency(tradePulse.extra_eu_balance.trade_value_eur)}</b></div></div><p><T>Balance = extra-EU exports − extra-EU imports.</T></p><div className="market-context-note"><b><T>Market context</T></b><span>{marketContextText}</span></div></section>
    <section className="pulse-dashboard-section"><h2><T>Market observations</T></h2><p className="section-note"><I18n text="Reporting month: {period}; comparison: {comparison}." values={{period,comparison}}/></p><ul className="observations">{observations.map(item=><li key={item}>{item}</li>)}</ul></section>
    <section className="pulse-method-compact"><h2><T>Methodology in brief</T></h2><PulseRefreshEvidence/><p><I18n text="{period} and later months have not passed this snapshot’s publication checks." values={{period:tradePulse.latest_available_partial_period}}/></p><p className="pulse-evidence-types"><T>Official trade statistics; unit values are derived EUR/kg indicators. Estimated market prices and actual seller offer prices are separate evidence types.</T></p><p><T>Observed coverage is not zero-filled: selected categories without eligible observations are not assumed to have zero trade.</T></p><p><T>Data:</T> {tradePulse.source}.</p><details className="pulse-chart-data pulse-quality-details"><summary><T>Data quality and coverage</T></summary><p><T>Range eligibility: species-specific CN categories with at least 100 t and two paired observations. Each average is declared trade value divided by net weight.</T></p><p><T>Comparisons are unavailable when the prior value is missing or zero, or reporter coverage differs.</T></p><p><I18n text="{count} accepted observations; missing or suppressed cells are not filled with zero." values={{count:f.number(tradePulse.accepted_observations)}}/></p></details><a href="/methodology"><T>Full methodology →</T></a></section>
    <AnalysisContinuation/>
    <MarketIntelligenceBackLink/>
  </main>
}

function Trend({value}) { if(value==null) return <em className="trend neutral"><T>n/a</T></em>; const up=Number(value)>=0; return <em className={`trend ${up?"up":"down"}`}>{up?"▲":"▼"} {pct(value)} <T>YoY</T></em> }

function HeroCoverageMetrics() {
  const t=useT(), {language}=useLanguage()
  const locale={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language]
  const summary=stage1Summary({pulse:tradePulse,species:cropMasterSummary,weather,listings:rfqs})
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:0})
  const money=new Intl.NumberFormat(locale,{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1})
  const volume=new Intl.NumberFormat(locale,{maximumFractionDigits:0})
  const value=(n,format=number)=>n==null?t('Data unavailable'):format.format(n)
  const metrics=[
    ['seed species',value(summary.species),'Identified seed species; analytical coverage varies by species.'],
    ['EU seed trade value',value(summary.tradeValue,money),'EU internal dispatches plus extra-EU imports and exports; same completed reporting month. Mirror internal imports are excluded.'],
    ['EU internal seed trade volume',summary.internalVolume==null?t('Data unavailable'):`${volume.format(summary.internalVolume)} t`,'Exporter-reported intra-EU dispatches, in tonnes; same reporting month as Trade Pulse.'],
    ['Active Marketplace offers',value(summary.offers),'Only genuine, seller-authorized, active, non-expired public offers are counted. Unverified and demonstration listings are excluded.'],
    ['Countries covered',value(summary.countries),'EU reporting countries with eligible seed-trade observations in the same completed month; not all trading partners.'],
    ['weather regions',value(summary.weatherRegions),'Supported weather regions; this is configuration coverage, not a count of current weather observations.'],
  ]
  return <div className="hero-coverage" aria-label={t("SeedTrade platform coverage")}>
    {metrics.map(([label,display,description],index)=><div key={label} title={`${t(description)}${index===1||index===2||index===4?` ${summary.period}`:''}`} aria-describedby={`stage1-metric-${index}`}><strong>{display}</strong><span>{t(label)}</span><p id={`stage1-metric-${index}`} className="stage1-visually-hidden">{t(description)}</p></div>)}
  </div>
}

function Home() {
  const t=useT(),{language}=useLanguage()
  const marketCarousel=useCarousel(catalogueSnapshot.length,2500,3,2)
  const productionCrop=market.crops.find(crop=>crop.slug==="red-clover") || market.crops[0], supplyCrop=market.crops.find(crop=>crop.slug==="perennial-ryegrass") || market.crops[0]
  return <>
    <section className="dashboard-hero">
      <div className="hero-intro">
        <div className="hero-copy">
          <p className="eyebrow"><T>European seed market intelligence</T></p>
          <h1><T>European seed market intelligence</T> <span><T>for better decisions.</T></span></h1>
          <p className="hero-body"><T>Trade data, supply evidence, representative prices, weather exposure and verified B2B opportunities in one professional platform.</T></p>
          <div className="hero-actions"><a className="btn primary" href="/market"><T>Explore market</T></a><a className="btn secondary" href="/buying-requests"><T>Buying requests</T></a></div>
        </div>
        <HeroCoverageMetrics/>
      </div>
      <SignalPanel/>
    </section>
    <main>
      <section className="top-news"><div className="section-head"><div><p className="eyebrow"><T>Top News</T></p><h2><T>What is changing now</T></h2></div><a href={languageHref('/news',language)}><T>Browse News</T><span aria-hidden="true"> →</span></a></div><DailyNewsHighlights/></section>
      <IntelligenceOverview/><PeriodNote/>
      <section className="market-snapshot" {...marketCarousel.handlers}><div className="section-head"><div><p className="eyebrow"><T>Current market numbers</T></p><h2><T>European Seed Market Snapshot</T></h2></div><a href="/market"><T>All categories →</T></a></div><SnapshotCardTrain cards={catalogueSnapshot} shown={circularSlice(catalogueSnapshot,marketCarousel.position,marketCarousel.visible)}/><div className="carousel-controls"><button className="carousel-pause" type="button" aria-pressed={marketCarousel.manualPaused} onClick={marketCarousel.togglePause}>{t(marketCarousel.manualPaused?"Resume rotation":"Pause rotation")}</button><button type="button" onClick={()=>marketCarousel.move(-1)} aria-label={t("Previous market category")}>←</button><button type="button" onClick={()=>marketCarousel.move(1)} aria-label={t("Next market category")}>→</button></div><p className="rotation-note"><T>Cards advance one position approximately every 2–3 seconds. This is display rotation only.</T></p></section>
      <HomepageEventStrip/><section id="research-insights" className="insights-teaser"><div className="section-head"><div><p className="eyebrow"><T>Research & Partner Insights / Events</T></p><h2><T>Context beyond the numbers</T></h2></div><a href="/insights"><T>View all →</T></a></div><div className="article-grid visual-insights">{featuredInsights(insights).map(a => <ArticleCard key={a.slug} article={a} homepage/>)}</div><PartnerAudience/><p className="muted"><T>Editorial content does not influence Market Signal or quantitative calculations.</T></p></section>
      <ActiveBuyingRequests/><NetworkInterest/>
    </main>
  </>
}

function IntelligenceOverview({ expanded = false }) {
  const t=useT()
  const internal=tradePulse.views.eu_internal_trade.latest
  return <section id="market-intelligence-sections" className={`intelligence-overview ${expanded?"expanded":""}`}><div className="section-head"><div><p className="eyebrow"><T>Market Intelligence</T></p><h2><T>Evidence for commercial seed decisions</T></h2></div>{!expanded&&<a href="/market"><T>Open intelligence →</T></a>}</div><p className="intelligence-journey"><T>Trade shows movement, weather highlights exposure, and production evidence anchors conditional supply and demand indications.</T></p>{expanded&&<p className="intelligence-journey"><T>One seed-market decision: inspect production, check weather exposure, compare trade, then explore conditional supply pressure.</T> <a href="#seed-supply-lab"><T>Choose a country and crop</T> →</a></p>}<div className="intelligence-grid intelligence-commercial">
    <article><div className="intelligence-topic-visual trade" role="img" aria-label={t("EU internal trade, imports and exports as distinct flows")}>
      <FixedEvidenceImage name="market"/>
      <span className="visual-tag"><T>EU · TRADE FLOWS</T></span><span className="visual-caption"><T>Internal · imports · exports</T></span>
    </div>{expanded&&<div className="intelligence-number"><b>{market.latest_completed_period}</b><span><T>latest completed trade period</T></span></div>}<p className="eyebrow"><T>EU Market Pulse</T></p><h3>{fmt.format(internal.volume_tonnes)} t <T>internal seed trade</T></h3><p><T>Official seed-for-sowing trade across 40 CN codes.</T> {tradePulse.latest_completed_period}.</p><a href="/trade-pulse"><T>Explore Trade Pulse →</T></a></article>
    <article><div className="intelligence-topic-visual weather" role="img" aria-label={t("European geographic context: {count} monitored regions in countries highlighted on the map; country shading does not mean nationwide monitoring",{count:weather.region_count})}>
      <FixedEvidenceImage name="weather"/>
      <span className="visual-tag"><T>EUROPE · WEATHER EXPOSURE</T></span><span className="visual-caption"><I18n text="{count} named regions · not nationwide coverage" values={{count:weather.region_count}}/></span>
    </div><p className="eyebrow"><T>Weather & Seed Risk</T></p><h3><T>Conditions worth monitoring</T></h3><p><T>Check weather at supported sampling locations and explore crop-stage exposure. Yield effects remain explicit scenarios.</T></p><a href="/weather-evidence"><T>View weather evidence →</T></a></article>
    <article><div className="intelligence-topic-visual production" role="img" aria-label={t("Seed multiplication fields and certification evidence shown separately from commodity crop area")}>
      <FixedEvidenceImage name="production"/>
      <span className="visual-tag"><T>SEED · PRODUCTION</T></span><span className="visual-caption"><T>Certified seed ≠ commodity area</T></span>
    </div><p className="eyebrow"><T>Seed Production</T></p><h3><T>Is supply tightening or expanding?</T></h3><p><T>Compare reported seed area, output and stocks. Explore supply pressure where comparable evidence supports a scenario.</T></p><a href="/production-intelligence"><T>View production evidence →</T></a></article>
  </div></section>
}

function NetworkInterest() {
  const t = useT()
  const [fields, setFields] = useState({ company: "", email: "", role: "", country: "", website: "" })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const update = event => { event.target.setCustomValidity(""); setFields(current => ({ ...current, [event.target.name]: event.target.value })) }
  const submit = async event => {
    event.preventDefault()
    if (submitting) return
    if (!fields.company.trim() || !fields.country.trim() || !["Buyer", "Seller", "Partner"].includes(fields.role) || !event.currentTarget.reportValidity()) {
      setFeedback({ success: false, message: "Please complete all four fields with valid details." })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/network-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
      const result = await response.json()
      if (!response.ok || result.message !== "Thank you. Your interest has been registered.") throw new Error("Unable to register your interest. Please try again later.")
      setFeedback({ success: true, message: result.message })
      setFields({ company: "", email: "", role: "", country: "", website: "" })
    } catch {
      setFeedback({ success: false, message: "Unable to register your interest. Please try again later." })
    } finally { setSubmitting(false) }
  }
  return <section className="network-interest"><div><p className="eyebrow"><T>European B2B seed network</T></p><h2><T>Join the European seed market network</T></h2><p><T>Register interest for future verified buyer/seller introductions.</T></p></div><form onSubmit={submit} onInvalid={event=>event.target.setCustomValidity(t(event.target.validity.typeMismatch ? "Please enter a valid business email address." : "Please complete this required field."))} aria-label={t("European B2B Seed Network registration")}>
    <label><T>Company name</T><input name="company" autoComplete="organization" required maxLength={120} value={fields.company} onChange={update}/></label>
    <label><T>Business email</T><input name="email" type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={update}/></label>
    <label><T>Role</T><select name="role" required value={fields.role} onChange={update}><option value=""><T>Select a role</T></option><option value="Buyer"><T>Buyer</T></option><option value="Seller"><T>Seller</T></option><option value="Partner"><T>Partner</T></option></select></label>
    <label><T>Country</T><input name="country" autoComplete="country-name" required maxLength={100} value={fields.country} onChange={update}/></label>
    <label className="network-honeypot" aria-hidden="true"><T>Website</T><input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={update}/></label>
    <button className="btn primary" type="submit" disabled={submitting}>{t(submitting ? "Sending…" : "Register interest")}</button>
    {feedback && <p className="network-feedback" role={feedback.success ? "status" : "alert"}>{t(feedback.message)}</p>}
  </form><small><T>We use your business details to respond to your network interest. See our</T> <a href="/privacy"><T>Privacy notice</T></a><T>. No account is created.</T></small></section>
}
export function activePublicRequests(items, now = new Date()) { return eligiblePublicListings({items}, now) }
const DEMO_REQUESTS=[{slug:"demo-winter-wheat",species_id:"winter-wheat",variety:null,listing_type:"BUY",quantity:500,unit:"t",certification_category:null,acceptable_origin:"Central Europe",destination:"Germany",delivery_period:null,status:"DEMO",publication_date:null,expires_at:null,classification:"DEMO_ONLY_NOT_REAL_DEMAND",label:"DEMO RFQ",demo:true},{slug:"demo-flax-seed",species_id:"flax",variety:null,listing_type:"BUY",quantity:300,unit:"t",certification_category:null,acceptable_origin:"EU",destination:"Benelux",delivery_period:null,status:"DEMO",publication_date:null,expires_at:null,classification:"DEMO_ONLY_NOT_REAL_DEMAND",label:"DEMO RFQ",demo:true},{slug:"demo-red-clover",species_id:"red-clover",variety:"RGT Savvor",listing_type:"BUY",quantity:120,unit:"t",certification_category:null,acceptable_origin:"EU",destination:"Northern Europe",delivery_period:null,status:"DEMO",publication_date:null,expires_at:null,classification:"DEMO_ONLY_NOT_REAL_DEMAND",label:"DEMO RFQ",demo:true},{slug:"demo-field-peas",species_id:"field-pea",variety:null,listing_type:"BUY",quantity:400,unit:"t",certification_category:null,acceptable_origin:"Baltics",destination:"Central Europe",delivery_period:null,status:"DEMO",publication_date:null,expires_at:null,classification:"DEMO_ONLY_NOT_REAL_DEMAND",label:"DEMO RFQ",demo:true}]
export function RequestCard({request}) { const {language}=useLanguage();return <MarketplaceListingCard request={request} species={listingSpecies(request)} detailHref={request.publicDetailHref} interestHref={request.demo?null:requestInterestLink(request,language)} interestLabel={publicMarketplaceCopy(language)[7]}/> }
function ActiveBuyingRequests() { const {language}=useLanguage();const t=useT();const live=usePublicListings(); const active = [...live.items.map(o=>publicCardRequest(o,language)),...activePublicRequests(rfqs.items)], display=active.length?active:DEMO_REQUESTS, carousel=useCarousel(display.length,2500,4); return <section className="active-requests" {...carousel.handlers}><div className="section-head"><div><p className="eyebrow"><T>B2B opportunity discovery</T></p><h2><T>Active Marketplace Listings</T></h2><a className="button outline" href={'/b2b/account?view=seller&lang='+language.toLowerCase()}><T>Post a Listing</T></a></div><a href="/buying-requests"><T>View all active listings →</T></a></div><div className="request-grid carousel-train">{circularSlice(display,carousel.position,carousel.visible).map(request=><RequestCard key={request.listing_id??request.slug??request.id} request={request}/>)}</div><div className="carousel-controls"><button className="carousel-pause" type="button" aria-pressed={carousel.manualPaused} onClick={carousel.togglePause}>{t(carousel.manualPaused?"Resume rotation":"Pause rotation")}</button><button type="button" onClick={()=>carousel.move(-1)} aria-label={t("Previous marketplace listing")}>←</button><button type="button" onClick={()=>carousel.move(1)} aria-label={t("Next marketplace listing")}>→</button></div><small><I18n text={active.length?"Only verified ACTIVE, PUBLIC_SAFE, unexpired real listings are shown.":"DEMO visualization only — these cards are not actual demand."}/> <T>Cards advance visually every 2–3 seconds; underlying listing data does not refresh every 2–3 seconds.</T></small></section> }
function BuyingRequests() { return <PublicMarketplace legacyListings={activePublicRequests(rfqs.items)}/> }
function BuyingRequestDetail({request}) {
  const t=useT(),{language}=useLanguage()
  if(!request||!activePublicRequests([request]).length)return <NotFound/>
  const view=listingTrading(request)
  return <main className="article marketplace-detail"><a href={'/buying-requests?lang='+language.toLowerCase()}>{t('Back to listings')}</a><h1>{t(view.direction==='OFFER'?'Offer for sale':'Buying request')} · {t(view.commonName || listingSpecies(request)?.common_name_en || 'Species')}</h1>
    <MarketplaceListingCard request={request} species={listingSpecies(request)}/>
    <QualitySpecifications parameters={request.qualityParameters} legacy={request} direction={view.direction} t={t}/>
    <aside className="notice"><T>Only approved discovery fields are public. Company identity, contacts and supporting documents remain private. SeedTrade is not a payment intermediary or contractual party.</T></aside>
    <a className="button" href={requestInterestLink(request,language)}>{publicMarketplaceCopy(language)[7]}</a><p>{publicMarketplaceCopy(language)[8]}</p>
  </main>
}

function Market() { const t=useT(); const [categorySelection,setCategorySelection]=useState(null); const [query,setQuery]=useState(""); const [tradeKind,setTradeKind]=useState("ALL"); const crops=market.crops.filter(crop=>searchSpecies(query,speciesForCrop(crop)) && (tradeKind==="ALL" || (tradeKind==="GROUP") === (tradeEntityScope[String(crop.cn8)]?.granularity === "GROUP_LEVEL"))); return <main><div className="page-head market-intelligence-head"><p className="eyebrow"><T>European Seed Market Intelligence</T></p><h1><T>What is moving, where and when?</T></h1><p><T>Use verified trade movement, supply evidence and crop exposure to identify commercially relevant changes. Evidence limits remain visible; unsupported conclusions stay withheld.</T></p></div><IntelligenceOverview expanded/>{MarketCategories&&<MarketCategories onSelection={setCategorySelection}/>}<div className="dashboard-search"><label htmlFor="market-search"><T>Explore verified seed categories</T></label><input id="market-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("Species, Latin botanical name or variety")}/><small><T>Search by common name or Latin botanical name. Representative trade unit values are not transaction quotes.</T></small></div><PeriodNote/><label><T>Evidence type</T><select value={tradeKind} onChange={event=>setTradeKind(event.target.value)}><option value="ALL">{t("All trade entities")}</option><option value="SPECIES">{t("Species")}</option><option value="GROUP">{t("Trade groups")}</option></select></label>{TradeCoverage&&<TradeCoverage categorySelection={categorySelection}/>}<div className="crop-grid">{crops.map(x => <CropCard key={x.slug} crop={x}/>)}</div>{!crops.length&&<div className="empty-state"><h2><T>No matching market category</T></h2><p><T>Search by common or Latin botanical species name. Variety-level records appear when verified data becomes available.</T></p></div>}</main> }

function CropPage({ crop }) { const t=useT(); if (!crop) return <NotFound/>; const ranking=commercialRankings[String(crop.cn8)]; if(ranking)crop={...crop,top_exporters:ranking.exporters.map(x=>({country:x.country,market_share_percent:x.share_percent})),corridors:ranking.corridors.map(x=>({exporter:x.exporter,importer:x.importer,volume_kg:x.volume_t*1000}))}; const species=speciesForCrop(crop), points = crop.history.slice(-18), max = Math.max(...points.map(x => Number(x.price_eur_kg))); return <main><div className="page-head"><a href="/market"><T>← Market dashboard</T></a><p className="eyebrow">{crop.classification} · CN {crop.cn8}</p><h1><SpeciesName species={species} fallback={crop.crop}/></h1><Status crop={crop}/></div><PeriodNote/><section className="snapshot metrics"><div><small><T>Trade unit value</T></small><b>€{fmt.format(crop.price_eur_kg)}/kg</b><em>{pct(crop.price_yoy_percent)} <T>YoY</T></em><Confidence label="Trade unit value evidence" result={priceConfidence(crop.quality_status)}/></div><div><small><T>Trade volume</T></small><b>{tonnes(crop.volume_kg)} t</b><em>{pct(crop.volume_yoy_percent)} <T>YoY</T></em></div><div><small><T>Supply evidence</T></small><b>{t(crop.supply.state === "INSUFFICIENT_EVIDENCE" ? "EU-wide direction unavailable" : crop.supply.state)}</b></div><div><small><T>Weather/phenology</T></small><b>{t(crop.weather.status === "EXPOSURE_ONLY_NO_VALIDATED_IMPACT" ? "Exposure only · impact unverified" : crop.weather.status || "Impact evidence unavailable")}</b></div></section><EvidenceHistory points={points} field="price_eur_kg" title="Trade unit value history — €/kg" unit="€/kg" price source={crop.source}/><section className="two-col"><div><h2><T>Leading exporters</T></h2>{ranking&&<p className="source"><T>EU internal trade volume — tonnes</T> · {ranking.period}</p>}<ol>{crop.top_exporters.slice().sort((a,b)=>Number(b.market_share_percent)-Number(a.market_share_percent)||a.country.localeCompare(b.country)).slice(0,5).map(x => <li key={x.country}>{x.country} <b>{fmt.format(x.market_share_percent)}%</b></li>)}</ol></div><div><h2><T>Major corridors</T></h2><ol>{crop.corridors.slice().sort((a,b)=>Number(b.volume_kg)-Number(a.volume_kg)).slice(0,5).map(x => <li key={`${x.exporter}-${x.importer}`}>{x.exporter} → {x.importer} <b>{tonnes(x.volume_kg)} t</b></li>)}</ol></div></section><section className="notice"><h2><T>What the evidence supports</T></h2><p><T>Trade observations and representative unit-value evidence are available. Supply and validated weather-impact evidence remain incomplete; no directional Market Signal is published.</T></p></section><div className="actions"><a className="button outline" href="/rfq"><T>RFQ — coming next</T></a><a className="button outline" href="/offer"><T>Offer — coming next</T></a></div></main> }
function Insights() { return <main><div className="page-head"><p className="eyebrow"><T>Editorial content · isolated from Market Signal</T></p><h1><T>Research & Partner Insights</T></h1><p><T>Industry events, research context and clearly disclosed partner perspectives for European seed professionals.</T></p></div><div className="article-grid insights-grid">{insights.articles.map(a => <ArticleCard key={a.slug} article={a}/>)}</div></main> }
function Article({ article }) { const {language}=useLanguage(); if(!article) return <NotFound/>; if(article.editorial_status)return <InsightArticle article={article}/>; return <main className="article editorial-page"><a href="/insights"><T>← All insights</T></a><EditorialVisual item={article} type="insight" hero/><GeographicLabel item={article} context/><span className="category"><I18n text={article.category}/></span><h1><BotanicalText>{localizedContentText(article,language,"title")}</BotanicalText></h1><LinkedSpecies item={article}/><p className="lead"><BotanicalText>{localizedContentText(article,language,"summary")}</BotanicalText></p><div className="article-meta"><span><T>Published</T> {article.publication_date}</span><span>{article.author}</span><span>{article.classification}</span></div>{article.partner_disclosure && <aside className="partner"><T>Partner Insight disclosure:</T> {localizedContentText(article,language,"partner_disclosure")}</aside>}{article.content.map((s,index) => <section key={s.heading}><h2><BotanicalText>{localizedContentText(article,language,`content.${index}.heading`)}</BotanicalText></h2><p><BotanicalText>{localizedContentText(article,language,`content.${index}.body`)}</BotanicalText></p></section>)}<section className="source-panel"><h2><T>Sources and provenance</T></h2><ul>{article.sources.map(s => <li key={s.url}><a href={s.url} rel="noreferrer">{s.label}</a> — {s.provenance_class}</li>)}</ul></section><aside className="notice"><T>This editorial content does not feed SeedTrade Market Signal, Price, Trade, Supply or Weather/Phenology calculations.</T></aside></main> }
function NewsArchive() {const asOf=useNewsDate(),t=useT();return <NewsPage items={publicNews} registry={newsSources} asOf={asOf} Card={NewsCard} cropLabel={value=>botanicalPlainName(value,t)}/>}
function NewsArticleFooter() {
  const t=useT(),{language}=useLanguage(),lang=language.toLowerCase()
  return <nav className="news-article-footer" aria-label={t("News article navigation")}>
    <a className="news-footer-market" href={`/market?lang=${lang}`}>{t("Explore Seed Market Intelligence")}</a>
    <a className="news-footer-all" href={`/news?lang=${lang}`}>{t("All News")}</a>
    <a className="news-footer-home" href={`/?lang=${lang}`}><span>{t("Back to Homepage")}</span><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M3 9h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
  </nav>
}
function NewsItem({ story }) {
  const t=useT(),{language}=useLanguage(),asOf=useNewsDate(),event=newsEvent(story)
  if(!story) return <NotFound/>
  const editorialLabel=({OFFICIAL_UPDATE:'Official update',RESEARCH_BRIEFING:'Research briefing',PRELIMINARY_RESEARCH:'Preliminary research',COMPANY_ANNOUNCEMENT:'Company announcement',EDITORIAL_ANALYSIS:'SEEDTRADE.EU editorial analysis'})[story.editorial_type] || 'Original reporting and analysis; source scope and limitations apply.'
  const related=[story.previous_item_id,...(story.related_item_ids || [])].filter(Boolean).map(id=>publicNews.find(item=>item.id===id)).filter(Boolean)
  return <main className="article editorial-page news-article"><a href="/news">&larr; {t("European Seed Market News")}</a><span className="category"><I18n text={newsStream(story) || story.category}/></span><h1>{story.format==="SHORT_NEWS_BRIEF"?localizedContentText(story,language,"headline"):<BotanicalText>{localizedContentText(story,language,"headline")}</BotanicalText>}</h1><LinkedSpecies item={story}/><div className="article-meta"><span><T>Published</T> {story.publication_date}</span><NewsGeography story={story}/></div><p className="news-editorial-type">{t(editorialLabel)}</p>{story.observation_period&&<p className="news-period"><T>Observation period</T>: {story.observation_period.start} – {story.observation_period.end}</p>}{event&&<div className="news-event"><p>{event.name} &middot; {event.start_date} &ndash; {event.end_date} &middot; {event.location} &middot; {t(eventStatusLabel(eventStatus(story,asOf)))}</p><p>{t("Organizer")}: {event.organizer} &middot; {t(event.sector_relevance)}</p></div>}<figure className="news-hero"><EditorialVisual item={story} type="news" hero/><figcaption><PhotoCredit visual={newsVisuals[story.slug]} slug={story.slug}/></figcaption></figure><p><a href={"/news?stream="+encodeURIComponent(newsStream(story))+"&lang="+language.toLowerCase()}>{t("Back to category")}</a></p>{story.updated_at>story.publication_date&&<p>{t("Updated")}: {story.updated_at}</p>}{story.corrections?.length>0&&<section><h2>{t("Corrections")}</h2>{story.corrections.map((c,i)=><p key={i}>{typeof c==="string"?c:c.summary}</p>)}</section>}{story.format!=="SHORT_NEWS_BRIEF"&&<><p className="lead"><BotanicalText>{localizedContentText(story,language,"summary")}</BotanicalText></p><section className="why-panel"><h2><T>Why it matters</T></h2><p><BotanicalText>{publicNewsText(story,language,"why_it_matters")}</BotanicalText></p></section></>}{(story.content || []).map((section,index)=><section key={section.id} className="news-section">{section.heading&&<h2><BotanicalText>{localizedContentText(story,language,`content.${index}.heading`)}</BotanicalText></h2>}<p>{story.format==="SHORT_NEWS_BRIEF"?localizedContentText(story,language,`content.${index}.body`):<BotanicalText>{localizedContentText(story,language,`content.${index}.body`)}</BotanicalText>}</p></section>)}{related.length>0&&<nav className="news-continuity" aria-label={t("Related assessments")}><h2><T>Related assessments</T></h2>{related.map(item=><a key={item.id} href={`/news/${item.slug}`}>{item.id===story.previous_item_id&&<><T>Previous assessment</T>: </>}<BotanicalText>{localizedContentText(item,language,"headline")}</BotanicalText></a>)}</nav>}<NewsReferences story={story}/><NewsArticleFooter/></main>
}
const legal = { "/privacy":["Privacy Policy (draft)","Personal data is processed only for stated platform purposes and subject to applicable data-protection rights. Non-essential analytics is disabled. REQUIRES_QUALIFIED_LEGAL_REVIEW."], "/terms":["Terms of Use (draft)","SeedTrade provides market intelligence and may facilitate introductions. It does not automatically become buyer, seller, payment intermediary or contractual party. REQUIRES_QUALIFIED_LEGAL_REVIEW."], "/confidentiality":["Commercial Confidentiality","Commercially sensitive listing details and verification documents remain private by default. Limited information may be disclosed when the user authorizes it, after a confirmed introduction where necessary, or where legally required."], "/disclaimer":["Market Intelligence Disclaimer","Representative trade unit values are derived indicators, not quotes or guarantees. Evidence gaps and partial periods are shown explicitly. REQUIRES_QUALIFIED_LEGAL_REVIEW."] }
function Methodology() { return <main className="article"><p className="eyebrow"><T>PUBLIC_SAFE methodology</T></p><h1><T>Data and Market Intelligence Methodology</T></h1><p className="lead"><I18n text="Official Eurostat COMEXT DS-045409 observations are validated, normalized and published only after the SeedTrade evidence gates pass. The latest completed period is {completed}; the available {partial} partial period is excluded from trends." values={{completed:tradePulse.latest_completed_period,partial:tradePulse.latest_available_partial_period}}/></p><section><h2><T>Crop Master and coverage</T></h2><p><T>The species count covers identified biological species, not customs groups. Analytical coverage varies; seed potatoes and vegetative material are separate.</T></p><p><a href="/data/crop-master-v1.json" download><T>Download Crop Master and coverage</T></a></p><p><a href="/data/species-coverage-v1.json" download><T>Download species data coverage audit</T></a></p></section><section><h2><T>EU Seed Trade Pulse definitions</T></h2><p><T>40 seed-for-sowing CN codes. Monthly gross intra-EU dispatches; customs precision varies. Group evidence is not allocated to species. Missing evidence is not zero; no interpolation.</T></p><p><b><T>EU Internal Trade:</T></b> <I18n text={tradePulse.views.eu_internal_trade.definition}/></p><p><b><T>EU Imports:</T></b> <I18n text={tradePulse.views.eu_imports.definition}/></p><p><b><T>EU Exports:</T></b> <I18n text={tradePulse.views.eu_exports.definition}/></p><p><b><T>Trade balance:</T></b> <I18n text={tradePulse.extra_eu_balance.definition}/></p></section><section><h2><T>Metrics and evidence</T></h2><p><T>Volume is verified net weight in tonnes. Trade value is the declared euro value.</T> <b><T>Unit value</T></b> <T>is aggregate trade value divided by aggregate net weight in EUR/kg. Unit value is trade value ÷ net weight, not a market price or transaction quote. YoY compares the completed month with the same month one year earlier.</T></p><p><b><T>Unit value range:</T></b> <I18n text={tradePulse.views.eu_internal_trade.unit_value_range.rule}/> <T>The range is a category-level trade indicator, not a market price.</T></p><p><T>Trade Activity is deterministic: HIGH when volume YoY is at least +15%, LOW when it is at most −15%, and NORMAL otherwise. At least 20 observations and six eligible CN codes are required in both months; otherwise no activity label is published. Activity is descriptive, not a forecast, recommendation or trading advice.</T></p></section><section><h2><T>Scope and publication gates</T></h2><p><I18n text={tradePulse.scope.rule}/> <T>EU internal trade uses exporter-reported dispatches only, preventing mirror import declarations from being counted a second time.</T></p><p><T>Representative species-level unit values retain the established outlier and low-volume controls. Marketplace context is shown only where one verified species mapping exists; ambiguous or unsupported categories fail closed.</T></p><p><T>Supply production/certification evidence remains separate from commodity crop area. Weather, supply, editorial content and Marketplace offers do not alter COMEXT calculations.</T></p></section><section className="source-panel"><h2><T>Source and provenance</T></h2><p>{tradePulse.source} · <T>normalized source SHA256</T> {tradePulse.source_artifact_sha256} · <I18n text="{count} eligible completed-period observations used." values={{count:tradePulse.accepted_observations.toLocaleString("en-GB")}}/></p></section></main> }
function AboutPage() { return <main className="about-page"><header className="about-hero"><p className="eyebrow"><T>About SeedTrade</T></p><h1><T>European seed market intelligence for better commercial decisions.</T></h1><p><T>SeedTrade.eu is an independent European seed-market intelligence and B2B marketplace platform. It brings fragmented trade, supply, crop and opportunity evidence into one clear professional context.</T></p><p><T>The objective is practical: understand what is moving, where activity is changing and what verified evidence may matter for supply, demand and commercial decisions.</T></p></header><section className="about-section"><div className="section-head"><div><p className="eyebrow"><T>Why SeedTrade</T></p><h2><T>From scattered evidence to commercial context</T></h2></div></div><div className="about-value-grid"><article><span>01</span><h3><T>See market movement</T></h3><p><T>Understand verified trade volumes, values and completed-period changes across European seed markets.</T></p></article><article><span>02</span><h3><T>Connect trade and supply</T></h3><p><T>Bring trade evidence, verified supply information and crop conditions into one professional view.</T></p></article><article><span>03</span><h3><T>Identify market timing</T></h3><p><T>Make periods of increasing or decreasing activity easier to identify without presenting forecasts as facts.</T></p></article><article><span>04</span><h3><T>Discover B2B opportunities</T></h3><p><T>Connect market intelligence with verified seed offers and future buying requests while sensitive details remain private.</T></p></article></div></section><section id="contact" className="contact-section" aria-labelledby="contact-heading"><div className="contact-copy"><p className="eyebrow"><T>General enquiries</T></p><h2 id="contact-heading"><T>Contact SeedTrade</T></h2><p><T>Questions about SeedTrade, market intelligence, partnerships or cooperation? Send us a message.</T></p><p className="contact-status" id="contact-status"><b><T>Contact form activation coming next.</T></b> <T>No information entered here is submitted or stored.</T></p><p className="contact-label"><T>General enquiries:</T></p><a className="contact-email" href="mailto:info@seedtrade.eu">info@seedtrade.eu</a></div><form className="contact-form" aria-describedby="contact-status" onSubmit={event=>event.preventDefault()}><div className="contact-field"><label htmlFor="contact-name"><T>Name</T> <span aria-hidden="true">*</span></label><input id="contact-name" name="name" autoComplete="name" disabled required/></div><div className="contact-field"><label htmlFor="contact-email-field"><T>Business email</T> <span aria-hidden="true">*</span></label><input id="contact-email-field" name="email" type="email" autoComplete="email" disabled required/></div><div className="contact-field"><label htmlFor="contact-company"><T>Company</T> <span aria-hidden="true">*</span></label><input id="contact-company" name="company" autoComplete="organization" disabled required/></div><div className="contact-field"><label htmlFor="contact-subject"><T>Subject</T> <span aria-hidden="true">*</span></label><select id="contact-subject" name="subject" disabled required defaultValue=""><option value="" disabled><T>Select a subject</T></option><option value="Market Intelligence"><T>Market Intelligence</T></option><option value="Data & Methodology"><T>Data &amp; Methodology</T></option><option value="Partnership"><T>Partnership</T></option><option value="Media & General Enquiry"><T>Media &amp; General Enquiry</T></option><option value="Other"><T>Other</T></option></select></div><div className="contact-field contact-field-wide"><label htmlFor="contact-message"><T>Message</T> <span aria-hidden="true">*</span></label><textarea id="contact-message" name="message" rows="5" disabled required/></div><button type="submit" disabled><T>Send message</T></button></form></section></main> }
function InfoPage({ path }) { const t=useT(); if(path==='/terms'||path==='/privacy')return <LegalPage kind={path.slice(1)}/>; const [title,body] = legal[path]; return <main className="article"><h1>{t(title)}</h1><p className="lead">{t(body)}</p></main> }
function PrivateFeature({ kind }) { const t=useT(); return <main className="article"><p className="eyebrow"><T>Private marketplace · disabled at public MVP</T></p><h1>{t(kind === "RFQ" ? "Request seed" : "Offer seed")}</h1><p className="lead"><T>This workflow is built for controlled testing but is not activated for public submission until production authentication and managed private persistence are approved.</T></p><aside className="partner"><T>Company identity, direct contacts, commercial terms and supporting documents remain private by default. They may be disclosed with authorization, where necessary after a confirmed introduction, or where legally required. GDPR and commercial confidentiality are separate controls.</T></aside><button disabled><T>Submission unavailable in public MVP</T></button></main> }
function Consent() { return null }
function NotFound(){return <main><h1><T>Page not found</T></h1><a href="/"><T>Return home</T></a></main>}

function Footer() { return <footer><Logo footer/><div><b><T>Platform</T></b><a href="/market"><T>Intelligence</T></a><a href="/news"><T>News</T></a><a href="/insights"><T>Research</T></a><a href="/insights"><T>Partner Insights</T></a></div><div><b>SeedTrade</b><a href="/about"><T>About</T></a><a href="/privacy"><T>Privacy</T></a><a href="/terms"><T>Terms</T></a><a href="/confidentiality"><T>Confidentiality</T></a><B2bLanguageNotice/></div><div><b><T>Marketplace</T></b><a href="/buying-requests"><T>Buying Requests</T></a><a href="/rfq"><T>RFQ — coming next</T></a><a href="/about/#contact"><T>Contact</T></a><span><T>© 2026 SeedTrade.eu · European Seed Market Intelligence</T></span></div></footer> }

function LocalizedApp() { const path = window.location.pathname.replace(/\/$/,"") || "/"; useMetadata(path); useHashNavigation(path); useEffect(() => { loadGTM(); track(path === "/" ? "homepage_view" : path === "/market" ? "market_view" : path === "/trade-pulse" ? "trade_pulse_view" : path.startsWith("/market/") ? "crop_view" : path === "/news" ? "news_archive_view" : path.startsWith("/news/") ? "news_item_view" : path === "/methodology" ? "methodology_view" : "page_view", { page_path:path }) }, [path]); const content = useMemo(() => { if(path === "/") return <Home/>; if(catalogueModule?.cataloguePath(path)) return <MarketCatalogue path={path}/>; if(path === "/trade-pulse") return <TradePulseDashboard/>; if(path === "/weather-evidence") return <WeatherEvidence/>; if(path === "/production-intelligence") return <ProductionIntelligence/>; if(path === "/events") return <EventsCalendar/>; if(path === "/news") return <NewsArchive/>; if(path === "/insights") return <Insights/>; if(path === "/buying-requests") return <BuyingRequests/>; if(path.startsWith("/buying-requests/")) return <BuyingRequestDetail request={rfqs.items.find(x=>`/buying-requests/${x.slug}`===path)}/>; if(path.startsWith("/market/")) return <CropPage crop={market.crops.find(x=>`/market/${x.slug}`===path)}/>; if(path.startsWith("/news/")) return <NewsItem story={publicNews.find(x=>`/news/${x.slug}`===path)}/>; if(path.startsWith("/insights/")) return <Article article={insights.articles.find(x=>`/insights/${x.slug}`===path)}/>; if(path === "/rfq") return <PrivateFeature kind="RFQ"/>; if(path === "/offer") return <PrivateFeature kind="OFFER"/>; if(path === "/methodology") return <Methodology/>; if(path === "/about") return <AboutPage/>; if(Object.keys(legal).includes(path)) return <InfoPage path={path}/>; return <NotFound/> },[path]); return <><a className="skip-link" href="#main-content" onClick={()=>document.getElementById("main-content")?.focus()}><T>Skip to main content</T></a><Header/><div id="main-content" tabIndex={-1}>{content}</div><Footer/><Consent/></> }

export default function AppV2({ initialLanguage = "EN" }) { return <LanguageProvider initialLanguage={initialLanguage}><LocalizedApp/></LanguageProvider> }
