// Recovered Package 1 generator, constrained to verified built canonical routes.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const knownAliases=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root,'src/generated/market_catalogue_routes.json'))).filter(row=>row.alias_of).map(row=>[row.path,row.alias_of]))
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]))
export function sitemapInventory(directory,{aliases=knownAliases}={}) {
 const pages=[]
 function visit(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name)
   if(entry.isSymbolicLink())throw new Error('Symlink in built routes')
   if(entry.isDirectory())visit(file)
   else if(entry.name==='index.html'){
    const html=fs.readFileSync(file,'utf8'),head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]
    if(!head)throw new Error('Missing head metadata')
    const tags=[...head.matchAll(/<(meta|link)\b[^>]*>/gi)].map(m=>({tag:m[1].toLowerCase(),attrs:attributes(m[0])}))
    const robots=tags.filter(t=>t.tag==='meta'&&t.attrs.name?.toLowerCase()==='robots'),canonical=tags.filter(t=>t.tag==='link'&&t.attrs.rel?.toLowerCase()==='canonical')
    if(robots.length!==1||canonical.length!==1)throw new Error('Missing or duplicate canonical/robots metadata')
    const directives=robots[0].attrs.content?.toLowerCase().split(/[\s,]+/).filter(Boolean)
    if(!directives?.length)throw new Error('Missing robots content')
    if(directives.includes('none')||directives.includes('noindex')){pages.push({file:path.relative(directory,file),indexable:false,reason:'NOINDEX'});continue}
    if(!directives.includes('index'))throw new Error('Ambiguous indexability')
    const raw=canonical[0].attrs.href,url=new URL(raw)
    if(url.origin!=='https://seedtrade.eu'||url.username||url.password||url.search||url.hash||url.href!==raw||!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(url.pathname))throw new Error('Unsafe canonical')
    const relative=path.relative(directory,path.dirname(file)).split(path.sep).join('/'),route=relative?'/'+relative:'/'
    if(/^\/(?:rfq|offer|account|admin|auth|api|diagnostics)(?:\/|$)/.test(route))throw new Error('Private route marked indexable')
    if(url.pathname!==route&&url.pathname!==aliases[route])throw new Error('Unverified canonical target')
    pages.push({file:path.relative(directory,file),route,canonical:raw,indexable:true,eligible:!Object.hasOwn(aliases,route),reason:Object.hasOwn(aliases,route)?'KNOWN_LEGACY_DUPLICATE':'CANONICAL_PUBLIC'})
   }
  }
 }
 visit(directory)
 for(const p of pages.filter(p=>p.indexable&&!p.eligible)){
  const target=pages.find(q=>q.route===aliases[p.route]&&q.indexable&&q.eligible)
  if(!target||target.canonical!=='https://seedtrade.eu'+target.route)throw new Error('Missing eligible legacy target')
 }
 const eligible=pages.filter(p=>p.eligible),urls=eligible.map(p=>p.canonical).sort()
 if(new Set(urls).size!==urls.length)throw new Error('Duplicate eligible canonical')
 if(!urls.includes('https://seedtrade.eu/'))throw new Error('Missing homepage')
 return {urls,pages}
}
export const sitemapUrls=(directory,options)=>sitemapInventory(directory,options).urls
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const urls=sitemapUrls(path.join(root,'dist'))
 // No invented lastmod or hreflang for the unchanged localStorage language UI.
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+url+'</loc></url>').join('\n')+'\n</urlset>\n'
 fs.writeFileSync(path.join(root,'dist/sitemap.xml'),xml)
 if(process.argv.includes('--sync-public'))fs.writeFileSync(path.join(root,'public/sitemap.xml'),xml)
 console.log('Sitemap: '+urls.length+' verified nonduplicate public canonical URLs')
}
