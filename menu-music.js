(function(){
'use strict';
const track=document.getElementById('menuMusic'),volume=document.getElementById('musicVolume');
const MENU_GAIN=.45;let pending=false,request=0;
function allowed(){return !document.hidden&&['loading','ready','level-select'].includes(state);}
function pause(){request++;pending=false;track.pause();track.dataset.playback='paused';}
function sync(){
 track.volume=MENU_GAIN*Math.max(0,Math.min(1,Number(volume.value)/100));
 track.muted=muted||track.volume===0;
 if(!allowed()||track.muted){if(!track.paused||pending)pause();return;}
 if(!track.paused||pending)return;
 const current=++request;pending=true;
 const result=track.play();
 if(result&&typeof result.then==='function')result.then(()=>{
  if(current===request)pending=false;
  if(!allowed()||muted){pause();return;}
  track.dataset.playback='playing';
 }).catch(error=>{
  if(current!==request)return;
  pending=false;
  track.dataset.playback=error.name==='NotAllowedError'?'blocked':'paused';
 });else pending=false;
}
// Retry in a real user gesture when the browser blocks initial audible autoplay.
function gesture(event){
 if(event.type==='keydown'&&(event.repeat||event.ctrlKey||event.metaKey||event.altKey))return;
 if(event.target.closest&&event.target.closest('#playLevel')){pause();return;}
 sync();
}
document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
document.addEventListener('keydown',gesture,true);
document.getElementById('playLevel').addEventListener('click',pause,true);
document.getElementById('sound').addEventListener('click',sync);
volume.addEventListener('input',sync);
document.addEventListener('visibilitychange',sync);
window.addEventListener('pageshow',sync);window.addEventListener('pagehide',pause);
const observer=new MutationObserver(sync);
for(const id of ['overlay','levelSelect','tutorial','emptyLevel','results'])observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['hidden']});
track.addEventListener('play',()=>{if(!allowed()||muted)pause();});
track.addEventListener('canplay',sync);
window.ServeMenuMusic=Object.freeze({sync,pause,allowed});
sync();
})();
