'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),c=canvas.getContext('2d');
const music = $('music');
const SFX_VOLUME = .9;
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
  1: ui + 'countdown/1.png',
  go: ui + 'countdown/go.svg'
};
let state='loading',audio,master,pausedAt=0,muted=false,notes=[],combo=0,best=0,score=0,perfect=0,good=0,misses=0,strays=0,fx=null,particles=[],lastFrame=0,offset=0;
let reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;$('motion').checked=reduce;
const chart=[...Array.from({length:16},(_,i)=>4+i*2),...Array.from({length:16},(_,i)=>36+i),...Array.from({length:8},(_,i)=>56+i*2),...Array.from({length:16},(_,i)=>76+i)];
const END=94*BEAT;
const time = () => state === 'playing' ? music.currentTime : pausedAt;
let startingPlayback = false;
function tone(freq,at,len=.08,type='sine',vol=.15,end=freq){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+len);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(vol,at+.004);g.gain.exponentialRampToValueAtTime(.001,at+len);o.connect(g);g.connect(master);o.start(at);o.stop(at+len+.02);}
async function playMusic() {
  if (startingPlayback) return false;
  startingPlayback = true;
  try {
    await Promise.all([music.play(), audio.resume()]);
    return true;
  } catch {
    music.pause();
    $('status').textContent = 'Music could not play. Keep the assets/audio folder with the game and try again.';
    return false;
  } finally {
    startingPlayback = false;
  }
}

async function start() {
  if (state === 'loading' || state === 'playing' || startingPlayback) return;
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = muted ? 0 : SFX_VOLUME * Number($('sfxVolume').value) / 100;
    master.connect(audio.destination);
  }

  music.currentTime = 0;
  if (!await playMusic()) return;
  pausedAt = 0;
  notes = chart.map((b, i) => ({ t: b * BEAT, i, result: null }));
  combo = best = score = perfect = good = misses = strays = 0;
  particles = [];
  fx = null;
  state = 'playing';
  showGameplay();
  canvas.inert = false;
  $('modal').hidden = true;
  $('pause').disabled = false;
  $('pause').setAttribute('aria-label', 'Pause game');
  $('status').textContent = 'Listen for four beats. Tap when the rice reaches the red target.';
  canvas.focus();
  if (document.hidden) pause();
}
function pause(){
 if(state!=='playing')return;
 pausedAt=time();state='paused';music.pause();audio.suspend();
 $('modal').hidden=false;$('pause').setAttribute('aria-label','Resume game');$('resume').focus();
}
async function resume() {
  if (state !== 'paused' || !await playMusic()) return;
  state = 'playing';
  $('modal').hidden = true;
  $('pause').setAttribute('aria-label', 'Pause game');
  canvas.focus();
  if (document.hidden) pause();
}
function finish(){
 state='result';pausedAt=END;music.pause();audio.suspend();
 const acc=Math.round((perfect+good*.7)/(notes.length+strays)*100);
 $('modal').hidden=true;$('settings').hidden=true;$('quitDialog').hidden=true;
 $('results').hidden=false;$('beatHud').hidden=true;$('pause').hidden=true;
 $('gameInfo').hidden=true;$('progressTrack').hidden=true;
 $('accuracy').innerHTML=ServeUI.percentSVG(acc);$('accuracy').setAttribute('aria-label',acc+' percent accuracy');
 document.querySelector('.result-title').src=acc>=85?ui+'titles/nice-cuts.png':ui+'feedback/miss.png';
 document.querySelector('.result-title').alt=acc>=85?'NICE CUTS!':'TRY AGAIN';
 $('resultStats').textContent='PERFECT '+perfect+' / GOOD '+good+' / MISS '+misses+'\nBEST COMBO '+best+' / SCORE '+score.toLocaleString();
 $('pause').disabled=true;$('resultRetry').focus();$('status').textContent='Order complete. Review your result or try again.';
}
function hit(){if(state!=='playing')return;const t=time(),judge=t-offset/1000;if(t<1.7)return;let n=notes.filter(n=>!n.result).reduce((a,b)=>!a||Math.abs(b.t-judge)<Math.abs(a.t-judge)?b:a,null);if(n&&Math.abs(n.t-judge)<=.155){const delta=judge-n.t;const result=Math.abs(delta)<=.075?'perfect':'good';n.result=result;combo++;best=Math.max(best,combo);result==='perfect'?perfect++:good++;score+=result==='perfect'?1000+Math.min(combo,20)*25:600;feedback(result,t,n,delta);}else{strays++;combo=0;feedback('wrong',t,notes.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a),0);}}
function riceVoice(at, duration, pitches, formants, volume) {
  const voice = audio.createOscillator();
  voice.type = 'sawtooth';
  voice.frequency.setValueAtTime(pitches[0], at);
  voice.frequency.exponentialRampToValueAtTime(pitches[1], at + duration * .34);
  voice.frequency.exponentialRampToValueAtTime(pitches[2], at + duration);

  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(.001, at);
  envelope.gain.linearRampToValueAtTime(volume, at + .006);
  envelope.gain.exponentialRampToValueAtTime(volume * .6, at + duration * .65);
  envelope.gain.exponentialRampToValueAtTime(.001, at + duration);
  envelope.connect(master);

  for (const frequency of formants) {
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 3.3;
    voice.connect(filter).connect(envelope);
  }

  voice.start(at);
  voice.stop(at + duration);
}

