'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function game(protocol = 'file:') {
  const elements = new Map();
  const listeners = {};
  const nodes = [];
  const context2d = new Proxy({}, { get: () => () => {} });
  const document = {
    hidden: false,
    addEventListener: (name, listener) => { listeners[name] = listener; },
    querySelector: () => element('query'),
    querySelectorAll: () => Array.from({ length: 6 }, (_, index) => element('dot' + index)),
    getElementById: element,
  };
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id.endsWith('Volume') ? '100' : '0',
        dataset: {}, style: { setProperty() {} },
        getContext: () => context2d,
        getBoundingClientRect: () => ({ width: 1200, height: 675 }),
        getAttribute: () => 'assets/audio/rice-rice-baby.mp3',
        setAttribute() {}, focus() {}, matches: () => false,
      });
    }
    return elements.get(id);
  }
  const media = element('music');
  Object.assign(media, {
    currentTime: 0, paused: true, playbackRate: 1, readyState: 4,
    playCalls: 0, volume: 1, muted: false,
    async play() { this.playCalls++; this.paused = false; },
    pause() { this.paused = true; },
  });
  const clock = { now: 100, render: 1, latency: .04 };
  const parameter = () => ({
    value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
  });
  const node = () => ({
    gain: parameter(), frequency: parameter(), Q: parameter(),
    connect(target) { return target; }, disconnect() { this.disconnected = true; },
    start(...args) { this.started = args; }, stop(...args) { this.stopped = args; },
  });
  const buffer = { duration: 47.5 };
  class Audio {
    destination = {};
    state = 'suspended';
    get currentTime() { return clock.render; }
    getOutputTimestamp() { return { contextTime: clock.render - clock.latency, performanceTime: clock.now }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    addEventListener() {}
    async decodeAudioData() { return buffer; }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBiquadFilter() { return node(); }
    createBufferSource() { const source = node(); nodes.push(source); return source; }
  }
  const sandbox = vm.createContext({
    document, location: { protocol }, fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
    performance: { now: () => clock.now, timeOrigin: 1700000000000 },
    matchMedia: () => ({ matches: false }), requestAnimationFrame() {},
    Image: class {}, window: { AudioContext: Audio, addEventListener() {} },
    ServeUI: require('../ui-state.js'),
  });
  for (const file of ['audio-clock.js', 'game.js']) {
    const filename = path.join(root, file);
    if (fs.existsSync(filename)) vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  }
  const run = source => vm.runInContext(source, sandbox);
  const advance = seconds => { clock.now += seconds * 1000; clock.render += seconds; };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const frame = async () => { run('loop(performance.now())'); await flush(); };
  const start = async () => { run("state = 'ready'; draw = () => {}; start()"); await flush(); };
  const input = (type, age) => {
    const event = { button: 0, code: 'Space', timeStamp: clock.now - age, target: element('canvas'), preventDefault() {} };
    if (type === 'key') listeners.keydown(event);
    else element('canvas').onpointerdown(event);
  };
  return { clock, media, nodes, buffer, element, document, listeners, run, advance, flush, frame, start, input };
}

const { eventTime, outputTime, mediaTime } = require('../audio-clock.js');
const near = (actual, expected, epsilon = .000001) => {
  assert(Math.abs(actual - expected) < epsilon, actual + ' should be close to ' + expected);
};

async function delayedLocalInput() {
  const local = game();
  await local.start();
  assert.equal(local.nodes.length, 0);
  assert.equal(local.media.playCalls, 0);
  local.advance(3);
  await local.frame();
  assert.equal(local.run('state'), 'playing');
  assert.equal(local.media.playCalls, 1);

  local.advance(2.18);
  local.media.currentTime = 2.18;
  await local.frame();
  assert.equal(local.run('notes[0].result'), null, 'the frame crossed the deadline before the handler ran');
  local.input('key', 180);
  assert.equal(local.run('perfect'), 1, 'the keyboard event occurred exactly on the beat');

  local.advance(1.19);
  local.media.currentTime = 3.37;
  local.run('offset = 180');
  local.input('pointer', 190);
  assert.equal(local.run('notes[1].result'), 'perfect', 'positive compensation still accepts a later tap');
  assert.equal(local.run('score'), 2075);

  local.run('pause()');
  assert.equal(local.media.paused, true);
  const frozen = local.run('time()');
  local.advance(5);
  assert.equal(local.run('time()'), frozen);
  await local.run('resume()');
  assert.equal(local.media.playCalls, 2);
  local.input('key', 1000);
  assert.equal(local.run('strays'), 0, 'events from before the current segment are ignored');
}

