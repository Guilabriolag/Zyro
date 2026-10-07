# Copa Button 3D (versão estática)

HTML + CSS + JS, sem Next.js, sem banco, sem build.

## Como rodar
Os módulos ES exigem HTTP (não abre com duplo clique em `file://`):

    cd CopaButton3D
    python3 -m http.server 8080
    # abra http://localhost:8080

## Estrutura
    index.html   telas: menu, pré-jogo, partida
    style.css    visual e HUD (responsivo)
    main.js      interface, loop da partida, entrada por arrastar, progresso local
    js/game/     motor original: physics, match, attributes, renderer, stadium3d, audio
    js/lib/      nations, stadiums, tournament (dados e regras da Copa)

## Three.js
Vem do CDN (jsdelivr, versão 0.181.0, via import map no `index.html`).
Para jogar offline: baixe `three.module.js` dessa versão para `vendor/` e troque a URL no import map por `./vendor/three.module.js`.

## O que entrou / ficou de fora
Entrou: partida rápida completa (estádios, clima, horário, gramado, tabelas, goleiros, mira com trajetória, efeito, câmeras, áudio, treino), XP e moedas salvos em localStorage, estádios que liberam por XP.
Ainda não migrado: Copa do Mundo, editor de atletas, laboratório de física e perfil. A lógica da Copa já está em `js/lib/tournament.js`; falta só a interface.
