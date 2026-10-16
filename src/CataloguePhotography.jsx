import {useState} from 'react'
import {useT} from './i18n/index.jsx'
import registry from './data/catalogue_photographs.json'
import {catalogueImageProps} from './catalogueImages.mjs'
export function CataloguePhoto({category,lazy=false}) {
 const [failed,setFailed]=useState(false)
 const t=useT(),photo=registry.items.find(item=>item.original===category.image)
 const props=catalogueImageProps(category.image,registry,{hero:!lazy})
 if(failed||!photo||!props.srcSet)return <div className="catalogue-photo-placeholder" role="img" aria-label={t('Category photograph unavailable')}/>
 return <img {...props} alt={t(photo.alt)} width="1200" height="675" loading={lazy?'lazy':undefined} decoding="async" onError={()=>setFailed(true)}/>
}
export function CataloguePhotoCredits({category}) {
 const t=useT(),items=category?registry.items.filter(item=>item.original===category.image):registry.items
 return <section className="catalogue-photo-credits" aria-label={t('Catalogue photo credits')}><details><summary>{t('Catalogue photo credits')}</summary><p>{t('Illustrative crop photographs, not evidence of current conditions or every species in a category.')}</p><ul>{items.map(photo=><li key={photo.slug}><a href={photo.source_page}>{photo.file_title}</a> — {photo.author} · <a href={photo.license_url}>{photo.license}</a> · {t('Cropped to 16:9, resized and converted to WebP.')} {photo.license==='CC BY-SA 3.0'&&<span>{t('Image derivatives retain the same license.')}</span>}</li>)}</ul></details></section>
}
