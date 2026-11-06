// Explicit local-only browser acceptance. Uses synthetic accounts, in-memory transactions and captured mail.
// Never points at staging/production; no SMTP or mysql driver is instantiated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {spawn,execFileSync} from 'node:child_process';
import {portalFixture} from './fixtures/b2bPortalFixture.mjs';
import {createB2bPortalHttp} from '../server/b2b/portalHttp.mjs';
import {createB2bRegistrationHttp} from '../server/b2b/registrationHttp.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('compiled browser journey: register/verify, login, profile/approval, publish, buyer inquiry, seller reply and disabled mode', {timeout:120000},async()=>{
  const browser=process.env.B2B_TEST_BROWSER_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const openssl=process.env.B2B_TEST_OPENSSL_PATH??'C:/Program Files/Git/usr/bin/openssl.exe';
  assert.ok(fs.existsSync(browser),'Set B2B_TEST_BROWSER_PATH to a local Chromium browser');
  assert.ok(fs.existsSync(openssl),'Set B2B_TEST_OPENSSL_PATH to a local openssl executable');
  const root=process.cwd(),work=fs.mkdtempSync(path.join(root,'tmp/b2b-browser-')),key=path.join(work,'local.key'),cert=path.join(work,'local.crt');
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore',windowsHide:true});
  const h=portalFixture(),enabled={value:true},requests=[];let portal,registration,origin;
  const dist=path.resolve('dist');
  const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},async(req,res)=>{
    try {
      const url=new URL(req.url,'https://127.0.0.1');requests.push({method:req.method,path:url.pathname});
      if(url.pathname.startsWith('/api/b2b/v1/')) {
        if(!enabled.value){res.writeHead(404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"NOT_FOUND"}');return;}
        if(url.pathname==='/api/b2b/v1/status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"registrationAvailable":true,"portalAvailable":true}');return;}
        if(await portal(req,res)||await registration(req,res))return;
      }
      let target=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
      if(target!==dist&&!target.startsWith(dist+path.sep)){res.writeHead(404);res.end();return;}
      if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
      if(!fs.existsSync(target)){res.writeHead(404);res.end();return;}
      const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml'}[path.extname(target)]??'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(target));
    }catch{res.writeHead(503);res.end('Local test unavailable');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='https://127.0.0.1:'+server.address().port;
  portal=createB2bPortalHttp({service:h.service,allowedOrigin:origin,enabled:true,now:h.options.now,resolveClient:r=>r.socket.encrypted?r.socket.remoteAddress:null});
  registration=createB2bRegistrationHttp({service:h.registration,allowedOrigin:origin,enabled:true,rateLimiter:async()=>true});
  const profile=path.join(work,'browser');
  const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions',
    '--ignore-certificate-errors','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;const pending=new Map();let seq=0,sessionId,exceptions=0;
  async function command(method,params={},session) {
    const id=++seq;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('Local browser command timed out: '+method));},10000);
      pending.set(id,{resolve:result=>{clearTimeout(timer);resolve(result);},reject:error=>{clearTimeout(timer);reject(error);}});
      socket.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));
    });
  }
  const evaluate=async expression=>{
    const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
    if(result.exceptionDetails)throw Error('Local browser evaluation failed');return result.result?.value;
  };
  const wait=async(expression,label)=>{
    const deadline=Date.now()+8000;
    while(Date.now()<deadline){if(await evaluate(expression))return;await sleep(50);}
    throw Error('Browser state not reached: '+label);
  };
  const textIncludes=value=>`document.body.innerText.includes(${JSON.stringify(value)})`;
  const goto=async route=>{await command('Page.navigate',{url:origin+route},sessionId);await sleep(100);};
  const fill=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`);
  const submit=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`);
  const clickText=label=>evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(label)});if(!e||e.disabled)throw Error('Button unavailable');e.click();})()`);
  let signIns=0;
  const signIn=async label=>{
    // Exercise the real auth limiter; advance only the injected fixture clock between login windows.
    if(signIns&&signIns%5===0)h.advance(15*60_000+1);signIns++;
    await goto('/b2b/account');await wait(`!!document.querySelector('#b2b-signin')`,'sign-in form');
    await fill('#b2b-signin input[name="email"]',label+'@example.test');await fill('#b2b-signin input[name="password"]','synthetic password for '+label);
    await submit('#b2b-signin');await wait(textIncludes('Signed in as '+label+'@example.test'),'signed-in company');
    await wait(`![...document.querySelectorAll('button')].find(e=>e.textContent==='Sign out')?.disabled`,'login completion');
  };
  const signOut=async()=>{await clickText('Sign out');await wait(`!!document.querySelector('#b2b-signin')`,'signed out');};
  const register=async label=>{
    await goto('/b2b/register');await wait(`!!document.querySelector('form fieldset:not(:disabled)')`,'registration availability');
    for(const [name,value]of Object.entries({legalName:label+' Company',registrationCountry:'LT',registrationNumber:'SYN-'+label,email:label+'@example.test',password:'synthetic password for '+label}))await fill('input[name="'+name+'"]',value);
    await evaluate(`document.querySelector('input[name="noticesAccepted"]').click()`);
    await submit('form');await wait(textIncludes('Please check your email'),'registration acknowledgement');
    const message=h.mail.at(-1);assert.equal(message.email,label+'@example.test');
    await goto('/b2b/verify-email#user='+message.userId+'&token='+message.token);
    await wait(`document.querySelector('h1')?.textContent==='Email verified'`,'email confirmation');
    assert.equal(await evaluate('location.hash'),'', 'Verification token must leave browser history');
  };
  const saveProfile=async()=>{
    const form='form[aria-label="Company profile"]';
    for(const [name,value]of Object.entries({contactName:'Synthetic Contact',street:'Test Street 1',city:'Vilnius',postalCode:'LT-00000',country:'LT'}))await fill(form+' input[name="'+name+'"]',value);
    await evaluate(`document.querySelector('${form} input[name="authorityConfirmed"]').click()`);
    await submit(form);await wait(textIncludes('Company profile submitted for review.'),'profile persisted');
  };
  try {
    const activePort=path.join(profile,'DevToolsActivePort'),deadline=Date.now()+10000;
    while(!fs.existsSync(activePort)){if(child.exitCode!==null||Date.now()>deadline)throw Error('Local Chromium did not start');await sleep(50);}
    const [port,endpoint]=fs.readFileSync(activePort,'utf8').trim().split(/\r?\n/);
    socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(Error('Local browser connection failed')),{once:true});});
    socket.addEventListener('message',event=>{const data=JSON.parse(String(event.data));if(data.method==='Runtime.exceptionThrown')exceptions++;if(data.id){const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.error?job.reject(Error('Local browser rejected '+data.id)):job.resolve(data.result);}});
    socket.addEventListener('close',()=>{for(const job of pending.values())job.reject(Error('Browser closed'));pending.clear();});
    const target=await command('Target.createTarget',{url:'about:blank'}),attached=await command('Target.attachToTarget',{targetId:target.targetId,flatten:true});sessionId=attached.sessionId;
    await command('Page.enable',{},sessionId);await command('Runtime.enable',{},sessionId);
    await register('operator');await register('seller');await signIn('seller');await saveProfile();
    assert.equal(await evaluate(`document.querySelector('form[aria-label="Seed offer"] fieldset').disabled`),true);
    await signOut();await register('buyer');await signIn('buyer');await saveProfile();await signOut();
    await signIn('operator');
    for(const companyId of [2,3]){const form='form[aria-label="Review company '+companyId+'"]';await wait(`!!document.querySelector('${form}')`,'review queue');await fill(form+' input[name="reason"]','Synthetic identity evidence checked');await submit(form);await wait(textIncludes('Company review saved.'),'company approval');}
    await signOut();await signIn('seller');
    const offer='form[aria-label="Seed offer"]';await wait(`!document.querySelector('${offer} fieldset').disabled`,'verified seller permissions');
    for(const [name,value]of Object.entries({cropId:'red-clover',quantity:'100',priceAmount:'5.25',originCountry:'LT',validUntil:'2026-12-01'}))await fill(offer+' [name="'+name+'"]',value);
    await submit(offer);await wait(textIncludes('Offer saved as draft.'),'offer persistence');await clickText('Publish offer 1');await wait(textIncludes('Offer published.'),'publication');
    await signOut();await signIn('buyer');const inquiry='form[aria-label="Inquiry for offer 1"]';await wait(`!!document.querySelector('${inquiry}')`,'buyer marketplace');
    await fill(inquiry+' textarea','Please confirm seed availability. <img src=x onerror="window.b2bXss=true">');await submit(inquiry);await wait(textIncludes('Inquiry sent to the seller.'),'buyer inquiry');
    await signOut();await signIn('seller');
    await evaluate(`(()=>{const e=[...document.querySelectorAll('#inquiries li button')][0];if(!e)throw Error('No seller inquiry');e.click();})()`);await wait(textIncludes('Please confirm seed availability.'),'seller received message');
    assert.equal(await evaluate('window.b2bXss===true'),false,'Counterparty message must render as text, never HTML');
    const reply='form[aria-label="Inquiry reply"]';await fill(reply+' textarea','The seed is available.');await submit(reply);await wait(textIncludes('Reply saved.'),'seller reply');
    await signOut();await signIn('buyer');await evaluate(`document.querySelector('#inquiries li button').click()`);await wait(textIncludes('The seed is available.'),'buyer received seller reply');
    await command('Page.reload',{},sessionId);await wait(textIncludes('Signed in as buyer@example.test'),'persistent cookie session after reload');
    assert.equal(await evaluate('document.cookie.includes("seedtrade_b2b_session")'),false,'Session cookie must be HttpOnly');
    await signOut();await command('Page.reload',{},sessionId);await wait(`!!document.querySelector('#b2b-signin')`,'logout persisted after reload');
    enabled.value=false;await goto('/b2b/account');await wait(textIncludes('Company accounts are currently unavailable.'),'disabled account');
    assert.equal(await evaluate(`!!document.querySelector('#b2b-signin')`),false);
    assert.equal(exceptions,0,'Compiled pages must not raise browser exceptions');
    assert.equal(requests.filter(r=>r.path==='/api/b2b/v1/verify-email'&&r.method==='POST').length,3,'StrictMode must not double consume tokens');
    assert.equal(h.state.offers.get(1).status,'PUBLISHED');assert.equal(h.state.enquiries.size,1);assert.equal(h.state.messages.length,2);
  } finally {
    if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close');}catch{}socket.close();}
    child.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
});
