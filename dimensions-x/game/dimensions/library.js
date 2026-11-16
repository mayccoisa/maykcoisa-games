'use strict';
/* Coleção no estilo da biblioteca do duels.ink: grade densa de cartas impressas, filtros por ícone e custo,
   tamanho ajustável, ampliação opcional no hover e detalhe com carta inclinável e navegação por setas. */
const libraryState={dims:new Set(),costs:new Set(),type:'',density:1,hoverPreview:false,list:[]};
const DENSITY=[88,112,140,180],CARD_BASE=120,FILTER_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>';
try{const saved=JSON.parse(localStorage.getItem('dimensions-x-library-v1')||'null');if(saved){if(Number.isInteger(saved.density)&&saved.density>=0&&saved.density<DENSITY.length)libraryState.density=saved.density;libraryState.hoverPreview=!!saved.hoverPreview;}}catch{}
function saveLibraryPrefs(){try{localStorage.setItem('dimensions-x-library-v1',JSON.stringify({density:libraryState.density,hoverPreview:libraryState.hoverPreview}));}catch{}}
const COSTS=[...new Set(cat.cards.map(c=>c.cost))].sort((a,b)=>a-b);

$('dimension-toggles').innerHTML=cat.dimensions.map(d=>`<button type="button" class="dim-toggle" data-dim-filter="${d.id}" style="--dim:${d.color}" aria-pressed="false" title="${d.name}" aria-label="${d.name}"><span aria-hidden="true">${d.symbol}</span></button>`).join('');
$('cost-toggles').innerHTML=COSTS.map(n=>`<button type="button" class="cost-toggle" data-cost-filter="${n}" aria-pressed="false" aria-label="Custo ${n}">${n}</button>`).join('');
document.querySelectorAll('[data-dim-filter]').forEach(b=>b.onclick=()=>{if(libraryMode==='decks')return;const id=b.dataset.dimFilter;libraryState.dims.has(id)?libraryState.dims.delete(id):libraryState.dims.add(id);renderCollection();});
document.querySelectorAll('[data-cost-filter]').forEach(b=>b.onclick=()=>{const n=+b.dataset.costFilter;libraryState.costs.has(n)?libraryState.costs.delete(n):libraryState.costs.add(n);renderCollection();});
$('density-minus').onclick=()=>setDensity(libraryState.density-1);$('density-plus').onclick=()=>setDensity(libraryState.density+1);
$('hover-preview').checked=libraryState.hoverPreview;$('hover-preview').onchange=e=>{libraryState.hoverPreview=e.target.checked;saveLibraryPrefs();hideLibraryPreview();};
for(const id of ['card-search','card-sort'])$(id).addEventListener(id==='card-search'?'input':'change',renderCollection);
document.querySelectorAll('[data-type-filter]').forEach(b=>b.onclick=()=>{libraryState.type=libraryState.type===b.dataset.typeFilter?'':b.dataset.typeFilter;renderCollection();});
function setFiltersPanel(open){$('filters-panel').hidden=!open;$('filters-button').setAttribute('aria-expanded',String(open));}
$('filters-button').onclick=e=>{e.stopPropagation();setFiltersPanel($('filters-panel').hidden);};
$('filters-close').onclick=()=>setFiltersPanel(false);
$('filters-clear').onclick=()=>{libraryState.costs.clear();libraryState.type='';renderCollection();};
document.addEventListener('click',e=>{if(!$('filters-panel').hidden&&!e.target.closest('.filters-anchor'))setFiltersPanel(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('filters-panel').hidden){setFiltersPanel(false);$('filters-button').focus();}});
function setDensity(n){libraryState.density=Math.max(0,Math.min(DENSITY.length-1,n));saveLibraryPrefs();applyDensity();}
function applyDensity(){const w=DENSITY[libraryState.density];$('collection-grid').style.setProperty('--cw',w+'px');$('collection-grid').style.setProperty('--zoom',(w/CARD_BASE).toFixed(3));$('density-dots').innerHTML=DENSITY.map((_,i)=>`<i class="${i===libraryState.density?'on':''}"></i>`).join('');$('density-minus').disabled=libraryState.density===0;$('density-plus').disabled=libraryState.density===DENSITY.length-1;}

