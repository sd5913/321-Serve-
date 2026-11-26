'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
  async function inspect(width,height,dpr,baseline){
   const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr}),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   if(baseline)await p.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:baseline}));
   await p.goto(process.env.GAME_URL||'http://127.0.0.1:8889/index.html');await p.waitForFunction(()=>state==='ready');
   await p.click('#start');await p.click('#playLevel');await p.click('#skipTutorial');await p.waitForFunction(()=>state==='playing');
   const captures=await p.evaluate(()=>{
    const matrices=m=>[m.a,m.b,m.c,m.d,m.e,m.f].map(v=>Math.round(v*10000)/10000);
    const glow=[],objects=[],oldGradient=c.createRadialGradient.bind(c),oldImage=c.drawImage.bind(c);
    c.createRadialGradient=(...args)=>{glow.push({args,m:matrices(c.getTransform())});return oldGradient(...args);};
    c.drawImage=(image,...args)=>{const name=Object.keys(assets).find(k=>assets[k]===image);objects.push({name,args,m:matrices(c.getTransform())});return oldImage(image,...args);};
    const g=servings.find(g=>g.kind==='triple'),t=(g.beat+g.charge*.5)*BEAT;
    try{draw(t);}finally{c.createRadialGradient=oldGradient;c.drawImage=oldImage;}
    const machine=objects.find(v=>v.name==='machine'),off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;
    const dc=off.getContext('2d');dc.setTransform(...machine.m);dc.drawImage(assets.machine,...machine.args);
    const pixels=dc.getImageData(0,0,off.width,off.height).data;let left=off.width,right=0,top=off.height,bottom=0;
    for(let y=0;y<off.height;y++)for(let x=0;x<off.width;x++)if(pixels[(y*off.width+x)*4+3]>127){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
    return {glow,objects,bounds:{left,right,top,bottom},width:canvas.width,height:canvas.height,
     chart:levelChart.map(n=>({beat:n.beat,action:n.action})),perfectWindow,goodWindow};
   });
   assert.deepEqual(errors,[]);await p.close();return captures;
  }
  const baseline=process.env.MACHINE_BASELINE?fs.readFileSync(process.env.MACHINE_BASELINE,'utf8'):null;
  for(const viewport of [[1440,850,2],[844,390,3]]){
   const original=baseline?await inspect(...viewport,baseline):null,current=await inspect(...viewport);
   // The reference keeps the complete machine near the left edge, and above the bottom edge.
   assert(current.bounds.left>=0&&current.bounds.left<current.width*.04);
   assert(current.bounds.top>0&&current.bounds.bottom<current.height*.92);
   if(original){
    assert.deepEqual(current.glow,original.glow,'original radial glow changed');
    const untouched=list=>list.filter(v=>!['machine','smoke','drops'].includes(v.name));
    assert.deepEqual(untouched(current.objects),untouched(original.objects),'food/background/hand drawing changed');
    assert.deepEqual(current.chart,original.chart);assert.equal(current.perfectWindow,original.perfectWindow);assert.equal(current.goodWindow,original.goodWindow);
   }
  }
  for(const n of [2,4]){const svg=fs.readFileSync(path.resolve(__dirname,'../assets/ui/level-select/title-'+n+'.svg'),'utf8');assert(!/<image\b|data:image/.test(svg));assert(svg.includes('<path'));}
  console.log('PASS: complete machine near left edge at 2x/3x; original glow, food/background/hand geometry and judgments retained; vector titles.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
