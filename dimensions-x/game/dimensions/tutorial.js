(function(root){
  'use strict';
  /* Tutorial roteirizado. O motor real não muda: o tutorial monta decks em ordem conhecida, força os dados
     da história e filtra actions() para devolver só a ação do passo atual, como no Palworld
     (game/tutorial/motor_tutorial.gd). Funciona no navegador e no Node, para o verificador. */
  const Engine=typeof module!=='undefined'?require('./engine.js').Engine:root.DXEngine;
  const catalog=typeof module!=='undefined'?require('./catalog.js'):root.DXCatalog;
  const M=(owner,allow)=>({owner,allow});
  const is=(a,e,id)=>!!a.card&&e.find(a.card)&&e.def(e.find(a.card).c).id===id;
  const hits=(a,e,id)=>!!a.target&&e.find(a.target)&&e.def(e.find(a.target).c).id===id;
  const summon=(owner,id,position)=>M(owner,(a,e)=>a.type==='summon'&&is(a,e,id)&&a.position===position&&!a.tribute);
  const type=(owner,t)=>M(owner,a=>a.type===t);
  const STEPS=[
    {title:'Bem-vindo ao Dimensions X',text:'Duas dimensões se enfrentam. Você vence quando a vida do adversário chega a zero. Neste tutorial o bot começa com 3.200 de vida, e você, com 4.000.',target:'enemy-life'},
    {title:'Pedra, papel e tesoura',text:'Quem vence o jokenpô escolhe se começa ou joga em segundo. Escolha uma mão.',seq:[type(0,'jokenpo')],target:'decision-actions'},
    {title:'Quem começa',text:'Você venceu. Quem começa não compra carta nem ataca no primeiro turno, mas sai na frente no campo. Escolha "Você começa".',seq:[M(0,a=>a.type==='order'&&a.first===0)],target:'decision-actions'},
    {title:'Energia',text:'Cada carta custa energia. A capacidade cresce 1 por turno, até 10, e recarrega toda no início do seu turno. Nas partidas normais, sua mão inicial garante uma criatura de custo 1. Para acelerar, neste tutorial os dois começam com 3.',target:'own-energy'},
    {title:'Invoque em defesa',text:'Selecione Aprendiz da Fonte, clique numa vaga destacada e escolha "Em defesa". Em defesa a criatura não ataca, mas usa a DEF para segurar ataques.',seq:[summon(0,'medieval-c0','defense')],target:{card:'medieval-c0',then:'slots'}},
    {title:'O dado d20',text:'Aprendiz da Fonte é um gerador: ao entrar, rola um d20. De 11 a 19 ganha 1 de energia temporária, e 20 dá 2. Saiu 15, então você ganhou 1. Energia extra some na próxima recarga.',target:'own-energy'},
    {title:'Invoque em ataque',text:'Agora invoque Cavaleira do Amanhecer em ataque. Ela custa 3, exatamente o que você tem.',seq:[summon(0,'medieval-c3','attack')],target:{card:'medieval-c3',then:'slots'}},
    {title:'Fim do primeiro turno',text:'Criatura recém-invocada só ataca no seu próximo turno. Avance para a fase de ataque e depois encerre o turno.',seq:[type(0,'advance'),type(0,'end')],target:'phase-button'},
    {title:'Vez do bot',text:'O bot compra, recarrega a energia e joga com as mesmas regras. Acompanhe.',seq:[summon(1,'urbana-c1','attack'),summon(1,'urbana-c2','defense'),type(1,'advance'),type(1,'end')],target:'enemy-field',bot:true},
    {title:'Leia o campo',text:'O bot pôs Drone de Vigilância em defesa, com DEF 1.400. Sua Cavaleira tem ATQ 1.300: não passa. Vamos fortalecê-la.',target:'enemy-field'},
    {title:'Equipe uma mágica',text:'Selecione Lâmina Encantada e clique na Cavaleira. Ela ganha +600 de ataque enquanto a mágica estiver vinculada. O adversário sempre lê a mágica antes de ela resolver.',seq:[M(0,(a,e)=>a.type==='spell'&&is(a,e,'medieval-m0')&&hits(a,e,'medieval-c3')),type(1,'confirm')],target:{card:'medieval-m0',then:{field:'medieval-c3'}}},
    {title:'Fase de ataque',text:'A Cavaleira agora tem ATQ 1.900, e o selo na arte mostra o equipamento. Avance para a fase de ataque.',seq:[type(0,'advance')],target:'phase-button'},
    {title:'Ataque contra defesa',text:'Selecione a Cavaleira e clique no Drone. Ataque maior que a defesa destrói a criatura, sem dano ao jogador.',seq:[M(0,(a,e)=>a.type==='attack'&&is(a,e,'medieval-c3')&&hits(a,e,'urbana-c2'))],target:{field:'medieval-c3',then:{enemy:'urbana-c2'}}},
    {title:'Encerre o turno',text:'O Drone foi para o descarte do bot. O Aprendiz está em defesa e não ataca. Encerre o turno.',seq:[type(0,'end')],target:'phase-button'},
    {title:'O bot ataca',text:'O bot invoca uma criatura e ataca o seu Aprendiz. Observe o confronto.',seq:[summon(1,'urbana-c4','attack'),type(1,'advance'),M(1,(a,e)=>a.type==='attack'&&is(a,e,'urbana-c1')&&hits(a,e,'medieval-c0')),type(1,'end')],target:'own-field',bot:true},
    {title:'Perder em defesa',text:'ATQ 600 contra DEF 400: o Aprendiz foi destruído, mas em defesa você não perde vida. Se a DEF fosse maior, quem pagaria a diferença seria o atacante.',target:'own-life'},
    {title:'Mais uma criatura',text:'Você comprou uma carta e tem 5 de energia. Invoque Grifo das Torres em ataque.',seq:[summon(0,'medieval-c4','attack')],target:{card:'medieval-c4',then:'slots'}},
    {title:'Fase de ataque',text:'Avance para a fase de ataque.',seq:[type(0,'advance')],target:'phase-button'},
    {title:'Ataque contra ataque',text:'Ataque a Moto de Assalto com a Cavaleira. Quando as duas estão em ataque, a menor é destruída e o dono dela perde a diferença.',seq:[M(0,(a,e)=>a.type==='attack'&&is(a,e,'medieval-c3')&&hits(a,e,'urbana-c4'))],target:{field:'medieval-c3',then:{enemy:'urbana-c4'}}},
    {title:'Diferença vira dano',text:'1.900 contra 1.700: a Moto caiu e o bot perdeu 200. O Grifo entrou agora e ainda não ataca. Encerre o turno.',seq:[type(0,'end')],target:'phase-button'},
    {title:'O bot recua',text:'Com uma criatura mais fraca que as suas, o bot prefere não atacar.',seq:[type(1,'advance'),type(1,'end')],target:'enemy-field',bot:true},
    {title:'Hora de decidir',text:'O Grifo já pode atacar. Avance para a fase de ataque.',seq:[type(0,'advance')],target:'phase-button'},
    {title:'Limpe o caminho',text:'Ataque o Mensageiro dos Telhados com o Grifo: 1.700 contra 600.',seq:[M(0,(a,e)=>a.type==='attack'&&is(a,e,'medieval-c4')&&hits(a,e,'urbana-c1'))],target:{field:'medieval-c4',then:{enemy:'urbana-c1'}}},
    {title:'Ataque direto',text:'O campo do bot está vazio. Selecione a Cavaleira e clique no perfil dele. Quem recebe ataque direto pode usar a defesa desesperada: invoca uma criatura da mão de graça e rola um d10. De 8 a 10 bloqueia; de 4 a 7 enfrenta em defesa; de 1 a 3 a criatura cai e o ataque passa.',seq:[M(0,(a,e)=>a.type==='attack'&&is(a,e,'medieval-c3')&&a.target===null),M(1,(a,e)=>a.type==='emergency'&&is(a,e,'urbana-c5'))],target:{field:'medieval-c3',then:'enemy-profile'}},
    {title:'Vitória!',text:'O d10 deu 2: a defesa caiu e o ataque passou. Ainda há mais para descobrir: raras exigem um tributo, que reduz o custo em 2; mágicas com d6 testam a resistência; bloqueios fazem o adversário pular uma fase; e você pode mudar a posição de uma criatura por turno.',final:true}
  ];
  class Tutorial extends Engine{
    constructor(){
      super(['medieval','urbana'],20261013);
      this.isTutorial=true;this.step=0;this.seqIndex=0;this.forced={20:[15],10:[2]};
      const build=(p,hand,top)=>{
        const used={};for(const id of [...hand,...top])used[id]=(used[id]||0)+1;
        const rest=[];for(const id of catalog.dimensions.find(d=>d.id===p.dimension).deck){if(used[id]){used[id]--;continue;}rest.push(id);}
        p.hand=hand.map(id=>this.instance(id));
        p.deck=[...rest.map(id=>this.instance(id)),...top.slice().reverse().map(id=>this.instance(id))];
      };
      const [me,bot]=this.s.players;
      build(me,['medieval-c0','medieval-c3','medieval-m0','medieval-c4','medieval-c2'],['medieval-m2','medieval-c1','medieval-c5']);
      build(bot,['urbana-c1','urbana-c2','urbana-c4','urbana-c5','urbana-c0'],['urbana-m2','urbana-c6','urbana-m0']);
      me.capacity=2;bot.capacity=2;bot.hp=3200;
      this.log('Tutorial: o bot começa com 3.200 de vida e os dois com 3 de energia.',{kind:'tutorial'});
    }
    roll(faces){const q=this.forced?.[faces];if(q&&q.length)return q.shift();if(faces===3&&this.nextHand){const v=this.nextHand;this.nextHand=null;return v;}return super.roll(faces);}
    get current(){return STEPS[this.step]||null;}
    actions(owner){const all=super.actions(owner),st=this.current,m=st?.seq?.[this.seqIndex];if(!m||m.owner!==owner)return [];return all.filter(a=>m.allow(a,this));}
    execute(owner,action){
      if(action.type==='jokenpo')this.nextHand=(action.hand+2)%3+1;
      const result=super.execute(owner,action);
      if(result.ok&&this.current?.seq){this.seqIndex++;if(this.seqIndex>=this.current.seq.length){this.step++;this.seqIndex=0;}}
      return result;
    }
    next(){if(this.current&&!this.current.seq&&!this.current.final){this.step++;this.seqIndex=0;return true;}return false;}
  }
  Tutorial.STEPS=STEPS;
  root.DXTutorial=Tutorial;if(typeof module!=='undefined')module.exports={Tutorial,STEPS};
})(globalThis);
