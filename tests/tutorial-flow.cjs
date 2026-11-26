'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:850},deviceScaleFactor:2,hasTouch:true}),p=await ctx.newPage(),errors=[],failed=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(r.url());});
  await p.goto(process.env.GAME_URL||'http://127.0.0.1:8886/index.html');await p.waitForFunction(()=>state==='ready');
  const chart=await p.evaluate(()=>({notes:levelChart.map(n=>({beat:n.beat,action:n.action})),end:levelEnd,perfectWindow,goodWindow}));
  await p.click('#start');await p.click('#playLevel');
  assert.equal(await p.evaluate(()=>tutorialFlow.stage),'intro');assert.equal(await p.locator('#gotIt').count(),0);
  assert.equal(await p.locator('#tutorial').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(135, 220, 176)');
  assert(await p.locator('#gameInfo').isHidden());
  fs.mkdirSync(path.resolve(__dirname,'../test-output'),{recursive:true});
  await p.locator('.game').screenshot({path:path.resolve(__dirname,'../test-output/tutorial-intro.png')});
  await p.click('#tutorialContinue');await p.waitForFunction(()=>tutorialFlow.stage==='explain');
  for(let stage=0;stage<4;stage++){
   assert.equal(await p.evaluate(()=>lessonIndex),stage);assert(await p.locator('#tutorialCard').getAttribute('src').then(s=>s.endsWith('lesson-'+(stage+1)+'-card.svg')));
   await p.click('#tutorialContinue');await p.waitForFunction(()=>state==='playing'&&lessonMode==='demo');
   assert.equal(await p.locator('#beatHud').getAttribute('data-count'),String([2,4,2,1][stage]));
   assert(await p.locator('#tutorialCount').isHidden());
   await p.evaluate(()=>{for(const n of notes)demonstrate(n.t);clockOrigin=audio.currentTime-END-.01;});
   await p.waitForFunction(()=>state==='tutorial'&&tutorialFlow.stage==='turn');
   assert(await p.locator('#tutorialTurn').isVisible());
   await p.waitForFunction(()=>state==='playing'&&lessonMode==='practice');
   assert(!/[\u3400-\u9fff]/.test(await p.locator('#phase').textContent()));
   if(stage===0){
    await p.evaluate(()=>{clockOrigin=audio.currentTime-END-.01;});
    await p.waitForFunction(()=>state==='tutorial'&&tutorialFlow.stage==='turn');assert(await p.locator('#tutorialRetry').isVisible());
    await p.waitForFunction(()=>state==='playing'&&lessonMode==='practice');
   }
   const actions=await p.evaluate(()=>notes.map(n=>n.action));
   for(let i=0;i<actions.length;i++){
    await p.evaluate(i=>{clockOrigin=audio.currentTime-notes[i].t+.06;},i);
    await p.waitForFunction(i=>time()>=notes[i].t-.015,i,{polling:5});
    if(stage===3){const box=await p.locator('#canvas').boundingBox();await p.touchscreen.tap(box.x+box.width*.75,box.y+box.height*.6);}
    else await p.keyboard.press(actions[i]==='a'?'KeyA':'KeyD');
    assert(await p.evaluate(i=>['perfect','good'].includes(notes[i].result),i),'real input at stage '+stage+' note '+i);
   }
   await p.evaluate(()=>{clockOrigin=audio.currentTime-END-.01;});
   await p.waitForFunction(expected=>state==='tutorial'&&tutorialFlow.stage===expected,stage===3?'complete':'explain');
  }
  await p.evaluate(()=>{
   window.countChanges=[];const el=document.getElementById('tutorial');new MutationObserver(()=>{if(el.dataset.stage==='count-in'&&window.countChanges.at(-1)?.label!==el.dataset.count)window.countChanges.push({label:el.dataset.count,t:performance.now()});}).observe(el,{attributes:true,attributeFilter:['data-count']});
  });
  await p.click('#tutorialContinue');await p.waitForFunction(()=>state==='count-in');assert(await p.locator('#tutorialCard').isHidden());assert(await p.locator('#tutorialTurn').isHidden());assert(await p.locator('#beatHud').isHidden());
  await p.waitForFunction(()=>state==='playing'&&lessonMode==='level');
  const changes=await p.evaluate(()=>window.countChanges);assert.deepEqual(changes.map(x=>x.label),['3','2','1','GO!']);for(let i=1;i<4;i++)assert(Math.abs(changes[i].t-changes[i-1].t-800)<100);
  assert.deepEqual(await p.evaluate(()=>({notes:levelChart.map(n=>({beat:n.beat,action:n.action})),end:levelEnd,perfectWindow,goodWindow})),chart);
  await p.click('#pause');const frozen=await p.evaluate(()=>time());await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>time()),frozen);await p.click('#resume');await p.waitForFunction(()=>state==='playing');
  await p.evaluate(()=>{clockOrigin=audio.currentTime-END-.01;});await p.waitForFunction(()=>state==='result');await p.click('#resultRetry');await p.waitForFunction(()=>state==='tutorial'&&tutorialFlow.stage==='explain');
  await p.click('#skipTutorial');await p.waitForFunction(()=>state==='count-in');await p.evaluate(()=>goHome());await p.waitForTimeout(3300);assert.equal(await p.evaluate(()=>state),'ready');
  await p.setViewportSize({width:844,height:390});await p.click('#start');await p.click('#playLevel');
  await p.locator('.game').screenshot({path:path.resolve(__dirname,'../test-output/tutorial-mobile.png')});
  await p.click('#skipTutorial');await p.waitForFunction(()=>state==='playing'&&lessonMode==='level');assert.equal(await p.evaluate(()=>notes.every(n=>n.result===null)),true);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('PASS: intro and four English lessons; watch/turn/practice; retry on failure; real keyboard and touch inputs; slim 2/4/2/1 bars; 800 ms count-in only after tutorial; cancel/retry/skip; mobile layout; unchanged chart/windows; no missing assets.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
