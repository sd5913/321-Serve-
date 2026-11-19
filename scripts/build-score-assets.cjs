'use strict';
// Pack the supplied transparent glyph sheet without redrawing its lettering.
// npm install --no-save sharp, then: node scripts/build-score-assets.cjs
const sharp=require(process.env.SHARP_MODULE||'sharp');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),sheet=path.join(root,'assets/ui/source/score-glyphs.png');
const out=path.join(root,'assets/ui/elements/result/percentages');
const cells=[
 ['0',0,0,385,370],['1',385,0,320,370],['2',705,0,385,370],
 ['3',1090,0,357,370],['4',1447,0,365,370],['5',1812,0,360,370],
 ['6',0,380,375,344],['7',375,380,317,344],['8',692,380,352,344],
 ['9',1044,380,356,344],['%',1400,380,335,344],['go',1735,380,437,344]
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});const glyphs={};
 for(const [key,left,top,width,height] of cells){
  const {data,info}=await sharp(sheet).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Normalize nearly opaque fills and invisible fringe noise for a compact PNG.
  // Preserve the antialiased contour between these limits.
  for(let i=0;i<data.length;i+=4){if(data[i+3]>=247)data[i+3]=255;else if(data[i+3]<=6)data.fill(0,i,i+4);}
  let x0=width,y0=height,x1=0,y1=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(width-1,x1+3);y1=Math.min(height-1,y1+3);
  const buffer=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:300}).png().toBuffer();
  const meta=await sharp(buffer).metadata();glyphs[key]={buffer,width:meta.width,height:meta.height};
 }
 // Shared baseline and height; overlapping transparent side bearings tighten spacing.
 for(let value=0;value<=100;value++){
  let x=4;const parts=[];
  for(const key of String(value)+'%'){const g=glyphs[key];parts.push({input:g.buffer,left:x,top:4});x+=g.width-58;}
  const width=Math.max(...parts.map(p=>p.left+glyphs[(String(value)+'%')[parts.indexOf(p)]].width))+4;
  await sharp({create:{width,height:308,channels:4,background:'#00000000'}}).composite(parts).png({palette:true,colours:256,dither:0,compressionLevel:9,effort:10}).toFile(path.join(out,String(value).padStart(3,'0')+'.png'));
 }
 await sharp(glyphs.go.buffer).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png({palette:true,colours:256,dither:0,compressionLevel:9,effort:10}).toFile(path.join(root,'assets/ui/elements/countdown/go.png'));
 console.log('Built 101 transparent percentages and GO! from the supplied glyphs.');
})().catch(e=>{console.error(e);process.exitCode=1;});
