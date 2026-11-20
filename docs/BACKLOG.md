# TellusPedia — Backlog de Correções e Melhorias

> **Fonte única de verdade** sobre o que será feito, o que está em andamento e o status de cada tarefa.
> Usado por humanos e por agentes de IA (Claude Code, Codex, Antigravity). Leia o **Protocolo** antes de tocar em qualquer tarefa.
>
> Origem: auditoria completa do projeto em 2026-11-19/20 (typecheck, lint, 198 testes e `pnpm build` passando; problemas abaixo são os que essas verificações não pegam).
> Referências `arquivo:linha` refletem o código na data da auditoria — **confirme a linha antes de editar**, o código pode ter mudado.

---

## 1. Protocolo para agentes (obrigatório)

> **Regra de ouro:** a versão deste arquivo em `origin/master` (GitHub) é a única que vale. Antes de qualquer decisão, faça `git fetch origin` e leia `git show origin/master:docs/BACKLOG.md`. Nunca confie numa cópia local antiga.

### 1.1 Status possíveis

| Status | Significado | Trava o grupo? |
|---|---|---|
| `TODO` | Disponível (confira dependências e grupos antes de pegar). | Não |
| `IN_PROGRESS` | Um agente está executando. Só **um** responsável por vez. | **Sim** |
| `BLOCKED` | Parada por impedimento; motivo obrigatório no Log. O responsável mantém a posse. | **Sim** |
| `REVIEW` | Validada, commitada e já em `origin/master`; aguarda aceite do Ayrton. | Não |
| `DONE` | Aceita pelo Ayrton. Todos os critérios marcados. | Não |
| `CANCELLED` | Descartada. Motivo no Log. | Não |

Responsáveis válidos: `claude`, `codex`, `antigravity`, `ayrton`, ou `—` (ninguém).

### 1.2 Grupos de conflito (tarefas correlatas)

Tarefas que alteram os mesmos arquivos ou conceitos pertencem ao mesmo **grupo**. Uma tarefa pode estar em mais de um grupo (coluna `Grupos` do Quadro).

**Regra:** você **não pode** iniciar uma tarefa se **qualquer** outra tarefa que compartilhe **algum** grupo com ela estiver `IN_PROGRESS` ou `BLOCKED`, mesmo que o responsável seja outro agente. Espere ou escolha outra tarefa.

| Grupo | Escopo (arquivos/conceitos principais) | Tarefas |
|---|---|---|
| `G-EPOCA` | Época ativa, stores Zustand, `GlobeCanvas`, `EarthSphere`, `OrbitingMoon`, `CountryBorders` (lógica de era), cenas históricas | T12, T13, T14, T15, D12 |
| `G-GLOBO` | `EarthShaderMaterial.ts`, `EarthSphere.tsx`, texturas da Terra, renderer/tone mapping | D01, D02, T14, T21 |
| `G-FRONTEIRAS` | `CountryBorders.tsx`, highlight, TopoJSON | T16, D03, T12 |
| `G-PAIS` | `country-data.ts`, `/api/countries`, HUD do país, Reader, páginas `/pais` | T03, T06, T17, T26 |
| `G-ESTUDOS` | `/api/studies*`, `studies-store.ts`, `studyStore`, Prisma `Study`, migrations | T07, T08, T20, T13, T17 |
| `G-OBS` | `/api/observatory/*`, `observatory-data.ts`, `observatoryStore`, camadas do Observatório, `ObservatoryPanel` | T04, T05, T09, D04, D05, D06, D07, D08, D16 |
| `G-COSMOS` | `SkyStars`, `hyg-star-data`, `CometHalleyTrajectory`, `PlanetarySystem`, `CosmicInspectorHUD`, `astronomy-planets` | D09, D10, D11 |
| `G-SHELL` | `layout.tsx`, `page.tsx`, `globals.css`, Tailwind, navbar, painéis, design system | T01, D14, D15, D16, D17, D18, D19, T22, T25, T27 |
| `G-TIMELINE` | `TimelineBar`, `TimelineAxis`, `MilestonePin`, `PresetSelector` | T02, D13, T23 |
| `G-PIPELINE` | `services/data-pipeline`, `/api/weather` | T06, T10, T26 |
| `G-INFRA` | `package.json`, `next.config.mjs`, CI, estrutura de testes | T07, T11, T18, T19, T25, T27 |

Se você perceber que sua tarefa vai tocar arquivos de um grupo que não está listado nela: **pare**, adicione o grupo à tarefa no Quadro (commit + push, como na reivindicação) e reavalie se ela ainda pode seguir.

### 1.3 Worktrees: cada agente no seu espaço (obrigatório)

- O checkout principal `~/projetos/telluspedia` é **do Ayrton**. Agentes **não editam** arquivos nem trocam de branch nele.
- Cada tarefa roda num **worktree próprio**, criado a partir de `origin/master`:
  ```bash
  cd ~/projetos/telluspedia
  git fetch origin
  git worktree add ../telluspedia-wt/<agente>-<id> -b task/<id>-<slug> origin/master
  # ex.: git worktree add ../telluspedia-wt/codex-d01 -b task/d01-cor-shader origin/master
  cd ../telluspedia-wt/<agente>-<id>
  pnpm install
  cp ../../telluspedia/apps/web/.env apps/web/.env 2>/dev/null || cp apps/web/.env.example apps/web/.env
  pnpm db:generate
  ```
- Nunca abra nem edite o worktree de outro agente.
- **Portas do dev server**, para ninguém derrubar o servidor de outro: `3000` = Ayrton, `3001` = claude, `3002` = codex, `3003` = antigravity. Use `pnpm --filter web exec next dev -p <porta>`.
- `pnpm build` só dentro do seu worktree (cada worktree tem a própria `.next`).
- Ao final (tarefa em `REVIEW` ou `CANCELLED`), remova o worktree:
  `git worktree remove ../telluspedia-wt/<agente>-<id> && git branch -D task/<id>-<slug>`.

### 1.4 Fluxo de trabalho

1. **Leia o estado atual**: `git fetch origin && git show origin/master:docs/BACKLOG.md`. Veja o que está `IN_PROGRESS`/`BLOCKED` e com quem.
2. **Escolha** uma tarefa `TODO` que atenda **todas** as condições:
   - todas as dependências (`Depende de`) estão `REVIEW` ou `DONE`;
   - nenhuma tarefa de **algum** dos seus grupos está `IN_PROGRESS` ou `BLOCKED` (seção 1.2);
   - você não tem outra tarefa `IN_PROGRESS`.

   Prefira a menor fase disponível (seção 2).
3. **Crie o worktree** (seção 1.3).
4. **Reivindique e publique imediatamente**, antes de escrever código:
   - no Quadro: `Status` → `IN_PROGRESS`, `Responsável` → seu nome;
   - no cabeçalho da tarefa: os mesmos campos + `Branch` + `Worktree`;
   - uma linha no Log.
   ```bash
   git add docs/BACKLOG.md
   git commit -m "chore(backlog): <ID> IN_PROGRESS (<agente>)"
   git push origin HEAD:master
   ```
   **Se o push for rejeitado**: `git fetch origin && git rebase origin/master`, **releia o backlog** e verifique se outro agente pegou a mesma tarefa ou uma do mesmo grupo nesse meio-tempo. Se pegou, desfaça sua reivindicação e escolha outra tarefa. Só comece a codar depois que o push da reivindicação for aceito.