async function scheduledAudio() {
  const served = game('http:');
  await served.start();
  assert.equal(served.run('state'), 'countdown');
  assert.equal(served.media.playCalls, 0);
  const first = served.nodes[0];
  near(first.started[0] - served.clock.render, 8 / 3 + .04);
  near(first.started[1], 0);
  assert.equal(served.run('notes[0].t'), 2, 'preserves the four-beat musical lead-in');
  assert.equal(served.run('notes.length'), 56);

  served.advance(.9);
  served.run('pause()');
  const count = served.run('countdownTime()');
  assert(first.stopped && first.disconnected);
  served.advance(4);
  near(served.run('countdownTime()'), count);
  await served.run('resume()');
  near(served.run('countdownTime()'), count);
  const resumed = served.nodes[1];
  near(resumed.started[0] - served.clock.render, 8 / 3 - count + .04);

  // No frame ran during the rest of the countdown. Audio still starts at its scheduled sample.
  served.advance(resumed.started[0] + served.clock.latency + 2.19 - served.clock.render);
  await served.frame();
  near(served.run('time()'), 2.19);
  assert.equal(served.run('notes[0].result'), null);
  served.input('pointer', 190);
  assert.equal(served.run('notes[0].result'), 'perfect');
  assert.equal(served.run('fx.t'), served.run('time()'), 'visual feedback uses presentation time');

  served.advance(.968);
  served.input('key', 2);
  assert.equal(served.run('notes[1].result'), null, 'dispatch grace does not expand the hit window');
  assert.equal(served.run('strays'), 1);
  served.advance(.12);
  await served.frame();
  assert.equal(served.run('notes[1].result'), 'miss');

  const musicLevel = served.element('musicVolume');
  const sfxLevel = served.element('sfxVolume');
  musicLevel.value = '35';
  sfxLevel.value = '50';
  musicLevel.oninput({ target: musicLevel });
  sfxLevel.oninput({ target: sfxLevel });
  assert.deepEqual([...served.run('[musicGain.gain.value, master.gain.value]')], [.35, .45]);
  served.element('sound').onclick();
  assert.deepEqual([...served.run('[musicGain.gain.value, master.gain.value]')], [0, 0]);
  assert.equal(served.media.muted, true);

  served.document.hidden = true;
  served.listeners.visibilitychange();
  const frozen = served.run('time()');
  assert(resumed.stopped && resumed.disconnected);
  assert.equal(served.run('state'), 'paused');
  served.advance(8);
  assert.equal(served.run('time()'), frozen);
  served.document.hidden = false;
  await served.run('resume()');
  const active = served.nodes[2];
  near(active.started[1], frozen);
  near(served.run('time()'), frozen);
  assert.deepEqual([...served.run('[musicGain.gain.value, master.gain.value]')], [0, 0]);
  served.element('sound').onclick();
  assert.deepEqual([...served.run('[musicGain.gain.value, master.gain.value]')], [.35, .45]);

  served.advance(active.started[0] + served.clock.latency + 45 - frozen - served.clock.render);
  near(served.run('time()'), 45);
  served.advance(2.01);
  await served.frame();
  assert.equal(served.run('state'), 'result');
  assert(active.stopped && active.disconnected);

  await served.run('start()');
  assert.equal(served.nodes.length, 4);
  assert.equal(served.nodes.filter(source => !source.stopped).length, 1);
  assert.equal(served.nodes[3].started[1], 0);
  assert.equal(served.run('score'), 0);
  near(served.run('countdownTime()'), 0);
}

