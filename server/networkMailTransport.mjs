import nodemailer from 'nodemailer'
import { mailConfiguration } from './networkMailConfiguration.mjs'
import { RECIPIENT } from './networkDeliveryWorker.mjs'
export function createPrivateMailSender(env,{createTransport=nodemailer.createTransport}={}) {
  const config=mailConfiguration(env)
  return async(message,{signal}={})=>{
    if(message.to!==RECIPIENT || typeof message.text!=='string' || message.html!=null)throw new Error('Invalid private mail')
    const transport=createTransport({...config,disableFileAccess:true,disableUrlAccess:true})
    let abort
    try {
      if(signal?.aborted)throw Object.assign(new Error('Attempt timeout'),{code:'ATTEMPT_TIMEOUT'})
      const cancelled=new Promise((_,reject)=>{
        abort=()=>{transport.close();reject(Object.assign(new Error('Attempt timeout'),{code:'ATTEMPT_TIMEOUT'}))}
        signal?.addEventListener('abort',abort,{once:true})
      })
      return await Promise.race([transport.sendMail({...message,disableFileAccess:true,disableUrlAccess:true}),cancelled])
    }catch(error){
      const result=new Error('Private delivery failed')
      if(error?.code==='ATTEMPT_TIMEOUT')result.code='ATTEMPT_TIMEOUT'
      // Only explicit negative SMTP replies establish non-acceptance; network failures are uncertain.
      if(Number.isInteger(error?.responseCode)&&error.responseCode>=400&&error.responseCode<600&&['AUTH','STARTTLS','MAIL FROM','RCPT TO','DATA'].includes(error.command)){
        result.deliveryOutcome='NOT_ACCEPTED';result.retryable=error.responseCode<500
      }
      throw result
    }finally{signal?.removeEventListener('abort',abort);transport.close()}
  }
}
