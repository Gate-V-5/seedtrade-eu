import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import tls from 'node:tls'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { mysqlConfiguration } from '../server/networkMysqlConfiguration.mjs'
import { fixture } from './mysqlTlsFixtures.mjs'
const ca=fixture('ca.pem')
const env={B2B_MYSQL_HOST:'localhost',B2B_MYSQL_PORT:'3306',B2B_MYSQL_TLS_SERVERNAME:'srv505.hstgr.io',B2B_MYSQL_TLS_IDENTITY_AUTHORISED:'true',B2B_MYSQL_TLS_RUNTIME_VERIFIED:'true',B2B_MYSQL_TLS_TRUST_STORE:'owner-ca-pem',SEEDTRADE_RUNTIME_ENV:'staging',SEEDTRADE_PUBLIC_ORIGIN:'https://staging.seedtrade.eu',SEEDTRADE_MAIL_TRANSPORT:'test-stream',...Object.fromEntries(['B2B_ENQUIRIES_ENABLED','B2B_RUNTIME_VERIFIED','B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED','B2B_STAGING_TEST_EXECUTION','B2B_STAGING_REAL_TESTS','B2B_STAGING_WORKER_ENABLED'].map(k=>[k,'false'])),B2B_MYSQL_TLS_CA:ca,B2B_MYSQL_USER:'synthetic',B2B_MYSQL_PASSWORD:'synthetic-not-real',B2B_MYSQL_DATABASE:'synthetic_only'}
test('TLS config explicitly requires supported matching DNS identity and approved CA; no bypass',()=>{
 const config=mysqlConfiguration(env)
 assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.verifyIdentity,true);assert.equal(config.ssl.minVersion,'TLSv1.2')
 for(const patch of [{B2B_MYSQL_TLS_SERVERNAME:undefined},{B2B_MYSQL_TLS_SERVERNAME:'wrong.invalid'},{B2B_MYSQL_TLS_SERVERNAME:'127.0.0.1',B2B_MYSQL_HOST:'127.0.0.1'},{B2B_MYSQL_TLS_SERVERNAME:'bad..name'},{B2B_MYSQL_TLS_CA:undefined},{B2B_MYSQL_TLS_CA:'not PEM'},{B2B_MYSQL_TLS_CA:fixture('valid.pem')},{NODE_TLS_REJECT_UNAUTHORIZED:'0'}])assert.throws(()=>mysqlConfiguration({...env,...patch}))
})
test('installed mysql2 supported identity option invokes Node checkServerIdentity for config.host',()=>{
 const require=createRequire(import.meta.url),root=path.dirname(require.resolve('mysql2'))
 assert.equal(JSON.parse(readFileSync(path.join(root,'package.json'))).version,'3.24.5')
 const source=readFileSync(path.join(root,'lib/base/connection.js'),'utf8')
 assert.match(source,/const verifyIdentity = this.config.ssl.verifyIdentity/)
 assert.match(source,/checkServerIdentity: verifyIdentity\s*\? Tls.checkServerIdentity/)
 assert.match(source,/const servername = Net.isIP\(this.config.host\)/)
})
// Real Node/OpenSSL TLS using adapter CA and hostname configuration. Not a
// MySQL protocol server, actual database test or Hostinger compatibility proof.
async function endpoint(label='valid',{plaintext=false}={}) {
 const sockets=new Set();const state={connections:0}
 const handle=s=>{sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s))}
 const server=plaintext?net.createServer(s=>{handle(s);s.end('not TLS')}):tls.createServer({key:fixture(label+'-key.pem'),cert:fixture(label+'.pem'),minVersion:'TLSv1.2'},s=>{handle(s)})
 server.on('connection',s=>{state.connections++;handle(s)});server.on('tlsClientError',()=>{})
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'localhost',resolve)})
 return {port:server.address().port,state,async close(){for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve))}}
}
for(const [name,label,options,patch,errorCode] of [
 ['matching certificate','valid',{}, {},null],
 ['wrong hostname','wrong',{}, {},'ERR_TLS_CERT_ALTNAME_INVALID'],
 ['expired certificate','expired',{}, {},'CERT_HAS_EXPIRED'],
 ['not yet valid certificate','future',{}, {},'CERT_NOT_YET_VALID'],
 ['untrusted CA','valid',{}, {B2B_MYSQL_TLS_CA:fixture('foreign.pem')},'UNABLE_TO_VERIFY_LEAF_SIGNATURE'],
 ['TLS unavailable / invalid plaintext handshake','valid',{plaintext:true},{},'ERR_SSL_WRONG_VERSION_NUMBER']
]) test('REAL SYNTHETIC NODE TLS: '+name,{timeout:5000},async()=>{
 const ep=await endpoint(label,options)
 try {
  const config=mysqlConfiguration({...env,...patch,B2B_MYSQL_PORT:'3306'})
  let client
  const result=new Promise((resolve,reject)=>{
   client=tls.connect({host:'localhost',port:ep.port,...config.ssl,servername:config.host,checkServerIdentity:tls.checkServerIdentity},()=>resolve({authorised:client.authorized,cipher:client.getCipher()?.name}))
   client.setTimeout(2000,()=>client.destroy(Error('Synthetic TLS timeout')));client.once('error',reject)
  })
  try {
   if(errorCode)await assert.rejects(result,{code:errorCode})
   else {const status=await result;assert.equal(status.authorised,true);assert.ok(status.cipher)}
  }finally{client.destroy()}
  assert.equal(ep.state.connections,1,'no plaintext retry or insecure fallback')
 }finally{await ep.close()}
})

