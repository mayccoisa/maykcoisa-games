'use strict';
/* Mesa com cartas persistentes por uid e animações em fila.
   Cada carta é sempre o mesmo elemento enquanto estiver visível; as mudanças de lugar
   são animadas por FLIP (mede antes, aplica o estado novo, anima a diferença). */
let battleBusy=false;
const cardNodes=new Map(),spellNodes=new Map(),flipOverrides=new Map();
const fxLayer=document.createElement('div');fxLayer.id='battle-fx';fxLayer.setAttribute('aria-hidden','true');fxLayer.popover='manual';document.body.append(fxLayer);
/* A camada de efeitos entra na camada superior para ficar acima de qualquer diálogo modal aberto antes dela. */
function fxFront(){try{if(fxLayer.matches(':popover-open'))fxLayer.hidePopover();fxLayer.showPopover();}catch{}}
const EASE_OUT='cubic-bezier(.2,.8,.2,1)',EASE_IN='cubic-bezier(.5,0,.75,0)';
function dur(ms){return preferences.motion?0:Math.round(ms*({slow:1.3,normal:1,fast:.6}[preferences.speed]||1));}
function setBattleBusy(value){for(const el of [$('battle'),$('decision')])el.inert=value;document.body.classList.toggle('battle-busy',value);if(value){aimSvg.classList.remove('on');hidePreview();hidePop();}}
async function motion(el,frames,ms=400,options={}){const time=dur(ms);if(!el||!time)return;const animation=el.animate(frames,{duration:time,easing:EASE_OUT,fill:'none',...options});await animation.finished.catch(()=>{});}
const wait=ms=>new Promise(r=>setTimeout(r,dur(ms)));
function resetBoard(){cardNodes.clear();spellNodes.clear();flipOverrides.clear();for(const id of ['own-field','enemy-field','own-spells','enemy-spells','hand'])$(id).replaceChildren();for(const el of [...fxLayer.children])if(el.id!=='aim'&&!el.classList.contains('card-preview'))el.remove();hidePreview?.();}