function openLibrary(mode){
  if(document.body.dataset.screen!=='library')libraryOrigin=document.body.dataset.screen;libraryMode=mode;
  $('library-title').textContent=mode==='decks'?'Decks':'Cartas';$('deck-picker').hidden=mode!=='decks';
  libraryState.dims=new Set(mode==='decks'?[preferences.dimension]:[]);libraryState.costs.clear();libraryState.type='';setFiltersPanel(false);
  $('card-search').value='';setScreen('library');applyDensity();renderCollection();$('library-back').focus();
}
function renderDeckPicker(){const current=[...libraryState.dims][0];$('deck-picker').innerHTML=cat.dimensions.map(d=>`<button class="deck-choice ${current===d.id?'active':''}" data-deck="${d.id}" aria-pressed="${current===d.id}"><img src="${esc(cat.byId[d.id+'-c3'].art)}" alt=""><span><small>${d.theme}</small><strong>${d.name}</strong><small>40 cartas · ${d.energy}</small></span></button>`).join('');document.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>{libraryState.dims=new Set([b.dataset.deck]);preferences.dimension=b.dataset.deck;savePreferences();renderCollection();});}
function filteredCards(){
  const query=normalize($('card-search').value),type=libraryState.type,sort=$('card-sort').value,{dims,costs}=libraryState;
  return cat.cards.filter(c=>(!dims.size||dims.has(c.dimension))&&(!costs.size||costs.has(c.cost))&&(!type||c.type===type)&&normalize(c.name+' '+c.text).includes(query))
    .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'pt-BR'):sort==='attack'?(b.attack||0)-(a.attack||0)||a.cost-b.cost:a.cost-b.cost||a.dimension.localeCompare(b.dimension)||a.name.localeCompare(b.name,'pt-BR'));
}
function renderCollection(){
  const cards=filteredCards(),decks=libraryMode==='decks',deckDim=decks?[...libraryState.dims][0]:null;libraryState.list=cards.map(c=>c.id);
  $('collection-count').textContent=cards.length+' carta'+(cards.length===1?'':'s');
  document.querySelectorAll('[data-dim-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(libraryState.dims.has(b.dataset.dimFilter)));b.disabled=decks;});
  document.querySelectorAll('[data-cost-filter]').forEach(b=>b.setAttribute('aria-pressed',String(libraryState.costs.has(+b.dataset.costFilter))));
  document.querySelectorAll('[data-type-filter]').forEach(b=>b.setAttribute('aria-pressed',String(libraryState.type===b.dataset.typeFilter)));
  const active=[...(libraryState.type?[[libraryState.type==='creature'?'Criaturas':'Mágicas',()=>{libraryState.type='';}]]:[]),...[...libraryState.costs].sort((a,b)=>a-b).map(n=>['Custo: '+n,()=>libraryState.costs.delete(n)])];
  $('filters-button').innerHTML=FILTER_ICON+'Filtros'+(active.length?` (${active.length})`:'');$('filters-button').classList.toggle('active',active.length>0);
  $('active-filters').replaceChildren(...active.map(([text,remove])=>{const b=document.createElement('button');b.type='button';b.className='active-chip';b.textContent='× '+text;b.onclick=()=>{remove();renderCollection();};return b;}));
  $('deck-summary').textContent=decks?`${dim(deckDim).name}: 40 cartas, 15 identidades. ${dim(deckDim).style} Deck pronto para jogar. Os três decks têm a mesma curva de custo e efeitos equivalentes.`:'';
  $('deck-summary').hidden=!decks;if(decks)renderDeckPicker();
  $('collection-grid').innerHTML=cards.length?cards.map(d=>{const copies=dim(d.dimension).deck.filter(id=>id===d.id).length;return `<div class="collection-entry">${cardHtml({card:d.id,uid:d.id},true)}${decks?`<span class="copies" aria-label="${copies} cópias no deck">×${copies}</span>`:''}</div>`;}).join(''):'<p class="empty-collection">Nenhuma carta encontrada. Tente outro nome ou ajuste os filtros.</p>';
  $('collection-grid').querySelectorAll('[data-card]').forEach(b=>{b.onclick=()=>{hideLibraryPreview();openCardDetail(b.dataset.card,libraryState.list);};b.onmouseenter=()=>showLibraryPreview(b);b.onmouseleave=hideLibraryPreview;});
}

/* Ampliação opcional no hover */
function showLibraryPreview(el){if(!libraryState.hoverPreview)return;const id=el.dataset.card,box=$('library-preview');box.innerHTML=bigCardHtml(id);box.classList.add('on');const r=el.getBoundingClientRect(),w=box.offsetWidth,h=box.offsetHeight;let x=r.right+12;if(x+w>innerWidth-8)x=r.left-12-w;box.style.left=Math.max(8,x)+'px';box.style.top=Math.max(8,Math.min(innerHeight-h-8,r.top+r.height/2-h/2))+'px';}
function hideLibraryPreview(){$('library-preview').classList.remove('on');}
function bigCardHtml(id){return cardHtml({card:id,uid:'preview-'+id},true).replace(/src="([^"]*)\/miniaturas\/([^"]*)"/,'src="$1/$2"');}

/* Detalhe da carta */
let detailList=[],detailIndex=-1;
function chip(text,extra=''){return `<span class="cd-chip ${extra}">${text}</span>`;}
function openCardDetail(id,list){
  const d=cat.byId[id];if(!d)return;clearTimeout(botTimer);
  if(list)detailList=list;else if(!detailList.includes(id))detailList=[id];detailIndex=detailList.indexOf(id);
  const world=dim(d.dimension),copies=world.deck.filter(x=>x===d.id).length;
  const chips=[chip(world.name,'dim'),chip(d.type==='creature'?'Criatura':'Mágica'),chip('Custo: '+d.cost),d.rare?chip('Rara','rare'):'',d.type==='spell'?chip(d.persistent?'Persistente':'Imediata'):'',d.tribute?chip('Exige tributo'):'',d.dice?chip('Dado: '+d.dice):'',chip(copies+(copies===1?' cópia':' cópias')+' no deck')].join('');
  const stats=d.type==='creature'?[['CUSTO',d.cost],['ATAQUE',d.attack],['DEFESA',d.defense]]:[['CUSTO',d.cost]];
  const abilityTitle=d.type==='spell'?'EFEITO':d.effect?'HABILIDADE':d.tribute?'INVOCAÇÃO':'CRIATURA';
  const hint=d.type==='creature'?'Invoque em ataque ou em defesa. Criatura nova só ataca no seu próximo turno.':d.persistent?'Ocupa uma das três vagas de mágica e sai do jogo junto com o portador.':'Resolve e vai para o descarte. O adversário lê a carta antes de ela resolver.';
  $('detail-content').innerHTML=`<div class="cd-head"><h2 id="detail-title">${esc(d.name)}</h2><div class="cd-chips" style="--dim:${world.color}">${chips}</div></div><div class="cd-body"><div class="cd-tilt"><div class="cd-card">${bigCardHtml(d.id)}<i class="cd-shine" aria-hidden="true"></i></div></div><div class="cd-info"><div class="cd-stats">${stats.map(([k,v])=>`<div><b>${v}</b><small>${k}</small></div>`).join('')}</div><div class="cd-traits">${chip(world.theme)}${chip('Energia: '+world.energy)}</div><h3>${abilityTitle}</h3><p>${esc(d.text)}</p><p class="cd-hint">${hint}</p><p class="cd-keys">${detailList.length>1?`${detailIndex+1} de ${detailList.length} · ← → para navegar · `:''}Esc para fechar</p></div></div>`;
  $('detail-prev').hidden=$('detail-next').hidden=detailList.length<2;
  bindTilt($('detail-content').querySelector('.cd-tilt'));
  if(!$('card-detail').open)$('card-detail').showModal();
}
function stepDetail(n){if(detailList.length<2)return;detailIndex=(detailIndex+n+detailList.length)%detailList.length;openCardDetail(detailList[detailIndex]);}
$('detail-prev').onclick=()=>stepDetail(-1);$('detail-next').onclick=()=>stepDetail(1);
$('card-detail').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();stepDetail(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepDetail(-1);}});
$('close-detail').onclick=()=>$('card-detail').close();$('card-detail').addEventListener('close',scheduleBot);
$('card-detail').addEventListener('click',e=>{if(e.target===$('card-detail'))$('card-detail').close();});
/* Inclinação 3D que segue o ponteiro, até 9° em Y e 7° em X, com reflexo branco discreto. */
function bindTilt(box){
  const card=box.querySelector('.cd-card'),shine=box.querySelector('.cd-shine');
  box.onpointermove=e=>{if(preferences.motion)return;const r=box.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.transform=`rotateY(${(x-.5)*18}deg) rotateX(${(.5-y)*14}deg)`;shine.style.background=`radial-gradient(circle at ${x*100}% ${y*100}%,#ffffff40,transparent 55%)`;};
  box.onpointerleave=()=>{card.style.transform='';shine.style.background='';};
}
applyDensity();
