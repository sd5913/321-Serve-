(function(root){
'use strict';
function hudWindow(notes,musicTime,offsetMs=0){
 const judge=musicTime-offsetMs/1000;let page=0;
 for(let i=6;i<notes.length;i+=6){if(judge>=notes[i].t-.155)page=i/6;else break;}
 return {page,cells:Array.from({length:6},(_,i)=>{const index=page*6+i,n=notes[index];return {index,result:!n?'unused':n.result==='perfect'||n.result==='good'?'hit':n.result==='miss'?'miss':'pending'};})};
}
const glyphs={
0:'M20 0H74L94 18V110L74 130H20L0 111V20ZM28 25V104H66V25Z',
1:'M5 20L37 0H68V130H37V32L5 44Z',
2:'M0 24L24 0H75L94 20V53L30 103H94V130H0V100L64 49V27H29V42H0Z',
3:'M0 0H75L94 19V52L80 64L94 77V111L75 130H0V104H62V78H21V53H62V26H0Z',
4:'M50 0H81V77H96V103H81V130H51V103H0V78ZM29 77H51V35Z',
5:'M0 0H94V27H30V51H75L94 70V110L74 130H0V103H63V78H0Z',
6:'M22 0H94V27H31V50H74L94 70V110L74 130H20L0 110V22ZM31 77V104H63V77Z',
7:'M0 0H94V27L53 130H18L59 29H0Z',
8:'M20 0H74L94 20V51L80 65L94 79V111L74 130H20L0 110V79L14 65L0 51V20ZM30 25V51H63V25ZM30 78V104H63V78Z',
9:'M20 0H74L94 20V108L73 130H0V104H63V79H20L0 59V20ZM30 26V53H63V26Z'};
function percentSVG(value){
 const digits=String(Math.max(0,Math.min(100,Math.round(value)))).split(''),width=digits.length*112+125;
 const paths=digits.map((d,i)=>'<path transform="translate('+i*112+' 0)" d="'+glyphs[d]+'"/>').join('');
 const percent='<path transform="translate('+digits.length*112+' 0)" d="M75 0H100L28 130H3ZM0 15L14 0H39L52 14V43L39 57H14L0 43ZM17 17V40H34V17ZM55 88L68 74H94L108 88V116L94 130H68L55 116ZM72 91V113H91V91Z"/>';
 const art=paths+percent;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -16 '+(width+65)+' 180" aria-hidden="true"><g transform="skewX(-12) translate(30 0)" fill-rule="evenodd" stroke-linejoin="round" paint-order="stroke fill"><g transform="translate(0 9)" fill="#07162d" stroke="#07162d" stroke-width="22">'+art+'</g><g fill="#fff0d9" stroke="#07162d" stroke-width="20">'+art+'</g><g fill="#fff0d9" stroke="#fff0d9" stroke-width="5">'+art+'</g></g></svg>';
}
const api={hudWindow,percentSVG};root.ServeUI=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
