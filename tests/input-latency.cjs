const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
 const page=await browser.newPage();await page.goto('file://'+process.cwd()+'/index.html');await page.waitForFunction(()=>state==='ready');await page.click('#start');await page.waitForFunction(()=>state==='playing');
 const result=await page.evaluate(()=>{
  beginRound('level');const n=notes[0];clockOrigin=audio.currentTime-n.t;
  studio.project.hitOffsets.pinch=2;studio.project.positions.hit0=n.beat+.8;
  const calls=[],base=soundtrack.playBuffer.bind(soundtrack);
  soundtrack.playBuffer=(buffer,at,...rest)=>{calls.push({at,now:audio.currentTime});return base(buffer,at,...rest);};
  const count=soundtrack.events.length;hit('a');
  return {calls,queued:soundtrack.events.length-count,gestureNow:Math.abs(gesture.t-time())<.02,result:n.result};
 });assert.equal(result.calls.length,1);assert.equal(result.queued,0);assert(Math.abs(result.calls[0].at-result.calls[0].now)<.005);assert(result.gestureNow);assert.equal(result.result,'perfect');console.log('PASS immediate input',result);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
