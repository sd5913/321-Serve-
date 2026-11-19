// UI-only output volume buses. Original synthesis, scheduling and event data stay intact.
function bindUIAudio(track,context,master){
 const music=context.createGain(),sfx=context.createGain();
 music.gain.value=Number(document.getElementById('musicVolume').value)/100;
 sfx.gain.value=Number(document.getElementById('sfxVolume').value)/100;
 music.connect(master);sfx.connect(master);track.output=music;
 track.uiMusicGain=music;track.uiSfxGain=sfx;
 const effect=track.effect;
 track.effect=function(...args){const output=this.output;this.output=sfx;try{return effect.apply(this,args);}finally{this.output=output;}};
}
