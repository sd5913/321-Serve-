'use strict';
// Canonical flat UI navy: most frequent opaque navy pixel in the supplied 321 Serve logo.
// Keep the reference logo, illustration layers, complete-screen references and source sheets intact.
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const NAVY='#00133A',RGB=[0,19,58];
const isNavy=(r,g,b)=>r<=65&&g<=85&&b<=125&&b>=r+7&&b>=g+6;
function normalizeHex(text){return text.replace(/#([\da-f]{6})([\da-f]{2})?\b/gi,(match,hex,alpha='')=>{const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));return isNavy(...rgb)?NAVY+alpha:match;});}
async function normalizeRaster(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let changed=0;
 for(let i=0;i<data.length;i+=4)if(data[i+3]&&isNavy(data[i],data[i+1],data[i+2])&&(data[i]!==RGB[0]||data[i+1]!==RGB[1]||data[i+2]!==RGB[2])){data[i]=RGB[0];data[i+1]=RGB[1];data[i+2]=RGB[2];changed++;}
 return {changed,buffer:changed?await sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer():input};}
async function normalizeSVG(input){let result=normalizeHex(input),offset=0;const matches=[...result.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];for(const m of matches){const normalized=await normalizeRaster(Buffer.from(m[1],'base64'));if(normalized.changed){const old=m[0],next='data:image/png;base64,'+normalized.buffer.toString('base64'),start=m.index+offset;result=result.slice(0,start)+next+result.slice(start+old.length);offset+=next.length-old.length;}}return result;}
async function normalizeUIAssets(root=path.resolve(__dirname,'..')){const folders=['assets/ui/elements','assets/ui/level-select'],changed=[];for(const folder of folders){const full=path.join(root,folder);for(const name of fs.readdirSync(full,{recursive:true})){const file=path.join(full,name),relative=path.relative(root,file).split(path.sep).join('/');if(relative==='assets/ui/elements/branding/logo-321-serve.png')continue;
 if(name.endsWith('.png')){const original=fs.readFileSync(file),result=await normalizeRaster(original);if(result.changed){fs.writeFileSync(file,result.buffer);changed.push({path:relative,pixels:result.changed});}}
 else if(name.endsWith('.svg')){const original=fs.readFileSync(file,'utf8'),result=await normalizeSVG(original);if(result!==original){fs.writeFileSync(file,result);changed.push({path:relative});}}
 }}return changed;}
module.exports={NAVY,RGB,isNavy,normalizeHex,normalizeRaster,normalizeSVG,normalizeUIAssets};
if(require.main===module)normalizeUIAssets().then(changed=>{fs.writeFileSync(path.resolve(__dirname,'../.navy-report.json'),JSON.stringify(changed,null,2));console.log('Normalized '+changed.length+' independent UI assets to '+NAVY);}).catch(e=>{console.error(e);process.exitCode=1;});
