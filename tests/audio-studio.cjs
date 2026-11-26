'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

function wav() {
  const rate=22050, count=rate/10, bytes=Buffer.alloc(44+count*2);
  bytes.write('RIFF',0); bytes.writeUInt32LE(bytes.length-8,4);
  bytes.write('WAVEfmt ',8); bytes.writeUInt32LE(16,16);
  bytes.writeUInt16LE(1,20); bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(rate,24); bytes.writeUInt32LE(rate*2,28);
  bytes.writeUInt16LE(2,32); bytes.writeUInt16LE(16,34);
  bytes.write('data',36); bytes.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++) bytes.writeInt16LE(Math.round(Math.sin(i*440*2*Math.PI/rate)*8000),44+i*2);
  return bytes;
}

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  try {
    const page=await browser.newPage();
    page.setDefaultTimeout(3000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.GAME_URL||'file://'+process.cwd()+'/index.html');
    await page.waitForFunction(()=>state==='ready');
    await page.click('#audioStudioToggle');
    assert(await page.locator('#audioStudio').isVisible());
    const data=await page.evaluate(()=>({
      tracks:document.querySelectorAll('.studio-track').length,
      quarter:document.querySelectorAll('.studio-quarter').length,
      third:document.querySelectorAll('.studio-third').length,
      clips:document.querySelectorAll('.studio-clip').length,
      events:studio.timelineEvents.length
    }));
    assert(data.tracks>=19 && data.quarter>100 && data.third>100 && data.clips>100,data);
    assert.match(await page.locator('.studio-transport strong').textContent(), /140 BPM/);
    const wavDownload=page.waitForEvent('download');
    await page.locator('button[data-wav="normal"]').click();
    const builtIn=await wavDownload;
    assert.equal(builtIn.suggestedFilename(),'normal.wav');
    assert.equal(fs.readFileSync(await builtIn.path()).toString('ascii',0,4),'RIFF');
    const musicDownload=page.waitForEvent('download');
    await page.locator('button[data-wav="music"]').click();
    const builtInMusic=await musicDownload;
    assert.equal(builtInMusic.suggestedFilename(),'music.wav');
    assert.equal(fs.statSync(await builtInMusic.path()).size,44+2*Math.ceil(44100*8*60/140));
    await page.locator('#studioSeek').fill('3.25');
    await page.click('#studioPlay');
    await page.waitForFunction(()=>!!studio.previewEngine && studio.previewAt>3.25);
    assert(await page.evaluate(()=>!!studio.previewEngine && studio.previewAt>3.25),'whole timeline audition plays from chosen beat');
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>studio.previewPaused && studio.previewContext.state==='suspended');
    const pausedAt=await page.evaluate(()=>studio.previewAt);
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>studio.previewAt),pausedAt);
    await page.keyboard.press('Space');
    await page.waitForFunction(at=>!studio.previewPaused && studio.previewAt>at,pausedAt);
    const scrubber=await page.locator('#studioScrubber').boundingBox();
    await page.mouse.move(scrubber.x+scrubber.width*.25,scrubber.y+scrubber.height/2);
    await page.mouse.down();
    await page.mouse.move(scrubber.x+scrubber.width*.5,scrubber.y+scrubber.height/2,{steps:6});
    await page.mouse.up();
    await page.waitForFunction(()=>!!studio.previewEngine && studio.previewAt>90);
    await page.click('#studioStop');
    assert.equal(await page.evaluate(()=>studio.previewEngine),null);
    await page.locator('.studio-scroll').evaluate(element=>element.scrollLeft=0);
    const ruler=await page.locator('.studio-scroll').boundingBox();
    const labelWidth=await page.evaluate(()=>studio.labelWidth);
    await page.mouse.move(ruler.x+labelWidth+24,ruler.y+25);
    await page.mouse.down();
    await page.mouse.move(ruler.x+labelWidth+312,ruler.y+25,{steps:5});
    await page.mouse.up();
    assert(await page.evaluate(()=>studio.previewAt>2 && studio.previewAt<2.3),'dragging the time ruler moves the playhead');

    const clip=page.locator('.studio-clip[data-id]').first();
    await clip.scrollIntoViewIfNeeded();
    const id=await clip.getAttribute('data-id');
    const before=await page.evaluate(id=>studio.eventTime(id),id);
    const box=await clip.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+12);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+42,box.y+12,{steps:5});
    await page.mouse.up();
    const after=await page.evaluate(id=>studio.eventTime(id),id);
    assert.notEqual(after,before,'drag changes event time');

    const buffer=wav();
    await page.locator('[data-draft="normal"]').click();
    await page.locator('#studioLayerFile').setInputFiles([
      {name:'layer-a.wav',mimeType:'audio/wav',buffer},
      {name:'layer-b.wav',mimeType:'audio/wav',buffer}
    ]);
    await page.locator('.studio-layer').nth(1).waitFor();
    await page.locator('#studioDraftMix .studio-waveform').waitFor();
    await page.locator('#studioDraftOriginal .studio-waveform').waitFor();
    assert.equal(await page.locator('.studio-layer .studio-waveform').count(),2);
    const originalClip=page.locator('#studioDraftOriginal');
    await originalClip.scrollIntoViewIfNeeded();
    const originalBox=await originalClip.boundingBox();
    await page.mouse.move(originalBox.x+originalBox.width/2,originalBox.y+15);
    await page.mouse.down();
    await page.mouse.move(originalBox.x+originalBox.width/2+36,originalBox.y+15,{steps:5});
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>studio.project.drafts.normal.baseBeat),.25,'original audio can move inside child draft');
    await page.click('#studioUndo');
    await page.evaluate(()=>studio.waveformsReady);
    // Head trim moves the left boundary while retaining the original right boundary.
    const headClip=page.locator('[data-layer-wave]').first();
    await headClip.scrollIntoViewIfNeeded();
    const headBefore=await headClip.boundingBox();
    const headHandle=await headClip.locator('[data-trim-edge="start"]').boundingBox();
    await page.mouse.move(headHandle.x+2,headHandle.y+10);
    await page.mouse.down();
    await page.mouse.move(headHandle.x+7,headHandle.y+10,{steps:3});
    const headDuring=await headClip.boundingBox();
    assert(Math.abs(headBefore.x+headBefore.width-headDuring.x-headDuring.width)<1,'head trim anchors right edge');
    await page.mouse.up();
    assert(await page.evaluate(()=>{
      const item=studio.project.drafts.normal.layers[0], trim=studio.project.trims[item.id];
      const source=studio.buffers[item.id], output=studio.audioBuffer(item.id);
      const start=Math.round(trim.start*source.sampleRate);
      return item.beat>0 && start>0 && output.length===source.length-start
        && output.getChannelData(0)[0]===source.getChannelData(0)[start];
    }),'head trim removes samples instead of time stretching');
    await page.click('#studioUndo');
    await page.evaluate(()=>studio.waveformsReady);
    const layer=page.locator('[data-layer-wave]').nth(1);
    await layer.scrollIntoViewIfNeeded();
    const layerBox=await layer.boundingBox();
    const initialMix=await page.locator('#studioDraftMix .studio-waveform use').getAttribute('href');
    await page.mouse.move(layerBox.x+layerBox.width/2,layerBox.y+9);
    await page.mouse.down();
    await page.mouse.move(layerBox.x+layerBox.width/2+36,layerBox.y+9,{steps:5});
    await page.mouse.up();
    assert.equal(await page.locator('[data-layer-field="beat"]').nth(1).inputValue(),'0.25');
    await page.waitForFunction(previous=>document.querySelector('#studioDraftMix .studio-waveform use')?.getAttribute('href')!==previous,initialMix);
    const layerTrim=page.locator('[data-layer-wave]').nth(1).locator('[data-trim-edge="end"]');
    await layerTrim.scrollIntoViewIfNeeded();
    const trimBox=await layerTrim.boundingBox();
    const waveBefore=await layer.locator('.studio-waveform').boundingBox();
    await page.mouse.move(trimBox.x+2,trimBox.y+10);
    await page.mouse.down();
    await page.mouse.move(trimBox.x-8,trimBox.y+10,{steps:4});
    const waveDuring=await layer.locator('.studio-waveform').boundingBox();
    assert(Math.abs(waveBefore.width-waveDuring.width)<1,'trim clips the waveform without stretching it during drag');
    await page.mouse.up();
    assert(await page.evaluate(()=>{
      const {id}=studio.project.drafts.normal.layers[1];
      return studio.audioBuffer(id).duration < studio.buffers[id].duration;
    }));
    await page.click('#studioDraftPlay');
    await page.waitForFunction(()=>!!studio.draftSource);
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>studio.draftPaused && studio.draftContext.state==='suspended');
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>!!studio.draftSource && !studio.draftPaused);
    await page.click('#studioDraftClose');
    assert(await page.locator('.studio-track[data-kind="normal"] .studio-waveform').count()>0);
    await page.locator('[data-delete-track="warning"]').click();
    assert.equal(await page.locator('.studio-track[data-kind="warning"]').count(),0);
    const removed=page.locator('.studio-track[data-kind="normal"] .studio-clip').first();
    const removedId=await removed.getAttribute('data-id');
    await removed.click();
    await page.click('#studioDeleteClip');
    assert.equal(await page.locator('.studio-clip[data-id="'+removedId+'"]').count(),0);
    await page.locator('#studioNewFile').setInputFiles({name:'extra.wav',mimeType:'audio/wav',buffer});
    await page.locator('.studio-track[data-kind^="custom-"]').waitFor();
    await page.locator('.studio-track-volume[data-kind="normal"]').fill('0.45');
    assert.equal(await page.evaluate(()=>studio.project.trackVolumes.normal),.45);
    await page.locator('input.studio-file[data-kind="normal"]').setInputFiles({name:'replacement.wav',mimeType:'audio/wav',buffer});
    await page.locator('.studio-track[data-kind="normal"] small').filter({hasText:'replacement.wav'}).waitFor();
    const mixTrim=page.locator('.studio-track[data-kind="normal"] .studio-clip [data-trim-kind="mix:normal"][data-trim-edge="end"]').first();
    await mixTrim.scrollIntoViewIfNeeded();
    const mixBox=await mixTrim.boundingBox();
    await page.mouse.move(mixBox.x+3,mixBox.y+10);
    await page.mouse.down();
    await page.mouse.move(mixBox.x-9,mixBox.y+10,{steps:4});
    await page.mouse.up();
    assert(await page.evaluate(()=>{
      const full=studio.originalBuffer('mix:normal');
      return studio.trimmedMix('normal').duration < full.duration;
    }));
    // Recover from the write failure that previously looked like a successful replacement.
    await page.evaluate(()=>{
      studio.writeFile=async()=>{throw Error('simulated database write failure');};
    });
    await page.locator('input.studio-file[data-kind="music"]').setInputFiles({name:'song.wav',mimeType:'audio/wav',buffer});
    await page.locator('.studio-track[data-kind="music"] small').filter({hasText:'song.wav'}).waitFor();
    assert.equal(await page.locator('.studio-music-clip .studio-waveform').count(),1);
    assert(await page.locator('.studio-track[data-kind^="custom-"] .studio-waveform').count()===1);
    await page.locator('[data-edit-audio="music"]').click();
    assert(await page.locator('.studio-trim-view .studio-waveform use').evaluate(node=>node.getBBox().height>0));
    await page.locator('#studioTrimStart').fill('0.025');
    await page.locator('#studioTrimStart').press('Tab');
    assert(await page.evaluate(()=>Math.abs(studio.audioBuffer('music').duration-.075)<.0001));
    await page.locator('.studio-music-clip').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.001);
    await page.locator('[data-nudge="1"]').click();
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);
    const response=page.locator('.studio-track[data-kind="pinch"] .studio-dynamic').first();
    const responseId=await response.getAttribute('data-id');
    const responseOffset=await page.evaluate(id=>studio.hitOffset('pinch',.06,id),responseId);
    await response.focus();
    await page.keyboard.press('ArrowRight');
    assert(await page.evaluate(({id,offset})=>
      Math.abs(studio.hitOffset('pinch',.06,id)-offset-.001*BEAT)<.000001
      && studio.hitOffset('pinch',.06)===.06,{id:responseId,offset:responseOffset}));

    const downloadPromise=page.waitForEvent('download');
    await page.click('#studioExport');
    const download=await downloadPromise;
    const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(exported.version,1);
    assert(exported.files.music?.data && exported.files.normal?.data);
    assert(exported.project.custom.length===1);
    assert(Math.abs(exported.project.trims.music.start-.025)<.0001);
    assert.equal(exported.project.drafts.normal.layers.length,2);
    assert(exported.project.drafts.normal.layers.every(layer=>exported.files[layer.id]?.data));

    await page.click('#studioSave');
    await page.locator('#studioSaveStatus').filter({hasText:'已保存'}).waitFor();
    await page.locator('input.studio-file[data-kind="music"]').setInputFiles({name:'unsaved.wav',mimeType:'audio/wav',buffer});
    await page.locator('.studio-track[data-kind="music"] small').filter({hasText:'unsaved.wav'}).waitFor();
    await page.locator('#studioSaveStatus').filter({hasText:'未保存'}).waitFor();
    await page.reload();
    await page.waitForFunction(()=>state==='ready');
    await page.click('#audioStudioToggle');
    await page.locator('.studio-track[data-kind="music"] small').filter({hasText:'song.wav'}).waitFor();
    await page.locator('.studio-music-clip .studio-waveform').waitFor({state:'attached'});
    assert(await page.evaluate(()=>Math.abs(studio.audioBuffer('music').duration-.075)<.0001));
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);
    assert.equal(await page.evaluate(id=>studio.eventTime(id),id),after);
    assert.equal(await page.locator('.studio-track[data-kind^="custom-"]').count(),1);
    assert.equal(await page.locator('.studio-track[data-kind="warning"]').count(),0);
    assert.equal(await page.locator('.studio-clip[data-id="'+removedId+'"]').count(),0);
    await page.locator('#studioImport').setInputFiles({
      name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))
    });
    await page.locator('#studioStatus').filter({hasText:'工程已导入'}).waitFor();
    await page.click('#studioSave');
    await page.locator('#studioSaveStatus').filter({hasText:'已保存'}).waitFor();
    await page.locator('.studio-music-clip').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.003);
    page.once('dialog',dialog=>dialog.accept());
    await page.click('#studioNewDraft');
    await page.locator('#studioStatus').filter({hasText:'新草稿已建立'}).waitFor();
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);

    // Editing gestures must remain reversible and keep musical positions through zoom.
    await page.locator('.studio-music-clip').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.003);
    await page.click('#studioUndo');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);
    await page.click('#studioRedo');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.003);
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);
    await page.selectOption('#studioZoom','288');
    assert.equal(await page.evaluate(()=>studio.beatWidth),288);
    assert.equal(await page.evaluate(()=>studio.project.musicStart),.002);
    const beforeImport=await page.evaluate(()=>studio.project.custom.length);
    await page.locator('#studioNewFile').setInputFiles([
      {name:'one.wav',mimeType:'audio/wav',buffer:wav()},
      {name:'two.wav',mimeType:'audio/wav',buffer:wav()}
    ]);
    await page.waitForFunction(n=>studio.project.custom.length===n+2,beforeImport);
    await page.click('#studioUndo');
    assert.equal(await page.evaluate(()=>studio.project.custom.length),beforeImport+1);
    await page.click('#studioUndo');
    assert.equal(await page.evaluate(()=>studio.project.custom.length),beforeImport);
    await page.click('[data-draft="normal"]');
    assert(await page.locator('.studio-draft .studio-quarter').count()>5);
    assert(await page.locator('.studio-draft .studio-third').count()>5);
    const draftRuler=await page.locator('.studio-draft-ruler .studio-layer-rail').boundingBox();
    await page.mouse.click(draftRuler.x+30,draftRuler.y+20);
    assert((await page.evaluate(()=>studio.draftAt))>0,'child ruler scrubs');
    await page.click('#studioDraftClose');
    await page.selectOption('#studioZoom','144');
    await page.locator('.studio-music-clip').focus();
    await page.keyboard.press('Delete');
    assert(await page.evaluate(()=>studio.isTrackDeleted('music')));
    await page.click('#studioUndo');
    assert(!(await page.evaluate(()=>studio.isTrackDeleted('music'))));
    await page.evaluate(()=>studio.waveformsReady);
    assert(await page.locator('.studio-track[data-kind="motor"] .studio-waveform').count()>0);
    if(process.env.STUDIO_SCREENSHOT){
      await page.setViewportSize({width:1440,height:1100});
      await page.locator('#audioStudio').scrollIntoViewIfNeeded();
      await page.locator('#audioStudio').screenshot({path:process.env.STUDIO_SCREENSHOT});
    }

    await page.click('#start');await page.click('#playLevel');await page.click('#tutorialContinue');await page.click('#tutorialContinue');
    await page.waitForFunction(()=>state==='playing');
    await page.waitForTimeout(120);
    const playback=await page.evaluate(()=>{
      const music=Math.abs((soundtrack.musicSource?.buffer.duration ?? 0)-.075)<.0001;
      const custom=studio.project.custom[0];
      beginRound('level');
      const customScheduled=soundtrack.events.some(event=>event.id===custom.id && event.t===custom.t*BEAT);
      const shifted=soundtrack.events.find(event=>event.id==='e0')?.t===studio.eventTime('e0')*BEAT;
      soundtrack.effect('warning',audio.currentTime+.02);
      const deletedTrackIsSilent=soundtrack.voices.size===0;
      const starts=[];
      const playBuffer=soundtrack.playBuffer.bind(soundtrack);
      soundtrack.playBuffer=(buffer,start,...rest)=>{starts.push(start);return playBuffer(buffer,start,...rest);};
      const croppedMix=studio.trimmedMix('normal');
      soundtrack.effect('normal',audio.currentTime+.02);
      const mixPlayed=!!croppedMix && soundtrack.voices.size===1
        && [...soundtrack.voices][0].buffer===croppedMix;
      soundtrack.stop(0);
      starts.length=0;
      delete studio.project.trims['mix:normal'];
      soundtrack.effect('normal',audio.currentTime+.02);
      soundtrack.playBuffer=playBuffer;
      return {music,customScheduled,shifted,deletedTrackIsSilent,mixPlayed,layeredVoice:soundtrack.voices.size===3,
        layerDelay:Math.abs(starts[2]-starts[0]-.25*BEAT)<.0001};
    });
    assert(Object.values(playback).every(Boolean),playback);
    assert.deepEqual(errors,[]);
    console.log('PASS audio studio',data,{before,after,playback});
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
