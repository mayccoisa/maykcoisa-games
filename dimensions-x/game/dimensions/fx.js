'use strict';
/* Efeitos da mesa, com os tempos-base vindos do Palworld (game/interface/mesa_combate.gd, camada_fx.gd).
   Todas as durações passam por dur(ms); com "Reduzir animações" ligado nada disso roda. */
const EASE_BACK='cubic-bezier(.34,1.56,.64,1)',EASE_QUAD_IN='cubic-bezier(.55,.085,.68,.53)';

/* Leque da mão: passo min(86% da carta, espaço livre), 3,5° por posição a partir do centro, arco y = d² × 2,2. */
function layoutHand(){
  const hand=$('hand'),cards=[...hand.children];if(!cards.length)return;
  const width=hand.clientWidth,cardW=cards[0].offsetWidth||100,n=cards.length;
  const step=n>1?Math.min(cardW*.86,(width-cardW-24)/(n-1)):0,total=cardW+step*(n-1),start=(width-total)/2,mid=(n-1)/2;
  const tilt=n>7?2.4:3.5;
  cards.forEach((el,i)=>{const d=i-mid;el.style.setProperty('--fx',(start+step*i).toFixed(1)+'px');el.style.setProperty('--fy',(d*d*2.2).toFixed(1)+'px');el.style.setProperty('--rot',(d*tilt).toFixed(2)+'deg');el.style.zIndex=String(i+1);});
}
addEventListener('resize',()=>{if(document.body.dataset.screen==='battle')layoutHand();});

