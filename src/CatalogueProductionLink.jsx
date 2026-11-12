import {useT} from './i18n/index.jsx'
import {catalogueProductionLink} from './catalogueProduction.mjs'

export default function CatalogueProductionLink({card,search=''}){
  const t=useT(),link=catalogueProductionLink(card.market_entity_id,search)
  if(!link.href)return link.scope==='RELATED_ONLY'?<p className="catalogue-note">{t('Only broader taxon evidence is available; not specific to this commercial form.')}</p>:null
  return <a className="catalogue-production-link" href={link.href}>{t(link.scope==='GROUP'?'Production evidence — hybrid group, not an individual species':'Production evidence')}<span className="sr-only">: {t(card.common_name_en)}</span></a>
}
