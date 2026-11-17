'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1200,height:720},deviceScaleFactor:2});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+root+'/index.html');
 await page.waitForFunction(()=>state==='ready',null,{timeout:10000});
 const game=page.locator('.game');const home=await game.boundingBox();
 assert(Math.abs(home.width/home.height-13/6)<.001);
 await page.click('#start');assert.equal(await page.evaluate(()=>practiceNotes.length),6);assert(await page.evaluate(()=>music.paused&&music.currentTime===0));await page.evaluate(()=>{practiceStarted=performance.now()-2000;practiceHit();});assert.equal(await page.evaluate(()=>practiceNotes[0].result),'perfect');assert.equal(await page.evaluate(()=>score),0);await page.waitForFunction(()=>!document.getElementById('gotIt').disabled);await page.click('#gotIt');
 assert.equal(await page.evaluate(()=>state),'countdown');
 assert(await page.evaluate(()=>music.paused&&music.currentTime===0));
 const rect=await game.boundingBox();const clip={x:rect.x,y:rect.y+rect.height*.75,width:rect.width,height:rect.height*.2};
 const scenery=await page.screenshot({clip});await page.waitForTimeout(120);assert(scenery.equals(await page.screenshot({clip})),'scenery stays still during countdown');
 await page.evaluate(()=>{hit();});assert.equal(await page.evaluate(()=>strays),0);
 await page.click('#pause');const frozen=await page.evaluate(()=>countdownTime());
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>countdownTime()),frozen);
 await page.click('#resume');
 await page.evaluate(()=>{countdownElapsed=1.6;countdownStarted=performance.now();draw(0);});
 await game.screenshot({path:path.join(out,'countdown-go.png')});
 await page.waitForFunction(()=>state==='playing');
 assert.equal(await page.evaluate(()=>notes.length),56);assert(Math.abs(await page.evaluate(()=>COUNTDOWN_DURATION)-8/3)<.001);
 await page.evaluate(()=>{pause();music.currentTime=2;pausedAt=2;state='playing';hit();pause();draw(2.08);});
 assert.equal(await page.evaluate(()=>perfect),1);
 assert.equal(await page.locator('.hud-dot').first().getAttribute('data-result'),'hit');
 await page.evaluate(()=>{$('modal').hidden=true;});await game.screenshot({path:path.join(out,'fist-game.png')});
 await page.evaluate(()=>{draw(28.1);});await game.screenshot({path:path.join(out,'fist-squish.png')});
 const decoded=await page.evaluate(async()=>{
  return Promise.all(Array.from({length:101},async(_,value)=>{
   const img=new Image();img.src='assets/ui/elements/result/percentages/'+String(value).padStart(3,'0')+'.png';await img.decode();return img.naturalWidth>0&&img.naturalHeight===308;
  }));
 });assert(decoded.every(Boolean),'all 101 PNGs decode');
 for(const value of [0,1,8,10,55,100]){
  await page.evaluate(v=>{notes=Array.from({length:100},()=>({}));perfect=v;good=0;strays=0;finish();},value);
  await page.locator('#accuracy').evaluate(img=>img.decode());
  assert((await page.locator('#accuracy').getAttribute('src')).endsWith(String(value).padStart(3,'0')+'.png'));
  await game.screenshot({path:path.join(out,'result-'+value+'.png')});
 }
 const boxes=await page.locator('.accuracy,.result-tag,#resultRetry,#resultHome').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
 for(let i=1;i<boxes.length;i++)assert(boxes[i].top>=boxes[i-1].bottom-1,'result controls do not overlap');
 await page.click('#resultRetry');assert.equal(await page.evaluate(()=>state),'countdown');
 assert(await page.evaluate(()=>score===0&&notes.length===56&&notes.every(n=>!n.result)&&music.paused&&music.currentTime===0));
 await page.click('#pause');await page.click('#pauseHome');await page.click('#confirmQuit');
 assert.equal(await page.evaluate(()=>state),'ready');
 for(const viewport of [{width:844,height:390},{width:667,height:375}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>{notes=Array.from({length:100},()=>({}));perfect=55;good=0;strays=0;finish();});
  await page.locator('#accuracy').evaluate(img=>img.decode());const rect=await game.boundingBox();assert(Math.abs(rect.width/rect.height-13/6)<.01);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const sizes=await page.locator('.hud-dot').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height];}));
  sizes.forEach(([w,h])=>assert(Math.abs(w-h)<1));
  await game.screenshot({path:path.join(out,'result-mobile-'+viewport.width+'.png')});
 }
 assert.deepEqual(errors,[]);console.log('PASS: real Chrome loading, 101 PNG decodes, countdown/GO, pause/resume, hit HUD, fists, scores 0/1/8/10/55/100, retry/home, 13:6 desktop/mobile and no console errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