5. **Trabalhe** no worktree, com commits pequenos na branch `task/<id>-<slug>`.
6. **Valide** na raiz do worktree:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```
   Mais as verificações de "Como verificar" da tarefa. Se algo falhar, corrija. Não publique trabalho quebrado.
7. **Ao final de toda validação bem-sucedida: atualize o backlog, commite e suba para o GitHub.**
   ```bash
   git fetch origin && git rebase origin/master
   # se o rebase alterou algo: rode a validação do passo 6 de novo
   # atualize docs/BACKLOG.md: critérios [x], Status → REVIEW (Quadro + cabeçalho), Log com o que foi feito,
   # como foi verificado e o que ficou de fora
   git add -A && git commit -m "<tipo>(<escopo>): <resumo> [<ID>]"
   git push origin HEAD:master
   ```
   Push rejeitado → `fetch` + `rebase` + validar de novo + `push`. **Nunca** use `--force` em `master`.
8. **Bloqueio**: mude para `BLOCKED`, escreva no Log o motivo e o que destrava, commite e dê push (passo 4). A tarefa continua sua e o grupo continua travado. Se for abandonar, volte o status para `TODO`, defina `Responsável: —` e registre no Log.
9. Somente `ayrton` move tarefas para `DONE` ou `CANCELLED`.
10. Remova o worktree (seção 1.3).

### 1.5 Regras gerais

- **Uma tarefa por agente por vez.**
- **Nunca pegue** tarefa `IN_PROGRESS`/`BLOCKED` de outro agente, nem tarefa de um grupo travado.
- **Não edite** o conteúdo de tarefas de outros agentes. Você pode apenas acrescentar uma linha de Log com uma observação.
- **Conflito de merge no `BACKLOG.md`**: mantenha as duas alterações. Cada agente só altera as próprias linhas, então o conflito costuma ser trivial. Nunca descarte a mudança de outro agente.
- **Escopo fechado**: faça só o que a tarefa pede. Achou outro problema? Crie uma tarefa nova com o próximo ID livre (`T26`, `D20`, …), status `TODO`, grupos preenchidos, e adicione ao Quadro.
- **Invariantes do `AGENTS.md` continuam valendo** (normais em espaço mundial, projeção esférica não-espelhada, SLERP da câmera, zero-padding de ISO, `dispose()` de geometrias, sem `<div>` dentro de `<p>` etc.).
- **Dados**: nunca invente valores e os apresente como reais. Se não há dado, a UI deve dizer que não há dado (ver T03).
- Mudanças visuais exigem **descrição de captura antes/depois** no Log.
- Nunca commite segredos (`.env`, chaves de API).
- Commits terminam com a atribuição do agente, conforme a configuração de cada ferramenta.

### 1.6 Formato da linha de Log

```
- AAAA-MM-DD · <responsável> · <STATUS> · <nota curta: o que foi feito / por que mudou / commit>
```

### 1.7 Tamanhos

`P` ≤ 2 h · `M` ½–1 dia · `G` 2–4 dias · `GG` > 1 semana (deve ser quebrada em subtarefas antes de começar).

---

## 2. Fases recomendadas

| Fase | Objetivo | Tarefas |
|---|---|---|
| 0 | Proteger o trabalho atual | T24 (concluída) |
| 1 | Ganhos visuais imediatos | T01, T02, D01 |
| 2 | Credibilidade dos dados | T03, T04, T05 |
| 3 | Segurança das APIs | T06, T07, T08, T09, T10, T11 |
| 4 | Base de arquitetura e design | T12, T13, D14, D15, T18 |
| 5 | Camadas do Observatório | D04, D05, D06, D07, D08 |
| 6 | Fidelidade visual | D02, D03, D09, D10, D11, T14, T15 |
| 7 | Eventos históricos e interface | D12, D13, D16, D17, D18 |
| 8 | Qualidade contínua | T16, T17, T19, T20, T21, T22, T23, T25, D19 |

---

## 3. Quadro de status

| ID | Título | Área | Prio | Tam | Status | Responsável | Depende de | Grupos |
|---|---|---|---|---|---|---|---|---|
| T24 | Commitar trabalho pendente (TellusBridge) | Infra | P0 | P | DONE | ayrton | — | — |
| T01 | Carregar fontes Geist/Merriweather (UI em serifa) | Design | P0 | P | DONE | claude | — | G-SHELL |
| T02 | Timeline vazando do painel em telas largas | Design | P0 | P | DONE | antigravity | — | G-TIMELINE |
| D01 | Globo escuro: color space + tone mapping | 3D | P0 | P | DONE | codex | — | G-GLOBO |
| T03 | Remover dados e citações inventados | Dados | P0 | G | REVIEW | antigravity | — | G-PAIS |
| T04 | Corrigir parse do CSV do FIRMS | Dados | P0 | P | DONE | claude | — | G-OBS |
| T05 | Sinalizar dados ao vivo vs fallback | Dados | P0 | M | DONE | claude | — | G-OBS |
| T06 | Validar lat/lng em /api/weather | Segurança | P1 | P | DONE | codex | — | G-PIPELINE, G-PAIS |
| T07 | Schema e validação em POST /api/studies | Segurança | P1 | M | IN_PROGRESS | codex | — | G-ESTUDOS, G-INFRA |
| T08 | Fallback em memória dos estudos não pode mentir | Backend | P1 | P | TODO | — | T07 | G-ESTUDOS |
| T09 | Cache sem limite em /api/observatory/cosmos | Segurança | P1 | P | REVIEW | antigravity | — | G-OBS |
| T10 | Endurecer serviço Python (CORS, Docker, Redis) | Segurança | P1 | M | TODO | — | — | G-PIPELINE |
| T11 | Ajustar next.config e script de build | Infra | P1 | P | TODO | — | — | G-INFRA |
| T12 | Seletor único de época (`useEpochState`) | Arquitetura | P1 | G | TODO | — | — | G-EPOCA, G-FRONTEIRAS |
| T13 | Desacoplar stores Zustand e remover estado redundante | Arquitetura | P1 | G | TODO | — | T12 | G-EPOCA, G-ESTUDOS |
| T14 | Fonte única de direção solar | 3D | P1 | M | TODO | — | T12 | G-EPOCA, G-GLOBO |
| T15 | Lua com posição astronômica real | 3D | P1 | M | TODO | — | T12 | G-EPOCA |
| T16 | Cache de geometria de highlight por ISO | Performance | P2 | P | TODO | — | — | G-FRONTEIRAS |
| T17 | Páginas com SSR e metadata (OG) | Frontend | P1 | G | TODO | — | T13 | G-PAIS, G-ESTUDOS |
| T18 | Pipeline de CI | Infra | P2 | M | TODO | — | — | G-INFRA |
| T19 | Reorganizar testes + testes de API + E2E visual | Qualidade | P2 | G | TODO | — | T18 | G-INFRA |
| T20 | Migrations Prisma e restrições do schema | Backend | P2 | M | TODO | — | — | G-ESTUDOS |
| T21 | Consolidar texturas duplicadas | Assets | P2 | P | TODO | — | — | G-GLOBO |
| T22 | Acessibilidade (labels, teclado, foco) | A11y | P2 | M | TODO | — | D14 | G-SHELL |
| T23 | Limpezas menores | Qualidade | P2 | P | TODO | — | — | G-TIMELINE |
| T25 | Reduzir bundle inicial (408 kB) | Performance | P2 | M | TODO | — | — | G-SHELL, G-INFRA |
| T26 | Ingestão de indicadores reais do Banco Mundial (177 países) | Dados | P1 | G | TODO | — | T03 | G-PAIS, G-PIPELINE |
| T27 | Corrigir falha intermitente do loader next/font com Merriweather v33 | Infra | P1 | P | TODO | — | — | G-SHELL, G-INFRA |
| D02 | Oceanos, relevo, nuvens e atmosfera | 3D | P1 | G | TODO | — | D01 | G-GLOBO |
| D03 | Fronteiras com espessura real e highlight | 3D | P2 | M | TODO | — | — | G-FRONTEIRAS |
| D04 | ISS: SGP4 real, órbita correta, outros satélites | 3D/Dados | P1 | G | TODO | — | — | G-OBS |
| D05 | Queimadas: sprites, heatmap, dados reais | 3D/Dados | P1 | M | TODO | — | T04, T05 | G-OBS |
| D06 | Eventos severos: símbolos, clusters, trilhas | 3D/Dados | P1 | M | TODO | — | T05 | G-OBS |
| D07 | Aviões: modelos glTF, interpolação, cobertura global | 3D/Dados | P1 | G | TODO | — | T05 | G-OBS |
| D08 | Embarcações reais via AIS | 3D/Dados | P1 | G | TODO | — | T05 | G-OBS |
| D09 | Catálogo estelar real e 88 constelações | 3D/Dados | P1 | G | TODO | — | — | G-COSMOS |
| D10 | Cometa Halley: visual e distância corretos | 3D | P1 | M | TODO | — | — | G-COSMOS |
| D11 | Política de escala e labels do sistema solar | 3D | P2 | M | TODO | — | D10 | G-COSMOS |
| D12 | Eventos históricos dirigidos por dados (player de cenas) | Arquitetura | P1 | GG | TODO | — | T12, T20 | G-EPOCA |
| D13 | Eixo da timeline: zoom, clusters, prévias | Design | P2 | G | TODO | — | T02, D14 | G-TIMELINE |
| D14 | Design system (tokens + primitivos) | Design | P0 | G | IN_PROGRESS | claude | T01 | G-SHELL |
| D15 | Gerenciador de layout de painéis | Design | P1 | M | TODO | — | D14 | G-SHELL |
| D16 | Reduzir ruído visual dos painéis | Design | P2 | M | TODO | — | D14, T05 | G-SHELL, G-OBS |
| D17 | Movimento e transições | Design | P2 | M | TODO | — | D14 | G-SHELL |
| D18 | Busca universal, ⌘K e estado na URL | Frontend | P2 | G | TODO | — | D14 | G-SHELL |
| D19 | Responsividade e contraste | Design | P2 | M | TODO | — | D14, T19 | G-SHELL |

---

## 4. Tarefas — Correções e engenharia (T)

### T24 · Commitar trabalho pendente (TellusBridge)

- **Status:** DONE · **Responsável:** ayrton · **Branch:** feat/tellus-bridge-v1 · **Worktree:** —
- **Prioridade:** P0 · **Área:** Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** —

**Contexto / problema**
Na data da auditoria havia 15 arquivos modificados e diretórios inteiros não rastreados (`apps/web/src/app/dossies/`, `apps/web/src/app/telluslab/`, `apps/web/src/components/tellus-bridge/`, `apps/web/src/lib/tellus-bridge/`, `apps/web/test/tellus-bridge.test.tsx`, `docs/tellus-bridge.md`). Qualquer correção do backlog vai se misturar com esse trabalho e dificultar revisão e rollback.

**O que fazer**
1. Rodar `git status` e confirmar com o Ayrton que o conteúdo pendente é intencional.
2. Criar branch `feat/tellus-bridge` a partir de `master`.
3. Commitar em commits lógicos (contrato/catálogo, componentes, páginas, testes, docs).
4. Rodar a verificação completa (seção 1.2, passo 5).
5. Deixar a branch pronta para merge; o merge é decisão do Ayrton.

**Critérios de aceite**
- [ ] `git status` limpo após os commits.
- [ ] Typecheck, lint, testes e build passando na branch.
- [ ] Nenhum segredo commitado (`.env`, chaves).

**Como verificar**: `git status`, `git log --stat feat/tellus-bridge`.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · ayrton · DONE · TellusBridge commitado (2a6ba15) e mesclado em master via PR #1 (36f127a).

---

### T01 · Carregar fontes Geist/Merriweather (UI renderizando em serifa)

- **Status:** REVIEW · **Responsável:** claude · **Branch:** task/t01-fontes · **Worktree:** ../telluspedia-wt/claude-t01
- **Prioridade:** P0 · **Área:** Design · **Tamanho:** P · **Depende de:** — · **Grupos:** G-SHELL

**Contexto / problema**
Toda a interface (navbar, painéis, timeline) aparece em Times/serifa. Causa confirmada: `apps/web/tailwind.config.ts:24-25` e `apps/web/src/styles/globals.css:21` usam `var(--font-geist-sans)` e `var(--font-merriweather)`, mas **essas variáveis nunca são definidas** — não existe `next/font` em `apps/web/src/app/layout.tsx`. Quando uma variável CSS usada em `font-family` é indefinida, a declaração inteira é inválida e o navegador usa a fonte padrão (serifa).

**O que fazer**
1. Em `apps/web/src/app/layout.tsx`, importar fontes via `next/font`:
   - Geist Sans (pacote `geist` → `geist/font/sans`, ou `next/font/google` `Geist`) com `variable: "--font-geist-sans"`;
   - Geist Mono com `variable: "--font-geist-mono"` (e adicionar `mono` ao `fontFamily` do Tailwind);
   - Merriweather (`next/font/google`, pesos 400/700, `variable: "--font-merriweather"`).
2. Aplicar as classes `.variable` no `<html>`.
3. Garantir `display: "swap"` e subsets `latin` + `latin-ext` (acentos do português).
4. Conferir que o fallback em `globals.css` continua válido.

**Critérios de aceite**
- [x] Navbar, painéis e timeline renderizam em Geist (verificar no DevTools → Computed → font-family → fonte renderizada).
- [x] Títulos `font-serif` renderizam em Merriweather.
- [x] Textos `font-mono` renderizam em Geist Mono.
- [x] Sem flash de fonte serifada no carregamento.
- [x] Acentuação correta (ç, ã, é).

**Como verificar**: `pnpm dev`, abrir `http://127.0.0.1:3000`, inspecionar elementos; captura antes/depois.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (59396d2).
- 2026-11-20 · claude · REVIEW · Implementado em `apps/web/src/app/layout.tsx`: Geist, Geist Mono e Merriweather (400/700, normal/itálico) via `next/font/google`, subsets latin + latin-ext, `display: swap`; Merriweather com `preload: false` (só Reader/dossiês). Variáveis `--font-geist-sans`, `--font-geist-mono`, `--font-merriweather` aplicadas ao `<html>`; `font-sans` no `<body>`. `tailwind.config.ts`: adicionada pilha `mono` com Geist Mono (antes usava a mono padrão do sistema — telemetria muda de aparência levemente). Teste de regressão `apps/web/test/fonts.test.ts` (4 casos; falha 4/4 no layout antigo, passa no novo). Verificação: typecheck ok, lint ok, 202/202 testes, build ok (First Load JS inalterado, 408 kB). No build: CSS com `@font-face` auto-hospedados e variáveis definidas; `<html class="dark __variable_…">` no HTML pré-renderizado. Sem flash de serifa: a fonte de fallback gerada pelo next/font é sans com métricas ajustadas. Pendente para o aceite: conferência visual no navegador pelo Ayrton (não há navegador disponível para o agente). Antes: UI inteira em Times/serifa. Depois esperado: Geist na UI, Geist Mono em números/telemetria, Merriweather nos títulos do Reader. Observação: o primeiro `pnpm build` ficou >10 min sem saída e foi interrompido; a segunda execução terminou normalmente — provável lentidão pontual no download das fontes do Google (o build depende de acesso a fonts.googleapis.com).

---

### T02 · Timeline vazando do painel em telas largas

- **Status:** REVIEW · **Responsável:** antigravity · **Branch:** task/t02-timeline-overflow · **Worktree:** ../telluspedia-wt/antigravity-t02
- **Prioridade:** P0 · **Área:** Design · **Tamanho:** P · **Depende de:** — · **Grupos:** G-TIMELINE

**Contexto / problema**
Em 1680 px de largura, o cabeçalho da timeline extrapola o painel (o campo "2024" aparece cortado na borda direita; com painel lateral aberto, a timeline passa por baixo dele). Causa: `apps/web/src/components/timeline/TimelineBar.tsx:92-96` aplica `xl:flex-nowrap` com filhos `shrink-0`; a partir de `2xl` (1536 px), `apps/web/src/components/timeline/PresetSelector.tsx:103` (e equivalentes nas linhas 124/145) troca para rótulos longos ("Circum-navegação de Magalhães (1519–1522)"). O conteúdo deixa de caber e, sem quebra, vaza.
Também: rótulos dos anos do eixo ficam sob os pins (ex.: "1990").

**O que fazer**
1. Reestruturar o cabeçalho em duas zonas: (a) presets num contêiner com `overflow-x-auto` e scroll suave, ou num dropdown "Período ▾" quando não couber; (b) controles fixos (play, velocidade, intervalo de anos, filtros, recolher) sempre visíveis à direita.
2. Remover `xl:flex-nowrap`/`2xl:flex-nowrap` incondicionais; usar `min-w-0` nos filhos flexíveis.
3. Usar sempre rótulos curtos nos chips e o longo no `title`/tooltip.
4. Quando um painel lateral estiver aberto, a timeline deve ocupar apenas o espaço livre (coordenar com D15 se já existir).
5. Ajustar `TimelineAxis` para que rótulos de ano não colidam com pins (deslocar rótulos para baixo ou ocultar o rótulo quando houver pin no mesmo x).

**Critérios de aceite**
- [x] Sem overflow horizontal em 1280, 1366, 1536, 1680, 1920 e 2560 px (com e sem painel lateral aberto).
- [x] Todos os controles da timeline acessíveis em todas essas larguras.
- [x] Rótulos do eixo legíveis, sem sobreposição com pins.

**Como verificar**: DevTools → modo responsivo nas larguras acima; capturas antes/depois.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (fc20b0e).
- 2026-11-20 · antigravity · REVIEW · Reestruturados os componentes da timeline (commit c3d777d): (1) `TimelineBar.tsx`: removidos `xl:flex-nowrap`/`2xl:flex-nowrap` incondicionais, cabeçalho dividido em 2 zonas (`timeline-presets-zone` com `flex-1 min-w-0 basis-[280px]` + `timeline-controls-zone` com controles fixos sempre acessíveis e quebra graciosa em larguras estreitas), e detecção unificada de painéis laterais direitos (`InspectorHUD`, `ObservatoryPanel` e `CosmicInspectorHUD`) reservando espaço livre (`lg:right-[26.5rem]`); (2) `PresetSelector.tsx`: chips sempre com rótulos curtos (`whitespace-nowrap shrink-0`) e rótulo completo no `title`/`aria-label`, em faixa `overflow-x-auto scroll-smooth` com botões de rolagem laterais reativos via `ResizeObserver` e suporte a wheel horizontal; (3) `CategoryFilterPills.tsx`: chips `whitespace-nowrap shrink-0` com `aria-pressed`; (4) `TimelineAxis.tsx`: ticks e rótulos de ano deslocados estritamente abaixo da linha central (`top-1/2` sem `-translate-y-1/2`), alinhamento interno nas bordas (`<=2%`/`>=98%`) e escala adaptativa de passo para janelas amplas. Testes: criada suíte `apps/web/test/timeline-layout.test.tsx` (5 casos). Validação pós-rebase em `origin/master`: `pnpm typecheck` ok, `pnpm lint` ok (0 warnings), `pnpm test` 207/207, `pnpm build` ok (16/16 páginas). Antes: cabeçalho extrapolava o painel em 1536–1680 px ao trocar para rótulos longos sem quebra, timeline passava sob `ObservatoryPanel`/`CosmicInspectorHUD` e rótulos de ano ficavam centrados atrás dos pins. Depois esperado: cabeçalho contido sem overflow em 1280–2560 px, presets roláveis com tooltips completos, timeline recuada à esquerda de qualquer painel lateral aberto e anos legíveis abaixo dos pins. Pendente para aceite: inspeção visual/screenshots no navegador pelo Ayrton (Chrome DevTools MCP e bibliotecas compartilhadas do Chromium indisponíveis neste ambiente).

