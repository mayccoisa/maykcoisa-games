'use strict';
const preferenceKey='dimensions-x-preferences-v1';
const defaults={name:'Viajante',speed:'normal',motion:matchMedia('(prefers-reduced-motion: reduce)').matches,dimension:'medieval'};
let preferences={...defaults},libraryMode='cards',libraryOrigin='home',toastTimer;
try{const saved=JSON.parse(localStorage.getItem(preferenceKey)||'null');if(saved&&typeof saved==='object'){
  if(typeof saved.name==='string')preferences.name=saved.name.trim().slice(0,24)||defaults.name;
  if(['slow','normal','fast'].includes(saved.speed))preferences.speed=saved.speed;
  if(typeof saved.motion==='boolean')preferences.motion=saved.motion;
  if(cat.dimensions.some(d=>d.id===saved.dimension))preferences.dimension=saved.dimension;
}}catch{}
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function savePreferences(){try{localStorage.setItem(preferenceKey,JSON.stringify(preferences));return true;}catch{notify('Preferências aplicadas. Este navegador não permitiu salvá-las.');return false;}}
function applyPreferences(){document.body.classList.toggle('reduce-motion',preferences.motion);$('player-label').textContent=preferences.name;}
function setScreen(screen){clearTimeout(botTimer);if(screen!=='battle')document.getElementById('decision').close();document.body.dataset.screen=screen;for(const id of ['home','library','battle'])$(id).hidden=id!==screen;$('resume-button').hidden=!engine||engine.s.winner!==null;$('new').textContent=engine?'Nova partida':'Jogar';if(screen==='battle')render();window.scrollTo(0,0);if(typeof updateTutorial==='function')updateTutorial();}
function enterBattle(){preferences.dimension=$('your-dimension').value;savePreferences();setScreen('battle');if(!$('decision').open)$('battle-menu-button').focus();}
function showHome(){setScreen('home');$('play-button').focus();}
const worldCopy={medieval:['Toda lenda começa<br>com uma escolha.','Entre muralhas antigas e magia viva, encontre a força do seu próximo duelo.'],urbana:['A cidade pulsa.<br>Sua vez de agir.','Tecnologia, coragem e energia nas ruas. Encontre seu lugar no Distrito Aurora.'],espacial:['Além das estrelas,<br>um novo confronto.','Explore a fronteira do Nexo Ômega. O próximo movimento pode mudar tudo.']};
function featureWorld(id){const d=dim(id);$('home-art').src=cat.byId[id+'-c3'].art;$('world-label').textContent=d.name.toUpperCase();$('world-label').dataset.id=id;$('world-title').innerHTML=typeof LORE!=='undefined'?LORE[id].motto:worldCopy[id][0];$('world-description').textContent=typeof LORE!=='undefined'?LORE[id].short:worldCopy[id][1];$('featured-name').textContent=cat.byId[id+'-c3'].name;document.querySelectorAll('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));}
$('world-switcher').innerHTML=cat.dimensions.map(d=>`<button data-world="${d.id}" aria-pressed="false">${d.name}</button>`).join('');
document.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>featureWorld(b.dataset.world));
function openSettings(){clearTimeout(botTimer);$('player-name').value=preferences.name;$('bot-speed').value=preferences.speed;$('reduce-motion').checked=preferences.motion;$('settings').showModal();}
$('settings-form').onsubmit=e=>{e.preventDefault();preferences.name=$('player-name').value.trim().slice(0,24)||'Viajante';preferences.speed=$('bot-speed').value;preferences.motion=$('reduce-motion').checked;applyPreferences();const saved=savePreferences();$('settings').close();if(document.body.dataset.screen==='battle')render();if(saved)notify('Preferências salvas.');};
$('cancel-settings').onclick=()=>$('settings').close();$('settings').addEventListener('close',scheduleBot);
$('settings-button').onclick=openSettings;$('profile-button').onclick=()=>{openSettings();$('player-name').focus();$('player-name').select();};
$('home-button').onclick=showHome;$('tutorial-button').onclick=()=>startTutorial();$('setup-tutorial').onclick=()=>startTutorial();$('play-button').onclick=setup;$('resume-button').onclick=()=>setScreen('battle');
$('cancel-setup').onclick=()=>$('setup').close();$('setup').addEventListener('close',scheduleBot);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
$('cards-button').onclick=()=>openLibrary('cards');$('catalog').onclick=()=>openLibrary('cards');$('decks-button').onclick=()=>openLibrary('decks');$('library-back').onclick=()=>{if(libraryOrigin==='battle')setScreen('battle');else showHome();};
const openDetailedRules=$('rules').onclick;
$('rules').onclick=()=>{openDetailedRules();$('overlay-title').textContent='Como funciona';$('overlay-content').insertAdjacentHTML('afterbegin',`<p>Escolha uma dimensão, invoque criaturas e reduza a vida do adversário de 4.000 a zero.</p><div class="guide-steps"><section><b>01</b><h3>Prepare sua jogada</h3><p>A cada turno, sua energia aumenta e recarrega. Compre uma carta e observe os custos da sua mão.</p></section><section><b>02</b><h3>Monte seu campo</h3><p>Selecione uma criatura, escolha uma vaga e invoque em ataque ou defesa. Use mágicas para fortalecer sua estratégia.</p></section><section><b>03</b><h3>Escolha o confronto</h3><p>Avance para o ataque e selecione um alvo. Criaturas recém-invocadas precisam esperar seu próximo turno para atacar.</p></section></div><h3>Regras para consultar durante o duelo</h3>`);};
applyPreferences();featureWorld(preferences.dimension);setScreen('home');

$('battle-menu-button').onclick=()=>{clearTimeout(botTimer);$('battle-menu').showModal();};
$('battle-resume').onclick=()=>$('battle-menu').close();
$('battle-menu').addEventListener('close',scheduleBot);
for(const [id,callback] of [['battle-rules',()=>$('rules').click()],['battle-cards',()=>openLibrary('cards')],['battle-settings',openSettings],['battle-home',showHome]])$(id).onclick=()=>{$('battle-menu').close();callback();};
function updateMatchup(){for(const side of ['your','bot']){const world=dim($(side+'-dimension').value);const card=cat.byId[world.id+'-c3'];$(side+'-deck-art').src=card.art;$(side+'-deck-art').alt='Deck '+world.name;$(side+'-deck-name').textContent=world.name;}}
for(const side of ['your','bot'])$(side+'-dimension').addEventListener('change',updateMatchup);
updateMatchup();
