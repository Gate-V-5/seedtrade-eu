import {useEffect,useRef,useState} from 'react'
import {useLanguage} from './i18n/index.jsx'
import {SeedCard} from './CommercialSeedCard.jsx'
// Measure all automatically eligible cards at the actual shared column width.
// No species-specific heights, clipped copy, fabricated metrics or rotation-dependent resizing.
export default function SnapshotCardTrain({cards,position=0,visible=4,shown:providedCards}) {
  const root=useRef(null),measure=useRef(null),{language}=useLanguage(),[height,setHeight]=useState(null)
  useEffect(()=>{
    let stopped=false,frame=0,lastWidth=-1
    const raf=window.requestAnimationFrame?.bind(window)||((fn)=>setTimeout(fn,0)),caf=window.cancelAnimationFrame?.bind(window)||clearTimeout
    const calculate=()=>{
      if(stopped||!measure.current)return
      const heights=Array.from(measure.current.children,card=>card.getBoundingClientRect().height)
      if(heights.length&&heights.every(h=>h>0))setHeight(Math.ceil(Math.max(...heights)))
    }
    const schedule=()=>{caf(frame);frame=raf(calculate)}
    const observer=typeof window.ResizeObserver!=='undefined'?new window.ResizeObserver(entries=>{
      const width=entries[0]?.contentRect.width
      if(width!==lastWidth){lastWidth=width;schedule()}
    }):null
    if(root.current)observer?.observe(root.current)
    document.fonts?.ready.then(schedule);document.fonts?.addEventListener?.('loadingdone',schedule)
    window.addEventListener('resize',schedule);schedule()
    return()=>{stopped=true;caf(frame);observer?.disconnect();window.removeEventListener('resize',schedule);document.fonts?.removeEventListener?.('loadingdone',schedule)}
  },[cards,language])
  const shown=providedCards||Array.from({length:Math.min(visible,cards.length)},(_,i)=>cards[(position+i)%cards.length])
  return <div className="snapshot-card-train" ref={root} style={height?{'--snapshot-card-block-size':`${height}px`}:undefined}>
    <div className="crop-grid homepage-crops carousel-train">{shown.map(card=><SeedCard key={card.slug} card={card} snapshot/>)}</div>
    <div className="crop-grid homepage-crops snapshot-card-measurement" ref={measure} aria-hidden="true" inert="">{cards.map(card=><SeedCard key={card.slug} card={card} snapshot/>)}</div>
  </div>
}
