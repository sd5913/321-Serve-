const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+process.cwd()+'/index.html');
  await page.waitForFunction(()=>state==='ready');
  await page.evaluate(()=>studio.ready);
  const data=await page.evaluate(()=>({groups:levelServings.length,end:levelEnd,notes:levelChart.length,
   music:studio.buffers.music.duration,distinct:studio.files.spongePinch.blob.size!==studio.files.spongeSlap.blob.size,
   valid:levelChart.every(n=>n.beat>=n.group.beat+n.group.landing && n.beat<n.group.beat+n.group.length),
   cues:KitchenSoundtrack.buildEvents(levelServings,levelChart).length}));
  assert.equal(data.groups,44);assert.equal(data.cues,44);assert(data.valid);assert(data.distinct);assert(Math.abs(data.music-data.end)<.05);
  await page.click('#start');await page.click('#playLevel');await page.click('#gotIt');await page.waitForFunction(()=>state==='playing');
  await page.evaluate(()=>beginRound('level'));await page.waitForTimeout(180);
  assert(await page.evaluate(()=>soundtrack.musicSource && !soundtrack.musicSource.loop && soundtrack.musicSource.buffer===studio.audioBuffer('music')));
  assert(await page.evaluate(()=>soundtrack.events.every(e=>e.kind.startsWith('cue'))),'no pre-scheduled button sounds');
  await page.click('#pause');const paused=await page.evaluate(()=>time());await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>time()),paused);
  await page.click('#resume');await page.waitForTimeout(80);assert(await page.evaluate(()=>time()>pausedAt));
  const branch=await page.evaluate(()=>{
   const g=servings.find(g=>g.kind==='sponge');clockOrigin=audio.currentTime-(g.beat+g.keys[0])*BEAT;
   const played=[];const original=soundtrack.playInput.bind(soundtrack);soundtrack.playInput=kind=>{played.push(kind);original(kind);};
   hit('a');const wrong=notes.find(n=>n.group===g).result;const wrongAudio=played.at(-1);
   delete g.exit;notes.find(n=>n.group===g).result=null;
   hit('d');return {wrong,wrongAudio,right:notes.find(n=>n.group===g).result,rightAudio:played.at(-1)};
  });
  assert.equal(branch.wrong,'wrong');assert.equal(branch.wrongAudio,'spongePinch');assert.equal(branch.right,'perfect');assert.equal(branch.rightAudio,'spongeSlap');
  const tutorial=await page.evaluate(()=>{
    beginRound('demo',1);soundtrack.tick(0);
    const bg=!!soundtrack.musicSource && soundtrack.musicSource.loop;
    const initial=notes.map(n=>n.t);for(const n of notes)demonstrate(n.t);
    const demoSounds=soundtrack.events.filter(e=>!e.kind.startsWith('cue')).map(e=>e.kind);
    clockOrigin=audio.currentTime-2;
    beginRound('practice',1);const same= soundtrack.musicOffset;
    soundtrack.tick(0);
    beginRound('demo',2);const next=soundtrack.musicOffset;
    return {bg,demoSounds,same,next};
  });
  assert(tutorial.bg);assert.deepEqual(tutorial.demoSounds,['triplePinch1','triplePinch2','triplePinch3','slap']);assert(tutorial.same>=2);assert.equal(tutorial.next,0);
  await page.evaluate(()=>{for(const g of servings)for(const dt of [0,g.charge,g.landing,...g.keys])draw((g.beat+dt)*BEAT)});
  assert.deepEqual(errors,[]);console.log('PASS rice score',data,branch);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
