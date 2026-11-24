'use strict';

const BPM = 140;
const BEAT = 60 / BPM;

// Chart positions are in beats. The audio engine schedules in seconds.
class KitchenSoundtrack {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.voices = new Set();
    this.events = [];
    this.musicStep = 0;
    this.editor = null;
    this.channel = 'effect';
    this.musicGain = context.createGain();
    this.effectGain = context.createGain();
    this.musicGain.connect(output);
    this.effectGain.connect(output);
    this.kindGains = {};
    this.musicSource = null;
    this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  note(hz, at, duration, volume, type = 'triangle', end = hz) {
    const source = this.context.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(hz, at);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    this.connect(source, at, duration, volume);
  }
  hiss(at, duration, volume, frequency = 1300) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .8;
    source.connect(filter);
    this.connect(source, at, duration, volume, filter);
  }
  connect(source, at, duration, volume, signal = source) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    signal.connect(gain);
    gain.connect(this.channel === 'music' ? this.musicGain : this.effectOutput);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      if (signal !== source) signal.disconnect();
      gain.disconnect();
    };
    source.start(at);
    source.stop(at + duration + .01);
  }
  effect(kind, at, pitch = 1) {

    if (this.editor?.isTrackDeleted(kind)) return;
    const output = this.kindGain(kind);
    const croppedMix = this.editor?.trimmedMix(kind);
    if (croppedMix) {
      this.playBuffer(croppedMix, at, pitch, output);
      return;
    }
    const draft = this.editor?.project.drafts[kind];
    this.effectOutput = output;
    if (draft?.includeBase !== false) this.playEffectSource(kind, at + (draft?.baseBeat ?? 0) * BEAT, pitch);
    for (const layer of draft?.layers ?? []) {
      const buffer = this.editor.audioBuffer(layer.id);
      if (buffer && layer.volume > 0)
        this.playBuffer(buffer, at + layer.beat * BEAT, pitch, output, layer.volume);
    }
  }

  playBuffer(buffer, at, pitch, output, volume = 1) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(output);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(at);
  }

  playEffectSource(kind, at, pitch) {
    const replacement = this.editor?.audioBuffer(kind);
    if (replacement) {
      this.playBuffer(replacement, at, pitch, this.effectOutput);
      return;
    }
    const n = (f, d, v, end = f, type = 'sine', delay = 0) =>
      this.note(f * pitch, at + delay, d, v, type, end * pitch);
    switch (kind) {
      case 'normal': n(170,.13,.25,580); n(720,.08,.1,320,'triangle',.035); break;
      case 'fault': n(100,.19,.27,45,'sawtooth'); n(220,.2,.2,900,'sine',.08); break;
      case 'warning': n(520,.09,.08,420,'square'); n(390,.09,.07,310,'square',.11); break;
      case 'smoke': this.hiss(at,.38,.18,650); n(75,.23,.1,45); break;
      case 'pinch': n(380,.16,.22,130); n(680,.075,.12,930,'triangle',.025); break;
      case 'slap': this.hiss(at,.065,.3,1800); n(180,.11,.25,55); n(700,.16,.1,180,'sine',.045); break;
      case 'bounce': n(230,.24,.25,650); n(900,.12,.1,240,'triangle',.035); break;
      case 'spongeOut': n(140,.21,.22,480); n(290,.13,.16,75,'sine',.035); this.hiss(at+.04,.15,.13,950); break;
      case 'spongePinch': this.hiss(at,.22,.2,2200); n(700,.22,.2,180); n(1000,.1,.08,300,'sine',.08); break;
      case 'spongeSlap': this.hiss(at,.12,.24,900); n(130,.13,.22,55); break;
      case 'collision': n(320,.1,.18,160); n(470,.12,.13,260,'triangle',.025); break;
      case 'motor': n(86,.27,.14,124,'triangle'); this.hiss(at,.28,.055,420); break;
      case 'motorFault': n(82,.16,.19,64,'sawtooth'); n(70,.22,.14,115,'square',.18); this.hiss(at,.42,.12,520); break;
      case 'motorStutter': n(78,.12,.22,46,'sawtooth'); n(69,.11,.18,98,'sawtooth',.2); n(54,.2,.21,138,'triangle',.41); break;
      case 'spongeCharge': n(360,.22,.13,110); this.hiss(at,.25,.11,900); n(125,.2,.13,210,'triangle',.23); break;
      case 'bounceOut': n(95,.27,.3,760,'sawtooth'); n(850,.18,.13,250,'triangle',.05); break;
      case 'targetA': n(580,.055,.11,420,'triangle'); break;
      case 'targetD': n(360,.09,.14,160,'square'); break;
      case 'mistake': n(110,.18,.12,55,'sawtooth'); break;
    }
  }
  playInput(kind) {
    // Live input is not a timeline event: do not wait for RAF or apply hit offsets.
    this.effect(kind, this.context.currentTime);
  }
  add(t, kind, pitch = 1) { this.events.push({t, kind, pitch, scheduled:false}); }
  kindGain(kind) {
    if(!this.kindGains[kind]){
      const gain=this.context.createGain();
      gain.gain.value=this.editor?.project.trackVolumes[kind]??1;
      gain.connect(this.effectGain);
      this.kindGains[kind]=gain;
    }
    return this.kindGains[kind];
  }
  static buildEvents(groups, chart = []) {
    const events = [];
    const add = (t,kind,pitch=1) => events.push({id:'e'+events.length,t,baseT:t,kind,pitch,scheduled:false});
    for (const g of groups) {
      if(g.cueKind){add(g.beat,g.cueKind);continue;}
      const cue = Math.max(0, g.beat - .75);
      if (g.kind === 'rice') add(cue, 'motor');
      if (g.kind === 'triple') {
        add(cue, 'motorFault');
        add(g.beat, 'warning');
        add(g.beat+.04, 'smoke');
      }
      if (g.kind === 'bounce') {
        add(cue, 'motorStutter');
        add(g.beat, 'warning');
        add(g.beat+.45, 'warning', 1.18);
      }
      if (g.kind === 'sponge') add(cue, 'spongeCharge');
      for (let i=0; i<g.count; i++) {
        const travel = (.5-g.charge)/3;
        add(g.beat+g.charge+i*travel,
          g.kind==='sponge'?'spongeOut':g.kind==='rice'?'normal':g.kind==='bounce'?'bounceOut':'fault', 1+i*.12);
        if (g.count===3 && i>0) add(g.beat+g.charge+(i+1)*travel,'collision',1+i*.15);
      }
      if (g.kind==='bounce') {
        add(g.beat+1.2,'bounce');
        add(g.beat+1.4,'bounce',1.3);
      }
    }
    for (const n of chart.filter(n=>!n.group.cueKind)) add(n.beat, n.action === 'd' ? 'targetD' : 'targetA');
    return events;
  }
  reset(groups, chart = [], applyEdits = true) {
    this.stop(0);
    this.applyEdits = applyEdits;
    this.musicOffset=0;
    this.events = KitchenSoundtrack.buildEvents(groups,chart);
    if (this.editor && applyEdits) for (const event of this.events)
      event.t = this.editor.eventTime(event.id);
    if (this.editor && applyEdits) for (const custom of this.editor.project.custom)
      this.events.push({id:custom.id,t:custom.t,baseT:custom.t,kind:custom.id,pitch:1,scheduled:false});
    for (const event of this.events) event.t *= BEAT;
    this.musicStep = 0;
  }
  clearMusicSource() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource.disconnect();
      this.musicSource = null;
    }
  }
  stop(t) {
    this.clearMusicSource();
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
    this.musicStep = Math.ceil(Math.max(0, t / BEAT - (this.editor?.project.musicStart ?? 0)) * 2);
    for (const event of this.events) if (event.t >= t) event.scheduled = false;
  }
  musicBeat(step, at) {
    this.channel = 'music';
    if (step%2===0) {
      const root = [130.81,174.61,146.83,196][Math.floor(step/8)%4];
      this.note(root*.5,at,.22,.045,'triangle');
      this.note(95,at,.09,.075,'sine',38);
    } else this.hiss(at,.035,.018,4000);
    if (step%4===2) this.hiss(at,.065,.032,1400);
    this.channel = 'effect';
  }
  tick(t) {
    const horizon = t + .07;
    this.musicGain.gain.value = this.editor?.isTrackDeleted('music') ? 0 : this.editor?.project.musicVolume ?? 1;
    this.effectGain.gain.value = this.editor?.project.effectVolume ?? 1;
    for (const [kind,gain] of Object.entries(this.kindGains))
      gain.gain.value = this.editor?.project.trackVolumes[kind] ?? 1;
    const musicStart = this.applyEdits ? (this.editor?.project.musicStart ?? 0)*BEAT : 0;
    const musicBuffer = this.editor?.audioBuffer('music');
    if (musicBuffer && !this.musicSource && horizon >= musicStart) {
      const source = this.context.createBufferSource();
      source.buffer = musicBuffer; source.loop = !this.applyEdits;
      source.connect(this.musicGain);
      source.start(this.context.currentTime + Math.max(0, musicStart - t),
        Math.max(0, t - musicStart + (this.musicOffset ?? 0)) % musicBuffer.duration);
      this.musicSource = source;
    }
    const halfBeat = BEAT / 2;
    this.musicStep = Math.max(this.musicStep, Math.ceil(Math.max(0,t-musicStart-.03)/halfBeat));
    while (!musicBuffer && musicStart+this.musicStep * halfBeat <= horizon) {
      const step = this.musicStep++;
      const at = this.context.currentTime + Math.max(0, musicStart + step * halfBeat - t);
      this.musicBeat(step,at);
    }
    for (const event of this.events) {

      if (event.scheduled || event.t > horizon) continue;
      event.scheduled = true;
      if (event.t < t-.15 || (this.applyEdits && this.editor?.isClipDeleted(event.id))) continue;
      this.effect(event.kind, this.context.currentTime+Math.max(0,event.t-t),event.pitch);
    }
  }
}
