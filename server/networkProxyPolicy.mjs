import { isIP } from 'node:net'
const normal = value => typeof value === 'string' ? value.replace(/^::ffff:/,'') : ''
export function createProxyPolicy(env) {
  const peers=(env.B2B_TRUSTED_PROXY_IPS||'').split(',').filter(Boolean).map(normal)
  const proxied=env.B2B_PROXY_MODE==='trusted'
  if(env.B2B_PROXY_VERIFIED!=='true' || (!proxied && env.B2B_PROXY_MODE!=='direct') || (proxied && (!peers.length || peers.some(p=>!isIP(p)))))throw new Error('Verified HTTPS proxy policy required')
  return req=>{
    const peer=normal(req.socket.remoteAddress)
    if(!isIP(peer))return null
    if(!proxied)return req.socket.encrypted===true ? peer : null
    // Hostinger must confirm that this exact peer overwrites both headers. No arbitrary chains.
    if(!peers.includes(peer)||req.headers['x-forwarded-proto']!=='https')return null
    const client=normal(req.headers['x-forwarded-for'])
    return isIP(client) ? client : null
  }
}
