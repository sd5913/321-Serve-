'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require(process.env.SHARP_MODULE||'sharp');
const {NAVY,RGB,isNavy,normalizeSVG}=require('../scripts/normalize-ui-navy.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{let pngs=0,svgs=0;for(const dir of ['assets/ui/elements','assets/ui/level-select'])for(const name of fs.readdirSync(path.join(root,dir),{recursive:true})){const relative=dir+'/'+name,file=path.join(root,relative);if(relative==='assets/ui/elements/branding/logo-321-serve.png'||relative.endsWith('-hd.png'))continue;
 // Vector-exported tutorial PNGs retain antialiasing; their source SVG palette is checked below.
 if(name.endsWith('.png')&&relative.startsWith('assets/ui/elements/tutorial/rice-rice-baby/'))continue;
 if(name.endsWith('.png')){const {data}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=0;i<data.length;i+=4)if(data[i+3]&&isNavy(data[i],data[i+1],data[i+2]))assert(data[i]===RGB[0]&&data[i+1]===RGB[1]&&data[i+2]===RGB[2],relative+' has a different navy');pngs++;}
 if(name.endsWith('.svg')){const text=fs.readFileSync(file,'utf8');assert.equal(await normalizeSVG(text),text,relative+' needs navy normalization');svgs++;}
 }
 assert(fs.readFileSync(path.join(root,'style.css'),'utf8').includes('--ink:#00133a'));
 for(const name of ['too-early','too-late']){const {data,info}=await sharp(path.join(root,'assets/ui/elements/feedback/'+name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(const pixel of [0,info.width-1,(info.height-1)*info.width,info.width*info.height-1])assert.equal(data[pixel*4+3],0);assert(fs.readFileSync(path.join(root,'assets/ui/elements/feedback/'+name+'.svg'),'utf8').includes('#FF5537'));}
 console.log('PASS: '+pngs+' standalone PNGs and '+svgs+' SVGs use '+NAVY+'; timing labels retain coral and transparent corners.');
})().catch(e=>{console.error(e);process.exitCode=1;});
