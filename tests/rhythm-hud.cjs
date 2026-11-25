'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});try{
 const context=await browser.newContext({viewport:{width:1440,height:850},hasTouch:true});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.GAME_URL||'file://'+path.resolve(__dirname,'../index.html'));await p.waitForFunction(()=>state==='ready');
 const original=await p.evaluate(()=>({chart:levelChart.map(n=>({beat:n.beat,action:n.action,slot:n.slot})),bpm:BPM,perfect:perfectWindow,good:goodWindow,end:levelEnd}));
 await p.click('#start');await p.click('#playLevel');assert(await p.locator('#skipTutorial').isVisible());await p.click('#gotIt');await p.waitForFunction(()=>state==='playing');
 assert.equal(await p.locator('#beatHud').getAttribute('data-count'),'2');assert.equal(await p.locator('#beatHud').getAttribute('data-variant'),'slim');
 await p.waitForFunction(()=>lessonMode==='practice');
 for(let i=0;i<2;i++){await p.waitForFunction(i=>time()>=notes[i].t-.025,i,{polling:5});await p.keyboard.press(i===0?'KeyA':'KeyD');}
 assert.equal(await p.evaluate(()=>notes.every(n=>n.result==='perfect'||n.result==='good')),true);await p.waitForFunction(()=>lessonIndex===1);assert.equal(await p.locator('#beatHud').getAttribute('data-count'),'4');
 const output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
 for(const [index,count]of [[0,2],[1,4],[2,2],[3,1]]){await p.evaluate(i=>{beginRound('demo',i);updateHUD(time());draw(time());},index);assert.equal(await p.locator('.hud-dot').count(),count);assert.equal(await p.locator('#beatHud').getAttribute('data-count'),String(count));assert(await p.locator('#skipTutorial').isVisible());await p.locator('.game').screenshot({path:output+'/hud-tutorial-'+count+'.png'});}
 await p.click('#skipTutorial');await p.waitForFunction(()=>lessonMode==='level');assert(await p.locator('#skipTutorial').isHidden());assert.equal(await p.locator('.hud-dot').count(),4);assert.equal(await p.locator('#beatHud').getAttribute('data-variant'),'slim');
 const shape=await p.evaluate(()=>{const h=document.getElementById('beatHud').getBoundingClientRect(),d=document.querySelector('.hud-dot').getBoundingClientRect();return {ratio:h.width/h.height,dot:d.width/d.height};});assert(Math.abs(shape.ratio-396/92)<.001);assert(Math.abs(shape.dot-1)<.001);
 await p.waitForFunction(()=>time()>=notes[0].t-.025,null,{polling:5});await p.keyboard.press(await p.evaluate(()=>notes[0].action==='a'?'KeyA':'KeyD'));assert(await p.evaluate(()=>['perfect','good'].includes(notes[0].result)));assert.equal(await p.locator('#beatHud').getAttribute('data-start'),'0');await p.waitForTimeout(300);assert.equal(await p.locator('#beatHud').getAttribute('data-start'),'0');assert.equal(await p.locator('.hud-dot').first().getAttribute('data-result'),'hit');
 for(let i=1;i<4;i++){await p.waitForFunction(i=>time()>=notes[i].t-.025,i,{polling:5});await p.keyboard.press(await p.evaluate(i=>notes[i].action==='a'?'KeyA':'KeyD',i));assert(await p.evaluate(i=>['perfect','good'].includes(notes[i].result),i));if(i<3){assert.equal(await p.locator('#beatHud').getAttribute('data-start'),'0');assert.equal(await p.locator('.hud-dot').first().getAttribute('data-index'),'0');}}
 await p.waitForFunction(()=>document.getElementById('beatHud').dataset.start==='4');assert.equal(await p.locator('.hud-dot').count(),4);assert.equal(await p.locator('.hud-dot').first().getAttribute('data-index'),'4');await p.waitForTimeout(220);await p.locator('.game').screenshot({path:output+'/hud-level-slim4.png'});
 await p.click('#pause');const frozen=await p.evaluate(()=>time());await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>time()),frozen);await p.click('#resume');await p.waitForFunction(()=>state==='playing');
 await p.click('#pause');await p.click('#pauseHome');await p.click('#confirmQuit');assert(await p.locator('#skipTutorial').isHidden());await p.click('#start');await p.click('#playLevel');
 await p.evaluate(()=>{const originalResume=audio.resume.bind(audio);let rejected=false;audio.resume=()=>{if(!rejected){rejected=true;return Promise.reject(Error('Test blocked resume'));}return originalResume();};});
 await p.click('#skipTutorial');assert.equal(await p.evaluate(()=>state),'tutorial');assert(await p.locator('#skipTutorial').isVisible());await p.click('#skipTutorial');await p.waitForFunction(()=>lessonMode==='level'&&state==='playing');assert.equal(await p.evaluate(()=>notes.every(n=>n.result===null)),true);
 await p.waitForFunction(()=>time()>=notes[0].t-.025,null,{polling:5});const target=await p.locator('#canvas').boundingBox();const right=await p.evaluate(()=>notes[0].action==='d');await p.touchscreen.tap(target.x+target.width*(right?.75:.25),target.y+target.height*.6);assert(await p.evaluate(()=>['perfect','good'].includes(notes[0].result)));
 await p.setViewportSize({width:568,height:262});const box=await p.locator('#beatHud').boundingBox();assert(box.width>0&&box.height>0);assert(Math.abs(box.width/box.height-396/92)<.001);assert.equal(await p.locator('.hud-dot').count(),4);
 const grouping=await p.evaluate(()=>{
   beginRound('level');
   notes[0].result='miss';updateHUD(0);updateHUD(.3);
   const afterOne={start:hudStart,result:document.querySelector('.hud-dot').dataset.result};
   notes[1].result='good';notes[2].result='wrong';notes[3].result='skipped';updateHUD(.3);updateHUD(.6);
   const afterFour=hudStart;
   beginRound('level');const lastPage=Math.floor((notes.length-1)/4)*4;
   notes.slice(0,lastPage).forEach(n=>n.result='good');updateHUD(0);updateHUD(.3);
   return {afterOne,afterFour,tail:hudStart,lastPage,unused:document.querySelectorAll('.hud-dot[data-result="unused"]').length,remaining:notes.length-lastPage};
 });
 assert.deepEqual(grouping.afterOne,{start:0,result:'miss'});assert.equal(grouping.afterFour,4);assert.equal(grouping.tail,grouping.lastPage);assert.equal(grouping.unused,4-grouping.remaining);
 assert.deepEqual(await p.evaluate(()=>({chart:levelChart.map(n=>({beat:n.beat,action:n.action,slot:n.slot})),bpm:BPM,perfect:perfectWindow,good:goodWindow,end:levelEnd})),original);assert.deepEqual(errors,[]);
 console.log('PASS: tutorial 2/4/2/1 slim slots; real A/D progression; four-slot results retained until all four judgments, then grouped advance; skip from lesson or landing; blocked resume retry; pause/resume; landscape layout; chart and timing unchanged.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
