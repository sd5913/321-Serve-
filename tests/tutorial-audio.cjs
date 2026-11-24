'use strict';
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.waitForFunction(() => state === 'ready');
    await page.click('#start');await page.click('#playLevel');await page.click('#gotIt');
    await page.waitForFunction(() => state === 'playing');
    await page.evaluate(() => {clockOrigin = audio.currentTime - END - .1;});
    await page.waitForFunction(() => lessonMode === 'practice');
    await page.evaluate(() => beginRound('demo', 0));
    const result = await page.evaluate(() => {
      const check = (ok, message) => {if (!ok) throw Error(message);};
      check(lessonMode === 'demo' && lessonIndex === 0, 'tutorial starts with demonstration');
      for (let stage = 0; stage < 4; stage++) {
        check(lessonMode === 'demo' && lessonIndex === stage, 'demo order '+stage);
        for (const n of notes) demonstrate(n.t);
        check(notes.every(n => n.result === 'demo'), 'demo acts at every target');
        advanceTutorial();
        check(lessonMode === 'practice' && lessonIndex === stage, 'practice follows demo');
        if (stage === 3) {
          check(notes[0].action === 'd', 'sponge tutorial must teach D');
          clockOrigin = audio.currentTime - notes[0].t;
          hit('a');
          check(notes[0].result === 'wrong', 'pinching sponge is the wrong branch');
          advanceTutorial();
          check(lessonMode === 'practice' && lessonIndex === stage, 'sponge mistake repeats practice');
        }
        if (stage === 0) {
          // If an item has already left the table, its future note must not show MISS.
          servings[0].exit = {t:0, action:'d'};
          fx = null;
          clockOrigin = audio.currentTime - (notes[0].t + goodWindow + .1);
          loop(performance.now());
          check(notes[0].result === 'skipped' && fx === null && misses === 0, 'no invisible MISS feedback or penalty');
          advanceTutorial();
          check(lessonMode === 'practice' && lessonIndex === stage, 'failed practice repeats');

        }
        for (const n of notes) {
          clockOrigin = audio.currentTime - n.t;
          hit(n.action);
          check(n.result === 'perfect' || n.result === 'good', 'correct input at target '+stage);
        }
        check(servings[0].kind !== 'triple' || servings[0].pinches.length === 3, 'three right-to-left pinches');
        advanceTutorial();
      }
      check(lessonMode === 'level' && servings.length === 44, 'level unlocks after four lessons');
      const types = new Set(soundtrack.events.map(event => event.kind));
      for(const kind of ['cueRice','cueTriple','cueBounce','cueSponge'])check(types.has(kind),'missing phrase '+kind);
      for(const group of servings)check(soundtrack.events.some(e=>Math.abs(e.t-group.beat*BEAT)<.00001 && e.kind===group.cueKind),'phrase alignment');
      return {lessons:4, groups:servings.length, cueTypes:[...types]};
    });
    assert.deepEqual(errors, []);
    console.log('PASS', result);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
