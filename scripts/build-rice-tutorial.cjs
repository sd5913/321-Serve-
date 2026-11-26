const fs=require('fs'),path=require('path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/ui/elements/tutorial/rice-rice-baby');
const src=fs.readFileSync(root+'/scripts/build-level-select.cjs','utf8');const glyphs=Function('return ('+src.match(/const glyphs=(\{[^\n]+\});/)[1]+')')();
Object.assign(glyphs,{W:'M0 0H26L36 62L49 18H70L83 62L94 0H120L101 100H76L60 58L44 100H19Z',D:'M0 0H61L85 24V76L61 100H0ZM30 25V75H49L55 69V31L49 25Z',P:'M0 0H63L83 20V48L63 68H30V100H0ZM30 24V44H49L55 38V30L49 24Z',"'":'M0 0H17V18L7 32H0L5 18H0Z'});
const navy='#00133A',cream='#FCEBD1',green='#87DCB0',coral='#FF5537';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function letters(s,x,y,w,h,fill=navy,outline=false){let pen=0,p='';for(const ch of s.toUpperCase().replaceAll('’',"'")){if(ch===' '){pen+=38;continue;}if(!glyphs[ch])throw Error(ch);p+=`<path transform="translate(${pen} 0)" d="${glyphs[ch]}"/>`;pen+=(ch==='W'?140:ch==="'"?28:ch==='!'?48:ch==='I'?86:106);}let scale=Math.min(w/(pen+30),h/130);return `<g transform="translate(${x+(w-pen*scale)/2+10} ${y+12}) scale(${scale}) skewX(-12)" fill-rule="evenodd">${outline?`<g transform="translate(3 7)" fill="${navy}" stroke="${navy}" stroke-width="14" stroke-linejoin="round">${p}</g>`:''}<g fill="${fill}" ${outline?`stroke="${navy}" stroke-width="10" paint-order="stroke fill" stroke-linejoin="round"`:''}>${p}</g></g>`;}
function svg(body,w=1500,h=650){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;}
function text(s,x,y,size=29,anchor='start'){return `<text x="${x}" y="${y}" font-family="IBM Plex Mono,monospace" font-size="${size}" fill="${navy}" text-anchor="${anchor}">${esc(s)}</text>`;}
function key(s,x,y){return `<rect x="${x}" y="${y}" width="86" height="70" rx="17" fill="${cream}" stroke="${navy}" stroke-width="5"/><g transform="translate(${x+28} ${y+13}) scale(.44) skewX(-12)" fill="${navy}" fill-rule="evenodd"><path d="${glyphs[s]}"/></g>`;}
const cards=[
['intro','RICE RICE BABY',['Shape the rice. Send it away. Follow the rhythm.','Watch each pattern, then try it yourself.']],
['lesson-1','REGULAR RICE',['Listen to the machine. Wait for the rice to land.','Shape it on the first cue, then send it away.'],'AD'],
['lesson-2','TRIPLE RICE',['Red light and smoke: three portions are coming!','Shape them from right to left, then send them away.'],'AAAD'],
['lesson-3','BOUNCING RICE',['Listen to the bounces. Wait for the rice to settle.','Then shape it and send it away on the sound cues.'],'AD'],
['lesson-4','WATCH THE SPONGE',['Listen for the squeeze and splat.','Send the sponge away on the cue. Do not shape it.'],'D']];
async function save(name,body,w=1500,h=650){const s=svg(body,w,h);fs.writeFileSync(out+'/'+name+'.svg',s);await sharp(Buffer.from(s),{density:144}).png().toFile(out+'/'+name+'.png');return out+'/'+name+'.png';}
(async()=>{fs.mkdirSync(out,{recursive:true});let shots=[];
await save('background-green',`<rect width="1950" height="900" fill="${green}"/>`,1950,900);
const panel=`<rect x="157.5" y="36" width="1205" height="585" rx="65" fill="${coral}" stroke="${navy}" stroke-width="9"/><rect x="147.5" y="18" width="1205" height="585" rx="65" fill="${cream}" stroke="${navy}" stroke-width="9"/>`;
for(let i=0;i<cards.length;i++){let [name,title,lines,seq]=cards[i];let body=panel;
body+=letters(title,220,64,1060,100);body+=text(i?`LESSON 0${i} / 04`:'HOW TO PLAY',750,202,23,'middle');lines.forEach((l,n)=>body+=text(l,750,263+n*45,27,'middle'));
if(i===0){
body+=key('A',440,354)+key('D',955,354);
body+=text('SHAPE',483,462,27,'middle')+text('SEND AWAY',998,462,27,'middle');
body+=`<rect x="630" y="348" width="224" height="100" rx="16" fill="none" stroke="${navy}" stroke-width="5"/><path d="M742 350V446" stroke="${navy}" stroke-width="3"/>`;
body+=text('LEFT',686,408,23,'middle')+text('RIGHT',798,408,23,'middle');
body+=`<path d="M620 397H548M865 397H936" stroke="${navy}" stroke-width="3"/>`;
body+=text('ON SCREEN',742,485,23,'middle');
}else if(seq){const gap=176,start=i===4?583:750-((seq.length-1)*gap+86)/2;[...seq].forEach((k,n)=>{const x=start+n*gap;body+=key(k,x,386)+text(k==='A'?'SHAPE':'SEND AWAY',x+43,504,22,'middle');if(n<seq.length-1)body+=text('›',x+130,435,35,'middle');});if(i===4){body+=key('A',831,386)+`<path d="M829 382L921 462M921 382L829 462" stroke="${coral}" stroke-width="7" stroke-linecap="round"/>`+text('DO NOT SHAPE',874,504,20,'middle');}}
if(i===0)await save('textbox-empty',panel);let file=await save(name+'-card',body);shots.push({file,title});}
await save('now-its-your-turn',letters("NOW IT’S YOUR TURN!",50,55,1800,210,coral,true),1900,300);
await save('watch-demo-button',`<rect x="18" y="28" width="964" height="154" rx="77" fill="${navy}"/><rect x="18" y="13" width="964" height="154" rx="77" fill="${cream}" stroke="${navy}" stroke-width="9"/>${letters('WATCH DEMO',75,38,850,110)}`,1000,200);
await save('tutorial-complete-card',panel+letters('READY TO SERVE!',220,125,1060,130)+text('All four patterns complete!',750,345,33,'middle')+text('Listen closely. The full level is next.',750,415,29,'middle'));
await save('continue-button',`<rect x="18" y="28" width="964" height="154" rx="77" fill="${navy}"/><rect x="18" y="13" width="964" height="154" rx="77" fill="${cream}" stroke="${navy}" stroke-width="9"/>${letters('CONTINUE',75,38,850,110)}`,1000,200);
for(const n of ['3','2','1'])await sharp(root+'/assets/ui/elements/countdown/'+n+'.svg',{density:144}).png().toFile(out+'/countdown-'+n+'.png');
await save('countdown-go',letters('GO!',50,45,850,240,cream,true),950,340);
await save('key-a',key('A',17,17),120,104);await save('key-d',key('D',17,17),120,104);
require('node:child_process').execFileSync('python3',[path.join(root,'scripts/outline-rice-tutorial.py')],{stdio:'inherit'});
for(const file of fs.readdirSync(out).filter(n=>n.endsWith('.svg')))await sharp(path.join(out,file),{density:144}).png().toFile(path.join(out,file.replace(/\.svg$/,'.png')));
console.log('Built English tutorial cards, visual controls and countdown assets.');
})().catch(e=>{console.error(e);process.exitCode=1});
