'use strict';

// All times are in game seconds. The score is rebuilt on restart.
class KitchenSoundtrack {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.voices = new Set();
    this.events = [];
    this.musicStep = 0;
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
    gain.connect(this.output);
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
      case 'spongeOut': n(140,.21,.22,480); this.hiss(at+.07,.13,.09,2500); break;
      case 'spongePinch': this.hiss(at,.22,.2,2200); n(700,.22,.2,180); n(1000,.1,.08,300,'sine',.08); break;
      case 'spongeSlap': this.hiss(at,.12,.24,900); n(130,.13,.22,55); break;
      case 'collision': n(320,.1,.18,160); n(470,.12,.13,260,'triangle',.025); break;
    }
  }
  add(t, kind, pitch = 1) { this.events.push({t, kind, pitch, scheduled:false}); }
  reset(groups) {
    this.stop(0);
    this.events = [];
    for (const g of groups) {
      if (g.kind !== 'rice') {
        this.add(g.beat, 'warning');
        this.add(g.beat+.04, 'smoke');
        if (g.charge > .5) this.add(g.beat+.45, 'warning',1.12);
      }
      for (let i=0; i<g.count; i++) {
        const travel = (.5-g.charge)/3;
        this.add(g.beat+g.charge+i*travel,
          g.kind==='sponge'?'spongeOut':g.kind==='rice'?'normal':'fault', 1+i*.12);
        if (g.count===3 && i>0) this.add(g.beat+g.charge+(i+1)*travel,'collision',1+i*.15);
      }
      if (g.kind==='bounce') {
        this.add(g.beat+1.2,'bounce');
        this.add(g.beat+1.4,'bounce',1.3);
      }
    }
  }
  stop(t) {
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
    this.musicStep = Math.ceil(t*2);
    for (const event of this.events) if (event.t >= t) event.scheduled = false;
  }
  tick(t) {
    const horizon = t + .07;
    // Half-beat accompaniment, with the bass and kick marking each full beat.
    this.musicStep = Math.max(this.musicStep, Math.floor(t*2));
    while (this.musicStep*.5 <= horizon) {
      const step = this.musicStep++;
      const at = this.context.currentTime + Math.max(0, step*.5-t);
      const bar = Math.floor(step/8)%4;
      const root = [130.81,174.61,146.83,196][bar];
      const melody = [0,7,12,9,7,4,2,7,0,4,7,12,9,7,4,2];
      const hz = root*2*Math.pow(2,melody[step%16]/12);
      this.note(hz,at,.15,.045,'triangle');
      this.note(hz*2,at,.07,.014,'sine');
      if (step%2===0) {
        this.note(root*(step%4===0?.5:.75),at,.25,.065,'triangle');
        this.note(100,at,.09,.065,'sine',40);
      } else this.hiss(at,.035,.025,4000);
      if (step%4===2) this.hiss(at,.075,.045,1400);
    }
    for (const event of this.events) {
      if (event.scheduled || event.t > horizon) continue;
      event.scheduled = true;
      if (event.t < t-.15) continue;
      this.effect(event.kind, this.context.currentTime+Math.max(0,event.t-t),event.pitch);
    }
  }
}
