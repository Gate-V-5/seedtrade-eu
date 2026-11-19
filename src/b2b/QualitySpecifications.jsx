import React from 'react';
import {useT} from '../i18n/index.jsx';
import './qualitySpecifications.css';

export const qualityLabels={germination:'Germination',physicalPurity:'Physical purity',moisture:'Moisture',otherCropSeeds:'Other crop seeds',oilContent:'Oil content',proteinContent:'Protein content',other:'Other parameter'};
export const conditionLabels={MIN:'Minimum',MAX:'Maximum',EXACT:'Exact'};
const legacyFields={germinationPercent:'germination',purityPercent:'physicalPurity',moisturePercent:'moisture'};

// Compatibility is display-only: legacy observations are not turned into new
// laboratory evidence or silently written back to the original record.
export function qualityRows(parameters=[],legacy={}){
 const rows=Array.isArray(parameters)?parameters.filter(p=>p&&Object.hasOwn(qualityLabels,p.parameter)&&Object.hasOwn(conditionLabels,p.operator)&&p.value!==''&&p.value!=null).map(p=>({...p})):[];
 for(const [field,parameter] of Object.entries(legacyFields))if(legacy[field]!=null&&legacy[field]!==''&&!rows.some(row=>row.parameter===parameter))rows.push({parameter,operator:'EXACT',value:String(legacy[field]),unit:'%'});
 return rows;
}

export default function QualitySpecifications({parameters=[],legacy={},direction='OFFER',t:translate}){
 const baseT=useT(),t=translate??baseT,rows=qualityRows(parameters,legacy);
 if(!rows.length)return null;
 return <section className="listing-quality" aria-label={t('Quality specifications')}>
  <h3>{t(direction==='BUY_REQUEST'?'Required Product Quality':'Declared Product Quality')}</h3>
  <p className="listing-quality-basis">{t(direction==='BUY_REQUEST'?'Buyer requirements are not laboratory verification.':'Seller declarations are not laboratory verification.')}</p>
  <dl>{rows.map((row,index)=><React.Fragment key={row.parameter+'-'+index}>
   <dt>{row.parameter==='other'&&row.label?row.label:t(qualityLabels[row.parameter])}</dt>
   <dd><span>{t(conditionLabels[row.operator])}</span> <strong>{({MIN:'≥',MAX:'≤',EXACT:'='})[row.operator]} {row.value}{row.unit==='%'?'%':' '+row.unit}</strong></dd>
  </React.Fragment>)}</dl>
 </section>;
}

export {QualitySpecifications};
