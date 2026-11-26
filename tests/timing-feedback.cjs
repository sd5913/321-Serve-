'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});try{
 const url=process.env.GAME_URL||'file://'+path.resolve(__dirname,'../index.html');
 async function inspect(baseline){const ctx=await browser.newContext({viewport:{width:1440,height:850},hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));if(baseline)await p.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:baseline}));await p.goto(url);await p.waitForFunction(()=>state==='ready');await p.click('#start');await p.click('#playLevel');await p.click('#skipTutorial');await p.waitForFunction(()=>state==='playing'&&lessonMode==='level');
 const scenarios=await p.evaluate(()=>{const out=[];function round(index){beginRound('practice',index);}function at(i,delta,action){clockOrigin=audio.currentTime-(notes[i].t+delta);hit(action||notes[i].action);}function save(name){out.push({name,label:fx?.label,game:{perfect,good,misses,strays,score,combo,best,results:notes.map(n=>n.result),pinches:servings.map(g=>g.pinches.length),exit:servings.map(g=>!!g.exit),splash:!!fx?.splash}});}
 round(0);at(0,0);at(1,0);save('on-beat');
 round(0);at(0,-goodWindow-.04);save('early-before-contact');
 round(0);at(0,goodWindow+.04);save('late-contact');
 round(0);at(0,0);at(1,-goodWindow-.04);save('early-sweep');
 round(3);at(0,0,'a');save('wrong-sponge-key');
 round(0);at(0,0);clockOrigin=audio.currentTime-(notes[0].t+.02);hit('a');save('extra-press');
 round(1);for(let i=0;i<notes.length;i++)at(i,0);save('triple-on-beat');return out;});
 if(!baseline){assert.deepEqual(scenarios.map(s=>s.label),['onBeat','tooEarly','tooLate','tooEarly','offBeat','offBeat','onBeat']);assert.equal(await p.evaluate(()=>INK),'#00133a');assert(await p.evaluate(()=>assets.tooEarly.complete&&assets.tooLate.complete));
 await p.evaluate(()=>{beginRound('practice',0);clockOrigin=audio.currentTime-(notes[0].t+goodWindow+.02);});await p.waitForFunction(()=>notes[0].result==='miss');assert.equal(await p.evaluate(()=>fx.label),'tooLate');
 const placements=await p.evaluate(()=>{const calls=[],original=c.drawImage.bind(c);c.drawImage=(art,x,y,w,h)=>calls.push({x,y,w,h});try{centeredArt('tooEarly',100,350,122);centeredArt('tooLate',100,350,122);centeredArt('onBeat',100,284,122);}finally{c.drawImage=original;}return calls;});for(const box of placements)assert(Math.abs(box.x+box.w/2-600)<.001);
 const out=path.resolve(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});for(const [name,delta]of [['early',-.04],['late',.04]]){await p.evaluate(({name,delta})=>{beginRound('practice',0);clockOrigin=audio.currentTime-(notes[0].t+(name==='early'?-goodWindow+delta:goodWindow+delta));hit('a');const t=time();draw(t);pausedAt=t;state='paused';audio.suspend();},{name,delta});await p.locator('.game').screenshot({path:path.join(out,'feedback-'+name+'.png')});}
 }
 assert.deepEqual(errors,[]);await ctx.close();return scenarios;}
 let before;if(process.env.FEEDBACK_BASELINE)before=await inspect(fs.readFileSync(process.env.FEEDBACK_BASELINE,'utf8'));const after=await inspect();if(before)assert.deepEqual(after.map(s=>s.game),before.map(s=>s.game));console.log('PASS: ON BEAT / EARLY / LATE labels; wrong-key and extra-press fallback; automatic late miss; logical centering;'+(before?' gameplay snapshots identical to supplied baseline.':' original result and scoring fields preserved.'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
