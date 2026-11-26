'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),c=canvas.getContext('2d');
let clockOrigin = 0;
const perfectWindow = .24 * BEAT;
const goodWindow = .4 * BEAT;
const SFX_VOLUME = .9;
const INK='#00133a',CREAM='#fffbed',RED='#ff583f',YELLOW='#ffe879';
const assets = {};
const ui = 'assets/ui/elements/';
const assetPaths = {
  table: 'assets/level1/table.png',
  machine: 'assets/level1/imgMachineNormal1.png',
  loose: 'assets/level1/imgRiceBefore1.png',
  shaped: 'assets/level1/imgRiceShaped1.png',
  inaccurate: 'assets/level1/imgRiceInaccurate1.png',
  open: 'assets/level1/imgImage1.png',
  pinch: 'assets/level1/imgImage4.png',
  chop: 'assets/level1/imgImage5.png',
  smoke: 'assets/level1/imgBlackSmoke2.png',
  sponge: 'assets/level1/imgSpongeNormal1.png',
  squeezed: 'assets/level1/imgSpongeSqueezed1.png',
  drops: 'assets/level1/imgWaterDrops2.png',
  onBeat: ui + 'feedback/on-beat.png',
  tooEarly: ui + 'feedback/too-early.png',
  tooLate: ui + 'feedback/too-late.png',
  3: ui + 'countdown/3.png', 2: ui + 'countdown/2.png', 1: ui + 'countdown/1.png'
};
let state='loading',audio,master,pausedAt=0,muted=false,notes=[],combo=0,best=0,score=0,perfect=0,good=0,misses=0,strays=0,fx=null,particles=[],lastFrame=0,offset=0;
let reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;$('motion').checked=reduce;
const servings = [];
const chart = [];
// Seconds within each supplied phrase; beat coordinates are derived without quantizing.
const phraseSeconds = {
  rice:{charge:.60,landing:.94,keys:[1.04,1.50],cueKind:'cueRice'},
  triple:{charge:.18,landing:1.70,launches:[.18,.65,1.18],keys:[1.84,2.2733,2.74,3.19],cueKind:'cueTriple'},
  bounce:{charge:.015,landing:.55,bounces:[.07,.30],keys:[.61,.86],cueKind:'cueBounce'},
  sponge:{charge:.02,landing:.35,keys:[.49],cueKind:'cueSponge'}
};
const phrases=Object.fromEntries(Object.entries(phraseSeconds).map(([kind,p])=>[kind,{
  ...p,charge:p.charge/BEAT,landing:p.landing/BEAT,keys:p.keys.map(t=>t/BEAT),
  launches:p.launches?.map(t=>t/BEAT),bounces:p.bounces?.map(t=>t/BEAT),length:(p.keys.at(-1)+.25)/BEAT
}]));
for(let i=0;i<RICE_SCORE.groups.length;i++){
  const entry=RICE_SCORE.groups[i],phrase=phrases[entry.kind];
  const next=RICE_SCORE.groups[i+1]?.seconds ?? RICE_SCORE.duration;
  const group={...phrase,beat:entry.seconds/BEAT,kind:entry.kind,count:entry.kind==='triple'?3:1,
    length:(next-entry.seconds)/BEAT};
  servings.push(group);
  phrase.keys.forEach((key,slot)=>chart.push({beat:group.beat+key,group,slot,
    action:slot===phrase.keys.length-1?'d':'a'}));
}
const levelServings=servings.slice(),levelChart=chart.slice();
const levelEnd=RICE_SCORE.duration;
let END = levelEnd;
const lessons = [
  {kind:'rice', title:'正常出饭', hint:'听机器运转；A 捏成形，D 向下扫走。'},
  {kind:'triple', title:'故障连出', hint:'听红灯与烟声；从右到左按三次 A，再按 D。'},
  {kind:'bounce', title:'故障反弹', hint:'听卡顿机器与反弹声；饭落稳后 A 捏、D 扫。'},
  {kind:'sponge', title:'海绵', hint:'听挤压声与“吧唧”；只按 D 拍走，A 捏住是错误分支。'}
];
let lessonMode = 'level', lessonIndex = -1;
const time = () => state === 'playing' ? audio.currentTime - clockOrigin : pausedAt;
let startingPlayback = false;
let gesture = null;
let soundtrack;
let studio;
async function prepareAudio() {
  if (startingPlayback) return false;
  startingPlayback = true;
  try {
    await audio.resume();
    return true;
  } catch {

    $('status').textContent = '音效未能启动，请重新点击开始。';
    return false;
  } finally {
    startingPlayback = false;
  }
}

