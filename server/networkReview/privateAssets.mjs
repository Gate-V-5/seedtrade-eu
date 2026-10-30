import {fileURLToPath} from 'node:url';
import fs from'node:fs';import path from'node:path';import {createHash}from'node:crypto';import {networkReviewAssetPaths}from'./dispatcher.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const outside=(p,r)=>p!==r&&!p.startsWith(r+path.sep);
function location(root,publicRoots){if(!path.isAbsolute(root)||publicRoots.some(p=>!outside(root,path.resolve(p))))throw Error('NONPUBLIC_ASSET_ROOT_REQUIRED');let parent=path.dirname(root);while(!fs.existsSync(parent))parent=path.dirname(parent);if(fs.realpathSync(parent)!==parent)throw Error('PRIVATE_ASSET_PATH_REJECTED')}
export function partitionPrivateAssets({distRoot,privateRoot,manifest,additionalPublicRoots=[]}){
 distRoot=fs.realpathSync(distRoot);location(privateRoot,[distRoot,...additionalPublicRoots]);
 const paths=manifest['src/networkReview/NetworkSurface.jsx']?networkReviewAssetPaths(manifest):[];
 const entries=paths.map(url=>{const relative=url.slice(1),source=path.join(distRoot,relative);if(fs.realpathSync(source)!==source||!fs.statSync(source).isFile())throw Error('PRIVATE_ASSET_SOURCE_REJECTED');return{url,relative,source,sha256:hash(fs.readFileSync(source))}});
 if(!entries.length)return {paths:[],status:'NO_PRIVATE_CHUNKS'};
 // Hostinger may run postinstall's build and then its explicit build command.
 // Reuse only byte-identical verified output; never overwrite an old generation.
 if(fs.existsSync(privateRoot)){
  createPrivateAssetRenderer({privateRoot,publicRoots:[distRoot,...additionalPublicRoots],manifest});
  const records=JSON.parse(fs.readFileSync(path.join(privateRoot,'ASSET_MANIFEST.json')));
  const expected=entries.map(({url,relative,sha256})=>({url,relative,sha256}));
  if(JSON.stringify(records)!==JSON.stringify(expected))throw Error('PRIVATE_ASSET_DESTINATION_COLLISION');
  for(const x of entries)fs.unlinkSync(x.source);
  return {status:'VERIFIED_IDENTICAL_PRIVATE_OUTPUT_REUSED',paths};
 }
 fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});
 for(const x of entries){const dest=path.join(privateRoot,x.relative);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.copyFileSync(x.source,dest,fs.constants.COPYFILE_EXCL);fs.chmodSync(dest,0o400);if(hash(fs.readFileSync(dest))!==x.sha256)throw Error('PRIVATE_ASSET_COPY_REJECTED')}
 // Remove originals only after every copy is verified; a partial failure is NOT deployable.
 for(const x of entries)fs.unlinkSync(x.source);
 fs.writeFileSync(path.join(privateRoot,'ASSET_MANIFEST.json'),JSON.stringify(entries.map(({url,relative,sha256})=>({url,relative,sha256})),null,2),{flag:'wx',mode:0o400});return {status:'PARTITIONED_NOT_DEPLOYED',paths};
}
export function createPrivateAssetRenderer({privateRoot,publicRoots,manifest}){
 location(privateRoot,publicRoots);if(fs.realpathSync(privateRoot)!==privateRoot)throw Error('PRIVATE_ASSET_PATH_REJECTED');
 const allowed=new Set(networkReviewAssetPaths(manifest));const records=JSON.parse(fs.readFileSync(path.join(privateRoot,'ASSET_MANIFEST.json')));const map=new Map();
 for(const x of records){if(!allowed.has(x.url)||x.relative!==x.url.slice(1)||map.has(x.url))throw Error('PRIVATE_ASSET_MANIFEST_REJECTED');const file=path.join(privateRoot,x.relative);if(fs.realpathSync(file)!==file||hash(fs.readFileSync(file))!==x.sha256)throw Error('PRIVATE_ASSET_IDENTITY_REJECTED');map.set(x.url,{file,sha256:x.sha256})}if(map.size!==allowed.size)throw Error('PRIVATE_ASSET_MANIFEST_REJECTED');
 // Mount ONLY behind the original authenticated dispatcher, never as express.static.
 return async(req,res)=>{const x=map.get(req.url);if(!x||!['GET','HEAD'].includes(req.method)){res.writeHead(404,{'Cache-Control':'private, no-store'});res.end();return}const b=fs.readFileSync(x.file);if(hash(b)!==x.sha256)throw Error('PRIVATE_ASSET_CHANGED');res.writeHead(200,{'Content-Type':({'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(x.file)]||'application/octet-stream','Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:b)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [distArg,privateArg]=process.argv.slice(2);if(!distArg||!privateArg)throw Error('USAGE: node privateAssets.mjs DIST_ROOT NONPUBLIC_ROOT');
 const distRoot=path.resolve(distArg),privateRoot=path.resolve(privateArg),manifest=JSON.parse(fs.readFileSync(path.join(distRoot,'.vite/manifest.json'),'utf8'));
 console.log(JSON.stringify(partitionPrivateAssets({distRoot,privateRoot,manifest,additionalPublicRoots:[path.resolve('public'),path.resolve('public_html')]})));
}
