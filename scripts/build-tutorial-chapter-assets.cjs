'use strict';
// Development-only vector/PNG exports. Number bodies exclude detached accent marks.
const fs=require('node:fs'),path=require('node:path');
async function alphaBounds(sharp,file,largest=false){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height;
 const mask=Uint8Array.from({length:w*h},(_,p)=>data[p*4+3]>127?1:0);let pixels=[];
 if(largest){
  for(let p=0;p<mask.length;p++)if(mask[p]){
   const queue=[p];mask[p]=0;
   for(let k=0;k<queue.length;k++){
    const v=queue[k],x=v%w,y=Math.floor(v/w);
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+dx,ny=y+dy,j=ny*w+nx;
     if(nx>=0&&nx<w&&ny>=0&&ny<h&&mask[j]){mask[j]=0;queue.push(j);}
    }
   }
   if(queue.length>pixels.length)pixels=queue;
  }
 }else for(let p=0;p<mask.length;p++)if(mask[p])pixels.push(p);
 let left=w,top=h,right=0,bottom=0;
 for(const p of pixels){const x=p%w,y=Math.floor(p/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 return {left,top,width:right-left,height:bottom-top,sourceWidth:w,sourceHeight:h};
}
async function build(root,sharp){
 const out=path.join(root,'assets/ui/elements/tutorial/rice-rice-baby');
 const go=await alphaBounds(sharp,path.join(out,'countdown-go.svg'));
 for(const n of [1,2,3]){
  const file=path.join(root,'assets/ui/elements/countdown',n+'.svg'),box=await alphaBounds(sharp,file,true),scale=go.height/box.height;
  let svg=fs.readFileSync(file,'utf8');
  svg=svg.replace('<svg ',`<svg x="${(950-box.width*scale)/2-box.left*scale}" y="${(340-box.height*scale)/2-box.top*scale}" `)
   .replace(/width="[^"]+"/,`width="${box.sourceWidth*scale}"`).replace(/height="[^"]+"/,`height="${box.sourceHeight*scale}"`);
  fs.writeFileSync(path.join(out,'countdown-'+n+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="950" height="340" viewBox="0 0 950 340">${svg}</svg>`);
 }
 const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="1950" height="900" viewBox="0 0 1950 900">${body}</svg>`;
 const layers={
  'block-left':'<path d="M0 0H545L260 900H0Z" fill="#A9E8C6"/>',
  'block-right':'<path d="M1590 0H1950V900H1305Z" fill="#71CEA0"/>',
  'block-bottom':'<path d="M0 685L530 900H0Z" fill="#BDEED4"/>',
  'block-top':'<path d="M1725 0H1950V168Z" fill="#BDEED4"/>'
 };
 for(const [name,art]of Object.entries(layers))fs.writeFileSync(path.join(out,name+'.svg'),wrap(art));
 fs.writeFileSync(path.join(out,'background-blocks.svg'),wrap('<rect width="1950" height="900" fill="#87DCB0"/>'+Object.values(layers).join('')));
 const result=path.join(root,'assets/ui/elements/result/background-rice-green.svg');
 fs.writeFileSync(result,wrap('<defs><radialGradient id="base" cx="70%" cy="38%" r="90%"><stop stop-color="#75D3A5"/><stop offset="1" stop-color="#60C597"/></radialGradient><linearGradient id="circle" x2="1" y2="1"><stop stop-color="#A9E8C6"/><stop offset="1" stop-color="#87DCB0"/></linearGradient></defs><rect width="1950" height="900" fill="url(#base)"/><circle cx="0" cy="1023" r="897" fill="url(#circle)"/>'));
 await sharp(result,{density:144}).png({compressionLevel:9}).toFile(result.replace(/\.svg$/,'.png'));
}
module.exports={build,alphaBounds};
