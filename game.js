'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),c=canvas.getContext('2d');
const INK='#142342',CREAM='#fffbed',RED='#ff583f',YELLOW='#ffe879',BPM=120,BEAT=60/BPM;
const assets = {};
const ui = 'assets/ui/elements/';
const assetPaths = {
  background: 'assets/background.png',
  belt: 'assets/belt.png',
  plate: 'assets/plate.png',
  formed: 'assets/formed.png',
  rice: 'assets/rice.png',
  hand: 'assets/hand.png',
  onBeat: ui + 'feedback/on-beat.png',
  miss: ui + 'feedback/miss.png',
  3: ui + 'countdown/3.png',
  2: ui + 'countdown/2.png',
  1: ui + 'countdown/1.png'
};
let state='loading',audio,master,origin=0,pausedAt=0,nextTick=0,muted=false,notes=[],combo=0,best=0,score=0,perfect=0,good=0,misses=0,strays=0,fx=null,particles=[],lastFrame=0,offset=0;
let reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;$('motion').checked=reduce;
const chart=[...Array.from({length:16},(_,i)=>4+i*2),...Array.from({length:16},(_,i)=>36+i),...Array.from({length:8},(_,i)=>56+i*2),...Array.from({length:16},(_,i)=>76+i)];
const END=94*BEAT;
const time=()=>state==='playing'?audio.currentTime-origin:pausedAt;
function tone(freq,at,len=.08,type='sine',vol=.15,end=freq){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+len);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(vol,at+.004);g.gain.exponentialRampToValueAtTime(.001,at+len);o.connect(g);g.connect(master);o.start(at);o.stop(at+len+.02);}
function beatSound(i,at){tone(i%4===0?140:100,at,.12,'sine',.24,42);tone(i%2?2200:1500,at,.025,'square',.025);const bass=[130.81,130.81,164.81,146.83];if(i%2===0)tone(bass[Math.floor(i/8)%4],at,.18,'triangle',.08);if(i%4===2)tone(523.25,at,.08,'sine',.04);}
async function start(){if(state==='loading')return;if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=muted?0:.65;master.connect(audio.destination);}await audio.resume();origin=audio.currentTime+.12;pausedAt=0;nextTick=0;notes=chart.map((b,i)=>({t:b*BEAT,i,result:null}));combo=best=score=perfect=good=misses=strays=0;particles=[];fx=null;state='playing';$('overlay').hidden=true;canvas.inert=false;$('modal').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ';$('status').textContent='听四拍准备；饭团到红色区域，按下空格。';canvas.focus();}
function pause(){if(state!=='playing')return;pausedAt=time();state='paused';audio.suspend();$('modalLabel').textContent='TAKE A BREATHER';$('modalTitle').textContent='休息一拍';$('modalBody').textContent='饭团也在等你。准备好了就继续。';$('resume').hidden=false;$('resume').textContent='继续开饭';$('modal').hidden=false;$('pause').textContent='▶';$('resume').focus();}
async function resume(){if(state!=='paused')return;await audio.resume();state='playing';$('modal').hidden=true;$('pause').textContent='Ⅱ';canvas.focus();}
function finish(){state='result';pausedAt=END;audio.suspend();const acc=Math.round((perfect+good*.7)/(notes.length+strays)*100);$('modalLabel').textContent='ORDER COMPLETE / 关卡完成';$('modalTitle').textContent=acc>=85?'NICE SQUISH!':'再来一份？';$('modalBody').textContent='准确率 '+acc+'%  ·  最高连击 '+best+'\nPERFECT '+perfect+'  /  GOOD '+good+'  /  MISS '+misses+'\n得分 '+score.toLocaleString();$('resume').hidden=true;$('retry').textContent='再捏一局';$('modal').hidden=false;$('pause').disabled=true;$('retry').focus();$('status').textContent='关卡完成，查看本次成绩。';}
function hit(){if(state!=='playing')return;const t=time(),judge=t-offset/1000;if(t<1.7)return;let n=notes.filter(n=>!n.result).reduce((a,b)=>!a||Math.abs(b.t-judge)<Math.abs(a.t-judge)?b:a,null);if(n&&Math.abs(n.t-judge)<=.155){const delta=judge-n.t;const result=Math.abs(delta)<=.075?'perfect':'good';n.result=result;combo++;best=Math.max(best,combo);result==='perfect'?perfect++:good++;score+=result==='perfect'?1000+Math.min(combo,20)*25:600;feedback(result,t,n,delta);}else{strays++;combo=0;feedback('wrong',t,notes.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a),0);}}
function feedback(kind,t,n,delta){const success=kind==='perfect'||kind==='good';fx={kind,t,n,delta};if(success){tone(170,audio.currentTime,.12,'sine',.6,45);tone(kind==='perfect'?1046.5:784,audio.currentTime+.02,.09,'triangle',.14);for(let i=0;i<18;i++)particles.push({x:600,y:425,vx:(Math.random()-.5)*700,vy:-120-Math.random()*500,born:t,r:Math.random()*4+3});}else{tone(110,audio.currentTime,.18,'sawtooth',.12,55);}if(success&&combo%8===0)$('status').textContent=combo+' 连击！饭团很开心。';else if(!success)$('status').textContent=kind==='miss'?'漏拍了！饭团生气了，跟上下一拍。':'拍子偏了！等饭团到达中央再按。';}
function rr(x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}}
function txt(s,x,y,size=20,color=INK,align='left'){c.fillStyle=color;c.font='900 '+size+'px "Arial Black", "Microsoft YaHei", sans-serif';c.textAlign=align;c.fillText(s,x,y);}
function ellipse(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function image(n,x,y,w,h){if(assets[n])c.drawImage(assets[n],x,y,w,h);}
function centeredArt(name, y, width, height) {
  const art = assets[name];
  const scale = Math.min(width / art.naturalWidth, height / art.naturalHeight);
  const w = art.naturalWidth * scale;
  const h = art.naturalHeight * scale;
  image(name, (canvas.width - w) / 2, y - h / 2, w, h);
}

function drawFeedback(t, y) {
  if (!fx || t - fx.t >= .7) return;
  const hit = fx.kind === 'perfect' || fx.kind === 'good';
  centeredArt(hit ? 'onBeat' : 'miss', y, 284, 122);
  const detail = hit
    ? fx.kind.toUpperCase() + ' · ' + (fx.delta > 0 ? '+' : '') + Math.round(fx.delta * 1000) + ' ms'
    : fx.kind === 'miss' ? 'TOO LATE' : 'OFF BEAT';
  txt(detail, 600, y + 79, 15, INK, 'center');
}

function hand(x,y,size=240,rotation=Math.PI/2,open=false){const a=assets.hand;if(!a)return;c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(a,0,open?0:a.height/2,a.width/3,a.height/2,-size/2,-size/2,size,size);c.restore();}
function star(x,y,r,color,rot=0){c.save();c.translate(x,y);c.rotate(rot);c.beginPath();for(let i=0;i<20;i++){const a=i*Math.PI/10,v=i%2?r*.53:r;c.lineTo(Math.cos(a)*v,Math.sin(a)*v);}c.closePath();c.fillStyle=color;c.fill();c.restore();}
function angry(x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=CREAM;c.lineWidth=19;c.lineCap='round';const path=()=>{c.beginPath();for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){c.moveTo(sx*12,sy*49);c.lineTo(sx*12,sy*24);c.quadraticCurveTo(sx*12,sy*12,sx*25,sy*12);c.lineTo(sx*48,sy*12);}c.stroke();};path();c.strokeStyle=RED;c.lineWidth=11;path();c.restore();}
function rice(x,y,formed=false,scale=1,angryFace=false){c.save();c.translate(x,y);c.scale(scale,scale);image(formed?'formed':'rice',-180,-224,360,300);if(angryFace){ellipse(0,-35,35,24,'#fffbed');c.strokeStyle=INK;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-24,-48);c.lineTo(-10,-40);c.moveTo(24,-48);c.lineTo(10,-40);c.moveTo(-13,-21);c.quadraticCurveTo(0,-35,13,-21);c.stroke();}c.restore();}
function kitchen(t){image('background',0,0,1200,675);const grad=c.createLinearGradient(0,0,0,675);grad.addColorStop(0,'#ff80622c');grad.addColorStop(1,'#ff8d6255');c.fillStyle=grad;c.fillRect(0,0,1200,675);const pulse=Math.max(0,1-(t%BEAT)/BEAT);c.fillStyle='#ff6047';c.globalAlpha=.14+pulse*.12;c.fillRect(499,470,202,81);c.globalAlpha=1;image('belt',0,270,1200,425);rr(502,474,196,50,8,'#ff684666',RED);c.setLineDash([8,9]);c.beginPath();c.moveTo(600,203);c.lineTo(600,462);c.lineWidth=2;c.strokeStyle='#14234222';c.stroke();c.setLineDash([]);
const visible=state==='ready'||state==='loading';const items=visible?[{t:t-.9,i:-1,result:'perfect'},{t:t,i:0,result:null},{t:t+.9,i:1,result:null}]:notes;
for(const n of items){const x=600+(t-n.t)*440;if(x< -190||x>1390)continue;const active=fx&&fx.n===n&&t-fx.t<.45;const a=active?t-fx.t:1;const scale=active&&fx.kind!=='miss'?1+.25*Math.sin(a*22)*Math.exp(-a*7):1;image('plate',x-126,430,252,110);rice(x,448,n.result==='perfect'||n.result==='good',scale,n.result==='miss'||(active&&fx.kind==='wrong'));if(n.result==='miss'&&x<900)angry(x+60,320,1.05);}
const age=fx?t-fx.t:99;const down=age<.22?Math.sin(Math.min(1,age/.16)*Math.PI):0;
if(visible)hand(815,282+Math.sin(t*3)*8,260,0,true);else hand(600,280+down*105,245,age>.32?0:Math.PI/2,age>.32);
if(age<.7 && !['perfect','good'].includes(fx.kind)) angry(695,277,1.4);
if(!visible){txt(combo?combo+' COMBO':'TIMING!',44,135,48);txt(t<18?'01 / 找到节拍':t<28?'02 / 加快出餐':'04 / 最后一份！',47,167,14);}
}
function squish(t){c.fillStyle=YELLOW;c.fillRect(0,0,1200,675);const g=c.createRadialGradient(600,340,10,600,340,650);g.addColorStop(0,'#fff9bf');g.addColorStop(1,'#ffe879');c.fillStyle=g;c.fillRect(0,0,1200,675);const age=fx?t-fx.t:99,ok=fx&&['perfect','good'].includes(fx.kind),impact=age<.3?Math.sin(Math.min(1,age/.3)*Math.PI):0;txt(age<.5&&!ok?'HEY!!':'SQUISH!',42,145,96);txt('03 / 双手挤压 · 每两拍按一次',600,230,17,INK,'center');star(600,345,145+impact*35,'#ff8769',t*.1);
c.save();c.translate(600,355);c.scale(1-impact*.4,1+impact*.25);rice(0,30,true,1.35,age<.6&&!ok);c.restore();
// Oversized hands fill the frame, as in the abstract storyboard.
hand(175+impact*95,357,660,0,false);hand(1025-impact*95,357,660,Math.PI,false);
if(age<.6&&!ok)angry(697,270,1.4);
}
function draw(t){c.save();const age=fx?t-fx.t:99;if(!reduce&&age<.16){const amp=(1-age/.16)*8;c.translate(Math.sin(age*180)*amp,Math.cos(age*150)*amp*.5);}const close=t>=28&&t<36&&!reduce;if(close)squish(t);else kitchen(t);
for(const p of particles){const a=t-p.born;if(a<0||a>.8)continue;ellipse(p.x+p.vx*a,p.y+p.vy*a+650*a*a,p.r,p.r*1.9,CREAM);}particles=particles.filter(p=>t-p.born<.8);
drawFeedback(t, close ? 465 : 135);
if(state==='playing'||state==='paused'){const b=Math.floor(t/BEAT);rr(440,574,320,55,28,INK);for(let i=0;i<6;i++){ellipse(475+i*50,601,14,i===b%6?17:14,i===b%6?RED:CREAM);}txt(close?'1 · 2 → SQUISH':'饭团到红框时 · SPACE',600,655,14,INK,'center');if(t<2&&t>=0){const count = 3 - Math.floor(t / BEAT);
if (count > 0) centeredArt(count, 280, 235, 195);
else txt('GO!',600,330,140,INK,'center');}}
c.restore();}
function loop(ms){requestAnimationFrame(loop);const t=state==='ready'||state==='loading'?ms/1000:time();if(state==='playing'){while(nextTick*BEAT<=t+.10&&nextTick*BEAT<END){const at=origin+nextTick*BEAT;if(at>=audio.currentTime-.02)beatSound(nextTick,Math.max(audio.currentTime,at));nextTick++;}for(const n of notes){if(!n.result&&t-offset/1000>n.t+.155){n.result='miss';misses++;combo=0;feedback('miss',t,n,0);}}if(t>=END){finish();} $('score').textContent=String(score).padStart(6,'0');$('progress').style.width=Math.min(100,Math.max(0,t/END*100))+'%';$('phase').textContent=t>=28&&t<36?'SQUISH BREAK · 双手挤压':'LEVEL 01 · RICE RICE BABY';}if(state!=='paused'&&state!=='result')draw(t);lastFrame=ms;}
$('start').onclick=start;$('retry').onclick=start;$('resume').onclick=resume;$('pause').onclick=()=>state==='paused'?resume():pause();
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:.65;$('sound').textContent='声音 '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(muted));};
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.game').requestFullscreen().catch(()=>{$('status').textContent='此浏览器不支持全屏，可使用浏览器缩放。';});};
const settingsButtons = [$('settingsToggle'), $('startSettings')];
for (const button of settingsButtons) {
  button.onclick = () => {
    const settings = $('settings');
    settings.hidden = !settings.hidden;
    for (const toggle of settingsButtons) {
      toggle.setAttribute('aria-expanded', String(!settings.hidden));
    }
    if (button.id === 'startSettings' && !settings.hidden) {
      $('offset').focus();
    }
  };
}$('offset').oninput=e=>{offset=Number(e.target.value);$('offsetLabel').textContent=offset+' ms';};$('motion').onchange=e=>{reduce=e.target.checked;};
canvas.tabIndex=0;canvas.onpointerdown=e=>{if(e.button!==0)return;hit();};document.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.code==='Space'&&!e.repeat){if(e.target.matches('button'))return;e.preventDefault();if(state==='ready')start();else hit();}if(e.code==='Escape'){e.preventDefault();state==='paused'?resume():pause();}});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
Promise.all(Object.entries(assetPaths).map(([n,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{assets[n]=img;resolve();};img.onerror=()=>reject(new Error(n));img.src=path;}))).then(()=>{state='ready';$('start').disabled=false;}).catch(e=>{$('status').textContent='素材未能加载：'+e.message+'。请保持 assets 文件夹与页面放在一起。';});requestAnimationFrame(loop);
