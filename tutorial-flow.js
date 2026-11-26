(function(){
'use strict';
const el=id=>document.getElementById(id),base='assets/ui/elements/tutorial/rice-rice-baby/';
const screen=el('tutorial'),card=el('tutorialCard'),turn=el('tutorialTurn'),retry=el('tutorialRetry'),button=el('tutorialContinue'),count=el('tutorialCount');
const descriptions=[
 'Regular rice. Listen to the machine. Wait for the rice to land. Shape it on the first cue, then send it away. Shape key, then send key.',
 'Triple rice. Red light and smoke: three portions are coming. Shape them from right to left, then send them away. Three shape keys, then send key.',
 'Bouncing rice. Listen to the bounces. Wait for the rice to settle. Then shape it and send it away on the sound cues.',
 'Watch the sponge. Listen for the squeeze and splat. Send the sponge away on the cue. Do not shape it.'
];
let token=0,frame=0,stage='intro',cleanTimer=()=>{};
function cancel(){token++;cancelAnimationFrame(frame);cleanTimer();}
function panel(next){
 cancel();
 if(state==='playing')soundtrack.stop(time());
 state=next==='count-in'?'count-in':'tutorial';stage=next;
 screen.dataset.stage=next;screen.hidden=false;canvas.inert=true;
 for(const id of ['overlay','levelSelect','emptyLevel','modal','settings','quitDialog','results','judgmentLayer','beatHud','pause','gameInfo','progressTrack'])el(id).hidden=true;
 card.hidden=true;turn.hidden=true;retry.hidden=true;button.hidden=true;count.hidden=true;
 el('skipTutorial').hidden=next==='count-in'||next==='complete';
}
function action(name,label,handler){
 button.querySelector('img').src=base+name+'.svg';button.querySelector('img').alt=label;
 button.setAttribute('aria-label',label);button.onclick=handler;button.disabled=false;button.hidden=false;button.focus();
}
function intro(){
 panel('intro');card.src=base+'intro-card.svg';card.alt='Rice Rice Baby. Shape the rice. Send it away. Follow the rhythm. Watch each pattern, then try it yourself. Shape with the A key or the left side of the screen. Send away with the D key or the right side.';card.hidden=false;
 el('status').textContent='Learn four patterns. Watch first, then try.';
 action('continue-button','Continue to the first lesson',()=>start());
}
function explain(index){
 panel('explain');lessonIndex=index;
 card.src=base+'lesson-'+(index+1)+'-card.svg';card.alt=descriptions[index];card.hidden=false;
 el('status').textContent='LESSON '+(index+1)+'/4 · '+lessons[index].title;
 action('watch-demo-button','Watch demonstration',async()=>{
  const current=token;button.disabled=true;
  if(!await prepareAudio()){if(current===token)button.disabled=false;return;}
  if(current!==token)return;
  studio.stopTimeline();beginRound('demo',index);
 });
}
// Count only visible time; a backgrounded tab must not skip the turn cue or count-in.
function timed(duration,paint,done){
 const current=token;let elapsed=0,last=performance.now();paint(0);
 const resetVisibleClock=()=>{last=performance.now();};
 document.addEventListener('visibilitychange',resetVisibleClock);
 cleanTimer=()=>document.removeEventListener('visibilitychange',resetVisibleClock);
 function tick(now){
  if(current!==token)return;
  if(!document.hidden && el('settings').hidden)elapsed+=now-last;
  last=now;
  if(elapsed>=duration){cleanTimer();done();return;}
  paint(elapsed);frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);
}
function yourTurn(index,again=false){
 panel('turn');turn.hidden=false;retry.hidden=!again;
 el('status').textContent=again?'Try again. Follow the sound cues.':'Now it’s your turn!';
 timed(1400,()=>{},async()=>{
  const current=token;
  if(await prepareAudio()){if(current===token)beginRound('practice',index);}
  else if(current===token)action('continue-button','Start practice',()=>yourTurn(index,again));
 });
}
function complete(){
 panel('complete');card.src=base+'tutorial-complete-card.svg';card.alt='Ready to serve! All four patterns complete. Listen closely. The full level is next.';card.hidden=false;
 el('status').textContent='Tutorial complete. Ready to serve!';
 action('continue-button','Continue to the full level',()=>start('level'));
}
function countIn(){
 panel('count-in');soundtrack.stop(0);count.hidden=false;
 const images=[base+'countdown-3.svg',base+'countdown-2.svg',base+'countdown-1.svg',base+'countdown-go-red.svg'];
 let shown=-1;
 timed(3200,elapsed=>{
  const index=Math.min(3,Math.floor(elapsed/800));if(index===shown)return;shown=index;
  count.src=images[index]+'?v=rice-ui-2';count.alt=['3','2','1','GO!'][index];screen.dataset.count=count.alt;el('status').textContent=count.alt;
 },async()=>{
  const current=token;
  if(await prepareAudio()){if(current===token)beginRound('level');}
  else if(current===token)complete();
 });
}
window.tutorialFlow={intro,explain,turn:yourTurn,complete,countIn,cancel,get stage(){return stage;}};
})();
