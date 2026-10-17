import {useState} from 'react'
import {useT} from './i18n/index.jsx'
import registry from './data/catalogue_gate_visuals.json'
import {catalogueImageProps} from './catalogueImages.mjs'
export function CataloguePhoto({category,lazy=false}) {
 const [failed,setFailed]=useState(false)
 const t=useT(),photo=registry.items.find(item=>item.original===category.image)
 const props=catalogueImageProps(category.image,registry,{hero:!lazy})
 if(failed||!photo||!props.srcSet)return <div className="catalogue-photo-placeholder" role="img" aria-label={t('Category visual unavailable')}/>
 return <img {...props} alt={`${t('Original GATE AI illustration')} — ${t(category.title)}`} width="1200" height={photo.variants.find(v=>v.width===1200).height} data-visual-group="EUROPEAN_SEED_MARKET" data-visual-kind="GATE_OWNER_AI_VISUAL" loading={lazy?'lazy':undefined} decoding="async" onError={()=>setFailed(true)}/>
}
export function CataloguePhotoCredits({category}) {
 const t=useT(),items=category?registry.items.filter(item=>item.original===category.image):registry.items
 return <section className="catalogue-photo-credits" aria-label={t('Catalogue visual provenance')}><details><summary>{t('Catalogue visual provenance')}</summary><p>{t('Original GATE-created AI illustrations; illustrative category visuals, not documentary evidence.')}</p><ul>{items.map(item=><li key={item.slug}>{t(item.category_title)} — GATE · {t('Owner-approved restoration; resized and converted to WebP without cropping. No public reuse license is asserted.')}</li>)}</ul></details></section>
}
