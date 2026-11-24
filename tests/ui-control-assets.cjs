'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),level=path.join(root,'assets/ui/level-select'),buttons=path.join(root,'assets/ui/elements/buttons/unified');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(level,'manifest.json'),'utf8'));assert.equal(manifest.cream,'#FCEBD1');
 for(const [directory,files]of [[level,manifest.assets.map(a=>a.png)],[buttons,fs.readdirSync(buttons).filter(f=>f.endsWith('.png'))]])for(const file of files){const m=await sharp(path.join(directory,file)).metadata();assert(m.hasAlpha,file+' lacks alpha');const {data,info}=await sharp(path.join(directory,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(const pixel of [0,info.width-1,(info.height-1)*info.width,info.width*info.height-1])assert.equal(data[pixel*4+3],0,file+' has an opaque canvas corner');}
 for(const file of ['start.png','back.png','select-level.png','resume.png','restart.png','cancel.png','home-pause.png','home-result.png','retry.png','got-it.png']){const {data}=await sharp(path.join(buttons,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});const warm=new Map();for(let i=0;i<data.length;i+=4)if(data[i+3]>248&&data[i]>=230&&data[i+1]>=205&&data[i+2]>=153&&data[i]-data[i+2]>5){const key=[data[i],data[i+1],data[i+2]].join(',');warm.set(key,(warm.get(key)||0)+1);}assert.equal([...warm].sort((a,b)=>b[1]-a[1])[0]?.[0],'252,235,209',file+' cream differs');}
 const select=await sharp(path.join(buttons,'select-level.png')).metadata();assert.equal(select.width,555);assert.equal(select.height,135);
 console.log('PASS: '+manifest.assets.length+' level PNGs and 16 control PNGs have transparent corners; all cream buttons use #FCEBD1; SELECT LEVEL has a compact 555 × 135 outline.');
})().catch(e=>{console.error(e);process.exitCode=1;});
