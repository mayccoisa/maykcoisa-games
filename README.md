# maykcoisa-games

Portal de jogos em https://games.maykcoisa.com.br, publicado pelo GitHub Pages.

| Caminho | O que é |
| --- | --- |
| `index.html`, `estilo.css` | Portal com os cards dos jogos |
| `dimensions-x/index.html` | Tela de aviso do beta |
| `dimensions-x/game`, `dimensions-x/assets` | Cópia do Dimensions X, gerada por script. Não edite aqui |

## Atualizar o Dimensions X

`node scripts/copiar-dimensions-x.mjs` copia de `D:\estudio\jogos\codinome-hero` o código de `game/dimensions`, as artes e miniaturas WebP e as fontes (com a licença OFL). O repositório do jogo segue privado.

## Testar localmente

`npx http-server . -p 4330` e abrir `http://localhost:4330/`.
