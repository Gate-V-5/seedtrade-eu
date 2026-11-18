import {useT} from './i18n/index.jsx'
export const snapshotPriceLabels={EN:'INDICATIVE SEED MARKET PRICE',DE:'INDIKATIVER SAATGUTMARKTPREIS',FR:'PRIX INDICATIF DU MARCHÉ DES SEMENCES',ES:'PRECIO INDICATIVO DEL MERCADO DE SEMILLAS',IT:'PREZZO INDICATIVO DI MERCATO DELLE SEMENTI'}
export default function SnapshotPriceGuide(){const t=useT();return <details className="snapshot-price-guide"><summary>{t('About indicative prices')}</summary><p>{t('Indicative seed assessments are non-binding. Historical estimates and customs trade indicators are labelled separately.')}</p></details>}
