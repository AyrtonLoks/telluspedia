# Cenas históricas (D12)

Uma **cena** é qualquer evento da linha do tempo — de um marco simples (um ponto e uma fonte) a uma
expedição com trajetórias, pontos de interesse e dossiê. As cenas são **dados**, não código:
ficam em JSON versionado em `apps/web/src/data/scenes/` e são validadas pelo schema
`apps/web/src/lib/scenes/schema.ts` (zod) no teste `test/scenes.test.ts`.

> Estado: formato definido (D12a) e dados migrados (D12b) — os 43 marcos simples estão em
> `milestones.json`, Magalhães em `magellan-1519.json` e a Apollo 11 em `glo-1969.json`. O player
> genérico (D12c), a ativação explícita (D12d) e a ingestão do Wikidata (D12e) vêm a seguir.

## Como adicionar um evento

1. Acrescente o objeto a `apps/web/src/data/scenes/milestones.json` (ou crie um arquivo próprio
   para uma cena grande e liste-o em `SCENE_FILES`, em `lib/scenes/catalog.ts`).
2. Rode `pnpm test`: o teste `test/scenes.test.ts` valida cada cena com o schema e acusa o campo
   com problema.
3. O marco aparece na linha do tempo (`timelineScope: "global"`) ou no país (`"country"`).

O cliente não carrega o zod: `catalog.ts` só aplica os valores padrão; a validação completa fica
nos testes.

## Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| `id` | sim | kebab-case, único (`queda-muro-berlim`). |
| `title`, `summary` | sim | Título e resumo em português. |
| `category` | sim | `POLITICS_REGIMES`, `ECONOMY`, `WAR_MILITARY`, `SCIENCE_CULTURE` ou `HEALTH_PANDEMICS`. |
| `date` | sim | `{ start, end?, precision }`. Datas parciais ISO (`1989`, `1989-11`, `1989-11-09`; negativas para a.C.). `precision`: `day`, `month`, `year`, `decade`, `century`. |
| `sources` | sim, ≥ 1 | Fontes citáveis (RN02): `label` e, quando houver, `url`, `authors`, `title`, `publication`, `year`, `doi`. |
| `country` | não | País/entidade principal: ISO 3166-1 alfa-3 ou código histórico do projeto (`SUN`, `AHU`, `TUR_HIST`…). |
| `countries` | não | Todos os envolvidos, quando o evento é de um bloco. `bloc` para o nome do bloco. |
| `timelineScope` | não (padrão `global`) | `global` aparece sempre; `country` só com o país principal selecionado. |
| `location` | não | `{ lat, lng }` do ponto principal (pin no globo). |
| `camera` | se houver trajetória | `{ lat, lng, altitude }`, altitude entre os limites da câmera do globo (1,5–6). |
| `layers` | não | Ids de camadas a ligar ao abrir a cena. |
| `borderEra` | não | Era de fronteiras (`HISTORICAL_ERAS`); sem valor, vem do ano. |
| `trajectories` | não | Ver abaixo. |
| `pointsOfInterest` | não | `{ id, name, lat, lng, date?, description? }`. |
| `media` | não | `{ type, url, caption, credit, license }` — só mídia com licença conhecida. |
| `subtitle`, `facts` | não | Subtítulo e dados de resumo (pares chave → texto/número). |
| `participants` | não | `{ name, role, description?, facts? }` — navios de uma frota, unidades, tripulantes. |
| `chronicle` | não | Diário/crônica: `{ date, place?, text, quote? }`. |
| `dossierMarkdown` | não | Texto longo para o modo leitura. |
| `published` | não (padrão `true`) | Rascunhos (`false`) não aparecem na interface até a revisão humana. |
| `wikidata` | não | QID de origem (`Q12345`). |

### Trajetórias

- **`surface`** — navio, avião, exército ou genérico (`vehicle`: `ship`, `aircraft`, `army`, `generic`).
  `points`: pelo menos dois, em ordem cronológica, cada um com `id`, `name`, `lat`, `lng`, `time`
  (instante ISO com fuso), e opcionalmente `description`, `facts` (pares chave → texto/número exibidos
  como estão) e `quote` (`text` + `source`). O player liga os pontos por geodésicas no globo.
- **`cislunar`** — missão Terra–Lua (`vehicle: "spacecraft"`): `launchSite`, `landingSite` opcional
  (selenográfico) e `phases` com instantes (`launch`, `translunar-injection`, `lunar-orbit-insertion`,
  `landing`…). A geometria é calculada pelo player com a efeméride real da Lua.

## Exemplo mínimo

```json
{
  "id": "queda-muro-berlim",
  "title": "Queda do Muro de Berlim",
  "summary": "Abertura dos postos de controle entre Berlim Oriental e Ocidental.",
  "category": "POLITICS_REGIMES",
  "date": { "start": "1989-11-09", "precision": "day" },
  "country": "DEU",
  "location": { "lat": 52.5163, "lng": 13.3777 },
  "sources": [{ "label": "Bundesarchiv", "url": "https://www.bundesarchiv.de/" }]
}
```
