# TellusPedia — Antigravity Engineering Invariants & Guardrails

Esta regra contextual aplica-se a todas as interações e edições no projeto TellusPedia.

## 0. Coordenação entre agentes (Claude Code, Codex, Antigravity) — OBRIGATÓRIO

Todo trabalho neste repositório é coordenado pelo [docs/BACKLOG.md](docs/BACKLOG.md). Antes de qualquer alteração de código:

1. `git fetch origin` e leia a versão de `origin/master` do backlog (`git show origin/master:docs/BACKLOG.md`) para saber o que os outros agentes estão fazendo.
2. Pegue apenas uma tarefa `TODO` cujas dependências estejam `REVIEW`/`DONE` e cujos **grupos de conflito** não tenham nenhuma tarefa `IN_PROGRESS`/`BLOCKED` (seção 1.2 do backlog). Nunca pegue tarefa de outro agente nem tarefa correlata a uma em execução.
3. Trabalhe **sempre num worktree próprio** (`../telluspedia-wt/<agente>-<id>`), nunca no checkout principal; use a porta de dev server do seu agente.
4. Reivindique a tarefa no backlog e faça push para `origin/master` **antes** de codar.
5. Ao final de toda validação (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`), atualize o backlog, faça commit e push para `origin/master` (rebase antes; nunca `--force`).

O passo a passo completo está na seção 1 do [docs/BACKLOG.md](docs/BACKLOG.md).

## 1. Gráficos 3D & Shaders (Three.js / React Three Fiber)
- **GLSL World-Space Normal Invariant**: Todo shader que calcule incidência solar (terminador dia/noite ou Fresnel) DEVE calcular o vetor normal no espaço mundial:
  ```glsl
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  ```
  NUNCA use `normalMatrix * normal` (espaço de câmera) com `uSunDirection` (espaço mundial), pois causará rotação e distorção indesejadas do terminador solar com a órbita da câmera.
- **Projeção Esférica Paramétrica Não-Espelhada**: A conversão `(lat, lng) -> (x, y, z)` e sua inversa DEVEM alinhar-se estritamente à parametrização da `SphereGeometry` nativa do Three.js:
  ```typescript
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  ```
  NUNCA inverta ou troque `sin(theta)` e `cos(theta)`, pois isso gera reflexão diagonal e espelhamento cartográfico (ex.: o litoral atlântico do Brasil apontando para o oeste).
- **SLERP Orbital e Prevenção de Morte do OrbitControls**: A câmera espacial NUNCA deve utilizar interpolação linear (`camera.position.lerp`) entre coordenadas distantes, pois a trajetória corta o interior do planeta `(0, 0, 0)`. O raio zero viola `minDistance`, gera divisão por zero em `lookAt` e injeta `NaN` nas coordenadas polares do `OrbitControls`, congelando a rotação e o zoom permanentemente. Use sempre `slerpVectors` mantendo altitude $\ge 1.5$ e limpe os deltas residuais de inércia (`_sphericalDelta`, `_scale`, `_panOffset`) ao iniciar o voo.
- **Handover de Alvos Celestes no Modo Cósmico (Prevenção de NaN)**: Ao transicionar o ponto focal do `OrbitControls` (`controls.target`) entre a Terra `(0,0,0)`, a Lua e os diferentes planetas do Sistema Solar, a câmera deve manter um raio de visualização proporcional e seguro (mínimo de $0.4$ para a Lua e $1.5$ para a Terra), evitando vetores nulos que gerem `NaN` nas coordenadas polares do controlador de órbita.
- **Desduplicação da Terra no Espaço Interplanetário**: Em `PlanetarySystem.tsx`, a Terra (`id === "EARTH"`) DEVE ser omitida do loop de esferas genéricas para preservar a malha texturizada com shader dia/noite e Fresnel de `EarthSphere.tsx`, garantindo continuidade visual sem sobreposição de geometrias na GPU.
- **Sincronização com a Linha do Tempo**: A posição solar (`uSunDirection`) e a luz direcional no `GlobeCanvas` devem sempre subscrever reativamente a `selectedYear` e `selectedMilestoneId` do `useTimelineStore` para garantir precisão astronômica histórica (ex.: Apollo 11 em 1969).
- **Render Loop Throttling (RN22)**: Quando `isReaderOpen === true`, o loop de renderização do Three.js deve ser reduzido ou pausado sob demanda para poupar ciclos de GPU e bateria durante a leitura aprofundada de dossiês.

## 2. TopoJSON & Resolução Geográfica
- **Zero-Padding Obrigatório**: Códigos numéricos de países do TopoJSON Natural Earth DEVEM ser normalizados via `String(geom.id).padStart(3, "0")` para bater com o padrão ISO 3166-1 (ex.: `076` para Brasil, `032` para Argentina, `036` para Austrália).
- **Picking Instantâneo**: A detecção de países sob o cursor DEVE utilizar a projeção matemática Lat/Long por raycast na esfera unitária com lookup em memória via `which-polygon` / `d3-geo` (<0.2ms). Nunca crie 177 malhas 3D separadas com colisores individuais na GPU.
- **Descarte de Recursos WebGL**: Toda recomputação de geometria de fronteira dinâmica (`highlightGeometry`) no R3F deve ser descartada via `geometry.dispose()` em hook de efeito para evitar vazamentos de memória de buffer na GPU.

## 3. Persistência & Imutabilidade (RN16)
- **Estudos São Imutáveis**: Registros em `/study/[slug]` são estritamente somente-leitura. Qualquer alteração ou personalização feita pelo visitante deve acionar o endpoint de fork (`/api/studies/[slug]/fork`), criando um novo registro com `parentId`.
- **Rastreabilidade e Citações (RN02)**: Todo indicador deve exibir a fonte primária, o código oficial do indicador e a data de referência, acompanhados de link direto clicável para o repositório original dos dados (`getSourceUrl`). Mantenha os geradores de citações compatíveis com ABNT NBR 6023, APA 7, MLA 9 e BibTeX (.bib).

## 4. Arquitetura React & Hidratação DOM (HTML5 Phrasing Content Invariant)
- **Proibição de `<div>` dentro de `<p>`**: Popups de citação, previews de país e badges interativos embutidos no fluxo de parágrafos de texto (`<p>`) do Reader Mode DEVEM utilizar estritamente elementos de fraseamento (`<span>`, `<a>`, `<button>`, `<strong>`, `<em>`, `<svg>`), estilizados com classes de exibição CSS (`flex`, `block`, `inline-flex`) via Tailwind. O uso de `<div>` dentro de `<p>` força o fechamento implícito da tag pelo navegador e aciona erro fatal de hidratação do React (`validateDOMNesting`).
- **Particionamento Semântico de Listas**: Textos que misturem parágrafos introdutórios e marcadores (`- `) devem ser particionados em elementos irmãos `<p>` e `<ul>` contendo `<li>`. Nunca aninhe listas dentro de parágrafos.

## 5. Design System (D14 — “Instrumento sereno”)
- **Novos componentes usam os primitivos e os tokens.** Primitivos em `apps/web/src/components/ui` (`Panel`, `Card`, `Button`, `IconButton`, `Switch`, `Chip`, `Badge`, `Stat`, `Tooltip`, `Dialog`, `Tabs`; importe de `@/components/ui`). Tokens em `apps/web/src/styles/globals.css` (CSS variables) expostos pelo `tailwind.config.ts`. Vitrine em `/dev/ui` (somente `pnpm dev`).
- **Cores:** apenas classes semânticas (`bg-surface`, `bg-surface-raised`, `border-line`, `text-fg`, `text-fg-secondary`, `text-fg-muted`, `text-accent`, `bg-success|warning|danger`, `cat-*`, `layer-*`). Proibido em componentes migrados/novos: paleta crua do Tailwind (`slate-*`, `cyan-*`…), hex/rgb em classe (`bg-[#…]`) e glow colorido. O acento ciano significa **interativo/selecionado** — não use como borda ou decoração neutra. Cores saturadas são reservadas a **dados** (categorias da timeline e camadas do Observatório) via `TONES` / `CATEGORY_TONE`.
- **Tipografia:** só os 5 tamanhos `text-caption` (12), `text-label` (13), `text-body` (15), `text-title` (18), `text-display` (24). Proibido `text-[9px]`/`[10px]`/`[11px]` e `text-xs|sm|lg|xl…` em componentes migrados/novos. Caixa normal (sentence case); `font-mono` + `tabular-nums` apenas para números. Merriweather (`font-serif`) só no texto corrido do Reader.
- **Forma e movimento:** raios `rounded-control` (6) / `rounded-card` (10) / `rounded-panel` (14); sombras `shadow-e1` / `shadow-e2`; durações `duration-fast|base|slow` com `ease-out`. Superfícies translúcidas sobre o globo: `bg-surface/86` + `backdrop-blur-md` (já embutido no `Panel`).
- **Acessibilidade mínima:** `IconButton` exige `label` (vira `aria-label`); `Switch` exige `label` ou `aria-labelledby`; ícones decorativos com `aria-hidden`. Para mesclar classes use `cn()` de `@/components/ui` (o `tailwind-merge` dele conhece os tokens — com o `twMerge` puro, `text-caption` e `text-fg` se anulam).
- **Regressão automática:** `apps/web/test/design-system.test.tsx` falha se um arquivo migrado voltar a usar cor/tamanho fora dos tokens. Ao migrar um componente, acrescente-o à lista `MIGRATED` desse teste.
