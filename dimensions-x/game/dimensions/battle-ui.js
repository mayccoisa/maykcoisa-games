'use strict';
const actionPanel=document.querySelector('.actions-panel');
function decisionKind(){const s=engine.s,actions=engine.actions(0);if(s.winner!==null)return null;if(s.phase==='abertura')return 'opening';if(s.pending?.kind==='emergency'&&s.pending.defender===0)return 'emergency';if(s.pending?.kind==='read'&&s.pending.reader===0)return 'reading';if(actions.some(a=>a.type==='discard'))return 'discard';return null;}
function openingContext(s){
  const last=s.log.filter(e=>e.kind==='jokenpo').at(-1);
  const verdict=!last?'Escolha sua mão.':last.winner===null?`Empate: ${HAND_NAMES[last.hands[0]]} contra ${HAND_NAMES[last.hands[1]]}. Escolha de novo.`:last.winner===0?`Você venceu: ${HAND_NAMES[last.hands[0]]} vence ${HAND_NAMES[last.hands[1]]}. Escolha quem começa.`:`O bot venceu: ${HAND_NAMES[last.hands[1]]} vence ${HAND_NAMES[last.hands[0]]}.`;
  const hands=last?last.hands.map(h=>HANDS[h]):[HANDS[0],HANDS[0]];
  return `<p>Quem vencer escolhe se começa ou joga em segundo.</p><div class="opening-versus"><span>${esc(preferences.name)}<b>${hands[0]}</b></span><strong>VS</strong><span>Bot<b>${hands[1]}</b></span></div><p class="opening-result">${esc(verdict)}</p>${s.chooser===1?'<p>O bot está escolhendo quem começa.</p>':''}`;
}
function paintDecision(){
  const s=engine.s,kind=decisionKind(),actions=engine.actions(0);if(!kind)return;
  $('decision-title').textContent=kind==='opening'?(s.chooser===null?'Pedra, papel e tesoura':'Quem começa o duelo?'):kind==='emergency'?'Defesa desesperada':kind==='reading'?'O adversário jogou uma mágica':'Escolha o descarte';
  $('decision-context').innerHTML=kind==='opening'?openingContext(s):kind==='discard'?'<p>Sua mão passou de 10 cartas. Escolha qual descartar para continuar.</p>':'';
  $('decision-cards').innerHTML=kind==='emergency'?s.players[0].hand.filter(c=>actions.some(a=>a.type==='emergency'&&a.card===c.uid)).map(c=>cardHtml(c)).join(''):kind==='reading'?`<img class="announced-art" src="${esc(definition(s.pending.card).art)}" alt="${esc(definition(s.pending.card).name)}">`:'';
  if(kind==='emergency')bindCards($('decision-cards'));
  $('decision-controls').append($('hint'),$('actions'));
}
function updateBattleUI(){
  const actions=engine.actions(0),box=$('decision');
  /* Enquanto a fila de animação toca, a decisão não abre nem muda: ela aparece quando a mesa termina de se mover. */
  if(!battleBusy){
    if(decisionKind()&&document.body.dataset.screen==='battle'&&!(engine.isTutorial&&!engine.current?.seq)){paintDecision();if(!box.open)box.showModal();}
    else{
      if(box.open)box.close();
      actionPanel.append($('hint'),$('actions'));
      const general=[...$('actions').querySelectorAll('button')].filter(b=>['advance','end'].includes(b.dataset.action));
      const bar=document.createElement('div');bar.className='phase-actions';for(const b of general)bar.append(b);($('center').querySelector('.turn-line')||$('center')).append(bar);$('center').append(guide);
    }
  }
  for(const el of document.querySelectorAll('#hand [data-card],#own-field [data-card],#enemy-field [data-card]')){
    const uid=el.dataset.card;const target=actions.some(a=>a.card===selected&&a.target===uid);el.classList.toggle('legal-target',target);el.classList.toggle('playable',actions.some(a=>a.card===uid));
    if(target)el.title='Clique para escolher este alvo';
  }
  const direct=actions.find(a=>a.type==='attack'&&a.card===selected&&a.target===null);
  $('enemy-profile').classList.toggle('legal-target',!!direct);$('enemy-profile').title=direct?'Clique para atacar diretamente':'';
  updateGuidance();drawAim();updateActionPop();updateTutorial();
}
$('decision').addEventListener('cancel',e=>e.preventDefault());
$('enemy-profile').addEventListener('click',()=>{if(battleBusy||!engine)return;const a=engine.actions(0).find(a=>a.type==='attack'&&a.card===selected&&a.target===null);if(a)act(0,a);});
