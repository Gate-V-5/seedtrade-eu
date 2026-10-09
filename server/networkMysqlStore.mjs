import { createHmac, randomUUID } from 'node:crypto'
import { StoreError } from './networkLeadStore.mjs'
import { validateRegistration } from './networkInterest.mjs'
const day = 86400000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const endStates = new Set(['DELIVERED_TO_PROVIDER','DELIVERY_FAILED_RETRYABLE','DELIVERY_FAILED_PERMANENT','MANUAL_REVIEW_REQUIRED'])
const errorCodes = new Set(['ATTEMPT_TIMEOUT','PROVIDER_REJECTED','PROVIDER_OUTCOME_UNKNOWN','RECIPIENT_NOT_ACCEPTED','WORKER_INTERRUPTED','INVALID_RECORD','TEST_TRANSPORT_DISABLED'])
const clockSql = 'SELECT CAST(ROUND(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) AS UNSIGNED) AS now_ms'
function idCheck(id) { if (typeof id !== 'string' || !uuid.test(id)) throw new StoreError('INVALID_ENQUIRY_ID') }
export function recordFromRow(r) {
  if (!r) return null
  return { ENQUIRY_ID:r.enquiry_id, RECEIVED_AT:new Date(Number(r.received_at_ms)).toISOString(), COMPANY_NAME:r.company_name, BUSINESS_EMAIL:r.business_email, ROLE:r.role, COUNTRY:r.country,
    DELIVERY_STATUS:r.delivery_status, DELIVERY_ATTEMPTS:r.delivery_attempts, LAST_DELIVERY_ERROR_CODE:r.last_delivery_error_code,
    CREATED_AT:new Date(Number(r.created_at_ms)).toISOString(), UPDATED_AT:new Date(Number(r.updated_at_ms)).toISOString(), NEXT_ATTEMPT_AT:Number(r.next_attempt_at_ms),
    RETENTION_EXPIRES_AT:new Date(Number(r.retention_expires_at_ms)).toISOString(), PROVIDER_MESSAGE_ID:r.provider_message_id, CLASSIFICATION:'PRIVATE_ENQUIRY', ...(r.claim_token ? {CLAIM_TOKEN:r.claim_token} : {}) }
}
export function createMysqlLeadStore({ pool, secret, retentionDays=90, idempotencyDays=7, abuseHours=24, rateWindowMs=60000, rateMaximum=1, globalMaximum=10, retentionApproved=false, queryTimeoutMs=4000, lockName='seedtrade_b2b_delivery' }) {
  if (!pool || typeof pool.getConnection !== 'function' || typeof secret !== 'string' || secret.length < 32 || ![retentionDays,idempotencyDays,abuseHours,rateWindowMs,rateMaximum,globalMaximum,queryTimeoutMs].every(v=>Number.isSafeInteger(v)&&v>0) || idempotencyDays>retentionDays || lockName.length>64) throw new StoreError('INVALID_STORAGE_POLICY')
  const digest = value => createHmac('sha256',secret).update(value).digest('hex')
  const sessions = new WeakSet()
  const execute = (connection,sql,args=[]) => connection.execute({sql,timeout:queryTimeoutMs},args)
  const control = (connection,sql) => connection.query({sql,timeout:queryTimeoutMs})
  async function transaction(work) {
    let c,committing=false
    try {
      c=await pool.getConnection()
      await control(c,'SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
      await control(c,'START TRANSACTION')
      const result=await work(c)
      committing=true;await control(c,'COMMIT');return result
    } catch(error) {
      if(c) {
        if(!committing) { try { await control(c,'ROLLBACK') } catch { c.destroy();c=null } }
        else { c.destroy();c=null } // ambiguous commit is reconciled by same idempotency key
      }
      if(error instanceof StoreError)throw error
      throw new StoreError('STORAGE_UNAVAILABLE')
    } finally { c?.release() }
  }
  async function time(c) { const [rows]=await execute(c,clockSql);return Number(rows[0].now_ms) }
  async function find(c,id,locked=false) {const [rows]=await execute(c,'SELECT * FROM b2b_enquiries WHERE enquiry_id=?'+(locked?' FOR UPDATE':''),[id]);return rows[0]}
  async function budget(c,bucket,time,maximum) {
    await execute(c,'INSERT INTO b2b_rate_buckets (bucket_hash,count_value,window_expires_at_ms,retention_expires_at_ms) VALUES (?,0,?,?) ON DUPLICATE KEY UPDATE bucket_hash=bucket_hash',[bucket,time+rateWindowMs,time+abuseHours*3600000])
    const [rows]=await execute(c,'SELECT * FROM b2b_rate_buckets WHERE bucket_hash=? FOR UPDATE',[bucket]);const r=rows[0]
    const count=Number(r.window_expires_at_ms)<=time ? 0 : Number(r.count_value)
    if(count>=maximum)throw new StoreError('RATE_LIMITED')
    await execute(c,'UPDATE b2b_rate_buckets SET count_value=?,window_expires_at_ms=?,retention_expires_at_ms=? WHERE bucket_hash=?',[count+1,count===0?time+rateWindowMs:Number(r.window_expires_at_ms),time+abuseHours*3600000,bucket])
  }
  async function privateRead(id) {idCheck(id);return transaction(async c=>recordFromRow(await find(c,id))) }
  const store={
    // Describes implemented DB guarantees, not evidence of a configured/live database.
    capabilities:Object.freeze({atomic:true,idempotency:true,durable:true,private:true,testOnly:false}),
    async verify() {
      return transaction(async c=>{
        const names=['b2b_enquiries','b2b_idempotency','b2b_rate_buckets','b2b_delivery_attempts']
        const [rows]=await execute(c,'SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?)',names)
        if(rows.length!==4 || rows.some(r=>r.engine!=='InnoDB'))throw new StoreError('SCHEMA_NOT_READY')
        const [indexes]=await execute(c,'SELECT TABLE_NAME AS name,INDEX_NAME AS idx,NON_UNIQUE AS non_unique,SEQ_IN_INDEX AS seq,COLUMN_NAME AS col FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?)',names)
        const required={b2b_enquiries:{PRIMARY:['enquiry_id']},b2b_idempotency:{PRIMARY:['key_hash']},b2b_rate_buckets:{PRIMARY:['bucket_hash']},b2b_delivery_attempts:{PRIMARY:['enquiry_id','attempt_no'],b2b_attempt_claim:['claim_token']}}
        for(const [table,keys] of Object.entries(required))for(const [key,columns] of Object.entries(keys)){
          const actual=indexes.filter(r=>r.name===table&&r.idx===key).sort((a,b)=>Number(a.seq)-Number(b.seq))
          if(actual.some(r=>Number(r.non_unique)!==0)||JSON.stringify(actual.map(r=>r.col))!==JSON.stringify(columns))throw new StoreError('SCHEMA_NOT_READY')
        }
        const [foreignKeys]=await execute(c,'SELECT TABLE_NAME AS name,CONSTRAINT_NAME AS constraint_name,REFERENCED_TABLE_NAME AS parent,DELETE_RULE AS delete_rule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?)',['b2b_idempotency','b2b_delivery_attempts'])
        if(['b2b_idempotency','b2b_delivery_attempts'].some(table=>!foreignKeys.some(r=>r.name===table&&r.parent==='b2b_enquiries'&&r.delete_rule==='CASCADE')))throw new StoreError('SCHEMA_NOT_READY')
        // Fail closed on absent columns; CREATE IF NOT EXISTS never hides schema mismatch.
        await execute(c,'SELECT enquiry_id,received_at_ms,company_name,business_email,role,country,delivery_status,delivery_attempts,last_delivery_error_code,created_at_ms,updated_at_ms,next_attempt_at_ms,retention_expires_at_ms,provider_message_id,claim_token FROM b2b_enquiries LIMIT 0')
        await execute(c,'SELECT key_hash,payload_hash,enquiry_id,expires_at_ms FROM b2b_idempotency LIMIT 0')
        await execute(c,'SELECT bucket_hash,count_value,window_expires_at_ms,retention_expires_at_ms FROM b2b_rate_buckets LIMIT 0')
        await execute(c,'SELECT enquiry_id,attempt_no,claim_token,delivery_status,started_at_ms,completed_at_ms,error_code FROM b2b_delivery_attempts LIMIT 0')
        return true
      })
    },
    async receive({input,idempotencyKey,clientIdentity}) {
      const v=validateRegistration(input)
      if(!v || v.website || typeof idempotencyKey!=='string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey) || typeof clientIdentity!=='string' || !clientIdentity.length || clientIdentity.length>200)throw new StoreError('INVALID_RECEIPT_INPUT')
      const key=digest('key:'+idempotencyKey),payload=digest(JSON.stringify([v.company,v.email,v.role,v.country]))
      return transaction(async c=>{
        const now=await time(c)
        await execute(c,'INSERT INTO b2b_idempotency (key_hash,payload_hash,enquiry_id,expires_at_ms) VALUES (?,?,NULL,?) ON DUPLICATE KEY UPDATE key_hash=key_hash',[key,payload,now+idempotencyDays*day])
        const [rows]=await execute(c,'SELECT * FROM b2b_idempotency WHERE key_hash=? FOR UPDATE',[key]);const existing=rows[0]
        if(existing.enquiry_id && Number(existing.expires_at_ms)>now) {
          if(existing.payload_hash!==payload)throw new StoreError('IDEMPOTENCY_CONFLICT')
          const r=await find(c,existing.enquiry_id)
          if(!r)throw new StoreError('STORAGE_UNAVAILABLE')
          return {record:recordFromRow(r),duplicate:true}
        }
        // Consistent global/client lock order prevents different-key transactions deadlocking.
        await budget(c,digest('global'),now,globalMaximum)
        await budget(c,digest('rate:'+clientIdentity),now,rateMaximum)
        const id=randomUUID()
        await execute(c,'INSERT INTO b2b_enquiries (enquiry_id,received_at_ms,company_name,business_email,role,country,delivery_status,delivery_attempts,last_delivery_error_code,created_at_ms,updated_at_ms,next_attempt_at_ms,retention_expires_at_ms,provider_message_id,claim_token) VALUES (?,?,?,?,?,?,?,0,NULL,?,?,?,?,NULL,NULL)',[id,now,v.company,v.email,v.role,v.country,'PENDING_DELIVERY',now,now,now,now+retentionDays*day])
        await execute(c,'UPDATE b2b_idempotency SET payload_hash=?,enquiry_id=?,expires_at_ms=? WHERE key_hash=?',[payload,id,now+idempotencyDays*day,key])
        return {record:recordFromRow(await find(c,id)),duplicate:false}
      })
    },
    async claim(id,maximumAttempts) {
      idCheck(id);if(!Number.isInteger(maximumAttempts)||maximumAttempts<1||maximumAttempts>3)throw new StoreError('INVALID_ATTEMPT_POLICY')
      return transaction(async c=>{
        const r=await find(c,id,true),now=await time(c)
        if(!r || !['PENDING_DELIVERY','DELIVERY_FAILED_RETRYABLE'].includes(r.delivery_status) || Number(r.next_attempt_at_ms)>now || Number(r.retention_expires_at_ms)<=now || r.delivery_attempts>=maximumAttempts)return null
        const token=randomUUID(),attempt=r.delivery_attempts+1
        await execute(c,'UPDATE b2b_enquiries SET delivery_status=?,delivery_attempts=?,claim_token=?,updated_at_ms=? WHERE enquiry_id=?',['DELIVERING',attempt,token,now,id])
        await execute(c,'INSERT INTO b2b_delivery_attempts (enquiry_id,attempt_no,claim_token,delivery_status,started_at_ms) VALUES (?,?,?,?,?)',[id,attempt,token,'DELIVERING',now])
        return {record:recordFromRow(await find(c,id)),token}
      })
    },
    async settle(id,token,state,patch={}) {
      idCheck(id);idCheck(token)
      if(!endStates.has(state) || Object.keys(patch).some(k=>!['LAST_DELIVERY_ERROR_CODE','NEXT_ATTEMPT_AT','PROVIDER_MESSAGE_ID'].includes(k)) || (patch.LAST_DELIVERY_ERROR_CODE!=null && !errorCodes.has(patch.LAST_DELIVERY_ERROR_CODE)) || (patch.NEXT_ATTEMPT_AT!=null && (!Number.isSafeInteger(patch.NEXT_ATTEMPT_AT)||patch.NEXT_ATTEMPT_AT<0)) || (patch.PROVIDER_MESSAGE_ID!=null && !/^[\w@.<>-]{1,200}$/.test(patch.PROVIDER_MESSAGE_ID)))throw new StoreError('INVALID_TRANSITION')
      return transaction(async c=>{
        const r=await find(c,id,true),now=await time(c)
        if(!r || r.delivery_status!=='DELIVERING' || r.claim_token!==token)throw new StoreError('STALE_CLAIM')
        if(state==='DELIVERY_FAILED_RETRYABLE' && r.delivery_attempts>=3)throw new StoreError('INVALID_TRANSITION')
        await execute(c,'UPDATE b2b_enquiries SET delivery_status=?,claim_token=NULL,updated_at_ms=?,last_delivery_error_code=?,next_attempt_at_ms=?,provider_message_id=? WHERE enquiry_id=?',[state,now,patch.LAST_DELIVERY_ERROR_CODE??null,patch.NEXT_ATTEMPT_AT??Number(r.next_attempt_at_ms),patch.PROVIDER_MESSAGE_ID??r.provider_message_id,id])
        await execute(c,'UPDATE b2b_delivery_attempts SET delivery_status=?,completed_at_ms=?,error_code=? WHERE enquiry_id=? AND claim_token=?',[state,now,patch.LAST_DELIVERY_ERROR_CODE??null,id,token])
        return recordFromRow(await find(c,id))
      })
    },
    async withDeliveryLock(work) {
      let c,locked=false,session
      try {
        c=await pool.getConnection();const [rows]=await execute(c,'SELECT GET_LOCK(?,0) AS acquired',[lockName]);locked=rows[0].acquired===1
        if(!locked)return {busy:true,processed:0}
        session={connection:c};sessions.add(session);return await work(session)
      } catch(error) {if(error instanceof StoreError)throw error;throw new StoreError('STORAGE_UNAVAILABLE')}
      finally {
        if(session)sessions.delete(session)
        if(c&&locked){try{await execute(c,'SELECT RELEASE_LOCK(?) AS released',[lockName])}catch{c.destroy();c=null}}
        c?.release()
      }
    },
    async recover(session) {
      if(!sessions.has(session))throw new StoreError('DELIVERY_LOCK_REQUIRED')
      // Exclusive lock acquisition means the previous processor no longer owns its DB session.
      // Any previous handoff may still be uncertain: mark manual, never resend.
      return transaction(async c=>{
        const now=await time(c)
        await execute(c,'UPDATE b2b_delivery_attempts a INNER JOIN b2b_enquiries e ON a.enquiry_id=e.enquiry_id AND a.claim_token=e.claim_token SET a.delivery_status=?,a.completed_at_ms=?,a.error_code=? WHERE e.delivery_status=?',['MANUAL_REVIEW_REQUIRED',now,'WORKER_INTERRUPTED','DELIVERING'])
        await execute(c,'UPDATE b2b_enquiries SET delivery_status=?,claim_token=NULL,updated_at_ms=?,last_delivery_error_code=? WHERE delivery_status=?',['MANUAL_REVIEW_REQUIRED',now,'WORKER_INTERRUPTED','DELIVERING'])
      })
    },
    async nextPending() {
      return transaction(async c=>{const now=await time(c);const [rows]=await execute(c,'SELECT enquiry_id FROM b2b_enquiries WHERE delivery_status IN (?,?) AND next_attempt_at_ms<=? AND retention_expires_at_ms>? AND delivery_attempts<3 ORDER BY next_attempt_at_ms,enquiry_id LIMIT 1',['PENDING_DELIVERY','DELIVERY_FAILED_RETRYABLE',now,now]);return rows[0]?.enquiry_id??null})
    },
    exportOne:privateRead,
    async deleteOne(id) {idCheck(id);return transaction(async c=>{const r=await find(c,id,true);if(r?.delivery_status==='DELIVERING')throw new StoreError('ACTIVE_DELIVERY');const [result]=await execute(c,'DELETE FROM b2b_enquiries WHERE enquiry_id=?',[id]);return result.affectedRows})},
    async purge() {
      if(!retentionApproved)throw new StoreError('RETENTION_NOT_APPROVED')
      return transaction(async c=>{const now=await time(c)
        const [records]=await execute(c,'DELETE FROM b2b_enquiries WHERE retention_expires_at_ms<=? AND delivery_status<>? LIMIT 100',[now,'DELIVERING'])
        await execute(c,'DELETE FROM b2b_idempotency WHERE expires_at_ms<=? LIMIT 100',[now]);await execute(c,'DELETE FROM b2b_rate_buckets WHERE retention_expires_at_ms<=? LIMIT 100',[now]);return records.affectedRows})
    },
    async close(){await pool.end()}
  }
  return store
}
