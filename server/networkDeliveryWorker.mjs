import { validateRegistration } from './networkInterest.mjs'
import { requireStorageContract } from './networkLeadStore.mjs'
export const RECIPIENT = 'network@seedtrade.eu'
export function createDeliveryWorker({ store, sendMail, from, allowTestAdapter = false, timeoutMs = 25000, maximumAttempts = 3, retryMs = 60000, now = () => Date.now() }) {
  requireStorageContract(store, { allowTestAdapter })
  if (typeof sendMail !== 'function' || !from || /[\r\n]/.test(from) || timeoutMs <= 0 || !Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 3) throw new Error('Invalid delivery configuration')
  return {
    async deliver(id) {
      const claim = await store.claim(id, maximumAttempts)
      if (!claim) return null
      const { record: r, token } = claim
      let timer
      const controller = new AbortController()
      try {
        if (!validateRegistration({company:r.COMPANY_NAME,email:r.BUSINESS_EMAIL,role:r.ROLE,country:r.COUNTRY})) return await store.settle(id,token,'DELIVERY_FAILED_PERMANENT',{LAST_DELIVERY_ERROR_CODE:'INVALID_RECORD'})
        const result = await Promise.race([
          Promise.resolve().then(() => sendMail({ from, to: RECIPIENT, messageId: `<${r.ENQUIRY_ID}@seedtrade.eu>`, replyTo: r.BUSINESS_EMAIL,
            subject: `SeedTrade Network Registration — ${r.COMPANY_NAME}`,
            text: `Enquiry: ${r.ENQUIRY_ID}\nCompany name: ${r.COMPANY_NAME}\nBusiness email: ${r.BUSINESS_EMAIL}\nRole: ${r.ROLE}\nCountry: ${r.COUNTRY}\nSubmitted: ${r.RECEIVED_AT}\nSource: SeedTrade.eu European B2B Seed Network form\n` }, { signal: controller.signal })),
          new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Object.assign(new Error('Timeout'), { code: 'ATTEMPT_TIMEOUT' })) }, timeoutMs) })
        ])
        if (!result?.accepted?.some(address => typeof address === 'string' && address.toLowerCase() === RECIPIENT)) {
          const explicitlyRejected = result?.rejected?.some(address => typeof address === 'string' && address.toLowerCase() === RECIPIENT)
          return await store.settle(id, token, explicitlyRejected ? 'DELIVERY_FAILED_PERMANENT' : 'MANUAL_REVIEW_REQUIRED', { LAST_DELIVERY_ERROR_CODE: 'RECIPIENT_NOT_ACCEPTED' })
        }
        // Provider acceptance is not evidence of inbox receipt.
        return await store.settle(id, token, 'DELIVERED_TO_PROVIDER', { LAST_DELIVERY_ERROR_CODE: null,
          PROVIDER_MESSAGE_ID: typeof result.messageId === 'string' && /^[\w@.<>-]{1,200}$/.test(result.messageId) ? result.messageId : null })
      } catch (error) {
        // Only a trusted transport's explicit no-handoff classification permits retries.
        const noHandoff = error?.deliveryOutcome === 'NOT_ACCEPTED'
        const retry = noHandoff && error.retryable === true && r.DELIVERY_ATTEMPTS < maximumAttempts
        return await store.settle(id, token, retry ? 'DELIVERY_FAILED_RETRYABLE' : noHandoff ? 'DELIVERY_FAILED_PERMANENT' : 'MANUAL_REVIEW_REQUIRED', {
          LAST_DELIVERY_ERROR_CODE: error?.code === 'TEST_TRANSPORT_DISABLED' ? 'TEST_TRANSPORT_DISABLED' : error?.code === 'ATTEMPT_TIMEOUT' ? 'ATTEMPT_TIMEOUT' : noHandoff ? 'PROVIDER_REJECTED' : 'PROVIDER_OUTCOME_UNKNOWN',
          NEXT_ATTEMPT_AT: now() + retryMs * r.DELIVERY_ATTEMPTS
        })
      } finally { clearTimeout(timer) }
    }
  }
}
