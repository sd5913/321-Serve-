'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{
 const executablePath=process.env.BROWSER_PATH,url=process.env.GAME_URL||'http://127.0.0.1:8891/index.html';
 const browser=await chromium.launch({headless:true,executablePath,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.waitForFunction(()=>state==='ready'&&document.getElementById('menuMusic').currentTime>.1);
  const media=await p.evaluate(()=>{const m=document.getElementById('menuMusic');window.menuPauses=0;m.addEventListener('pause',()=>window.menuPauses++);return {loop:m.loop,duration:m.duration,volume:m.volume};});assert(media.loop);assert(media.duration>30);assert.equal(media.volume,.45);
  const before=await p.evaluate(()=>document.getElementById('menuMusic').currentTime);await p.click('#start');await p.waitForTimeout(200);assert(await p.evaluate(()=>document.getElementById('menuMusic').currentTime)>before);assert.equal(await p.evaluate(()=>window.menuPauses),0);
  await p.click('#levelBack');await p.waitForFunction(()=>state==='ready');assert(await p.evaluate(()=>!document.getElementById('menuMusic').paused));
  await p.click('#startSettings');await p.locator('#musicVolume').fill('40');assert(Math.abs(await p.evaluate(()=>document.getElementById('menuMusic').volume)-.18)<.000001);await p.click('#settingsBack');
  await p.click('#sound');assert(await p.evaluate(()=>document.getElementById('menuMusic').paused&&document.getElementById('menuMusic').muted));await p.click('#sound');await p.waitForFunction(()=>!document.getElementById('menuMusic').paused);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert(await p.evaluate(()=>document.getElementById('menuMusic').paused));
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>!document.getElementById('menuMusic').paused);
  await p.click('#start');
  for(const level of [2,3,4]){
   await p.click('[data-level-dot="'+level+'"]');await p.click('#playLevel');await p.waitForFunction(()=>state==='empty-level');assert(await p.evaluate(()=>document.getElementById('menuMusic').paused));await p.click('#emptyBack');await p.waitForFunction(()=>!document.getElementById('menuMusic').paused);
  }
  await p.click('[data-level-dot="1"]');const menuTime=await p.evaluate(()=>document.getElementById('menuMusic').currentTime);await p.click('#playLevel');await p.waitForFunction(()=>state==='tutorial');assert(await p.evaluate(()=>document.getElementById('menuMusic').paused));
  await p.click('#skipTutorial');await p.waitForFunction(()=>state==='playing'&&lessonMode==='level');assert(await p.evaluate(()=>document.getElementById('menuMusic').paused));
  await p.waitForFunction(()=>time()>=notes[0].t-.025,null,{polling:5});await p.keyboard.press(await p.evaluate(()=>notes[0].action==='a'?'KeyA':'KeyD'));assert(await p.evaluate(()=>['perfect','good'].includes(notes[0].result)));
  await p.click('#pause');assert(await p.evaluate(()=>document.getElementById('menuMusic').paused));await p.click('#pauseHome');await p.click('#confirmQuit');await p.waitForFunction(()=>state==='ready'&&!document.getElementById('menuMusic').paused);assert(await p.evaluate(()=>document.getElementById('menuMusic').currentTime)>=menuTime);
  assert.deepEqual(errors,[]);console.log('PASS: real MP3 autoplay when permitted; continuous home/selector loop; volume/mute/visibility; all four level entries stop menu music; home restores position; formal key input still scores.');
 }finally{await browser.close();}
 const blocked=await chromium.launch({headless:true,executablePath,args:['--autoplay-policy=document-user-activation-required']});
 try{
  const p=await blocked.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>state==='ready');
  await p.evaluate(()=>{const m=document.getElementById('menuMusic'),original=m.play.bind(m);m.pause();m.play=()=>Promise.reject(new DOMException('Test blocked autoplay','NotAllowedError'));window.restoreMenuPlay=()=>{m.play=original;};ServeMenuMusic.sync();});
  await p.waitForFunction(()=>document.getElementById('menuMusic').dataset.playback==='blocked');await p.evaluate(()=>window.restoreMenuPlay());await p.click('#start');await p.waitForFunction(()=>document.getElementById('menuMusic').currentTime>.05);assert(await p.locator('#levelSelect').isVisible());assert.deepEqual(errors,[]);
  console.log('PASS: blocked autoplay recovers on the first real interaction without an extra dialog.');
 }finally{await blocked.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
