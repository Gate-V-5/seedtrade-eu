import tls from'node:tls';import {X509Certificate}from'node:crypto';import dns from'node:dns/promises';import {clientFromEnvironment,materialFromEnvironment}from'./hostingerClient.mjs';
let completion;
export function runConfiguredTransportAcceptance({enabled=false,env=process.env}={}) {
 if(env.MTLS_STARTUP_TEST!=='true')return Promise.resolve({status:'SKIP_DISABLED'});
 if(completion)return completion;
 completion=runOnce(env);return completion;
}
async function runOnce(env){
 if(env.SEEDTRADE_DEPLOYMENT_HOST!=='staging.seedtrade.eu'||env.MTLS_TEST_TARGET!=='b2b-api.seedtrade.eu'||env.MTLS_SERVER_NAME!=='b2b-api.seedtrade.eu')throw Error('STAGING_ONLY_EXACT_TARGET_REQUIRED');
 if(!process.versions.node.startsWith('22.'))throw Error('NODE22_REQUIRED');
const result={REAL_HOSTINGER_VPS_MTLS:'BLOCKED',node:process.version,cases:{}};let client;
try{
 if(!process.versions.node.startsWith('22.')||env.MTLS_SERVER_NAME!=='b2b-api.seedtrade.eu')throw Error('NODE22_EXACT_ORIGIN_REQUIRED');
 const resolved=await dns.lookup('b2b-api.seedtrade.eu',{all:true});if(!resolved.length||resolved.some(x=>x.address!=='2.24.44.147'||x.family!==4))throw Error('DNS_IDENTITY_REJECTED');
 const {ca,cert,key}=materialFromEnvironment(env);
 // Existing client verifies custody, CA/hostname and exact operation. This invalid body is rejected in gateway BEFORE projection/store.
 client=await clientFromEnvironment(env);
 const peer=await new Promise((resolve,reject)=>{const s=tls.connect({host:'b2b-api.seedtrade.eu',port:443,servername:'b2b-api.seedtrade.eu',ca,cert,key,rejectUnauthorized:true,minVersion:'TLSv1.2'},()=>{const c=s.getPeerCertificate();const v={tlsVersion:s.getProtocol(),serverFingerprint:c.fingerprint256,validFrom:c.valid_from,validTo:c.valid_to};s.end();resolve(v)});s.setTimeout(10000,()=>s.destroy(Error('TLS_TIMEOUT')));s.once('error',reject)});Object.assign(result,peer);
 const out=await client.call('marketplace',{transportProbe:true},{});
 if(out.status!==400||out.body?.error!=='INVALID_REQUEST'||out.cookies.length)throw Error('EXPECTED_NONMUTATING_GATEWAY_400_REQUIRED');result.cases.allowlistedNonmutatingProbe='PASS';
 const handshake=options=>new Promise(resolve=>{let done=false;const finish=x=>{if(done)return;done=true;s.destroy();resolve(x)};const s=tls.connect({host:'b2b-api.seedtrade.eu',port:443,servername:'b2b-api.seedtrade.eu',ca,rejectUnauthorized:true,minVersion:'TLSv1.2',...options});s.setTimeout(10000,()=>finish('TIMEOUT'));s.on('secureConnect',()=>{if(options.checkServerIdentity)return finish('UNEXPECTED_SUCCESS');s.write('POST /v1/b2b HTTP/1.1\r\nHost: b2b-api.seedtrade.eu\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')});s.on('data',()=>finish('UNEXPECTED_HTTP'));s.on('error',e=>finish(e.code||'UNKNOWN_ERROR'));s.on('end',()=>finish('CLOSED_WITHOUT_TLS_ALERT'))});
 const missing=await handshake({});if(!['ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED','ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE','ERR_SSL_TLSV1_ALERT_UNKNOWN_CA'].includes(missing))throw Error('MISSING_CERT_TLS_REJECTION_UNPROVEN');result.cases.missingCertificate='PASS';
 const invalidCert=Buffer.from(env.MTLS_INVALID_CERT_B64||'','base64'),invalidKey=Buffer.from(env.MTLS_INVALID_KEY_B64||'','base64');if(!invalidCert.length||!invalidKey.length)throw Error('NEGATIVE_CERTIFICATE_MATERIAL_REQUIRED');
 const invalid=await handshake({cert:invalidCert,key:invalidKey});if(!['ERR_SSL_TLSV1_ALERT_UNKNOWN_CA','ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE','ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED','ERR_SSL_SSLV3_ALERT_BAD_CERTIFICATE','ERR_SSL_TLSV1_ALERT_ACCESS_DENIED'].includes(invalid))throw Error('INVALID_CERT_TLS_REJECTION_UNPROVEN');result.cases.invalidCertificate='PASS';
 const wrong=await handshake({cert,key,checkServerIdentity:(_host,c)=>tls.checkServerIdentity('wrong-identity.invalid',c)});if(wrong!=='ERR_TLS_CERT_ALTNAME_INVALID')throw Error('WRONG_SERVER_IDENTITY_REJECTION_UNPROVEN');result.cases.wrongServerIdentity='PASS';
 result.clientFingerprint=new X509Certificate(cert).fingerprint256;result.TRANSPORT_CHECKS='PASS';result.REAL_HOSTINGER_VPS_MTLS='PENDING_OPERATOR_SHUTDOWN_AND_FIREWALL_RESTORE';
}catch(e){result.failure='SANITIZED_TRANSPORT_REJECTION';result.REAL_HOSTINGER_VPS_MTLS='BLOCKED_OR_FAILED_REQUIRES_OPERATOR_REVIEW'}finally{client?.close();result.finishedAt=new Date().toISOString();console.log(JSON.stringify({event:'STAGING_MTLS_ACCEPTANCE',status:result.TRANSPORT_CHECKS==='PASS'?'TRANSPORT_PASS_SHUTDOWN_PENDING':'BLOCKED_OR_FAILED',cases:result.cases,node:result.node,tlsVersion:result.tlsVersion,serverFingerprint:result.serverFingerprint,clientFingerprint:result.clientFingerprint,failure:result.failure?'SANITIZED_TRANSPORT_REJECTION':undefined}))}

return result;
}
