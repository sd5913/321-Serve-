'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),c=canvas.getContext('2d');
let clockOrigin = 0;
const perfectWindow = .24;
const goodWindow = .4;
const SFX_VOLUME = .9;
const INK='#142342',CREAM='#fffbed',RED='#ff583f',YELLOW='#ffe879',BPM=60,BEAT=60/BPM;
const assets = {};
const ui = 'assets/ui/elements/';
const assetPaths = {
  table: 'assets/level2/table.png',
  machine: 'assets/level2/imgMachineNormal1.png',
  loose: 'assets/level2/imgRiceBefore1.png',
  shaped: 'assets/level2/imgRiceShaped1.png',
  inaccurate: 'assets/level2/imgRiceInaccurate1.png',
  open: 'assets/level2/imgImage1.png',
  pinch: 'assets/level2/imgImage4.png',
  chop: 'assets/level2/imgImage5.png',
  smoke: 'assets/level2/imgBlackSmoke2.png',
  sponge: 'assets/level2/imgSpongeNormal1.png',
  squeezed: 'assets/level2/imgSpongeSqueezed1.png',
  drops: 'assets/level2/imgWaterDrops2.png',
  onBeat: ui + 'feedback/on-beat.png',
  miss: ui + 'feedback/miss.png',
  3: ui + 'countdown/3.png', 2: ui + 'countdown/2.png', 1: ui + 'countdown/1.png'
};
let state='loading',audio,master,pausedAt=0,muted=false,notes=[],combo=0,best=0,score=0,perfect=0,good=0,misses=0,strays=0,fx=null,particles=[],lastFrame=0,offset=0;
let reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;$('motion').checked=reduce;
const servings = [];
const chart = [];
const phrases = {
  rice:   { length: 1, charge: .17, landing: 1/3, keys: [1/3, 2/3] },
  bounce: { length: 2, charge: .87, landing: 1.6, keys: [1.6, 1.8] },
  triple: { length: 1.5, charge: .23, landing: .5, keys: [.5, .75, 1, 1.25] },
  sponge: { length: 1, charge: .24, landing: .5, keys: [.5] }
};
const pattern = ['rice','rice','rice','bounce','bounce','triple','triple','bounce','bounce','rice','rice','sponge'];
let cursor = 4;
for (let i = 0; i < 30; i++) {
  const kind = pattern[i % pattern.length];
  const phrase = phrases[kind];
  const count = kind === 'triple' ? 3 : 1;
  // One full empty beat follows ejection and every input, including the
  // last input before the next batch begins.
  const firstAction = phrase.landing + 1;
  const length = firstAction + 2 * phrase.keys.length;
  const group = { ...phrase, beat: cursor, kind, count, length };
  servings.push(group);
  phrase.keys.forEach((offset, slot) => {
    chart.push({beat: cursor + firstAction + slot * 2, group, slot,
      action: slot === phrase.keys.length - 1 ? 'd' : 'a'});
  });
  cursor += length;
}
const END = cursor * BEAT + .8;
const time = () => state === 'playing' ? performance.now()/1000 - clockOrigin : pausedAt;
let startingPlayback = false;
let gesture = null;
let soundtrack;
function tone(freq,at,len=.08,type='sine',vol=.15,end=freq){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+len);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(vol,at+.004);g.gain.exponentialRampToValueAtTime(.001,at+len);o.connect(g);g.connect(master);o.start(at);o.stop(at+len+.02);}
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

