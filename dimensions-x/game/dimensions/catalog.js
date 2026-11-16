(function(root){
  'use strict';
  const dimensions=[
    {id:'medieval',name:'Véu de Eldoria',theme:'Fantasia medieval',energy:'Essência',color:'#d3ad66',symbol:'✦',style:'Fortificações, cavaleiros e magia de proteção.',names:['Aprendiz da Fonte','Batedor do Véu','Sentinela de Pedra','Cavaleira do Amanhecer','Grifo das Torres','Guardião da Ponte','Arcanista do Véu','Colosso da Fortaleza','Rainha dos Dragões'],spells:['Lâmina Encantada','Muralha Rúnica','Águas da Fonte','Selo da Ruína','Silêncio Arcano','Névoa do Caminho']},
    {id:'urbana',name:'Distrito Aurora',theme:'Moderna urbana',energy:'Eletricidade',color:'#58c5bc',symbol:'◈',style:'Equipes de rua, máquinas e resposta tática.',names:['Técnica da Subestação','Mensageiro dos Telhados','Drone de Vigilância','Agente de Intervenção','Moto de Assalto','Blindado de Resgate','Especialista de Campo','Titã Industrial','Comandante Aurora'],spells:['Sobrecarga','Escudo Balístico','Posto de Socorro','Pulso de Interdição','Queda de Sinal','Cerco Tático']},
    {id:'espacial',name:'Nexo Ômega',theme:'Futurista espacial',energy:'Íons',color:'#b6a1ee',symbol:'⌬',style:'Exploradores, constructos orbitais e tecnologia de contenção.',names:['Operador do Reator','Explorador de Órbita','Sonda de Contenção','Soldado do Nexo','Interceptor Estelar','Bastião Orbital','Engenheira de Dobra','Leviatã Mecânico','Almirante do Vazio'],spells:['Amplificador de Plasma','Barreira Quântica','Nanorreparo','Colapso de Campo','Bloqueio de Telemetria','Estase Orbital']}
  ];
  const stats=[[1,200,400],[1,600,300],[2,400,1400],[3,1300,900],[4,1700,1000],[4,800,2200],[5,1900,1400],[7,2500,2200],[8,2800,2400]];
  const cards=[];
  const recruits={medieval:['Escudeira do Véu','Vigia da Fonte','Lanceiro das Torres','Arqueira da Ponte'],urbana:['Corredora de Rua','Vigia do Distrito','Patrulheiro Aurora','Atiradora dos Telhados'],espacial:['Cadete do Nexo','Vigia Orbital','Patrulheiro Estelar','Artilheira de Órbita']};
  const copies=[3,3,3,2,1,1,1,1,1];
  for(const d of dimensions){
    d.deck=[];
    d.names.forEach((name,i)=>{
      const [cost,attack,defense]=stats[i];
      const effect=i===0?'energy':i===6?'draw':null;
      const c={id:d.id+'-c'+i,dimension:d.id,name,type:'creature',cost,attack,defense,limit:i>=7?1:3,rare:i>=7,tribute:i>=7,effect,dice:effect==='energy'?'d20':null,text:effect==='energy'?'Ao invocar: role d20. 11–19: ganhe 1 energia temporária; 20: ganhe 2; 1–10: nenhum bônus.':effect==='draw'?'Ao invocar: compre 1 carta.':i>=7?'Exige 1 tributo. O tributo reduz o custo em 2.':'Sem habilidade adicional.'};
      cards.push(c); for(let n=0;n<copies[i];n++)d.deck.push(c.id);
    });
    recruits[d.id].forEach((name,i)=>{
      const [cost,attack,defense]=[[1,500,500],[1,300,700],[2,1000,600],[2,800,1000]][i];
      const c={id:d.id+'-c'+(9+i),dimension:d.id,name,type:'creature',cost,attack,defense,limit:3,rare:false,tribute:false,effect:null,dice:null,text:'Sem habilidade adicional.',artSource:d.id+'-c'+[1,2,3,6][i]};
      cards.push(c);for(let n=0;n<3;n++)d.deck.push(c.id);
    });
    const specs=[
      {cost:2,effect:'buffAttack',value:600,target:'own',persistent:true,text:'Equipe uma criatura sua: +600 de ataque enquanto esta mágica permanecer vinculada a ela.'},
      {cost:2,effect:'buffDefense',value:800,target:'own',persistent:true,text:'Equipe uma criatura sua: +800 de defesa enquanto esta mágica permanecer vinculada a ela.'},
      {cost:2,effect:'heal',value:800,text:'Recupere 800 de vida, até o máximo de 4.000.'},
      {cost:3,effect:'save',target:'enemy',text:'Escolha uma criatura inimiga. Seu controlador rola d6: 1–3 destrói a criatura; 4–6 ela resiste.'},
      {cost:3,effect:'skip',phase:'compra',text:'O adversário pula somente a fase de compra do próximo turno dele. Não impede a recarga de energia.'},
      {cost:4,effect:'skip',phase:'ataque',text:'O adversário pula somente a fase de ataque do próximo turno dele.'}
    ];
    specs.forEach((spec,i)=>{const c={id:d.id+'-m'+i,dimension:d.id,name:d.spells[i],type:'spell',limit:3,...spec};cards.push(c);for(let n=0;n<2;n++)d.deck.push(c.id);});
  }
  for(const c of cards){const art=c.artSource||c.id;c.art='../../assets/dimensions/'+art+'-v2.webp';c.thumbnail='../../assets/dimensions/miniaturas/'+art+'-v2.webp';}
  const catalog={version:'dimensions-x-0.2',dimensions,cards,byId:Object.fromEntries(cards.map(c=>[c.id,c]))};
  root.DXCatalog=catalog;if(typeof module!=='undefined')module.exports=catalog;
})(globalThis);
