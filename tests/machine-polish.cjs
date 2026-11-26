'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require(process.env.SHARP_MODULE||'sharp');
(async()=>{
 const root=path.resolve(__dirname,'..'),svg=fs.readFileSync(path.join(root,'assets/level1/ui/machine-clean.svg'),'utf8');
 assert(!/<image\b|data:image|opacity=/.test(svg));assert(svg.includes('#87DCB0'));
 const {data}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});let green=0;
 for(let i=0;i<data.length;i+=4)if(data[i]===135&&data[i+1]===220&&data[i+2]===176&&data[i+3]===255)green++;
 assert(green>80000,'machine body must have a broad uniform opaque green fill');
 const original=await sharp(path.join(root,'assets/level1/imgMachineNormal1.png')).ensureAlpha().raw().toBuffer();let intersection=0,union=0;
 for(let i=3;i<data.length;i+=4){const a=data[i]>127,b=original[i]>127;if(a&&b)intersection++;if(a||b)union++;}
 assert(intersection/union>.995,'machine silhouette changed');
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
  for(const [width,height,dpr]of [[1440,850,2],[844,390,3]]){
   const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(process.env.GAME_URL||'http://127.0.0.1:8890/index.html');await p.waitForFunction(()=>state==='ready');await p.click('#start');await p.click('#playLevel');await p.click('#skipTutorial');
   await p.waitForFunction(()=>document.getElementById('tutorialCount').alt==='GO!');
   assert((await p.locator('#tutorialCount').getAttribute('src')).includes('countdown-go-red.svg?v='));
   await p.waitForFunction(()=>document.getElementById('tutorialCount').complete);
   const red=await p.locator('#tutorialCount').evaluate(img=>{const off=document.createElement('canvas');off.width=img.naturalWidth;off.height=img.naturalHeight;const ctx=off.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,off.width,off.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]===255&&a[i+1]===85&&a[i+2]===55)n++;return n;});assert(red>1000,'displayed GO is not coral red');
   await p.waitForFunction(()=>state==='playing');
   const frames=await p.evaluate(()=>{
    reduce=true;
    const sample=mode=>{
     beginRound(mode,1);const g=servings.find(g=>g.kind==='triple'),t=(g.beat+g.charge*.5)*BEAT,gradients=[],machines=[];
     const matrix=()=>{const m=c.getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f].map(v=>Math.round(v*10000)/10000);};
     const oldGradient=c.createRadialGradient.bind(c),oldImage=c.drawImage.bind(c);
     c.createRadialGradient=(...args)=>{gradients.push({args,m:matrix()});return oldGradient(...args);};
     c.drawImage=(art,...args)=>{if(art===assets.machine)machines.push({args:args.map(v=>Math.round(v*10000)/10000),m:matrix()});return oldImage(art,...args);};
     try{draw(t);}finally{c.createRadialGradient=oldGradient;c.drawImage=oldImage;}
     return {gradients,machines};
    };
    return {practice:sample('practice'),level:sample('level')};
   });
   assert.deepEqual(frames.practice.gradients,frames.level.gradients,'tutorial and level glow frames differ');
   assert.deepEqual(frames.practice.machines.map(v=>v.m),frames.level.machines.map(v=>v.m),'machine frame differs');
   frames.practice.machines[0].args.forEach((v,i)=>assert(Math.abs(v-frames.level.machines[0].args[i])<.001,'machine size differs'));
   const g=frames.level.gradients[0].m,m=frames.level.machines[0].m;assert.equal(g[4],m[4]);assert.equal(g[5],m[5]);assert(Math.abs(g[0]-Math.abs(m[1]))<.001);
   await p.evaluate(()=>{pausedAt=time();state='paused';audio.suspend();});await p.locator('.game').screenshot({path:path.join(root,'test-output/machine-unified-'+dpr+'x.png')});
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS: opaque uniform-color vector machine; shared tutorial/level placement and glow center/scale at 2x/3x; actual displayed GO is red and versioned.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
