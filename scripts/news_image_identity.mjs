// Persistent, cross-category photograph reservations. Features are recomputed
// from bounded original JPEG bytes, not trusted caller-supplied metadata.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import jpeg from 'jpeg-js';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const HISTORY_SEED_SHA256='5e7a5024bec068e80c2daa289d123c4dd1fd01dee96145500af53366f2da7b47';
export const canonicalPhotoSource=value=>{const u=new URL(value);return decodeURIComponent(u.origin+u.pathname).normalize('NFC').replace('/wiki/File:','/wiki/File:').replaceAll(' ','_')};
export function photoFeatures(bytes){
 if(bytes.length>20_000_000)throw Error('IMAGE_ORIGINAL_SIZE_LIMIT');
 const im=jpeg.decode(bytes,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:32,maxMemoryUsageInMB:384});
 const regions=[[0,0,1,1]];
 for(const scale of [.875,.75,.5])for(const x of [0,.5,1])for(const y of [0,.5,1])regions.push([x*(1-scale),y*(1-scale),scale,scale]);
 if(im.width/im.height>16/9){const f=(im.height*16/9)/im.width;regions.push([(1-f)/2,0,f,1])}else{const f=(im.width*9/16)/im.height;regions.push([0,(1-f)/2,1,f])}
 const signatures=regions.map(([ox,oy,sx,sy])=>{
  const values=[],rgb=[0,0,0];
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   let grey=0;
   // Area sampling suppresses high-frequency crop/resize aliasing before DCT.
   for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++){
    const px=Math.min(im.width-1,Math.floor((ox+(x+(bx+.5)/8)*sx/32)*im.width)),py=Math.min(im.height-1,Math.floor((oy+(y+(by+.5)/8)*sy/32)*im.height)),i=(py*im.width+px)*4;
    grey+=(.299*im.data[i]+.587*im.data[i+1]+.114*im.data[i+2])/64;for(let c=0;c<3;c++)rgb[c]+=im.data[i+c]/(65536*255);
   }values.push(grey);
  }
  const coeff=[];for(let u=0;u<8;u++)for(let v=0;v<8;v++){let n=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)n+=values[y*32+x]*Math.cos((2*x+1)*u*Math.PI/64)*Math.cos((2*y+1)*v*Math.PI/64);coeff.push(n)}
  const median=coeff.slice(1).sort((a,b)=>a-b)[31];let ph=0n,dh=0n;
  for(let i=0;i<64;i++){ph=(ph<<1n)|BigInt(i>0&&coeff[i]>median);const y=Math.floor(i/8)*4+2,x=(i%8)*3+2;dh=(dh<<1n)|BigInt(values[y*32+x]>values[y*32+x+3])}
  return {phash:ph.toString(16).padStart(16,'0'),dhash:dh.toString(16).padStart(16,'0'),rgb:rgb.map(n=>Number(n.toFixed(4)))};
 });
 return {algorithm:'DCT64_DHASH64_RGB_MULTICROP_V1',width:im.width,height:im.height,signatures};
}
export function hamming(a,b){let n=BigInt('0x'+a)^BigInt('0x'+b),count=0;while(n){n&=n-1n;count++}return count}
export function nearDuplicate(a,b){
 if(a.algorithm!==b.algorithm)throw Error('IMAGE_IDENTITY_ALGORITHM_MISMATCH');
 return a.signatures.some(x=>b.signatures.some(y=>{const p=hamming(x.phash,y.phash),d=hamming(x.dhash,y.dhash),color=x.rgb.reduce((n,c,i)=>n+Math.abs(c-y.rgb[i]),0);return color<.18&&((p<=6&&d<=10)||(p<=10&&d<=6))}));
}
const cache=new Map();
export function imageIdentityErrors(item,visual,{root=process.cwd(),registry,readFile}={}){
 const errors=[];try{
  const read=readFile||((p)=>fs.readFileSync(path.join(root,p)));registry??=JSON.parse(read('src/data/news_image_use_registry.json'));
  if(registry.schema_version!==1||!Array.isArray(registry.entries))throw Error('PERSISTENT_IMAGE_USE_REGISTRY_REQUIRED');
  const original=read(visual.original_local_path),id=sha(original),key=id;
  if(!cache.has(key))cache.set(key,photoFeatures(original));const features=cache.get(key);
  const own=registry.entries.find(e=>e.original_sha256===id);
  if(visual.original_sha256!==id)errors.push('IMAGE_ORIGINAL_IDENTITY_MISMATCH');
  for(const entry of registry.entries.filter(e=>e.kind==='PHOTOGRAPH')){
   if(entry.original_sha256===id&&entry.first_article_slug===item.slug)continue;
   if(entry.original_sha256===id||entry.asset_sha256s.includes(visual.asset_sha256)||entry.source_identity===canonicalPhotoSource(visual.original_source_url)||nearDuplicate(features,entry.features))errors.push('PHOTOGRAPH_ALREADY_USED_OR_NEAR_DUPLICATE: '+entry.first_article_slug);
  }
  if(own&&own.first_article_slug===item.slug&&JSON.stringify(own.features)!==JSON.stringify(features))errors.push('IMAGE_IDENTITY_REGISTRY_FEATURES_MISMATCH');
 }catch(e){errors.push('IMAGE_IDENTITY_REVIEW_REQUIRED: '+e.message)}return errors;
}
export function validateImageUseRegistry(root=process.cwd()){
 const registry=JSON.parse(fs.readFileSync(path.join(root,'src/data/news_image_use_registry.json'))),historyBytes=fs.readFileSync(path.join(root,'src/data/news_image_use_history.json')),history=JSON.parse(historyBytes),errors=[];
 if(sha(historyBytes)!==HISTORY_SEED_SHA256)errors.push('UNREVIEWED_HISTORICAL_IMAGE_RESERVATION_SEED');
 for(const old of history.entries)if(!registry.entries.some(e=>e.photo_id===old.photo_id&&JSON.stringify(e)===JSON.stringify(old)))errors.push('HISTORICAL_IMAGE_RESERVATION_REMOVED_OR_CHANGED');
 const news=JSON.parse(fs.readFileSync(path.join(root,'src/generated/news.json'))),visuals=JSON.parse(fs.readFileSync(path.join(root,'src/data/news_visuals.json')));
 const current=new Set();
 for(const item of news.items){const v=visuals[item.slug];if(v.kind!=='EDITORIAL_PHOTOGRAPH')continue;
  const entry=registry.entries.find(e=>e.original_sha256===sha(fs.readFileSync(path.join(root,v.original_local_path||history.legacy_original_paths[item.slug]))));
  const asset=v.asset_sha256||sha(fs.readFileSync(path.join(root,'public'+v.src))),reserved=entry&&(entry.asset_sha256s.includes(asset)||(registry.variant_reservations||[]).some(r=>r.photo_id===entry.photo_id&&r.article_slug===item.slug&&r.asset_sha256===asset));
  if(!entry||entry.first_article_slug!==item.slug||!reserved)errors.push('CURRENT_PHOTOGRAPH_RESERVATION_REQUIRED: '+item.slug);
  if(entry&&current.has(entry.photo_id))errors.push('CROSS_ARTICLE_PHOTOGRAPH_REUSE');if(entry)current.add(entry.photo_id);
  errors.push(...imageIdentityErrors(item,{...v,original_local_path:v.original_local_path||history.legacy_original_paths[item.slug],original_sha256:v.original_sha256||entry?.original_sha256,asset_sha256:v.asset_sha256||sha(fs.readFileSync(path.join(root,'public'+v.src)))},{root,registry}));
 }
 return {errors,photographs:current.size,history_entries:history.entries.length,registry_entries:registry.entries.length};
}
export function registerApprovedPhotoUse(item,visual,root=process.cwd()){
 const file=path.join(root,'src/data/news_image_use_registry.json'),registry=JSON.parse(fs.readFileSync(file));
 const errors=imageIdentityErrors(item,visual,{root,registry});if(errors.length)throw Error(errors.join('; '));
 const bytes=fs.readFileSync(path.join(root,visual.original_local_path)),id=sha(bytes),existing=registry.entries.find(e=>e.original_sha256===id);
 if(existing){if(!existing.asset_sha256s.includes(visual.asset_sha256)){registry.variant_reservations??=[];if(!registry.variant_reservations.some(r=>r.photo_id===id&&r.asset_sha256===visual.asset_sha256))registry.variant_reservations.push({photo_id:id,article_slug:item.slug,asset_sha256:visual.asset_sha256})}}
 else registry.entries.push({photo_id:id,kind:'PHOTOGRAPH',first_article_slug:item.slug,article_slugs:[item.slug],original_path:visual.original_local_path,original_sha256:id,asset_sha256s:[visual.asset_sha256],source_identity:canonicalPhotoSource(visual.original_source_url),original_source_url:visual.original_source_url,creator:visual.creator,licence:visual.licence,licence_url:visual.licence_url,attribution_required:visual.attribution_required,features:photoFeatures(bytes),reserved_since:item.updated_at||item.publication_date});
 fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n');return id;
}
