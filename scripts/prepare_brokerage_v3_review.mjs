// Local deterministic publication inputs only. No network, DB, email or activation.
import {mkdir,writeFile} from 'node:fs/promises';
import {simpleTerms} from '../shared/simpleBrokerageTerms.mjs';
import {digest} from '../server/b2b/legalAcceptance.mjs';
const root=new URL('../',import.meta.url);
const hash=digest(simpleTerms);
const approval={
  version:simpleTerms.version,canonicalSha256:hash,status:'OWNER_APPROVED_NOT_PUBLISHED',
  approvalReference:'Owner conversation 2026-11-20: Approve V3, including 14 days and publication-date effect',
  approvedEnglishSource:'Owner-supplied full Draft V3 in the same conversation',
  approvedPresentationalChanges:['Remove Draft V3 — For Owner Review label','The proposed payment term is → The payment term is','Effective date: To be confirmed upon publication. → Effective date: the actual date of publication of these terms.'],
  translations:['EN','DE','FR','ES','IT'],englishPrevails:true,
  effectiveDate:null,effectiveDateRule:'Actual first production publication date; record it in the authorized release receipt. No publication has occurred.',
  deploymentAuthorized:false,productionActivationAuthorized:false,
  historicalV2Review:'docs/stage6-simplified-v1/brokerage-terms-review.json',
  privacyCompletionStillRequired:true
};
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const content=Object.entries(simpleTerms.translations).map(([language,paragraphs])=>`<section id="${language.toLowerCase()}" lang="${language.toLowerCase()}"><h1>${escape(paragraphs[0])}</h1>${paragraphs.slice(1).map(p=>/^\d+\. /.test(p)?`<h2>${escape(p)}</h2>`:`<p>${escape(p)}</p>`).join('')}</section>`).join('');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEEDTRADE.EU — Brokerage and Success Fee Terms</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:960px;margin:40px auto;padding:0 24px;color:#142e27}code{overflow-wrap:anywhere}section{margin:40px 0}section+section{border-top:1px solid #ccd8d1;padding-top:40px}@media print{body{margin:0}}</style><nav aria-label="Language"><a href="#en">EN</a> · <a href="#de">DE</a> · <a href="#fr">FR</a> · <a href="#es">ES</a> · <a href="#it">IT</a></nav><p>${escape(simpleTerms.version)} · SHA-256: <code>${hash}</code></p>${content}</html>\n`;
for(const relative of ['public/legal/brokerage/','docs/stage6-terms-v3/'])await mkdir(new URL(relative,root),{recursive:true});
await writeFile(new URL('public/legal/brokerage/v3.html',root),html);
await writeFile(new URL('public/legal/brokerage/v3.json',root),JSON.stringify({version:simpleTerms.version,canonicalSha256:hash,terms:simpleTerms},null,2)+'\n');
await writeFile(new URL('docs/stage6-terms-v3/APPROVAL.json',root),JSON.stringify(approval,null,2)+'\n');
console.log(JSON.stringify({status:approval.status,version:simpleTerms.version,canonicalSha256:hash,languages:approval.translations}));