/* Desenho da mesa */
function paintCard(el,c){
  const d=definition(c),html=cardInner(c),cls=cardClasses(c);
  if(el._html!==html){el.innerHTML=html;el._html=html;}
  const keep=['legal-target','playable'].filter(k=>el.classList.contains(k));el.className=cls;keep.forEach(k=>el.classList.add(k));
  el.style.setProperty('--dim',dim(d.dimension).color);el.setAttribute('aria-label',d.name+', '+cardTypeName(d)+', custo '+d.cost);el.title=d.text;
}
function cardNode(c){
  let el=cardNodes.get(c.uid);
  if(!el){el=document.createElement('button');el.type='button';el.dataset.card=c.uid;el.onclick=()=>pick(c.uid);el.onmouseenter=()=>{hover(c.uid);queuePreview(el,c.uid);};el.onfocus=()=>hover(c.uid);el.onmouseleave=()=>{hover(null);hidePreview();};bindLongPress(el,c.uid);cardNodes.set(c.uid,el);}
  paintCard(el,c);return el;
}
function spellNode(c,color){
  let el=spellNodes.get(c.uid);
  if(!el){el=document.createElement('button');el.type='button';el.dataset.card=c.uid;el.onclick=()=>pick(c.uid);el.onmouseenter=el.onfocus=()=>hover(c.uid);el.onmouseleave=()=>hover(null);spellNodes.set(c.uid,el);}
  el.className='spell-slot occupied';el.style.setProperty('--dim',color);
  const d=definition(c),bearer=c.target&&engine.find(c.target);
  el.innerHTML=`<span>${esc(d.name)}</span>${bearer?`<small>${d.effect==='buffAttack'?'ATQ':'DEF'} +${d.value} · ${esc(definition(bearer.c).name)}</small>`:''}`;
  el.title=d.text+(bearer?' · equipada em '+definition(bearer.c).name:'');
  el.onmouseenter=el.onfocus=()=>{hover(c.uid);cardNodes.get(c.target)?.classList.add('bearer');};el.onmouseleave=el.onblur=()=>{hover(null);cardNodes.get(c.target)?.classList.remove('bearer');};
  return el;
}
function slots(container,count,make){if(container.children.length!==count)container.replaceChildren(...Array.from({length:count},make));return [...container.children];}
function renderBoard(acts){
  const s=engine.s,placed=new Set();
  for(const owner of [0,1]){
    const prefix=owner?'enemy':'own',p=s.players[owner],color=dim(p.dimension).color,symbol=dim(p.dimension).symbol;$(prefix+'-field').style.setProperty('--dim',color);
    slots($(prefix+'-field'),5,()=>document.createElement('div')).forEach((wrap,slot)=>{
      const c=p.field[slot];
      const available=owner===0&&selected&&acts.some(a=>a.type==='summon'&&a.card===selected&&a.slot===slot);
      wrap.className='slot'+(c?'':' empty')+(available?' available':'');
      if(c){const el=cardNode(c);placed.add(c.uid);if(wrap.firstChild!==el||wrap.childNodes.length!==1)wrap.replaceChildren(el);}
      else{let b=wrap.querySelector('[data-slot]');if(!b||wrap.childNodes.length!==1){b=document.createElement('button');b.type='button';b.className='slot empty';b.dataset.slot=owner+':'+slot;b.setAttribute('aria-label','Espaço '+(slot+1));b.innerHTML=`<span class="seal">${symbol}</span>`;b.onclick=()=>chooseSlot(owner,slot);wrap.replaceChildren(b);}}
    });
    slots($(prefix+'-spells'),3,()=>document.createElement('div')).forEach((wrap,i)=>{
      const c=p.spells[i];wrap.className='spell-cell';
      if(c){const el=spellNode(c,color);placed.add(c.uid);if(wrap.firstChild!==el)wrap.replaceChildren(el);}
      else if(!wrap.querySelector('.spell-slot:not(.occupied)')){const e=document.createElement('div');e.className='spell-slot';e.textContent='MAGIA';wrap.replaceChildren(e);}
    });
  }
  const hand=s.players[0].hand.map(c=>{placed.add(c.uid);return cardNode(c);});
  const container=$('hand');if(hand.length!==container.children.length||hand.some((el,i)=>container.children[i]!==el))container.replaceChildren(...hand);
  for(const map of [cardNodes,spellNodes])for(const [uid,el] of map)if(!placed.has(uid)){el.remove();map.delete(uid);}
  for(const el of cardNodes.values())if(el.parentElement!==container)el.style.zIndex='';
  layoutHand();
}
function chooseSlot(owner,slot){if(owner!==0||battleBusy)return;const options=engine.actions(0).filter(a=>a.type==='summon'&&a.card===selected&&a.slot===slot);if(options.length){slotChoice=slot;$('hint').textContent='Opções de invocação no espaço '+(slot+1)+'. Escolha posição e pagamento.';render();showActions(options);}}

