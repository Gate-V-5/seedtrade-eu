// API-only VPS entrypoint. The Web Hosting entrypoint and public pages are untouched.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB2bStagingRuntime} from './stagingRuntime.mjs';
import {withProductionCors} from './productionCors.mjs';
export async function createProductionApiServer(env,dependencies={}) {
  if(env.SEEDTRADE_RUNTIME_ENV!=='production'||env.SEEDTRADE_PUBLIC_ORIGIN!=='https://seedtrade.eu'||
    env.SEEDTRADE_MAIL_TRANSPORT!=='smtp'||env.B2B_REGISTRATION_MAIL_TRANSPORT!=='smtp'||
    (env.PORT!==undefined&&env.PORT!=='3100'))throw Error('PRODUCTION_API_CONFIGURATION');
  const runtime=await createB2bStagingRuntime(env,dependencies);
  const api=withProductionCors(runtime.handle);
  const server=http.createServer(async(req,res)=>{
    try{await api(req,res);}catch{
      if(res.headersSent){res.destroy();return;}
      res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end('{"error":"TEMPORARILY_UNAVAILABLE"}');
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.timeout=15000;
  return {server,close:()=>new Promise(resolve=>server.close(()=>runtime.close().finally(resolve)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const api=await createProductionApiServer(process.env);
  api.server.listen({host:'127.0.0.1',port:3100});
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>api.close().finally(()=>process.exit(0)));
}
