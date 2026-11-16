// Copia o Dimensions X do repositório privado (codinome-hero) para dimensions-x/ deste portal.
// Mantém a estrutura game/dimensions + assets/ para os caminhos relativos ../../assets seguirem valendo.
// Leva só o que o jogo carrega: código, artes WebP, miniaturas WebP e fontes com as licenças.
// Uso: node scripts/copiar-dimensions-x.mjs [pasta-do-codinome-hero]
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = process.argv[2] || 'D:/estudio/jogos/codinome-hero';
const destino = join(raiz, 'dimensions-x');

if (!existsSync(join(origem, 'game/dimensions/index.html'))) {
  console.error(`Não achei game/dimensions/index.html em ${origem}`);
  process.exit(1);
}

// Limpa só o que o script gera; dimensions-x/index.html (tela de beta) é do portal.
for (const pasta of ['game', 'assets']) rmSync(join(destino, pasta), { recursive: true, force: true });

const copiar = (de, para, filtro = () => true) => {
  mkdirSync(para, { recursive: true });
  let n = 0;
  for (const nome of readdirSync(de)) {
    const arq = join(de, nome);
    if (statSync(arq).isFile() && filtro(nome)) { cpSync(arq, join(para, nome)); n++; }
  }
  return n;
};

const resumo = {
  codigo: copiar(join(origem, 'game/dimensions'), join(destino, 'game/dimensions')),
  artes: copiar(join(origem, 'assets/dimensions'), join(destino, 'assets/dimensions'), (n) => n.endsWith('.webp')),
  miniaturas: copiar(join(origem, 'assets/dimensions/miniaturas'), join(destino, 'assets/dimensions/miniaturas'), (n) => n.endsWith('.webp')),
  fontes: copiar(join(origem, 'assets/fontes'), join(destino, 'assets/fontes'), (n) => /\.(ttf|woff2?|txt)$/.test(n)),
};
console.log('Dimensions X copiado:', resumo);
