import { createHash } from 'node:crypto'
import { createNetworkHandler } from './networkInterest.mjs'
import { createMysqlPool } from './networkMysqlConfiguration.mjs'
import { createMysqlLeadStore } from './networkMysqlStore.mjs'
import { createProxyPolicy } from './networkProxyPolicy.mjs'
import { createPrivateMailSender } from './networkMailTransport.mjs'
import { createDeliveryWorker } from './networkDeliveryWorker.mjs'
import { createDeliveryCron } from './networkDeliveryCron.mjs'
const origins=['https://seedtrade.eu','https://www.seedtrade.eu']
export async function createNetworkRuntime(env,{poolFactory=createMysqlPool}={}) {
  if(!env.B2B_ENQUIRIES_ENABLED||env.B2B_ENQUIRIES_ENABLED==='false')return {networkInterest:createNetworkHandler({allowedOrigins:origins}),cron:null,close:async()=>{}}
  if(env.B2B_ENQUIRIES_ENABLED!=='true'||['B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED','B2B_RUNTIME_VERIFIED','B2B_DELIVERY_ENABLED'].some(k=>env[k]!=='true'))throw new Error('Activation blocked: verified private storage adapter, runtime, privacy and delivery are required')
  const resolveClientIdentity=createProxyPolicy(env)
  const sender=createPrivateMailSender(env)
  let pool
  try{
    pool=poolFactory(env)
    const store=createMysqlLeadStore({pool,secret:env.B2B_STORAGE_SECRET,
      retentionDays:Number(env.B2B_RETENTION_DAYS||90),idempotencyDays:Number(env.B2B_IDEMPOTENCY_DAYS||7),abuseHours:Number(env.B2B_ABUSE_HOURS||24),
      retentionApproved:env.B2B_RETENTION_DELETION_APPROVED==='true',lockName:'b2b_'+createHash('sha256').update(env.B2B_MYSQL_DATABASE).digest('hex').slice(0,48)})
    await store.verify()
    const worker=createDeliveryWorker({store,sendMail:sender,from:env.SMTP_FROM})
    const cron=createDeliveryCron({store,worker,token:env.B2B_CRON_TOKEN,resolveClientIdentity})
    return {networkInterest:createNetworkHandler({store,allowedOrigins:origins,resolveClientIdentity}),cron,close:()=>store.close()}
  }catch{await pool?.end().catch(()=>{});throw new Error('Activation blocked: private enquiry runtime is not ready')}
}
