# ZyroLog MMO — Pirapora do Bom Jesus

Hub urbano gamificado. 100% estático (HTML + CSS + JS puro), sem backend — pronto para GitHub Pages.

## Estrutura

```
/
├── index.html      → Mapa principal (spawn do jogador, navega entre POIs)
├── core.js         → Núcleo de dados compartilhado (player, wallet/sats, xp, missões, achievements)
├── shared.css      → Estilos e variáveis compartilhadas por todas as páginas
├── cartorio.html   → Criação de personagem + tutorial de wallet Lightning + 100 sats iniciais
├── barbearia.html  → Customização de avatar/cor + compartilhar no Instagram
├── sk8.html        → Praticar (minigame), Equipar (loja), Campeonato (ranking), Praça (chat local)
├── pizzaria.html   → Cardápio, cupons, tarefas com recompensa e ranking semanal
├── igame.html      → Hub de tutoriais, jogos em destaque, perfil e conquistas
└── romeiros.html   → Portal de chegada — selfie + compartilhamento social
```

## Como funciona o CORE

Todo o estado do jogador (`ZyroCore` em `core.js`) é salvo no `localStorage` do navegador,
sob a chave `zyrolog_core_v1`. Isso significa:

- **Sem servidor**: cada visitante tem seu progresso salvo localmente no próprio celular/navegador.
- **Persistente**: fechar o site e voltar depois mantém sats, XP, avatar e missões concluídas.
- **Por página, sempre inclua**:
  ```html
  <link rel="stylesheet" href="shared.css">
  ...
  <script src="core.js"></script>
  ```

### API principal do `ZyroCore`

| Método | Descrição |
|---|---|
| `ZyroCore.hasCharacter()` | true/false se já criou personagem |
| `ZyroCore.createPlayer({name, role, avatar})` | cria o personagem |
| `ZyroCore.getPlayer()` | retorna dados do personagem |
| `ZyroCore.addSats(n)` / `spendSats(n)` | credita/debita sats |
| `ZyroCore.addXP(n)` / `getXP()` / `getLevel()` | XP e nível |
| `ZyroCore.completeMission(id, {xp, sats})` | marca missão como concluída (idempotente) e paga recompensa |
| `ZyroCore.unlockAchievement(id, nome, icone)` | desbloqueia conquista/badge |
| `ZyroCore.markVisited(poiId)` / `hasVisited(poiId)` | controla exploração do mapa |

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `zyrolog-pirapora`).
2. Suba todos os arquivos desta pasta na raiz do repositório (mantendo os nomes exatos).
3. Vá em **Settings → Pages** → Source: `main` branch, pasta `/root`.
4. Aguarde alguns minutos — o site fica em `https://SEU-USUARIO.github.io/zyrolog-pirapora/`.
5. Pronto: `index.html` é a página inicial (mapa do jogo).

## Próximos passos sugeridos

- Adicionar mais POIs seguindo o mesmo padrão (Moraes Grill, Posto Neon, Santuário, Centro Histórico).
- Trocar o "wallet tutorial" mockado do Cartório por integração real com LNURL/Lightning Address.
- Trocar o chat local (`sk8.html`) por um backend real (Firebase, Supabase, etc.) quando quiser multiplayer de verdade.
- Adicionar um leaderboard global via banco de dados simples (hoje o ranking mistura dados fixos + dados locais do jogador).