/* FLIP */
function measureBoard(){
  const m=new Map();
  for(const [kind,map] of [['card',cardNodes],['spell',spellNodes]])for(const [uid,el] of map)if(el.isConnected){const r=el.getBoundingClientRect();if(r.width)m.set(uid,{rect:r,el,kind,ghost:el.cloneNode(true)});}
  return m;
}
function centerRect(){const r=$('center').getBoundingClientRect();return new DOMRect(r.x+r.width/2-40,r.y+r.height/2-56,80,112);}
function pileRect(owner,zone){return document.querySelector(`#battle [data-pile="${owner}:${zone}"]`)?.getBoundingClientRect()||centerRect();}
function slotRect(owner,slot){return document.querySelector(`#${owner?'enemy':'own'}-field > .slot:nth-child(${slot+1})`)?.getBoundingClientRect()||centerRect();}
function enemyHandRect(){const r=$('enemy-hand').getBoundingClientRect();return new DOMRect(r.x+r.width/2-30,r.y,60,84);}
function originFor(uid,events){
  const ev=events.find(e=>e.uid===uid&&['draw','summon','equip'].includes(e.kind));
  if(ev?.kind==='draw')return ev.owner===0?pileRect(0,'deck'):enemyHandRect();
  if(ev?.kind==='summon'&&ev.owner===1)return enemyHandRect();
  return centerRect();
}
function destinationFor(uid){
  const f=engine.find(uid);if(f?.zone==='grave')return pileRect(f.owner,'grave');
  if(engine.s.pending?.card?.uid===uid)return centerRect();
  return null;
}
function travel(el,from,to,ms,extra={}){
  const sx=from.width/to.width,sy=from.height/to.height;
  el.style.transformOrigin='0 0';
  return motion(el,[{transform:`translate(${from.x-to.x}px,${from.y-to.y}px) scale(${sx},${sy})`,opacity:extra.fromOpacity??1},{transform:'none',opacity:1}],ms,{easing:EASE_OUT}).finally(()=>{el.style.transformOrigin='';});
}
function ghostTo(source,from,to,ms,{destroyed=false}={}){fxFront();
  const g=source.cloneNode(true);g.classList.add('ghost-card');Object.assign(g.style,{position:'fixed',left:from.x+'px',top:from.y+'px',width:from.width+'px',height:from.height+'px',margin:0,transformOrigin:'0 0',zIndex:''});fxLayer.append(g);
  const spin=destroyed?(Math.random()<.5?-24:24):0;
  const end=to?`translate(${to.x-from.x}px,${to.y-from.y}px) scale(${to.width/from.width},${to.height/from.height}) rotate(${spin}deg)`:'scale(.85)';
  return motion(g,[{transform:'none',opacity:1,filter:'brightness(1)'},{transform:end,opacity:to?.55:0,filter:destroyed?'brightness(.35)':'brightness(1)'}],destroyed?500:420,{easing:EASE_IN}).finally(()=>g.remove());
}
async function flipBoard(first,old,events){
  if(!dur(1)){flipOverrides.clear();return;}
  const jobs=[],current=new Map();
  for(const [kind,map] of [['card',cardNodes],['spell',spellNodes]])for(const [uid,el] of map)if(el.isConnected)current.set(uid,{el,kind});
  const summoned=new Set(events.filter(e=>e.kind==='summon').map(e=>e.uid));
  let draws=0;
  for(const [uid,{el}] of current){
    const last=el.getBoundingClientRect(),f=first.get(uid),override=flipOverrides.get(uid);if(!last.width)continue;
    if(override?.skip)continue;
    const c=engine.find(uid)?.c,rare=c&&definition(c).rare&&summoned.has(uid);
    const isDraw=events.some(e=>e.kind==='draw'&&e.uid===uid);
    if(rare){/* Raras passam pelo centro antes de pousar. */
      const from=f?f.rect:originFor(uid,events);el.style.visibility='hidden';
      jobs.push(revealCard(c,from,600).then(({ghost,rect})=>landFrom(ghost,from,rect,last,el)).then(()=>landSquash(el,c)));
    }else if(isDraw&&engine.find(uid)?.owner===0){
      const from=pileRect(0,'deck'),delay=90*draws++;el.style.visibility='hidden';
      jobs.push(wait(delay).then(()=>drawFlight(from,last,el)));
    }else if(f&&f.el===el){
      if(Math.abs(f.rect.x-last.x)+Math.abs(f.rect.y-last.y)+Math.abs(f.rect.width-last.width)>2)jobs.push(travel(el,f.rect,last,summoned.has(uid)?340:300).then(()=>summoned.has(uid)&&landSquash(el,c)));
    }else if(f)jobs.push(travel(el,f.rect,last,420));
    else{
      const from=originFor(uid,events);
      jobs.push(travel(el,from,last,420,{fromOpacity:.2}).then(()=>summoned.has(uid)&&landSquash(el,c)));
    }
  }
  const destroyed=new Set(events.filter(e=>e.kind==='destroy'||e.kind==='unequip').map(e=>e.uid));
  for(const [uid,f] of first){
    if(current.has(uid)||flipOverrides.get(uid)?.skip)continue;
    const announced=events.find(e=>e.kind==='announce'&&e.uid===uid);
    if(announced){const c=engine.s.pending?.card;if(c)jobs.push(revealCard(c,f.rect).then(({ghost,rect})=>motion(ghost,[{transform:`translate(${rect.x-f.rect.x}px,${rect.y-f.rect.y}px) scale(${rect.width/f.rect.width},${rect.height/f.rect.height})`,opacity:1},{transform:`translate(${rect.x-f.rect.x}px,${rect.y-f.rect.y}px) scale(${rect.width/f.rect.width*.9},${rect.height/f.rect.height*.9})`,opacity:0}],200).then(()=>ghost.remove())));continue;}
    jobs.push(ghostTo(f.ghost,f.rect,destinationFor(uid),420,{destroyed:destroyed.has(uid)}));
  }
  const enemyAnnounce=events.find(e=>e.kind==='announce'&&e.owner===1);
  if(enemyAnnounce&&engine.s.pending?.card)jobs.push(revealCard(engine.s.pending.card,enemyHandRect()).then(({ghost})=>motion(ghost,[{opacity:1},{opacity:0}],200).then(()=>ghost.remove())));
  if(events.some(e=>e.kind==='draw'&&e.owner===1))jobs.push(enemyDrawFlight());
  await Promise.all(jobs);
  for(const [uid,o] of flipOverrides){o.ghost?.remove();const el=nodeFor(uid);if(el)el.style.visibility='';}
  flipOverrides.clear();
}

