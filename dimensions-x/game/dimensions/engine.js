(function(root){
  'use strict';
  const catalog=typeof module!=='undefined'?require('./catalog.js'):root.DXCatalog;
  const clone=x=>JSON.parse(JSON.stringify(x));
  class Engine{
    constructor(dims=['medieval','urbana'],seed=12345){
      Engine.validateCatalog(catalog);
      if(dims.length!==2||dims.some(d=>!catalog.dimensions.find(x=>x.id===d)))throw Error('Selecione duas dimensões válidas.');
      this.rng=seed>>>0;this.serial=0;this.commands=[];this.events=[];this.s={version:catalog.version,turn:0,active:-1,phase:'abertura',chooser:null,pending:null,winner:null,log:[],players:dims.map(d=>({dimension:d,hp:4000,capacity:0,energy:0,deck:[],hand:[],field:Array(5).fill(null),spells:Array(3).fill(null),grave:[],skip:{},emergencyUsed:false}))};
      for(const p of this.s.players){
        const dim=catalog.dimensions.find(d=>d.id===p.dimension);this.validateDeck(dim.deck,p.dimension);
        p.deck=dim.deck.map(id=>this.instance(id));
        for(let i=p.deck.length-1;i>0;i--){const j=this.roll(i+1)-1;[p.deck[i],p.deck[j]]=[p.deck[j],p.deck[i]];}
        for(let i=0;i<5;i++)p.hand.push(p.deck.pop());
        this.ensureOpening(p);
      }
      this.log('Dimensions X · partida preparada.');
    }
    validateDeck(deck,dim){
      if(deck.length!==40)throw Error('O deck deve ter 40 cartas.');const counts={};
      for(const id of deck){const c=catalog.byId[id];if(!c||c.dimension!==dim)throw Error('Deck cruza dimensões ou contém carta desconhecida.');counts[id]=(counts[id]||0)+1;if(counts[id]>c.limit)throw Error('Limite de cópias excedido.');}
      if(!deck.some(id=>this.openingEligible(catalog.byId[id])))throw Error('O deck precisa de uma criatura de custo 1 sem tributo para a abertura.');
      return true;
    }
    openingEligible(c){return c.type==='creature'&&c.cost===1&&!c.tribute;}
    ensureOpening(p){
      if(p.hand.some(c=>this.openingEligible(this.def(c))))return;
      const candidates=p.deck.map((c,i)=>this.openingEligible(this.def(c))?i:-1).filter(i=>i>=0);
      if(!candidates.length)throw Error('Não há criatura elegível para a abertura.');
      const deckIndex=candidates[this.roll(candidates.length)-1],handIndex=this.roll(p.hand.length)-1;
      [p.hand[handIndex],p.deck[deckIndex]]=[p.deck[deckIndex],p.hand[handIndex]];
      for(let i=p.deck.length-1;i>0;i--){const j=this.roll(i+1)-1;[p.deck[i],p.deck[j]]=[p.deck[j],p.deck[i]];}
    }
    static validateCatalog(source){
      const ids=new Set();
      const fail=(c,reason)=>{throw Error('Carta indisponível: '+(c.name||c.id||'sem identificação')+'. '+reason);};
      for(const c of source.cards){
        if(!c.id||ids.has(c.id))fail(c,'Identidade ausente ou duplicada.');ids.add(c.id);
        if(!source.dimensions.some(d=>d.id===c.dimension))fail(c,'Dimensão desconhecida.');
        if(!Number.isInteger(c.cost)||c.cost<0||!Number.isInteger(c.limit)||c.limit<1||c.limit>3)fail(c,'Custo ou limite inválido.');
        if(c.type==='creature'){
          if(!Number.isInteger(c.attack)||c.attack<0||!Number.isInteger(c.defense)||c.defense<0)fail(c,'Atributos de combate inválidos.');
          if(![null,undefined,'energy','draw'].includes(c.effect))fail(c,'Habilidade de criatura não implementada.');
          if(c.effect==='energy'&&c.dice!=='d20')fail(c,'Gerador exige d20.');
        }else if(c.type==='spell'){
          if(!['buffAttack','buffDefense','heal','save','skip'].includes(c.effect))fail(c,'Efeito de mágica não implementado.');
          if(['buffAttack','buffDefense'].includes(c.effect)&&(!c.persistent||c.target!=='own'))fail(c,'Equipamento exige persistência e alvo próprio.');
          if(['buffAttack','buffDefense','heal'].includes(c.effect)&&(!Number.isInteger(c.value)||c.value<=0))fail(c,'Valor do efeito inválido.');
          if(c.effect==='save'&&c.target!=='enemy')fail(c,'Resistência exige alvo inimigo.');
          if(c.effect==='skip'&&!['compra','ataque'].includes(c.phase))fail(c,'Fase de bloqueio não implementada.');
          if(['heal','skip'].includes(c.effect)&&c.target)fail(c,'Este efeito não usa alvo de criatura.');
          if(['heal','save','skip'].includes(c.effect)&&c.persistent)fail(c,'Este efeito deve ser imediato.');
        }else fail(c,'Tipo não implementado.');
      }
      return true;
    }
    instance(id){return {uid:'dx'+(++this.serial),card:id,position:'attack',entered:0,attacked:false,changed:false};}
    roll(faces){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return Math.floor(this.rng/4294967296*faces)+1;}
    log(text,event={}){const entry={turn:this.s.turn,text,...event};this.s.log.push(entry);this.events.push(entry);}
    def(c){return catalog.byId[c.card];}
    find(uid){for(let owner=0;owner<2;owner++){const p=this.s.players[owner];for(const zone of ['hand','field','spells','grave']){const index=p[zone].findIndex(c=>c&&c.uid===uid);if(index>=0)return {c:p[zone][index],p,owner,zone,index};}}return null;}
    power(c,stat){let n=this.def(c)[stat]||0;for(const p of this.s.players)for(const sp of p.spells)if(sp&&sp.target===c.uid){const d=this.def(sp);if(d.effect===(stat==='attack'?'buffAttack':'buffDefense'))n+=d.value;}return n;}
    draw(owner){const p=this.s.players[owner];if(!p.deck.length){this.s.winner=1-owner;this.log('Compra impossível: derrota de '+catalog.dimensions.find(d=>d.id===p.dimension).name+'.',{kind:'deckout',owner});return;}const c=p.deck.pop();p.hand.push(c);this.log('Jogador '+(owner+1)+' comprou uma carta.',{kind:'draw',owner,uid:c.uid});}
    destroy(uid){const found=this.find(uid);if(!found||found.zone!=='field')return;const {c,p,index,owner}=found;p.field[index]=null;p.grave.push(c);this.log(this.def(c).name+' foi destruída.',{kind:'destroy',owner,uid});for(const [o,pl] of this.s.players.entries())for(let i=0;i<3;i++)if(pl.spells[i]?.target===uid){const sp=pl.spells[i];pl.grave.push(sp);pl.spells[i]=null;this.log(this.def(sp).name+' foi ao descarte com o portador.',{kind:'unequip',owner:o,uid:sp.uid});}}
    damage(owner,n){const p=this.s.players[owner];p.hp=Math.max(0,p.hp-Math.max(0,n));this.log('Jogador '+(owner+1)+' recebeu '+n+' de dano.',{kind:'damage',owner,amount:n,hp:p.hp});if(p.hp===0){this.s.winner=1-owner;this.log('Partida encerrada por vida.',{kind:'winner',owner:1-owner});}}
    begin(owner){
      this.s.active=owner;this.s.turn++;const p=this.s.players[owner];p.capacity=Math.min(10,p.capacity+1);p.energy=p.capacity;
      for(const pl of this.s.players)pl.emergencyUsed=false;
      for(const c of p.field)if(c){c.attacked=false;c.changed=false;}
      this.s.phase='compra';this.log('Turno '+this.s.turn+' · Jogador '+(owner+1)+' · energia '+p.energy+'.',{kind:'turn',owner,energy:p.energy});
      if(p.skip.compra){delete p.skip.compra;this.log('Fase de compra bloqueada neste turno.',{kind:'skip',owner,phase:'compra'});}else if(this.s.turn!==1)this.draw(owner);
      if(this.s.winner===null)this.s.phase='invocação';
    }
    actions(owner){
      const s=this.s;if(s.winner!==null)return [];
      if(s.phase==='abertura'){
        if(s.chooser===null)return owner===0?[0,1,2].map(hand=>({type:'jokenpo',hand})):[];
        return owner===s.chooser?[{type:'order',first:owner},{type:'order',first:1-owner},{type:'cede'}]:[];
      }
      if(s.pending){const q=s.pending;if(q.kind==='read')return owner===q.reader?[{type:'confirm'}]:[];
        if(q.kind==='emergency'&&owner===q.defender){const p=s.players[owner];return [{type:'decline'},...p.hand.filter(c=>this.def(c).type==='creature'&&this.def(c).cost<=p.capacity).flatMap(c=>p.field.map((v,slot)=>v===null?{type:'emergency',card:c.uid,slot}:null).filter(Boolean))];}return [];
      }
      if(owner!==s.active)return [];const p=s.players[owner],enemy=s.players[1-owner];
      if(p.hand.length>10)return p.hand.map(c=>({type:'discard',card:c.uid}));
      const acts=[];
      if(s.phase==='invocação'){
        for(const c of p.hand){const d=this.def(c);
          if(d.type==='creature'){
            const tributes=[...(d.tribute?[]:[null]),...p.field.filter(Boolean)];
            for(const tr of tributes){if(p.energy<Math.max(0,d.cost-(tr?2:0)))continue;
              for(let slot=0;slot<5;slot++)if(p.field[slot]===null||p.field[slot]===tr)for(const position of ['attack','defense'])acts.push({type:'summon',card:c.uid,slot,position,tribute:tr?.uid||null});}
          }else if(d.cost<=p.energy&&(!d.persistent||p.spells.includes(null))){
            const targets=d.target==='own'?p.field.filter(Boolean):d.target==='enemy'?enemy.field.filter(Boolean):[null];
            if(d.effect==='skip'&&enemy.skip[d.phase])continue;
            if(d.effect==='heal'&&p.hp===4000)continue;
            for(const target of targets)acts.push({type:'spell',card:c.uid,target:target?.uid||null});
          }
        }
        for(const c of p.field)if(c&&c.entered<s.turn&&!c.changed)acts.push({type:'position',card:c.uid});
        acts.push({type:'advance'});
      }else if(s.phase==='ataque'){
        if(s.turn>1)for(const c of p.field)if(c&&c.position==='attack'&&!c.attacked&&c.entered<s.turn){const targets=enemy.field.filter(Boolean);for(const t of targets.length?targets:[null])acts.push({type:'attack',card:c.uid,target:t?.uid||null});}
        acts.push({type:'end'});
      }
      return acts;
    }
    execute(owner,action){
      this.events=[];const key=x=>JSON.stringify(x);if(!this.actions(owner).some(a=>key(a)===key(action)))return {ok:false,error:'Ação indisponível nesta fase ou custo inválido.'};
      this.commands.push({owner,action:clone(action)});const s=this.s,p=s.players[owner],a=action;
      if(a.type==='jokenpo'){const bot=this.roll(3)-1;const winner=a.hand===bot?null:(a.hand-bot+3)%3===1?0:1;s.chooser=winner;this.log('Jokenpô: '+['pedra','papel','tesoura'][a.hand]+' × '+['pedra','papel','tesoura'][bot]+(winner===null?' · empate.':' · Jogador '+(winner+1)+' escolhe.'),{kind:'jokenpo',hands:[a.hand,bot],winner});}
      if(a.type==='cede'){s.chooser=1-owner;this.log('Escolha de ordem cedida ao adversário.',{kind:'cede',owner});}
      if(a.type==='order')this.begin(a.first);
      if(a.type==='discard'){const f=this.find(a.card);p.grave.push(p.hand.splice(f.index,1)[0]);this.log('Jogador '+(owner+1)+' descartou '+this.def(f.c).name+' por excesso de mão.',{kind:'discard',owner,uid:a.card});}
      if(a.type==='summon'){
        const f=this.find(a.card),d=this.def(f.c);p.energy-=Math.max(0,d.cost-(a.tribute?2:0));if(a.tribute){this.log('Tributo para invocar '+d.name+'.',{kind:'tribute',owner,uid:a.tribute,for:a.card});this.destroy(a.tribute);}p.hand.splice(p.hand.indexOf(f.c),1);Object.assign(f.c,{entered:s.turn,position:a.position,changed:false,attacked:false});p.field[a.slot]=f.c;this.log(d.name+' foi invocada em '+(a.position==='attack'?'ataque':'defesa')+'.',{kind:'summon',owner,uid:a.card,slot:a.slot,position:a.position});
        this.onSummoned(owner,f.c);
      }
      if(a.type==='position'){const c=this.find(a.card).c;c.position=c.position==='attack'?'defense':'attack';c.changed=true;this.log(this.def(c).name+' mudou para '+(c.position==='attack'?'ataque':'defesa')+'.',{kind:'position',owner,uid:a.card,position:c.position});}
      if(a.type==='spell'){const f=this.find(a.card),d=this.def(f.c);p.energy-=d.cost;p.hand.splice(f.index,1);s.pending={kind:'read',reader:1-owner,owner,card:f.c,target:a.target};this.log(d.name+' anunciada. Aguardando leitura do adversário.',{kind:'announce',owner,uid:a.card,target:a.target});}
      if(a.type==='confirm'){const q=s.pending;s.pending=null;this.resolveSpell(q);}
      if(a.type==='advance'){s.phase='ataque';this.log('Fase de ataque.',{kind:'phase',owner,phase:'ataque'});if(p.skip.ataque){delete p.skip.ataque;this.log('Fase de ataque bloqueada neste turno.',{kind:'skip',owner,phase:'ataque'});this.begin(1-owner);}}
      if(a.type==='end')this.begin(1-owner);
      if(a.type==='attack'){
        this.find(a.card).c.attacked=true;this.log(this.def(this.find(a.card).c).name+' declarou ataque'+(a.target?' contra '+this.def(this.find(a.target).c).name: ' direto')+'.',{kind:'attack',owner,uid:a.card,target:a.target});
        const defender=1-owner,ep=s.players[defender];
        const candidates=ep.hand.some(c=>this.def(c).type==='creature'&&this.def(c).cost<=ep.capacity);
        if(!a.target&&!ep.emergencyUsed&&ep.field.includes(null)&&candidates)s.pending={kind:'emergency',defender,attacker:a.card};else this.combat(a.card,a.target);
      }
      if(a.type==='decline'){const q=s.pending;s.pending=null;this.combat(q.attacker,null);}
      if(a.type==='emergency'){
        const q=s.pending,f=this.find(a.card),die=this.roll(10);s.pending=null;p.emergencyUsed=true;p.hand.splice(f.index,1);Object.assign(f.c,{entered:s.turn,position:'defense'});p.field[a.slot]=f.c;this.log('Defesa desesperada: '+this.def(f.c).name+' · d10 = '+die+'.',{kind:'summon',owner,uid:a.card,slot:a.slot,position:'defense',emergency:true,die:{faces:10,value:die}});
        this.onSummoned(owner,f.c);
        if(s.winner===null){if(die>=8)this.log('Ataque bloqueado totalmente.',{kind:'block',owner,uid:q.attacker});else if(die>=4)this.combat(q.attacker,f.c.uid);else{this.destroy(f.c.uid);this.combat(q.attacker,null);}}
      }
      return {ok:true,events:this.events};
    }
    onSummoned(owner,c){const d=this.def(c),p=this.s.players[owner];if(d.effect==='energy'){const die=this.roll(20),gain=die===20?2:die>=11?1:0;p.energy+=gain;this.log('d20 = '+die+' · '+gain+' energia temporária.',{kind:'energy',owner,uid:c.uid,amount:gain,die:{faces:20,value:die}});}if(d.effect==='draw')this.draw(owner);}
    resolveSpell(q){
      const p=this.s.players[q.owner],d=this.def(q.card),target=q.target?this.find(q.target):null;
      if(d.persistent){q.card.target=q.target;p.spells[p.spells.indexOf(null)]=q.card;this.log(d.name+' equipada em '+this.def(target.c).name+'.',{kind:'equip',owner:q.owner,uid:q.card.uid,target:q.target});}
      else{p.grave.push(q.card);if(d.effect==='heal'){const healed=Math.min(4000,p.hp+d.value)-p.hp;p.hp+=healed;this.log(d.name+' recuperou '+d.value+' de vida.',{kind:'heal',owner:q.owner,uid:q.card.uid,amount:healed,hp:p.hp});}
        if(d.effect==='save'&&target){const die=this.roll(6);this.log('Resistência de '+this.def(target.c).name+' · d6 = '+die+'.',{kind:'resist',owner:target.owner,uid:q.target,die:{faces:6,value:die}});if(die<=3)this.destroy(q.target);else this.log('A criatura resistiu.',{kind:'resisted',owner:target.owner,uid:q.target});}
        if(d.effect==='skip'){this.s.players[1-q.owner].skip[d.phase]=true;this.log('A próxima fase de '+d.phase+' do adversário será bloqueada.',{kind:'lock',owner:1-q.owner,phase:d.phase});}}
    }
    combat(attacker,target){
      const f=this.find(attacker);if(!f)return;const ap=this.power(f.c,'attack'),defender=1-f.owner;
      if(!target){this.damage(defender,ap);return;}const t=this.find(target);if(!t)return;const dp=this.power(t.c,t.c.position==='attack'?'attack':'defense');
      if(t.c.position==='defense'){if(ap>dp)this.destroy(target);else if(ap<dp)this.damage(f.owner,dp-ap);else this.log('Defesa empatada: ambas permanecem.',{kind:'clash',uid:attacker,target});}
      else if(ap>dp){this.destroy(target);this.damage(defender,ap-dp);}else if(ap<dp){this.destroy(attacker);this.damage(f.owner,dp-ap);}else{this.destroy(attacker);this.destroy(target);this.log('Ataques empatados: ambas destruídas.',{kind:'clash',uid:attacker,target});}
    }
    observe(owner){const v=clone(this.s);for(let i=0;i<2;i++){v.players[i].deckCount=v.players[i].deck.length;delete v.players[i].deck;if(i!==owner){v.players[i].handCount=v.players[i].hand.length;delete v.players[i].hand;}}v.actions=this.actions(owner);return v;}
  }
  function choose(v,owner){
    const p=v.players[owner],enemy=v.players[1-owner];
    const find=uid=>[...p.hand,...p.field.filter(Boolean),...enemy.field.filter(Boolean)].find(c=>c.uid===uid);
    const power=(c,stat)=>{let n=catalog.byId[c.card][stat]||0;for(const pl of v.players)for(const sp of pl.spells)if(sp?.target===c.uid&&catalog.byId[sp.card].effect===(stat==='attack'?'buffAttack':'buffDefense'))n+=catalog.byId[sp.card].value;return n;};
    const score=a=>{
      if(a.type==='confirm'||a.type==='order')return 1000;
      if(a.type==='discard'){const d=catalog.byId[find(a.card).card];return 100-d.cost;}
      if(a.type==='emergency')return 100+power(find(a.card),'defense')/100;
      if(a.type==='decline')return 0;
      if(a.type==='summon'){const c=find(a.card),d=catalog.byId[c.card];const threatened=enemy.field.some(c=>c&&power(c,'attack')>=d.attack);const best=d.attack===200||threatened&&d.defense>d.attack+400?'defense':'attack';const tr=a.tribute?find(a.tribute):null;const loss=tr?Math.max(power(tr,'attack'),power(tr,'defense'))/100+(tr.position==='attack'&&!tr.attacked&&tr.entered<v.turn?16:0):0;return 30+Math.max(d.attack,d.defense)/200+(a.position===best?3:0)-loss;}
      if(a.type==='spell'){const d=catalog.byId[find(a.card).card];if(d.effect==='heal')return p.hp<=3200?22:-5;if(d.effect==='skip')return d.phase==='ataque'&&enemy.field.some(c=>c&&c.position==='attack')?26:d.phase==='compra'?12:-5;if(d.effect==='save')return 25+Math.max(power(find(a.target),'attack'),power(find(a.target),'defense'))/200;return 18+power(find(a.target),d.effect==='buffAttack'?'attack':'defense')/300;}
      if(a.type==='attack'){if(!a.target)return 50+power(find(a.card),'attack')/100;const c=find(a.card),t=find(a.target),diff=power(c,'attack')-power(t,t.position==='attack'?'attack':'defense');return diff>0?40+diff/100:diff===0&&t.position==='attack'?5:-10;}
      if(a.type==='position'){const c=find(a.card);const threatened=enemy.field.some(t=>t&&power(t,'attack')>=power(c,'attack'));const desirable=threatened&&power(c,'defense')>power(c,'attack')+400?'defense':'attack';return c.position!==desirable?8:-10;}
      return 0;
    };
    return [...v.actions].sort((a,b)=>score(b)-score(a))[0]||null;
  }
  root.DXEngine=Engine;root.DXChoose=choose;if(typeof module!=='undefined')module.exports={Engine,choose};
})(globalThis);
