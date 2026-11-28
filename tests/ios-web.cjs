'use strict';
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const { extname, resolve, sep } = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const publicDir = resolve(__dirname, '../ios/App/App/public');
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg',
};
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(publicDir, '.' + path.slice('/game'.length));
  if (!path.startsWith('/game/') || !file.startsWith(publicDir + sep)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});

async function smoke(browser, url) {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true,
  });
  const errors = [];
  await page.route('**/*', route => {
    const requested = route.request().url();
    if (requested.startsWith(url) || requested.startsWith('data:') || requested.startsWith('blob:')) {
      return route.continue();
    }
    errors.push('Unexpected request ' + requested);
    return route.abort();
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    // WebKit can cancel a redundant preload as soon as a resource has decoded.
    if (request.failure()?.errorText !== 'Load cancelled') errors.push('Failed request ' + request.url());
  });
  page.on('response', response => {
    if (!response.ok()) errors.push(response.status() + ' ' + response.url());
  });

  await page.goto(url + 'index.html');
  await page.waitForFunction(() => state === 'ready');
  assert.equal(await page.title(), '321 Serve!');
  await page.locator('#start').tap();
  assert(await page.locator('#levelSelect').isVisible());
  assert.equal(await page.locator('#selectedLevelTitle').getAttribute('alt'), 'Rice Rice Baby');
  for (const expected of ['Catch Me If You Can', 'Sashimi, Baby!', 'Grill Me Maybe']) {
    await page.locator('.next-level').tap();
    assert.equal(await page.locator('#selectedLevelTitle').getAttribute('alt'), expected);
    await page.locator('#selectedLevelTitle').evaluate(img => img.decode());
  }
  for (let i = 0; i < 3; i++) await page.locator('.previous-level').tap();
  await page.locator('#playLevel').tap();
  assert(await page.locator('#tutorial').isVisible());
  await page.locator('#gotIt').tap();
  await page.waitForFunction(() => state === 'playing' && lessonMode === 'demo' && audio.state === 'running');
  await page.locator('#skipTutorial').tap();
  await page.waitForFunction(() => state === 'playing' && lessonMode === 'level');
  assert.equal(await page.evaluate(() => levelServings.length), 44);
  assert(await page.locator('#gameInfo').isVisible());

  // Keep layout and event dispatch real. Snap the audio clock at input so a
  // loaded CI runner cannot miss the game's narrow judgment windows.
  await page.evaluate(() => {
    window.smokeInputs = [];
    window.smokeSounds = [];
    canvas.addEventListener('pointerdown', event => {
      window.smokeInputs.push(event.pointerType);
      const next = notes.find(note => !note.result);
      if (next) clockOrigin = audio.currentTime - next.t;
    }, { capture: true });
    const playInput = soundtrack.playInput.bind(soundtrack);
    soundtrack.playInput = kind => {
      window.smokeSounds.push(kind);
      return playInput(kind);
    };
  });
  const canvas = await page.locator('#canvas').boundingBox();
  for (const fraction of [0.25, 0.75]) {
    await page.touchscreen.tap(canvas.x + canvas.width * fraction, canvas.y + canvas.height * 0.65);
  }
  const result = await page.evaluate(() => ({
    inputs: window.smokeInputs,
    sounds: window.smokeSounds,
    results: notes.slice(0, 2).map(note => note.result),
    audioState: audio.state,
  }));
  assert.deepEqual(result.inputs, ['touch', 'touch']);
  assert.equal(result.sounds.length, 2, 'both gestures play an input sound');
  assert.deepEqual(result.results, ['perfect', 'perfect']);
  assert.equal(result.audioState, 'running');
  await page.locator('#pause').tap();
  assert(await page.locator('#modal').isVisible());
  await page.locator('#resume').tap();
  await page.waitForFunction(() => state === 'playing' && audio.state === 'running');
  await page.locator('#audioStudioToggle').tap();
  assert(await page.locator('#audioStudio').isVisible());
  assert.deepEqual(errors, []);
  await page.close();
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/game/';
  const browserType = process.env.IOS_WEB_ENGINE === 'webkit' ? webkit : chromium;
  let browser;
  try {
    browser = await browserType.launch({
      headless: true,
      ...(browserType === chromium && process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
    });
    await smoke(browser, url);
    console.log('PASS Capacitor public bundle in ' + browserType.name() + ': startup, levels, relative assets, touch and audio.');
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
