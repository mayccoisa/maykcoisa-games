'use strict';
/* Invocação temática: cada dimensão pousa a carta com a sua assinatura. Roda junto do squash (landSquash).
   Véu de Eldoria: círculo rúnico e brasas. Distrito Aurora: raios e faíscas. Nexo Ômega: portal de íons e varredura.
   Raras ganham escala maior, mais partículas e um clarão na mesa. Tudo passa por motion()/dur(), então respeita velocidade e "Reduzir animações". */
const SUMMON_THEME={
  medieval:{color:'#d3ad66',glow:'#fff1c2',ring:'rune'},
  urbana:{color:'#58c5bc',glow:'#e0fffb',ring:'bolt'},
  espacial:{color:'#b6a1ee',glow:'#f0eaff',ring:'portal'}
};
function summonDot(cx,cy,size,color){const d=document.createElement('i');d.className='summon-dot';Object.assign(d.style,{position:'fixed',left:cx-size/2+'px',top:cy-size/2+'px',width:size+'px',height:size+'px',background:color});fxFront();fxLayer.append(d);return d;}
async function summonFx(el,c){
  if(!el||!c||!dur(1))return;
  const def=definition(c);if(!def)return;const theme=SUMMON_THEME[def.dimension];if(!theme)return;
  const r=el.getBoundingClientRect();if(!r.width)return;
  const rare=!!def.rare,k=rare?1.6:1,cx=r.x+r.width/2,cy=r.y+r.height/2,size=Math.max(r.width,r.height)*1.5*k;
  const ring=fxBox(new DOMRect(cx-size/2,cy-size/2,size,size),'summon-ring summon-'+theme.ring);
  ring.style.setProperty('--c',theme.color);ring.style.setProperty('--g',theme.glow);
  const jobs=[];
  const ringFrames={rune:[{transform:'rotate(-90deg) scale(.4)',opacity:0},{transform:'rotate(0deg) scale(1)',opacity:1,offset:.35},{transform:'rotate(70deg) scale(1.15)',opacity:0}],
    bolt:[{transform:'scale(.2)',opacity:1},{transform:'scale(1)',opacity:.9,offset:.4},{transform:'scale(1.35)',opacity:0}],
    portal:[{transform:'scale(1.4,.2) rotate(0deg)',opacity:0},{transform:'scale(1,1) rotate(120deg)',opacity:1,offset:.4},{transform:'scale(.3) rotate(360deg)',opacity:0}]}[theme.ring];
  jobs.push(motion(ring,ringFrames,rare?760:540,{easing:'cubic-bezier(.2,.8,.3,1)'}).then(()=>ring.remove()));
  const n=rare?18:10;
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n+Math.random()*.4,dist=(r.width*.55+Math.random()*r.width*.5)*k,s=(rare?7:5)+Math.random()*4,d=summonDot(cx,cy,s,i%3?theme.color:theme.glow);
    let to;
    if(theme.ring==='rune')to=`translate(${Math.cos(a)*dist*.6}px,${-dist*(.6+Math.random()*.7)}px)`;/* brasas sobem */
    else if(theme.ring==='bolt')to=`translate(${Math.cos(a)*dist*1.1}px,${Math.sin(a)*dist*1.1}px) scale(.3)`;/* faíscas em todas as direções */
    else to=`translate(${Math.cos(a)*dist*.3}px,${Math.sin(a)*dist*.3}px) scale(.2)`;/* íons sugados para o centro */
    const from=theme.ring==='portal'?`translate(${Math.cos(a)*dist}px,${Math.sin(a)*dist}px) scale(1)`:'translate(0,0) scale(1)';
    jobs.push(motion(d,[{transform:from,opacity:1},{transform:to,opacity:0}],(rare?700:480)+Math.random()*160,{easing:'cubic-bezier(.2,.7,.3,1)'}).then(()=>d.remove()));
  }
  /* Assinatura sobre a própria carta */
  if(theme.ring==='bolt')jobs.push(motion(el,[{filter:'brightness(2.4) saturate(.4)'},{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.35},{filter:'brightness(1)'}],340));
  else if(theme.ring==='portal')jobs.push(motion(el,[{clipPath:'inset(48% 0 48% 0)',filter:'brightness(2)'},{clipPath:'inset(0 0 0 0)',filter:'brightness(1)'}],320,{easing:'steps(6,end)'}));
  else jobs.push(motion(el,[{filter:'brightness(1.7) sepia(.5)'},{filter:'brightness(1)'}],420));
  if(rare){const flash=fxBox(document.querySelector('#battle .arena').getBoundingClientRect(),'summon-flash');flash.style.background=`radial-gradient(circle at ${cx}px ${cy}px,${theme.color}88,transparent 55%)`;jobs.push(motion(flash,[{opacity:0},{opacity:1,offset:.25},{opacity:0}],620).then(()=>flash.remove()));}
  await Promise.all(jobs);
}
