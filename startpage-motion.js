(function(){
 'use strict';
 const canvas=document.getElementById('startMotion'),ctx=canvas.getContext('2d');
 const names=['background','salmon-red','egg','salmon-orange','clock-hands','accent'];
 const images={};let origin=null,lastDraw=-Infinity;
 const overlay=document.getElementById('overlay');
 const motionControl=document.getElementById('motion');
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let size;
 new ResizeObserver(([entry])=>{size=entry.contentRect;lastDraw=-Infinity;}).observe(canvas);
 const bounce=p=>p>=0&&p<1?Math.sin(p*Math.PI)*Math.exp(-p*1.8):0;
 Promise.all(names.map(name=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[name]=img;resolve();};img.onerror=reject;img.src='assets/ui/startpage-motion/'+name+'.png';}))).then(()=>requestAnimationFrame(frame)).catch(()=>{/* Keep the static artwork fallback if a layer cannot load. */});
 function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||overlay.hidden){origin=null;lastDraw=-Infinity;return;}
  if(!size || size.width<=0 || size.height<=0 || now-lastDraw<32)return;
  lastDraw=now;
  if(origin===null)origin=now;
  const scale=Math.min(window.devicePixelRatio||1,2,640/size.width,800/size.height);
  const w=Math.max(1,Math.round(size.width*scale)),h=Math.max(1,Math.round(size.height*scale));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(w/(1104*.39),0,0,h/512,0,0);ctx.clearRect(0,0,1104*.39,512);ctx.imageSmoothingEnabled=true;
  ctx.drawImage(images.background,0,0,1104*.39,512);
  const reduced=reducedMotion.matches||motionControl.checked;
  const beat=reduced?0:((now-origin)/500)%4;
  const hand=images['clock-hands'],hw=280,hh=hw*hand.naturalHeight/hand.naturalWidth;
  // The approved clock hands are fixed; no rotation or scaling animation.
  ctx.drawImage(hand,54-34,290-hh*.72,hw,hh);
  [[44,22,230],[232,161,184],[86,365,210]].forEach(([x,y,width],i)=>{
   const image=images[names[i+1]],height=width*image.naturalHeight/image.naturalWidth;
   const b=reduced?0:bounce((beat-i+4)%4)+bounce((beat-3+4)%4)*.55;
   ctx.save();ctx.translate(x+width/2,y+height-b*16);ctx.rotate(b*(i%2?-4:4)*Math.PI/180);ctx.scale(1+b*.035,1-b*.025);ctx.drawImage(image,-width/2,-height,width,height);ctx.restore();
  });
  const pulse=reduced?0:bounce(beat%1);ctx.save();ctx.globalAlpha=.45+pulse*.55;ctx.translate(300,34);ctx.rotate(-15*Math.PI/180);ctx.scale(.9+pulse*.15,.9+pulse*.15);ctx.drawImage(images.accent,0,0,48,48);ctx.restore();
 }
})();
