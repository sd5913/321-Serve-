(function(){
'use strict';
const el=id=>document.getElementById(id),menu=el('levelSelect'),empty=el('emptyLevel'),carousel=el('levelCarousel');
const base='assets/ui/level-select/';
const levels=[{name:'Rice Rice Baby',color:'#87DCB0'},{name:'Catch Me If You Can',color:'#357CFF'},{name:'Sashimi, Baby!',color:'#FF786E'},{name:'Grill Me Maybe',color:'#FDE880'}];
const cards=Array.from(menu.querySelectorAll('.level-card')),dots=Array.from(menu.querySelectorAll('[data-level-dot]'));
let selected=0,drag=null,suppressClickUntil=0;
function render(delta=0){
 const step=carousel.clientWidth*.265;
 cards.forEach((card,i)=>{const d=i-selected,active=d===0;card.style.transform=`translate(calc(-50% + ${d*step+delta}px),-50%) scale(${active?1:288/358.1880188}) rotate(${active?-1.068:-1.945}deg)`;card.style.opacity=Math.abs(d)>1?'0':'1';card.style.pointerEvents=Math.abs(d)>1?'none':'auto';card.style.zIndex=String(4-Math.abs(d));card.tabIndex=Math.abs(d)>1?-1:0;card.setAttribute('aria-pressed',String(active));});
 dots.forEach((dot,i)=>{dot.setAttribute('aria-pressed',String(i===selected));});
 const title=el('selectedLevelTitle');title.src=base+`title-${selected+1}.svg`;title.alt=levels[selected].name;title.parentElement.style.setProperty('--title-width',selected===1?'64%':'48%');
 menu.dataset.level=String(selected+1);menu.setAttribute('aria-label','Select a level: '+levels[selected].name);el('previousLevel').disabled=selected===0;el('nextLevel').disabled=selected===3;el('playLevel').setAttribute('aria-label','Start '+levels[selected].name);
}
function select(index){selected=Math.max(0,Math.min(3,index));render();}
function showLevels(){
 if(!['ready','level-select','empty-level'].includes(state))return;
 goHome();state='level-select';el('overlay').hidden=true;empty.hidden=true;menu.hidden=false;canvas.inert=true;
 el('status').textContent='Choose a level. Swipe left or right.';cards.forEach(c=>c.style.transition='none');render();requestAnimationFrame(()=>cards.forEach(c=>c.style.transition=''));el('playLevel').focus();
}
function home(){menu.hidden=true;empty.hidden=true;goHome();}
function play(){
 if(state!=='level-select'||!el('settings').hidden)return;
 menu.hidden=true;
 if(selected===0){state='ready';showTutorial();return;}
 state='empty-level';empty.hidden=false;empty.setAttribute('aria-label',levels[selected].name);canvas.inert=true;el('status').textContent=levels[selected].name;el('emptyBack').focus();
}
el('start').onclick=showLevels;el('playLevel').onclick=play;el('levelBack').onclick=home;el('emptyBack').onclick=showLevels;
el('levelSettings').onclick=openSettings;
const oldSettingsBack=el('settingsBack').onclick;el('settingsBack').onclick=()=>{oldSettingsBack();if(state==='level-select')el('levelSettings').focus();};
el('previousLevel').onclick=()=>select(selected-1);el('nextLevel').onclick=()=>select(selected+1);
cards.forEach((card,i)=>card.onclick=()=>{if(performance.now()>=suppressClickUntil)select(i);});
dots.forEach((dot,i)=>dot.onclick=()=>select(i));
document.addEventListener('keydown',e=>{
 if(e.target.matches('input')||!el('settings').hidden)return;
 if(state==='ready'&&['KeyA','KeyD','Space'].includes(e.code)&&!e.repeat&&!(e.code==='Space'&&e.target.closest('button'))){e.preventDefault();e.stopImmediatePropagation();showLevels();return;}
 if(state==='level-select'){
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();select(selected+(e.code==='ArrowRight'?1:-1));}
  else if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();home();}
  else if(['Enter','Space'].includes(e.code)&&!e.target.closest('button')){e.preventDefault();e.stopImmediatePropagation();play();}
 }else if(state==='empty-level'&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();showLevels();}
},true);
carousel.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.level-arrow'))return;drag={x:e.clientX,id:e.pointerId,moved:false};});
carousel.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>8){if(!drag.moved){drag.moved=true;carousel.setPointerCapture(e.pointerId);}cards.forEach(c=>c.style.transition='none');render(dx*.7);}});
function endDrag(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,moved=drag.moved;drag=null;cards.forEach(c=>c.style.transition='');if(moved){suppressClickUntil=performance.now()+300;select(selected+(Math.abs(dx)>carousel.clientWidth*.045?(dx<0?1:-1):0));}else render();}
window.addEventListener('pointerup',endDrag);carousel.addEventListener('pointercancel',()=>{drag=null;cards.forEach(c=>c.style.transition='');render();});
new ResizeObserver(()=>{if(!menu.hidden)render();}).observe(carousel);
})();