/* Retângulos de apoio */
function revealRect(){const a=document.querySelector('#battle .arena').getBoundingClientRect(),h=Math.min(a.height*.46,340),w=h*5/7;return new DOMRect(a.x+a.width/2-w/2,a.y+a.height*.46-h/2,w,h);}
function rectCenter(r){return {x:r.x+r.width/2,y:r.y+r.height/2};}
function fxBox(r,cls,html=''){fxFront();const el=document.createElement('div');el.className=cls;Object.assign(el.style,{position:'fixed',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});el.innerHTML=html;fxLayer.append(el);return el;}
function faceGhost(c,r){const g=fxBox(r,'ghost-card');g.innerHTML=cardHtml(c,true);const card=g.firstElementChild;Object.assign(card.style,{width:'100%',height:'100%'});return g;}
function moveFrames(from,to,extra={}){return [{transform:`translate(0,0) scale(1)`,...extra.from},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px) scale(${to.width/from.width},${to.height/from.height})`,...extra.to}];}

/* Compra: verso sai do deck em escala .4, sobe 50 px até o meio, desce ao destino, depois a carta vira. */
async function drawFlight(fromRect,last,el){
  const back=fxBox(new DOMRect(fromRect.x+fromRect.width/2-last.width/2,fromRect.y+fromRect.height/2-last.height/2,last.width,last.height),'ghost-back');back.style.transformOrigin='50% 50%';
  const dx=last.x-(fromRect.x+fromRect.width/2-last.width/2),dy=last.y-(fromRect.y+fromRect.height/2-last.height/2);
  await motion(back,[{transform:'translate(0,0) scale(.4) rotate(0deg)'},{transform:`translate(${dx/2}px,${dy/2-50}px) scale(1.1) rotate(-10deg)`,offset:.5,easing:EASE_QUAD_IN},{transform:`translate(${dx}px,${dy}px) scale(1) rotate(0deg)`}],440,{easing:'cubic-bezier(.25,.46,.45,.94)'});
  back.remove();if(el){el.style.visibility='';await motion(el,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],160);}
}
async function enemyDrawFlight(){const pile=pileRect(1,'deck'),target=$('enemy-hand').lastElementChild?.getBoundingClientRect();if(!target)return;const back=fxBox(new DOMRect(pile.x,pile.y,target.width,target.height),'ghost-back small');await motion(back,moveFrames(pile,target),360);back.remove();}

/* Revelação no centro: vai em .32 s com BACK, fica .75 s. */
async function revealCard(c,fromRect,hold=750){
  const big=revealRect(),g=faceGhost(c,fromRect);g.style.transformOrigin='0 0';
  await motion(g,moveFrames(fromRect,big,{from:{filter:'brightness(2)'},to:{filter:'brightness(1)'}}),320,{easing:EASE_BACK,fill:'forwards'});
  await wait(hold);return {ghost:g,rect:big};
}
function moveTransform(from,to){return `translate(${to.x-from.x}px,${to.y-from.y}px) scale(${to.width/from.width},${to.height/from.height})`;}
async function landFrom(g,origin,big,last,el){
  await motion(g,[{transform:moveTransform(origin,big)},{transform:moveTransform(origin,last)}],300,{easing:EASE_QUAD_IN,fill:'forwards'});
  g.remove();if(el)el.style.visibility='';
}

/* Pouso: squash proporcional ao poder e tremor curto da mesa. */
async function landSquash(el,c){
  if(!el)return;const d=definition(c),p=Math.min(1,(d.attack||0)/2800);summonFx(el,c);
  el.style.transformOrigin='50% 100%';
  await motion(el,[{transform:'scale(1,1)'},{transform:`scale(${1.08+.06*p},${.92-.06*p})`,offset:.23},{transform:'scale(1,1)'}],260,{easing:EASE_BACK});
  el.style.transformOrigin='';shakeTable(.35+.8*p);
}
function shakeTable(force=1){const arena=document.querySelector('#battle .arena'),a=Math.round(5*force);return motion(arena,[{transform:'translate(0,0)'},{transform:`translate(${a}px,${-a/2}px)`},{transform:`translate(${-a}px,${a/2}px)`},{transform:`translate(${a/2}px,${a/2}px)`},{transform:`translate(${-a/2}px,0)`},{transform:'translate(0,0)'}],260,{easing:'linear'});}

/* Ataque em 4 tempos: carga, avanço com rastro, impacto com pausa, volta. */
async function attackSequence(sourceEl,targetEl,{windupOnly=false,clash=null}={}){
  if(!sourceEl||!targetEl)return;
  const s=sourceEl.getBoundingClientRect(),t=targetEl.getBoundingClientRect(),a=rectCenter(s),b=rectCenter(t);
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,tilt=Math.max(-9,Math.min(9,dx/len*9));
  const z=sourceEl.style.zIndex;sourceEl.style.zIndex='60';
  const charge=`translate(${-ux*22}px,${-uy*22}px) scale(1.14) rotate(${tilt}deg)`;
  await motion(sourceEl,[{transform:'none',filter:'brightness(1)'},{transform:charge,filter:'brightness(1.35)'}],200,{fill:'forwards'});
  if(windupOnly){await wait(220);await motion(sourceEl,[{transform:charge},{transform:'none'}],260);sourceEl.getAnimations().forEach(x=>x.cancel());sourceEl.style.zIndex=z;return;}
  const trail=fxBox(s,'ghost-card trail');trail.append(sourceEl.cloneNode(true));Object.assign(trail.firstChild.style,{width:'100%',height:'100%'});
  motion(trail,[{opacity:.45},{opacity:0}],220).then(()=>trail.remove());
  const hit=`translate(${dx*.74}px,${dy*.74}px) scale(1.1) rotate(${tilt}deg)`;
  await motion(sourceEl,[{transform:charge,filter:'brightness(1.35)'},{transform:hit,filter:'brightness(1.2)'}],160,{easing:EASE_QUAD_IN,fill:'forwards'});
  impactAt(b);if(clash)clashLabel(b,clash);shakeTable(1.4);recoil(targetEl,ux,uy);
  await wait(100);
  await motion(sourceEl,[{transform:hit},{transform:'none',filter:'brightness(1)'}],260);
  sourceEl.getAnimations().forEach(x=>x.cancel());sourceEl.style.zIndex=z;
}
function recoil(el,ux,uy){return motion(el,[{transform:'translate(0,0)',filter:'none'},{transform:`translate(${ux*18}px,${uy*18}px)`,filter:'sepia(1) saturate(4) hue-rotate(-30deg) brightness(1.2)',offset:.17},{transform:`translate(${-ux*5}px,${-uy*5}px)`,offset:.5},{transform:`translate(${ux*2}px,${uy*2}px)`,offset:.75},{transform:'translate(0,0)',filter:'none'}],360,{easing:'ease-out'});}
function impactAt(p){
  const r=new DOMRect(p.x-60,p.y-60,120,120),el=fxBox(r,'impact','<i></i><i></i><b></b>');
  motion(el.querySelector('b'),[{transform:'scale(.3)',opacity:1},{transform:'scale(1.4)',opacity:0}],260);
  el.querySelectorAll('i').forEach((line,k)=>motion(line,[{transform:`rotate(${k?45:-45}deg) scaleX(0)`,opacity:1},{transform:`rotate(${k?45:-45}deg) scaleX(1)`,opacity:1,offset:.4},{transform:`rotate(${k?45:-45}deg) scaleX(1.1)`,opacity:0}],300));
  setTimeout(()=>el.remove(),dur(320)+20);
}
function clashLabel(p,text){const el=fxBox(new DOMRect(p.x-90,p.y-70,180,30),'clash-label');el.textContent=text;motion(el,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)',offset:.2},{opacity:1,offset:.8},{opacity:0,transform:'translateY(-10px)'}],900).then(()=>el.remove());}

/* Dano e cura no jogador: número que salta, vida contada e vinheta. */
async function hpChange(owner,before,after){
  const profileEl=$(owner?'enemy-profile':'own-profile'),life=profileEl.querySelector('.life'),strong=life?.querySelector('strong'),bar=life?.querySelector('.bar i');if(!life)return;
  const delta=after-before,positive=delta>0;
  const r=life.getBoundingClientRect(),n=fxBox(new DOMRect(r.x+r.width/2-60,r.y+r.height/2-20,120,40),'floating-value'+(positive?' positive':''));n.textContent=(positive?'+':'')+delta;
  const jobs=[motion(n,[{opacity:0,transform:'translateY(0) scale(.4)'},{opacity:1,transform:'translateY(-6px) scale(1.3)',offset:.22,easing:EASE_BACK},{opacity:1,transform:'translateY(-14px) scale(1)',offset:.42},{opacity:1,transform:'translateY(-40px) scale(1)',offset:.7},{opacity:0,transform:'translateY(-54px) scale(1)'}],720).then(()=>n.remove())];
  if(!positive){jobs.push(vignette());jobs.push(motion(profileEl,[{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(6px)'},{transform:'translateX(-4px)'},{transform:'translateX(2px)'},{transform:'translateX(0)'}],220,{easing:'linear'}));}
  const steps=12,time=dur(600);
  if(strong&&time)jobs.push(new Promise(resolve=>{let i=0;const tick=()=>{i++;const v=Math.round(before+delta*i/steps);strong.textContent=v;if(bar)bar.style.width=v/40+'%';if(i<steps)setTimeout(tick,time/steps);else resolve();};strong.textContent=before;if(bar)bar.style.width=before/40+'%';setTimeout(tick,time/steps);}));
  await Promise.all(jobs);
}
function vignette(){const el=fxBox(new DOMRect(0,0,innerWidth,innerHeight),'vignette');return motion(el,[{opacity:0},{opacity:1,offset:.23},{opacity:0}],520).then(()=>el.remove());}

/* Dados grandes no centro. */
const DIE_CAPTION={10:v=>v>=8?'Bloqueio total':v>=4?'Combate em defesa':'Defesa destruída',20:v=>v===20?'+2 energia':v>=11?'+1 energia':'Sem bônus',6:v=>v<=3?'Destruída':'Resistiu'};
async function rollDie(faces,value){
  const quick=faces===20,a=document.querySelector('#battle .arena').getBoundingClientRect(),size=quick?96:132;
  const box=fxBox(new DOMRect(a.x+a.width/2-size/2,a.y+a.height*.46-size/2,size,size),'big-die'+(quick?' quick':''),`<small>D${faces}</small><b>?</b><em></em>`);
  const num=box.querySelector('b'),cap=box.querySelector('em'),spin=dur(quick?380:640);
  const spinAnim=motion(box,[{transform:'rotate(0) scale(.6)',opacity:0},{transform:'rotate(200deg) scale(1)',opacity:1,offset:.35},{transform:'rotate(360deg) scale(1)'}],quick?380:640,{easing:'ease-out'});
  const t0=performance.now();await new Promise(resolve=>{const tick=()=>{num.textContent=1+Math.floor(Math.random()*faces);if(performance.now()-t0<spin)setTimeout(tick,55);else resolve();};tick();});
  await spinAnim;num.textContent=value;cap.textContent=DIE_CAPTION[faces](value);box.classList.add('landed');
  await motion(num,[{transform:'scale(1.6)'},{transform:'scale(1)'}],240,{easing:EASE_BACK});
  await wait(quick?380:720);await motion(box,[{opacity:1},{opacity:0,transform:'scale(.9)'}],180);box.remove();
}

/* Faixa de turno: abre em .22 s, texto desliza 80 px, segura .62 s, fecha em .2 s. */
async function turnBand(text,kind='turn'){
  const band=fxBox(new DOMRect(0,innerHeight/2-48,innerWidth,96),'turn-band '+kind,`<span>${esc(text)}</span>`),label=band.firstChild;
  await Promise.all([motion(band,[{transform:'scaleY(0)'},{transform:'scaleY(1)'}],220,{fill:'forwards'}),motion(label,[{transform:'translateX(-80px)',opacity:0},{transform:'translateX(0)',opacity:1}],500,{fill:'forwards'})]);
  await wait(620);await motion(band,[{transform:'scaleY(1)',opacity:1},{transform:'scaleY(0)',opacity:0}],200,{easing:'ease-in'});band.remove();
}

/* Mira: curva de Bézier tracejada âmbar; vermelha com anel quando passa por alvo legal. */
const aimSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');aimSvg.id='aim';aimSvg.innerHTML='<path/><circle r="26"/>';fxLayer.append(aimSvg);
let aimPoint=null;
function aimSource(){if(!engine||battleBusy||document.body.dataset.screen!=='battle'||engine.s.active!==0||engine.s.phase!=='ataque'||engine.s.pending)return null;const f=selected&&engine.find(selected);if(!f||f.zone!=='field'||f.owner!==0)return null;return engine.actions(0).some(a=>a.type==='attack'&&a.card===selected)?cardNodes.get(selected):null;}
function aimTargetAt(x,y){const el=document.elementFromPoint(x,y);if(!el)return null;const card=el.closest('#enemy-field [data-card]');if(card&&engine.actions(0).some(a=>a.type==='attack'&&a.card===selected&&a.target===card.dataset.card))return card;const prof=el.closest('#enemy-profile');if(prof&&engine.actions(0).some(a=>a.type==='attack'&&a.card===selected&&a.target===null))return prof;return null;}
function drawAim(){
  const src=aimSource();aimSvg.classList.toggle('on',!!src&&!!aimPoint);if(!src||!aimPoint)return;fxFront();
  const s=rectCenter(src.getBoundingClientRect()),target=aimTargetAt(aimPoint.x,aimPoint.y),e=target?rectCenter(target.getBoundingClientRect()):aimPoint;
  const dist=Math.hypot(e.x-s.x,e.y-s.y),lift=Math.min(140,dist*.35),cx=(s.x+e.x)/2,cy=(s.y+e.y)/2-lift;
  aimSvg.querySelector('path').setAttribute('d',`M${s.x},${s.y} Q${cx},${cy} ${e.x},${e.y}`);
  const ring=aimSvg.querySelector('circle');ring.setAttribute('cx',e.x);ring.setAttribute('cy',e.y);aimSvg.classList.toggle('locked',!!target);
}
document.addEventListener('pointermove',e=>{aimPoint={x:e.clientX,y:e.clientY};drawAim();},{passive:true});

/* Carta ampliada no hover (0,38 s) ou toque longo (0,45 s); só desenha na camada de efeitos, nunca redesenha a mesa. */
const preview=document.createElement('div');preview.className='card-preview';fxLayer.append(preview);
let previewTimer=null;
function queuePreview(el,uid){clearTimeout(previewTimer);previewTimer=setTimeout(()=>showPreview(el,uid),380);}
function hidePreview(){clearTimeout(previewTimer);preview.classList.remove('on');}
function showPreview(el,uid){
  if(battleBusy||!el.isConnected||!engine)return;const f=engine.find(uid);if(!f)return;
  const c=f.c,d=definition(c),world=dim(d.dimension),gear=f.zone==='field'?gearOf(c):[];
  const notes=[];if(f.zone==='field'&&d.type==='creature'){notes.push(c.position==='defense'?'Em defesa: não ataca.':c.attacked?'Já atacou neste turno.':c.entered===engine.s.turn?'Entrou neste turno.':'Em ataque.');}
  preview.innerHTML=`<div class="pv-card">${cardHtml(c)}</div><div class="pv-text"><span class="eyebrow">${world.name} · ${d.type==='creature'?(d.rare?'CRIATURA RARA':'CRIATURA'):'MÁGICA'}</span><h3>${esc(d.name)}</h3><p>${esc(d.text)}</p>${gear.map(g=>`<p class="pv-gear">${esc(g.name)} · ${g.effect==='buffAttack'?'ATQ':'DEF'} +${g.value}</p>`).join('')}${notes.map(n=>`<p class="pv-note">${n}</p>`).join('')}</div>`;
  fxFront();preview.classList.add('on');
  const r=el.getBoundingClientRect(),w=preview.offsetWidth,h=preview.offsetHeight;
  let x=r.right+14;if(x+w>innerWidth-8)x=r.left-14-w;x=Math.max(8,x);
  const y=Math.max(8,Math.min(innerHeight-h-8,r.top+r.height/2-h/2));
  preview.style.left=x+'px';preview.style.top=y+'px';
}
function bindLongPress(el,uid){
  let timer=null,start=null;
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;start={x:e.clientX,y:e.clientY};timer=setTimeout(()=>showPreview(el,uid),450);});
  el.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>14){clearTimeout(timer);start=null;}});
  for(const type of ['pointerup','pointercancel','pointerleave'])el.addEventListener(type,()=>{clearTimeout(timer);start=null;if(preview.classList.contains('on'))setTimeout(hidePreview,900);});
}
