'use strict';
// Reuse the project's angular title glyphs and approved LY kerning; preserve the MISS coral.
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const {NAVY,normalizeRaster}=require('./normalize-ui-navy.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/ui/elements/feedback');
const source=fs.readFileSync(path.join(root,'scripts/build-level-select.cjs'),'utf8');
const literal=source.match(/const glyphs=(\{[^\n]+\});/)[1],glyphs=Function('return ('+literal+')')();
function lettering(text){let x=0,paths='',previous='';for(const ch of text){if(ch===' '){x+=34;previous='';continue;}if(previous==='L'&&ch==='Y')x-=26;previous=ch;paths+=`<path transform="translate(${x} 0)" d="${glyphs[ch]}"/>`;x+=({T:90,Y:92,A:87,R:89,'!':28}[ch]||82)+9;}return {x,paths};}
(async()=>{const previews=[];fs.mkdirSync(path.join(root,'test-output'),{recursive:true});
 for(const [name,text]of [['too-early','TOO EARLY!'],['too-late','TOO LATE!']]){
  const {x,paths}=lettering(text),art=`<g fill-rule="evenodd" stroke-linejoin="round" transform="translate(54 132) rotate(-7) skewX(-13)"><g fill="${NAVY}" stroke="${NAVY}" stroke-width="22" transform="translate(3 7)">${paths}</g><g fill="#FF5537" stroke="${NAVY}" stroke-width="17" paint-order="stroke fill">${paths}</g></g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${x+120}" height="280" viewBox="0 0 ${x+120} 280" role="img" aria-label="${text}">${art}</svg>`;fs.writeFileSync(path.join(out,name+'.svg'),svg);
  const raw=await sharp(Buffer.from(svg),{density:144}).trim({background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).png().toBuffer();const png=(await normalizeRaster(raw)).buffer;fs.writeFileSync(path.join(out,name+'.png'),png);const m=await sharp(png).metadata();previews.push({png,width:m.width,height:m.height});
 }
 const width=Math.max(...previews.map(a=>a.width))+80,height=previews.reduce((s,a)=>s+a.height,0)+120;let top=40;
 await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(previews.map(a=>{const layer={input:a.png,left:Math.round((width-a.width)/2),top};top+=a.height+40;return layer;})).png().toFile(path.join(root,'test-output/timing-feedback-preview.png'));
 console.log('Built transparent TOO EARLY! and TOO LATE! PNG/SVG assets in '+NAVY+' and #FF5537.');
})().catch(e=>{console.error(e);process.exitCode=1;});
