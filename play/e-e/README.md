# Esconde-Esconde · Gramática Zero (G0)

Protótipo funcional de um jogo 3D multiplayer de esconde-esconde para
celular, construído como laboratório da arquitetura **Gramática Zero**:
`ENTIDADE → ESTADO → RELAÇÃO → NOVO ESTADO`.

O esconde-esconde é só a primeira aplicação. O motor (World/Entity/State/
Relation/Network/Game/Renderer) não conhece a palavra "esconde-esconde" —
ele só sabe de entidades, estados, mudanças e relações. Trocar o jogo por
jogo da velha, ping-pong ou porta-e-botão significa trocar a peça
`GameRoom.js` (regras) e manter toda a infraestrutura.

## Arquitetura

```
CLIENTE (Three.js)                    SERVIDOR (Cloudflare)
─────────────────                     ──────────────────────
World      → território local         Worker (worker.js)
Entity     → id + tipo + estado          └─ roteia /room?code=XXXX
State      → interpolação remota            para o Durable Object
Renderer   → estado → mesh                  correspondente
Input      → toque → intenção
Joystick   → joystick virtual         Durable Object (GameRoom.js)
Camera     → câmera por toque            └─ 1 sala = 1 objeto
Network    → esconde o WebSocket         └─ estado autoritativo
Game       → ciclo da partida            └─ fases da partida
UI         → lobby / HUD                 └─ resolve o entrelaçamento
                                          └─ filtra o que cada jogador vê
```

Cada código de sala (ex: `ZERO-7K4P`) vira o "nome" de um Durable Object
(`env.GAME_ROOM.idFromName(code)`). Todo mundo que entra com o mesmo
código cai sempre na mesma instância — não precisa de banco de dados
para registrar salas.

### Onde está o Estado

- No cliente: `Entity.js` (estado por entidade) + `State.js`
  (`StateBuffer`, que guarda um pequeno histórico de snapshots remotos e
  interpola entre eles para movimento suave).
- No servidor: `GameRoom.players` é o estado completo e autoritativo da
  sala (posição, rotação, papel, situação de cada jogador).

### Onde está o Entrelaçamento

Em `GameRoom.js`, método `_checkProximity()`:

```
PROCURADOR.posição + ESCONDIDO.posição
  → relação espacial
  → distância < limite (1.6 unidades)
  → ESCONDIDO.situacao = "encontrado"
```

Isso roda inteiramente no servidor — o cliente nunca declara "eu
encontrei"; ele só observa o evento `found` quando o servidor decide.
`Relation.js` no cliente mantém a mesma estrutura conceitual, caso um dia
uma relação precise de efeito puramente visual no cliente.

### Estado interno da sala vs. estado visível por jogador

Também em `GameRoom.js`, método `_broadcastSnapshots()`: durante as fases
`hide` e `seek`, a posição de quem está escondido **não é enviada** para
quem procura (a menos que já tenha sido encontrado). O servidor conhece
tudo; cada cliente só recebe o que seu papel autoriza.

## Executar localmente

Pré-requisitos: Node.js 18+ e uma conta Cloudflare (gratuita) para o
`wrangler dev` autenticar.

```bash
npm install
npm run dev
```

O `wrangler dev` sobe o Worker (com o Durable Object) e também serve os
arquivos de `/client` (configurado em `wrangler.toml` via `[assets]`).
Abra o endereço mostrado no terminal (algo como
`http://localhost:8787`) em duas abas do navegador, ou em dois
celulares na mesma rede Wi-Fi apontando para o IP da sua máquina.

> Se a versão do `wrangler` instalada não suportar `[assets]` no
> `wrangler.toml`, sirva a pasta `/client` separadamente (por exemplo com
> `npx serve client`) e ajuste `SERVER_HOST` em `client/js/main.js` para
> apontar para `localhost:8787` (o host do `wrangler dev`).

## Deploy no Cloudflare

```bash
npx wrangler login
npm run deploy
```

Isso publica o Worker (com o Durable Object) e os assets estáticos em
`https://esconde-esconde-g0.<seu-subdominio>.workers.dev`. Se quiser um
domínio diferente, ajuste `name` em `wrangler.toml`.

Depois do deploy, abra o link publicado em dois dispositivos diferentes
pela internet — não precisa estar na mesma rede.

## Testar

1. **Duas abas do navegador**: abra o mesmo endereço em duas abas,
   digite nomes diferentes, uma cria a sala e a outra entra com o código
   mostrado na tela.
2. **Dois celulares**: mesmo fluxo, cada um no seu aparelho.
3. Com 2 jogadores conectados, a partida começa sozinha: 8s de preparo,
   12s para o escondido se posicionar, 40s de busca.

## Adicionar um terceiro jogador

Nada muda no código — `MAX_PLAYERS` em `GameRoom.js` já permite até 8.
A única regra de papéis hoje é "1 esconde, todos os outros procuram"
(`_assignRoles`). Para um terceiro jogador funcionar como um segundo
procurador, nenhuma mudança é necessária; para experimentar 2 papéis de
"esconde" simultâneos, ajuste `_assignRoles` e `_checkProximity` para
iterar sobre uma lista de escondidos em vez de um único `hiderEntry`.

## Transformar isso em outro jogo

A infraestrutura (Worker, Durable Object, WebSocket, State, Network,
Renderer, Input, Joystick, Camera) não muda. O que muda é apenas:

1. `GameRoom.js` — as fases (`_setPhase`) e a regra de entrelaçamento
   (`_checkProximity` vira, por exemplo, "quem clicou primeiro" no jogo
   da velha, ou "bola cruzou a linha" no ping-pong).
2. `Game.js` — como o cliente reage a cada fase e a cada evento.
3. `World.js` — o cenário 3D (terreno, obstáculos) específico do novo
   jogo.

O modelo de entidade (`Entity.js`), o transporte (`Network.js`), a
interpolação (`State.js`) e o loop de renderização (`Renderer.js`,
`main.js`) permanecem os mesmos — é exatamente o ponto da Gramática Zero.

## Próximos passos sugeridos

- Linha de visão / campo de visão do procurador (hoje é só proximidade).
- Som e pegadas como pistas adicionais.
- Camuflagem (o escondido pode "se transformar" em um objeto do cenário).
- Persistir estatísticas de partidas (quem mais se esconde bem, etc.).
