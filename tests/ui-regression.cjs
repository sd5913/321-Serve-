'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),UI=require('../ui-state.js');
const notes=Array.from({length:14},(_,i)=>({t:2+i*.5,result:null}));
assert.deepEqual(UI.hudWindow(notes,2).cells.map(n=>n.result),Array(6).fill('pending'));
assert.deepEqual(UI.hudWindow(notes,2.4).cells.map(n=>n.result),Array(6).fill('pending'),'time alone never paints a hit');
notes[0].result='perfect';notes[1].result='good';notes[2].result='miss';
assert.deepEqual(UI.hudWindow(notes,3.2).cells.map(n=>n.result),['hit','hit','miss','pending','pending','pending']);
assert.equal(UI.hudWindow(notes,4.84).page,0);
assert.equal(UI.hudWindow(notes,4.85).page,1);
assert.equal(UI.hudWindow(notes,4.95,200).page,0,'compensation uses the same clock as judgment');
assert.equal(UI.hudWindow(notes,8).page,2);
assert.deepEqual(UI.hudWindow(notes,8).cells.map(n=>n.result),['pending','pending','unused','unused','unused','unused']);
assert.notEqual(UI.percentSVG(0),UI.percentSVG(100),'score artwork is data driven');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
assert(!/[\u3400-\u9fff]/u.test(source+html+css),'runtime UI is English');
assert(!source.includes('i===b%6'),'automatic cycling HUD removed');
assert(css.includes('aspect-ratio:1')&&css.includes('object-fit:contain'),'HUD dots remain round');
const refs=new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]));
for(const m of css.matchAll(/url\(['"]?([^)'"]+)['"]?\)/g))refs.add(m[1]);
for(const m of source.matchAll(/['"](assets\/[^'"]+)['"]/g))if(!m[1].endsWith('/'))refs.add(m[1]);
for(const m of source.matchAll(/ui\s*\+\s*['"]([^'"]+)['"]/g))refs.add('assets/ui/elements/'+m[1]);
for(const ref of refs)assert(fs.existsSync(path.join(root,ref)),'missing '+ref);
console.log('PASS: HUD results, note pages, input compensation, partial page, dynamic percentage, English UI, local asset paths');
if(!process.env.CANVAS_MODULE){console.log('Canvas integration smoke skipped (set CANVAS_MODULE to @napi-rs/canvas).');process.exit(0);}
const {createCanvas,Image,GlobalFonts}=require(process.env.CANVAS_MODULE);
GlobalFonts.registerFromPath(path.join(root,'assets/fonts/IBMPlexMono-Regular.ttf'),'IBM Plex Mono');
const raster=createCanvas(1200,675),ctx=raster.getContext('2d'),listeners={},elements=new Map();
class El{
 constructor(id,tag='button'){this.id=id;this.tagName=tag;this.hidden=false;this.disabled=false;this.value='0';this.min='0';this.max='100';this.dataset={};this.attrs={};this.textContent='';this.style={setProperty:(k,v)=>{this.style[k]=v;}};}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
 focus(){document.activeElement=this;}matches(s){return s===this.tagName;}
 click(){return this.onclick?.({target:this});}
}
for(const m of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
 const e=new El(m[3],m[1]);e.hidden=/\bhidden\b/.test(m[2]);e.disabled=/\bdisabled\b/.test(m[2]);
 for(const key of ['value','min','max']){const a=m[2].match(new RegExp(key+'="([^"]+)"'));if(a)e[key]=a[1];}
 elements.set(e.id,e);
}
const canvas=elements.get('canvas');
canvas.getContext=()=>ctx;canvas.getBoundingClientRect=()=>({width:1300,height:600});
Object.defineProperty(canvas,'width',{get:()=>raster.width,set:v=>{raster.width=v;}});
Object.defineProperty(canvas,'height',{get:()=>raster.height,set:v=>{raster.height=v;}});
const music=elements.get('music');music.currentTime=0;music.volume=1;music.pause=()=>{music.paused=true;};music.play=async()=>{music.paused=false;};
const dots=Array.from({length:6},(_,i)=>new El('dot'+i,'img')),title=new El('result-title','img'),stage=new El('stage','section');
const document={hidden:false,getElementById:id=>{assert(elements.has(id),'unknown element '+id);return elements.get(id);},querySelector:s=>s==='.result-title'?title:stage,querySelectorAll:s=>{assert.equal(s,'.hud-dot');return dots;},addEventListener:(k,f)=>{listeners[k]=f;},fonts:{load:async()=>[]}};
class LocalImage extends Image{set src(s){super.src=fs.readFileSync(path.join(root,s));}}
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
const node=()=>({frequency:param(),gain:param(),Q:param(),connect(n){return n;},start(){},stop(){}});
class Audio{constructor(){this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}}
const sandbox={console,document,Image:LocalImage,matchMedia:()=>({matches:false}),requestAnimationFrame:()=>0,ResizeObserver:class{observe(){}},window:{AudioContext:Audio,devicePixelRatio:2,addEventListener(){}},ServeUI:UI,Math,Promise};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const run=s=>vm.runInContext(s,sandbox);
(async()=>{
 for(let i=0;i<200 && run('state')==='loading';i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(run('state'),'ready');assert.equal(canvas.width,2600);assert.equal(canvas.height,1200);
 run('draw(0)');const transform=ctx.getTransform();assert.equal(transform.a,transform.d,'phone frame must not stretch foreground');assert(Math.abs(transform.e+600*transform.a-canvas.width/2)<.01,'game target remains centered');
 elements.get('start').click();assert.equal(run('state'),'tutorial');
 await elements.get('gotIt').click();assert.equal(run('state'),'playing');
 music.currentTime=2;run('hit();draw(time());');
 assert.equal(run('perfect'),1);assert.equal(dots[0].dataset.result,'hit');assert.equal(dots[1].dataset.result,'pending');
 music.currentTime=3.2;run('loop(100);');assert.equal(dots[1].dataset.result,'miss');assert.equal(dots[2].dataset.result,'pending');
 assert.equal(run('strays'),0);run('pause()');const frozen=run('time()');music.currentTime=3.3;assert.equal(run('time()'),frozen);
 elements.get('settingsToggle').click();assert.equal(elements.get('settings').hidden,false);
 elements.get('settingsBack').click();assert.equal(run('state'),'paused');
 elements.get('pauseHome').click();assert.equal(elements.get('quitDialog').hidden,false);
 elements.get('cancelQuit').click();assert.equal(run('state'),'paused');
 await elements.get('resume').click();assert.equal(run('state'),'playing');
 music.currentTime=28;run('draw(time());');
 fs.mkdirSync(path.join(root,'test-output'),{recursive:true});
 fs.writeFileSync(path.join(root,'test-output','squish-hidpi.png'),raster.toBuffer('image/png'));
 music.currentTime=47.1;run('loop(200);');assert.equal(run('state'),'result');assert.equal(elements.get('results').hidden,false);
 assert(elements.get('accuracy').innerHTML.startsWith('<svg'));assert(!elements.get('accuracy').attrs['aria-label'].startsWith('100 '));
 await elements.get('resultRetry').click();assert.equal(run('score'),0);assert.equal(run('notes.filter(n=>n.result).length'),0);
 run('updateHUD(2)');assert(dots.every(d=>d.dataset.result==='pending'));
 music.currentTime=2.02;listeners.keydown({target:canvas,code:'Space',repeat:false,preventDefault(){}});assert.equal(run('perfect'),1);
 run('pause()');elements.get('pauseHome').click();elements.get('confirmQuit').click();assert.equal(run('state'),'ready');assert.equal(elements.get('overlay').hidden,false);
 assert.equal(music.currentTime,0);assert.equal(music.paused,true);
 assert.equal(run('notes.length'),0);
 console.log('PASS: actual game integration, artwork loading, 2x canvas, tutorial, hit/miss HUD, pause clock, settings, quit/cancel, squish rendering, result percentage, retry reset, keyboard, home');
})().catch(e=>{console.error(e);process.exitCode=1;});
