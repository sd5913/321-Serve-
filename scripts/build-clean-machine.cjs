'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp'),potrace=require(process.env.POTRACE_MODULE||'potrace');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/level1/ui');
(async()=>{const {data,info}=await sharp(path.join(root,'assets/level1/imgMachineNormal1.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width,height}=info;
const colors=['#193550','#87DCB0','#478F75','#FCEBD1','#E8D0AE','#C7AD89','#8B806F','#D8DFE8','#C2CBD8','#9EAABD','#697D94'],masks=colors.map(()=>Buffer.alloc(width*height,255)),whole=Buffer.alloc(width*height,255);
for(let i=0,p=0;i<data.length;i+=4,p++){if(data[i+3]<128)continue;whole[p]=0;const [r,g,b]=data.subarray(i,i+3),l=.2126*r+.7152*g+.0722*b;let k=0;
if(g>r*1.15&&g>b*1.08)k=l>170?1:2;
else if(r>g*1.005&&r-b>15&&g>b*1.02)k=r>230&&g>210&&b>170?3:r>210&&g>175&&b>135?4:l>130?5:6;
else k=l>202?7:l>165?8:l>130?9:l>95?10:0;
masks[k][p]=0;}
const trace=async(mask,color,threshold=128)=>{const png=await sharp(mask,{raw:{width,height,channels:1}}).blur(1.2).threshold(threshold).png().toBuffer();return new Promise((resolve,reject)=>potrace.trace(png,{threshold:128,color,turdSize:64,alphaMax:1,optCurve:true,optTolerance:.25},(e,svg,instance)=>e?reject(e):resolve(instance.getPathTag())));};
let body=await trace(whole,colors[3]);for(let k=1;k<7;k++)body+=await trace(masks[k],colors[k],180);
const metal=Buffer.alloc(width*height,255);for(let p=0;p<metal.length;p++)if(masks.slice(7).some(m=>m[p]===0))metal[p]=0;body+=await trace(metal,'#C2CBD8',180);
body+='<g transform="translate(1536 0) rotate(90)"><rect x="112" y="540" width="258" height="470" rx="60" fill="#FCEBD1"/><rect x="240" y="602" width="92" height="335" rx="40" fill="#E8D0AE" stroke="#C7AD89" stroke-width="5"/><rect x="123" y="564" width="210" height="373" rx="48" fill="none" stroke="#B69D79" stroke-width="5"/></g>';
body+=await trace(masks[0],colors[0]);body+='<g transform="translate(1536 0) rotate(90)"><circle cx="391" cy="494" r="27" fill="#85F12A" stroke="#193550" stroke-width="7"/><circle cx="615" cy="620" r="18" fill="#C2CBD8" stroke="#697D94" stroke-width="5"/><circle cx="615" cy="910" r="18" fill="#C2CBD8" stroke="#697D94" stroke-width="5"/></g>';const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Rice machine, clean flat colors">${body}</svg>`;
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'machine-clean.svg'),svg);await sharp(Buffer.from(svg),{density:144}).png({compressionLevel:9}).toFile(path.join(out,'machine-clean.png'));console.log('Built opaque flat-color machine using original contours; reference PNG preserved.');})();