function actionSound(kind,slot,action) {
  if(kind==='sponge')return action==='a'?'spongePinch':'spongeSlap';
  if(kind==='bounce')return action==='a'?'bouncePinch':'bounceSlap';
  if(kind==='triple')return action==='a'?'triplePinch'+(slot+1):'tripleSlap';
  return action==='a'?'pinch':'slap';
}
function beginRound(mode, index = -1) {
  const continuing=mode!=='level' && lessonMode!=='level' && lessonIndex===index;
  const musicOffset=continuing ? (soundtrack.musicOffset ?? 0)+time() : 0;
  lessonMode = mode;
  lessonIndex = index;
  if (mode === 'level') {
    servings.splice(0, servings.length, ...levelServings);
    chart.splice(0, chart.length, ...levelChart);
    END = levelEnd;
  } else {
    const kind = lessons[index].kind, phrase = phrases[kind];
    const group = {...phrase, beat:2, kind, count:kind==='triple'?3:1,
      length:phrase.length+1};
    servings.splice(0, servings.length, group);
    chart.splice(0, chart.length, ...phrase.keys.map((_, slot) => ({
      beat:group.beat+phrase.keys[slot], group, slot,
      action:slot===phrase.keys.length-1?'d':'a'
    })));
    END = (group.beat+group.length)*BEAT+.3;
  }
  pausedAt = 0;
  soundtrack.reset(servings, chart, mode === 'level');
  soundtrack.musicOffset=musicOffset;
  notes = chart.map((event, i) => ({...event, t:event.beat*BEAT, i, result:null}));
  combo = best = score = perfect = good = misses = strays = 0;
  particles = []; fx = null; gesture = null;
  for (const group of servings) {delete group.exit; group.pinches=[];}
  clockOrigin = audio.currentTime;
  state = 'playing';
  showGameplay(); updateHUD(0); canvas.inert = false; $('modal').hidden = true;
  $('pause').disabled = false; $('pause').setAttribute('aria-label','Pause game');
  $('status').textContent = mode === 'level'
    ? '音乐关卡：跟随音乐捏饭、拍走；海绵只按 D，A 是误捏。'
    : '教学 '+(index+1)+'/4 · '+(mode==='demo'?'先看示范：':'轮到你：')+lessons[index].hint+' 短音响起时按键，前后 0.4 拍内算跟上。';
  canvas.focus();
  if (document.hidden) pause();
}
async function start(mode = 'demo') {
  if (state === 'loading' || state === 'playing' || startingPlayback) return;
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)({latencyHint:'interactive'});
    master = audio.createGain();
    master.gain.value = muted ? 0 : SFX_VOLUME;
    master.connect(audio.destination);
    soundtrack = new KitchenSoundtrack(audio, master);bindUIAudio(soundtrack,audio,master);
  }


  if (!await prepareAudio()) return;
  studio.stopTimeline();
  await studio.ready;
  soundtrack.editor = studio;
  beginRound(mode === 'level' ? 'level' : 'demo', mode === 'level' ? -1 : 0);
}
function pause(){
 if(state!=='playing')return;
 pausedAt=time();soundtrack.stop(pausedAt);state='paused';audio.suspend();
 $('modal').hidden=false;$('resume').focus();
}
async function resume(){
 if(state!=='paused'||!await prepareAudio())return;
 studio.stopTimeline();
 clockOrigin=audio.currentTime-pausedAt;state='playing';$('modal').hidden=true;canvas.focus();
}
function finish(){
 soundtrack.stop(END);state='result';pausedAt=END;audio.suspend();
 const acc=Math.round((perfect+good*.7)/(notes.length+strays)*100);
 for(const id of ['modal','settings','quitDialog','beatHud','pause','gameInfo','progressTrack'])$(id).hidden=true;
 $('results').hidden=false;
 $('accuracy').src=ui+'result/percentages/'+String(acc).padStart(3,'0')+'.png';
 $('accuracy').alt=acc+'%';$('accuracy').setAttribute('aria-label',acc+' percent accuracy');
 $('resultStats').textContent='PERFECT '+perfect+' / GOOD '+good+' / MISS '+misses+'\nBEST COMBO '+best+' / SCORE '+score.toLocaleString();
 $('resultRetry').focus();$('status').textContent='Order complete.';
}
function demonstrate(t) {
  for (const n of notes) {
    if (n.result || t < n.t) continue;
    const group = n.group;
    if (n.action === 'a' && group.kind !== 'sponge') {
      group.pinches.push({t:n.t, clean:true});
    } else {
      group.exit = {t:n.t, action:n.action, inputAt:n.t};
    }
    gesture = {action:n.action, t:n.t, note:n};
    if (n.action === 'd') {
      const kind=actionSound(group.kind,n.slot,'d');
      for (let i=0;i<1;i++) soundtrack.add(n.t+studio.hitOffset(kind,0)+i*.045,kind,1+i*.05);
    } else {
      const kind=actionSound(group.kind,n.slot,'a');
      soundtrack.add(n.t+studio.hitOffset(kind,0),kind);
    }
    n.result = 'demo';
  }
}
function advanceTutorial() {
  if (lessonMode === 'demo') {
    beginRound('practice', lessonIndex);
    return;
  }
  const passed = misses === 0 && strays === 0 &&
    notes.every(n => n.result === 'perfect' || n.result === 'good');
  if (!passed) {
    beginRound('practice', lessonIndex);
    $('status').textContent = '再练一次 · '+lessons[lessonIndex].hint;
  } else if (lessonIndex < lessons.length-1) {
    beginRound('demo', lessonIndex+1);
  } else beginRound('level');
}
function hit(action = 'a') {
  if (state !== 'playing' || lessonMode === 'demo') return;
  const t = time(), beat = t / BEAT, judge = t - offset / 1000;
  gesture = {action, t};
  if (beat < (lessonMode === 'level' ? 0 : 2)) return;
  const expectedFeedbackNote = notes.find(note => !note.result);
  const current = servings.find(g => beat >= g.beat && beat < g.beat + g.length);
  const settled = current && beat >= current.beat + current.landing;
  const active = settled && !current.exit;
  const slot = current?.pinches.length || 0;
  let n;
  if (active && action === 'a' && current.kind !== 'sponge' && slot < current.count) {
    n = notes.find(note => note.group === current && note.action === 'a' && note.slot === slot);
    // Physical contact follows input even if the rhythm judgment is late.
    current.pinches.push({t, clean: Math.abs(n.t - judge) <= goodWindow});
  } else if (active && (action === 'd' || current.kind === 'sponge') &&
             (current.count === 1 || slot === current.count)) {
    n = notes.find(note => note.group === current && (current.kind === 'sponge' || note.action === 'd'));
    current.exit = {t: t + (action === 'a' ? .25 : 0), action, inputAt: t};
  }
  gesture.note = n;
  if (n && (lessonMode !== 'level' || action !== n.action || !studio.isClipDeleted('hit' + n.i))) {
    if (action === 'a') {
      const kind=actionSound(current.kind,n.slot,'a');
      soundtrack.playInput(kind);
    } else {
      const kind=actionSound(current.kind,n.slot,'d');
      soundtrack.playInput(kind);
    }
  }
  if (n && !n.result && action === n.action && Math.abs(n.t-judge) <= goodWindow) {
    const delta = judge - n.t;
    n.result = Math.abs(delta) <= perfectWindow ? 'perfect' : 'good';
    n.hitAt = t;
    combo++;
    best = Math.max(best,combo);
    if (n.result === 'perfect') perfect++; else good++;
    score += n.result === 'perfect' ? 1000 + Math.min(combo,20)*25 : 600;
    feedback(n.result,t,n,delta);
  } else {
    if (n && !n.result) n.result = 'wrong';
    strays++; combo=0;
    feedback('wrong',t,n,0,{action, expected:expectedFeedbackNote});
  }
  if (current?.kind === 'sponge' && action === 'a' && current.exit?.inputAt === t) fx.splash = true;
}
// Classify the displayed label only; scoring, note results and timing windows stay unchanged.
function feedbackLabel(kind, t, note, context) {
  if (kind === 'perfect' || kind === 'good') return 'onBeat';
  if (kind === 'miss') return 'tooLate';
  const target = note || context?.expected;
  if (!target || context?.action !== target.action) return 'offBeat';
  const delta = t - offset / 1000 - target.t;
  if (delta < 0) return 'tooEarly';
  if (delta > goodWindow) return 'tooLate';
  return 'offBeat';
}
function feedback(kind, t, n, delta, context) {
  const success = kind === 'perfect' || kind === 'good';
  fx = { kind, t, n, delta, label:feedbackLabel(kind,t,n,context) };

  if (success) {

    for (let i = 0; i < 18; i++) {
      particles.push({ x: 600, y: 425, vx: (Math.random() - .5) * 700,
        vy: -120 - Math.random() * 500, born: t, r: Math.random() * 4 + 3 });
    }
    if (combo % 8 === 0) $('status').textContent = combo + ' 连击！饭团很开心。';
  } else {
    soundtrack.effect('mistake', audio.currentTime);
    $('status').textContent = fx.label === 'tooEarly' ? '按早了，听下一次提示再出手。'
      : fx.label === 'tooLate' ? '按晚了或漏拍了，跟上下一拍。'
      : '按键不对应或多按了：A 捏饭，D 扫走；海绵只按 D。';
  }
}
function rr(x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}}
function txt(s,x,y,size=20,color=INK,align='left'){c.fillStyle=color;c.font='900 '+size+'px "Arial Black", "Microsoft YaHei", sans-serif';c.textAlign=align;c.fillText(s,x,y);}
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
  const label = fx.label || (hit ? 'onBeat' : fx.kind === 'miss' ? 'tooLate' : 'offBeat');
  if (label === 'offBeat') txt('OFF BEAT!',600,y+14,40,'#FF5537','center');
  else centeredArt(label,y,hit ? 284 : 350,122);
  if (hit) {
    const detail = fx.kind.toUpperCase()+' · '+(fx.delta>0?'+':'')+Math.round(fx.delta*1000)+' ms';
    txt(detail,600,y+79,15,INK,'center');
  }
}

