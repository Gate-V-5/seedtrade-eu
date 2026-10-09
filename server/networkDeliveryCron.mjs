import { createHash, timingSafeEqual } from 'node:crypto'
const digest=value=>createHash('sha256').update(value).digest()
export function createDeliveryCron({store,worker,token,resolveClientIdentity}) {
  if(typeof token!=='string'||token.length<32||/[\s]/.test(token)||typeof resolveClientIdentity!=='function')throw new Error('Private cron configuration required')
  return async(req,res)=>{
    const reply=(status,result)=>{if(!res.writableEnded&&!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(result))}}
    if(req.method!=='POST'||req.url!=='/api/internal/network-delivery')return reply(404,{status:'NOT_FOUND'})
    const authorization=req.headers.authorization
    if(!resolveClientIdentity(req)||typeof authorization!=='string'||authorization.length>512||!authorization.startsWith('Bearer ')||!timingSafeEqual(digest(authorization.slice(7)),digest(token)))return reply(403,{status:'FORBIDDEN'})
    // No IDs or visitor data accepted by this private trigger. One bounded delivery per invocation.
    if(req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0)return reply(413,{status:'EMPTY_BODY_REQUIRED'})
    try{
      const result=await store.withDeliveryLock(async session=>{
        await store.recover(session)
        const id=await store.nextPending()
        if(!id)return {processed:0}
        const record=await worker.deliver(id)
        return {processed:record?1:0,status:record?.DELIVERY_STATUS??'NO_CLAIM'}
      })
      return reply(200,result)
    }catch{return reply(503,{status:'DELIVERY_UNAVAILABLE'})}
  }
}
