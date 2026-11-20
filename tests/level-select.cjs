'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const names=['Rice Rice Baby','Catch Me If You Can','Sashimi, Baby!','Grill Me Maybe'];
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH,headless:true});try{
 const context=await browser.newContext({viewport:{width:1200,height:720},deviceScaleFactor:2,hasTouch:true});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+root+'/index.html');await p.waitForFunction(()=>state==='ready');await p.waitForFunction(()=>document.getElementById('startMotion').width>100);
 assert.equal(await p.locator('#start').getAttribute('aria-label'),'Select level');
 const initial=await p.evaluate(()=>({chart:chart.map(n=>({beat:n.beat,action:n.action,slot:n.slot})),bpm:BPM,end:END,perfect:perfectWindow,good:goodWindow}));
 await p.click('#start');assert.equal(await p.evaluate(()=>state),'level-select');assert.equal(await p.locator('#levelSelect').getAttribute('data-level'),'1');assert(await p.locator('#previousLevel').isDisabled());
 const frame=await p.locator('.game').boundingBox(),first=await p.locator('.level-card').nth(0).boundingBox();assert(Math.abs(frame.width/frame.height-13/6)<.01);assert(Math.abs(first.x+first.width/2-(frame.x+frame.width/2))<1);
 await p.click('#levelSettings');await p.click('#settingsBack');assert.equal(await p.evaluate(()=>document.activeElement.id),'levelSettings');
 for(let i=1;i<=3;i++){
  await p.click('#nextLevel');await p.waitForTimeout(450);await p.locator('#selectedLevelTitle').evaluate(i=>i.decode());assert.equal(await p.locator('#selectedLevelTitle').getAttribute('alt'),names[i]);
  const active=await p.locator('.level-card').nth(i).boundingBox();assert(Math.abs(active.width-first.width)<1);assert(Math.abs(active.x+active.width/2-(frame.x+frame.width/2))<1);assert(Math.abs(active.y+active.height/2-(first.y+first.height/2))<1);
  await p.click('#playLevel');assert.equal(await p.evaluate(()=>state),'empty-level');assert(await p.locator('#emptyLevel').isVisible());assert.equal(await p.locator('#emptyLevel').innerText(),'');assert.equal(await p.evaluate(()=>typeof audio),'undefined');
  await p.click('#emptyBack');assert.equal(await p.locator('#levelSelect').getAttribute('data-level'),String(i+1));
 }
 assert(await p.locator('#nextLevel').isDisabled());await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#levelSelect').getAttribute('data-level'),'3');await p.waitForTimeout(450);
 const c=await p.locator('#levelCarousel').boundingBox();await p.mouse.move(c.x+c.width*.5,c.y+c.height*.6);await p.mouse.down();await p.mouse.move(c.x+c.width*.72,c.y+c.height*.6,{steps:10});await p.mouse.up();assert.equal(await p.locator('#levelSelect').getAttribute('data-level'),'2');
 await p.click('[data-level-dot="1"]');await p.click('#playLevel');assert.equal(await p.evaluate(()=>state),'tutorial');await p.evaluate(()=>{practiceStarted=performance.now()-10000;practiceFrame();});await p.click('#gotIt');await p.waitForFunction(()=>state==='playing');
 await p.evaluate(()=>{clockOrigin=performance.now()/1000-chart[0].beat;hit('a');clockOrigin=performance.now()/1000-chart[1].beat;hit('d');});assert.equal(await p.evaluate(()=>perfect),2);
 await p.click('#pause');await p.click('#pauseHome');await p.click('#confirmQuit');assert.equal(await p.evaluate(()=>state),'ready');await p.click('#start');await p.click('#levelBack');assert(await p.locator('#overlay').isVisible());
 await p.setViewportSize({width:844,height:390});await p.click('#start');const mobile=await p.locator('.game').boundingBox();assert(Math.abs(mobile.width/mobile.height-13/6)<.01);
 const client=await context.newCDPSession(p),touch=await p.locator('#levelCarousel').boundingBox();const sx=touch.x+touch.width*.65,ex=touch.x+touch.width*.25,y=touch.y+touch.height*.5;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y}]});for(let s=1;s<=8;s++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(ex-sx)*s/8,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.locator('#levelSelect').getAttribute('data-level'),'2');
 assert.deepEqual(await p.evaluate(()=>({chart:chart.map(n=>({beat:n.beat,action:n.action,slot:n.slot})),bpm:BPM,end:END,perfect:perfectWindow,good:goodWindow})),initial);
 await p.setViewportSize({width:1998,height:1100});await p.addStyleTag({content:'main{width:1998px;max-width:none}'});await p.waitForTimeout(450);
 for(let i=1;i<=4;i++){await p.click(`[data-level-dot="${i}"]`);await p.mouse.move(0,0);await p.waitForTimeout(450);await p.locator('#selectedLevelTitle').evaluate(i=>i.decode());await p.locator('.game').screenshot({path:root+`/test-output/levels-${i}.png`});}
 await p.click('#levelBack');await p.locator('.game').screenshot({path:root+'/test-output/home-select-level.png'});
 assert.deepEqual(errors,[]);
 for(const [i,color]of ['#87DCB0','#357CFF','#FF786E','#FDE880'].entries())assert(fs.readFileSync(root+`/assets/ui/level-select/level-${i+1}.svg`,'utf8').includes(color));
 console.log('PASS: four names/colors; identical centered active size; keyboard, mouse drag and touch swipe; empty levels; settings/back; level 1 A/D scoring; unchanged chart, BPM and timing windows; 19.5:9 desktop/mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
