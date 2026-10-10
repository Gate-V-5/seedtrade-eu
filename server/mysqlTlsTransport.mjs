import { connect, isIP } from 'node:net'
import { checkServerIdentity, createSecureContext, getCACertificates } from 'node:tls'
import { X509Certificate } from 'node:crypto'
export function verifiedIdentity(env) {
 const name=env.B2B_MYSQL_TLS_SERVERNAME
 if(env.B2B_MYSQL_TLS_IDENTITY_AUTHORISED!=='true')throw Error('TLS_IDENTITY_UNAUTHORISED')
 if(typeof name!=='string'||name.length>253||isIP(name)||!name.split('.').every(x=>/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(x)))throw Error('TLS_IDENTITY_REQUIRED')
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('INSECURE_TLS_ENVIRONMENT')
 return name
}
export function approvedCa(pem) {
 if(typeof pem!=='string'||!pem.length||pem.length>131072)throw Error('TLS_CA_REQUIRED')
 const blocks=pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)
 if(!blocks?.length||pem.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,'').trim())throw Error('INVALID_TLS_CA')
 try{if(blocks.some(x=>!new X509Certificate(x).ca))throw Error();createSecureContext({ca:pem,minVersion:'TLSv1.2'})}catch{throw Error('INVALID_TLS_CA')}
 return pem
}
export function trustedCa(env) {
 const mode=env.B2B_MYSQL_TLS_TRUST_STORE
 if(mode==='owner-ca-pem')return approvedCa(env.B2B_MYSQL_TLS_CA)
 if(mode!=='node22-default')throw Error('TLS_TRUST_STORE_REQUIRED')
 if(env.B2B_MYSQL_TLS_CA?.trim())throw Error('AMBIGUOUS_TLS_TRUST_CONFIGURATION')
 // Freeze the same native default anchors used by Package 3P. Never import peer roots.
 if(env.NODE_EXTRA_CA_CERTS||process.env.NODE_EXTRA_CA_CERTS||env.NODE_OPTIONS||process.env.NODE_OPTIONS)throw Error('UNAPPROVED_TLS_TRUST_OVERRIDE')
 if(typeof getCACertificates!=='function')throw Error('NODE_DEFAULT_TRUST_STORE_UNAVAILABLE')
 const roots=getCACertificates('default')
 if(!roots.length)throw Error('NODE_DEFAULT_TRUST_STORE_EMPTY')
 return roots
}
export function mysqlTlsTransport(env,{socketFactory=connect}={}) {
 if(env.B2B_MYSQL_TLS_RUNTIME_VERIFIED!=='true')throw Error('REAL_TLS_VERIFICATION_REQUIRED')
 const identity=verifiedIdentity(env),host=env.B2B_MYSQL_HOST,port=Number(env.B2B_MYSQL_PORT||3306)
 if(!host||/[\x00\r\n]/.test(host)||!Number.isInteger(port)||port<1||port>65535)throw Error('INVALID_TCP_ROUTE')
 const ssl={rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2',ca:trustedCa(env)}
 if(host===identity&&env.SEEDTRADE_RUNTIME_ENV!=='staging')return {host,port,ssl}
 // Local staging-only split. No arbitrary routes or public connection changes.
 if(host!=='localhost'||port!==3306||identity!=='srv505.hstgr.io'||env.SEEDTRADE_RUNTIME_ENV!=='staging'||env.SEEDTRADE_PUBLIC_ORIGIN!=='https://staging.seedtrade.eu'||env.SEEDTRADE_MAIL_TRANSPORT!=='test-stream'||['B2B_ENQUIRIES_ENABLED','B2B_RUNTIME_VERIFIED','B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED'].some(k=>env[k]!=='false'))throw Error('SEPARATE_TLS_ROUTE_NOT_AUTHORISED')
 return {host:identity,port,ssl,stream:()=>{const socket=socketFactory({host:'localhost',port:3306});socket.setNoDelay(true);socket.setKeepAlive(true,0);return socket}}
}
// Native synthetic tests/pre-auth diagnostic; mysql2 derives these from config.host.
export function nativeTlsOptions(config) {
 if(config.ssl.rejectUnauthorized!==true||config.ssl.verifyIdentity!==true)throw Error('VERIFIED_TLS_REQUIRED')
 return {ca:config.ssl.ca,rejectUnauthorized:true,minVersion:'TLSv1.2',servername:config.host,checkServerIdentity}
}
