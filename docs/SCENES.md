# Cenas históricas (D12)

Uma **cena** é qualquer evento da linha do tempo — de um marco simples (um ponto e uma fonte) a uma
expedição com trajetórias, pontos de interesse e dossiê. As cenas são **dados**, não código:
ficam em JSON versionado em `apps/web/src/data/scenes/` e são validadas pelo schema
`apps/web/src/lib/scenes/schema.ts` (zod) no teste `test/scenes.test.ts`.

> Estado: o formato está definido (D12a). A migração dos marcos atuais, de Magalhães e da Apollo 11
> (D12b), o player genérico (D12c), a ativação explícita (D12d) e a ingestão do Wikidata (D12e)
> vêm a seguir — ver a tarefa D12 no `BACKLOG.md`.

## Campos

| Campo | Obrigatório | Descrição |
|---|---|---|
| `id` | sim | kebab-case, único (`queda-muro-berlim`). |
| `title`, `summary` | sim | Título e resumo em português. |
| `category` | sim | `POLITICS_REGIMES`, `ECONOMY`, `WAR_MILITARY`, `SCIENCE_CULTURE` ou `HEALTH_PANDEMICS`. |
| `date` | sim | `{ start, end?, precision }`. Datas parciais ISO (`1989`, `1989-11`, `1989-11-09`; negativas para a.C.). `precision`: `day`, `month`, `year`, `decade`, `century`. |
| `sources` | sim, ≥ 1 | Fontes citáveis (RN02): `label` e, quando houver, `url`, `authors`, `title`, `publication`, `year`, `doi`. |
| `countries` | não | ISO 3166-1 alfa-3; o primeiro é o principal. `bloc` para blocos. |
| `location` | não | `{ lat, lng }` do ponto principal (pin no globo). |
| `camera` | se houver trajetória | `{ lat, lng, altitude }`, altitude entre os limites da câmera do globo (1,5–6). |
| `layers` | não | Ids de camadas a ligar ao abrir a cena. |
| `borderEra` | não | Era de fronteiras (`HISTORICAL_ERAS`); sem valor, vem do ano. |
| `trajectories` | não | Ver abaixo. |
| `pointsOfInterest` | não | `{ id, name, lat, lng, date?, description? }`. |
| `media` | não | `{ type, url, caption, credit, license }` — só mídia com licença conhecida. |
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
  "countries": ["DEU"],
  "location": { "lat": 52.5163, "lng": 13.3777 },
  "sources": [{ "label": "Bundesarchiv", "url": "https://www.bundesarchiv.de/" }]
}
```
