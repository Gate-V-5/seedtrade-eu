import React from 'react';
import {useT} from '../i18n/index.jsx';
export default function B2bLanguageNotice(){
  const t=useT();
  return <aside style={{maxWidth:600,margin:'1rem auto',padding:'0 2rem',fontSize:14}}>
    <p>{t('The legal documents are provided in English. Your interface language does not change the accepted legal version.')}</p>
    <p>{t('A necessary session cookie keeps you signed in. Non-essential analytics is disabled.')} <a href="/privacy">{t('Privacy Notice')}</a> · {t('English legal text')}</p>
  </aside>;
}
