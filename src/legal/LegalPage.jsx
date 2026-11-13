import React from 'react';
import {useT} from '../i18n/index.jsx';
import registry from './registry.json';

// All text is rendered as text nodes. Legal Markdown cannot inject executable HTML.
function Text({text}) {
  return text.split(/\n\s*\n/).map((block,index)=>{
    if(block.trim().startsWith('|')) {
      const rows=block.trim().split('\n').filter(row=>!/^\|[\s:|\-]+\|$/.test(row))
        .map(row=>row.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
      return <table key={index}><thead><tr>{rows[0].map((cell,i)=><th key={i}>{cell}</th>)}</tr></thead>
        <tbody>{rows.slice(1).map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
    }
    return <p key={index} style={{whiteSpace:'pre-wrap'}}>{block.replace(/\*\*/g,'')}</p>;
  });
}
export default function LegalPage({kind}) {
  const t=useT(); const locale='en';
  const snapshot=registry.documents[kind];
  if(!snapshot)return null;
  const doc=snapshot.document;
  const anchors=kind==='terms'?['operator','eligibility','approval','listing-rules','licence','communications','reports','suspension','termination','law','versions']:
    ['controller','scope','legal-bases','recipients','processors','retention','cookies','rights','updates'];
  return <main className="article">
    <h1 lang="en">{kind==='terms'?'B2B Terms':'Privacy Notice'}</h1>
    {registry.approval.status!=='APPROVED'&&<p role="note"><strong>{t('Local review draft. Not approved for publication or public acceptance.')}</strong></p>}
    <p>{t('Legal documents are provided in English.')}</p>
    <article lang={locale}>{doc.translations[locale].map((section,i)=><section key={section.heading} id={anchors[i]}>
      {kind==='terms'&&i===3&&<span id="enquiries"/>}
      <h2>{section.heading}</h2><Text text={section.text}/>
    </section>)}</article>
    <p><a href={snapshot.path}>{t('Save or print the English version')}</a> &#183; <a href={`/legal/snapshots/${snapshot.id}.json`} download>{t('Download exact source')}</a></p>
    <details><summary>{t('Document details')}</summary><p>{doc.version}</p><p>SHA-256: <code>{snapshot.id}</code></p></details>
    <p><a href="/legal/report/">{t('Contacts and content reports')}</a></p>
  </main>;
}