test('REAL mysql2 protocol rejects server without TLS advertisement before credentials',{timeout:5000},async()=>{
 const require=createRequire(import.meta.url),root=path.dirname(require.resolve('mysql2'))
 const Handshake=require(path.join(root,'lib/packets/handshake.js'))
 const mysql=(await import('mysql2/promise')).default
 const sockets=new Set();let clientBytes=0
 const server=net.createServer(s=>{
  sockets.add(s);s.on('error',()=>{});s.on('data',b=>{clientBytes+=b.length})
  const packet=new Handshake({protocolVersion:10,serverVersion:'8.0-synthetic-no-TLS',connectionId:1,statusFlags:2,characterSet:45,capabilityFlags:0x00088201,authPluginData1:Buffer.alloc(8,1),authPluginData2:Buffer.alloc(12,2)}).toPacket(0)
  packet.buffer.writeUIntLE(packet.buffer.length-4,0,3);packet.buffer[3]=0;s.write(packet.buffer)
 })
 await new Promise(resolve=>server.listen(0,'localhost',resolve))
 try {await assert.rejects(mysql.createConnection({...mysqlConfiguration(env),stream:()=>net.connect(server.address().port,'localhost')}),{code:'HANDSHAKE_NO_SSL_SUPPORT'});assert.equal(clientBytes,0)}
 finally{for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve))}
})

