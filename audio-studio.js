'use strict';

// Local browser sound project. Built-in sounds remain available when no file is assigned.
class AudioStudio {
  constructor({groups, chart, getAudio, getSoundtrack, pauseGame}) {
    this.groups = groups;
    this.chart = chart;
    this.getAudio = getAudio;
    this.getSoundtrack = getSoundtrack;
    this.pauseGame = pauseGame;
    this.panel = document.getElementById('audioStudio');
    this.toggle = document.getElementById('audioStudioToggle');
    this.beatWidth = 144;
    this.labelWidth = matchMedia('(max-width: 700px)').matches ? 230 : 314;
    this.panel.style.setProperty('--studio-label-width',this.labelWidth+'px');
    this.previewAt = 0;
    this.previewEngine = null;
    this.previewContext = null;
    this.draftKind = null;
    this.draftAt = 0;
    this.waveforms = new WeakMap();
    this.waveformId = 0;
    this.synthWaveforms = new Map();
    this.builtinBuffers = new Map();
    this.mixes = new Map();
    this.mixedBuffers = new Map();
    this.selectedClip = null;
    this.undoStack = [];
    this.redoStack = [];
    this.duration = Math.ceil(groups.at(-1).beat + groups.at(-1).length + 1);
    this.baseTracks = [
      ['music','纯音乐 · 背景'],['bouncePinch','反弹饭 · 捏'],['bounceSlap','反弹饭 · 拍'],['triplePinch1','三连 · 第一捏'],['triplePinch2','三连 · 第二捏'],['triplePinch3','三连 · 第三捏'],['cueRice','正常出饭预备'],['cueTriple','连出三份预备'],['cueBounce','反弹预备'],['cueSponge','海绵出场预备'],['motor','正常机器运转'],['normal','正常弹出'],
      ['motorFault','故障机器运转'],['warning','红灯闪烁'],['smoke','黑烟'],
      ['fault','连续弹出'],['collision','饭团碰撞'],
      ['motorStutter','卡顿机器运转'],['bounceOut','猛力弹出'],['bounce','墙面反弹'],
      ['spongeCharge','海绵挤压预备'],['spongeOut','海绵吧唧弹出'],
      ['pinch','捏饭响应'],['slap','拍饭响应'],['spongePinch','误捏海绵'],
      ['spongeSlap','拍海绵响应'],['targetA','A 操作提示'],['targetD','D 操作提示'],
      ['mistake','漏拍与错误提示']
    ];
    const defaults = {positions:{},hitOffsets:{},trackVolumes:{},custom:[],drafts:{},deletedTracks:[],deletedClips:[],musicStart:0,musicVolume:1,effectVolume:1,snap:'quarter'};
    try {this.project = {...defaults,...JSON.parse(localStorage.getItem('serve-rice-actions-20261124-audio-studio')||'{}')};}
    catch {this.project = defaults;}
    this.project.positions ||= {};
    this.project.hitOffsets ||= {};
    this.project.trackVolumes ||= {};
    this.project.custom ||= [];
    this.project.drafts ||= {};
    this.project.deletedTracks ||= [];
    this.project.deletedClips ||= [];
    this.tracks = [...this.baseTracks,...this.project.custom.map(item=>[item.id,item.name])];
    this.files = {};
    this.buffers = {};
    this.trimmedBuffers = new Map();
    this.project.trims ??= {};
    this.timelineEvents = KitchenSoundtrack.buildEvents(groups,chart);
    this.dynamicEvents = chart.map((n,i) => {
      const kind = actionSound(n.group.kind,n.slot,n.action);
      return {id:'hit'+i,kind,t:n.beat,noteBeat:n.beat,dynamic:true};
    });
    this.ready = this.loadFiles();
    this.bind();
    this.render();
  }
  markChanged() {
    const next=this.currentDraft();
    if(this.historyDraft && (JSON.stringify(next.project)!==JSON.stringify(this.historyDraft.project)
      || Object.keys({...next.files,...this.historyDraft.files}).some(k=>next.files[k]!==this.historyDraft.files[k]))){
      this.undoStack.push(this.historyDraft);
      if(this.undoStack.length>50)this.undoStack.shift();
      this.redoStack=[];
    }
    this.historyDraft=next;
    this.dirty=true;
    this.updateSaveStatus();
  }
  updateSaveStatus() {
    const status=this.panel.querySelector('#studioSaveStatus');
    const undo=this.panel.querySelector('#studioUndo'), redo=this.panel.querySelector('#studioRedo');
    if(undo)undo.disabled=!this.undoStack.length;
    if(redo)redo.disabled=!this.redoStack.length;
    if(status)status.textContent=this.saving?'正在保存…':this.dirty?'草稿有未保存的修改':this.savedAt?'已保存 · 新草稿就绪':'编辑草稿';
  }
  currentDraft() {
    return {project:structuredClone(this.project),files:{...this.files},buffers:{...this.buffers}};
  }
  restoreHistory(redo=false) {
    const from=redo?this.redoStack:this.undoStack, to=redo?this.undoStack:this.redoStack;
    if(!from.length || this.saving)return;
    to.push(this.currentDraft());
    const snapshot=from.pop();
    this.stopTimeline();
    this.project=structuredClone(snapshot.project);
    this.files={...snapshot.files};
    this.buffers={...snapshot.buffers};
    this.tracks=[...this.baseTracks,...this.project.custom.map(item=>[item.id,item.name])];
    this.trimmedBuffers.clear(); this.mixes.clear(); this.mixedBuffers.clear();
    this.getSoundtrack()?.clearMusicSource();
    this.editTarget=null; this.selectedClip=null;
    if(this.isTrackDeleted(this.draftKind))this.draftKind=null;
    this.historyDraft=this.currentDraft();
    this.dirty=true;
    this.render();
    this.message(redo?'已重做。':'已撤销。');
  }
  zoomTimeline(value) {
    const scroll=this.panel.querySelector('.studio-scroll');
    const left=(scroll?.scrollLeft ?? 0)/this.beatWidth;
    this.beatWidth=Math.max(72,Math.min(576,Number(value)||144));
    this.render();
    this.panel.querySelector('.studio-scroll').scrollLeft=left*this.beatWidth;
  }
  async saveProject() {
    await this.ready;
    if(this.saving)return;
    this.saving=true;
    this.dirty=false;
    this.updateSaveStatus();
    const draft=this.currentDraft();
    const savedAt=Date.now();
    try {
      try {
        const files=Object.fromEntries(await Promise.all(Object.entries(draft.files).map(async ([kind,record])=>
          [kind,{name:record.name,type:record.type,bytes:await record.blob.arrayBuffer()}])));
        await this.writeFile('@saved-project',{project:draft.project,files,savedAt});
        try {localStorage.removeItem('serve-rice-actions-20261124-audio-saved-project');} catch {}
      } catch {
        const files=Object.fromEntries(await Promise.all(Object.entries(draft.files).map(async ([kind,record])=>
          [kind,await this.packFile(record)])));
        localStorage.setItem('serve-rice-actions-20261124-audio-saved-project',JSON.stringify({project:draft.project,files,savedAt}));
      }
      this.savedDraft=draft;
      this.savedAt=savedAt;
      this.message('已保存音频和编辑位置。重新打开时会从此版本建立新草稿。');
    } catch {
      this.dirty=true;
      this.message('浏览器未能保存此草稿。请保留页面或导出工程。');
    } finally {
      this.saving=false;
      this.updateSaveStatus();
    }
  }
  async newDraft() {
    await this.ready;
    if(this.saving || (this.dirty && !window.confirm('放弃当前草稿中未保存的修改，从上次保存的版本重新开始？')))return;
    this.stopTimeline();
    this.project=structuredClone(this.savedDraft.project);
    this.files={...this.savedDraft.files};
    this.buffers={...this.savedDraft.buffers};
    this.tracks=[...this.baseTracks,...this.project.custom.map(item=>[item.id,item.name])];
    this.trimmedBuffers.clear();
    this.mixes.clear();
    this.mixedBuffers.clear();
    this.editTarget=null;
    this.selectedClip=null;
    this.draftKind=null;
    this.previewAt=0;
    this.dirty=false;
    this.undoStack=[]; this.redoStack=[];
    this.historyDraft=this.currentDraft();
    this.render();
    this.message('新草稿已建立。');
  }
  eventTime(id) {
    const custom=this.project.custom.find(item=>item.id===id);
    if(custom)return custom.t;
    const event=this.timelineEvents.find(item=>item.id===id);
    if (!event) return 0;
    return this.project.positions[id] ?? event.baseT;
  }
  hitOffset(kind, fallback, id) {
    const note=id && this.chart[Number(id.slice(3))];
    if(note && this.project.positions[id]!==undefined)
      return Math.max(0,(this.project.positions[id]-note.beat)*BEAT);
    const trackOffset=this.project.hitOffsets[kind];
    return Math.max(0,trackOffset===undefined?fallback:trackOffset*BEAT);
  }
  isTrackDeleted(kind) {return this.project.deletedTracks.includes(kind);}
  isClipDeleted(id) {return this.project.deletedClips.includes(id);}
  hitClipId(note) {
    const index = this.chart.indexOf(note);
    return index < 0 ? null : 'hit' + index;
  }
  async database() {
    if (!window.indexedDB) return null;
    try {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open('serve-rice-actions-20261124-audio-studio', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Audio database blocked'));
      });
    } catch {return null;}
  }
  async loadFiles() {
    const db = await this.database();
    const read = key => db && new Promise((resolve,reject)=>{
      const request=db.transaction('files').objectStore('files').get(key);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    let localSaved, databaseSaved;
    try {localSaved=JSON.parse(localStorage.getItem('serve-rice-actions-20261124-audio-saved-project'));} catch {}
    try {databaseSaved=await read('@saved-project');} catch {}
    const backup=localSaved && (!databaseSaved || localSaved.savedAt>=databaseSaved.savedAt);
    const saved=backup ? localSaved : databaseSaved;
    if(saved){
      this.project={...this.project,...saved.project};
      this.savedAt=saved.savedAt;
      this.tracks=[...this.baseTracks,...this.project.custom.map(item=>[item.id,item.name])];
    }
    const keys = [...this.tracks.map(([kind]) => kind),
      ...Object.values(this.project.drafts).flatMap(draft => draft.layers.map(layer => layer.id))];
    const context = new OfflineAudioContext(1, 1, 44100);
    let failed = false;
    try {
      await Promise.all(keys.map(async kind => {
        try {
          let record;
          if(saved){
            record=saved.files[kind];
            if(record && backup)record=this.unpackFile(record);
          } else {
            let fallback;
            try {fallback=localStorage.getItem('serve-rice-actions-20261124-audio-file-' + kind);} catch {}
            record=fallback ? (fallback==='null'?null:this.unpackFile(JSON.parse(fallback))) : await read(kind);
          }
          if (!record && !saved && RICE_AUDIO[kind])record=this.unpackFile({name:kind+(kind==='music'?'.mp3':'.wav'),type:kind==='music'?'audio/mpeg':'audio/wav',data:RICE_AUDIO[kind]});
          if (!record) return;
          const blob = record.blob ?? new Blob([record.bytes], {type:record.type});
          this.files[kind] = {name:record.name,type:record.type,blob};
          this.buffers[kind] = await context.decodeAudioData(await blob.arrayBuffer());
        } catch {failed = true;}
      }));
    } finally {db?.close();}
    this.savedDraft=this.currentDraft();
    this.historyDraft=this.currentDraft();
    this.render();
    if (failed) this.message('部分已保存的音频无法读取，可以重新导入对应文件。');
  }
  async writeFile(kind, record) {
    const db = await this.database();
    if (!db) throw new Error('Audio database unavailable');
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        if (record) store.put(record,kind);
        else store.delete(kind);
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error || new Error('Audio transaction aborted'));
      });
    } finally {db.close();}
  }
  async packFile(record) {
    const bytes = new Uint8Array(await record.blob.arrayBuffer());
    let binary = '';
    for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return {name:record.name,type:record.type,data:btoa(binary)};
  }
  unpackFile(record) {
    const bytes = Uint8Array.from(atob(record.data), char => char.charCodeAt(0));
    return {name:record.name,type:record.type,blob:new Blob([bytes],{type:record.type})};
  }
  forgetFile(kind) {
    delete this.files[kind];
    delete this.buffers[kind];
    this.trimmedBuffers.delete(kind);
    delete this.project.trims[kind];
  }
  async removeFile(kind) {
    this.stopTimeline();
    await this.ready;
    this.forgetFile(kind);
    this.markChanged();
    if (kind === 'music') this.getSoundtrack()?.clearMusicSource();
    this.render(); this.message(kind.startsWith('custom-')?'已删除自定义音效。':'已恢复 '+this.name(kind)+' 的内置合成音。');
  }
  async addCustom(file) {
    if(!file)return;
    const id='custom-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    await this.importAudio(id,file,()=>{
      this.project.custom.push({id,name:file.name,t:this.previewAt});
      this.tracks.push([id,file.name]);
    });
  }
  async importAudio(kind, file, onDecoded) {
    if (!file) return false;
    this.stopTimeline();
    await this.ready;
    const context = new OfflineAudioContext(1, 1, 44100);
    let buffer;
    try {buffer = await context.decodeAudioData(await file.arrayBuffer());}
    catch {
      this.message(file.name + ' 无法解码，请选择可播放的音频文件。');
      return false;
    }
    const record = {name:file.name,type:file.type || 'application/octet-stream',blob:file};
    this.buffers[kind] = buffer;
    this.files[kind] = record;
    this.trimmedBuffers.delete(kind);
    delete this.project.trims[kind];
    onDecoded?.();
    this.markChanged();
    if (kind === 'music') this.getSoundtrack()?.clearMusicSource();
    this.render();
    this.message(file.name + ' 已载入草稿。点击「保存」保留这个版本。');
    return true;
  }
  name(kind) {return this.tracks.find(track=>track[0]===kind)?.[1]||kind;}
  originalBuffer(kind) {return this.mixedBuffers.get(kind) ?? this.buffers[kind] ?? this.builtinBuffers.get(kind);}
  trimFrames(kind, range = this.project.trims[kind]) {
    const buffer = this.originalBuffer(kind);
    if (!buffer) return null;
    const first = Math.max(0,Math.min(buffer.length-1,Math.round((range?.start ?? 0)*buffer.sampleRate)));
    const last = Math.max(first+1,Math.min(buffer.length,Math.round((range?.end ?? buffer.duration)*buffer.sampleRate)));
    return {first,last,rate:buffer.sampleRate};
  }
  audioBuffer(kind) {
    if(!this.buffers[kind] && !this.mixedBuffers.get(kind) && !this.project.trims[kind])return undefined;
    const original = this.originalBuffer(kind);
    if (!original || !this.project.trims[kind]) return original;
    const {first,last,rate} = this.trimFrames(kind);
    if (first===0 && last===original.length) return original;
    const cached=this.trimmedBuffers.get(kind);
    if(cached?.original===original && cached.first===first && cached.last===last) return cached.buffer;
    const buffer=new AudioBuffer({length:last-first,sampleRate:rate,numberOfChannels:original.numberOfChannels});
    for(let channel=0;channel<original.numberOfChannels;channel++)
      buffer.copyToChannel(original.getChannelData(channel).subarray(first,last),channel);
    this.trimmedBuffers.set(kind,{original,first,last,buffer});
    return buffer;
  }
  trimmedMix(kind) {
    const key='mix:'+kind;
    return this.project.trims[key] ? this.audioBuffer(key) : null;
  }
  setTrim(kind, range, target=null, position=null) {
    const {first,last,rate}=this.trimFrames(kind,range);
    this.stopTimeline();
    if (first===0 && last===this.originalBuffer(kind).length) delete this.project.trims[kind];
    else this.project.trims[kind]={start:first/rate,end:last/rate};
    if (kind==='music') this.getSoundtrack()?.clearMusicSource();
    if(target && Number.isFinite(position))this.assignPosition(target,position);
    this.markChanged();
    this.render();
  }
  trimEdge(kind, edge, seconds) {
    const {first,last,rate}=this.trimFrames(kind);
    const start=first/rate, end=last/rate;
    return edge==='start'
      ? {start:Math.max(0,Math.min(end-1/rate,seconds)),end}
      : {start,end:Math.max(start+1/rate,Math.min(this.originalBuffer(kind).duration,seconds))};
  }
  trimHandles(kind) {
    if(!this.originalBuffer(kind))return '';
    return '<span class="studio-trim-edge studio-trim-in" data-trim-edge="start" data-trim-kind="'+kind+
      '" title="拖动裁剪开头"></span><span class="studio-trim-edge studio-trim-out" data-trim-edge="end" data-trim-kind="'+kind+'" title="拖动裁剪结尾"></span>';
  }
  message(value) {const output=this.panel.querySelector('#studioStatus');if(output)output.textContent=value;}
  escape(value) {return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  ruler() {
    let html='<div class="studio-ruler" style="width:'+this.width()+'px"><div class="studio-ruler-label">拍数 / 细分刻度</div>';
    for(let beat=0;beat<=this.duration;beat++){
      const x=this.labelWidth+beat*this.beatWidth;
      html+='<span class="studio-beat" style="left:'+x+'px">'+beat+'</span>';
      for(let i=1;i<4;i++) html+='<span class="studio-quarter" style="left:'+(x+i*this.beatWidth/4)+'px">'+i+'/4</span>';
      for(let i=1;i<3;i++) html+='<span class="studio-third" style="left:'+(x+i*this.beatWidth/3)+'px">'+i+'/3</span>';
    }
    return html+'</div>';
  }
  width() {return this.labelWidth+(this.duration+1)*this.beatWidth;}
  waveform(buffer, repeatWidth = 0) {
    if (!buffer) return '';
    let shape = this.waveforms.get(buffer);
    if (!shape) {
      const columns = Math.max(12, Math.min(4096, Math.ceil(buffer.duration / BEAT * this.beatWidth)));
      const channels = Array.from({length:buffer.numberOfChannels}, (_, index) => buffer.getChannelData(index));
      const peaks = [], ranges=[];
      let amplitude=0;
      for (let x=0; x<columns; x++) {
        let min=0, max=0;
        const end = Math.ceil((x+1)*buffer.length/columns);
        for (const samples of channels) {
          for (let i=Math.floor(x*buffer.length/columns); i<end; i++) {
            min=Math.min(min,samples[i]);
            max=Math.max(max,samples[i]);
          }
        }
        ranges.push([min,max]);
        amplitude=Math.max(amplitude,-min,max);
      }
      // Visual normalization only; never modify the playback samples or volume.
      const displayGain=amplitude>0 ? Math.min(24,.9/amplitude) : 1;
      for(let x=0;x<ranges.length;x++){
        const [min,max]=ranges[x];
        const top = Math.max(1, 25 - max*24*displayGain);
        const bottom = Math.min(49, 25 - min*24*displayGain);
        peaks.push('M'+x+' '+top.toFixed(1)+'V'+Math.max(top+.7,bottom).toFixed(1));
      }
      shape={id:'studio-wave-'+(++this.waveformId),columns,path:peaks.join('')};
      this.waveforms.set(buffer,shape);
    }
    const {id,columns,path}=shape;
    const view=' viewBox="0 0 '+columns+' 50" preserveAspectRatio="none"';
    if(repeatWidth){
      const image=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"'+view+'><path fill="none" stroke="#183f45" d="'+path+'"/></svg>');
      return '<span class="studio-waveform" aria-hidden="true" style="background-image:url(data:image/svg+xml,'+image+
        ');background-size:'+repeatWidth+'px 100%;background-repeat:repeat-x"></span>';
    }
    if(!this.waveformDefinitions.has(id)){
      const node=document.createElementNS('http://www.w3.org/2000/svg','path');
      node.id=id;
      node.setAttribute('d',path);
      node.setAttribute('vector-effect','non-scaling-stroke');
      this.waveformRoot.append(node);
      this.waveformDefinitions.add(id);
    }
    return '<svg class="studio-waveform" aria-hidden="true"'+view+'><use href="#'+id+'"/></svg>';
  }
  synthBuffer(kind) {
    if (!this.synthWaveforms.has(kind)) {
      const rate=44100;
      const context = new OfflineAudioContext(1,Math.ceil((kind==='music'?8*BEAT:.66)*rate),rate);
      const engine = new KitchenSoundtrack(context,context.destination);
      if(kind==='music')for(let step=0;step<16;step++)engine.musicBeat(step,step*BEAT/2);
      else engine.effect(kind,0);
      this.synthWaveforms.set(kind,context.startRendering().then(buffer=>{
        const samples=buffer.getChannelData(0);
        let end=samples.length;
        if(kind!=='music')while(end>1 && Math.abs(samples[end-1])<.0002)end--;
        const trimmed=context.createBuffer(1,end,rate);
        trimmed.copyToChannel(samples.subarray(0,end),0);
        this.builtinBuffers.set(kind,trimmed);
        return trimmed;
      }));
    }
    return this.synthWaveforms.get(kind);
  }
  async draftMix(kind) {
    const draft = this.project.drafts[kind] ?? {includeBase:true,layers:[]};
    const key = JSON.stringify(draft);
    const sources = [this.audioBuffer(kind), ...draft.layers.map(layer=>this.audioBuffer(layer.id))];
    const cached = this.mixes.get(kind);
    if (cached?.key===key && sources.every((buffer,index)=>buffer===cached.sources[index])) return cached.promise;
    const mix = {key,sources,base:null,buffer:null};
    mix.promise = (async()=>{
      if (draft.includeBase!==false)
        mix.base = sources[0] ?? (kind.startsWith('custom-')?null:await this.synthBuffer(kind));
      const layers=draft.layers.map((layer,index)=>({...layer,buffer:sources[index+1]})).filter(layer=>layer.buffer);
      if (mix.base) layers.unshift({buffer:mix.base,beat:draft.baseBeat ?? 0,volume:1});
      if (!layers.length) return mix;
      const duration=Math.max(...layers.map(layer=>layer.beat*BEAT+layer.buffer.duration));
      const context=new OfflineAudioContext(2,Math.ceil(duration*44100),44100);
      for (const layer of layers) {
        const source=context.createBufferSource();
        const gain=context.createGain();
        source.buffer=layer.buffer;
        gain.gain.value=layer.volume;
        source.connect(gain);
        gain.connect(context.destination);
        source.start(layer.beat*BEAT);
      }
      mix.buffer=await context.startRendering();
      return mix;
    })();
    this.mixes.set(kind,mix);
    return mix.promise;
  }
  async renderWaveforms() {
    const renderId = this.waveformRender = Symbol();
    for(const [kind] of this.baseTracks){
      if(this.waveformRender!==renderId || this.panel.hidden)break;
      if(this.files[kind] || this.isTrackDeleted(kind))continue;
      await new Promise(resolve=>setTimeout(resolve,0));
      const source=await this.synthBuffer(kind);
      if(this.waveformRender!==renderId)return;
      const track=this.panel.querySelector('.studio-track[data-kind="'+kind+'"]');
      if(track && !track.querySelector('.studio-clip,.studio-music-clip,.studio-source-wave'))track.insertAdjacentHTML('beforeend',this.clips(kind));
      for(const clip of track?.querySelectorAll('.studio-clip,.studio-music-clip,.studio-source-wave') ?? []){
        this.paintClip(clip,this.audioBuffer(kind) ?? source);
        if(!clip.querySelector('[data-trim-edge]'))clip.insertAdjacentHTML('beforeend',this.trimHandles(kind));
      }
    }
    if(this.waveformRender!==renderId)return;
    const kinds = new Set(Object.keys(this.project.drafts));
    if (this.draftKind) kinds.add(this.draftKind);
    await Promise.all([...kinds].map(async kind=>{
      try {
        const mix = await this.draftMix(kind);
        if (this.waveformRender!==renderId) return;
        const mixKey='mix:'+kind;
        this.mixedBuffers.set(mixKey,mix.buffer);
        const output=this.audioBuffer(mixKey);
        const track = [...this.panel.querySelectorAll('.studio-track')].find(row=>row.dataset.kind===kind);
        if (track && this.project.drafts[kind]) {
          for (const clip of track.querySelectorAll('.studio-clip,.studio-source-wave')) this.paintMixClip(clip,output,mixKey);
          const caption=track.querySelector('[data-draft-summary]');
          const count=this.project.drafts[kind].layers.length;
          caption.hidden=false;
          caption.textContent='组合 · '+count+' 层';
        }
        if (this.draftKind===kind) {
          this.paintMixClip(this.panel.querySelector('#studioDraftMix'),output,mixKey);
          const original=this.panel.querySelector('#studioDraftOriginal');
          this.paintClip(original,mix.base);
          if(original && !original.querySelector('[data-trim-edge]'))original.insertAdjacentHTML('beforeend',this.trimHandles(kind));
          const seconds=Math.max(mix.buffer?.duration ?? 0,(this.project.drafts[kind]?.baseBeat ?? 0)*BEAT+(mix.base?.duration ?? 0));
          const end=Math.max(5,Math.ceil(seconds/BEAT)+1);
          this.panel.querySelector('.studio-draft-lanes').style.setProperty('--draft-width',end*this.beatWidth+'px');
          this.panel.querySelector('.studio-draft-ruler .studio-layer-rail').innerHTML=this.draftMarks(end);
        }
      } catch {
        if(this.waveformRender===renderId) this.message('组合波形未能生成，请检查子音效文件。');
      }
    }));
  }
  paintMixClip(clip,buffer,key) {
    if(!clip)return;
    clip.dataset.mixSource=key;
    for (const handle of clip.querySelectorAll('.studio-trim-edge'))handle.remove();
    this.paintClip(clip,buffer);
    clip.insertAdjacentHTML('beforeend',this.trimHandles(key));
  }
  paintClip(clip, buffer, pitch = Number(clip?.dataset.pitch) || 1) {
    if (!clip) return;
    clip.classList.toggle('studio-has-wave',!!buffer);
    clip.style.width=buffer ? Math.max(23,buffer.duration/BEAT*this.beatWidth/pitch)+'px' : '';
    clip.querySelector('.studio-waveform')?.remove();
    clip.insertAdjacentHTML('afterbegin',this.waveform(buffer));
  }
  clips(kind) {
    if(kind==='music'){
      const left=this.labelWidth+this.project.musicStart*this.beatWidth;
      const buffer=this.audioBuffer(kind) ?? this.builtinBuffers.get(kind);
      const end=this.labelWidth+this.duration*this.beatWidth;
      const audioWidth=buffer ? buffer.duration/BEAT*this.beatWidth : end-left;
      const wave=this.waveform(buffer);
      const loops=wave && left+audioWidth<end ? '<div class="studio-music-loops" style="left:'+(left+audioWidth)+
        'px;width:'+(end-left-audioWidth)+'px" title="循环播放">'+this.waveform(buffer,audioWidth)+'</div>' : '';
      return loops+'<button class="studio-music-clip'+(wave?' studio-has-wave':'')+'" data-music="1" style="left:'+left+
        'px;width:'+Math.max(24,audioWidth)+'px" title="拖动背景音乐起点">'+wave+'<span class="studio-clip-caption">'+
        this.escape(this.files.music?.name||'内置合成背景音乐 · '+BPM+' BPM')+'</span>'+this.trimHandles(kind)+'</button>';
    }
    const custom=kind.startsWith('custom-');
    const clips=custom ? [{id:kind,kind}] : [...this.timelineEvents,...this.dynamicEvents];
    const buffer=this.audioBuffer(kind) ?? this.builtinBuffers.get(kind);
    const wave=this.waveform(buffer);
    if (!clips.some(clip=>clip.kind===kind) && (buffer || this.project.drafts[kind])) {
      const width=buffer ? Math.max(23,buffer.duration/BEAT*this.beatWidth) : 60;
      return '<button class="studio-source-wave" data-preview="'+kind+'" style="left:'+this.labelWidth+'px;width:'+width+
        'px" title="试听触发音效"><span class="studio-clip-marker">▶</span>'+wave+
        (this.project.drafts[kind]?'':this.trimHandles(kind))+'</button>'+
        '<small class="studio-source-note" style="left:'+(this.labelWidth+8)+'px">按事件触发</small>';
    }
    return clips.filter(e=>e.kind===kind && !this.isClipDeleted(e.id)).map(e=>{
      const t=e.dynamic?e.noteBeat+this.hitOffset(kind,(e.t-e.noteBeat)*BEAT,e.id)/BEAT:this.eventTime(e.id);
      const pitch=e.pitch ?? 1;
      const width=buffer ? Math.max(23,buffer.duration/BEAT*this.beatWidth/pitch) : 23;
      return '<button class="studio-clip'+(e.dynamic?' studio-dynamic':'')+(custom?' studio-custom':'')+(wave?' studio-has-wave':'')+
        '" data-id="'+e.id+'" data-pitch="'+pitch+'" style="left:'+(this.labelWidth+t*this.beatWidth)+'px;width:'+width+'px" title="'+
        this.escape(this.name(kind))+' · '+t.toFixed(3)+' 拍 · 双击打开子草稿'+(e.dynamic?' · 按键后相对延时':'')+'">'+wave+
        '<span class="studio-clip-marker">'+(e.dynamic?'◆':'●')+'</span>'+
        (this.project.drafts[kind]?'':this.trimHandles(kind))+'</button>';
    }).join('');
  }
  render() {
    if(!this.panel)return;
    this.panel.style.setProperty('--beat-width',this.beatWidth+'px');
    this.panel.style.setProperty('--quarter-width',this.beatWidth/4+'px');
    this.panel.style.setProperty('--third-width',this.beatWidth/3+'px');
    this.waveformDefinitions=new Set();
    const definitions=document.createElementNS('http://www.w3.org/2000/svg','svg');
    definitions.setAttribute('class','studio-wave-definitions');
    definitions.setAttribute('aria-hidden','true');
    this.waveformRoot=document.createElementNS('http://www.w3.org/2000/svg','defs');
    definitions.append(this.waveformRoot);
    const wasOpen=!this.panel.hidden;
    const previousViewport=this.panel.querySelector('.studio-scroll');
    const scrollLeft=previousViewport?.scrollLeft ?? 0;
    const scrollTop=previousViewport?.scrollTop ?? 0;
    const draftViewport=this.panel.querySelector('.studio-draft-scroll');
    const draftLeft=draftViewport?.scrollLeft ?? 0;
    const draftTop=draftViewport?.scrollTop ?? 0;
    const trackHtml=this.tracks.filter(([kind])=>!this.isTrackDeleted(kind)).map(([kind,title])=>{
      const label=this.escape(title);
      const file=this.files[kind]?.name||'内置合成音';
      return '<div class="studio-track" data-kind="'+kind+'" style="width:'+this.width()+'px">'+
        '<div class="studio-track-head"><strong>'+label+'</strong><small title="'+this.escape(file)+'">'+this.escape(file)+' <span data-draft-summary hidden></span></small>'+
        '<input class="studio-track-volume" data-kind="'+kind+'" title="此音源音量" aria-label="'+label+'音量" type="range" min="0" max="2" step=".05" value="'+(kind==='music'?this.project.musicVolume:(this.project.trackVolumes[kind]??1))+'">'+
        '<div class="studio-track-actions"><button data-preview="'+kind+'" title="试听">▶</button>'+
        (kind.startsWith('custom-')?'':'<button data-wav="'+kind+'" title="将内置合成音导出为独立 WAV 文件">↓</button>')+
        '<label title="拖入或选择音频文件">换<input class="studio-file" data-kind="'+kind+'" type="file" accept="audio/*,.wav,.mp3,.ogg,.flac"></label>'+
        (kind !== 'music' ? '<button data-draft="'+kind+'" title="编辑子草稿" aria-label="编辑 '+label+' 的子草稿">层</button><button data-delete-track="'+kind+'" title="删除整条音效轨道" aria-label="删除 '+label+' 轨道">×</button>' : '<button data-delete-track="music" title="删除背景音乐">×</button>')+
        (this.files[kind]?'<button data-edit-audio="'+kind+'" title="精确编辑音频">剪</button><button data-remove="'+kind+'" title="清除替换文件">↺</button>':'')+'</div></div>'+this.clips(kind)+'</div>';
    }).join('');
    this.panel.innerHTML='<div class="studio-heading"><div><span class="eyebrow">AUDIO STUDIO</span><h2>音频剪辑工作台</h2><p>拖动片段移动 · 拖动两端裁剪 · 双击编辑子草稿</p></div><div class="studio-save-controls"><button id="studioUndo" title="⌘ / Ctrl + Z">撤销</button><button id="studioRedo" title="⌘ / Ctrl + Shift + Z">重做</button><button id="studioSave" class="primary">保存</button><button id="studioNewDraft">新草稿</button><button id="studioClose">收起 ×</button><output id="studioSaveStatus" aria-live="polite"></output></div></div>'+ 
      '<div class="studio-controls"><label>音乐音量 <input id="studioMusicVolume" type="range" min="0" max="2" step=".05" value="'+this.project.musicVolume+'"></label><label>音效音量 <input id="studioEffectVolume" type="range" min="0" max="2" step=".05" value="'+this.project.effectVolume+'"></label><label>吸附到 <select id="studioSnap"><option value="quarter">1/4 拍</option><option value="third">1/3 拍</option><option value="free">自由</option></select></label><label class="studio-import">＋ 添加独立音效<input id="studioNewFile" multiple type="file" accept="audio/*,.wav,.mp3,.ogg,.flac"></label><button id="studioExport">导出工程</button><label class="studio-import">导入工程<input id="studioImport" type="file" accept="application/json,.json"></label></div>'+ 
      '<div class="studio-transport"><strong>'+BPM+' BPM</strong><button id="studioPlay">▶ 从此处试听</button><button id="studioStop">■ 停止</button><label>第 <input id="studioSeek" type="number" min="0" max="'+this.duration+'" step=".01" value="'+this.previewAt.toFixed(2)+'"> 拍</label><output id="studioTime">'+this.previewAt.toFixed(2)+' / '+this.duration+' 拍</output><span>拖动进度条或时间尺定位</span><kbd>空格</kbd><span>播放 / 暂停</span></div>'+ 
      '<input id="studioScrubber" class="studio-scrubber" type="range" min="0" max="'+this.duration+'" step="any" value="'+this.previewAt+'" aria-label="拖动播放进度">'+
      '<div class="studio-dropzone" tabindex="0">将音频拖到这里，添加到当前播放头 · 拖到轨道上替换该音源 · 支持多文件导入</div>'+
      '<div class="studio-guide"><label>时间线缩放 <select id="studioZoom"><option value="72">50%</option><option value="144">100%</option><option value="288">200%</option><option value="576">400%</option></select></label><button id="studioDeleteClip" disabled>删除选中音效</button>'+
      (this.project.deletedClips.length || this.project.deletedTracks.length ? '<button id="studioRestore">恢复已删除音效</button>' : '')+'<span>上排：每拍 1/4</span><span>下排：每拍 1/3</span><span>● 固定音效</span><span>◆ 按键响应</span></div><div class="studio-scroll"><div class="studio-inner" style="width:'+this.width()+'px">'+this.ruler()+trackHtml+'<div id="studioPlayhead"></div></div></div><p id="studioStatus" role="status">音频文件保存在此浏览器；导出工程可备份并转到另一台设备。</p>';
    this.panel.hidden=!wasOpen;
    this.panel.prepend(definitions);
    this.updateSaveStatus();
    this.panel.querySelector('#studioSnap').value=this.project.snap;
    this.panel.querySelector('#studioZoom').value=this.beatWidth;
    const viewport=this.panel.querySelector('.studio-scroll');
    viewport.scrollLeft=scrollLeft;
    viewport.scrollTop=scrollTop;
    viewport.insertAdjacentHTML('beforebegin',this.draftMarkup());
    this.panel.querySelector('.studio-guide').insertAdjacentHTML('afterend','<div id="studioClipEditor"></div>');
    const draftScroll=this.panel.querySelector('.studio-draft-scroll');
    if(draftScroll){draftScroll.scrollLeft=draftLeft;draftScroll.scrollTop=draftTop;}
    this.updatePlayhead(this.previewAt);
    this.updateSelection();
    this.updateClipEditor();
    this.updatePreviewControls();
    this.waveformsReady=wasOpen ? this.renderWaveforms().then(()=>{
      if(this.editTarget)this.updateClipEditor();
    }) : Promise.resolve();
  }
  draftMarks(end) {
    let html='';
    for(let beat=0;beat<=end;beat++){
      html+='<span class="studio-beat" style="left:'+beat*this.beatWidth+'px">'+beat+'</span>';
      if(beat===end)continue;
      for(let part=1;part<4;part++)html+='<span class="studio-quarter" style="left:'+(beat+part/4)*this.beatWidth+'px">'+part+'/4</span>';
      for(let part=1;part<3;part++)html+='<span class="studio-third" style="left:'+(beat+part/3)*this.beatWidth+'px">'+part+'/3</span>';
    }
    return html;
  }
  draftMarkup() {
    if (!this.draftKind) return '';
    const kind = this.draftKind;
    const draft = this.project.drafts[kind] ?? {includeBase:true,layers:[]};
    const layers = draft.layers.map(layer => {
      const buffer=this.audioBuffer(layer.id);
      return '<div class="studio-layer studio-draft-row" data-layer="'+layer.id+'"><div class="studio-layer-label">'+
      '<strong>'+this.escape(this.files[layer.id]?.name ?? layer.name)+'</strong>'+
      '<label>延迟（拍） <input data-layer-field="beat" type="number" min="0" max="32" step="any" value="'+layer.beat+'"></label>'+
      '<label>音量 <input data-layer-field="volume" type="range" min="0" max="2" step=".05" value="'+layer.volume+'"></label>'+
      '<button data-delete-layer="'+layer.id+'">删除</button></div><div class="studio-layer-rail">'+
      '<button class="studio-layer-clip" data-layer-wave="'+layer.id+'" aria-label="拖动 '+this.escape(layer.name)+' 的起点" style="left:'+layer.beat*this.beatWidth+'px;width:'+
      Math.max(23,(buffer?.duration ?? 0)/BEAT*this.beatWidth)+'px">'+this.waveform(buffer)+this.trimHandles(layer.id)+'</button></div></div>';
    }).join('');
    const end=Math.max(5,...draft.layers.map(layer=>Math.ceil(layer.beat+(this.audioBuffer(layer.id)?.duration ?? 0)/BEAT)+1));
    const marks=this.draftMarks(end);
    const summary = '<div class="studio-draft-row"><div class="studio-layer-label"><strong>组合波形</strong></div><div class="studio-layer-rail"><div id="studioDraftMix" class="studio-layer-clip studio-layer-mix"></div></div></div>';
    const original = draft.includeBase===false ? '' : '<div class="studio-draft-row"><div class="studio-layer-label"><strong>原声</strong></div><div class="studio-layer-rail"><button id="studioDraftOriginal" data-base-wave="1" class="studio-layer-clip" style="left:'+(draft.baseBeat ?? 0)*this.beatWidth+'px">'+this.trimHandles(kind)+'</button></div></div>';
    return '<section class="studio-draft" aria-label="音效子草稿">'+
      '<div class="studio-draft-header"><h3>'+this.escape(this.name(kind))+' · 子草稿</h3><button id="studioDraftClose">关闭</button></div>'+
      '<div class="studio-controls"><label><input id="studioDraftBase" type="checkbox" '+(draft.includeBase?'checked':'')+'> 保留原声</label>'+
      '<label class="studio-import">＋ 导入子音效<input id="studioLayerFile" type="file" accept="audio/*,.wav,.mp3,.ogg,.flac" multiple></label>'+
      '<button id="studioDraftPlay">▶ 试听组合</button><output id="studioDraftTime"></output></div>'+
      '<div class="studio-draft-scroll"><div class="studio-draft-lanes" style="--draft-width:'+end*this.beatWidth+'px">'+
      '<div class="studio-draft-row studio-draft-ruler"><div class="studio-layer-label">相对起点 · 拍</div><div class="studio-layer-rail">'+marks+'</div></div>'+
      summary+original+layers+'<div id="studioDraftPlayhead"></div></div></div></section>';
  }
  openDraft(kind) {
    this.stopDraft();
    this.draftKind=kind;
    this.draftAt=0;
    this.render();
    this.panel.querySelector('.studio-draft').scrollIntoView({block:'nearest'});
  }
  async addLayers(files) {
    const kind = this.draftKind;
    if (!kind) return;
    for (const file of Array.from(files)) {
      const id = 'layer-' + Date.now().toString(36) + Math.random().toString(36).slice(2,9);
      await this.importAudio(id,file,()=>{
        const draft = this.project.drafts[kind] ??= {includeBase:true,layers:[]};
        draft.layers.push({id,name:file.name,beat:this.draftAt/BEAT,volume:1});
      });
    }
  }
  async deleteLayer(id) {
    const draft = this.project.drafts[this.draftKind];
    draft.layers = draft.layers.filter(layer => layer.id !== id);
    this.stopTimeline();
    this.forgetFile(id);
    this.markChanged();
    this.render();
  }
  updateSelection() {
    for (const clip of this.panel.querySelectorAll('.studio-clip'))
      clip.setAttribute('aria-pressed', String(clip.dataset.id === this.selectedClip));
    for(const clip of this.panel.querySelectorAll('[data-layer-wave],[data-base-wave]'))
      clip.setAttribute('aria-pressed',String(clip.dataset.baseWave ? !!this.editTarget?.base : clip.dataset.layerWave===this.editTarget?.layer?.id));
    this.panel.querySelector('#studioDeleteClip').disabled = !this.selectedClip && !this.editTarget?.layer && this.editTarget?.kind!=='music';
  }
  clipEditTarget(clip) {
    if(clip.dataset.baseWave)return {kind:this.draftKind,base:true};
    const layerId=clip.dataset.layerWave;
    if(layerId){
      const layer=this.project.drafts[this.draftKind]?.layers.find(item=>item.id===layerId);
      return {kind:layerId,layer};
    }
    if(clip.dataset.music)return {kind:'music'};
    const id=clip.dataset.id;
    const event=this.dynamicEvents.find(item=>item.id===id) ?? this.timelineEvents.find(item=>item.id===id);
    return {kind:clip.closest('.studio-track').dataset.kind,id,event,source:clip.dataset.mixSource};
  }
  editPosition(target) {
    if(target.base)return this.project.drafts[target.kind]?.baseBeat ?? 0;
    if(target.layer)return target.layer.beat;
    if(target.kind==='music')return this.project.musicStart;
    if(target.event?.dynamic){
      const event=target.event;
      return event.noteBeat+this.hitOffset(target.kind,(event.t-event.noteBeat)*BEAT,event.id)/BEAT;
    }
    return target.id ? this.eventTime(target.id) : null;
  }
  boundPosition(target,value) {
    const event=target.event;
    const min=event?.dynamic ? event.noteBeat : 0;
    const max=target.layer || target.base ? 32 : event?.dynamic ? event.noteBeat+1 : this.duration;
    return Math.max(min,Math.min(max,value));
  }
  moveClip(target,value) {
    if(!Number.isFinite(value) || this.editPosition(target)===null)return;
    value=this.boundPosition(target,value);
    this.stopTimeline();
    this.assignPosition(target,value);
    this.markChanged();
    this.render();
    this.message('草稿位置 · '+value.toFixed(4)+' 拍');
  }
  assignPosition(target,value) {
    if(target.base){
      const draft=this.project.drafts[target.kind] ??= {includeBase:true,layers:[]};
      draft.baseBeat=value;
    }
    else if(target.layer)target.layer.beat=value;
    else if(target.kind==='music'){
      this.project.musicStart=value;
      this.getSoundtrack()?.clearMusicSource();
    } else {
      const custom=this.project.custom.find(item=>item.id===target.id);
      if(custom)custom.t=value;
      else this.project.positions[target.id]=value;
      const running=this.getSoundtrack()?.events.find(event=>event.id===target.id);
      if(running)running.t=value*BEAT;
    }
  }
  updateClipEditor() {
    const editor=this.panel.querySelector('#studioClipEditor');
    const target=this.editTarget;
    const source=target && (target.source ?? target.kind);
    const buffer=source && this.originalBuffer(source);
    if(!buffer){editor.hidden=true;editor.replaceChildren();return;}
    editor.hidden=false;
    const {first,last,rate}=this.trimFrames(source);
    const position=this.editPosition(target);
    const name=this.escape(target.source ? this.name(target.kind)+' · 组合' : this.files[target.kind]?.name ?? this.name(target.kind));
    editor.innerHTML='<strong>'+name+'</strong>'+
      (position===null?'':'<button data-nudge="-1" aria-label="向左微移 0.001 拍">←</button><label>位置（拍） <input id="studioClipPosition" type="number" step="any" value="'+Number(position.toFixed(6))+'"></label><button data-nudge="1" aria-label="向右微移 0.001 拍">→</button>')+
      '<label>裁剪入点（秒） <input id="studioTrimStart" type="number" min="0" max="'+buffer.duration+'" step="any" value="'+Number((first/rate).toFixed(6))+'"></label>'+
      '<label>裁剪出点（秒） <input id="studioTrimEnd" type="number" min="0" max="'+buffer.duration+'" step="any" value="'+Number((last/rate).toFixed(6))+'"></label>'+
      '<button id="studioTrimReset">恢复原长度</button><span>← / → 微移 0.001 拍 · Shift 加速 · Alt 拖动取消吸附</span>'+
      (target.kind==='music'||target.layer||target.kind.startsWith('custom-')?'':'<span>裁剪作用于使用此音源的所有片段</span>')+
      '<div class="studio-trim-view" title="波形高度按音源放大显示，不改变音量" aria-label="原始波形与裁剪范围">'+this.waveform(buffer)+
      '<div class="studio-trim-range" style="left:'+(100*first/buffer.length)+'%;width:'+(100*(last-first)/buffer.length)+'%">'+
      this.trimHandles(source)+'</div></div>';
  }
  deleteClip() {
    if(this.editTarget?.layer){
      const id=this.editTarget.layer.id;this.editTarget=null;this.selectedClip=null;
      this.deleteLayer(id);return;
    }
    if(this.editTarget?.kind==='music'){this.editTarget=null;this.deleteTrack('music');return;}
    if (!this.selectedClip) return;
    this.stopTimeline();
    if (!this.isClipDeleted(this.selectedClip)) this.project.deletedClips.push(this.selectedClip);
    this.selectedClip = null;
    this.editTarget=null;
    this.markChanged();
    this.render();
    this.message('已删除此处音效。操作判定继续按原节拍运行。');
  }
  deleteTrack(kind) {
    this.stopTimeline();
    if(!this.isTrackDeleted(kind))this.project.deletedTracks.push(kind);
    this.editTarget=null;
    if(kind==='music')this.getSoundtrack()?.clearMusicSource();
    this.selectedClip = null;
    if (this.draftKind === kind) this.draftKind = null;
    this.markChanged();
    this.render();
  }
  bind() {
    this.toggle.onclick=()=>{
      this.panel.hidden=!this.panel.hidden;
      this.toggle.setAttribute('aria-expanded',String(!this.panel.hidden));
      if(!this.panel.hidden){this.pauseGame();this.render();this.panel.scrollIntoView({block:'start',behavior:'smooth'});}
      else this.stopTimeline();
    };
    this.panel.addEventListener('click',e=>{
      if(e.target.closest('[data-trim-edge]'))return;
      const button=e.target.closest('button');if(!button)return;
      if(button.id==='studioClose')this.toggle.click();
      else if(button.id==='studioUndo')this.restoreHistory();
      else if(button.id==='studioRedo')this.restoreHistory(true);
      else if(button.id==='studioSave')this.saveProject();
      else if(button.id==='studioNewDraft')this.newDraft();
      else if(button.dataset.nudge){
        const direction=Number(button.dataset.nudge);
        const position=this.editPosition(this.editTarget);
        this.moveClip(this.editTarget,Number((position+direction*(e.shiftKey?.01:.001)).toFixed(6)));
        this.panel.querySelector('[data-nudge="'+direction+'"]')?.focus({preventScroll:true});
      }
      else if(button.id==='studioPlay')this.toggleTimeline();
      else if(button.id==='studioStop')this.stopTimeline();
      else if(button.id==='studioDeleteClip')this.deleteClip();
      else if(button.id==='studioRestore'){
        this.stopTimeline();
        this.project.deletedTracks=[];this.project.deletedClips=[];
        this.markChanged();this.render();
      }
      else if(button.dataset.deleteTrack)this.deleteTrack(button.dataset.deleteTrack);
      else if(button.dataset.draft)this.openDraft(button.dataset.draft);
      else if(button.id==='studioDraftClose'){this.stopDraft();this.draftKind=null;this.render();}
      else if(button.id==='studioDraftPlay')this.toggleDraft();
      else if(button.dataset.editAudio){
        const kind=button.dataset.editAudio;
        this.editTarget={kind,id:kind.startsWith('custom-')?kind:null};
        this.updateClipEditor();
        this.panel.querySelector('#studioClipEditor').scrollIntoView({block:'nearest'});
      }
      else if(button.id==='studioTrimReset')this.setTrim(this.editTarget.source ?? this.editTarget.kind,null);
      else if(button.dataset.deleteLayer)this.deleteLayer(button.dataset.deleteLayer);
      else if(button.dataset.preview)this.preview(button.dataset.preview);
      else if(button.dataset.wav)this.exportBuiltin(button.dataset.wav);
      else if(button.dataset.remove)this.removeFile(button.dataset.remove);
      else if(button.id==='studioExport')this.exportProject();
    });
    this.panel.addEventListener('change',e=>{
      if(e.target.id==='studioClipPosition' && e.target.value!=='')
        this.moveClip(this.editTarget,Number(e.target.value));
      if(['studioTrimStart','studioTrimEnd'].includes(e.target.id) && e.target.value!==''){
        const kind=this.editTarget.source ?? this.editTarget.kind;
        const edge=e.target.id==='studioTrimStart'?'start':'end';
        this.setTrim(kind,this.trimEdge(kind,edge,Number(e.target.value)));
      }
      if(e.target.matches('.studio-file'))this.importAudio(e.target.dataset.kind,e.target.files[0]);
      if(e.target.id==='studioNewFile')this.addCustomFiles(e.target.files);
      if(e.target.id==='studioZoom')this.zoomTimeline(e.target.value);
      if(e.target.id==='studioImport')this.importProject(e.target.files[0]);
      if(e.target.id==='studioLayerFile')this.addLayers(e.target.files);
      if(e.target.id==='studioDraftBase'){
        const draft=this.project.drafts[this.draftKind] ??= {includeBase:true,layers:[]};
        draft.includeBase=e.target.checked;
        this.stopDraft();
        this.markChanged();
        this.render();
      }
      if(e.target.dataset.layerField){
        const field=e.target.dataset.layerField;
        const layer=this.project.drafts[this.draftKind].layers.find(item=>item.id===e.target.closest('[data-layer]').dataset.layer);
        layer[field]=Math.max(0,Math.min(Number(e.target.max),Number(e.target.value)||0));
        e.target.value=layer[field];
        this.stopDraft();
        this.markChanged();
        const layerClip=e.target.closest('[data-layer]').querySelector('.studio-layer-clip');
        layerClip.style.left=layer.beat*this.beatWidth+'px';
        this.waveformsReady=this.renderWaveforms();
      }
      if(e.target.id==='studioSnap'){this.project.snap=e.target.value;this.markChanged();}
      if(e.target.id==='studioSeek'){
        const resume=!!this.previewContext && !this.previewPaused;
        this.seek(Number(e.target.value));
        if(resume)this.playTimeline();
      }
    });
    this.panel.addEventListener('input',e=>{
      if(e.target.id==='studioScrubber'){
        this.resumeAfterScrub ||= !!this.previewContext && !this.previewPaused;
        this.seek(Number(e.target.value), false);
      }
      if(e.target.id==='studioMusicVolume'||e.target.id==='studioEffectVolume'){
        const key=e.target.id==='studioMusicVolume'?'musicVolume':'effectVolume';
        this.project[key]=Number(e.target.value);
        if(key==='musicVolume')this.panel.querySelector('.studio-track-volume[data-kind="music"]').value=e.target.value;
        this.markChanged();
      }
      if(e.target.matches('.studio-track-volume')){
        const kind=e.target.dataset.kind;
        if(kind==='music'){
          this.project.musicVolume=Number(e.target.value);
          this.panel.querySelector('#studioMusicVolume').value=e.target.value;
          this.markChanged();return;
        }
        this.project.trackVolumes[kind]=Number(e.target.value);
        const engine=this.getSoundtrack();
        if(engine?.kindGains[kind])engine.kindGains[kind].gain.value=this.project.trackVolumes[kind];
        if(this.previewEngine?.kindGains[kind])this.previewEngine.kindGains[kind].gain.value=this.project.trackVolumes[kind];
        this.markChanged();
      }
    });
    this.panel.addEventListener('change',e=>{
      if(e.target.id==='studioScrubber' && this.resumeAfterScrub){
        this.resumeAfterScrub=false;
        this.playTimeline();
      }
    });
    this.panel.addEventListener('dragover',e=>{
      if(e.dataTransfer.types.includes('Files'))e.preventDefault();
    });
    this.panel.addEventListener('drop',e=>{
      const track=e.target.closest('.studio-track');
      if(track){e.preventDefault();this.importAudio(track.dataset.kind,e.dataTransfer.files[0]);}
      else if(e.target.closest('.studio-draft')){e.preventDefault();this.addLayers(e.dataTransfer.files);}
      else {e.preventDefault();this.addCustomFiles(e.dataTransfer.files);}
    });
    this.panel.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      const handle=e.target.closest('[data-trim-edge]');
      if(handle){
        e.preventDefault();
        const {trimKind:kind,trimEdge:edge}=handle.dataset;
        const view=handle.closest('.studio-trim-view');
        const clip=handle.closest('button') ?? handle.parentElement;
        if(!view)this.editTarget=clip.matches('.studio-clip,.studio-music-clip,[data-layer-wave],[data-base-wave]')
          ? this.clipEditTarget(clip) : kind.startsWith('mix:') ? {kind:kind.slice(4),source:kind} : {kind};
        const {first,last,rate}=this.trimFrames(kind);
        const duration=this.originalBuffer(kind).duration;
        const pitch=Number(clip.dataset.pitch)||1;
        this.trimDrag={kind,edge,clip,view,duration,pitch,initial:(edge==='start'?first:last)/rate,
          first:first/rate,target:this.editTarget,position:this.editTarget?this.editPosition(this.editTarget):null,
          left:parseFloat(clip.style.left)||0,
          secondsPerPixel:view?duration/view.clientWidth:BEAT*pitch/this.beatWidth,x:e.clientX,pointerId:e.pointerId};
        if(!view){
          const wave=clip.querySelector('.studio-waveform');
          if(wave){wave.style.width=wave.getBoundingClientRect().width+'px';wave.style.maxWidth='none';}
        }
        handle.setPointerCapture(e.pointerId);
        return;
      }
      const layerClip=e.target.closest('[data-layer-wave],[data-base-wave]');
      if(layerClip){
        e.preventDefault();
        layerClip.focus({preventScroll:true});
        this.editTarget=this.clipEditTarget(layerClip);
        this.selectedClip=null;this.updateSelection();
        const {layer}=this.editTarget;
        this.layerDrag={clip:layerClip,target:this.editTarget,initial:this.editPosition(this.editTarget),x:e.clientX,pointerId:e.pointerId};
        layerClip.setPointerCapture(e.pointerId);
        return;
      }
      const draftRuler=e.target.closest('.studio-draft-ruler .studio-layer-rail');
      if(draftRuler){
        e.preventDefault();
        this.childRulerDrag={ruler:draftRuler,pointerId:e.pointerId,resume:!!this.draftContext && !this.draftPaused};
        this.stopDraft();
        draftRuler.setPointerCapture(e.pointerId);
        this.seekDraft(e);
        return;
      }
      const ruler=e.target.closest('.studio-ruler');
      if(ruler && !e.target.closest('.studio-ruler-label')){
        e.preventDefault();
        this.rulerDrag={ruler,pointerId:e.pointerId,resume:!!this.previewContext && !this.previewPaused};
        ruler.setPointerCapture(e.pointerId);
        this.moveRuler(e);
        return;
      }
      const clip=e.target.closest('.studio-clip,.studio-music-clip');if(!clip)return;
      e.preventDefault();
      clip.focus({preventScroll:true});
      const id=clip.dataset.id;
      this.selectedClip=id || null;
      const target=this.editTarget=this.clipEditTarget(clip);
      this.updateSelection();
      this.drag={clip,target,initial:this.editPosition(target),x:e.clientX,pointerId:e.pointerId};
      clip.setPointerCapture(e.pointerId);
    });
    this.panel.addEventListener('dblclick',e=>{
      if(e.target.closest('[data-trim-edge]'))return;
      const track=e.target.closest('.studio-clip')?.closest('.studio-track');
      if(track)this.openDraft(track.dataset.kind);
    });
    this.panel.addEventListener('keydown',e=>{
      if (e.target.closest('input,select,textarea')) return;
      const clip=e.target.closest('.studio-clip,.studio-music-clip,[data-layer-wave],[data-base-wave]');
      if(clip && ['ArrowLeft','ArrowRight'].includes(e.key)){
        e.preventDefault();
        const target=this.editTarget=this.clipEditTarget(clip);
        const delta=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.01:.001);
        this.moveClip(target,Number((this.editPosition(target)+delta).toFixed(6)));
        const selector=target.base ? '[data-base-wave]' : target.layer ? '[data-layer-wave="'+target.kind+'"]'
          : target.kind==='music' ? '[data-music]' : '.studio-clip[data-id="'+target.id+'"]';
        this.panel.querySelector(selector)?.focus({preventScroll:true});
        return;
      }
      if (clip && e.key==='Enter'){
        e.preventDefault();
        this.selectedClip=clip.dataset.id ?? null;
        this.editTarget=this.clipEditTarget(clip);
        this.updateSelection();
        this.updateClipEditor();
      }
      if(clip && ['Delete','Backspace'].includes(e.key)){
        this.editTarget=this.clipEditTarget(clip);
        this.selectedClip=clip.dataset.id ?? null;
      }
      if ((this.selectedClip || this.editTarget?.layer || this.editTarget?.kind==='music') && ['Delete','Backspace'].includes(e.key)){
        e.preventDefault();
        this.deleteClip();
      }
    });
    document.addEventListener('keydown',e=>{
      if(!this.panel.hidden && (e.metaKey || e.ctrlKey) && ['s','z','y'].includes(e.key.toLowerCase())){
        const key=e.key.toLowerCase();
        if(key!=='s' && e.target.closest('input,textarea,[contenteditable]'))return;
        e.preventDefault(); e.stopPropagation();
        if(e.repeat)return;
        if(key==='s')this.saveProject();
        else this.restoreHistory(key==='y' || e.shiftKey);
        return;
      }
      if(this.panel.hidden || e.code!=='Space' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey
        || e.target.closest('input,select,textarea,[contenteditable]')) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.repeat)return;
      if(this.draftKind && (this.draftContext || e.target.closest('.studio-draft') || (!this.previewContext && !e.target.closest('.studio-scroll,.studio-transport'))))
        this.toggleDraft();
      else this.toggleTimeline();
    },true);
    this.panel.addEventListener('pointermove',e=>{
      if(this.childRulerDrag?.pointerId===e.pointerId){this.seekDraft(e);return;}
      if(this.trimDrag?.pointerId===e.pointerId){
        const drag=this.trimDrag;
        const seconds=drag.initial+(e.clientX-drag.x)*drag.secondsPerPixel;
        drag.range=this.trimEdge(drag.kind,drag.edge,seconds);
        if(drag.view){
          drag.clip.style.left=100*drag.range.start/drag.duration+'%';
          drag.clip.style.width=100*(drag.range.end-drag.range.start)/drag.duration+'%';
        } else {
          const delta=(drag.range.start-drag.first)/BEAT/drag.pitch;
          if(drag.position!==null){
            drag.positionNext=this.boundPosition(drag.target,drag.position+delta);
            drag.range.start=drag.first+(drag.positionNext-drag.position)*BEAT*drag.pitch;
            drag.clip.style.left=(drag.left+(drag.positionNext-drag.position)*this.beatWidth)+'px';
          }
          drag.clip.style.width=Math.max(1,(drag.range.end-drag.range.start)/BEAT*this.beatWidth/drag.pitch)+'px';
          const wave=drag.clip.querySelector('.studio-waveform');
          if(wave)wave.style.left=-(drag.range.start-drag.first)/BEAT*this.beatWidth/drag.pitch+'px';
        }
        const input=this.panel.querySelector(drag.edge==='start'?'#studioTrimStart':'#studioTrimEnd');
        if(input)input.value=Number(drag.range[drag.edge].toFixed(6));
        return;
      }
      if(this.layerDrag?.pointerId===e.pointerId){
        const drag=this.layerDrag;
        if(drag.value===undefined && Math.abs(e.clientX-drag.x)<3)return;
        const position=drag.initial+(e.clientX-drag.x)/this.beatWidth;
        drag.value=Math.max(0,Math.min(32,e.altKey?position:this.snapBeat(position)));
        drag.clip.style.left=drag.value*this.beatWidth+'px';
        const input=drag.clip.closest('[data-layer]')?.querySelector('[data-layer-field="beat"]');
        if(input)input.value=drag.value;
        return;
      }
      if(this.rulerDrag?.pointerId===e.pointerId){this.moveRuler(e);return;}
      if(this.drag?.pointerId!==e.pointerId)return;
      const d=this.drag;
      if(d.value===undefined && Math.abs(e.clientX-d.x)<3)return;
      const position=d.initial+(e.clientX-d.x)/this.beatWidth;
      const value=this.boundPosition(d.target,e.altKey?position:this.snapBeat(position));
      d.value=value;
      d.clip.style.left=(this.labelWidth+value*this.beatWidth)+'px';
      d.clip.title=value.toFixed(3)+' 拍';
    });
    this.panel.addEventListener('pointerup',e=>{
      if(this.childRulerDrag?.pointerId===e.pointerId){
        const resume=this.childRulerDrag.resume; this.childRulerDrag=null;
        if(resume)this.toggleDraft();
        return;
      }
      if(this.trimDrag?.pointerId===e.pointerId){
        const {kind,range,target,positionNext}=this.trimDrag;
        this.trimDrag=null;
        if(range)this.setTrim(kind,range,target,positionNext);
        else this.updateClipEditor();
        return;
      }
      if(this.layerDrag?.pointerId===e.pointerId){
        const drag=this.layerDrag;
        this.layerDrag=null;
        if(drag.value!==undefined)this.moveClip(drag.target,drag.value);
        else this.updateClipEditor();
        return;
      }
      if(this.rulerDrag?.pointerId===e.pointerId){
        const {resume}=this.rulerDrag;
        this.rulerDrag=null;
        if(resume)this.playTimeline();
        return;
      }
      if(this.drag?.pointerId!==e.pointerId)return;
      const d=this.drag;this.drag=null;
      if(d.value===undefined){this.updateClipEditor();return;}
      this.moveClip(d.target,d.value);
    });
    this.panel.addEventListener('pointercancel',()=>{
      this.rulerDrag=null;
      this.childRulerDrag=null;
      this.drag=null;
      this.layerDrag=null;
      this.trimDrag=null;
      this.render();
    });
  }
  async addCustomFiles(files) {
    for(const file of Array.from(files))await this.addCustom(file);
  }
  seekDraft(e) {
    const rail=this.childRulerDrag.ruler;
    const buffer=this.audioBuffer('mix:'+this.draftKind);
    this.draftAt=Math.max(0,Math.min(buffer?.duration ?? 0,
      (e.clientX-rail.getBoundingClientRect().left)/this.beatWidth*BEAT));
    this.updatePreviewControls();
  }
  snapBeat(t) {
    const step=this.project.snap==='quarter'?.25:this.project.snap==='third'?1/3:0;
    return step ? Math.round(t/step)*step : t;
  }
  moveRuler(e) {
    const x=e.clientX-this.rulerDrag.ruler.getBoundingClientRect().left-this.labelWidth;
    this.seek(x/this.beatWidth,false,false);
  }
  async preview(kind) {
    const context=new (window.AudioContext||window.webkitAudioContext)();
    await context.resume();
    const buffer=this.audioBuffer(kind);
    if(kind==='music'){
      if(buffer){const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();source.stop(context.currentTime+Math.min(4,buffer.duration));}
      else {const engine=new KitchenSoundtrack(context,context.destination);const start=context.currentTime;const timer=setInterval(()=>{const t=context.currentTime-start;engine.tick(t);if(t>3){clearInterval(timer);engine.stop(t);context.close();}},30);return;}
    } else {const engine=new KitchenSoundtrack(context,context.destination);engine.editor=this;engine.effect(kind,context.currentTime+.01);}
    const layers = this.project.drafts[kind]?.layers ?? [];
    const seconds = kind==='music'?4.5:Math.max(4.5, buffer?.duration ?? 0,
      ...layers.map(layer => layer.beat * BEAT + (this.audioBuffer(layer.id)?.duration ?? 0)));
    setTimeout(()=>context.close(), (seconds+.1)*1000);
  }
  async exportBuiltin(kind) {
    if(kind.startsWith('custom-'))return;
    const sampleRate=44100, duration=kind==='music'?8*BEAT:1;
    const context=new OfflineAudioContext(1,Math.ceil(sampleRate*duration),sampleRate);
    const engine=new KitchenSoundtrack(context,context.destination);
    if(kind==='music')for(let step=0;step<16;step++)engine.musicBeat(step,.01+step*BEAT/2);
    else engine.effect(kind,.01);
    const rendered=await context.startRendering();
    const samples=rendered.getChannelData(0);
    const bytes=new ArrayBuffer(44+samples.length*2), view=new DataView(bytes);
    const word=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    word(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);word(8,'WAVEfmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
    view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');
    view.setUint32(40,samples.length*2,true);
    for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
    const blob=new Blob([bytes],{type:'audio/wav'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);
    link.download=kind+'.wav';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    this.message('已导出 '+kind+'.wav；可再拖回轨道替换内置声音。');
  }
  seek(t, snap = true, scrollToPosition = true) {
    this.stopTimeline(false);
    this.previewAt=Math.max(0,Math.min(this.duration,snap?this.snapBeat(t):t));
    this.updateTransport();
    const scroll=this.panel.querySelector('.studio-scroll');
    if(scroll && scrollToPosition)scroll.scrollLeft=Math.max(0,this.labelWidth+this.previewAt*this.beatWidth-scroll.clientWidth*.45);
  }
  updateTransport() {
    this.updatePlayhead(this.previewAt);
    this.panel.querySelector('#studioTime').textContent=this.previewAt.toFixed(2)+' / '+this.duration+' 拍';
    this.panel.querySelector('#studioScrubber').value=this.previewAt;
    const input=this.panel.querySelector('#studioSeek');
    if(document.activeElement!==input || !this.previewEngine)input.value=this.previewAt.toFixed(2);
  }
  updatePreviewControls() {
    const main=this.panel.querySelector('#studioPlay');
    main.textContent=this.previewContext && !this.previewPaused ? 'Ⅱ 暂停' : '▶ 从此处试听';
    const draft=this.panel.querySelector('#studioDraftPlay');
    if(draft)draft.textContent=this.draftContext && !this.draftPaused ? 'Ⅱ 暂停组合' : '▶ 试听组合';
    const head=this.panel.querySelector('#studioDraftPlayhead');
    if(head)head.style.left='calc(var(--draft-label) + '+this.draftAt/BEAT*this.beatWidth+'px)';
    const output=this.panel.querySelector('#studioDraftTime');
    if(output)output.textContent=(this.draftAt/BEAT).toFixed(2)+' 拍';
  }
  toggleTimeline() {
    if(!this.previewContext || !this.previewEngine){
      if(this.previewContext)this.stopTimeline();
      else this.playTimeline();
      return;
    }
    this.previewPaused=!this.previewPaused;
    this.previewContext[this.previewPaused?'suspend':'resume']().catch(()=>{});
    this.updatePreviewControls();
  }
  async playTimeline() {
    if(this.previewAt>=this.duration)this.previewAt=0;
    const from=this.previewAt*BEAT;
    this.stopTimeline(false);
    const context=new (window.AudioContext||window.webkitAudioContext)();
    this.previewContext=context;
    this.updatePreviewControls();
    try {
      await context.resume();
      await this.ready;
      await this.waveformsReady;
    } catch {
      if (this.previewContext===context) {
        this.stopTimeline();
        this.message('试听未能启动，请再点一次播放。');
      }
      return;
    }
    if(this.previewContext!==context)return;
    const engine=new KitchenSoundtrack(context,context.destination);
    engine.editor=this;
    engine.reset(this.groups,this.chart,true);
    for(const clip of this.dynamicEvents){
      if(this.isClipDeleted(clip.id))continue;
      const start=clip.noteBeat*BEAT+this.hitOffset(clip.kind,(clip.t-clip.noteBeat)*BEAT,clip.id);
      const note=this.chart[Number(clip.id.slice(3))];
      const count=1;
      for(let i=0;i<count;i++)engine.add(start+i*.045,clip.kind,1+i*.05);
    }
    for(const event of engine.events)if(event.t<from-.001)event.scheduled=true;
    this.previewEngine=engine;
    const audioStart=context.currentTime;
    const frame=()=>{
      if(this.previewEngine!==engine)return;
      if(this.previewPaused){this.previewFrame=requestAnimationFrame(frame);return;}
      const t=from+context.currentTime-audioStart;
      this.previewAt=Math.min(this.duration,t/BEAT);
      engine.tick(t);
      this.updateTransport();
      const scroll=this.panel.querySelector('.studio-scroll');
      const x=this.labelWidth+this.previewAt*this.beatWidth;
      if(scroll && x>scroll.scrollLeft+scroll.clientWidth-75)scroll.scrollLeft=x-scroll.clientWidth*.65;
      if(this.previewAt>=this.duration){this.stopTimeline();return;}
      this.previewFrame=requestAnimationFrame(frame);
    };
    frame();
  }
  stopTimeline(update=true) {
    this.stopDraft();
    if(this.previewFrame)cancelAnimationFrame(this.previewFrame);
    if(this.previewEngine){this.previewEngine.stop(this.previewAt*BEAT);this.previewEngine=null;}
    if(this.previewContext){this.previewContext.close().catch(()=>{});this.previewContext=null;}
    this.previewPaused=false;
    this.updatePreviewControls();
    if(update)this.updatePlayhead(this.previewAt);
  }
  async toggleDraft() {
    if (this.draftContext) {
      if (!this.draftSource){this.stopDraft();return;}
      this.draftPaused=!this.draftPaused;
      this.draftContext[this.draftPaused?'suspend':'resume']().catch(()=>{});
      this.updatePreviewControls();
      return;
    }
    const kind=this.draftKind;
    this.stopTimeline();
    const context=new (window.AudioContext||window.webkitAudioContext)();
    this.draftContext=context;
    this.updatePreviewControls();
    try {
      await context.resume();
      await this.waveformsReady;
      const buffer=this.audioBuffer('mix:'+kind);
      if(this.draftContext!==context)return;
      if(!buffer){this.stopDraft();return;}
      if(this.draftAt>=buffer.duration)this.draftAt=0;
      const source=context.createBufferSource();
      source.buffer=buffer;
      source.connect(context.destination);
      this.draftSource=source;
      const origin=context.currentTime-this.draftAt;
      source.start(0,this.draftAt);
      source.onended=()=>{
        if(this.draftSource===source){this.draftAt=0;this.stopDraft();}
      };
      const frame=()=>{
        if(this.draftSource!==source)return;
        if(!this.draftPaused){
          this.draftAt=Math.min(buffer.duration,context.currentTime-origin);
          this.updatePreviewControls();
        }
        this.draftFrame=requestAnimationFrame(frame);
      };
      frame();
    } catch {
      if(this.draftContext===context){this.stopDraft();this.message('组合试听未能启动。');}
    }
  }
  stopDraft() {
    if(!this.draftContext)return;
    cancelAnimationFrame(this.draftFrame);
    this.draftSource=null;
    this.draftContext.close().catch(()=>{});
    this.draftContext=null;
    this.draftPaused=false;
    this.updatePreviewControls();
  }
  async exportProject() {
    const files={};
    for(const [kind,record] of Object.entries(this.files)) files[kind]=await this.packFile(record);
    const blob=new Blob([JSON.stringify({version:1,project:this.project,files})],{type:'application/json'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='321-serve-rice-actions-20261124-audio-project.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    this.message('工程已导出，包含当前音频文件和时间调整。');
  }
  async importProject(file) {
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(data.version!==1||!data.project||!data.files)throw Error('format');
      const project = data.project;
      const isNumber = value => typeof value === 'number' && Number.isFinite(value);
      const validValues = values => !values || Object.values(values).every(isNumber);
      const validId = (id, prefix) => typeof id === 'string' && id.startsWith(prefix)
        && /^[a-z0-9-]+$/.test(id);
      if (!validValues(project.positions) || !validValues(project.hitOffsets) || !validValues(project.trackVolumes)
          || !Object.values(project.trims ?? {}).every(range=>isNumber(range?.start) && isNumber(range?.end)
            && range.start>=0 && range.end>range.start)
          || !['musicStart','musicVolume','effectVolume'].every(key => project[key]===undefined || isNumber(project[key]))
          || !(project.custom ?? []).every(item => validId(item.id,'custom-') && typeof item.name==='string' && isNumber(item.t))
          || !Object.values(project.drafts ?? {}).every(draft => Array.isArray(draft.layers)
            && (draft.baseBeat===undefined || (isNumber(draft.baseBeat) && draft.baseBeat>=0 && draft.baseBeat<=32))
            && draft.layers.every(layer => validId(layer.id,'layer-') && typeof layer.name==='string'
              && isNumber(layer.beat) && layer.beat>=0 && isNumber(layer.volume) && layer.volume>=0))) throw Error('format');
      const tracks = [...this.baseTracks,...(project.custom ?? []).map(item=>[item.id,item.name])];
      const keys = new Set(tracks.map(([kind])=>kind));
      for (const draft of Object.values(project.drafts ?? {}))
        for (const layer of draft.layers) keys.add(layer.id);
      const context = new OfflineAudioContext(1,1,44100);
      const imported = await Promise.all(Object.entries(data.files).filter(([kind])=>keys.has(kind)).map(async ([kind,value])=>{
        const record = this.unpackFile(value);
        const buffer = await context.decodeAudioData(await record.blob.arrayBuffer());
        return {kind,record,buffer};
      }));
      await this.ready;
      this.stopTimeline();
      this.project={...this.project,drafts:{},deletedTracks:[],deletedClips:[],...data.project};
      this.project.deletedTracks = Array.isArray(project.deletedTracks) ? project.deletedTracks : [];
      this.project.deletedClips = Array.isArray(project.deletedClips) ? project.deletedClips : [];
      this.project.drafts = project.drafts ?? {};
      this.project.custom = project.custom ?? [];
      this.project.positions = project.positions ?? {};
      this.project.hitOffsets = project.hitOffsets ?? {};
      this.project.trackVolumes = project.trackVolumes ?? {};
      this.project.trims = {...project.trims};
      this.tracks=tracks;
      this.draftKind=null;
      this.selectedClip=null;
      this.editTarget=null;
      this.trimmedBuffers.clear();
      this.mixedBuffers.clear();
      const importedKeys = new Set(imported.map(({kind})=>kind));
      for (const kind of Object.keys(this.files))
        if (!importedKeys.has(kind)) this.forgetFile(kind);
      for(const {kind,record,buffer} of imported){
        this.files[kind] = record;
        this.buffers[kind] = buffer;
      }
      this.getSoundtrack()?.clearMusicSource();
      this.markChanged();
      this.render();
      this.message('工程已导入。点击「保存」保留这个版本。');
    }catch{this.message('工程文件无效，未能导入。');}
  }
  updatePlayhead(t) {
    if(this.panel.hidden)return;
    if(this.previewEngine)t=this.previewAt;
    const line=this.panel.querySelector('#studioPlayhead');
    if(line)line.style.left=(this.labelWidth+t*this.beatWidth)+'px';
  }
}