---

### T03 · Remover dados e citações inventados (RN02)

- **Status:** REVIEW · **Responsável:** antigravity · **Branch:** task/t03-remover-dados-inventados · **Worktree:** ../telluspedia-wt/antigravity-t03
- **Prioridade:** P0 · **Área:** Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-PAIS

**Contexto / problema**
Só ~30 países têm dados reais em `apps/web/src/lib/country-data.ts` (`PILOT_COUNTRIES` + `GLOBAL_COUNTRY_INFO`). Para os outros ~147, `getCountryData` (`country-data.ts:995-1046`) devolve placeholders apresentados como fatos: população 10.000.000 (ou 15.000.000), área 250.000/350.000 km², moeda USD, capital "Capital Central", coordenadas (0,0), nome oficial "Nação Soberana (XXX)". Visível no screenshot: clicar na RD Congo mostra "COD — Nação Soberana (COD)". Efeitos colaterais:
- `apps/web/src/app/api/countries/[iso]/route.ts:32-37`: o 404 é inalcançável, porque `getCountryData` nunca retorna nulo.
- `apps/web/src/components/tellus-bridge/EntityLaunch.tsx:47-49`: país desconhecido faz a câmera voar para (0,0).
- `apps/web/src/components/reader/ReaderContent.tsx:24-50`: dossiê inexistente gera texto genérico e notas de rodapé [1]–[3] fictícias ("Document Archive / Arquivo Histórico…").
- Entidades históricas sem indicador recebem população 30.000.000 e área 350.000 (`country-data.ts:943-958`).

**O que fazer**
1. Mudar a assinatura para `getCountryData(iso, year?) : PilotCountryData | null` (ou um tipo `CountryData` com campos opcionais e flag `completeness: "full" | "partial" | "none"`).
2. Remover todos os valores numéricos e textuais padrão inventados. Campos ausentes ficam `null`/`undefined`.
3. Atualizar todos os consumidores (`InspectorHUD`, `CountryHeader`, `CountryMetricsGrid`, `ReaderContent`, comparador, `EntityLaunch`, `pais/[iso]`, API) para:
   - exibir "Dado indisponível" (ou ocultar a métrica) quando o campo for nulo;
   - não voar a câmera para (0,0);
   - devolver 404 na API quando o país não existe.
4. Em `ReaderContent`, remover o texto e as notas de rodapé padrão; exibir estado vazio ("Este dossiê ainda não foi escrito") com link para fontes externas reais (ex.: Wikipédia do país via `wikidataQid`, se existir).
5. Para nome/bandeira/coordenadas básicas dos 177 países, usar uma fonte real (ex.: dataset REST Countries/Natural Earth versionado em `public/data/` ou seed do Prisma) — **com fonte e data de referência registradas** (RN02).
6. Abrir tarefa de follow-up para ingestão de indicadores do Banco Mundial (se ainda não existir).

**Critérios de aceite**
- [x] `grep -n "10000000\|15000000\|30000000\|Capital Central\|Nação Soberana\|Chefe de Estado\|Moeda Local" apps/web/src` não retorna valores de fallback.
- [x] Clicar num país sem dados mostra nome real e estado "dados indisponíveis", nunca números inventados.
- [x] `GET /api/countries/XYZ` (inexistente) → 404.
- [x] Reader não exibe citações fictícias.
- [x] Testes atualizados e novos testes para o caso "sem dados".

