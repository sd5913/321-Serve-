'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = process.argv[2];
if (!url) throw new Error('Pass the address of a local static server, e.g. http://127.0.0.1:8765/');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.click('#start');
    await page.evaluate(() => { practiceStarted -= 10000; });
    await page.click('#gotIt');
    await page.waitForFunction(() => state === 'countdown' && soundtrackSource);

    // The actual media element must stay silent throughout the scheduled-buffer path.
    assert(await page.evaluate(() => music.paused && music.currentTime === 0 && musicBuffer.duration >= END));
    await page.click('#pause');
    const count = await page.evaluate(() => countdownTime());
    assert(count > 0 && count < 2);
    assert(await page.evaluate(() => !soundtrackSource));
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => countdownTime()), count);
    await page.click('#resume');
    await page.waitForFunction(() => state === 'playing');

    // Pin the chart position for one frame so the ordering test does not depend
    // on headless runner scheduling. The active context still supplies both clocks.
    const delayed = await page.evaluate(() => {
      const origin = songZero;
      songZero += time() - 2.18;
      const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      const inputAt = performance.now() - 180;
      Object.defineProperty(event, 'timeStamp', { value: inputAt });
      const scheduleFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = () => 0;
      try {
        loop(performance.now());
      } finally {
        window.requestAnimationFrame = scheduleFrame;
      }
      const before = notes[0].result;
      const handledAt = time();
      canvas.dispatchEvent(event);
      songZero = origin;
      return { before, handledAt, result: notes[0].result };
    });
    assert.equal(delayed.before, null, JSON.stringify(delayed));
    assert.equal(delayed.result, 'perfect');
    assert(delayed.handledAt > 2.155);

    await page.click('#pause');
    const frozen = await page.evaluate(() => time());
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => time()), frozen);
    await page.click('#settingsToggle');
    await page.locator('#musicVolume').fill('35');
    await page.locator('#sfxVolume').fill('50');
    await page.click('#settingsBack');
    await page.click('#resume');
    await page.waitForFunction(() => state === 'playing');
    assert((await page.evaluate(() => time())) >= frozen);
    assert.deepEqual(await page.evaluate(() => [musicGain.gain.value, master.gain.value].map(x => Math.round(x * 100))), [35, 45]);

    await page.click('#sound');
    assert.deepEqual(await page.evaluate(() => [musicGain.gain.value, master.gain.value]), [0, 0]);
    await page.click('#pause');
    await page.click('#retry');
    await page.waitForFunction(() => state === 'countdown' && soundtrackSource);
    assert(await page.evaluate(() => score === 0 && notes.length === 56 &&
      music.paused && music.currentTime === 0 && musicGain.gain.value === 0));
    await page.click('#pause');
    await page.click('#pauseHome');
    await page.click('#confirmQuit');
    assert(await page.evaluate(() => state === 'ready' && !soundtrackSource && music.paused));

    assert.deepEqual(errors, []);

    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      Object.defineProperty(AudioContext.prototype, 'getOutputTimestamp', { value: undefined });
    });
    await fallback.goto(url);
    await fallback.click('#start');
    await fallback.evaluate(() => { practiceStarted -= 10000; });
    await fallback.click('#gotIt');
    await fallback.waitForFunction(() => state === 'playing' && soundtrackSource);
    const hit = await fallback.evaluate(() => {
      songZero += time() - 2;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
      return notes[0].result;
    });
    assert.equal(hit, 'perfect');
    console.log('PASS: served Chromium playback and gesture, countdown and playback pause/resume, delayed input after RAF, gain/mute, retry, quit and pointer input without an output timestamp.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