async function start() {
  if (state === 'loading' || state === 'playing' || startingPlayback) return;
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = muted ? 0 : SFX_VOLUME;
    master.connect(audio.destination);
    soundtrack = new KitchenSoundtrack(audio, master);
  }


  if (!await prepareAudio()) return;
  pausedAt = 0;
  soundtrack.reset(servings);
  notes = chart.map((event, i) => ({ ...event, t: event.beat * BEAT, i, result: null }));
  combo = best = score = perfect = good = misses = strays = 0;
  particles = [];
  fx = null;
  gesture = null;
  for (const group of servings) { delete group.exit; group.pinches = []; }
  clockOrigin = performance.now()/1000 - pausedAt;
  state = 'playing';
  $('overlay').hidden = true;
  canvas.inert = false;
  $('modal').hidden = true;
  $('pause').disabled = false;
  $('pause').textContent = 'Ⅱ';
  $('status').textContent = 'A 捏饭，D 扫走；海绵按 A 甩走或 D 扫走。右下圆环收拢时出手。';
  canvas.focus();
  if (document.hidden) pause();
}
function pause(){if(state!=='playing')return;pausedAt=time();soundtrack.stop(pausedAt);state='paused';audio.suspend();$('modalLabel').textContent='TAKE A BREATHER';$('modalTitle').textContent='休息一拍';$('modalBody').textContent='饭团也在等你。准备好了就继续。';$('resume').hidden=false;$('resume').textContent='继续开饭';$('modal').hidden=false;$('pause').textContent='▶';$('resume').focus();}
async function resume() {
  if (state !== 'paused' || !await prepareAudio()) return;
  clockOrigin = performance.now()/1000 - pausedAt;
  state = 'playing';
  $('modal').hidden = true;
  $('pause').textContent = 'Ⅱ';
  canvas.focus();
  if (document.hidden) pause();
}
function finish(){soundtrack.stop(END);state='result';pausedAt=END;audio.suspend();const acc=Math.round((perfect+good*.7)/(notes.length+strays)*100);$('modalLabel').textContent='ORDER COMPLETE / 关卡完成';$('modalTitle').textContent=acc>=85?'NICE SQUISH!':'再来一份？';$('modalBody').textContent='准确率 '+acc+'%  ·  最高连击 '+best+'\nPERFECT '+perfect+'  /  GOOD '+good+'  /  MISS '+misses+'\n得分 '+score.toLocaleString();$('resume').hidden=true;$('retry').textContent='再捏一局';$('modal').hidden=false;$('pause').disabled=true;$('retry').focus();$('status').textContent='关卡完成，查看本次成绩。';}
function hit(action = 'a') {
  if (state !== 'playing') return;
  const t = time(), beat = t / BEAT, judge = t - offset / 1000;
  gesture = {action, t};
  if (beat < 4) return;
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
    n = notes.find(note => note.group === current && note.action === 'd');
    current.exit = {t: t + (action === 'a' ? .25 : 0), action, inputAt: t};
  }
  gesture.note = n;
  if (n) {
    const sponge = current.kind === 'sponge';
    if (action === 'a') soundtrack.add(t+.06, sponge ? 'spongePinch' : 'pinch');
    else for (let i=0;i<current.count;i++) soundtrack.add(t+.13+i*.045, sponge ? 'spongeSlap' : 'slap',1+i*.05);
  }
  if (n && !n.result && Math.abs(n.t-judge) <= goodWindow) {
    const delta = judge - n.t;
    n.result = Math.abs(delta) <= perfectWindow ? 'perfect' : 'good';
    n.hitAt = t;
    combo++;
    best = Math.max(best,combo);
    if (n.result === 'perfect') perfect++; else good++;
    score += n.result === 'perfect' ? 1000 + Math.min(combo,20)*25 : 600;
    feedback(n.result,t,n,delta);
  } else {
    strays++; combo=0;
    feedback('wrong',t,n,0);
  }
  if (current?.kind === 'sponge' && action === 'a' && current.exit?.inputAt === t) fx.splash = true;
}
function feedback(kind, t, n, delta) {
  const success = kind === 'perfect' || kind === 'good';
  fx = { kind, t, n, delta };

  if (success) {

    for (let i = 0; i < 18; i++) {
      particles.push({ x: 600, y: 425, vx: (Math.random() - .5) * 700,
        vy: -120 - Math.random() * 500, born: t, r: Math.random() * 4 + 3 });
    }
    if (combo % 8 === 0) $('status').textContent = combo + ' 连击！饭团很开心。';
  } else {
    tone(110, audio.currentTime, .18, 'sawtooth', .12, 55);
    $('status').textContent = kind === 'miss'
      ? '漏拍了！饭团生气了，跟上下一拍。'
      : '拍子偏了！看清物品，按 A 捏饭或 D 扫走。';
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
  c.clearRect(0, 0, 1200, 675);
  c.save();
  c.translate(0, 61);
  c.scale(1200 / 1950, 1200 / 1950);
  c.beginPath(); c.rect(0, 0, 1950, 900); c.clip();
  image('table', 0, 0, 1950, 900);
  const playing = ['playing', 'paused', 'result'].includes(state);
  const beat = playing ? t / BEAT : -10;
  const group = servings.find(g => beat >= g.beat && beat < g.beat + g.length);
  const local = group ? beat - group.beat : 0;
  const fault = group && group.kind !== 'rice';
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
        const launch = batch.charge + i * ((.5-batch.charge)/3);
        if (age < launch) continue;
        const travelTime = (.5-batch.charge)/3;
        const u = clamp01((age-launch)/travelTime);
        x = 485 + (target-485)*easeOut(u);
        y = 450 - 35*Math.sin(Math.PI*u);
        for (let k=Math.max(1,i); k<3; k++) {
          const impact = age - (batch.charge+(k+1)*travelTime);
          if (impact >= 0 && impact < .32) {
            const pulse = Math.exp(-13*impact);
            x += (i===k ? -22 : 30)*Math.sin(24*impact)*pulse;
            squash -= .19*Math.cos(24*impact)*pulse;
          }
        }
      }
      if (batch.kind === 'bounce') {
        const points = [[485,450],[850,375],[1170,125],[1780,380],[target,450]];
        const times = [batch.charge,1,1.20,1.40,batch.landing];
        const seg = times.slice(1).findIndex(end => age < end);
        if (seg >= 0) {
          const u = clamp01((age-times[seg])/(times[seg+1]-times[seg]));
          const f = seg === 0 ? easeOut(u) : .65*u+.35*easeOut(u);
          if (seg === 0) squash += .32*(1-u);
          x = points[seg][0]+(points[seg+1][0]-points[seg][0])*f;
          y = points[seg][1]+(points[seg+1][1]-points[seg][1])*f-35*Math.sin(Math.PI*u);
        }
        for (const [at,axis] of [[1.2,1],[1.4,-1],[1.6,1]]) {
          if (at < 1.6) impactFlash(at===1.2?1170:1850,at===1.2?55:380,age-at,.3,120);
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
    drawSmoke(local, group.charge, machineX+285, machineY-8);
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
  const next = notes.find(n => !n.result);
  const waiting = next && next.t - t > .45 && !charging;
  const instruction = waiting ? '准备 · 等下一拍' : charging ? (fault ? '红灯蓄力 · 等待出饭' : '蓄力出饭') : next?.action === 'd' ? 'D · 向下扫走' : 'A · 捏饭团';
  txt(playing ? instruction : 'A 捏饭 · D 手刀 · 海绵直接拍走', 600, 645, 22, INK, 'center');
  if (playing) {
    txt(combo + ' COMBO', 35, 645, 18);
    const phase = group ? {rice:'正常出饭',bounce:'蓄力弹饭',triple:'连续三份',sponge:'小心海绵'}[group.kind] : '准备下一句';
    $('phase').textContent = 'RICE RICE BABY · ' + phase;
    if (next) {
      const distance = (next.t - t) / BEAT;
      c.strokeStyle = '#142342'; c.lineWidth = 3;
      c.beginPath(); c.arc(1125, 642, 17 + Math.max(0, Math.min(2, distance)) * 12, 0, Math.PI * 2); c.stroke();
    }
    if (beat < 4) {
      const count = 3 - Math.floor(t / BEAT);
      if (count > 0) centeredArt(count, 300, 200, 180);
      else txt('GO!',600,330,90,INK,'center');
    }
  }
  drawFeedback(t, 100);
}
function loop(ms){requestAnimationFrame(loop);const t=state==='ready'||state==='loading'?ms/1000:time();if(state==='playing'){soundtrack.tick(t);for(const n of notes){if(!n.result&&t-offset/1000>n.t+goodWindow){n.result='miss';misses++;combo=0;feedback('miss',t,n,0);}}if(t>=END){finish();} $('score').textContent=String(score).padStart(6,'0');$('progress').style.width=Math.min(100,Math.max(0,t/END*100))+'%';}if(state!=='paused'&&state!=='result')draw(t);lastFrame=ms;}
$('start').onclick=start;$('retry').onclick=start;$('resume').onclick=resume;$('pause').onclick=()=>state==='paused'?resume():pause();
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:SFX_VOLUME;$('sound').textContent='声音 '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(muted));};
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
canvas.tabIndex=0;canvas.onpointerdown=e=>{if(e.button!==0)return;const bounds=canvas.getBoundingClientRect();hit(e.clientX-bounds.left>bounds.width/2?'d':'a');};document.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(['KeyA','KeyD','Space'].includes(e.code)&&!e.repeat){if(e.code==='Space' && e.target.matches('button'))return;e.preventDefault();if(state==='ready')start();else hit(e.code === 'KeyD' ? 'd' : 'a');}if(e.code==='Escape'){e.preventDefault();state==='paused'?resume():pause();}});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
Promise.all(Object.entries(assetPaths).map(([n,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{assets[n]=img;resolve();};img.onerror=()=>reject(new Error(n));img.src=path;}))).then(()=>{state='ready';$('start').disabled=false;}).catch(e=>{$('status').textContent='素材未能加载：'+e.message+'。请保持 assets 文件夹与页面放在一起。';});requestAnimationFrame(loop);