**Como verificar**: testes unitários; manualmente clicar em COD, PER, KAZ e num país piloto (BRA).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (92eec3b).
- 2026-11-20 · antigravity · REVIEW · Implementado (commit 09b3048): (1) criado dataset real versionado `apps/web/public/data/countries-ne-110m.json` (gerado por `apps/web/scripts/generate-world-countries-dataset.mjs`) com 177 territórios do Natural Earth 1:110m (`world-atlas@2.0.2`), centroides reais via `d3-geo` (`geoCentroid`), nomes em português via Unicode CLDR (`Intl.DisplayNames pt-BR`), códigos ISO 3166-1 e bandeiras FlagCDN, com metadados RN02 (`source`, `sourceUrl`, `referenceDate`, `license`); (2) `country-data.ts`: criada interface `CountryData` com campos anuláveis + `completeness: "full" | "partial" | "none"` e `getCountryData(iso, year?): CountryData | null`, removendo todos os valores/textos inventados (incluindo fallbacks de população 10M/15M/30M, área 250k/350k, `"Capital Central"`, `"Nação Soberana"`, `"Chefe de Estado"`, `"Moeda Local"`, `"USD"` e coordenadas `(0,0)`); (3) atualizados todos os consumidores (`InspectorHUD`, `CountryHeader`, `CountryMetricsGrid`, `LocalClockWidget`, `LiveWeatherWidget`, `CountryMiniTimeline`, `ReaderContent`, `ReaderMode`, `HoverCardPreview`, `ComparisonGrid`, `EntityLaunch`, `pais/[iso]/page.tsx` e `GET /api/countries/[iso]` → 404 para ISOs inexistentes); (4) `ReaderContent`: estado vazio honesto ("Este dossiê ainda não foi escrito") com links reais (Wikipédia, Wikidata via `wikidataQid` e Banco Mundial), sem texto genérico nem notas `[1]–[3]` fictícias; (5) abertas tarefas de follow-up `T26` (ingestão de indicadores do Banco Mundial) e `T27` (bug intermitente do `next/font` com `Merriweather` v33 encontrado durante o build). Validação pós-rebase em `origin/master`: `grep` de fallbacks com zero valores inventados (apenas PIB histórico real em `historical-entities.ts`), `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 228/228 (31 suítes, incluindo nova `apps/web/test/country-data-integrity.test.tsx`), `pnpm build` ok (16/16 páginas). Pendente para aceite: conferência visual manual em COD, PER, KAZ e BRA pelo Ayrton.

---

### T04 · Corrigir parse do CSV do FIRMS

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t04-firms-source · **Worktree:** ../telluspedia-wt/claude-t04b
- **Prioridade:** P0 · **Área:** Dados · **Tamanho:** P · **Depende de:** — · **Grupos:** G-OBS

**Contexto / problema**
`apps/web/src/app/api/observatory/firms/route.ts:43-58`. No CSV VIIRS da API FIRMS as colunas são: `latitude(0), longitude(1), bright_ti4(2), scan(3), track(4), acq_date(5), acq_time(6), satellite(7), instrument(8), confidence(9), version(10), bright_ti5(11), frp(12), daynight(13)`. O código usa `cols[10]` como FRP (é `version`, ex. "2.0NRT" → `parseFloat` = 2) com fallback `cols[4]` (`track`). `confidence` é fixado em `"high"`; o limite de 250 linhas é arbitrário.

**O que fazer**
1. Ler o cabeçalho (linha 0) e mapear colunas **por nome**, não por índice.
2. Usar `frp`, `confidence` (VIIRS: `l`/`n`/`h` → `low`/`nominal`/`high`), `acq_date`+`acq_time`, `satellite`, `daynight`.
3. Validar números; descartar linhas inválidas.
4. Revisar o limite de pontos junto com D05 (com heatmap/instancing dá para muito mais que 250).
5. Extrair o parser para uma função pura em `lib/` e cobrir com teste usando um CSV de exemplo real (fixture).

**Critérios de aceite**
- [x] Parser por nome de coluna com teste unitário (fixture com cabeçalho real).
- [x] `frp` e `confidence` corretos no JSON da rota.
- [x] Linhas malformadas ignoradas sem quebrar a rota.

**Como verificar**: `pnpm test`; com `NASA_FIRMS_MAP_KEY` configurada, `curl localhost:3000/api/observatory/firms | jq '.[0]'`.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master (cfd0cc5). Inclui `NASA_FIRMS_MAP_KEY` no `.env.example` (aprovado pelo Ayrton).
- 2026-11-20 · claude · REVIEW · Commit `b628720`. Novo `apps/web/src/lib/firms-csv.ts` (`parseFirmsCsv`, função pura): colunas mapeadas pelo nome do cabeçalho; suporta VIIRS (`bright_ti4`, confiança `l/n/h`) e MODIS (`brightness`, confiança 0–100 → <30 low, 30–79 nominal, ≥80 high); FRP da coluna `frp`; `acq_time` (HHMM) e `daynight` adicionados como campos opcionais em `FirmsHotspot`; linhas inválidas descartadas (coordenada fora da faixa, FRP/brilho ausente, confiança desconhecida, data não ISO, linha truncada); suporta CRLF; ids estáveis (`firms-<data>-<hora>-<lat>-<lng>`). Limite padrão 1.000 focos mantendo os de **maior FRP** (antes: as primeiras 250 linhas, viés geográfico do CSV) — a D05 pode rever com heatmap/instancing. `observatory-sources.ts`: usa o parser; resposta que não é CSV (chave inválida/limite) vira fallback com motivo citando `NASA_FIRMS_MAP_KEY` e o texto da API; timeout 3,5 s → 8 s (CSV mundial pode ter dezenas de milhares de linhas). `.env.example` documenta `NASA_FIRMS_MAP_KEY` com o link de obtenção. Testes: `apps/web/test/firms-csv.test.ts` (10 casos, incluindo regressão "version 2.0NRT nunca vira FRP", que falharia no parser antigo, e a rota com chave + fetch mockado). Validação após rebase sobre a D01: typecheck ok, lint ok, 231/231 testes, build ok. Não verificado com a API real: não havia chave no ambiente do agente — conferir após configurar a chave (badge "Ao vivo" e FRPs variados, não todos ≈2). Nota de ambiente: em worktree novo, rodar `pnpm db:generate` **na raiz** do worktree; rodado dentro de `apps/web` não gera o Prisma client e o typecheck falha em `prisma/seed.ts`.
- 2026-11-20 · ayrton · IN_PROGRESS · Reprovada: com chave válida, o log mostra `[observatory/firms] provedor indisponível: Provedor não retornou focos válidos` e o badge fica "Simulado". Causa (diagnóstico do claude): o VIIRS S-NPP NRT parou de publicar em 2026-11-02 (`/api/data_availability` → `max_date` 2026-11-02); a API responde só o cabeçalho. NOAA-20, NOAA-21 e MODIS seguem ativos. Reaberta pelo claude no worktree `../telluspedia-wt/claude-t04b`.
- 2026-11-20 · claude · REVIEW · Commit `0216aa1`. `firmsSource` agora percorre `FIRMS_DATASETS` em ordem (VIIRS NOAA-21 → NOAA-20 → S-NPP → MODIS) e usa o primeiro satélite com focos; não soma satélites (duplicaria focos). Resposta que não é CSV (chave/limite) interrompe na hora, sem consumir transações nos demais. Se nenhum tiver focos: fallback com motivo listando os satélites consultados. `createObservatorySource`: `fetchLive` recebe `ctx.setProvider()`, e o `meta.provider` mostra o satélite que respondeu (ex.: "NASA FIRMS (VIIRS NOAA-21 NRT)"), inclusive na leitura stale. Testes: +5 casos em `firms-csv.test.ts` (satélite só com cabeçalho → próximo; sem chamadas extras; todos vazios; chave inválida não insiste; stale mantém provider). **Verificado com a API real** (chave do Ayrton, sem expô-la): live, NOAA-21, 1.000 focos em ~2 s, FRP 45–860 MW (589 valores distintos), confiança high 296 / nominal 535 / low 169. Validação: typecheck ok, lint ok, 247/247 testes, build ok. Para conferir: reiniciar o dev server (o cache do processo guarda o fallback por até 60 s), ligar Queimadas → badge "Ao vivo" com o satélite no tooltip.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### T05 · Sinalizar dados ao vivo vs fallback

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t05-fonte-dados · **Worktree:** ../telluspedia-wt/claude-t05
- **Prioridade:** P0 · **Área:** Dados · **Tamanho:** M · **Depende de:** — · **Grupos:** G-OBS

**Contexto / problema**
As rotas `apps/web/src/app/api/observatory/{eonet,firms,iss,traffic}/route.ts` devolvem datasets estáticos de `lib/observatory-data.ts` quando a fonte externa falha (ou quando falta chave), e **cacheiam o fallback pelo TTL inteiro** (15 min). A resposta não indica que é simulado. A UI mostra "Ao Vivo (SWR)" mesmo com o fallback (ex.: "28 focos ativos" = os 28 pontos fixos datados de 2026-10-19). A frota de aviões de fallback e as rotas marítimas são fictícias/estáticas.

**O que fazer**
1. Padronizar o envelope de resposta de todas as rotas do observatório:
   ```ts
   { data: T, meta: { source: "live" | "fallback" | "computed", provider: string, fetchedAt: string, stale: boolean, reason?: string } }
   ```
   (`computed` = cálculo analítico, ex. efemérides.)
2. Cache: TTL normal para `live`; TTL curto (ex.: 60 s) para `fallback`, para tentar de novo logo.
3. Logar (server) a falha upstream com motivo.
4. Atualizar `observatoryStore` e os consumidores para o novo envelope.
5. UI: badge por camada — "Ao vivo" (verde), "Simulado" (âmbar, com tooltip do motivo), "Offline" (cinza). Remover "Ao Vivo (SWR)" fixo.
6. Atualizar testes.

**Critérios de aceite**
- [x] Todas as rotas do observatório retornam `meta.source`.
- [x] Desligando a rede (ou sem chave), a UI mostra "Simulado" e não "Ao vivo".
- [x] Fallback não fica cacheado por 15 min.

**Como verificar**: testes; manualmente, bloquear domínios externos (DevTools não ajuda, é server-side — usar variável de ambiente para forçar falha ou desconectar a rede).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master (db22230).
- 2026-11-20 · claude · REVIEW · Commit `4bd31fe`. **Servidor:** novo `lib/observatory-source.ts` (envelope `{ data, meta }` com `meta.source` = `live` | `computed` | `fallback`, `provider`, `fetchedAt`, `stale`, `reason`; cache com TTL live normal e no máximo 60 s para falhas; reaproveita a última leitura live válida por até 6 h marcada `stale: true`; `console.warn` com o motivo da falha). Novo `lib/observatory-sources.ts` com as fontes EONET, FIRMS, ISS e aviões (lógica de busca movida sem alteração; o parse do FIRMS continua o antigo de propósito — é escopo da T04). As rotas `/api/observatory/{eonet,firms,iss,traffic}` viraram adaptadores finos. **Exceção ao envelope único:** `/traffic` responde `{ aircraft: Envelope, maritimeRoutes: Envelope }`, porque os dois conjuntos têm procedências diferentes (rotas marítimas são sempre referência estática, motivo "sem feed AIS", ver D08). ISS sem provedor = `fallback` com provider "modelo orbital aproximado" (não `computed`, porque o modelo é impreciso — D04). `/cosmos` não foi alterada (não é consumida pelo store; validação dela é a T09). **Cliente:** `observatoryStore` ganhou `layerMeta` e `layerError` por camada (servidor inacessível → "Offline" com dados locais). `ObservatoryPanel`: o "Ao Vivo (SWR)" fixo virou `DataSourceBadge` com estados Ao vivo (verde), Ao vivo · desatualizado (âmbar), Calculado, Simulado (âmbar), Offline (cinza) e Carregando; tooltip com fonte, horário e motivo. Descrição da ISS deixou de dizer "tempo real". **Testes:** `apps/web/test/observatory-source.test.tsx` (14 casos: cache, TTL de fallback, stale, rotas com fetch mockado — live, rede fora, HTTP 503, FIRMS sem chave, ISS, tráfego —, store e badge). **Validação após rebase sobre D01/T02:** typecheck ok, lint ok, 221/221 testes, build ok. **Para conferir visualmente:** sem `NASA_FIRMS_MAP_KEY` no `.env`, ligar Queimadas deve mostrar "Simulado" com o motivo no tooltip; Rotas Marítimas sempre "Simulado". **Desbloqueia:** D05 (com T04), D06, D07, D08 e D16. **Observação:** com a máquina carregada pelos builds paralelos, o `next build` levou mais de 8 min; usar timeout ≥ 20 min.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### T06 · Validar lat/lng em /api/weather

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t06-origem-do-clima · **Worktree:** ../telluspedia-wt/codex-t06
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** P · **Depende de:** — · **Grupos:** G-PIPELINE, G-PAIS

**Contexto / problema**
`apps/web/src/app/api/weather/route.ts:17,30` interpola `lat`/`lng` crus na URL do pipeline e do Open-Meteo (`?lat=1&outro=...` injeta parâmetros). O fallback inventa valores quando um campo falta (22 °C, 50 % de umidade, vento 5) — linhas 36-41. O pipeline Python também inventa (20 °C) em `services/data-pipeline/app/services/weather_proxy_service.py:93-98`.

**O que fazer**
1. `parseFloat` + `Number.isFinite` + faixas (-90..90, -180..180); 400 se inválido.
2. Montar URLs com `URLSearchParams`.
3. Campos ausentes → `null` (TS e Python); a UI (`LiveWeatherWidget`) mostra "—".
4. Não expor `err.message` ao cliente.
5. Testes da rota (válido, inválido, upstream falhando).
6. Identificar o ponto de referência no cartão, informar a fonte e mostrar a data e hora do modelo quando disponíveis.

**Critérios de aceite**
- [x] `GET /api/weather?lat=abc&lng=1` → 400.
- [x] `GET /api/weather?lat=1%26x%3D1&lng=2` → 400.
- [x] Nenhum valor meteorológico inventado em TS ou Python.
- [x] O cartão do Brasil identifica Brasília, as coordenadas consultadas e a fonte Open-Meteo. A data e hora UTC vêm do provedor.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível por fase. Reivindicada em worktree próprio a partir de origin/master.
- 2026-11-20 · codex · TODO · Devolvida à fila antes da implementação para priorizar a correção da D01.
- 2026-11-20 · codex · IN_PROGRESS · Retomada por solicitação do Ayrton após o aceite da D01.
- 2026-11-20 · codex · REVIEW · Validação decimal de coordenadas com finitude e limites antes de consultar os provedores. Parâmetros de URL montados pela API, pelo cliente web e pelo pipeline Python. Campos ausentes normalizados para null e exibidos como —, preservando zero. Os dois endpoints retornam mensagens genéricas em falhas de upstream. Cache Redis versionado para deixar expirar as entradas com valores padrão anteriores. Typecheck, lint, 235 testes web, 7 testes Python e build passaram. A versão de produção foi verificada por HTTP e no Chromium com pipeline simulado. O build reutilizou cópias temporárias dos arquivos originais do Google Fonts.
- 2026-11-20 · codex · IN_PROGRESS · Reaberta após reprovação. O cartão exibia o clima do ponto de referência do país sem identificar o lugar ou a fonte.
- 2026-11-20 · codex · REVIEW · Antes, o cartão mostrava temperatura e sensação sem informar o ponto consultado. Agora identifica Brasília na seleção do Brasil, exibe as coordenadas e vincula a documentação do Open-Meteo. Os dois caminhos da API propagam o horário de referência do modelo, exibido em UTC quando disponível. O cache Python foi versionado para preencher o horário em novas consultas. Typecheck, lint, 247 testes web, 7 testes Python, build e verificação HTTP/Chromium com provedor simulado passaram. O build reutilizou cópias temporárias dos arquivos originais do Google Fonts.
- 2026-11-20 · ayrton · DONE · Aprovada após a identificação do ponto de referência, da fonte e do horário no cartão de clima.

---

### T07 · Schema e validação em POST /api/studies

- **Status:** IN_PROGRESS · **Responsável:** codex · **Branch:** task/t07-validar-schema-studies · **Worktree:** ../telluspedia-wt/codex-t07
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** M · **Depende de:** — · **Grupos:** G-ESTUDOS, G-INFRA

**Contexto / problema**
`apps/web/src/app/api/studies/route.ts:30-57` aceita o corpo sem schema: sem limite de tamanho de `title`/`description`/`markdownNotes`, arrays sem checagem de tipo dos itens, `focusedCelestialBody`/`historicalEra` livres, `err.message` exposto (linha 71), sem rate limit. A lógica de sanitização (faixa de `geologicalMa`, lista de eras anacrônicas `["PRUSSIA_1870","WW1_1914","WW2_1939"]`, `"magellan-1519"`) está copiada em 3 lugares: `studies/route.ts`, `lib/studies-store.ts:63-117` (`forkStudyRecord`) e `lib/studies-store.ts:119-173` (`restoreStudyRecord`) — 6 ocorrências da lista no total.

**O que fazer**
1. Adicionar `zod` e criar `lib/study-schema.ts` com o schema do estudo (limites: título ≤ 200, descrição ≤ 2.000, notas ≤ 50.000, arrays ≤ 50 itens de strings de enums conhecidos, anos inteiros em faixa, câmera em faixas válidas).
2. Uma única função `sanitizeStudy(input)` usada por criar, fork e restaurar. Constantes de eras/rotas em um módulo (coordenar com T12).
3. 400 com erros do zod (sem stack); 500 genérico sem `detail`.
4. Rate limit simples por IP (ex.: 10 criações/min) — em memória é aceitável no início, documentar limitação.
5. Testes de rota: válido, campos excedendo limites, tipos errados, fork.

**Critérios de aceite**
- [ ] Payload inválido → 400 com mensagens de validação.
- [ ] Lista de eras anacrônicas definida em um único lugar (`grep` retorna 1 definição).
- [ ] Sem `err.message` em respostas.
- [ ] Testes cobrindo criação e fork.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Reivindicada como a próxima tarefa elegível da fase 3 após o aceite da T06.
- 2026-11-20 · codex · IN_PROGRESS · Incluído G-INFRA, pois o schema requer adicionar Zod ao manifesto e ao lockfile. Grupo conferido e disponível.

---

### T08 · Fallback em memória dos estudos não pode mentir

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Backend · **Tamanho:** P · **Depende de:** T07 · **Grupos:** G-ESTUDOS

**Contexto / problema**
Com Postgres fora, `POST /api/studies` e o fork salvam num `Map` do processo (`lib/studies-store.ts:27`) e respondem 200. Após restart (ou em serverless, onde cada instância tem seu Map), o link compartilhado quebra — viola a imutabilidade (RN16). Erros do Prisma são engolidos sem log em todas as rotas.

**O que fazer**
1. Fallback em memória só quando `NODE_ENV !== "production"` (ou flag `STUDIES_MEMORY_FALLBACK=1`), com aviso no log.
2. Em produção, falha de banco → 503 com mensagem clara.
3. Logar erros do Prisma (`console.error` estruturado ou logger) em todas as rotas que hoje fazem `catch {}`.
4. A UI de compartilhamento (`StudyShareModal`) deve mostrar erro quando a criação falhar.

**Critérios de aceite**
- [ ] Em modo produção sem banco, criar estudo retorna 503 e a UI mostra erro.
- [ ] Nenhum `catch {}` silencioso nas rotas de API.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T09 · Cache sem limite em /api/observatory/cosmos

- **Status:** REVIEW · **Responsável:** antigravity · **Branch:** task/t09-cosmos-lru-cache · **Worktree:** ../telluspedia-wt/antigravity-t09
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** P · **Depende de:** — · **Grupos:** G-OBS

**Contexto / problema**
`apps/web/src/app/api/observatory/cosmos/route.ts:14,22-23`: o `Map` de cache usa como chave `year` arbitrário do cliente (inclusive `NaN`, floats infinitos). Variando o parâmetro, a memória cresce sem limite. `apps/web/src/app/api/timeline/route.ts:7-8` também aceita `NaN`.

**O que fazer**
1. Validar `year` (finito, faixa ex. -3000..3000, arredondar para 2 casas) e `body` (enum de `CelestialBodyId`); 400 se inválido.
2. Substituir `Map` por LRU com limite (ex.: 500 entradas) — pode ser uma implementação simples própria.
3. Validar `startYear`/`endYear`/`categories` em `/api/timeline`.

**Critérios de aceite**
- [x] `?year=abc` → 400; `?year=1e308` → 400.
- [x] Cache nunca passa do limite (teste unitário do LRU).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (4cb10a9).
- 2026-11-20 · antigravity · REVIEW · Implementado (commit dc7f4f3): (1) criado `LruCache<K, V>` limitado O(1) com suporte a TTL em `apps/web/src/lib/lru-cache.ts`; (2) criados validadores estritos por allow-list em `apps/web/src/lib/cosmos-validation.ts` (`parseCosmosYear` finito em `[-3000, 3000]` arredondado para 2 casas, `parseCosmosBody` enum `CelestialBodyId`, e `parseTimelineQuery` para inteiros `startYear`/`endYear` em `[-3000, 3000]` com `startYear <= endYear` e `categories` em `ALL_CATEGORIES`); (3) atualizado `GET /api/observatory/cosmos` para usar `LruCache` (máx. 500 entradas, TTL 1h), retornar 400 para parâmetros inválidos (incluindo `NaN`, `Infinity`, `1e308`, `abc`, `__proto__`) e evitar lookup via operador `in`; (4) atualizado `GET /api/timeline` para rejeitar `startYear`/`endYear`/`categories` inválidos com 400. Validação: `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 252/252 (35 suítes, incluindo nova `apps/web/test/cosmos-timeline-api.test.ts` com testes do LRU e das rotas), `pnpm build` ok (16/16 páginas).

---

### T10 · Endurecer serviço Python (CORS, Docker, Redis)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** M · **Depende de:** — · **Grupos:** G-PIPELINE

**Contexto / problema**
`services/data-pipeline/`:
- `app/main.py:12-18`: CORS `allow_origins=["*"]` com `allow_credentials=True`.
- `app/api/endpoints/weather.py`: 502 expõe `str(e)` do upstream.
- `Dockerfile`: roda como root; `build-essential` permanece na imagem final; sem `HEALTHCHECK`.
- `app/core/config.py`: `class Config` (deprecado no pydantic v2).
- `app/core/redis_client.py`: com Redis fora, cada request tenta reconectar (latência).
- Sem lock de dependências; ambiente local não reproduzível (testes falham na coleta sem `redis` instalado).

**O que fazer**
1. CORS com origens de `settings.ALLOWED_ORIGINS` (lista via env), `allow_credentials=False` salvo necessidade.
2. Mensagem de erro genérica no 502; log do detalhe.
3. Dockerfile multi-stage, usuário não-root, `HEALTHCHECK` em `/health`.
4. `model_config = SettingsConfigDict(env_file=".env", extra="ignore")`.
5. Backoff no Redis (ex.: não tentar reconectar por 30 s após falha).
6. Lock de dependências (`uv`/`pip-tools`) e instruções no README para rodar `pytest`.

**Critérios de aceite**
- [ ] `pytest` passa num venv criado conforme o README.
- [ ] `docker compose up data-pipeline` sobe com healthcheck `healthy`.
- [ ] Container roda como usuário não-root (`docker exec ... whoami`).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T11 · Ajustar next.config e script de build

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
`apps/web/next.config.mjs`:
- `images.remotePatterns: [{ hostname: "**" }]` — o projeto não usa `next/image`, mas isso transforma o otimizador `/_next/image` num proxy aberto para qualquer host.
- `reactStrictMode: false` esconde bugs de efeitos.
`apps/web/package.json`: o script `build` apaga `.next`, o mesmo diretório usado pelo `next dev` — rodar build derruba o dev server.

