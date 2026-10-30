import React from 'react'
import {reviewText} from './copy.mjs'
import {copy} from '../networkStageAB/copy.mjs'
import './style.css'
export default function CompanyReviewStatus({review,language='EN',onRefresh}){
 if(!review)return null
 return <section className="company-review-status" aria-label={reviewText(language,'review')}><h2>{reviewText(language,'review')}</h2><p role="status" data-company-review={review.state}>{reviewText(language,review.state)}</p><p>{reviewText(language,'noPublication')}</p>{review.requestedFields?.length>0&&<><h3>{reviewText(language,'requested')}</h3><ul>{review.requestedFields.map(k=><li key={k}>{copy(language,k)}</li>)}</ul></>}{onRefresh&&<button type="button" onClick={onRefresh}>{reviewText(language,'refresh')}</button>}</section>
}
