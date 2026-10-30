import React,{useMemo,useState,useEffect} from 'react'
import MemberApp from '../networkStageAB/App.jsx'
import AdminApp from '../networkStageC/AdminApp.jsx'
import {useNetworkMemberSession,useNetworkEntrySession} from './NetworkReview.jsx'
import {memberEntry} from './entryState.mjs'
// Coalesce only concurrent bootstrap requests caused by StrictMode effect replay.
// Responses are cloned; credentials and tokens are never stored persistently.
export {createNetworkRequest} from './networkRequest.mjs'
import {createNetworkRequest} from './networkRequest.mjs'
export default function NetworkSurface({path,language}){
 const entrySession=useNetworkEntrySession();
 const request=useMemo(()=>createNetworkRequest(),[]),[entry,setEntry]=useState(()=>memberEntry(window.location.hash||window.location.search)),reportMemberSession=useNetworkMemberSession()
 useEffect(()=>{const update=()=>setEntry(memberEntry(window.location.hash||window.location.search));window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[])
 return path==='/network/review'?<AdminApp initialSession={entrySession?.type==='admin'?entrySession:null} embedded initialLanguage={language} request={request}/>:<MemberApp initialSession={entrySession?.type==='member'?entrySession:null} embedded initialLanguage={language} request={request} entry={entry} onMemberSessionChange={reportMemberSession}/>
}