import { mysqlTlsTransport, trustedCa, nativeTlsOptions } from '../server/mysqlTlsTransport.mjs'
test('explicit default-root trust uses native roots exactly; malformed/ambiguous configuration fails',()=>{
 const nativeEnv={...env,B2B_MYSQL_TLS_TRUST_STORE:'node22-default',B2B_MYSQL_TLS_CA:''}
 assert.deepEqual(mysqlConfiguration(nativeEnv).ssl.ca,tls.getCACertificates('default'))
 for(const patch of [{B2B_MYSQL_TLS_TRUST_STORE:undefined},{B2B_MYSQL_TLS_TRUST_STORE:'unknown'},{B2B_MYSQL_TLS_CA:ca},{NODE_OPTIONS:'--use-openssl-ca'},{NODE_EXTRA_CA_CERTS:'/unapproved.pem'}])assert.throws(()=>mysqlConfiguration({...nativeEnv,...patch}))
})
test('exact local route/authorised servername, disabled public activation and socket proof fail closed',()=>{
 let target;const c=mysqlTlsTransport(env,{socketFactory:x=>{target=x;return {setNoDelay(){},setKeepAlive(){}}}});c.stream()
 assert.deepEqual(target,{host:'localhost',port:3306});assert.equal(c.host,'srv505.hstgr.io');assert.equal(nativeTlsOptions(c).servername,'srv505.hstgr.io')
 for(const patch of [{B2B_MYSQL_HOST:'srv505.hstgr.io'},{B2B_MYSQL_HOST:'127.0.0.1'},{B2B_MYSQL_PORT:'3307'},{B2B_MYSQL_TLS_RUNTIME_VERIFIED:'false'},{B2B_MYSQL_TLS_IDENTITY_AUTHORISED:'false'},{SEEDTRADE_RUNTIME_ENV:'production'},{SEEDTRADE_MAIL_TRANSPORT:'smtp'},{B2B_MYSQL_SOCKET:'/private/unverified.sock'},...Object.keys(env).filter(k=>['B2B_ENQUIRIES_ENABLED'].includes(k)).map(k=>({[k]:'true'}))])assert.throws(()=>mysqlConfiguration({...env,...patch}))
})
test('default roots reject synthetic CA; no trust fallback',{timeout:5000},async()=>{
 const ep=await endpoint('valid');let client
 try{const c=mysqlConfiguration({...env,B2B_MYSQL_TLS_TRUST_STORE:'node22-default',B2B_MYSQL_TLS_CA:''});await assert.rejects(new Promise((resolve,reject)=>{client=tls.connect({host:'localhost',port:ep.port,...nativeTlsOptions(c)},resolve);client.setTimeout(1500,()=>client.destroy(Error('timeout')));client.once('error',reject)}));assert.equal(ep.state.connections,1)}finally{client?.destroy();await ep.close()}
})
// Exercise the actual pinned mysql2 driver, not merely native TLS options.
// Synthetic local server; it intentionally ends before authentication completes.
async function protocolCase(mode){
 const require=createRequire(import.meta.url),root=path.dirname(require.resolve('mysql2')),Handshake=require(path.join(root,'lib/packets/handshake.js'))
 const sockets=new Set();let sslBytes=0,appBytes=0,tlsAccepted=false
 const server=net.createServer(s=>{
  sockets.add(s);s.on('error',()=>{})
  const h=new Handshake({protocolVersion:10,serverVersion:'8.0-synthetic',connectionId:1,statusFlags:2,characterSet:45,capabilityFlags:0x00088a01,authPluginData1:Buffer.alloc(8,1),authPluginData2:Buffer.alloc(12,2)}).toPacket(0)
  h.buffer.writeUIntLE(h.buffer.length-4,0,3);h.buffer[3]=0;s.write(h.buffer)
  const begin=()=>{const b=s.read(36);if(!b)return;s.off('readable',begin);sslBytes=b.length
   if(mode==='invalid-handshake'){s.end('invalid TLS');return}
   const label=mode==='wrong'?'wrong':mode==='expired'?'expired':'valid'
   s.pause();const ts=tls.createServer(mode==='missing-certificate'?{}:{key:fixture(label+'-key.pem'),cert:fixture(label+'.pem')},secure=>{sockets.add(secure);secure.on('error',()=>{});secure.on('data',b=>{tlsAccepted=true;appBytes+=b.length;secure.destroy()})});ts.on('tlsClientError',()=>{});ts.emit('connection',s);s.resume()
  };s.on('readable',begin)
 });await new Promise(r=>server.listen(0,'localhost',r))
 const transport=mysqlTlsTransport({...env,...(mode==='untrusted'?{B2B_MYSQL_TLS_CA:fixture('foreign.pem')}:mode==='node-default'?{B2B_MYSQL_TLS_TRUST_STORE:'node22-default',B2B_MYSQL_TLS_CA:''}:{})},{socketFactory:()=>net.connect(server.address().port,'localhost')})
 const mysql=(await import('mysql2/promise')).default
 try{await assert.rejects(mysql.createConnection({...mysqlConfiguration(env),...transport,connectTimeout:1500}));await new Promise(r=>setTimeout(r,20));return {sslBytes,appBytes,tlsAccepted}}
 finally{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r))}
}
for(const mode of ['valid','wrong','expired','untrusted','node-default','missing-certificate','invalid-handshake'])test('ACTUAL mysql2 ISOLATED protocol TLS: '+mode,{timeout:5000},async()=>{
 const r=await protocolCase(mode);assert.equal(r.sslBytes,36)
 if(mode==='valid'){assert.equal(r.tlsAccepted,true);assert.ok(r.appBytes>0,'only synthetic handshake credentials after verified TLS')}
 else{assert.equal(r.appBytes,0,'no synthetic authentication bytes after failed TLS');assert.equal(r.tlsAccepted,false)}
})