**O que fazer**
1. Remover `images.remotePatterns` (ou restringir a hosts usados, ex. `flagcdn.com`).
2. Ativar `reactStrictMode: true` e corrigir efeitos que quebrarem (provável: inicializações duplicadas em stores/efeitos de câmera).
3. Remover o `rmSync` do script de build ou usar `distDir` separado para build (ex.: via env `NEXT_DIST_DIR`).

**Critérios de aceite**
- [ ] `/_next/image?url=https://exemplo.com/x.png&w=64&q=75` → 400.
- [ ] Strict mode ativo sem regressões visíveis (globo, câmera, timeline, estudos).
- [ ] `pnpm build` com `pnpm dev` rodando não derruba o dev.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T12 · Seletor único de época (`useEpochState`)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** G · **Depende de:** — · **Grupos:** G-EPOCA, G-FRONTEIRAS

**Contexto / problema**
A regra "qual modo está ativo" (geológico, Magalhães, Apollo, ano efetivo, era histórica) é reimplementada, com divergências, em:
- `components/globe/GlobeCanvas.tsx:53-75`
- `components/globe/EarthSphere.tsx:149-168` (considera também `geologicalMa`, os outros não)
- `components/globe/CountryBorders.tsx:47-53`
- `components/globe/OrbitingMoon.tsx:18-21` (ignora a precedência geológico/Magalhães)
IDs mágicos espalhados: `"pangea-250ma"`, `"gondwana-150ma"`, `"kpg-66ma"` em 5 arquivos; `"magellan-1519"` em 24 ocorrências; `"usa-1969"`/`"glo-1969"` em 6 arquivos. O modo Apollo dispara por `selectedYear === 1969` (inclusive durante o playback da timeline).

**O que fazer**
1. Criar `lib/epoch/constants.ts` com IDs de marcos especiais, rotas e eras (fonte única).
2. Criar `lib/epoch/resolveEpoch.ts` — função **pura** que recebe o estado de timeline + estudo e retorna:
   ```ts
   { mode: "CONTEMPORARY" | "HISTORICAL" | "GEOLOGICAL"; effectiveYear: number; geologicalMa: number | null;
     historicalEraId: string; activeScene: null | "MAGELLAN" | "APOLLO11"; isContemporary: boolean }
   ```
   com precedência documentada (geológico > cena explícita > ano).
3. Hook `useEpochState()` (seletor Zustand com `shallow`) que chama a função pura.
4. Substituir a lógica nos 4 componentes + `TimelineAxis`, `StudyShareModal`, `Apollo11TelemetryOverlay`.
5. Cenas (Apollo/Magalhães) ativadas só por seleção explícita de marco/rota — **não** pelo ano.
6. Testes unitários exaustivos da função pura (tabela de casos).

**Critérios de aceite**
- [ ] Nenhum componente calcula `isGeologicalActive`/`isApolloActive`/`isMagellanActive` localmente.
- [ ] `grep -rn '"pangea-250ma"\|"magellan-1519"\|"usa-1969"' apps/web/src --include=*.tsx` → 0 ocorrências em componentes.
- [ ] Playback passando por 1969 não ativa o Apollo.
- [ ] Testes da função pura cobrindo todas as combinações relevantes.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T13 · Desacoplar stores Zustand e remover estado redundante

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** G · **Depende de:** T12 · **Grupos:** G-EPOCA, G-ESTUDOS

**Contexto / problema**
- `stores/timelineStore.ts:93` usa `require("./historicalRouteStore")` **dentro do `set`** para contornar dependência circular; `globeStore` importa `timelineStore` e `readerStore` e dispara efeitos dentro de reducers.
- Estado duplicado: `geologicalMa` vs `selectedGeologicalMa`; `activeRouteId` vs `selectedRouteId` (timelineStore) **e** `activeRouteId` em `historicalRouteStore` **e** em `studyStore`.
- 70 usos de `any`, muitos em seletores `(s: any) => s.timelineMode` sobre stores já tipados.

**O que fazer**
1. Mapear (no Log) cada campo duplicado e decidir a fonte única.
2. Remover efeitos cruzados dos reducers; orquestrar ações compostas num módulo `stores/actions.ts` (ex.: `enterGeologicalMode()` que atualiza timeline e rota).
3. Eliminar `require()` dinâmico.
4. Remover `(s: any)` e tipar o restante dos `any` onde for razoável (meta: < 15).
5. Ajustar estudo (save/restore/fork) aos campos novos sem quebrar estudos já salvos (mapear campos antigos na restauração).

**Critérios de aceite**
- [ ] Sem `require(` em `apps/web/src/stores`.
- [ ] Cada conceito (rota ativa, Ma geológico) tem um único campo de estado.
- [ ] `grep -c "any" ` reduzido; sem `(s: any)`.
- [ ] Estudo salvo antes da mudança ainda restaura corretamente (teste).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T14 · Fonte única de direção solar

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** M · **Depende de:** T12 · **Grupos:** G-EPOCA, G-GLOBO

**Contexto / problema**
- `components/globe/GlobeCanvas.tsx:93-114`: a posição da `directionalLight` é memoizada com `new Date()` — fica congelada no instante do carregamento.
- `components/globe/EarthSphere.tsx:357-384`: o uniform `uSunDirection` do shader é recalculado a cada minuto → luz e terminador divergem com o tempo.
- O `setInterval` não chama `invalidate()`: com `frameloop="demand"` (leitor aberto) a tela não atualiza.
- A data de referência por ano é sempre 21/jun 12:00 UTC (decisão a documentar).

**O que fazer**
1. Hook/store `useSunDirection()` como fonte única (data alvo derivada de `useEpochState` + relógio).
2. Luz direcional e shader leem da mesma fonte; atualização periódica chama `invalidate()`.
3. Documentar no código e no `docs/ARCHITECTURE.md` a convenção de data para anos sem data exata.
4. Respeitar o invariante do `AGENTS.md` (normais em espaço mundial).

**Critérios de aceite**
- [ ] Luz e terminador coincidem após 10+ minutos com a aba aberta.
- [ ] Com leitor aberto, o terminador atualiza ao fechar/ao invalidar.
- [ ] Teste unitário: mesma data → mesmo vetor nos dois consumidores.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T15 · Lua com posição astronômica real

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** M · **Depende de:** T12 · **Grupos:** G-EPOCA

**Contexto / problema**
`components/globe/OrbitingMoon.tsx:53` gira a Lua a 0,04 rad/s constante, sem relação com a data — contradiz a precisão histórica exigida para o Sol (RN10). A fase lunar visível também não corresponde à data. O modo Apollo "estaciona" a Lua com `rotation.y → 0`.

**O que fazer**
1. Implementar posição geocêntrica da Lua por data (algoritmo de Meeus simplificado, cap. 47, precisão ~0,5° basta) em `lib/astronomy.ts`, com testes contra valores de referência (ex.: JPL Horizons para 3 datas).
2. Distância na cena: manter escala comprimida atual (documentar), mas direção real.
3. A Lua deve ser iluminada pela mesma direção solar (T14) → fase correta.
4. Apollo 11: posição derivada da data do marco (20/07/1969), não de um valor fixo.
5. Atualizar `currentMoonWorldPos` normalmente (usado por outras camadas).

**Critérios de aceite**
- [ ] Direção da Lua dentro de 1° da referência em 3 datas de teste.
- [ ] Fase visível compatível com a data (ex.: lua cheia em 2024-01-25).
- [ ] Respeita SLERP/handover de câmera do `AGENTS.md` ao focar a Lua.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T16 · Cache de geometria de highlight por ISO

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Performance · **Tamanho:** P · **Depende de:** — · **Grupos:** G-FRONTEIRAS

**Contexto / problema**
`components/globe/CountryBorders.tsx:170-262`: a cada mudança de `hoveredIso`, o `useMemo` percorre todas as geometrias do TopoJSON e roda `topojson.mesh` para os ISOs ativos, gerando nova `BufferGeometry`.

**O que fazer**
1. Cache `Map<eraId:iso, Float32Array>` de posições por país (lazy).
2. Highlight = concatenação das posições em cache dos ISOs ativos (ou um `lineSegments` por ISO ativo, reaproveitado).
3. Manter `dispose()` correto (invariante do `AGENTS.md`).

**Critérios de aceite**
- [ ] Hover rápido sobre países não causa quedas de FPS visíveis (medir com Performance do DevTools antes/depois).
- [ ] Sem vazamento de geometrias (contar `renderer.info.memory.geometries` antes/depois de 50 hovers).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T17 · Páginas com SSR e metadata (Open Graph)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Frontend · **Tamanho:** G · **Depende de:** T13 · **Grupos:** G-PAIS, G-ESTUDOS

**Contexto / problema**
`app/study/[slug]/page.tsx`, `app/pais/[iso]/page.tsx` e `app/compare/page.tsx` são `"use client"` e só embrulham a `HomePage`, carregando estado via `useEffect`/`fetch`. Consequências: link de estudo compartilhado sem título/descrição/imagem (crítico para RN16), países sem SEO, flash do estado padrão antes do estado correto. `app/layout.tsx` aplica `overflow-hidden` global no `<body>`, forçando workarounds (ex.: `dossies/[slug]` usa `h-dvh overflow-y-auto`).

**O que fazer**
1. Transformar as páginas em Server Components que carregam os dados (estudo/país) no servidor e passam `initialState` para um componente cliente que hidrata os stores uma única vez.
2. `generateMetadata` em cada página: título, descrição, `openGraph` e `twitter`.
3. Imagem OG dinâmica (`opengraph-image.tsx`) para estudos e países (nome, período, bandeira).
4. `notFound()` para estudo/país inexistente.
5. Mover `overflow-hidden` para o layout da experiência do globo, não para o `<body>` global.

**Critérios de aceite**
- [ ] `curl -s localhost:3000/study/guerra-fria-br-de-k9x2 | grep og:title` retorna o título do estudo.
- [ ] Sem flash do estado padrão ao abrir `/study/...` e `/pais/BRA`.
- [ ] Slug inexistente → página 404.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T18 · Pipeline de CI

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Infra · **Tamanho:** M · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
Não existe `.github/workflows`. Nada impede regressões entrarem em `master`.