function playSquish(double) {
  const at = audio.currentTime;
  tone(250, at, .025, 'sine', .28, 62);
  if (double) {
    riceVoice(at + .012, .075, [420, 720, 590], [690, 2570], .65);
    riceVoice(at + .095, .109, [570, 410, 225], [925, 1540], .78);
    tone(460, at + .172, .026, 'triangle', .14, 155);
  } else {
    riceVoice(at + .016, .098, [305, 505, 275], [750, 2110], .78);
  }
}

function feedback(kind, t, n, delta) {
  const success = kind === 'perfect' || kind === 'good';
  fx = { kind, t, n, delta };
  if (success) {
    playSquish(combo === 2);
    for (let i = 0; i < 18; i++) {
      particles.push({ x: 600, y: 425, vx: (Math.random() - .5) * 700,
        vy: -120 - Math.random() * 500, born: t, r: Math.random() * 4 + 3 });
    }
    if (combo % 8 === 0) $('status').textContent = combo + ' COMBO! Keep serving.';
  } else {
    tone(110, audio.currentTime, .18, 'sawtooth', .12, 55);
    $('status').textContent = kind === 'miss'
      ? 'Missed that note. Catch the next one.'
      : 'Off beat. Wait for the rice to reach the red target.';
  }
}
function rr(x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}}
function txt(s,x,y,size=20,color=INK,align='left'){c.fillStyle=color;c.font='400 '+size+'px "IBM Plex Mono", monospace';c.textAlign=align;c.fillText(s,x,y);}
function ellipse(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function image(n,x,y,w,h){if(assets[n])c.drawImage(assets[n],x,y,w,h);}
function centeredArt(name, y, width, height) {
  const art = assets[name];
  const scale = Math.min(width / art.naturalWidth, height / art.naturalHeight);
  const w = art.naturalWidth * scale;
  const h = art.naturalHeight * scale;
  image(name, (1200 - w) / 2, y - h / 2, w, h);
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
const visible=state==='ready'||state==='loading'||state==='tutorial';const items=visible?[{t:t-.9,i:-1,result:'perfect'},{t:t,i:0,result:null},{t:t+.9,i:1,result:null}]:notes;
for(const n of items){const x=600+(t-n.t)*440;if(x< -190||x>1390)continue;const active=fx&&fx.n===n&&t-fx.t<.45;const a=active?t-fx.t:1;const scale=active&&fx.kind!=='miss'?1+.25*Math.sin(a*22)*Math.exp(-a*7):1;image('plate',x-126,430,252,110);rice(x,448,n.result==='perfect'||n.result==='good',scale,n.result==='miss'||(active&&fx.kind==='wrong'));if(n.result==='miss'&&x<900)angry(x+60,320,1.05);}
const age=fx?t-fx.t:99;const down=age<.22?Math.sin(Math.min(1,age/.16)*Math.PI):0;
if(visible)hand(815,282+Math.sin(t*3)*8,260,0,true);else hand(600,280+down*105,245,age>.32?0:Math.PI/2,age>.32);
if(age<.7 && !['perfect','good'].includes(fx.kind)) angry(695,277,1.4);
if(!visible){txt(combo?combo+' COMBO':'FIND THE BEAT',44,135,20);txt(t<18?'01 / FIND YOUR RHYTHM':t<28?'02 / PICK UP THE PACE':'04 / ONE MORE ORDER',47,167,14);}
}
function squish(t){c.fillStyle=YELLOW;c.fillRect(0,0,1200,675);const g=c.createRadialGradient(600,340,10,600,340,650);g.addColorStop(0,'#fff9bf');g.addColorStop(1,'#ffe879');c.fillStyle=g;c.fillRect(0,0,1200,675);const age=fx?t-fx.t:99,ok=fx&&['perfect','good'].includes(fx.kind),impact=age<.3?Math.sin(Math.min(1,age/.3)*Math.PI):0;txt(age<.5&&!ok?'OFF BEAT':'SQUISH!',42,145,22);txt('03 / SQUISH ONCE EVERY TWO BEATS',600,230,17,INK,'center');star(600,345,145+impact*35,'#ff8769',t*.1);
c.save();c.translate(600,355);c.scale(1-impact*.4,1+impact*.25);rice(0,30,true,1.35,age<.6&&!ok);c.restore();
// Oversized hands fill the frame, as in the abstract storyboard.
hand(175+impact*95,357,660,0,false);hand(1025-impact*95,357,660,Math.PI,false);
if(age<.6&&!ok)angry(697,270,1.4);
}
function draw(t){c.setTransform(canvas.width/1200,0,0,canvas.height/675,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.save();const age=fx?t-fx.t:99;if(!reduce&&age<.16){const amp=(1-age/.16)*8;c.translate(Math.sin(age*180)*amp,Math.cos(age*150)*amp*.5);}const close=t>=28&&t<36&&!reduce;if(close)squish(t);else kitchen(t);
for(const p of particles){const a=t-p.born;if(a<0||a>.8)continue;ellipse(p.x+p.vx*a,p.y+p.vy*a+650*a*a,p.r,p.r*1.9,CREAM);}particles=particles.filter(p=>t-p.born<.8);
drawFeedback(t, close ? 465 : 135);
if(state==='playing'||state==='paused'){
 updateHUD(t);
 txt(close?'1 · 2 → SQUISH':'TAP ON THE BEAT',600,655,14,INK,'center');
 if(t<2&&t>=0){
  const count=3-Math.floor(t/BEAT);
  centeredArt(count>0?count:'go',280,235,195);
 }
}
c.restore();}
function loop(ms){requestAnimationFrame(loop);const t=state==='ready'||state==='loading'?ms/1000:time();if(state==='playing'){for(const n of notes){if(!n.result&&t-offset/1000>n.t+.155){n.result='miss';misses++;combo=0;feedback('miss',t,n,0);}}if(t>=END){finish();} $('score').textContent=String(score).padStart(6,'0');$('progress').style.width=Math.min(100,Math.max(0,t/END*100))+'%';$('phase').textContent=t>=28&&t<36?'SQUISH BREAK':'LEVEL 01 · RICE RICE BABY';}if(state!=='paused'&&state!=='result')draw(t);lastFrame=ms;}
const dotAssets={pending:ui+'rhythm/dot-pending.png',hit:ui+'rhythm/dot-hit.png',miss:ui+'rhythm/dot-miss.png',unused:ui+'rhythm/dot-pending.png'};
const hudDots=Array.from(document.querySelectorAll('.hud-dot'));
function updateHUD(t){
 const history=ServeUI.hudWindow(notes,t,offset);
 $('beatHud').hidden=!(state==='playing'||state==='paused')||t<2;
 $('beatHud').dataset.page=String(history.page);
 history.cells.forEach((cell,i)=>{
  const el=hudDots[i];
  if(el.dataset.result!==cell.result){el.src=dotAssets[cell.result];el.dataset.result=cell.result;}
  el.dataset.noteIndex=String(cell.index);el.alt='Note '+(cell.index+1)+': '+cell.result;
 });
}
function showGameplay(){
 for(const id of ['overlay','tutorial','modal','settings','quitDialog','results'])$(id).hidden=true;
 $('pause').hidden=false;$('gameInfo').hidden=false;$('progressTrack').hidden=false;
 $('beatHud').hidden=true;resizeCanvas();
}
function showTutorial(){
 if(state!=='ready')return;
 state='tutorial';$('overlay').hidden=true;$('tutorial').hidden=false;
 $('status').textContent='Listen, then tap on the beat. Select GOT IT when ready.';
 resizeCanvas();$('gotIt').focus();
}
function goHome(){
 music.pause();if(audio)audio.suspend();music.currentTime=0;pausedAt=0;state='ready';
 notes=[];combo=best=score=perfect=good=misses=strays=0;fx=null;particles=[];
 for(const id of ['tutorial','modal','settings','quitDialog','results','beatHud','pause','gameInfo','progressTrack'])$(id).hidden=true;
 $('overlay').hidden=false;canvas.inert=true;$('pause').disabled=true;
 $('status').textContent='Listen first. Tap on the beat.';resizeCanvas();$('start').focus();
}
function openSettings(){
 if(state==='playing')pause();
 $('settings').hidden=false;
 for(const b of [$('startSettings'),$('settingsToggle')])b.setAttribute('aria-expanded','true');
 $('musicVolume').focus();
}
function closeSettings(){
 $('settings').hidden=true;
 for(const b of [$('startSettings'),$('settingsToggle')])b.setAttribute('aria-expanded','false');
 (state==='paused'?$('resume'):$('startSettings')).focus();
}
function sliderFill(el){
 const min=Number(el.min)||0,max=Number(el.max)||100;
 el.style.setProperty('--fill',((Number(el.value)-min)/(max-min)*100)+'%');
}
function resizeCanvas(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3);
 const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 if(state==='paused')draw(pausedAt);
}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener('resize',resizeCanvas);
if(document.fonts)document.fonts.load('16px "IBM Plex Mono"').then(()=>{if(state==='paused')draw(pausedAt);});
$('start').onclick=showTutorial;$('gotIt').onclick=start;
$('retry').onclick=start;$('resultRetry').onclick=start;$('resume').onclick=resume;
$('pause').onclick=()=>state==='paused'?resume():pause();
$('pauseHome').onclick=()=>{$('quitDialog').hidden=false;$('cancelQuit').focus();};
$('cancelQuit').onclick=()=>{$('quitDialog').hidden=true;$('resume').focus();};
$('confirmQuit').onclick=goHome;$('resultHome').onclick=goHome;
$('startSettings').onclick=openSettings;$('settingsToggle').onclick=openSettings;$('settingsBack').onclick=closeSettings;
$('sound').onclick=()=>{muted=!muted;music.muted=muted;if(master)master.gain.value=muted?0:SFX_VOLUME*Number($('sfxVolume').value)/100;$('sound').textContent='SOUND '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(muted));};
$('musicVolume').oninput=e=>{music.volume=Number(e.target.value)/100;sliderFill(e.target);};
$('sfxVolume').oninput=e=>{if(master)master.gain.value=muted?0:SFX_VOLUME*Number(e.target.value)/100;sliderFill(e.target);};
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.game').requestFullscreen().catch(()=>{$('status').textContent='Fullscreen is unavailable in this browser.';});};
$('offset').oninput=e=>{offset=Number(e.target.value);$('offsetLabel').textContent=offset+' ms';sliderFill(e.target);};
$('motion').onchange=e=>{reduce=e.target.checked;};
for(const el of [$('offset'),$('musicVolume'),$('sfxVolume')])sliderFill(el);
canvas.tabIndex=0;
canvas.onpointerdown=e=>{if(e.button!==0)return;hit();};
document.addEventListener('keydown',e=>{
 if(e.target.matches('input'))return;
 if(e.code==='Space'&&!e.repeat){
  if(e.target.matches('button'))return;
  e.preventDefault();if(state==='ready')showTutorial();else if(state==='tutorial')start();else hit();
 }
 if(e.code==='Escape'){
  e.preventDefault();
  if(!$('quitDialog').hidden){$('cancelQuit').click();return;}
  if(!$('settings').hidden){closeSettings();return;}
  state==='paused'?resume():pause();
 }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
Promise.all(Object.entries(assetPaths).map(([n,path])=>new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>{assets[n]=img;resolve();};img.onerror=()=>reject(new Error(n));img.src=path;
}))).then(()=>{state='ready';$('start').disabled=false;resizeCanvas();}).catch(e=>{$('status').textContent='An asset could not load: '+e.message+'. Keep the assets folder beside index.html.';});
resizeCanvas();requestAnimationFrame(loop);
