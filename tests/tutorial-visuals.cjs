'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const sharp=require(process.env.SHARP_MODULE||'sharp'),{alphaBounds}=require('../scripts/build-tutorial-chapter-assets.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/ui/elements/tutorial/rice-rice-baby');
 const go=await alphaBounds(sharp,path.join(dir,'countdown-go.svg'),true);
 for(const n of [1,2,3]){const box=await alphaBounds(sharp,path.join(dir,'countdown-'+n+'.svg'),true);assert(Math.abs(box.height-go.height*1.12)<=2,'number body height differs from GO: '+n);}
 assert(fs.readFileSync(path.join(dir,'now-its-your-turn.svg'),'utf8').includes('#FCEBD1'));
 assert(fs.readFileSync(path.join(dir,'countdown-go.svg'),'utf8').includes('#FF5537'));
 for(const name of ['block-left','block-right','block-top','block-bottom']){
  const {data,info}=await sharp(path.join(dir,name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let opaque=0,transparent=0;for(let i=3;i<data.length;i+=4){if(data[i])opaque++;else transparent++;}assert(opaque>100&&transparent>100,name+' must be a separate transparent layer');
 }
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:850},deviceScaleFactor:2}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.GAME_URL||'http://127.0.0.1:8888/index.html');await p.waitForFunction(()=>state==='ready');await p.click('#start');await p.click('#playLevel');
  await p.evaluate(()=>{document.getElementById('motion').checked=false;});
  const before=await p.locator('.block-left').evaluate(e=>getComputedStyle(e).transform);await p.waitForTimeout(450);const after=await p.locator('.block-left').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(before,after,'color blocks do not animate');
  await p.evaluate(()=>{document.getElementById('motion').checked=true;});assert.equal(await p.locator('.block-left').evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.evaluate(()=>{document.getElementById('motion').checked=false;});await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.block-left').evaluate(e=>getComputedStyle(e).animationName),'none');await p.emulateMedia({reducedMotion:'no-preference'});
  const out=path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});await p.locator('.game').screenshot({path:path.join(out,'green-tutorial-intro.png')});
  await p.click('#tutorialContinue');await p.click('#tutorialContinue');await p.waitForFunction(()=>state==='playing'&&lessonMode==='demo');
  const full=await p.evaluate(()=>{const calls=[],original=c.drawImage.bind(c);c.drawImage=(art,...args)=>{if(art===assets.table)calls.push(args);return original(art,...args);};try{draw(time());}finally{c.drawImage=original;}return {calls,width:canvas.width,height:canvas.height};});assert.deepEqual(full.calls,[[0,0,full.width,full.height]]);
  await p.evaluate(()=>tutorialFlow.turn(0));await p.waitForFunction(()=>document.getElementById('tutorialTurn').complete);await p.locator('.game').screenshot({path:path.join(out,'green-your-turn.png')});
  await p.evaluate(()=>{tutorialFlow.cancel();beginRound('level');perfect=notes.length;finish();});
  const color=await p.locator('#results').evaluate(e=>getComputedStyle(e).backgroundImage);assert(color.includes('117, 211, 165')&&color.includes('96, 197, 151'));
  await p.waitForFunction(()=>[...document.querySelectorAll('#results img')].every(e=>e.complete&&e.naturalWidth));await p.locator('.game').screenshot({path:path.join(out,'green-results.png')});assert.deepEqual(errors,[]);
  console.log('PASS: number bodies at 112% of GO; cream turn title/red GO; separate transparent layers; actual block motion; both reduced-motion modes; full tutorial background; coordinated green result screen.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