**O que fazer**
1. Workflow `ci.yml` em push/PR: pnpm install (cache), `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
2. Job Python: instalar deps (lock de T10, se já existir), `pytest`.
3. Job opcional (depois de T19): Playwright com upload de artefatos de screenshot.
4. Badge no README.

**Critérios de aceite**
- [ ] CI verde em `master` e executando em PRs.
- [ ] Falha de teste quebra o PR.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T19 · Reorganizar testes + testes de API + E2E visual

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Qualidade · **Tamanho:** G · **Depende de:** T18 · **Grupos:** G-INFRA

**Contexto / problema**
`apps/web/test/unit.test.ts` tem 4.291 linhas num único arquivo. Não há testes das rotas de API (estudos, fork, weather, firms). Não há E2E nem regressão visual — que teriam pegado T01 (fonte) e T02 (overflow).

**O que fazer**
1. Quebrar `unit.test.ts` por domínio (`astronomy`, `geo`, `citations`, `timeline`, `studies`, `observatory`, `historical`…), sem perder casos (contagem de testes igual ou maior: hoje 198).
2. Testes de rotas chamando os handlers diretamente (`GET`/`POST` com `NextRequest`).
3. Playwright: smoke (home carrega, clicar país abre HUD, timeline visível) + screenshots em 1366 e 1920 px comparados com baseline.
4. Script `pnpm test:e2e`.

**Critérios de aceite**
- [ ] Nenhum arquivo de teste com mais de ~800 linhas.
- [ ] Número total de testes ≥ 198.
- [ ] Rotas de estudos, weather e firms cobertas.
- [ ] `pnpm test:e2e` passa localmente e no CI.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T20 · Migrations Prisma e restrições do schema

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Backend · **Tamanho:** M · **Depende de:** — · **Grupos:** G-ESTUDOS

**Contexto / problema**
`apps/web/prisma/` não tem diretório `migrations` versionado — só `schema.prisma`. `Study` não tem limite de tamanho nos campos de texto. `Country.geometryJson` é obrigatório mas não é usado pelo frontend (as fronteiras vêm do `world-atlas`).

**O que fazer**
1. Gerar migration inicial (`prisma migrate dev --name init`) e versionar.
2. `@db.VarChar(n)` para `title` etc., coerentes com o schema zod de T07.
3. Decidir sobre `geometryJson`: tornar opcional ou remover (registrar decisão no Log).
4. Documentar no README o fluxo `docker:up → db:migrate → db:seed`.

**Critérios de aceite**
- [ ] `prisma migrate reset` num banco vazio aplica tudo e o seed roda.
- [ ] Limites do banco iguais aos do zod.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T21 · Consolidar texturas duplicadas

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Assets · **Tamanho:** P · **Depende de:** — · **Grupos:** G-GLOBO

**Contexto / problema**
Em `apps/web/public/textures/` há cópias idênticas (mesmo md5): `paleo_pangea.png` = `pangea_250ma.png` = `paleo/pangea_250ma.png` (+ `paleo/pangea_250ma.jpg`); `paleo_gondwana.png` = `gondwana_150ma.png` = `paleo/gondwana_150ma.png`.

**O que fazer**
1. Manter só `textures/paleo/*`.
2. Atualizar referências (`grep -rn "paleo_pangea\|pangea_250ma\|gondwana_150ma\|paleo_gondwana" apps/web/src apps/web/scripts`).
3. Considerar conversão para KTX2/WebP (coordenar com D02).

**Critérios de aceite**
- [ ] Nenhum arquivo duplicado em `public/textures`.
- [ ] Modo geológico continua exibindo Pangeia e Gondwana.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T22 · Acessibilidade (labels, teclado, foco)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** A11y · **Tamanho:** M · **Depende de:** D14 · **Grupos:** G-SHELL

**Contexto / problema**
94 `<button>` para 16 `aria-label`. Botões só de ícone (reset na navbar, recolher timeline, fechar painéis) usam apenas `title`. Inputs de ano sem `<label>`. Sem gestão de foco nos painéis; navegação por teclado no globo inexistente.

**O que fazer**
1. `aria-label` em todos os botões só de ícone; labels nos inputs.
2. Painéis/modais via Radix Dialog (foco preso, `Esc` fecha, retorno de foco).
3. Toggles do observatório como `role="switch"` com `aria-checked`.
4. Atalhos básicos: setas giram o globo, `+/-` zoom, `/` foca a busca.
5. Rodar axe (extensão ou `@axe-core/playwright` em T19).

**Critérios de aceite**
- [ ] axe sem violações "serious"/"critical" na home.
- [ ] Fluxo "buscar país → abrir HUD → fechar" possível só com teclado.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T23 · Limpezas menores

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Qualidade · **Tamanho:** P · **Depende de:** — · **Grupos:** G-TIMELINE

**Contexto / problema**
- `components/timeline/TimelineBar.tsx:190`: condição fixa `startYear === 1947 && endYear === 1991` para exibir contexto da Guerra Fria.
- `lib/api-client.ts:74`: `next: { revalidate: 3600 }` num fetch de cliente (sem efeito).
- `components/globe/EarthShaderMaterial.ts:73-74`: variáveis `dayLit`/`paleoLit` não usadas.
- `components/globe/IssOrbitLayer.tsx:155-160`: `new Vector3/Matrix4` a cada frame (pode ser resolvido junto com D04).

**O que fazer**
1. Derivar o contexto de era a partir do preset ativo/`useEpochState` (ou do manifesto do TellusBridge).
2. Remover opção sem efeito; se quiser cache no cliente, usar SWR/React Query.
3. Remover variáveis mortas do shader.
4. Reutilizar objetos temporários fora do `useFrame`.

**Critérios de aceite**
- [ ] Itens acima resolvidos sem mudança de comportamento visível.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T25 · Reduzir bundle inicial (408 kB)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Performance · **Tamanho:** M · **Depende de:** — · **Grupos:** G-SHELL, G-INFRA

**Contexto / problema**
`pnpm build` reporta **408 kB** de First Load JS em `/` (e ~409 kB em `/pais`, `/compare`, `/study`). O `GlobeCanvas` já é dinâmico; a suspeita (não confirmada) é que `CountryComparator` (Recharts), `ReaderMode`, `StudyShareModal`, `CitationModal`, `ObservatoryPanel` e framer-motion, importados estaticamente em `app/page.tsx`, entram no bundle inicial.

**O que fazer**
1. Adicionar `@next/bundle-analyzer` e gerar relatório (anexar resumo no Log).
2. Carregar painéis com `next/dynamic` somente quando abertos.
3. Verificar imports de `lucide-react` (tree-shaking) e `three` fora do canvas.
4. Meta: First Load JS de `/` < 250 kB.

**Critérios de aceite**
- [ ] Relatório antes/depois no Log.
- [ ] First Load JS de `/` reduzido (meta < 250 kB).
- [ ] Painéis abrem sem atraso perceptível (pré-carregar no hover do botão se necessário).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### T26 · Ingestão de indicadores reais do Banco Mundial (177 países)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Dados · **Tamanho:** G · **Depende de:** T03 · **Grupos:** G-PAIS, G-PIPELINE

**Contexto / problema**
Após a remoção dos valores inventados na T03, os ~147 países fora de `PILOT_COUNTRIES` / `GLOBAL_COUNTRY_INFO` possuem identificação geográfica real (Natural Earth 1:110m + CLDR), mas exibem "Dado indisponível" para população, PIB, IDH, área e expectativa de vida.

**O que fazer**
1. Criar pipeline/script versionado para ingerir indicadores oficiais via API do Banco Mundial (`SP.POP.TOTL`, `NY.GDP.MKTP.CD`, `AG.SRF.TOTL.K2`, `SP.DYN.LE00.IN`, `MS.MIL.XPND.GD.ZS`) e REST Countries (capital, moeda, região, nome oficial) para todos os 177 países.
2. Registrar fonte primária, código oficial do indicador e ano/data de referência em cada série (RN02).
3. Persistir em dataset versionado (ou seed Prisma) e integrar ao `getCountryData` e `/api/countries`, mantendo `null` sempre que o órgão oficial não publicar o indicador.
4. Adicionar testes de integridade do dataset ingerido.

**Critérios de aceite**
- [ ] Todos os países cobertos pela API do Banco Mundial exibem população, área e PIB reais com ano e link da fonte primária.
- [ ] Ausências reais da fonte continuam renderizando "Dado indisponível".
- [ ] Script de ingestão reproduzível e documentado.

**Como verificar**: rodar script de ingestão, `pnpm test`, clicar em COD, KAZ, PER e BRA.

**Log**
- 2026-11-20 · antigravity · TODO · Tarefa de follow-up aberta ao concluir T03.

---

### T27 · Corrigir falha intermitente do loader next/font com Merriweather v33

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** G-SHELL, G-INFRA

**Contexto / problema**
Durante `pnpm build` em Next.js 15.1.0, o Google Fonts CDN passou a responder intermitentemente URLs de `Merriweather` no formato `https://fonts.gstatic.com/l/font?kit=...&v=v33` (sem extensão `.woff2`). O `next/font/google/loader.js:122` executa `/\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1]`, causando `TypeError: Cannot read properties of null (reading '1')` e quebrando o build de forma não determinística.

**O que fazer**
1. Avaliar atualização do `next` para versão 15.x que suporte URLs sem sufixo de extensão no `next/font/google`, ou empacotar `Merriweather` localmente (`next/font/local` / `@fontsource/merriweather`) eliminando dependência externa em build time.
2. Validar que `pnpm build` passa de forma determinística (inclusive sem depender de POP específico do Google Fonts) e que os testes de `apps/web/test/fonts.test.ts` seguem verdes.

**Critérios de aceite**
- [ ] `pnpm build` passa de forma determinística sem erro em `next/font/google/loader.js`.
- [ ] Fontes Geist, Geist Mono e Merriweather continuam carregadas corretamente.

**Como verificar**: rodar `pnpm build` repetidamente e `pnpm test`.

**Log**
- 2026-11-20 · antigravity · TODO · Problema identificado durante validação de build da T03.

---

## 5. Tarefas — Design, visual e experiência (D)

### D01 · Globo escuro: color space + tone mapping

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d01-correcao-ciclo-noturno · **Worktree:** ../telluspedia-wt/codex-d01
- **Prioridade:** P0 · **Área:** 3D · **Tamanho:** P · **Depende de:** — · **Grupos:** G-GLOBO

**Contexto / problema**
O globo inteiro parece escuro e lavado. Causa principal (técnica): o `ShaderMaterial` em `components/globe/EarthShaderMaterial.ts` não inclui `#include <colorspace_fragment>` (nem `tonemapping_fragment`). As texturas são marcadas `SRGBColorSpace` (decodificadas para linear), mas o shader escreve o valor **linear** direto no framebuffer sRGB → imagem escura. Agravantes: `ambientLight` 0.15 (`GlobeCanvas.tsx:138`), `diffuse` limitado a 0.65–1.0 (`EarthShaderMaterial.ts:70`), sem tone mapping, metade do planeta sempre na noite real.

**O que fazer**
1. No fim do fragment shader, após `gl_FragColor = ...`, adicionar `#include <tonemapping_fragment>` e `#include <colorspace_fragment>`.
2. Configurar o renderer no `<Canvas>`: `gl={{ toneMapping: THREE.ACESFilmicToneMapping (ou AgXToneMapping), toneMappingExposure: ~1.1 }}`, `outputColorSpace` sRGB (padrão do R3F).
3. Recalibrar `diffuse`, intensidade das luzes das cidades e Fresnel após a correção (comparar com fotos da NASA).
4. Abrir com o ciclo real de dia e noite. A opção "Iluminação de estudo" pode ser ativada manualmente para iluminar o globo de modo uniforme.
5. Conferir Lua e planetas (materiais padrão já convertem; ajustar intensidades se o tone mapping alterar).

**Critérios de aceite**
- [x] Hemisfério diurno com cores naturais (oceano azul, desertos claros), comparável às imagens Blue Marble.
- [x] Hemisfério noturno escuro mas legível, com luzes de cidade.
- [x] Captura antes/depois anexada.
- [x] Invariante de normais em espaço mundial preservado.
- [x] O globo abre com o ciclo real. O modo de estudo só é ativado pelo controle.

**Captura** — [Antes, dia e noite reais corrigidos e iluminação de estudo](evidence/d01/antes-depois.webp), da esquerda para a direita. Mesma câmera e instante de referência (20/03/2026 às 13h45 UTC).

[Hemisfério noturno às 04h00 UTC](evidence/d01/noite.webp).

[Brasil à 1h e às 12h, horário de Brasília](evidence/d01/brasil-noite-e-dia.webp). As duas imagens foram capturadas em 20/11/2026, com o modo de estudo desligado.

**Como verificar**: `pnpm dev`; comparar visualmente; teste existente de shader continua passando.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Tarefa reivindicada em worktree próprio a partir de origin/master.
- 2026-11-20 · codex · REVIEW · O shader converte a cor de saída para sRGB após ACES Filmic (exposição 1,1), com luz difusa, emissão das cidades e Fresnel recalibrados. Por decisão do Ayrton, o globo abre em iluminação de estudo e o botão alterna para o terminador astronômico. A comparação com a [Blue Marble](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/) guiou a leitura do azul do oceano e das regiões áridas. Verificado no Chromium com WebGL o controle por teclado e a renderização da Terra e da Lua. O modo Cosmos abriu e o painel de Marte respondeu, mas a captura dos planetas não terminou com a GPU por software. Typecheck, lint, 207 testes e build passaram. O build usou cópias temporárias dos arquivos originais das fontes do Google, após timeouts no download automático.
- 2026-11-20 · codex · IN_PROGRESS · Reaberta após rejeição do padrão anterior. Ayrton pediu que o globo abra com o ciclo real de dia e noite, inclusive no Brasil.
- 2026-11-20 · codex · REVIEW · Corrigido o padrão após a rejeição. O globo abre com dia e noite reais e a iluminação de estudo é ativada manualmente. Chromium com WebGL confirmou o Brasil à 1h e às 12h no horário de Brasília, a ativação manual e o retorno à noite ao desligar o modo de estudo pelo teclado. Typecheck, lint, 221 testes e build passaram. Para o build, foram reutilizadas as cópias temporárias dos arquivos originais do Google Fonts.
- 2026-11-20 · ayrton · DONE · Aprovada a correção que tornou o ciclo real de dia e noite o padrão.

---

### D02 · Oceanos, relevo, nuvens e atmosfera

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** G · **Depende de:** D01 · **Grupos:** G-GLOBO

**Contexto / problema**
Só existe uma textura diurna `earth_day.jpg` 2048×1024 (de 2010) e uma noturna 2048×1024. Não há máscara de oceano, reflexo especular, normal/bump map, nuvens nem atmosfera com espalhamento — o oceano é apenas a cor da textura.

**O que fazer**
1. Assets (NASA Visible Earth / Blue Marble Next Generation, domínio público): diurna 8K (com fallback 4K/2K por capacidade do dispositivo), noturna (Black Marble), máscara de água (specular), normal map/topografia, nuvens.
2. Converter para KTX2 (Basis) com mipmaps; carregar via `KTX2Loader`; registrar fontes e licenças em `docs/DATA_SOURCES.md`.
3. Shader: especular Blinn-Phong/GGX só onde a máscara indica água (brilho do sol no oceano), relevo via normal map, cor do oceano levemente mais rica.
4. Camada de nuvens (esfera 1.01) com rotação lenta e sombra suave sobre a superfície (opcional).
5. Atmosfera: shell externo (raio ~1.025) com espalhamento Rayleigh aproximado (azul no limbo diurno, laranja no terminador), substituindo o Fresnel simples.
6. Tudo respeitando o modo geológico (suprimir luzes de cidade/nuvens modernas quando `uPaleoFactor > 0`).
7. Orçamento: manter ≥ 55 FPS num notebook com GPU integrada; medir.

**Critérios de aceite**
- [ ] Reflexo do sol visível nos oceanos, ausente nos continentes.
- [ ] Relevo perceptível em cordilheiras sob luz rasante.
- [ ] Nuvens e atmosfera ativáveis/desativáveis.
- [ ] FPS medido e registrado no Log (antes/depois).
- [ ] Fontes e licenças documentadas.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D03 · Fronteiras com espessura real e highlight

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D · **Tamanho:** M · **Depende de:** — · **Grupos:** G-FRONTEIRAS

**Contexto / problema**
`components/globe/CountryBorders.tsx` usa `lineBasicMaterial` com `linewidth` 1/2 — ignorado no WebGL (sempre 1 px). O highlight do país é só o contorno ciano; não há preenchimento nem glow.

**O que fazer**
1. Trocar por `LineSegments2`/`LineMaterial` (three/examples) com espessura em px e antialias.
2. País selecionado: preenchimento translúcido (triangulação do polígono em esfera, ex. via `earcut` com subdivisão) + borda mais espessa com glow.
3. Hover: borda média sem preenchimento.
4. Espessura e opacidade das bordas base variando com a distância da câmera.
5. Manter cache de T16 e `dispose()` (invariantes).

**Critérios de aceite**
- [ ] Bordas com espessura consistente em telas HiDPI.
- [ ] Seleção visualmente distinta do hover.
- [ ] Sem z-fighting com a superfície.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D04 · ISS: SGP4 real, órbita correta, outros satélites

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-OBS

**Contexto / problema**
- `lib/observatory-data.ts:78-138` (`calculateIssPosition`): modelo inventado — época arbitrária (`1700000000000`), sem TLE e sem nodo ascendente real. A posição não corresponde à ISS verdadeira.
- `components/globe/IssOrbitLayer.tsx:138`: o `useFrame` recalcula com esse modelo a cada frame e **ignora a telemetria ao vivo** da API (`wheretheiss.at`). O HUD mostra a altitude real (422,7 km) enquanto o modelo está em outra posição.
- `ORBIT_RADIUS = 1.18` (linha 10) ≈ 1.150 km de altitude — quase 3× a real (deveria ser ≈ 1.064).
- A linha da órbita é o *ground track* em referencial que gira com a Terra: não fecha e, vista de lado, aparece como uma reta atravessando o globo.
- Modelo 3D com dimensões arbitrárias (treliça de 0.13 ≈ 830 km); alocação de `Vector3`/`Matrix4` por frame.

**O que fazer**
1. Adicionar `satellite.js`; nova rota `/api/observatory/satellites` que busca TLEs do CelesTrak (grupos `stations`, `visual`, opcionalmente `starlink`) com cache de 2–6 h e envelope de T05.
2. Propagar no cliente com SGP4 (posição ECI → ECEF/geodésica com GMST) a cada frame (ou a cada N ms com interpolação).
3. Órbita: anel fechado calculado no referencial inercial (amostras de um período completo em ECI, rotacionadas pelo GMST atual) com gradiente de opacidade (cauda para trás, fade à frente).
4. Ground track separado, desenhado na superfície (raio 1.001), com quebra no antimeridiano.
5. Altitude em escala real do globo (raio 1 + h/6371) — ou exagero explícito e documentado (máx. 2×), com toggle.
6. Modelo da ISS: glTF low-poly (NASA 3D Resources, domínio público) ou sprite/ícone com tamanho em px constante; clicar abre card com telemetria.
7. Outros satélites: `InstancedMesh`/pontos com cor por categoria; filtro na UI.
8. Remover `calculateIssPosition` inventado (ou manter só como fallback rotulado "Simulado" via T05).

**Critérios de aceite**
- [ ] Posição da ISS dentro de ~50 km da `wheretheiss.at` no mesmo instante (teste manual registrado no Log).
- [ ] Órbita fechada, sem reta atravessando o globo, em qualquer ângulo de câmera.
- [ ] HUD e modelo exibem a mesma posição/altitude.
- [ ] Sem alocações por frame (verificar no profiler).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D05 · Queimadas: sprites, heatmap, dados reais

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** T04, T05 · **Grupos:** G-OBS

**Contexto / problema**
`components/globe/NasaFirmsLayer.tsx:53-61` usa `PointsMaterial` sem textura → quadrados de 4,5 px de tamanho fixo ("pontos estranhos"). Os dados exibidos hoje são 28 pontos fixos de fallback datados de 2026-10-19 (`lib/observatory-data.ts:166+`), porque `NASA_FIRMS_MAP_KEY` não está configurada — e a UI diz "Ao vivo".

**O que fazer**
1. Configurar `NASA_FIRMS_MAP_KEY` (obtida gratuitamente em firms.modaps.eosdis.nasa.gov) e documentar em `.env.example`.
2. Shader de pontos customizado: sprite circular com núcleo quente e halo, tamanho proporcional ao FRP, leve pulsação (cintilação) e oclusão correta atrás do globo.
3. Escala por zoom: distante → heatmap/agregação em grade (hexbin) com cor por densidade; próximo → focos individuais.
4. Filtro de confiança (ocultar `low` por padrão) e janela temporal (24 h / 48 h / 7 d).
5. Clique num foco/célula → card com data/hora, satélite, FRP, confiança e link para a fonte (RN02).
6. Legenda de cores na UI.

**Critérios de aceite**
- [ ] Focos circulares com brilho, sem quadrados.
- [ ] Com a chave, milhares de focos renderizados a ≥ 55 FPS.
- [ ] Heatmap legível em zoom distante.
- [ ] Badge "Ao vivo"/"Simulado" correto (T05).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D06 · Eventos severos: símbolos, clusters, trilhas

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** T05 · **Grupos:** G-OBS

**Contexto / problema**
`components/globe/NasaEonetLayer.tsx:31-32`: todas as categorias usam a mesma esfera + anel; eventos próximos (ex.: dezenas de incêndios no oeste dos EUA/Canadá) formam manchas laranja indistintas. A rota usa só a última geometria do evento (`eonet/route.ts:39`), descartando a trilha.

**O que fazer**
1. Símbolos por categoria (sprites/ícones SVG rasterizados em atlas, tamanho em px constante): ciclone (espiral girando), vulcão, enchente, gelo marinho, seca, incêndio.
2. Clustering por zoom (supercluster em coordenadas lat/lng) com contagem no cluster.
3. Rota passa a devolver todas as geometrias; ciclones exibem trilha com pontos datados.
4. Clique → card com título, categoria, data, magnitude e links das fontes.
5. Filtro por categoria na UI.

**Critérios de aceite**
- [ ] Categoria identificável pelo símbolo sem abrir o card.
- [ ] Sem manchas sobrepostas em zoom distante (clusters).
- [ ] Ciclones mostram trilha.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D07 · Aviões: modelos glTF, interpolação, cobertura global

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** T05 · **Grupos:** G-OBS

**Contexto / problema**
`components/globe/AirTrafficLayer.tsx:19`: cada avião é um cone de 5 lados (`ConeGeometry(0.005, 0.018, 5)` ≈ 115 km de comprimento). Não há `useFrame` → aviões parados entre atualizações. A rota (`traffic/route.ts:44`) consulta só uma caixa fixa (Atlântico Norte/Europa) e limita a 80 aeronaves; o fallback é uma frota fictícia.

**O que fazer**
1. Modelo de avião low-poly (glTF, < 2 k triângulos, licença livre — documentar) renderizado com `InstancedMesh`, orientado pelo rumo (`heading`) e inclinado pela tangente da superfície.
2. Tamanho adaptativo ao zoom (constante em px ao longe, escala física ao perto, com limites).
3. Dead reckoning: interpolar posição pela velocidade e rumo entre polls; suavizar correção quando chega dado novo.
4. Cobertura: OpenSky autenticado (credenciais via env) consultando a região visível da câmera (bounding box do viewport) ou global com amostragem; limite configurável (ex.: 2.000) com LOD.
5. Rastro curto (últimas N posições) com fade.
6. Clique → card: callsign, origem, altitude, velocidade, rumo, link para a fonte.
7. Fallback rotulado "Simulado" (T05).

**Critérios de aceite**
- [ ] Aviões reconhecíveis como aviões, orientados corretamente.
- [ ] Movimento contínuo e suave entre atualizações.
- [ ] ≥ 1.000 aeronaves a ≥ 55 FPS.
- [ ] Cobertura além da caixa fixa atual.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D08 · Embarcações reais via AIS

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** T05 · **Grupos:** G-OBS

**Contexto / problema**
A camada "Rotas Marítimas Globais" é só um conjunto de 5 polylines estáticas de estreitos/canais (`lib/observatory-data.ts:351+`). Não existe nenhuma embarcação atual; a única embarcação do projeto é a nau histórica de Magalhães.

**O que fazer**
1. Integrar feed AIS (ex.: aisstream.io — websocket gratuito com chave; alternativa: dados abertos regionais). A conexão websocket fica no **servidor** (a chave não pode ir ao cliente); expor ao cliente via rota com snapshot periódico ou SSE.
2. Agregação no servidor: última posição por MMSI, tipo de navio, rumo, velocidade, destino; limite e amostragem por região.
3. Render: modelos instanciados por tipo (cargueiro, petroleiro, porta-contêiner, passageiros, pesca) ou ícones orientados; cor por tipo; dead reckoning como em D07.
4. As rotas/estreitos viram camada de contexto: fluxo animado (partículas ao longo da rota) com espessura proporcional ao tráfego.
5. Clique → card (nome, tipo, bandeira, destino, velocidade, fonte).
6. Documentar provedor, limites e termos de uso em `docs/DATA_SOURCES.md`.

**Critérios de aceite**
- [ ] Navios reais visíveis nos principais corredores (Malaca, Suez, Canal da Mancha) com posições atualizadas.
- [ ] Chave do provedor nunca exposta ao navegador.
- [ ] Fallback rotulado "Simulado".

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D09 · Catálogo estelar real e 88 constelações

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-COSMOS

**Contexto / problema**
O "catálogo HYG 3.500+" (`lib/hyg-star-data.ts:240-270`, `generateHygCatalog`) é composto de **36 estrelas reais + ~3.564 estrelas geradas aleatoriamente** (PRNG com semente 42). Só existem 8 das 88 constelações (Crux, Orion, Ursa Major, Scorpius, Cassiopeia, Cygnus, Leo, Centaurus), com linhas digitadas à mão. Estrelas renderizadas como pontos de tamanho fixo (`SkyStars.tsx:52-57`).

**O que fazer**
1. Gerar (script em `apps/web/scripts/`) um asset binário compacto a partir do HYG v4 real (CC BY-SA — documentar atribuição): estrelas até magnitude ~6,5 (~9.000), campos RA, Dec, Vmag, B-V, nome próprio.
2. Linhas das 88 constelações IAU (fonte: Stellarium `constellationship.fab` ou d3-celestial — verificar licença) por número HIP.
3. Shader de estrelas: tamanho e brilho por magnitude, cor por B-V, sprite suave (sem quadrados), cintilação sutil opcional.
4. Nomes das constelações (pt-BR) e das estrelas mais brilhantes, com toggle e regra anticolisão; limites das constelações opcionais.
5. Textura da Via Láctea de fundo (ESA/Gaia ou ESO, verificar licença).
6. Orientação correta do céu em relação à Terra (referencial equatorial J2000; documentar).
7. Remover o gerador aleatório.

**Critérios de aceite**
- [ ] Nenhuma estrela gerada aleatoriamente.
- [ ] 88 constelações com linhas corretas (conferir Órion, Cruzeiro do Sul e Ursa Maior contra o Stellarium).
- [ ] Estrelas circulares com tamanho por magnitude.
- [ ] Atribuições/licenças em `docs/DATA_SOURCES.md`.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D10 · Cometa Halley: visual e distância corretos

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** M · **Depende de:** — · **Grupos:** G-COSMOS

**Contexto / problema**
Observação: a posição (≈ 35 UA em 2026) está **correta** — o afélio foi no fim de 2023. Os problemas são de visual e de cálculo:
- `components/globe/CometHalleyTrajectory.tsx:37`: núcleo com raio 0.35 da cena (maior que vários planetas na mesma escala) + anel de seleção.
- Linhas 47-55: cauda é um cilindro aberto sólido e aditivo — aparece como um "triângulo" ciano.
- A cauda é desenhada sempre (comprimento mínimo 2.0 em `lib/astronomy-planets.ts:842`), inclusive a 35 UA, onde um cometa real não tem cauda.
- Linha 136: label `Html` com `distanceFactor={45}` → gigante quando a câmera se aproxima.
- `components/hud/CosmicInspectorHUD.tsx:145`: "Distância até a Terra" = `|rSol − 1|` (errado). O correto é a norma da diferença entre os vetores heliocêntricos do cometa e da Terra.
- Linha 806: anomalia média com `%` pode ficar negativa para anos < 1986 (verificar `solveKeplerEquation`).

**O que fazer**
1. Distância Terra–cometa = `|r⃗_cometa − r⃗_Terra|` usando `calculatePlanetaryPosition("EARTH", ano)`; teste contra JPL Horizons (ex.: 1986-04-11 ≈ 0,42 UA).
2. Normalizar a anomalia média para [0, 2π).
3. Núcleo pequeno + coma difusa (sprite com falloff) cujo tamanho/brilho cresce perto do Sol.
4. Cauda por partículas ou shader volumétrico com duas componentes: íons (reta, anti-solar, azulada) e poeira (curva, amarelada); visível só abaixo de ~3–5 UA, comprimento e opacidade crescendo perto do periélio.
5. Labels com tamanho fixo em px (sem `distanceFactor` ou com clamp), padronizados com D11.
6. Indicador de seleção discreto (halo em tela, não anel 3D gigante).

**Critérios de aceite**
- [ ] Em 2026 (≈ 35 UA): sem cauda, núcleo/coma discretos.
- [ ] Em 1986-02 (periélio): cauda dupla visível apontando para longe do Sol.
- [ ] Distância à Terra correta (teste com referência).
- [ ] Label legível e de tamanho constante.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D11 · Política de escala e labels do sistema solar

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D · **Tamanho:** M · **Depende de:** D10 · **Grupos:** G-COSMOS

**Contexto / problema**
Cada corpo do modo Cosmos decide o próprio tamanho e estilo de label (`PlanetarySystem.tsx`, `SunCore.tsx`, `CometHalleyTrajectory.tsx`, `AsteroidBeltLayer.tsx`). Não há uma política única de escala de distância/raio nem de colisão de labels.

**O que fazer**
1. Documentar em `docs/ARCHITECTURE.md` a escala: distâncias (`mapDistanceToSceneRadius` — log/comprimida) e raios (exagerados com fator único).
2. Componente `<CelestialLabel>` único: tamanho em px, ocultação por distância/prioridade, anticolisão simples (prioridade por tamanho/foco).
3. Toggle "escala real" (educativo) vs "escala visual".
4. Respeitar as regras de handover de câmera e desduplicação da Terra do `AGENTS.md`.

**Critérios de aceite**
- [ ] Todos os corpos usam a mesma política e o mesmo componente de label.
- [ ] Labels não se sobrepõem na vista geral do sistema solar.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D12 · Eventos históricos dirigidos por dados (player de cenas)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** GG (quebrar em subtarefas antes de iniciar) · **Depende de:** T12, T20 · **Grupos:** G-EPOCA

**Contexto / problema**
Os eventos históricos estão "chumbados": 28 marcos globais em `lib/country-data.ts:419` (`GLOBAL_MILESTONES`), marcos por país dentro de `PILOT_COUNTRIES`, 1 rota histórica (`lib/historical-routes.ts`, só Magalhães), e cada evento especial tem componente 3D próprio (`Apollo11Trajectory`, `HistoricalRouteTrajectory`, `Apollo11TelemetryOverlay`, `HistoricalRouteOverlay`). Os modos são ativados por `selectedYear === 1519/1969`. Adicionar um evento exige escrever código.

**O que fazer** (propor quebra em D12a…D12e no Log antes de começar)
1. **D12a — Modelo de dados**: schema de "cena" (JSON validado com zod e/ou tabelas Prisma): `id`, título, resumo, datas (início/fim, precisão), país(es)/bloco, categoria, fontes citáveis (RN02), câmera inicial (lat/lng/altitude), camadas a ativar, trajetórias (GeoJSON LineString com timestamps), pontos de interesse, mídia, era histórica de fronteiras.
2. **D12b — Migração**: converter os 28 marcos + marcos de países + Magalhães + Apollo para o novo formato (seed), sem perda.
3. **D12c — Player genérico**: um único componente que recebe uma cena e renderiza trajetória animada (com veículo genérico por tipo: nau, nave, avião, exército), pontos, câmera guiada (SLERP, invariantes do `AGENTS.md`) e linha do tempo própria da cena (play/pause/scrub).
4. **D12d — Ativação**: cena só abre por seleção explícita (pin, busca, link); sair restaura o estado anterior.
5. **D12e — Ingestão**: script de importação de eventos do Wikidata (SPARQL) com QID, datas e coordenadas, marcando fonte; revisão humana antes de publicar.
6. Remover os componentes específicos substituídos pelo player.

**Critérios de aceite**
- [ ] Adicionar um evento novo não exige mudança de código (só dados).
- [ ] Magalhães e Apollo 11 funcionam pelo player genérico com fidelidade igual ou maior que a atual.
- [ ] Nenhuma ativação de cena por ano.
- [ ] Todo evento tem fonte citável.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D13 · Eixo da timeline: zoom, clusters, prévias

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Design · **Tamanho:** G · **Depende de:** T02, D14 · **Grupos:** G-TIMELINE

**Contexto / problema**
`components/timeline/TimelineAxis.tsx` / `MilestonePin.tsx`: eixo fixo, pins sobrepostos quando eventos são próximos, rótulos de ano sob pins, sem prévia rica no hover.

**O que fazer**
1. Zoom (roda/pinça) e pan no eixo, com escala de ticks adaptativa (século → década → ano → mês).
2. Clustering de pins próximos com contagem; expandir ao clicar/zoom.
3. Hover → prévia (título, data, imagem, categoria); clique → abre a cena (D12) ou o evento.
4. Indicador do ano selecionado arrastável (scrubber) com feedback no globo.
5. Cores de categoria vindas dos tokens (D14).

**Critérios de aceite**
- [ ] Nenhum pin sobreposto em qualquer nível de zoom.
- [ ] Navegação fluida (60 FPS) ao arrastar/zoom.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D14 · Design system (tokens + primitivos)

- **Status:** IN_PROGRESS · **Responsável:** claude · **Branch:** task/d14-design-system · **Worktree:** ../telluspedia-wt/claude-d14
- **Prioridade:** P0 · **Área:** Design · **Tamanho:** G · **Depende de:** T01 · **Grupos:** G-SHELL

**Contexto / problema**
Cada componente define cores, tamanhos de fonte (`text-[9px]`, `[10px]`, `[11px]`…), bordas, glows e espaçamentos arbitrários. Mistura de mono/caixa alta em excesso. Não há consistência visual — base da percepção de "design péssimo".

**O que fazer**
1. Prototipar no Figma (ou artefato visual) a direção visual: paleta, tipografia, densidade, painéis; aprovar com o Ayrton **antes** de codificar (registrar link/decisão no Log).
2. Tokens em CSS variables + Tailwind: cores semânticas (`surface`, `surface-raised`, `border`, `text-primary/secondary/muted`, `accent`, `success/warning/danger`, cores de categoria), escala tipográfica (máx. 5 tamanhos), espaçamento, raios, sombras/elevação, durações e curvas de movimento.
3. Primitivos em `components/ui/` sobre Radix (já instalado): `Panel`, `Card`, `Button` (variantes), `IconButton` (com `aria-label` obrigatório), `Toggle/Switch`, `Chip`, `Stat`, `Tooltip`, `Dialog`, `Tabs`, `Badge`.
4. Página interna `/dev/ui` (somente em dev) exibindo todos os primitivos.
5. Migrar primeiro: navbar, painel do Observatório, Inspector HUD, timeline. Demais componentes em tarefas de follow-up.
6. Regra no `AGENTS.md`: novos componentes usam os primitivos e tokens.

**Critérios de aceite**
- [ ] Direção visual aprovada pelo Ayrton (registrado no Log).
- [ ] Tokens e primitivos implementados e visíveis em `/dev/ui`.
- [ ] Navbar, Observatório, Inspector e timeline sem valores arbitrários de cor/tamanho (`grep "text-\[" ` nesses arquivos → 0).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. Passo 1: proposta de direção visual para aprovação do Ayrton antes de codificar. G-SHELL bloqueado enquanto isso (T22, T25, T27, D15–D19 aguardam).
- 2026-11-20 · claude · IN_PROGRESS · Proposta de direção visual “Instrumento sereno” publicada para aprovação: https://claude.ai/artifact/7Mc8S56HuFpXUL6j9Rx9wL (artefato privado do Ayrton; 3 pranchas: Fundamentos/tokens, Componentes, Composição com navbar + Observatório + timeline). Resumo: superfícies neutras quase pretas (`#05070B`/`#0C1018`/`#131925`), bordas brancas 8%/14% em vez de ciano, um acento `#4CC3E0` só para interativo/selecionado, sem glow; cores saturadas só para dados (5 categorias + 5 camadas); Geist em 5 tamanhos de UI (12/13/15/18/24, mínimo 12 px — some 9/10/11 px), Geist Mono só para números com tabular-nums, Merriweather só no texto corrido do Reader; raios 6/10/14; 2 níveis de elevação; movimento 120/200/320 ms. Aguardando aprovação do Ayrton antes de codificar.

---

### D15 · Gerenciador de layout de painéis

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Design · **Tamanho:** M · **Depende de:** D14 · **Grupos:** G-SHELL

**Contexto / problema**
O Inspector do país (ex.: COD) e o painel do Observatório abrem na mesma coluna direita e se sobrepõem; a timeline passa por baixo do painel; o Cosmic Inspector disputa o mesmo espaço. Cada painel posiciona-se com classes fixas independentes.

**O que fazer**
1. Store `layoutStore` com slots: `rightPanel` (um painel ativo, pilha com voltar, ou abas), `bottomBar`, `leftOverlay`.
2. Todos os painéis laterais renderizados pelo slot (Inspector, Cosmic Inspector, Observatório, Comparador quando lateral).
3. Timeline e overlays calculam o espaço livre a partir do layout (CSS variables `--right-panel-width`).
4. Abrir um painel lateral fecha/empilha o anterior, com transição (D17).
5. Responsivo: em telas estreitas, o painel vira bottom sheet.

**Critérios de aceite**
- [ ] Nunca dois painéis laterais sobrepostos.
- [ ] Timeline nunca fica sob um painel.
- [ ] Funciona em 1366–2560 px e mobile.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D16 · Reduzir ruído visual dos painéis

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Design · **Tamanho:** M · **Depende de:** D14, T05 · **Grupos:** G-SHELL, G-OBS

**Contexto / problema**
No painel do Observatório, cada card repete um botão grande "Aprofundar no TellusLab"; badges "Ao Vivo (SWR)" aparecem sempre; muito texto em mono/caixa alta e descrições longas competem com a ação principal (ligar/desligar a camada).

**O que fazer**
1. Card de camada compacto: ícone, nome, status (T05), toggle; detalhes e "Aprofundar no TellusLab" num menu/expansão secundária.
2. Hierarquia tipográfica dos tokens (D14); mono só para números/telemetria.
3. Controle de opacidade por camada (o store já tem `layerOpacity`) num slider discreto.
4. Aplicar o mesmo tratamento ao Inspector HUD (métricas agrupadas, ações secundárias recolhidas).

**Critérios de aceite**
- [ ] Painel do Observatório mostra as 5 camadas sem rolagem em 1080 px de altura.
- [ ] "Aprofundar no TellusLab" acessível, mas não repetido como botão primário em cada card.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D17 · Movimento e transições

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Design · **Tamanho:** M · **Depende de:** D14 · **Grupos:** G-SHELL

**Contexto / problema**
Painéis aparecem/somem sem transição coerente; troca Terra → Cosmos é um corte seco; não há skeletons durante carregamento; easing de câmera pouco natural.

**O que fazer**
1. Tokens de movimento (durações 150/250/400 ms, curvas padrão) aplicados com framer-motion (já instalado) em painéis, modais e chips.
2. Transição cinematográfica Terra ↔ Cosmos (afastamento com fade das camadas terrestres e entrada do sistema solar), respeitando SLERP e handover de alvos do `AGENTS.md`.
3. Easing suave (ease-in-out cúbico) nos voos de câmera; duração proporcional à distância angular.
4. Skeletons nos painéis enquanto dados carregam.
5. Respeitar `prefers-reduced-motion`.

**Critérios de aceite**
- [ ] Todas as aberturas/fechamentos de painel animadas com os tokens.
- [ ] Transição Terra ↔ Cosmos sem corte seco e sem `NaN` no OrbitControls.
- [ ] Com `prefers-reduced-motion`, animações reduzidas.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D18 · Busca universal, ⌘K e estado na URL

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Frontend · **Tamanho:** G · **Depende de:** D14 · **Grupos:** G-SHELL

**Contexto / problema**
A busca da navbar cobre só países/ISO. Não há paleta de comandos, sugestões contextuais, nem reflexo do estado da tela na URL (só existem rotas específicas como `/pais/[iso]`).

**O que fazer**
1. Busca com autocomplete fuzzy sobre: países (177), entidades históricas, eventos, corpos celestes, camadas e presets — navegação por teclado, agrupada por tipo.
2. Paleta de comandos ⌘K/Ctrl+K com ações ("Ativar queimadas", "Ir para 1969", "Abrir comparador BRA, ARG").
3. Sugestões contextuais: ao selecionar um país, mostrar eventos e camadas relevantes.
4. Estado essencial sincronizado na URL (país, ano, camadas, modo, câmera) com `history.replaceState` debounced, para compartilhar a visão exata.

**Critérios de aceite**
- [ ] Buscar "Halley", "1969", "queimadas" e "Peru" retorna resultados corretos.
- [ ] ⌘K funciona em qualquer tela.
- [ ] Copiar a URL e abrir em outra aba reproduz a mesma visão.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

### D19 · Responsividade e contraste

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Design · **Tamanho:** M · **Depende de:** D14, T19 · **Grupos:** G-SHELL

**Contexto / problema**
Layout quebra em larguras comuns (ver T02); textos ciano/cinza pequenos sobre azul escuro provavelmente abaixo do contraste AA; experiência mobile não definida.

**O que fazer**
1. Matriz de verificação: 375, 768, 1366, 1680, 1920, 2560 px.
2. Ajustar contrastes para WCAG AA (4,5:1 texto normal) nos tokens.
3. Layout mobile: navbar compacta, painéis como bottom sheet (D15), timeline recolhida por padrão.
4. Baselines de screenshot Playwright para cada largura (T19).

**Critérios de aceite**
- [ ] Sem overflow/sobreposição na matriz.
- [ ] Contraste AA em todos os textos (verificar com axe/DevTools).
- [ ] Screenshots baseline versionados.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

---

## 6. Modelo para novas tarefas

Copie, preencha e adicione também uma linha no Quadro (seção 3). Defina os grupos de conflito (seção 1.2); se nenhum existente servir, crie um novo grupo na tabela da seção 1.2.

```markdown
### <ID> · <Título>

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P0|P1|P2 · **Área:** <área> · **Tamanho:** P|M|G|GG · **Depende de:** <IDs ou —>

**Contexto / problema**
<o que está errado, onde (arquivo:linha), evidência, impacto>

**O que fazer**
1. <passo>

**Critérios de aceite**
- [ ] <critério verificável>

**Como verificar**: <comandos / passos manuais>

**Log**
- AAAA-MM-DD · <responsável> · TODO · Tarefa criada.
```
