'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..');
(async()=>{const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/crisp-assets.json')));let lowest=1;
 for(const item of manifest.assets){const svg=fs.readFileSync(path.join(root,item.svg),'utf8');assert(!svg.includes('d=""'),item.svg+' contains an empty artwork path');assert(!/<image\b|data:image|<filter\b/.test(svg),item.svg+' is not a true path vector');const src=await sharp(path.join(root,item.source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});const rendered=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(rendered.info.width,src.info.width+8);assert.equal(rendered.info.height,src.info.height+8);
  let intersection=0,union=0;for(let y=0;y<src.info.height;y++)for(let x=0;x<src.info.width;x++){const a=src.data[(y*src.info.width+x)*4+3]>=128,b=rendered.data[((y+4)*rendered.info.width+x+4)*4+3]>=128;if(a&&b)intersection++;if(a||b)union++;}const overlap=intersection/union;lowest=Math.min(lowest,overlap);assert(overlap>.96,item.svg+' lost its silhouette: '+overlap);
  for(let x=0;x<rendered.info.width;x++){assert.equal(rendered.data[x*4+3],0);assert.equal(rendered.data[((rendered.info.height-1)*rendered.info.width+x)*4+3],0);}for(let y=0;y<rendered.info.height;y++){assert.equal(rendered.data[(y*rendered.info.width)*4+3],0);assert.equal(rendered.data[(y*rendered.info.width+rendered.info.width-1)*4+3],0);}
 }
 // Alpha-only silhouettes cannot detect missing lettering on an opaque button.
 for(const name of ['resume','quit']){
  const stem=path.join(root,'assets/ui/elements/buttons/unified',name),svg=fs.readFileSync(stem+'.svg','utf8');
  assert(!svg.includes('d=""'),name+' has empty lettering');
  const src=await sharp(stem+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),dst=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let sourceInk=0,outputInk=0,intersection=0,union=0;
  const ink=(data,i)=>data[i+3]>127&&data[i]<65&&data[i+1]<85&&data[i+2]<125;
  for(let y=Math.ceil(src.info.height*.2);y<src.info.height*.8;y++)for(let x=Math.ceil(src.info.width*.18);x<src.info.width*.82;x++){
   const a=ink(src.data,(y*src.info.width+x)*4),b=ink(dst.data,((y+4)*dst.info.width+x+4)*4);
   if(a)sourceInk++;if(b)outputInk++;if(a&&b)intersection++;if(a||b)union++;
  }
  assert(sourceInk>100&&outputInk>100,name+' lettering is missing');assert(intersection/union>.92,name+' letterforms changed');
 }
 for(let i=1;i<=4;i++)assert(!fs.readFileSync(path.join(root,'assets/ui/level-select/level-'+i+'.svg'),'utf8').includes('data:image'));
 assert(!fs.readFileSync(path.join(root,'style.css'),'utf8').includes('filter:url(#unify-cream)'));
 console.log('PASS: '+manifest.assets.length+' true vector UI assets; silhouettes retained (minimum overlap '+lowest.toFixed(4)+'); transparent safety margins intact; no raster digits or live recolor filters.');
})().catch(e=>{console.error(e);process.exitCode=1;});
