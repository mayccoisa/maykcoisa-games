'use strict';
/* Painéis da arena: gaveta lateral, ações junto da carta ou da vaga, e menu durante decisões. */
const actionPop=$('action-pop');document.body.append(actionPop);
function setPanel(open){document.body.classList.toggle('panel-open',open);$('panel-button').setAttribute('aria-expanded',String(open));if(open)$('panel-close').focus();}
$('panel-button').onclick=()=>setPanel(!document.body.classList.contains('panel-open'));
$('panel-close').onclick=()=>{setPanel(false);$('panel-button').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('panel-open')&&!document.querySelector('dialog[open]')){setPanel(false);$('panel-button').focus();}});
$('decision-menu').onclick=()=>{clearTimeout(botTimer);$('battle-menu').showModal();};

function costOf(a){const f=engine.find(a.card);return Math.max(0,definition(f.c).cost-(a.tribute?2:0));}
function popButton(a,text){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.action=a.type;b.onclick=()=>{hidePop();act(0,a);};return b;}
function hidePop(){actionPop.hidden=true;}
function placePop(anchor){
  actionPop.hidden=false;const w=actionPop.offsetWidth,h=actionPop.offsetHeight;
  let x=anchor.x+anchor.width/2-w/2,y=anchor.y-h-10;if(y<8)y=anchor.bottom+10;
  x=Math.max(8,Math.min(innerWidth-w-8,x));y=Math.max(8,Math.min(innerHeight-h-8,y));
  actionPop.style.left=x+'px';actionPop.style.top=y+'px';
}
function updateActionPop(){
  const s=engine?.s;
  if(!s||battleBusy||document.body.dataset.screen!=='battle'||decisionKind()||!selected){hidePop();return;}
  const f=engine.find(selected);if(!f){hidePop();return;}
  const acts=engine.actions(0).filter(a=>a.card===selected),d=definition(f.c),node=cardNodes.get(selected);
  actionPop.replaceChildren();const say=text=>{const p=document.createElement('p');p.textContent=text;actionPop.append(p);};
  let anchor=(node||spellNodes.get(selected))?.getBoundingClientRect();
  const read=document.createElement('button');read.type='button';read.textContent='Ler carta';read.onclick=()=>{hidePop();hovered=null;renderFocus();setPanel(true);$('battle-panel').scrollTop=0;};actionPop.append(read);
  if(f.owner!==0||s.active!==0||s.winner!==null){if(anchor)placePop(anchor);else hidePop();return;}
  if(slotChoice!==null&&acts.some(a=>a.type==='summon'&&a.slot===slotChoice)){
    anchor=slotRect(0,slotChoice);
    const groups=new Map();for(const a of acts.filter(a=>a.type==='summon'&&a.slot===slotChoice)){const k=a.tribute||'';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(a);}
    say(d.name+' no espaço '+(slotChoice+1)+'.');
    for(const [tribute,list] of groups){const row=document.createElement('div');row.className='pop-row';const tag=document.createElement('small');tag.textContent=tribute?'Tributar '+definition(engine.find(tribute).c).name+' · custo '+costOf(list[0]):'Sem tributo · custo '+costOf(list[0]);const buttons=document.createElement('div');buttons.className='pop-buttons';for(const a of list)buttons.append(popButton(a,a.position==='attack'?'Em ataque':'Em defesa'));row.append(tag,buttons);actionPop.append(row);}
  }else if(!acts.length)say(engine.isTutorial?'Neste passo, siga a indicação do tutorial no topo da tela.':explainUnavailable(f.c));
  else if(acts.some(a=>a.type==='summon'))say(d.tribute?'Escolha uma vaga destacada ou clique numa criatura sua para tributar.':'Escolha uma vaga destacada para invocar.');
  else if(acts.some(a=>a.type==='spell')){if(acts.some(a=>a.target))say('Escolha o alvo destacado.');else actionPop.append(popButton(acts[0],'Jogar · custo '+d.cost));}
  else{
    const direct=acts.find(a=>a.type==='attack'&&a.target===null),position=acts.find(a=>a.type==='position');
    if(acts.some(a=>a.type==='attack'&&a.target))say('Escolha um alvo no campo inimigo.');
    if(direct)actionPop.append(popButton(direct,'Atacar diretamente'));
    if(position)actionPop.append(popButton(position,f.c.position==='attack'?'Mudar para defesa':'Mudar para ataque'));
  }
  if(!anchor||!actionPop.childElementCount){hidePop();return;}
  placePop(anchor);
}
addEventListener('resize',()=>{if(!actionPop.hidden)updateActionPop();});
document.addEventListener('scroll',e=>{if(actionPop.contains(e.target)||$('battle-panel').contains(e.target))return;hidePreview();if(!actionPop.hidden)updateActionPop();},true);
