# UNIVERSO ZERO — Inventário Mestre V1.0

Arquivos de dados independentes da gameplay.

## Conteúdo
- `inventario_mestre.json`: catálogo completo consolidado.
- `mob.json`, `elp.json`, `ilu.json`, `arq.json`, `obj.json`, `tec.json`, `fit.json`: grupos separados.
- `ambientes.json`: cadastro dos ambientes.
- `compatibilidades.json`: regras de compatibilidade.
- `schema_item.json`: contrato de validação de cada registro.

## Resumo
{
  "MOB": 35,
  "ELP": 31,
  "ILU": 14,
  "ARQ": 15,
  "OBJ": 58,
  "TEC": 26,
  "FIT": 20,
  "total": 199
}

## Regras
- IDs são únicos e não devem ser reutilizados.
- `ambientes` contém IDs de ambientes, não nomes livres.
- `disponibilidade` usa os valores documentados em `inventario_mestre.json`.
- `instalacao`: `movel`, `fixa`, `instalado` ou `transportavel`.
- `manipulavel` indica se o personagem pode pegar e carregar o item.
- `compatibilidade` referencia códigos `COMP-xx`.
- `estados` e `atividades` são chaves lógicas para os sistemas de gameplay.

## Integração sugerida
A gameplay deve manter separado:
1. definição do modelo visual;
2. regras de interação;
3. instância colocada no imóvel (posição, rotação, estado atual e slots ocupados).

O catálogo descreve o tipo do objeto; a instância representa cada cópia colocada no mundo.

## Observações
Base V1.0 derivada da listagem aprovada na conversa. Disponibilidade e compatibilidades são propostas iniciais de configuração do jogo, não validações técnicas de fabricantes ou imóveis reais.