async function staleAndBlockedPlayback() {
  const local = game();
  const play = local.media.play.bind(local.media);
  let release;
  local.media.play = () => {
    play();
    return new Promise(resolve => { release = resolve; });
  };
  await local.start();
  local.advance(3);
  await local.frame();
  assert.equal(local.media.paused, false);
  local.document.hidden = true;
  local.listeners.visibilitychange();
  assert.equal(local.media.paused, true);
  local.document.hidden = false;
  local.media.play = play;
  await local.run('resume()');
  assert.equal(local.media.paused, false);
  release();
  await local.flush();
  assert.equal(local.run('state'), 'playing');
  assert.equal(local.media.paused, false, 'the old request cannot pause the newer playback');
  assert.equal(local.media.playCalls, 2);

  local.run('pause()');
  local.media.play = () => {
    play();
    return new Promise(resolve => { release = resolve; });
  };
  const pendingResume = local.run('resume()');
  local.document.hidden = true;
  local.listeners.visibilitychange();
  local.document.hidden = false;
  release();
  await pendingResume;
  assert.equal(local.run('state'), 'paused');
  assert.equal(local.media.paused, true, 'hide/show cancels a pending resume');

  const blocked = game();
  blocked.media.play = async () => { throw Object.assign(new Error('Activation required'), { name: 'NotAllowedError' }); };
  await blocked.start();
  blocked.advance(3);
  await blocked.frame();
  assert.equal(blocked.run('state'), 'paused');
  assert.match(blocked.element('status').textContent, /RESUME/);
  assert.equal(blocked.run('countdownTime()'), blocked.run('COUNTDOWN_DURATION'));
  // Use the backing element method so this gesture succeeds.
  blocked.media.play = async function () { this.playCalls++; this.paused = false; };
  await blocked.run('resume()');
  assert.equal(blocked.run('state'), 'playing');
  assert.equal(blocked.media.currentTime, 0);
  assert.equal(blocked.media.playCalls, 1);

  const decoding = game('https:');
  await decoding.run("state = 'ready'; draw = () => {}; unlockAudio()");
  decoding.run('audio.decodeAudioData = () => new Promise(resolve => { globalThis.finishDecode = resolve; });');
  const pending = decoding.start();
  await pending; // The harness yields without waiting for the unresolved decoder.
  decoding.document.hidden = true;
  decoding.listeners.visibilitychange();
  decoding.run('finishDecode({ duration: 47.5 })');
  await decoding.flush();
  assert.equal(decoding.run('state'), 'paused');
  assert.equal(decoding.nodes.length, 0, 'a hidden page never schedules the stale source');
  decoding.document.hidden = false;
  await decoding.run('resume()');
  assert.equal(decoding.nodes.length, 1);
}

(async () => {
  assert.equal(eventTime({ timeStamp: 800 }, 900, 1700000000000), 800);
  assert.equal(eventTime({ timeStamp: 1700000000800 }, 900, 1700000000000), 800);
  for (const timeStamp of [0, NaN, undefined, 901]) assert.equal(eventTime({ timeStamp }, 900), 900);
  const clock = { currentTime: 4, baseLatency: .01, outputLatency: .03 };
  near(outputTime(clock, 2000, 1820), 3.78);
  clock.getOutputTimestamp = () => ({ contextTime: 0, performanceTime: 0 });
  near(outputTime(clock, 2000, 1820), 3.78);
  clock.getOutputTimestamp = () => ({ contextTime: 2, performanceTime: 1000 });
  near(outputTime(clock, 2000, 1820), 3.78);
  clock.getOutputTimestamp = () => ({ contextTime: 3.81, performanceTime: 1960 });
  near(outputTime(clock, 2000, 1820), 3.67);
  near(mediaTime({ currentTime: 4, paused: false, readyState: 2 }, 2000, 1800), 4);
  await delayedLocalInput();
  await scheduledAudio();
  await staleAndBlockedPlayback();
  console.log('PASS: output and media clock mapping, zero/stale timestamps, delayed keyboard/pointer after a frame, scoring and offsets, scheduled countdown, pause/resume, visibility, retry, mute/volume and stale playback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
