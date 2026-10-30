import React,{createContext,useContext,useEffect,useState,useCallback,Suspense,lazy} from 'react'
import {useLanguage} from '../i18n/index.jsx'
import {networkText} from './copy.mjs'
import {profileResponseConfirmsMember} from './entryState.mjs'
import './networkReview.css'
const reviewBuild=import.meta.env.VITE_SEEDTRADE_B2B_REVIEW==='1'
const Access=createContext({enabled:false,checked:true,member:false,reportMemberSession:()=>{}})
export const isNetworkReviewPath=path=>path==='/network'||path==='/network/review'
const NetworkEntry=reviewBuild?lazy(()=>import('./NetworkEntry.jsx')):null
const NetworkSurface=reviewBuild?lazy(()=>import('./NetworkSurface.jsx')):null
export function NetworkReviewProvider({children}){
 const[state,setState]=useState({enabled:false,checked:!reviewBuild,member:false,entryEnabled:false,entrySession:null})
 useEffect(()=>{if(!reviewBuild)return;const controller=new AbortController();const read=url=>fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:controller.signal}).then(async r=>r.ok?r.json():null);Promise.all([read('/api/network-preview/access'),read('/api/network-entry/access')]).then(([d,e])=>{if(!controller.signal.aborted)setState({enabled:false,sessionAvailable:d?.enabled===true,entryEnabled:e?.entryEnabled===true,checked:true,member:false,entrySession:null})}).catch(()=>{if(!controller.signal.aborted)setState({enabled:false,entryEnabled:false,checked:true,member:false,entrySession:null})});return()=>controller.abort()},[])
 const entryReady=useCallback(value=>setState(current=>({...current,enabled:true,entrySession:value})),[])
 const reportMemberSession=useCallback(value=>setState(current=>({...current,member:current.enabled&&profileResponseConfirmsMember(value),...(value===null?{enabled:false,entrySession:null}:{})})),[])
 return <Access.Provider value={{...state,reportMemberSession,entryReady}}>{children}</Access.Provider>
}
export function useNetworkEntrySession(){return useContext(Access).entrySession}
export function useNetworkMemberSession(){return useContext(Access).reportMemberSession}
export function NetworkEntryActions({member=false}){const{language}=useLanguage();return <span className="network-nav-actions">{member?<details className="network-workspace"><summary>{networkText(language,'workspace')}</summary><div><a href="#company-profile">{networkText(language,'profile')}</a><a href="#marketplace-title">{networkText(language,'listings')}</a></div></details>:<><a href="/network#entry=signin">{networkText(language,'signIn')}</a><a className="network-join-link" href="/network#entry=join">{networkText(language,'join')}</a></>}</span>}
export function NetworkReviewLink(){const access=useContext(Access);return reviewBuild&&(access.enabled||access.entryEnabled)?<NetworkEntryActions member={access.member}/>:null}
export function NetworkConversion({fallback=null}){const access=useContext(Access),{language}=useLanguage();if(!reviewBuild||(!access.enabled&&!access.entryEnabled))return fallback;return <section className="network-interest network-conversion"><div><p className="eyebrow">{networkText(language,'member')}</p><h2>{networkText(language,'joinTitle')}</h2><ul>{['benefitProfile','benefitListings','benefitControl'].map(key=><li key={key}>{networkText(language,key)}</li>)}</ul><p>{networkText(language,'approvalNote')}</p></div><div className="network-conversion-actions"><a className="btn primary" href="/network#entry=join">{networkText(language,'join')}</a><p>{networkText(language,'already')} <a href="/network#entry=signin">{networkText(language,'signIn')}</a></p></div></section>}
export function NetworkReviewBoundary({path}){
 const access=useContext(Access),{language}=useLanguage()
 if(reviewBuild&&!access.enabled&&access.entryEnabled)return <Suspense fallback={<p role="status">{networkText(language,'loading')}</p>}><NetworkEntry language={language} admin={path==='/network/review'} onReady={access.entryReady}/></Suspense>
 if(!reviewBuild||!access.enabled)return <main className="article" data-network-access="denied"><p role="status">{networkText(language,access.checked?'unavailable':'loading')}</p></main>
 return <main className="article seedtrade-network" data-network-access="tester"><p className="network-preview-note">{networkText(language,'private')}</p><nav className="network-tabs" aria-label={networkText(language,'member')}><a href="/network" aria-current={path==='/network'?'page':undefined}>{networkText(language,'member')}</a><a href="/network/review" aria-current={path==='/network/review'?'page':undefined}>{networkText(language,'review')}</a></nav><Suspense fallback={<p role="status">{networkText(language,'loading')}</p>}><NetworkSurface path={path} language={language}/></Suspense></main>
}
