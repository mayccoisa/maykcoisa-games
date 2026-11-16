'use strict';
/* Lore das dimensões (docs/LORE-dimensions-x.md). Menu "Lore" com seleção de mundo, premissa da home e desfecho do duelo. */
const LORE={
  medieval:{motto:'Toda lenda começa com uma escolha.',short:'Atrás do Véu, a Fonte sustenta o reino com Essência. Mas o Véu está afinando.',
    tone:'Solene, honra e sacrifício, luz dourada de fim de tarde.',
    story:['Eldoria vive atrás do Véu, uma cortina de luz antiga que a protege das outras dimensões. A Fonte sob o reino produz a Essência, a energia que sustenta o Véu e dá vida às criaturas.','A cada geração, alguém precisa descer à Fonte e renová-lo. Os guerreiros de Eldoria duelam no Cruzamento para provar que o reino merece continuar fechado em si mesmo, e para trazer de volta o que o Véu perde.'],
    people:[['Cavaleira do Amanhecer','Acredita que o Véu se sustenta com coragem.'],['Arcanista do Véu','Acha que se sustenta com estudo. As duas discutem há anos e protegem o mesmo reino.'],['Grifo das Torres e Rainha dos Dragões','Guardiões que escolheram servir, não súditos. Por isso exigem tributo para serem chamados.']],
    win:'O Véu se renova. Eldoria guarda mais uma geração.',lose:'O Véu perde uma camada de luz. Alguém precisará descer à Fonte.'},
  urbana:{motto:'A cidade não dorme. Ela responde.',short:'A Malha elétrica liga a metrópole, e o Cruzamento chegou como um apagão que não acaba.',
    tone:'Urgência, rua molhada, neon e rádio chiando; companheirismo de plantão.',
    story:['Aurora é uma metrópole costurada por uma rede elétrica viva, a Malha. A cidade ganhou esse nome no dia em que o primeiro apagão geral terminou com o amanhecer ligado por voluntários.','Quando as fronteiras afinaram, o Cruzamento apareceu como um apagão que não acaba. O Distrito entendeu que ou segura a linha, ou perde a luz de vez.'],
    people:[['Técnica da Subestação','Mantém tudo de pé sem ser vista.'],['Mensageiro dos Telhados','Leva ordens onde o sinal não chega.'],['Comandante Aurora','Nunca pediu o cargo, só ficou quando os outros foram embora.'],['Titã Industrial','Construído para reerguer prédios, hoje defende o Distrito.']],
    win:'As luzes voltam. A Malha segura mais uma noite.',lose:'A Malha falha. Aurora apaga, por enquanto.'},
  espacial:{motto:'O vazio também tem um protocolo.',short:'A estação orbita uma estrela morta e contém o que não entende. O Cruzamento é a maior anomalia já registrada.',
    tone:'Frio, preciso, curioso; silêncio de casco e pulso de reator.',
    story:['O Nexo é uma frota-estação em órbita de uma estrela morta, mantida por reatores de íons. Seus habitantes são exploradores e engenheiros de contenção: tudo o que acharam no vazio, estudaram, selaram e guardaram.','O Cruzamento é, para o Nexo, a maior anomalia já registrada, e a única que se pode medir de dentro. O Almirante do Vazio manda duelar porque duelo é o único protocolo de contato que o Cruzamento respeita.'],
    people:[['Engenheira de Dobra','Sabe que o Nexo está seguro por pouco.'],['Operador do Reator','Nunca viu o espaço aberto.'],['Almirante do Vazio','Viu e voltou diferente.'],['Leviatã Mecânico','Era uma contenção que cresceu demais e hoje luta ao lado de quem o prendeu.']],
    win:'A anomalia fica registrada e contida. O Nexo segue em órbita.',lose:'A contenção cede. O Nexo anota a falha e recalcula.'}
};
const LORE_INTRO='Existe um ponto onde todos os mundos se tocam: o Cruzamento. Quando duas dimensões se aproximam demais, a disputa vira duelo, e as cartas são ecos de seres e objetos reais, chamados pela energia de cada mundo. Nenhuma dimensão é superior: cada uma só fala a mesma vontade em outra língua.';
let loreCurrent='medieval';
(function buildLore(){
  document.body.insertAdjacentHTML('beforeend','<dialog id="lore" aria-labelledby="lore-title"><button id="lore-close" class="lore-close" type="button" aria-label="Fechar lore">×</button><p class="eyebrow">LORE · O CRUZAMENTO</p><h1 id="lore-title">Três mundos, um ponto de encontro.</h1><p id="lore-intro"></p><div id="lore-tabs" class="lore-tabs" role="tablist" aria-label="Dimensões"></div><article id="lore-body" class="lore-body" role="tabpanel"></article></dialog>');
  $('lore-intro').textContent=LORE_INTRO;
  $('lore-tabs').innerHTML=cat.dimensions.map(d=>`<button type="button" role="tab" data-lore="${d.id}" style="--c:${d.color}">${d.name}</button>`).join('');
  $('lore-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-lore]');if(b)showLore(b.dataset.lore);});
  $('lore-close').onclick=()=>$('lore').close();
  $('lore').addEventListener('close',()=>{if(typeof scheduleBot==='function')scheduleBot();});
})();
const loreEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function showLore(id){
  const d=dim(id),l=LORE[id],card=cat.byId[id+'-c4']||cat.byId[id+'-c3'];loreCurrent=id;
  document.querySelectorAll('[data-lore]').forEach(b=>{const on=b.dataset.lore===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  $('lore-body').style.setProperty('--c',d.color);
  $('lore-body').innerHTML=`<img class="lore-art" src="${card.art}" alt="${loreEsc(card.name)}"><div class="lore-text"><p class="eyebrow">${loreEsc(d.theme.toUpperCase())} · ${loreEsc(d.energy.toUpperCase())}</p><h2>${loreEsc(d.name)}</h2><blockquote>${loreEsc(l.motto)}</blockquote>${l.story.map(p=>`<p>${loreEsc(p)}</p>`).join('')}<p class="lore-tone"><b>Tom:</b> ${loreEsc(l.tone)}</p><h3>Quem vive aqui</h3><ul>${l.people.map(([n,t])=>`<li><b>${loreEsc(n)}</b> ${loreEsc(t)}</li>`).join('')}</ul></div>`;
}
function openLore(id){if(typeof clearTimeout==='function'&&typeof botTimer!=='undefined')clearTimeout(botTimer);showLore(id||loreCurrent);if(!$('lore').open)$('lore').showModal();}
function addLoreEntryPoints(){
  $('lore-nav').onclick=()=>openLore(preferences.dimension);
  $('lore-link').onclick=()=>openLore($('world-label').dataset.id||preferences.dimension);
}
addLoreEntryPoints();featureWorld(preferences.dimension);showLore(preferences.dimension);
/* Frase de mundo na preparação do duelo */
for(const side of ['your','bot']){
  const cover=$(side+'-deck-name').parentElement,line=document.createElement('small');line.className='matchup-motto';cover.after(line);
  const set=()=>{line.textContent=LORE[$(side+'-dimension').value]?.motto||'';};
  $(side+'-dimension').addEventListener('change',set);set();
}
