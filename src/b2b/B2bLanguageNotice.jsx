import React from 'react';
import {useT} from '../i18n/index.jsx';
import registry from '../legal/registry.json';
// Discreet identification; the approved English controller wording stays exact.
export default function B2bLanguageNotice(){
  const t=useT();
  return <details className="seedtrade-legal-information">
    <summary>{t('Legal information')}</summary>
    <div lang="en">{registry.documents.privacy.document.sections[0].text.split(/\n\s*\n/).map((text,index)=><p key={index}>{text}</p>)}</div>
    <a href="/legal/report/">{t('Contacts and content reports')}</a>
  </details>;
}
