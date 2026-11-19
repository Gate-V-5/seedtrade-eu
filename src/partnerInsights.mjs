import {track} from './legal/analyticsPolicy.mjs'

export function featuredInsights(data){
  return (data.featured_slugs || data.articles.slice(0,3).map(a=>a.slug))
    .map(slug=>data.articles.find(a=>a.slug===slug)).filter(Boolean)
}

// LIVE is deliberately not inferred from the presence of a number or tag ID.
// A later authorised integration must supply verified, definition-bound sources.
export function audienceMetrics(config){
  const keys=['businessMembers','activeUsers30Days','activeUsers30Minutes']
  if(config.mode==='DEMO')return {mode:'DEMO',values:config.demo}
  if(config.mode!=='LIVE')throw Error('INVALID_AUDIENCE_MODE')
  const live=config.live
  if(!live || live.verified!==true || !keys.every(k=>Number.isSafeInteger(live.values?.[k])&&live.values[k]>=0&&live.sources?.[k]?.url&&live.sources[k].definition&&/^\d{4}-\d{2}-\d{2}T/.test(live.sources[k].observedAt)))return null
  return {mode:'LIVE',values:live.values,sources:live.sources}
}

const allowedEvents=new Set(['article_view','external_website_click','registration_cta_click','partner_contact_click'])
export function insightEvent(name,article,language,destination='',send=track){
  if(!allowedEvents.has(name)||!article?.slug||!['en','de','fr','es','it'].includes(language.toLowerCase()))return false
  // No email addresses, link queries, tokens, raw referrers or UTM values.
  let target=''
  try{target=new URL(destination).protocol==='mailto:'?'email':new URL(destination).hostname}catch{}
  return send(name,{article_slug:article.slug,content_category:article.category,language:language.toLowerCase(),target})
}

export function insightEventSchema(article,visual){
  if(!article.event)return null
  const e=article.event
  return {'@context':'https://schema.org','@type':'Event',name:article.title,
    description:article.summary,startDate:e.startDate,endDate:e.endDate,
    eventAttendanceMode:'https://schema.org/'+e.attendanceMode,
    location:e.attendanceMode==='OnlineEventAttendanceMode'
      ? {'@type':'VirtualLocation',url:article.sources[0].url}
      : {'@type':'Place',name:e.location,address:{'@type':'PostalAddress',addressLocality:'Toronto',addressCountry:'CA'}},
    organizer:{'@type':'Organization',name:e.organizer,url:e.organizerUrl},
    ...(visual?.src?{image:'https://seedtrade.eu'+visual.src}:{}),
    ...(e.isAccessibleForFree===true?{isAccessibleForFree:true}:{}),
    url:article.seo.canonical}
}