/* Efeitos antes e depois do redesenho */
async function announce(text,kind='turn'){return turnBand(text,kind);}
function nodeFor(uid){return cardNodes.get(uid)||spellNodes.get(uid);}
function powerIn(state,c,stat){let n=cat.byId[c.card][stat]||0;for(const p of state.players)for(const sp of p.spells)if(sp&&sp.target===c.uid){const d=cat.byId[sp.card];if(d.effect===(stat==='attack'?'buffAttack':'buffDefense'))n+=d.value;}return n;}
function findIn(state,uid){for(const p of state.players)for(const zone of ['hand','field']){const c=p[zone].find(c=>c&&c.uid===uid);if(c)return c;}return null;}
function clashText(state,attackerUid,targetUid){const a=findIn(state,attackerUid),t=targetUid&&findIn(state,targetUid);if(!a)return null;const ap=powerIn(state,a,'attack');if(!t)return 'ATQ '+ap+' direto';const def=t.position==='defense',tp=powerIn(state,t,def?'defense':'attack');return `ATQ ${ap} × ${def?'DEF':'ATQ'} ${tp}`;}
function profileFor(owner){return $(owner===0?'own-profile':'enemy-profile');}
async function emergencySequence(old,owner,a,events){
  const ev=events.find(e=>e.kind==='summon'&&e.emergency),q=old.pending,card=findIn(old,a.card);if(!ev||!card)return;
  const target=slotRect(owner,a.slot),handEl=owner===0?nodeFor(a.card):null,from=handEl?.getBoundingClientRect()||enemyHandRect();
  if(handEl)handEl.style.visibility='hidden';
  const g=faceGhost({...card,position:'defense'},from);g.style.transformOrigin='0 0';
  await motion(g,moveFrames(from,target),340,{fill:'forwards'});
  await rollDie(10,ev.die.value);
  const attackerEl=nodeFor(q.attacker),die=ev.die.value;
  if(die>=8)await attackSequence(attackerEl,g,{clash:'Bloqueado'});
  else if(die>=4)await attackSequence(attackerEl,g,{clash:clashText({...old,players:old.players.map((p,i)=>i===owner?{...p,field:p.field.map((v,k)=>k===a.slot?{...card,position:'defense'}:v)}:p)},q.attacker,a.card)});
  else{await motion(g,[{transform:getComputedStyle(g).transform,filter:'brightness(1)'},{transform:getComputedStyle(g).transform+' rotate(18deg)',opacity:0,filter:'brightness(.3)'}],420,{fill:'forwards'});await attackSequence(attackerEl,profileFor(owner),{clash:clashText(old,q.attacker,null)});}
  flipOverrides.set(a.card,{skip:true,ghost:g});
}
async function animateBefore(old,owner,a,events){
  if(!dur(1))return;
  if(a.type==='jokenpo')await Promise.all([...document.querySelectorAll('.opening-versus b')].map(el=>motion(el,[{transform:'translateY(0)'},{transform:'translateY(-18px)'},{transform:'translateY(0)'},{transform:'translateY(-18px)'},{transform:'translateY(0)'},{transform:'translateY(-18px)'},{transform:'translateY(0)'}],720)));
  const attack=events.find(e=>e.kind==='attack');
  if(attack){
    const source=nodeFor(attack.uid),target=attack.target?nodeFor(attack.target):profileFor(1-attack.owner);
    if(engine.s.pending?.kind==='emergency')await attackSequence(source,target,{windupOnly:true});
    else await attackSequence(source,target,{clash:clashText(old,attack.uid,attack.target)});
  }
  if(a.type==='decline'&&old.pending)await attackSequence(nodeFor(old.pending.attacker),profileFor(owner),{clash:clashText(old,old.pending.attacker,null)});
  if(a.type==='emergency')await emergencySequence(old,owner,a,events);
  const resist=events.find(e=>e.kind==='resist');
  if(resist){const el=nodeFor(resist.uid);if(el)await motion(el,[{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],300);await rollDie(6,resist.die.value);}
  const doomed=events.filter(e=>e.kind==='destroy').map(e=>nodeFor(e.uid)).filter(el=>el?.isConnected&&el.style.visibility!=='hidden');
  await Promise.all(doomed.map(el=>motion(el,[{transform:'translateX(0)',filter:'brightness(1)'},{transform:'translateX(-6px)',filter:'brightness(2.4)'},{transform:'translateX(5px)'},{transform:'translateX(-4px)'},{transform:'translateX(3px)'},{transform:'translateX(-1px)'},{transform:'translateX(0)',filter:'brightness(1)'}],210,{easing:'linear'})));
}
async function animateAfter(old,owner,a,events){
  const s=engine.s;
  if(a.type==='jokenpo'){paintDecision();await Promise.all([...document.querySelectorAll('.opening-versus b')].map(el=>motion(el,[{transform:'scale(.5)',opacity:.3},{transform:'scale(1.15)',opacity:1,offset:.6},{transform:'scale(1)'}],380)));}
  if(!dur(1))return;
  for(const ev of events.filter(e=>e.kind==='energy'))await rollDie(20,ev.die.value);
  const jobs=[];
  for(let i=0;i<2;i++){
    const p=s.players[i],before=old.players[i],prefix=i?'enemy':'own';
    if(p.hp!==before.hp)jobs.push(hpChange(i,before.hp,p.hp));
    if(p.energy!==before.energy)jobs.push(motion($(prefix+'-profile').querySelector('.energy'),[{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],300,{easing:EASE_BACK}));
  }
  if(a.type==='position')jobs.push(motion(nodeFor(a.card),[{transform:'rotateY(80deg)'},{transform:'rotateY(0)'}],350));
  if(a.type==='confirm'){const ev=events.find(e=>['equip','lock'].includes(e.kind));if(ev?.kind==='equip')jobs.push(motion(nodeFor(ev.target),[{filter:'brightness(1)'},{filter:'brightness(1.9)'},{filter:'brightness(1)'}],450));}
  await Promise.all(jobs);
  const lock=events.find(e=>e.kind==='lock');if(lock)await turnBand(`${lock.owner===0?'Sua':'A'} próxima fase de ${lock.phase} ${lock.owner===0?'':'do bot '}está bloqueada`,'notice');
  const block=events.find(e=>e.kind==='skip');if(block)await turnBand(`Fase de ${block.phase} bloqueada`,'notice');
  if(events.some(e=>e.kind==='turn'))await turnBand((s.active===0?'Seu turno':'Turno do adversário')+' · '+s.turn);
  else if(a.type==='advance'&&!block)await turnBand('Fase de ataque','phase');
  if(a.type==='jokenpo')await turnBand(jokenpoHeadline(events.find(e=>e.kind==='jokenpo')),'phase');
}
function jokenpoHeadline(ev){if(!ev)return '';if(ev.winner===null)return 'Empate · de novo';return ev.winner===0?'Você venceu':'O bot venceu';}
