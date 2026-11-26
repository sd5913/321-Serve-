'use strict';
// Offline asset preparation only. npm install --no-save sharp potrace
// Preserve the supplied letterforms by tracing their existing silhouettes, not substituting a font.
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const potrace=require(process.env.POTRACE_MODULE||'potrace');
const root=path.resolve(__dirname,'..'),NAVY='#00133A',CREAM='#FCEBD1',CORAL='#FF5537',YELLOW='#FFE879';
function trace(mask,width,height,color,turdSize){return sharp(mask,{raw:{width,height,channels:1}}).png().toBuffer().then(buffer=>new Promise((resolve,reject)=>potrace.trace(buffer,{threshold:128,color,turdSize,alphaMax:1,optCurve:true,optTolerance:.12},(error,svg,instance)=>error?reject(error):resolve(instance.getPathTag()))));}
async function vectorize(input,label){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width,height}=info,masks=Array.from({length:4},()=>Buffer.alloc(width*height,255)),whole=Buffer.alloc(width*height,255),counts=[0,0,0,0];
 for(let i=0,p=0;i<data.length;i+=4,p++){if(data[i+3]<128)continue;whole[p]=0;const [r,g,b]=data.subarray(i,i+3);const index=r>175&&g<170&&r>g*1.2?2:r>200&&g>170&&b<155?3:(r*.2126+g*.7152+b*.0722)>145?1:0;masks[index][p]=0;counts[index]++;}
 const pillNames=new Set(['start','back','got-it','resume','restart','home-pause','home-result','cancel','quit','retry']);
 if(pillNames.has(label)){
  const fillIndex=counts[2]>counts[1]?2:1,fill=[NAVY,CREAM,CORAL,YELLOW][fillIndex];
  const bounds=mask=>{let l=width,t=height,r=0,b=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x]===0){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);}return {l,t,w:r-l,h:b-t};};
  const outer=bounds(whole),fillMask=masks[fillIndex];
  // Ignore pale antialias fringes outside the navy border when finding the capsule fill.
  const runEdge=(start,end,step,at)=>{for(let n=start;step>0?n<=end:n>=end;n+=step)if([0,1,2].every(k=>fillMask[at(n+k*step)]===0))return n;throw Error('No solid capsule fill in '+label);};
  const mx=Math.floor(outer.l+outer.w/2),my=Math.floor(outer.t+outer.h/2);
  const il=runEdge(outer.l,outer.l+outer.w-3,1,x=>my*width+x),ir=runEdge(outer.l+outer.w-1,outer.l+2,-1,x=>my*width+x);
  const it=runEdge(outer.t,outer.t+outer.h-3,1,y=>y*width+mx),ib=runEdge(outer.t+outer.h-1,outer.t+2,-1,y=>y*width+mx);
  const inner={l:il,t:it,w:ir-il+1,h:ib-it+1},textMasks=[Buffer.alloc(width*height,255),Buffer.alloc(width*height,255)],textCounts=[0,0],radius=inner.h/2;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const px=x+.5,py=y+.5,cx=Math.max(inner.l+radius,Math.min(inner.l+inner.w-radius,px)),cy=inner.t+radius;const inside=Math.hypot(px-cx,py-cy)<radius-2;if(inside)for(let k=0;k<2;k++)if(k!==fillIndex&&masks[k][y*width+x]===0){textMasks[k][y*width+x]=0;textCounts[k]++;}}
  // Coral buttons can have navy or cream lettering; follow the supplied artwork.
  const textIndex=textCounts[0]>=textCounts[1]?0:1;
  if(!textCounts[textIndex])throw Error('No lettering found in '+label);
  const letters=await trace(textMasks[textIndex],width,height,[NAVY,CREAM][textIndex],2);
  const shapes=`<rect x="${outer.l}" y="${outer.t}" width="${outer.w}" height="${outer.h}" rx="${outer.h/2}" fill="${NAVY}"/><rect x="${inner.l}" y="${inner.t}" width="${inner.w}" height="${inner.h}" rx="${inner.h/2}" fill="${fill}"/>`+letters;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width+8}" height="${height+8}" viewBox="-4 -4 ${width+8} ${height+8}" data-crisp-ui="true" role="img" aria-label="${label}">${shapes}</svg>`;
 }
 const size=Math.max(2,Math.round(width*height/150000));let paths='';if(counts[0])paths+=await trace(whole,width,height,NAVY,size);for(let i=counts[0]?1:0;i<4;i++)if(counts[i])paths+=await trace(masks[i],width,height,[NAVY,CREAM,CORAL,YELLOW][i],size);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width+8}" height="${height+8}" viewBox="-4 -4 ${width+8} ${height+8}" data-crisp-ui="true" role="img" aria-label="${label.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${paths}</svg>`;
}
(async()=>{let candidates=[...new Set((fs.readFileSync(path.join(root,'index.html'),'utf8')+fs.readFileSync(path.join(root,'style.css'),'utf8')).match(/assets\/ui\/elements\/[^\s"'()<>]+\.png/g)||[])];
 candidates.push(...['on-beat','miss'].map(n=>'assets/ui/elements/feedback/'+n+'.png'),...[1,2,3].map(n=>'assets/ui/elements/countdown/'+n+'.png'),...Array.from({length:101},(_,n)=>'assets/ui/elements/result/percentages/'+String(n).padStart(3,'0')+'.png'));
 // A subsequent run remains reproducible after runtime references have switched to SVG.
 const manifestPath=path.join(root,'assets/ui/crisp-assets.json');if(fs.existsSync(manifestPath))candidates.push(...JSON.parse(fs.readFileSync(manifestPath,'utf8')).assets.map(a=>a.source));
 candidates=[...new Set(candidates)];const generated=[];
 for(const source of candidates){const destination=source.replace(/\.png$/,'.svg'),file=path.join(root,destination);if(fs.existsSync(file)&&!fs.readFileSync(file,'utf8').includes('data-crisp-ui="true"'))continue;
  const svg=await vectorize(fs.readFileSync(path.join(root,source)),path.basename(source,'.png'));fs.writeFileSync(file,svg);generated.push({source,svg:destination});if(generated.length%20===0)console.log('Vectorized '+generated.length+' UI assets');
 }
 for(const n of [1,2,3,4]){const file=path.join(root,'assets/ui/level-select/level-'+n+'.svg');let svg=fs.readFileSync(file,'utf8');const match=svg.match(/<image href="data:image\/png;base64,([^\"]+)"[^>]*\/>/);if(match){let digit=await vectorize(Buffer.from(match[1],'base64'),'Level '+n);digit=digit.replace('<svg ','<svg x="111" y="99" ').replace(/width="[^"]+"/,'width="282"').replace(/height="[^"]+"/,'height="297"');svg=svg.replace(match[0],digit);fs.writeFileSync(file,svg);}}
 fs.writeFileSync(manifestPath,JSON.stringify({navy:NAVY,cream:CREAM,description:'True vector companions; supplied PNGs remain intact. Paths follow the original artwork, with transparent safety margins.',assets:generated},null,2)+'\n');
 const logo=path.join(root,'assets/ui/elements/branding/logo-321-serve.svg');await sharp(fs.readFileSync(logo),{density:288}).png().toFile(path.join(root,'assets/ui/elements/branding/logo-321-serve-hd.png'));
 console.log('Prepared '+generated.length+' true-vector UI companions and four vector-only level badges.');
})().catch(error=>{console.error(error);process.exitCode=1;});
