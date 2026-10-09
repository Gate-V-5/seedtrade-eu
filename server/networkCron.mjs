// Optional server-side cron client. Never run/activate until owner approval.
const {B2B_CRON_URL,B2B_CRON_TOKEN}=process.env
let url
try{url=new URL(B2B_CRON_URL)}catch{throw new Error('Configured HTTPS cron URL required')}
if(url.protocol!=='https:'||!['seedtrade.eu','www.seedtrade.eu'].includes(url.hostname)||url.pathname!=='/api/internal/network-delivery'||url.search||url.username||url.password||!B2B_CRON_TOKEN||B2B_CRON_TOKEN.length<32)throw new Error('Configured private cron required')
try{
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${B2B_CRON_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(60000)})
 if(!response.ok)process.exitCode=1
}catch{process.exitCode=1}
