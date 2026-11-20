'use strict';
// Reuse the original artwork and normalize its cream through an SVG color filter.
// Original source PNGs are never overwritten.
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),buttonDir=path.join(root,'assets/ui/elements/buttons'),out=path.join(buttonDir,'unified'),levelDir=path.join(root,'assets/ui/level-select'),build=path.join(root,'.button-assets-build');
const ink='#07162d',cream='#fcebd1';
const filter=`<filter id="cream" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 20 0 0 -16" result="g"/><feComponentTransfer in="g" result="green"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer><feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 20 0 -12" result="b"/><feComponentTransfer in="b" result="blue"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer><feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 20 0 -20 0 -0.4" result="w"/><feComponentTransfer in="w" result="warm"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer><feComposite in="green" in2="blue" operator="in" result="light"/><feComposite in="light" in2="warm" operator="in" result="area"/><feComposite in="area" in2="SourceAlpha" operator="in" result="mask"/><feComposite in="SourceGraphic" in2="mask" operator="out" result="keep"/><feFlood flood-color="${cream}" result="color"/><feComposite in="color" in2="mask" operator="in" result="mapped"/><feMerge><feMergeNode in="keep"/><feMergeNode in="mapped"/></feMerge></filter>`;
function wrap(w,h,content){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${filter}</defs>${content}</svg>`;}
function image(data,w,h){return `<image href="data:image/png;base64,${data.toString('base64')}" width="${w}" height="${h}" filter="url(#cream)"/>`;}
async function render(svg,destination){await sharp(Buffer.from(svg)).png({palette:true,colours:256,dither:0,compressionLevel:9}).toFile(destination);}
(async()=>{
 for(const dir of [out,levelDir,build])fs.mkdirSync(dir,{recursive:true});
 const sources=fs.readdirSync(buttonDir).filter(n=>n.endsWith('.png'));
 for(const name of sources){const data=fs.readFileSync(path.join(buttonDir,name)),m=await sharp(data).metadata(),svg=wrap(m.width,m.height,image(data,m.width,m.height));fs.writeFileSync(path.join(build,name.replace('.png','.svg')),svg);await render(svg,path.join(out,name));}
 const original=fs.readFileSync(path.join(buttonDir,'start.png'));
 const label=fs.readFileSync(path.join(levelDir,'select-level.svg'),'utf8').replace(/<svg /,'<svg x="54" y="37" ').replace(/width="[^"]+"/,'width="447"').replace(/height="[^"]+"/,'height="100"');
 const select=wrap(555,187,image(original,555,187)+`<rect x="82" y="35" width="398" height="100" fill="${cream}"/>`+label);
 fs.writeFileSync(path.join(build,'select-level-button.svg'),select);await render(select,path.join(out,'select-level.png'));
 const vectors={
  'arrow-left':`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="95" viewBox="0 0 90 95"><circle cx="45" cy="50" r="45" fill="${ink}"/><circle cx="45" cy="45" r="42.25" fill="${cream}" stroke="${ink}" stroke-width="5.5"/><path d="M51.5 27.9 34.4 45l17.1 17.1" fill="none" stroke="${ink}" stroke-width="7.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'arrow-right':`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="95" viewBox="0 0 90 95"><circle cx="45" cy="50" r="45" fill="${ink}"/><circle cx="45" cy="45" r="42.25" fill="${cream}" stroke="${ink}" stroke-width="5.5"/><path d="m38.5 27.9 17.1 17.1-17.1 17.1" fill="none" stroke="${ink}" stroke-width="7.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'dot-active':`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${ink}"/></svg>`,
  'dot-inactive':`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${cream}" stroke="${ink}" stroke-width="3"/></svg>`
 };
 const rays=`<g transform="translate(15 20) rotate(-8 34 57.5)" fill="${cream}"><rect x="0" y="13.8" width="57.8" height="14.95" rx="2" transform="rotate(34 57.8 21.275)"/><rect x="-10.2" y="48.3" width="57.8" height="14.95" rx="2"/><rect x="0" y="82.8" width="57.8" height="14.95" rx="2" transform="rotate(-34 57.8 90.275)"/></g>`;
 vectors['highlight-left']=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="155" viewBox="0 0 100 155">${rays}</svg>`;
 vectors['highlight-right']=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="155" viewBox="0 0 100 155"><g transform="translate(100 0) scale(-1 1)">${rays}</g></svg>`;
 for(const [name,svg]of Object.entries(vectors))fs.writeFileSync(path.join(levelDir,name+'.svg'),svg);
 for(const [from,name]of [['start.png','start-button'],['back.png','back-button'],['settings-gear.png','settings'],['select-level.png','select-level-button']])fs.copyFileSync(path.join(out,from),path.join(levelDir,name+'.png'));
 const logo=fs.readFileSync(path.join(root,'assets/ui/elements/branding/logo-321-serve.png')),m=await sharp(logo).metadata();await render(wrap(m.width,m.height,image(logo,m.width,m.height)),path.join(levelDir,'logo.png'));
 for(const name of fs.readdirSync(levelDir).filter(n=>n.endsWith('.svg')))await render(fs.readFileSync(path.join(levelDir,name),'utf8'),path.join(levelDir,name.replace('.svg','.png')));
 const manifest=JSON.parse(fs.readFileSync(path.join(levelDir,'manifest.json'),'utf8'));manifest.cream=cream.toUpperCase();manifest.assets=[];
 for(const name of fs.readdirSync(levelDir).filter(n=>n.endsWith('.png')).sort()){const m=await sharp(path.join(levelDir,name)).metadata();manifest.assets.push({png:name,...(fs.existsSync(path.join(levelDir,name.replace('.png','.svg')))?{svg:name.replace('.png','.svg')}:{}),width:m.width,height:m.height,transparent:true});}
 fs.writeFileSync(path.join(levelDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Built '+sources.length+' unified original controls, SELECT LEVEL with the original START silhouette, and '+manifest.assets.length+' transparent level assets.');
})().catch(e=>{console.error(e);process.exitCode=1;});