function hand(x,y,size=240,rotation=Math.PI/2,open=false){const a=assets.hand;if(!a)return;c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(a,0,open?0:a.height/2,a.width/3,a.height/2,-size/2,-size/2,size,size);c.restore();}
function star(x,y,r,color,rot=0){c.save();c.translate(x,y);c.rotate(rot);c.beginPath();for(let i=0;i<20;i++){const a=i*Math.PI/10,v=i%2?r*.53:r;c.lineTo(Math.cos(a)*v,Math.sin(a)*v);}c.closePath();c.fillStyle=color;c.fill();c.restore();}
function angry(x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=CREAM;c.lineWidth=19;c.lineCap='round';const path=()=>{c.beginPath();for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){c.moveTo(sx*12,sy*49);c.lineTo(sx*12,sy*24);c.quadraticCurveTo(sx*12,sy*12,sx*25,sy*12);c.lineTo(sx*48,sy*12);}c.stroke();};path();c.strokeStyle=RED;c.lineWidth=11;path();c.restore();}
function rice(x,y,formed=false,scale=1,angryFace=false){c.save();c.translate(x,y);c.scale(scale,scale);image(formed?'formed':'rice',-180,-224,360,300);if(angryFace){ellipse(0,-35,35,24,'#fffbed');c.strokeStyle=INK;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-24,-48);c.lineTo(-10,-40);c.moveTo(24,-48);c.lineTo(10,-40);c.moveTo(-13,-21);c.quadraticCurveTo(0,-35,13,-21);c.stroke();}c.restore();}
function transformed(name, x, y, w, h, rotation = 0, flip = false) {
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  if (flip) c.scale(1, -1);
  image(name, -w / 2, -h / 2, w, h);
  c.restore();
}
const clamp01 = value => Math.max(0, Math.min(1, value));
const easeOut = value => 1 - (1 - clamp01(value)) ** 3;
const easeIn = value => clamp01(value) ** 3;
function impactFlash(x,y,age,duration,radius) {
  if (age<0 || age>duration) return;
  const progress=age/duration;
  c.save();
  c.globalAlpha=(1-progress)**2;
  c.strokeStyle='#fff7b0'; c.lineWidth=8*(1-progress)+2;
  c.beginPath(); c.arc(x,y,15+radius*progress,0,Math.PI*2); c.stroke();
  c.strokeStyle='#ffb34a'; c.lineWidth=5;
  for(let j=0;j<7;j++){
    const angle=j*Math.PI*2/7;
    c.beginPath();
    c.moveTo(x+Math.cos(angle)*(20+radius*progress),y+Math.sin(angle)*(20+radius*progress));
    c.lineTo(x+Math.cos(angle)*(40+radius*progress),y+Math.sin(angle)*(40+radius*progress));
    c.stroke();
  }
  c.restore();
}
function drawSmoke(age,charge,outletX,outletY) {
  // Emit small overlapping original-art puffs from the outlet, then drift and fade.
  for(let i=0;i<14;i++){
    const birth=i*.045;
    if(birth>charge+.12) break;
    const elapsed=age-birth;
    if(elapsed<0 || elapsed>.8) continue;
    const progress=elapsed/.8;
    const size=60+160*easeOut(progress);
    c.save();
    c.globalAlpha=.48*Math.sin(Math.PI*progress)**.65;
    c.filter='blur('+(1+progress*4)+'px)';
    const x=outletX+150*easeOut(progress)+Math.sin(i*2.7)*25*progress;
    const y=outletY-210*progress*progress+Math.cos(i*2.1)*30*progress;
    transformed('smoke',x,y,size*1.15,size,.2*Math.sin(i+progress));
    c.restore();
  }
}
function draw(t) {
  const scale=canvas.height/675;
  c.setTransform(scale,0,0,scale,(canvas.width-1200*scale)/2,0);
  c.clearRect(0,0,1200,675);
  c.save();
  c.translate(0, 61);
  c.scale(1200 / 1950, 1200 / 1950);
  c.beginPath(); c.rect(0, 0, 1950, 900); c.clip();
  image('table', 0, 0, 1950, 900);
  const playing = ['playing', 'paused', 'result'].includes(state);
  const beat = playing ? t / BEAT : -10;
  const group = servings.find(g => beat >= g.beat && beat < g.beat + g.length);
  const local = group ? beat - group.beat : 0;
  const fault = group && (group.kind === 'triple' || group.kind === 'bounce');
  const charging = group && local < group.charge;
  const pressure = charging ? easeIn(local / group.charge) : 0;
  const releaseAge = group ? local - group.charge : -1;
  const recoil = releaseAge >= 0 ? Math.sin(releaseAge*38)*Math.exp(-releaseAge*13) : 0;
  const shake = reduce ? 0 : charging ? Math.sin(t*83)*(.3+pressure)*(fault?23:3) : recoil*23;
  const machineX = 327.5 + shake - pressure*20;
  const machineY = 449.5 + (reduce ? 0 : charging && fault ? Math.cos(t*67)*11 : 0);
  if (fault) {
    const intensity = charging ? .5 + .2*Math.sin(t*24) : .22;
    c.save();
    c.translate(machineX, machineY);
    c.scale(1,1.13);
    const glow = c.createRadialGradient(0,0,190,0,0,490);
    glow.addColorStop(0, 'rgba(255,40,35,0)');
    glow.addColorStop(.55, 'rgba(255,45,30,'+intensity+')');
    glow.addColorStop(1, 'rgba(255,45,30,0)');
    c.fillStyle=glow; c.fillRect(-500,-500,1000,1000);
    c.restore();
  }
  for (const batch of servings) {
    const age = beat - batch.beat;
    if (age < batch.charge) break;
    const endTime = (batch.beat + batch.length) * BEAT;
    const exitAge = batch.exit ? t - batch.exit.t : t - endTime;
    if (exitAge > .85) continue;
    const departure = easeIn((exitAge-.08)/.32)*1250;
    for (let i=batch.count-1; i>=0; i--) {
      const target = batch.count === 3 ? 1460-i*272 : 1105;
      const flight = clamp01((age-batch.charge)/(batch.landing-batch.charge));
      let x = 485+(target-485)*easeOut(flight);
      let y = 450-65*Math.sin(Math.PI*flight);
      let squash = 0;
      if (batch.count === 3) {
        const launch = batch.launches?.[i] ?? batch.charge + i * ((.5-batch.charge)/3);
        if (age < launch) continue;
        const travelTime = batch.launches ? .20/BEAT : (.5-batch.charge)/3;
        const u = clamp01((age-launch)/travelTime);
        x = 485 + (target-485)*easeOut(u);
        y = 450 - 35*Math.sin(Math.PI*u);
        for (let k=Math.max(1,i); k<3; k++) {
          const impact = age - ((batch.launches?.[k] ?? batch.charge+k*travelTime)+travelTime);
          if (impact >= 0 && impact < .32) {
            const pulse = Math.exp(-13*impact);
            x += (i===k ? -22 : 30)*Math.sin(24*impact)*pulse;
            squash -= .19*Math.cos(24*impact)*pulse;
          }
        }
      }
      if (batch.kind === 'bounce') {
        const points = [[485,450],[850,375],[1170,125],[1780,380],[target,450]];
        const impacts=batch.bounces ?? [1.2,1.4];
        const times = [batch.charge,(batch.charge+impacts[0])/2,...impacts,batch.landing];
        const seg = times.slice(1).findIndex(end => age < end);
        if (seg >= 0) {
          const u = clamp01((age-times[seg])/(times[seg+1]-times[seg]));
          const f = seg === 0 ? easeOut(u) : .65*u+.35*easeOut(u);
          if (seg === 0) squash += .32*(1-u);
          x = points[seg][0]+(points[seg+1][0]-points[seg][0])*f;
          y = points[seg][1]+(points[seg+1][1]-points[seg][1])*f-35*Math.sin(Math.PI*u);
        }
        for (const [at,axis] of [[impacts[0],1],[impacts[1],-1],[batch.landing,1]]) {
          if (at < batch.landing) impactFlash(at===impacts[0]?1170:1850,at===impacts[0]?55:380,age-at,.3,120);
          const dt = age-at;
          if (dt>=-.045 && dt<.22) squash += axis*.44*(dt<0 ? easeIn(1+dt/.045) : Math.cos(dt*36)*Math.exp(-dt*18));
        }
      }
      const pinch = batch.pinches?.[i];
      if (pinch) squash += .21*Math.sin(Math.PI*clamp01((t-pinch.t)/.24));
      let name = pinch ? (pinch.clean ? 'shaped' : 'inaccurate') : 'loose';
      if (batch.kind === 'sponge') name = batch.exit?.action==='a' ? 'squeezed' : 'sponge';
      const w = name==='shaped'?372:name==='sponge'?603:552;
      const h = name==='shaped'?340:name==='sponge'?402:368;
      const fling = batch.exit?.action==='a';
      let rotation = 0;
      if (batch.exit?.action === 'd') {
        // Each portion receives the impulse when the same palm edge reaches it.
        const contact = .13 + i*.045;
        const sinceContact = exitAge-contact;
        const travel = Math.max(0,sinceContact);
        x -= 2050*travel;
        y += 820*travel+1450*travel*travel;
        rotation = -2.4*travel;
        if (sinceContact>=0 && sinceContact<.12) {
          squash += .3*Math.sin(Math.PI*sinceContact/.12);
          impactFlash(x+70,y-75,sinceContact,.14,48);
        }
      } else {
        x += fling ? departure*.65 : 0;
        y += fling ? -departure : departure;
      }
      transformed(name,x,y,w*(1+squash),h/(1+squash),rotation);
    }
  }
  // Machine covers objects still inside its outlet.
  c.save();
  c.shadowColor = fault ? '#ff3020' : 'transparent';
  c.shadowBlur = fault ? (charging ? 42 : 22) : 0;
  transformed('machine', machineX, machineY, 1139, 759*(1-pressure*.06), -Math.PI/2);
  c.restore();
  if (fault) {
    ellipse(machineX-89.5,machineY-203.5,21,21,'#ff2020');
    if (group.kind === 'triple') drawSmoke(local, group.charge, machineX+285, machineY-8);
  }
  const age = gesture ? t - gesture.t : 99;
  if (age >= 0 && age < .48) {
    if (gesture.action === 'd') {
      const target = gesture.note?.group.count === 3 ? 1460 : 1105;
      const contactAge = age-.13;
      // The little-finger edge reaches the rice before the shared left/down motion.
      const approach = easeOut(age/.13);
      const x = target+95+(1-approach)*180-2050*Math.max(0,contactAge);
      const y = 270-(1-approach)*490+820*Math.max(0,contactAge)+1450*Math.max(0,contactAge)**2;
      const angle = -Math.PI/2+.25*(1-approach)-2.4*Math.max(0,contactAge);
      transformed('chop',x,y,600,714,angle);
    } else {
      const target = gesture.note?.group.count === 3 ? 1460 - (gesture.note.slot || 0) * 272 : 1163;
      const reach = age < .07 ? easeOut(age / .07) : 1 - easeIn((age - .1) / .14);
      transformed('pinch', 2250 + (target - 2250) * reach, 472, 706, 645, -Math.PI / 2);
    }
  }
  if (fx?.splash && t - fx.t < .6) {
    const splash = easeOut((t - fx.t) / .6);
    c.globalAlpha = 1 - splash;
    transformed('drops', 905 - splash * 180, 240 - splash * 180, 244, 191, -166.2 * Math.PI / 180, true);
    c.globalAlpha = 1;
  }
  c.restore();
  if (playing && lessonMode !== 'level' && t < 1.7 && (!fx || t - fx.t >= .7)) {
    rr(329, 75, 542, 102, 18, 'rgba(255,251,237,.94)', INK);
    txt('教学 '+(lessonIndex+1)+'/4 · '+lessons[lessonIndex].title,600,116,24,INK,'center');
    txt(lessonMode==='demo'?'先看一遍，记住声音与动作':'轮到你：听短音，在节奏点按键',600,151,19,INK,'center');
  }
  const next = notes.find(n => !n.result);
  const waiting = next && next.t - t > .45 && !charging;
  const instruction = waiting ? '准备 · 听下一拍' : charging ? (fault ? '红灯蓄力 · 等待出饭' : '蓄力出饭') : next?.action === 'd' ? 'D · 向下扫走' : 'A · 捏饭团';
  txt(playing ? instruction : 'A 捏饭 · D 手刀 · 海绵直接拍走', 600, 645, 22, INK, 'center');
  if (playing) {
    txt(combo + ' COMBO', 35, 645, 18);
    const phase = group ? {rice:'正常出饭',bounce:'蓄力弹饭',triple:'连续三份',sponge:'小心海绵'}[group.kind] : '准备下一句';
    const phaseText = lessonMode === 'level' ? 'RICE RICE BABY · '+phase
      : '教学 '+(lessonIndex+1)+'/4 · '+lessons[lessonIndex].title+' · '+(lessonMode==='demo'?'看示范':'你来操作');
    const phaseLabel = $('phase');
    if(phaseLabel.textContent!==phaseText)phaseLabel.textContent=phaseText;
    if (next) {
      const distance = (next.t - t) / BEAT;
      const onBeat = Math.abs(distance) <= .14;
      c.strokeStyle = onBeat ? RED : INK; c.lineWidth = onBeat ? 6 : 3;
      c.beginPath(); c.arc(1040, 150, 20 + Math.max(0, Math.min(2, distance)) * 11, 0, Math.PI * 2); c.stroke();
      txt(next.action.toUpperCase(),1040,158,24,onBeat?RED:INK,'center');
      txt(onBeat?'现在按！':'圆环收拢时按',1040,210,16,onBeat?RED:INK,'center');
    }
    if (beat < (lessonMode === 'level' ? 0 : 2)) {
      const count = (lessonMode === 'level' ? 3 : 2) - Math.floor(t / BEAT);
      if (count > 0) centeredArt(count, 300, 200, 180);
      else txt('GO!',600,330,90,INK,'center');
    }
  }
  drawFeedback(t, 100);
}
function loop(ms){
  requestAnimationFrame(loop);
  if(state!=='playing')return;
  let t=time();
  if (lessonMode === 'demo') demonstrate(t);
  soundtrack.tick(t);
  if (lessonMode !== 'demo') for(const n of notes){
    if(!n.result && t-offset/1000>n.t+goodWindow){
      const visible = !n.group.exit && t < (n.group.beat+n.group.length)*BEAT;
      n.result = visible ? 'miss' : 'skipped';
      // Once an item has left the table, this note cannot be missed again.
      if (visible) {misses++; combo=0; feedback('miss',t,n,0);}
    }
  }
  if(t>=END){if (lessonMode==='level') finish(); else {advanceTutorial(); t=time();}}
  const scoreText=String(score).padStart(6,'0');
  const scoreLabel=$('score');
  if(scoreLabel.textContent!==scoreText)scoreLabel.textContent=scoreText;
  $('progress').style.width=Math.min(100,Math.max(0,t/END*100))+'%';
  if (state === 'playing')updateHUD(t);
  if(state!=='paused'&&state!=='result')draw(t);
  lastFrame=ms;
}
// Display-only HUD: tutorial groups use slim slots; level judgments stay in four-input pages.
// Geometry matches the approved slim transparent bars (60-unit dots, 36-unit gaps).
let hudRound = null, hudStart = 0, hudResults = new WeakMap(), hudSignature = "";
function paintDots(list, first, count, animate = false) {
  const track = $('beatHud').querySelector('.hud-track');
  const existing = new Map(Array.from(track.children, el => [Number(el.dataset.index), el]));
  const wanted = new Set(Array.from({length:count}, (_, i) => first + i));
  for (const [index, el] of existing) if (!wanted.has(index)) el.remove();
  for (let slot = 0; slot < count; slot++) {
    const index = first + slot, note = list[index];
    const el = existing.get(index) || document.createElement('span');
    el.className = 'hud-dot'; el.dataset.index = String(index);
    const result = !note ? 'unused' : !note.result ? 'pending'
      : ['perfect','good','demo'].includes(note.result) ? 'hit' : 'miss';
    el.dataset.result = result;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', note ? 'Input '+(index+1)+' '+note.action.toUpperCase()+': '+result : 'No further input');
    track.appendChild(el);
    if (animate && !reduce) {
      el.getAnimations().forEach(animation => animation.cancel());
      el.animate([{opacity:0},{opacity:1}], {duration:140,easing:'ease-out'});
    }
  }
}
function updateHUD(t) {
  const tutorial = lessonMode !== 'level', count = tutorial ? notes.length : 4;
  const fresh = hudRound !== notes;
  if (fresh) {
    hudRound = notes; hudStart = 0; hudResults = new WeakMap(); hudSignature = "";
    $('beatHud').querySelector('.hud-track').replaceChildren();
  }
  let advanced = false;
  if (!tutorial) {
    for (const note of notes) if (note.result && !hudResults.has(note)) hudResults.set(note,t);
    // Keep every result in its slot until this entire page has been judged.
    // A stray press does not judge a note and therefore cannot move the page.
    while (hudStart + 4 < notes.length) {
      const page = notes.slice(hudStart, hudStart + 4);
      if (!page.every(note => note.result) ||
          page.some(note => t - hudResults.get(note) < .22)) break;
      hudStart += 4; advanced = true;
    }
  }
  const first = tutorial ? 0 : hudStart;
  const signature = lessonMode+':'+first+':'+count+':'+notes.slice(first,first+count).map(n=>n.result || 'pending').join(',');
  if (!fresh && signature === hudSignature) return;
  hudSignature = signature;
  const pad = 24, height = 92;
  const hud = $('beatHud');
  hud.style.setProperty('--hud-width', String(pad*2 + count*60 + (count-1)*36));
  hud.style.setProperty('--hud-height', String(height));
  hud.style.setProperty('--hud-padding', String(pad));
  hud.dataset.variant = 'slim';
  hud.dataset.count = String(count); hud.dataset.start = String(hudStart);
  hud.setAttribute('aria-label', tutorial ? 'Tutorial: '+count+' inputs' : 'Four-input judgment group');
  hud.hidden = false;
  paintDots(notes, tutorial ? 0 : hudStart, count, advanced && !fresh);
}
async function skipTutorial() {
  if (startingPlayback) return;
  if (state === 'tutorial') await start('level');
  else if (state === 'playing' && lessonMode !== 'level') beginRound('level');
}
function showGameplay(){$('skipTutorial').hidden=lessonMode==='level';for(const id of ['overlay','tutorial','modal','settings','quitDialog','results','beatHud','levelSelect','emptyLevel'])$(id).hidden=true;for(const id of ['pause','gameInfo','progressTrack'])$(id).hidden=false;resizeCanvas();}
function showTutorial(){if(state!=='ready')return;state='tutorial';$('skipTutorial').hidden=false;$('overlay').hidden=true;$('tutorial').hidden=false;canvas.inert=true;$('gotIt').disabled=false;$('gotIt').focus();}
function goHome(){if(soundtrack)soundtrack.stop(0);if(audio)audio.suspend();pausedAt=0;state='ready';notes=[];gesture=fx=null;for(const id of ['tutorial','skipTutorial','modal','settings','quitDialog','results','beatHud','pause','gameInfo','progressTrack','levelSelect','emptyLevel'])$(id).hidden=true;$('overlay').hidden=false;$('pause').disabled=true;canvas.inert=true;$('start').focus();}
function openSettings(){if(state==='playing')pause();$('settings').hidden=false;$('musicVolume').focus();}
function sliderFill(el){el.style.setProperty('--fill',((Number(el.value)-Number(el.min||0))/(Number(el.max||100)-Number(el.min||0))*100)+'%');}
function resizeCanvas(){
  const {width,height}=canvas.getBoundingClientRect();
  if(width<=0 || height<=0)return;
  // Keep the number of pixels cleared and painted per frame bounded on Retina displays.
  const scale=Math.min(window.devicePixelRatio||1,2,1600/width,900/height);
  const targetWidth=Math.max(1,Math.round(width*scale));
  const targetHeight=Math.max(1,Math.round(height*scale));
  if(canvas.width===targetWidth && canvas.height===targetHeight)return;
  canvas.width=targetWidth;
  canvas.height=targetHeight;
  if(state==='paused')draw(pausedAt);
}
new ResizeObserver(resizeCanvas).observe(canvas);window.addEventListener('resize',resizeCanvas);
$('skipTutorial').onclick=skipTutorial;
$('start').onclick=showTutorial;$('gotIt').onclick=start;$('resultRetry').onclick=start;$('retry').onclick=start;$('resume').onclick=resume;
$('pause').onclick=()=>state==='paused'?resume():pause();
$('pauseHome').onclick=()=>{$('quitDialog').hidden=false;$('cancelQuit').focus();};
$('cancelQuit').onclick=()=>{$('quitDialog').hidden=true;$('resume').focus();};
$('confirmQuit').onclick=goHome;$('resultHome').onclick=goHome;
$('startSettings').onclick=openSettings;$('settingsToggle').onclick=openSettings;$('settingsBack').onclick=()=>{$('settings').hidden=true;(state==='paused'?$('resume'):$('startSettings')).focus();};
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:SFX_VOLUME;$('sound').textContent='SOUND '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(muted));};
$('musicVolume').oninput=e=>{if(soundtrack)soundtrack.uiMusicGain.gain.value=Number(e.target.value)/100;sliderFill(e.target);};
$('sfxVolume').oninput=e=>{if(soundtrack)soundtrack.uiSfxGain.gain.value=Number(e.target.value)/100;sliderFill(e.target);};
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.game').requestFullscreen().catch(()=>{});};
$('offset').oninput=e=>{offset=Number(e.target.value);$('offsetLabel').textContent=offset+' ms';};$('motion').onchange=e=>{reduce=e.target.checked;};
canvas.tabIndex=0;canvas.onpointerdown=e=>{if(e.button!==0)return;const bounds=canvas.getBoundingClientRect();hit(e.clientX-bounds.left>bounds.width/2?'d':'a');};
document.addEventListener('keydown',e=>{if(e.target.matches('input')||e.target.closest('#audioStudio'))return;if(['KeyA','KeyD','Space'].includes(e.code)&&!e.repeat){if(e.code==='Space'&&e.target.matches('button'))return;e.preventDefault();if(state==='ready')showTutorial();else hit(e.code==='KeyD'?'d':'a');}if(e.code==='Escape'&&state==='playing'){e.preventDefault();pause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
studio=new AudioStudio({groups:levelServings,chart:levelChart,getAudio:()=>audio,getSoundtrack:()=>soundtrack,pauseGame:pause});
Promise.all(Object.entries(assetPaths).map(([n,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{assets[n]=img;resolve();};img.onerror=()=>reject(new Error(n));img.src=path;}))).then(()=>{state='ready';$('start').disabled=false;}).catch(e=>{$('status').textContent='素材未能加载：'+e.message;});requestAnimationFrame(loop);
