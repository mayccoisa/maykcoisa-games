'use strict';
/* Camada do tutorial: balão no topo com "Passo N de M", destaque âmbar pulsante no alvo e saída a qualquer momento.
   O texto do próximo passo só aparece quando a mesa termina de se mover. */
const tutorialBalloon=document.createElement('div');tutorialBalloon.id='tutorial-balloon';tutorialBalloon.popover='manual';tutorialBalloon.setAttribute('role','status');tutorialBalloon.setAttribute('aria-live','polite');document.body.append(tutorialBalloon);
const tutorialRing=document.createElement('div');tutorialRing.className='tutorial-ring';fxLayer.append(tutorialRing);
let tutorialShownStep=-1;
const inTutorial=()=>!!engine?.isTutorial;
function startTutorial(){
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  clearTimeout(botTimer);seed=20261013;session++;engine=new DXTutorial();selected=null;slotChoice=null;hovered=null;resetBoard();
  resultShownFor=engine;tutorialShownStep=-1;fxLayer.append(tutorialRing);setScreen('battle');
}
function tutorialFront(){try{if(tutorialBalloon.matches(':popover-open'))tutorialBalloon.hidePopover();tutorialBalloon.showPopover();}catch{}}
function cardNodeById(id,zone){for(const [uid,el] of cardNodes){const f=engine.find(uid);if(f&&f.c.card===id&&(!zone||f.zone===zone&&f.owner===(zone==='enemy'?1:0)))return el;}return null;}
function resolveTarget(t){
  if(!t)return null;
  const simple={'enemy-life':'#enemy-profile .life','own-life':'#own-profile .life','own-energy':'#own-profile .energy','decision-actions':'#decision #actions','phase-button':'#center .phase-actions button','enemy-field':'#enemy-field','own-field':'#own-field','enemy-profile':'#enemy-profile'};
  if(typeof t==='string'){if(t==='slots')return slotChoice!==null&&!actionPop.hidden?actionPop:$('own-field');return document.querySelector(simple[t]);}
  const own=t.card?cardNodeById(t.card,'hand'):t.field?[...cardNodes].find(([uid])=>{const f=engine.find(uid);return f&&f.zone==='field'&&f.owner===0&&f.c.card===t.field;})?.[1]:t.enemy?[...cardNodes].find(([uid])=>{const f=engine.find(uid);return f&&f.zone==='field'&&f.owner===1&&f.c.card===t.enemy;})?.[1]:null;
  if(own&&selected===own.dataset.card&&t.then)return resolveTarget(t.then);
  return own||null;
}
function updateTutorial(){
  document.body.classList.toggle('tutorial',inTutorial());
  if(!inTutorial()||document.body.dataset.screen!=='battle'){try{tutorialBalloon.hidePopover();}catch{}tutorialRing.classList.remove('on');return;}
  if(battleBusy)return;
  const st=engine.current,total=DXTutorial.STEPS.length;if(!st)return;
  if(tutorialShownStep!==engine.step){
    tutorialShownStep=engine.step;
    tutorialBalloon.innerHTML=`<div class="tb-head"><span class="eyebrow">TUTORIAL · PASSO ${engine.step+1} DE ${total}</span><button type="button" class="tb-exit">Sair do tutorial</button></div><h2>${esc(st.title)}</h2><p>${esc(st.text)}</p>${st.bot?'<p class="tb-wait">O bot está jogando…</p>':''}<div class="tb-actions"></div>`;
    const actions=tutorialBalloon.querySelector('.tb-actions');
    if(st.final){const again=document.createElement('button');again.className='primary';again.textContent='Jogar uma partida';again.onclick=()=>{tutorialBalloon.hidePopover();setup();};const home=document.createElement('button');home.textContent='Voltar ao início';home.onclick=()=>{tutorialBalloon.hidePopover();engine=null;showHome();};actions.append(again,home);}
    else if(!st.seq){const next=document.createElement('button');next.className='primary';next.textContent='Continuar';next.onclick=()=>{if(engine.next())render();};actions.append(next);}
    tutorialBalloon.querySelector('.tb-exit').onclick=()=>{tutorialBalloon.hidePopover();tutorialRing.classList.remove('on');engine=null;showHome();};
  }
  fxFront();tutorialFront();
}
(function trackRing(){
  requestAnimationFrame(trackRing);
  if(!inTutorial()||document.body.dataset.screen!=='battle'||battleBusy){tutorialRing.classList.remove('on');return;}
  if(document.body.classList.contains('panel-open')||$('battle-menu').open||$('card-detail').open||$('overlay').open||$('settings').open){
    tutorialRing.classList.remove('on');
    if(tutorialBalloon.matches(':popover-open'))tutorialBalloon.hidePopover();
    return;
  }
  if(!tutorialBalloon.matches(':popover-open'))tutorialFront();
  const el=resolveTarget(engine.current?.target),r=el?.getBoundingClientRect();
  placeBalloon(r);
  if(!r||!r.width){tutorialRing.classList.remove('on');return;}
  if(!fxLayer.matches(':popover-open'))fxFront();
  Object.assign(tutorialRing.style,{left:r.x-6+'px',top:r.y-6+'px',width:r.width+12+'px',height:r.height+12+'px'});tutorialRing.classList.add('on');
})();

/* Leitura centralizada; nos passos interativos, desvia dos controles necessários. */
function placeBalloon(target){
  if(!tutorialBalloon.matches(':popover-open'))return;
  const h=tutorialBalloon.offsetHeight,w=tutorialBalloon.offsetWidth,left=innerWidth/2-w/2;
  const middle=innerHeight/2-h/2;
  const options=[middle,12,innerHeight-h-12];
  const clear=(top,r)=>!r||r.bottom+8<top||r.top-8>top+h||r.right<left||r.left>left+w;
  const pop=!actionPop.hidden?actionPop.getBoundingClientRect():null;
  const top=!engine.current?.seq?middle:options.find(y=>clear(y,target)&&clear(y,pop))??options.find(y=>clear(y,pop))??middle;
  tutorialBalloon.style.top=Math.max(8,top)+'px';
}
