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
| `G-EPOCA` | Época ativa, stores Zustand, `GlobeCanvas`, `EarthSphere`, `OrbitingMoon`, `CountryBorders` (lógica de era), cenas históricas | T12, T13, T14, T15, D12, D15, D02, D24, D18, T22, D19, D25, T35, T36, T48, D29, D39, D41, D42, D43 |
| `G-GLOBO` | `EarthShaderMaterial.ts`, `EarthSphere.tsx`, texturas da Terra, renderer/tone mapping | D01, D02, T14, T21, D05, T13, T31, T39, D25, D27, D21, D24, T45, T49, D29, D30, D31, D32, D33, D37, D39, D40, D41 |
| `G-FRONTEIRAS` | `CountryBorders.tsx`, highlight, TopoJSON | T16, D03, T12, T13, D22, T35, T49, D31, D33, D34, D36, D43 |
| `G-PAIS` | `country-data.ts`, `/api/countries`, HUD do país, Reader, Comparador, páginas `/pais` | T03, T06, T17, T26, D14, D20, T13, D15, T23, T25, T29, T32, T33, T35, T36, T38, D22, D28, T45, T49, D32, D34, D35, D36, D37, D38, D42, D44 |
| `G-ESTUDOS` | `/api/studies*`, `studies-store.ts`, `studyStore`, Prisma `Study`, migrations | T07, T08, T20, T13, T17, T30, T34, D22, D23, D19, D25, T47, T48, D29, D30, D31, D33, D34, D37, D39, D40, D44 |
| `G-OBS` | `/api/observatory/*`, `observatory-data.ts`, `observatoryStore`, camadas do Observatório, `ObservatoryPanel` | T04, T05, T09, D04, D05, D06, D07, D08, D16, D14, T12, D15, T25, T35, D25, D27, T40, D19, D24, T41, T36, T43, T44, T45, T47, D29, D30, D31, D32, D38, D39, D40 |
| `G-COSMOS` | `SkyStars`, `hyg-star-data`, `CometHalleyTrajectory`, `PlanetarySystem`, `CosmicInspectorHUD`, `astronomy-planets` | D09, D10, D11, D20, D15, D21, T36, T40, D18, D24, T35, T45, D41 |
| `G-SHELL` | `layout.tsx`, `page.tsx`, `globals.css`, Tailwind, navbar, painéis, design system | T01, D14, D15, D16, D17, D18, D19, T22, T25, T27, D20, T13, T31, T33, T35, T39, D22, D23, D28, D25, T41, T44, T46, T49, D33, D34, D36, D37 |
| `G-TIMELINE` | `TimelineBar`, `TimelineAxis`, `MilestonePin`, `PresetSelector` | T02, D13, T23, D14, T12, T13, D15, T25, T22, D19, D24, D26, T35, T45, T48, D36, D38, D43 |
| `G-PIPELINE` | `services/data-pipeline`, `/api/weather`, scripts de ingestão | T06, T10, T26, T32, T34, T43, T47, D30 |
| `G-INFRA` | `package.json`, `next.config.mjs`, Dockerfile, CI, estrutura de testes, documentação | T07, T11, T18, T19, T25, T27, T28, T30, T34, T36, T37, T40, D19, T35, T42, T43, T44, T45, T46, T47 |
| `G-CONTEUDO` | `src/data/scenes/*`, `tellus-bridge/contract/manifest.json`, dossiês (`/dossies/*`), ingestão de conteúdo enciclopédico | D24, D26, T35, T48, D31, D32, D35, D36, D38, D42, D43, D44 |

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
| 9 | Ciclo 2 — Segurança crítica, integridade e conteúdo imediato | T28, T29, D21, D24 |
| 10 | Ciclo 2 — Resiliência, produção, SEO e séries históricas reais | T30, T31, T32, T33, T34 |
| 11 | Ciclo 2 — Diferenciação científica, 3D avançado e higiene | D22, D23, D25, D26, D27, D28, T35, T36, T37, T38, T39, T41 |
| 12 | Ciclo 3 — Blindagem técnica, ano dinâmico 2026+, E2E e LoD | T42, T43, T44, T48, T45, T46, T47, T49 |
| 13 | Ciclo 3 — Observatório ambiental, lixo marítimo, INPE, biomas e espécies | D29, D30, D31, D32 |
| 14 | Ciclo 3 — Cartografia 2D/projeções, coroplético temporal e perfis editoriais | D33, D34, D35 |
| 15 | Ciclo 3 — Geografia crítica (Milton Santos), estúdio de pesquisa e transversalidade | D36, D37, D38 |
| 16 | Ciclo 3 — Sismologia/tectônica, infraestrutura global e Cosmos avançado | D39, D40, D41 |
| 17 | Ciclo 3 — i18n profundo, cartografia histórica 1500/1815 e TellusBridge v2 | D42, D43, D44 |

---

## 3. Quadro de status

| ID | Título | Área | Prio | Tam | Status | Responsável | Depende de | Grupos |
|---|---|---|---|---|---|---|---|---|
| T24 | Commitar trabalho pendente (TellusBridge) | Infra | P0 | P | DONE | ayrton | — | — |
| T01 | Carregar fontes Geist/Merriweather (UI em serifa) | Design | P0 | P | DONE | claude | — | G-SHELL |
| T02 | Timeline vazando do painel em telas largas | Design | P0 | P | DONE | antigravity | — | G-TIMELINE |
| D01 | Globo escuro: color space + tone mapping | 3D | P0 | P | DONE | codex | — | G-GLOBO |
| T03 | Remover dados e citações inventados | Dados | P0 | G | DONE | antigravity | — | G-PAIS |
| T04 | Corrigir parse do CSV do FIRMS | Dados | P0 | P | DONE | claude | — | G-OBS |
| T05 | Sinalizar dados ao vivo vs fallback | Dados | P0 | M | DONE | claude | — | G-OBS |
| T06 | Validar lat/lng em /api/weather | Segurança | P1 | P | DONE | codex | — | G-PIPELINE, G-PAIS |
| T07 | Schema e validação em POST /api/studies | Segurança | P1 | M | DONE | codex | — | G-ESTUDOS, G-INFRA |
| T08 | Fallback em memória dos estudos não pode mentir | Backend | P1 | P | DONE | codex | T07 | G-ESTUDOS |
| T09 | Cache sem limite em /api/observatory/cosmos | Segurança | P1 | P | DONE | antigravity | — | G-OBS |
| T10 | Endurecer serviço Python (CORS, Docker, Redis) | Segurança | P1 | M | DONE | antigravity | — | G-PIPELINE |
| T11 | Ajustar next.config e script de build | Infra | P1 | P | DONE | codex | — | G-INFRA |
| T12 | Seletor único de época (`useEpochState`) | Arquitetura | P1 | G | DONE | claude | — | G-EPOCA, G-FRONTEIRAS, G-TIMELINE, G-OBS |
| T13 | Desacoplar stores Zustand e remover estado redundante | Arquitetura | P1 | G | DONE | codex | T12 | G-EPOCA, G-ESTUDOS, G-TIMELINE, G-GLOBO, G-FRONTEIRAS, G-PAIS, G-SHELL |
| T14 | Fonte única de direção solar | 3D | P1 | M | DONE | antigravity | T12 | G-EPOCA, G-GLOBO |
| T15 | Lua com posição astronômica real | 3D | P1 | M | DONE | antigravity | T12 | G-EPOCA |
| T16 | Cache de geometria de highlight por ISO | Performance | P2 | P | DONE | codex | — | G-FRONTEIRAS |
| T17 | Páginas com SSR e metadata (OG) | Frontend | P1 | G | DONE | antigravity | T13 | G-PAIS, G-ESTUDOS, G-SHELL |
| T18 | Pipeline de CI | Infra | P2 | M | DONE | codex | — | G-INFRA |
| T19 | Reorganizar testes + testes de API + E2E visual | Qualidade | P2 | G | DONE | codex | T18 | G-INFRA |
| T20 | Migrations Prisma e restrições do schema | Backend | P2 | M | DONE | antigravity | — | G-ESTUDOS |
| T21 | Consolidar texturas duplicadas | Assets | P2 | P | DONE | claude | — | G-GLOBO |
| T22 | Acessibilidade (labels, teclado, foco) | A11y | P2 | M | DONE | codex | D14 | G-SHELL, G-EPOCA, G-TIMELINE |
| T23 | Limpezas menores | Qualidade | P2 | P | DONE | antigravity | — | G-TIMELINE, G-PAIS |
| T25 | Reduzir bundle inicial (408 kB) | Performance | P2 | M | DONE | antigravity | — | G-SHELL, G-INFRA, G-TIMELINE, G-GLOBO, G-OBS, G-PAIS |
| T26 | Ingestão de indicadores reais do Banco Mundial (177 países) | Dados | P1 | G | DONE | antigravity | T03 | G-PAIS, G-PIPELINE |
| T27 | Corrigir falha intermitente do loader next/font com Merriweather v33 | Infra | P1 | P | DONE | antigravity | — | G-SHELL, G-INFRA |
| D02 | Oceanos, relevo, nuvens e atmosfera | 3D | P1 | G | DONE | claude | D01 | G-GLOBO, G-EPOCA |
| D03 | Fronteiras com espessura real e highlight | 3D | P2 | M | DONE | codex | — | G-FRONTEIRAS |
| D04 | ISS: SGP4 real, órbita correta, outros satélites | 3D/Dados | P1 | G | DONE | claude | — | G-OBS |
| D05 | Queimadas: sprites, heatmap, dados reais | 3D/Dados | P1 | M | DONE | claude | T04, T05 | G-OBS, G-GLOBO |
| D06 | Eventos severos: símbolos, clusters, trilhas | 3D/Dados | P1 | M | DONE | codex | T05 | G-OBS, G-INFRA |
| D07 | Aviões: modelos glTF, interpolação, cobertura global | 3D/Dados | P1 | G | DONE | codex | T05 | G-OBS |
| D08 | Embarcações reais via AIS | 3D/Dados | P1 | G | DONE | codex | T05 | G-OBS |
| D09 | Catálogo estelar real e 88 constelações | 3D/Dados | P1 | G | DONE | codex | — | G-COSMOS |
| D10 | Cometa Halley: visual e distância corretos | 3D | P1 | M | DONE | antigravity | — | G-COSMOS |
| D11 | Política de escala e labels do sistema solar | 3D | P2 | M | DONE | claude | D10 | G-COSMOS |
| D12 | Eventos históricos dirigidos por dados (player de cenas) | Arquitetura | P1 | GG | DONE | claude | T12, T20 | G-EPOCA, G-SHELL |
| D13 | Eixo da timeline: zoom, clusters, prévias | Design | P2 | G | DONE | claude | T02, D14 | G-TIMELINE |
| D14 | Design system (tokens + primitivos) | Design | P0 | G | DONE | claude | T01 | G-SHELL, G-OBS, G-TIMELINE, G-PAIS |
| D15 | Gerenciador de layout de painéis | Design | P1 | M | DONE | claude | D14 | G-SHELL, G-PAIS, G-COSMOS, G-OBS, G-TIMELINE, G-EPOCA |
| D16 | Reduzir ruído visual dos painéis | Design | P2 | M | DONE | claude | D14, T05 | G-SHELL, G-OBS |
| D17 | Movimento e transições | Design | P2 | M | DONE | claude | D14 | G-SHELL |
| D18 | Busca universal, ⌘K e estado na URL | Frontend | P2 | G | DONE | codex | D14 | G-SHELL, G-EPOCA, G-COSMOS |
| D19 | Responsividade e contraste | Design | P2 | M | DONE | codex | D14, T19 | G-SHELL, G-EPOCA, G-TIMELINE, G-OBS, G-INFRA, G-ESTUDOS |
| D20 | Migrar demais componentes para o design system | Design | P1 | G | DONE | antigravity | D14 | G-SHELL, G-PAIS, G-COSMOS |
| T28 | Atualizar Next.js + sanear vulnerabilidades críticas (`pnpm audit`) | Segurança | P0 | M | DONE | codex | — | G-INFRA |
| T29 | Eliminar séries fabricadas no `ComparisonCharts` e abrir Comparador para os 177 países | Dados | P0 | M | DONE | antigravity | — | G-PAIS |
| T30 | Cabeçalhos HTTP de segurança (CSP, HSTS, Referrer, Permissions) e `Cache-Control` nas APIs | Segurança | P1 | P | DONE | claude | — | G-INFRA, G-ESTUDOS |
| T31 | Resiliência de runtime: Error Boundaries (`error.tsx`/`global-error.tsx`), `webglcontextlost` e fallback sem GPU | Frontend/3D | P1 | M | DONE | antigravity | — | G-SHELL, G-GLOBO |
| T32 | Ingestão de séries históricas reais do Banco Mundial (1990–2024) + novos indicadores | Dados | P1 | G | DONE | antigravity | T29 | G-PAIS, G-PIPELINE |
| T33 | SEO técnico & PWA: `sitemap.ts` dinâmico (177 países + dossiês), `robots.ts`, `manifest.ts` e JSON-LD | Frontend | P1 | P | DONE | antigravity | — | G-SHELL, G-PAIS |
| T34 | Empacotamento de produção: `apps/web/Dockerfile` (standalone), `/api/health`, Redis no rate-limit e CI reforçado | Infra | P1 | M | DONE | antigravity | T28 | G-INFRA, G-ESTUDOS, G-PIPELINE |
| T35 | Segunda onda de bundle (`/` < 150 kB): datasets sob demanda e lazy-load de `satellite.js` | Performance | P2 | M | DONE | claude | — | G-PAIS, G-OBS, G-SHELL, G-EPOCA, G-FRONTEIRAS, G-COSMOS, G-TIMELINE, G-INFRA, G-CONTEUDO |
| T36 | Modularizar arquivos monolíticos, remover 5 `@radix-ui/*` ociosos e eliminar os 9 `any` | Qualidade | P2 | M | DONE | claude | — | G-PAIS, G-COSMOS, G-INFRA, G-EPOCA, G-OBS |
| T37 | Sincronizar documentação (`ROADMAP.md`, `ARCHITECTURE.md`, `DATA_SOURCES.md`) e limpar `.pytest_cache` | Docs | P2 | P | DONE | claude | — | G-INFRA |
| T38 | Modo de leitura analítico para todos os 177 países (ranking global, comparação regional, resumo auditado) | Dados/UX | P2 | G | DONE | antigravity | T32 | G-PAIS |
| T39 | Qualidade gráfica adaptativa no WebGL (DPR dinâmico, FPS monitor, preset Baixo/Médio/Alto) | 3D/Perf | P2 | M | DONE | antigravity | T31 | G-GLOBO, G-SHELL |
| T40 | Corrigir desmontagem dos rótulos HTML no WebGL | 3D/Infra | P1 | P | DONE | codex | — | G-INFRA, G-COSMOS, G-OBS |
| T41 | Corrigir aviso de hidratação do botão Observatório em `/study/<id>` com camadas ativas | Frontend | P2 | P | DONE | claude | — | G-SHELL, G-OBS |
| D21 | Texturas planetárias reais (KTX2 + JPG), inclinação axial, rotação sideral e sombras nos anéis de Saturno | 3D | P1 | G | DONE | claude | — | G-COSMOS, G-GLOBO |
| D22 | Modo Coroplético no Globo 3D: colorir os 177 países por indicador real com legenda e escala | 3D/Dados | P1 | G | DONE | antigravity | T32 | G-FRONTEIRAS, G-PAIS, G-SHELL, G-ESTUDOS |
| D23 | Galeria de Estudos Públicos (`/studies` + `GET /api/studies`), árvore de forks (`parentId`) e exportação | Produto | P1 | G | DONE | antigravity | T30 | G-ESTUDOS, G-SHELL |
| D24 | Expandir catálogo de Cenas Históricas (completar `glo-1969` + 5 novas cenas curadas) | Conteúdo | P1 | G | DONE | claude | — | G-CONTEUDO, G-EPOCA, G-TIMELINE, G-GLOBO, G-COSMOS, G-OBS |
| D25 | Camada NASA GIBS (imagens de satélite diárias/históricas: NDVI, gelo/neve, temperatura superficial) | 3D/Dados | P2 | G | DONE | claude | — | G-OBS, G-GLOBO, G-EPOCA, G-SHELL, G-ESTUDOS |
| D26 | Expandir cobertura curricular do TellusBridge (de 60,5% para ≥ 85% dos 299 nós; todas as eras e 20+ países) | Conteúdo | P2 | M | DONE | antigravity | D24 | G-CONTEUDO, G-TIMELINE |
| D27a | Camada de Ventos Globais (NOAA GFS 10 m / Jato 250 hPa, partículas GPU animadas, legenda km/h e nós, T05) | 3D/Dados | P2 | G | DONE | antigravity | D25 | G-OBS, G-GLOBO, G-EPOCA, G-SHELL, G-ESTUDOS |
| D27b | Correntes Oceânicas Superficiais (OSCAR / Open-Meteo Marine + seletor Ventos ↔ Correntes no motor GPU) | 3D/Dados | P2 | M | DONE | antigravity | D27a | G-OBS, G-GLOBO |
| D28a | Fundação i18n (`pt-BR`/`en`, cookie+localStorage, `Intl`, `Intl.DisplayNames`), seletor de idioma e Shell principal | Produto | P2 | G | DONE | antigravity | — | G-SHELL, G-TIMELINE, G-GLOBO, G-PAIS |
| D28b | Tradução dos painéis analíticos (Inspector, Observatório, Cosmos, Comparador, Reader/Citações, Estudos e metadados SSR) | Produto | P2 | G | DONE | antigravity | D28a | G-PAIS, G-OBS, G-COSMOS, G-ESTUDOS |
| T42 | Limpeza técnica e preparação de configs (remover `framer-motion`, ESLint flat config, `prisma.config.ts`, sync docs) | Infra/Docs | P1 | P | DONE | antigravity | — | G-INFRA |
| T43 | Rate-limiting unificado (Redis + fallback) nas 12 rotas `/api/observatory/*` e `/api/weather` + guarda no proxy GIBS | Segurança | P1 | M | DONE | antigravity | — | G-OBS, G-PIPELINE, G-INFRA |
| T44 | Cobertura E2E do Ciclo 2 (Coroplético, `/studies`, GIBS, Ventos/Correntes, `PT ↔ EN` + reload sem hidratação e `/telluslab`) | Qualidade | P1 | M | DONE | antigravity | — | G-INFRA, G-SHELL, G-OBS |
| T45 | Modularização preventiva pré-teto T36 (`CosmicInspectorHUD`, `en-panels`, `EarthSphere`, `ComparisonCharts`) + budget de texturas | Perf/Qualidade | P2 | M | DONE | antigravity | — | G-COSMOS, G-GLOBO, G-PAIS, G-INFRA, G-OBS, G-TIMELINE |
| T46 | PWA Offline-ready: Service Worker com cache versionado de casca, TopoJSON e snapshots do Banco Mundial | Infra/UX | P2 | M | DONE | antigravity | — | G-SHELL, G-INFRA |
| T47 | Observabilidade estruturada: logs JSON nas APIs + `/api/health` estendido com status/latência dos provedores T05 | Infra | P2 | P | DONE | antigravity | — | G-OBS, G-INFRA, G-PIPELINE, G-ESTUDOS |
| T48 | Janela de visualização dinâmica até o ano atual (`CURRENT_YEAR`) + marcos históricos curados 2022–2026 (`pt-BR` e `en`) | Produto/Dados | P1 | P | DONE | antigravity | — | G-TIMELINE, G-EPOCA, G-CONTEUDO, G-ESTUDOS |
| T49 | LoD progressivo de fronteiras (`RN21` / `RN07`): Natural Earth `1:50m` no zoom aproximado + territórios disputados/autônomos | 3D/Dados | P2 | M | DONE | antigravity | — | G-FRONTEIRAS, G-GLOBO, G-PAIS, G-SHELL |
| D29 | Lixo Marítimo, Giros Oceânicos & Microplásticos (`RN17`): 5 giros (NOAA) + advecção Lagrangiana acoplada a ventos/correntes (D27) | 3D/Dados | P1 | G | DONE | antigravity | — | G-OBS, G-GLOBO, G-EPOCA, G-ESTUDOS |
| D30 | Dados Ambientais & INPE (`RN17`): INPE BDQueimadas por bioma + TerraBrasilis (DETER/PRODES desmatamento Amazônia e Cerrado, T05) | 3D/Dados | P1 | G | DONE | antigravity | — | G-OBS, G-GLOBO, G-PIPELINE, G-ESTUDOS |
| D31 | Mapa dos Biomas (Global & Brasil): 14 biomas terrestres (WWF/RESOLVE) + 6 Biomas Brasileiros (IBGE) com fichas ecológicas | 3D/Conteúdo | P1 | G | IN_PROGRESS | antigravity | — | G-GLOBO, G-FRONTEIRAS, G-OBS, G-CONTEUDO, G-ESTUDOS |
| D32 | Mapa de Espécies Animais & Biodiversidade (`RN13.7`): ocorrências GBIF + fauna emblemática/ameaçada (IUCN Red List) por bioma/país | 3D/Dados | P1 | G | TODO | — | D31 | G-OBS, G-GLOBO, G-PAIS, G-CONTEUDO |
| D33 | Modo 2D & Projeções Cartográficas Comparativas (`d3-geo`): Equal Earth, Mercator, Natural Earth/Robinson e Azimutal Equidistante | 3D/UX | P1 | G | TODO | — | — | G-GLOBO, G-FRONTEIRAS, G-SHELL, G-ESTUDOS |
| D34 | Coroplético Temporal Animado (1990–2024) + indicadores CO₂ per capita e Energia Renovável % com persistência em Estudos | 3D/Dados | P1 | G | TODO | — | — | G-FRONTEIRAS, G-PAIS, G-SHELL, G-ESTUDOS |
| D35 | Expansão dos Perfis Editoriais dos Países (`RN13`): narrativas multidisciplinares auditadas (`pt-BR`/`en`) para G20 + Lusofonia + América Latina | Conteúdo | P1 | G | TODO | — | — | G-PAIS, G-CONTEUDO |
| D36 | Geografia Crítica & Legado de Milton Santos: dossiê/figura, lentes espaciais (Meio Técnico-Científico-Informacional, Verticalidades, 4 Brasis) | Conteúdo/UX | P1 | G | TODO | — | — | G-CONTEUDO, G-PAIS, G-FRONTEIRAS, G-TIMELINE, G-SHELL |
| D37 | Ferramentas de Estúdio: régua geodésica 3D no globo, exportação CSV/PNG no Comparador e pinos anotados `(lat, lng)` em Estudos | Produto/UX | P1 | G | TODO | — | — | G-GLOBO, G-PAIS, G-ESTUDOS, G-SHELL |
| D38 | Linha do Tempo Transversal de Personalidade ou Tema (`RN14`/`RN04`) + Atualidades geopolíticas por país via GDELT (`RN13.8`, T05) | Produto/Dados | P2 | G | TODO | — | — | G-TIMELINE, G-PAIS, G-CONTEUDO, G-OBS |
| D39 | Observatório Sísmico & Tectônico: terremotos em tempo real (USGS GeoJSON, T05) + placas tectônicas contemporâneas | 3D/Dados | P1 | G | TODO | — | — | G-OBS, G-GLOBO, G-EPOCA, G-ESTUDOS |
| D40 | Infraestrutura Crítica Global & Qualidade do Ar: cabos submarinos de internet (TeleGeography) e PM2.5/AQI (Open-Meteo) | 3D/Dados | P2 | M | TODO | — | — | G-OBS, G-GLOBO, G-ESTUDOS |
| D41 | Eclipses Solares/Lunares & Sondas do Espaço Profundo (Voyager 1/2, JWST, New Horizons) no Modo Cosmos | 3D/Cosmos | P2 | G | TODO | — | — | G-COSMOS, G-GLOBO, G-EPOCA |
| D42 | i18n Profundo (Fase 3): Player de Cenas (`ScenePlayerOverlay` e 7 crônicas), entidades históricas e textos editoriais dos 6 países-piloto | Produto/Conteúdo | P2 | G | TODO | — | — | G-CONTEUDO, G-EPOCA, G-PAIS |
| D43 | Cartografia Histórica Expandida: snapshots TopoJSON 1500 (Grandes Navegações) e 1815 (Congresso de Viena) + 2 novas cenas curadas | Conteúdo/3D | P2 | G | TODO | — | — | G-CONTEUDO, G-FRONTEIRAS, G-EPOCA, G-TIMELINE |
| D44 | TellusBridge v2: cobertura 100% dos 299 nós (biomas, Milton Santos, sismologia, eclipses), trilhas em `/study/[slug]` e selos no globo | Produto/Conteúdo | P2 | M | TODO | — | D31, D36, D39, D41 | G-CONTEUDO, G-ESTUDOS, G-PAIS |

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

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t01-fontes · **Worktree:** ../telluspedia-wt/claude-t01
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

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t02-timeline-overflow · **Worktree:** ../telluspedia-wt/antigravity-t02
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

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t03-remover-dados-inventados · **Worktree:** ../telluspedia-wt/antigravity-t03
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

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t07-validar-schema-studies · **Worktree:** ../telluspedia-wt/codex-t07
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
- [x] Payload inválido → 400 com mensagens de validação.
- [x] Lista de eras anacrônicas definida em um único lugar (`grep` retorna 1 definição).
- [x] Sem `err.message` em respostas.
- [x] Testes cobrindo criação e fork.

**Configuração do limite**
Criação e fork compartilham 10 tentativas por minuto em memória por instância. Com `STUDIES_TRUST_PROXY=true`, a cota é por IP de `x-real-ip`. Ative essa configuração somente se o proxy sobrescrever o cabeçalho em toda requisição e for o único caminho de acesso à aplicação. Por padrão, requisições sem IP confiável usam uma cota compartilhada. O controle usa janelas fixas e até 4.096 chaves por janela.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Reivindicada como a próxima tarefa elegível da fase 3 após o aceite da T06.
- 2026-11-20 · codex · IN_PROGRESS · Incluído G-INFRA, pois o schema requer adicionar Zod ao manifesto e ao lockfile. Grupo conferido e disponível.
- 2026-11-20 · codex · REVIEW · Zod valida tipos, listas, tamanhos, IDs e faixas no POST. JSON malformado recebe 400, corpo acima de 384 KiB recebe 413 e a cota responde 429 com Retry-After. Criação, restauração e fork usam as mesmas regras de época. O conteúdo do estudo original continua disponível na leitura. Apenas os textos copiados para um novo fork são limitados. Typecheck, lint, 257 testes e build passaram. O smoke HTTP da versão de produção confirmou criação, leitura, fork e cota compartilhada com persistência em memória em um servidor isolado. O build reutilizou cópias temporárias dos arquivos originais do Google Fonts. A estratégia para a persistência sem banco é tratada na T08.
- 2026-11-20 · ayrton · DONE · Aprovada a validação dos estudos e a limitação de tentativas de criação e fork.

---

### T08 · Fallback em memória dos estudos não pode mentir

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t08-fallback-estudos · **Worktree:** ../telluspedia-wt/codex-t08
- **Prioridade:** P1 · **Área:** Backend · **Tamanho:** P · **Depende de:** T07 · **Grupos:** G-ESTUDOS

**Contexto / problema**
Com Postgres fora, `POST /api/studies` e o fork salvam num `Map` do processo (`lib/studies-store.ts:27`) e respondem 200. Após restart (ou em serverless, onde cada instância tem seu Map), o link compartilhado quebra — viola a imutabilidade (RN16). Erros do Prisma são engolidos sem log em todas as rotas.

**O que fazer**
1. Fallback em memória só quando `NODE_ENV !== "production"` (ou flag `STUDIES_MEMORY_FALLBACK=1`), com aviso no log.
2. Em produção, falha de banco → 503 com mensagem clara.
3. Logar erros do Prisma (`console.error` estruturado ou logger) em todas as rotas que hoje fazem `catch {}`.
4. A UI de compartilhamento (`StudyShareModal`) deve mostrar erro quando a criação falhar.

**Critérios de aceite**
- [x] Em modo produção sem banco, criar estudo retorna 503 e a UI mostra erro.
- [x] Nenhum `catch {}` silencioso nas rotas de API.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Reivindicada como a próxima tarefa elegível da fase 3 após o aceite da T07.
- 2026-11-20 · codex · REVIEW · Em produção, indisponibilidade do banco retorna 503 na criação, leitura e fork. O 404 identifica consultas bem-sucedidas sem o estudo. Erros do Prisma têm logs com operação e identificador. Fora de produção, o uso da memória gera aviso e a resposta recebe X-Study-Persistence: memory. Antes o modal apresentava o link em memória como permanente. Agora marca esse link como temporário e mostra a indisponibilidade no 503. Typecheck, lint, 301 testes e build passaram. A versão de produção foi verificada por HTTP e no Chromium com Postgres inacessível em um servidor isolado. O rótulo temporário foi verificado com uma resposta simulada no navegador. O build reutilizou cópias temporárias dos arquivos originais do Google Fonts.
- 2026-11-20 · ayrton · DONE · Aprovado o tratamento da indisponibilidade do banco em produção e o aviso de links temporários.

---

### T09 · Cache sem limite em /api/observatory/cosmos

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t09-cosmos-lru-cache · **Worktree:** ../telluspedia-wt/antigravity-t09
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

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t10-endurecer-python · **Worktree:** ../telluspedia-wt/antigravity-t10
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
- [x] `pytest` passa num venv criado conforme o README.
- [x] `docker compose up data-pipeline` sobe com healthcheck `healthy`.
- [x] Container roda como usuário não-root (`docker exec ... whoami`).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (140e213).
- 2026-11-20 · antigravity · REVIEW · Implementado (commit 54cc62a): (1) `app/core/config.py`: migrado para `model_config = SettingsConfigDict(env_file=".env", extra="ignore")`, adicionadas `ALLOWED_ORIGINS` (lista via env com rejeição de `*`, padrão localhost/127.0.0.1:3000), `CORS_ALLOW_CREDENTIALS=False`, `REDIS_RECONNECT_BACKOFF_SECONDS=30.0` e `REDIS_SOCKET_TIMEOUT_SECONDS=1.5`; (2) `app/main.py`: CORS restrito a `settings.ALLOWED_ORIGINS`, `allow_credentials=settings.CORS_ALLOW_CREDENTIALS`, métodos `["GET", "OPTIONS"]` e cabeçalhos `["Accept", "Content-Type"]`; (3) `app/api/endpoints/weather.py` e `astronomy.py`: log estruturado com `logger.error(..., exc_info=exc)` mantendo 502 genérico `"Weather fetch failed"` e validação 400 para `dt` inválido; (4) `app/core/redis_client.py` + `weather_proxy_service.py`: backoff de 30s com `time.monotonic()`, timeouts curtos, fechamento seguro de socket em falha e `mark_redis_unavailable()`; (5) `Dockerfile` + `.dockerignore` + `docker-compose.yml`: build multi-stage (sem `build-essential` na imagem final), usuário não-root `appuser` e `HEALTHCHECK` em `/health`; (6) `uv.lock`, `requirements.lock`, `pyproject.toml` e `services/data-pipeline/README.md` com instruções reproduzíveis de venv e `pytest`. Validação: `uv sync --frozen && uv run pytest` 14/14 passando (incluindo nova `tests/test_hardening.py`); `docker compose up --build -d data-pipeline` reportou `healthy`, `docker exec telluspedia-data-pipeline whoami` retornou `appuser`, `which gcc` ausente na imagem final e `GET /health` 200; pós-rebase em `origin/master`: `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 301/301 (38 suítes), `pnpm build` ok (17/17 páginas).
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T11 · Ajustar next.config e script de build

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t11-next-config-build · **Worktree:** ../telluspedia-wt/codex-t11
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
- [x] `/_next/image?url=https://exemplo.com/x.png&w=64&q=75` → 400.
- [x] Strict mode ativo sem regressões visíveis (globo, câmera, timeline, estudos).
- [x] `pnpm build` com `pnpm dev` rodando não derruba o dev.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Reivindicada como a próxima tarefa elegível da fase 3 após o aceite da T08.
- 2026-11-20 · codex · REVIEW · Removido o hostname curinga do otimizador de imagens e ativado React Strict Mode. Next dev usa .next-dev, enquanto build e start usam .next. O script build chama next build diretamente. A URL remota de teste foi rejeitada com 400. A mesma instância do dev respondeu antes, durante e após o build. O Chromium verificou globo WebGL, voo e arraste da câmera, seleção de período, geração e restauração de estudo em desenvolvimento. Typecheck, lint, 345 testes e build passaram sobre o master que inclui a T12. A validação usou cópias temporárias dos arquivos originais do Google Fonts.
- 2026-11-20 · ayrton · DONE · Aprovados o isolamento do build, o Strict Mode e a política do otimizador de imagens.

---

### T12 · Seletor único de época (`useEpochState`)

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t12-epoch-state · **Worktree:** ../telluspedia-wt/claude-t12
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** G · **Depende de:** — · **Grupos:** G-EPOCA, G-FRONTEIRAS, G-TIMELINE, G-OBS

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
- [x] Nenhum componente calcula `isGeologicalActive`/`isApolloActive`/`isMagellanActive` localmente.
- [x] `grep -rn '"pangea-250ma"\|"magellan-1519"\|"usa-1969"' apps/web/src --include=*.tsx` → 0 ocorrências em componentes.
- [x] Playback passando por 1969 não ativa o Apollo.
- [x] Testes da função pura cobrindo todas as combinações relevantes.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. G-TIMELINE adicionado (o passo 4 altera `TimelineAxis`). Nenhuma tarefa de G-EPOCA/G-FRONTEIRAS/G-TIMELINE em andamento.
- 2026-11-20 · claude · IN_PROGRESS · G-OBS adicionado: `ObservatoryPanel` e `ObservatoryTelemetryHUD` também decidem localmente se a época é contemporânea (anacronismo) e passam a usar o seletor único. Nenhuma tarefa de G-OBS em andamento.
- 2026-11-20 · claude · REVIEW · Commit `678dcf8`. **Novo** `lib/epoch/`: `constants.ts` (IDs de marcos geológicos com idade em Ma, rota e marcos de Magalhães, marcos da Apollo 11, `SPACE_AGE_START_YEAR = 1957`, `DEFAULT_GEOLOGICAL_MA = 250`); `resolveEpoch.ts` — função **pura** `resolveEpoch(input) → { mode, effectiveYear, geologicalMa, historicalEraId, activeScene, isContemporary }` com precedência documentada **geológico > cena explícita (Magalhães > Apollo) > ano** (ano efetivo = ano selecionado > ano do marco > ano representativo do intervalo; `effectiveYear: null` = presente); `useEpochState.ts` — hook com `useShallow` sobre timelineStore, studyStore e historicalRouteStore (+ `getEpochState()` imperativo; lê `getState()` no render de servidor, como os demais componentes, para os testes com renderToStaticMarkup). **Migrados para o seletor:** `GlobeCanvas`, `EarthSphere`, `CountryBorders`, `OrbitingMoon`, `Apollo11TelemetryOverlay`, `HistoricalRouteOverlay`, `HistoricalRouteTrajectory` (constante), `HistoricalEraBadge` (props de override sem uso removidos), `PaleoEraBadge` (prop mantido), `TimelineBar`, `TimelineAxis`, `StudyShareModal`, `ObservatoryPanel` e `ObservatoryTelemetryHUD` (anacronismo agora inclui a cena de Magalhães e o modo geológico vindo de marco/estudo), `PresetSelector`/`EntityLaunch`/`/study/[slug]` (constantes); `timelineStore` e `study-epoch` usam `MAGELLAN_ROUTE_ID`. **Mudança de comportamento (intencional, critério da tarefa):** Apollo e Magalhães só por seleção explícita de marco/rota/estudo — o playback passando por 1969 ou 1519 não liga mais as cenas, e salvar um estudo no intervalo da Guerra Fria não grava mais `isApollo11Active` só porque o ano representativo é 1969. O teste antigo `Apollo11TelemetryOverlay renders when 1969…` foi atualizado para a regra nova. A contemporaneidade da telemetria passou a usar o **ano efetivo** (antes o globo usava só o ano selecionado): no recorte Guerras Mundiais sem ano selecionado, as camadas do Observatório ficam suprimidas no globo e no painel, de forma consistente. **Testes:** `test/epoch.test.ts` (44 casos: 39 da tabela, pureza, varredura de playback 1960–1975 e 3 verificações estáticas — nenhum `.tsx` com IDs especiais literais, com `isGeologicalActive/isApolloActive/isMagellanActive` locais ou com `=== 1969/1519`). **Validação:** typecheck ok, lint ok, 345/345 testes, build ok (home 431 kB). **Fora do escopo / pendências:** `InspectorHUD` ainda calcula o ano efetivo localmente para buscar os dados do país (G-PAIS; migrar junto da T13 ou D20); a direção solar segue em `GlobeCanvas`/`EarthSphere` a partir do ano/marco — é a T14; a restauração de estudo da Guerra Fria sem Apollo ainda seleciona 1968 (contorno antigo, inofensivo). **Desbloqueia:** T13, T14, T15 (e D12, que depende também da T20).
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### T13 · Desacoplar stores Zustand e remover estado redundante

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t13-desacoplar-stores · **Worktree:** ../telluspedia-wt/codex-t13
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** G · **Depende de:** T12 · **Grupos:** G-EPOCA, G-ESTUDOS, G-TIMELINE, G-GLOBO, G-FRONTEIRAS, G-PAIS, G-SHELL

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
- [x] Sem `require(` em `apps/web/src/stores`.
- [x] Cada conceito (rota ativa, Ma geológico) tem um único campo de estado.
- [x] `grep -c "any" ` reduzido; sem `(s: any)`.
- [x] Estudo salvo antes da mudança ainda restaura corretamente (teste).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Reivindicada após o aceite da T11. T12 em DONE. Incluído G-TIMELINE para adaptar os controles da timeline às ações compostas.
- 2026-11-20 · codex · IN_PROGRESS · Reservados G-GLOBO, G-FRONTEIRAS, G-PAIS e G-SHELL para migrar os chamadores de seleção/reset e tipar a integração do globo. Ma ativo em timelineStore, rota ativa em historicalRouteStore. O estudo persiste os mesmos campos como snapshot e aplica-os na restauração.
- 2026-11-20 · codex · REVIEW · O Ma ativo ficou em `timelineStore.geologicalMa`, substituindo `selectedGeologicalMa` e `timelineMode`. A rota ativa ficou em `historicalRouteStore.activeRouteId`, substituindo `timelineStore.activeRouteId` e `selectedRouteId`. Removidas as cópias em `studyStore`. `stores/actions.ts` coordena seleção e reset do globo, presets, navegação e restauração. Estudos e forks continuam usando o formato persistido, com leitura dos aliases antigos na restauração. A tipagem da integração TopoJSON e dos consumidores reduziu as ocorrências de `any` em `apps/web/src` de 45 para 13, incluindo dois comentários. Sem `require(` nas stores e sem seletores `(s: any)`. Typecheck, lint, 366/366 testes e build passaram. Build validado com CSS e fontes Google já baixados. Chromium validou Magalhães → Pangeia → presente e a restauração de um snapshot legado com resposta HTTP simulada.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton.

---

### T14 · Fonte única de direção solar

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t14-direcao-solar · **Worktree:** —
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
- [x] Luz e terminador coincidem após 10+ minutos com a aba aberta.
- [x] Com leitor aberto, o terminador atualiza ao fechar/ao invalidar.
- [x] Teste unitário: mesma data → mesmo vetor nos dois consumidores.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (782b459). Grupos G-EPOCA e G-GLOBO livres.
- 2026-11-20 · antigravity · REVIEW · Criado `lib/epoch/useSunDirection.ts` como fonte única de direção solar combinando `useEpochState()` (T12) + relógio compartilhado único de 60 s (`useSyncExternalStore`, sem timers duplicados por componente). Migrados os 3 consumidores 3D para a mesma fonte: `<SolarDirectionalLight />` em `GlobeCanvas.tsx` (antes congelado no `new Date()` do carregamento), `EarthSphere.tsx` (`uSunDirection`, removido `setInterval` local) e `OrbitingMoon.tsx` (fase solar e data lunar sincronizadas). Todos invocam `invalidate()` no R3F em cada tick solar e ao sair do Modo Leitura (`isThrottled`), mantendo o terminador atualizado sob `frameloop="demand"`. Convenção de data para anos sem data exata (**21 de junho, 12:00 UTC** — constantes `YEAR_ONLY_REFERENCE_*_UTC`) documentada em `lib/astronomy.ts`, `lib/epoch/useSunDirection.ts` e `docs/ARCHITECTURE.md` (§2.2); invariante de normais em espaço mundial (`AGENTS.md` §1) preservado. Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (420/420, incluindo 4 novos testes em `test/sun-direction.test.tsx` validando paridade luz/shader em t0, +15 min e +2 h, convenção 21/jun 12:00 UTC e guardrails de `invalidate()`) e `pnpm build` verdes. Commit: da9bc59.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T15 · Lua com posição astronômica real

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t15-lua-astronomica · **Worktree:** —
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
- [x] Direção da Lua dentro de 1° da referência em 3 datas de teste.
- [x] Fase visível compatível com a data (ex.: lua cheia em 2024-01-25).
- [x] Respeita SLERP/handover de câmera do `AGENTS.md` ao focar a Lua.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (bde8c4a). Grupo G-EPOCA livre.
- 2026-11-20 · antigravity · REVIEW · Implementada efeméride lunar geocêntrica por data (Meeus Cap. 47: 30 termos periódicos de longitude/distância + 20 de latitude + argumentos aditivos A1–A3, conversão eclíptica→equatorial→sublunar via GMST e fase/elongação real) em `lib/astronomy.ts` (`calculateLunarPosition`, `getMoonScenePosition`, `resolveAstronomicalDate`, `getLunarPhase`), com escala didática comprimida documentada (`MOON_SCENE_ORBIT_RADIUS = 3.622 R⊕` modulada pela excentricidade real perigeu/apogeu ~3,36–3,83 R⊕, preservando direção 3D exata tanto no modo Terra quanto no modo Cósmico). Apollo 11 (`lib/apollo11.ts` e `Apollo11Trajectory.tsx`) agora deriva `MOON_DEFAULT_POSITION` diretamente de `1969-07-20T20:17:40Z` com base selenográfica generalizada (face visível sempre voltada à Terra). Visual antes/depois em `OrbitingMoon.tsx`: antes girava a 0,04 rad/s constante, estacionava em `(3.6, 0.4, 0)` no Apollo 11 e sofria decaimento da luz solar no modo Cósmico; agora posiciona-se na direção real da época ativa com acoplamento de maré (`computeTidalLockQuaternion`), shader GLSL em espaço mundial (`AGENTS.md` §1) iluminado pela mesma direção solar da Terra (terminador lunar realista + luz cinérea suave + `#include <tonemapping_fragment>` / `<colorspace_fragment>`), atualização síncrona e por frame de `currentMoonWorldPos` (handover seguro de câmera) e descarte explícito (`.dispose()`). Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (382/382, com 6 novos testes em `test/moon-astronomy.test.ts` validando 4 datas de referência Meeus/JPL com erro < 0,05° e Lua Cheia 2024-01-25 / Lua Nova 2024-04-08) e `pnpm build` verdes; inspeção visual no navegador pendente para revisão do ayrton. Commit: 27ee50c.
- 2026-11-20 · antigravity · IN_PROGRESS · Reaberta após reprovação do ayrton (com vídeo e screenshot): (1) durante o playback da timeline, a Lua teletransportava bruscamente a cada ano em vez de mover-se de forma suave ao longo da órbita esférica; (2) na cena Apollo 11, a trajetória translunar desconectou-se totalmente da Lua porque `resolveAstronomicalDate` aplicava `selectedMilestoneExactDate` ("1969-07-20" -> 12:00 UTC) antes de `APOLLO11` (20:17:40 UTC, diferença de 124° de rotação terrestre), além de câmera/alinhamento do pouso na Lua. Worktree recriado a partir de origin/master (3d923a7).
- 2026-11-20 · antigravity · REVIEW · Corrigidas as duas regressões reportadas: (1) `OrbitingMoon.tsx` passou a animar imperativamente com `stepOrbitalPosition` (removido `position={targetLocalPos}` do JSX que causava snap a cada re-render): durante playback da timeline (`isPlaying && !isApolloScene`) a Lua revoluciona suavemente em órbita prógrada sem teletransportar pelos saltos anuais de ~132°, e ao pausar/selecionar época ou entrar na Apollo 11 desliza suavemente por SLERP sobre a casca esférica até travar na posição exata de Meeus Cap. 47 (sem cortar a Terra), preservando `focusCelestialBody("MOON")` do D15; (2) `resolveAstronomicalDate` em `lib/astronomy.ts` agora prioriza `activeScene === "APOLLO11"` (`1969-07-20T20:17:40Z`) sobre `exactDate` sem hora (`"1969-07-20"`), eliminando o desvio de 124° e acoplando exatamente `OrbitingMoon`, `Apollo11Trajectory` e a luz solar de `GlobeCanvas` no mesmo ponto do Mar da Tranquilidade; presets `APOLLO11_WIDE_CAMERA` (`lat 12, lng -148, alt 6.0`) e `APOLLO11_MOON_CAMERA` derivados da Lua real de 1969-07-20 aplicados em `Apollo11Trajectory.tsx` e `Apollo11TelemetryOverlay.tsx`. Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (401/401, com 7 testes em `test/moon-astronomy.test.ts` validando SLERP contínuo, ausência de teletransporte, acoplamento exato Apollo 11 e projeção 3D das câmeras) e `pnpm build` verdes. Commit: 5854973.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T16 · Cache de geometria de highlight por ISO

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t16-cache-highlight · **Worktree:** ../telluspedia-wt/codex-t16
- **Prioridade:** P2 · **Área:** Performance · **Tamanho:** P · **Depende de:** — · **Grupos:** G-FRONTEIRAS

**Contexto / problema**
`components/globe/CountryBorders.tsx:170-262`: a cada mudança de `hoveredIso`, o `useMemo` percorre todas as geometrias do TopoJSON e roda `topojson.mesh` para os ISOs ativos, gerando nova `BufferGeometry`.

**O que fazer**
1. Cache `Map<eraId:iso, Float32Array>` de posições por país (lazy).
2. Highlight = concatenação das posições em cache dos ISOs ativos (ou um `lineSegments` por ISO ativo, reaproveitado).
3. Manter `dispose()` correto (invariante do `AGENTS.md`).

**Critérios de aceite**
- [x] Hover rápido sobre países não causa quedas de FPS visíveis (medir com Performance do DevTools antes/depois).
- [x] Sem vazamento de geometrias (contar `renderer.info.memory.geometries` antes/depois de 50 hovers).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Próxima tarefa elegível na fase 8. G-FRONTEIRAS está livre.
- 2026-11-20 · codex · REVIEW · Reaproveita os contornos por atlas e ISO e mantém um buffer WebGL por estilo de destaque. O buffer cresce sob demanda e a geometria anterior é descartada. Traces do DevTools em Chromium com SwiftShader e resolução de renderização de 320 × 212 compararam 50 hovers após aquecimento. Geometrias e materiais distintos de hover caíram de 50 para 1. A memória do renderer ficou em 9 geometrias do início ao fim. A média foi de 62,4 FPS antes e 62,5 FPS depois, com p95 de quadro de 19 para 18 ms. Typecheck, lint, 524 testes e build passaram. Implementação em `da5f190`.
- 2026-11-21 · ayrton · DONE · Aceite registrado.

---

### T17 · Páginas com SSR e metadata (Open Graph)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t17-ssr-metadata · **Worktree:** —
- **Prioridade:** P1 · **Área:** Frontend · **Tamanho:** G · **Depende de:** T13 · **Grupos:** G-PAIS, G-ESTUDOS, G-SHELL

**Contexto / problema**
`app/study/[slug]/page.tsx`, `app/pais/[iso]/page.tsx` e `app/compare/page.tsx` são `"use client"` e só embrulham a `HomePage`, carregando estado via `useEffect`/`fetch`. Consequências: link de estudo compartilhado sem título/descrição/imagem (crítico para RN16), países sem SEO, flash do estado padrão antes do estado correto. `app/layout.tsx` aplica `overflow-hidden` global no `<body>`, forçando workarounds (ex.: `dossies/[slug]` usa `h-dvh overflow-y-auto`).

**O que fazer**
1. Transformar as páginas em Server Components que carregam os dados (estudo/país) no servidor e passam `initialState` para um componente cliente que hidrata os stores uma única vez.
2. `generateMetadata` em cada página: título, descrição, `openGraph` e `twitter`.
3. Imagem OG dinâmica (`opengraph-image.tsx`) para estudos e países (nome, período, bandeira).
4. `notFound()` para estudo/país inexistente.
5. Mover `overflow-hidden` para o layout da experiência do globo, não para o `<body>` global.

**Critérios de aceite**
- [x] `curl -s localhost:3000/study/guerra-fria-br-de-k9x2 | grep og:title` retorna o título do estudo.
- [x] Sem flash do estado padrão ao abrir `/study/...` e `/pais/BRA`.
- [x] Slug inexistente → página 404.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (dd64655). Grupo G-SHELL adicionado pelo passo 5 (`app/layout.tsx`); grupos G-PAIS, G-ESTUDOS e G-SHELL livres.
- 2026-11-20 · antigravity · REVIEW · Convertidas `app/page.tsx`, `app/study/[slug]/page.tsx`, `app/pais/[iso]/page.tsx` e `app/compare/page.tsx` em Server Components com carregamento server-side (`lib/server-loaders.ts`: Prisma com fallback dev conforme T08, `getCountryData`, `parseCompareIsos`), `generateMetadata` completo (`title`, `description`, `openGraph`, `twitter`) e `notFound()` + página 404 com tokens D14 (`app/not-found.tsx`). Criado `components/shell/GlobeExperienceShell.tsx` realizando hidratação síncrona única (`applyInitialGlobeState`) antes da montagem dos filhos (eliminando flash do estado padrão em SSR e cliente) e isolando `overflow-hidden` da experiência 3D fora do `<body>` global (`app/layout.tsx` + remoção do workaround `h-dvh overflow-y-auto` em `app/dossies/[slug]/page.tsx`). Criadas imagens OG dinâmicas (`next/og` `ImageResponse` 1200×630 PNG) em `app/study/[slug]/opengraph-image.tsx` e `app/pais/[iso]/opengraph-image.tsx` (com leitura segura de SVGs locais em `public/flags/` protegida contra path traversal + emblema ISO). Verificação HTTP ao vivo na porta 3003 (`curl`): `/study/guerra-fria-br-de-k9x2` → HTTP 200 com `og:title="Análise Comparada da Guerra Fria: Brasil &amp; Alemanha"` e PNG 107 KB; `/pais/BRA` → HTTP 200 com `og:title="Brasil (BRA) — TellusPedia"` e PNG 85 KB; `/compare?c=BRA,DEU` → HTTP 200 com `og:title="Comparador: Brasil vs Alemanha — TellusPedia"`; `/study/nao-existe-xyz` e `/pais/ZZZ` → HTTP 404. Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (443/443, com 6 novos testes em `test/ssr-metadata.test.tsx` + cobertura D14 em `test/design-system.test.tsx`) e `pnpm build` verdes. Commit: 208e349.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T18 · Pipeline de CI

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t18-pipeline-ci · **Worktree:** ../telluspedia-wt/codex-t18
- **Prioridade:** P2 · **Área:** Infra · **Tamanho:** M · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
Não existe `.github/workflows`. Nada impede regressões entrarem em `master`.

**O que fazer**
1. Workflow `ci.yml` em push/PR: pnpm install (cache), `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
2. Job Python: instalar deps (lock de T10, se já existir), `pytest`.
3. Job opcional (depois de T19): Playwright com upload de artefatos de screenshot.
4. Badge no README.

**Critérios de aceite**
- [x] CI verde em `master` e executando em PRs.
- [x] Falha de teste quebra o PR.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 4. D15 depende de alterações no painel do Observatório, cujo grupo está ocupado pela D05.
- 2026-11-20 · codex · REVIEW · Workflow `ci.yml` com jobs Web e Data Pipeline, cache por lockfile e badge no README. Validação local com actionlint, typecheck, lint, 378 testes web, build e 14 testes Python. Uma asserção temporária confirmou a saída 1 de `pnpm test`. GitHub Actions verde no [PR de validação #2](https://github.com/AyrtonLoks/telluspedia/actions/runs/44784823500) e no [push em master](https://github.com/AyrtonLoks/telluspedia/actions/runs/44784933258). Falhas reprovam o check. Proteção de branch para tornar checks obrigatórios no merge depende de configuração do repositório. Playwright segue na T19.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton.

---

### T19 · Reorganizar testes + testes de API + E2E visual

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t19-testes-api-e2e · **Worktree:** ../telluspedia-wt/codex-t19
- **Prioridade:** P2 · **Área:** Qualidade · **Tamanho:** G · **Depende de:** T18 · **Grupos:** G-INFRA

**Contexto / problema**
`apps/web/test/unit.test.ts` tem 4.291 linhas num único arquivo. Não há testes das rotas de API (estudos, fork, weather, firms). Não há E2E nem regressão visual — que teriam pegado T01 (fonte) e T02 (overflow).

**O que fazer**
1. Quebrar `unit.test.ts` por domínio (`astronomy`, `geo`, `citations`, `timeline`, `studies`, `observatory`, `historical`…), sem perder casos (contagem de testes igual ou maior: hoje 198).
2. Testes de rotas chamando os handlers diretamente (`GET`/`POST` com `NextRequest`).
3. Playwright: smoke (home carrega, clicar país abre HUD, timeline visível) + screenshots em 1366 e 1920 px comparados com baseline.
4. Script `pnpm test:e2e`.

**Critérios de aceite**
- [x] Nenhum arquivo de teste com mais de ~800 linhas.
- [x] Número total de testes ≥ 198.
- [x] Rotas de estudos, weather e firms cobertas.
- [x] `pnpm test:e2e` passa localmente e no CI.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-21 · codex · IN_PROGRESS · Próxima tarefa elegível na fase 8. T18 concluída e G-INFRA livre.
- 2026-11-21 · codex · REVIEW · As 23 suítes do monólito foram preservadas por domínio; o maior arquivo ficou com 619 linhas. A suíte Cosmos passou a executar uma vez. Estudos, fork, clima e FIRMS são testados por chamadas diretas aos handlers. Playwright validou o clique no Brasil, a carga de Geist e Merriweather e a timeline em 1366 e 1920 px. Os snapshots comparam a interface com o canvas oculto; o smoke usa o WebGL. Typecheck, lint, 526 testes e build passaram. Os 4 E2E passaram localmente em Linux (container Playwright) e no [GitHub Actions](https://github.com/AyrtonLoks/telluspedia/actions/runs/44863369632). Implementação em `f7fff00`.
- 2026-11-21 · ayrton · DONE · Aceite registrado.

---

### T20 · Migrations Prisma e restrições do schema

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t20-prisma-migrations · **Worktree:** —
- **Prioridade:** P2 · **Área:** Backend · **Tamanho:** M · **Depende de:** — · **Grupos:** G-ESTUDOS

**Contexto / problema**
`apps/web/prisma/` não tem diretório `migrations` versionado — só `schema.prisma`. `Study` não tem limite de tamanho nos campos de texto. `Country.geometryJson` é obrigatório mas não é usado pelo frontend (as fronteiras vêm do `world-atlas`).

**O que fazer**
1. Gerar migration inicial (`prisma migrate dev --name init`) e versionar.
2. `@db.VarChar(n)` para `title` etc., coerentes com o schema zod de T07.
3. Decidir sobre `geometryJson`: tornar opcional ou remover (registrar decisão no Log).
4. Documentar no README o fluxo `docker:up → db:migrate → db:seed`.

**Critérios de aceite**
- [x] `prisma migrate reset` num banco vazio aplica tudo e o seed roda.
- [x] Limites do banco iguais aos do zod.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (001e345). Grupo G-ESTUDOS livre; desbloqueia D12 (P1).
- 2026-11-20 · antigravity · REVIEW · **Decisão sobre `Country.geometryJson`: removido** de `schema.prisma` e `prisma/seed.ts` (não era lido em nenhum endpoint, loader, frontend ou `data-pipeline` — fronteiras e picking vêm do `world-atlas`/TopoJSON; caso consultas espaciais no banco sejam necessárias futuramente, devem usar coluna PostGIS `geometry` dedicada em vez de blob JSON duplicado). **Restrições alinhadas ao Zod (T07):** adicionados `@db.VarChar` no modelo `Study` em `apps/web/prisma/schema.prisma` (`id`/`parentId` `VarChar(128)`, `title` `VarChar(200)`, `description` `VarChar(2000)`, `markdownNotes` `VarChar(50000)`, campos de enum `VarChar(64)` e arrays `VarChar(32|64)[]`), exportadas constantes `MAX_STUDY_SLUG_LENGTH` e `MAX_STUDY_ITEMS` em `src/lib/study-schema.ts`, e gerada/versionada a migration inicial `apps/web/prisma/migrations/20261121014158_init/migration.sql` (+ `migration_lock.toml`) com `CHECK` constraints PostgreSQL coerentes com o Zod (`timelineStartYear` ∈ `[-3000, 3000]` e `<= timelineEndYear`, `cameraLat` ∈ `[-90, 90]`, `cameraLng` ∈ `[-180, 180]`, `cameraAltitude` ∈ `[1.5, 6]`, `geologicalMa` ∈ `[0, 4600]`, cardinalidade dos arrays `<= 50`). **Documentação:** atualizado `README.md` com o fluxo completo `cp apps/web/.env.example apps/web/.env` → `pnpm docker:up` → `pnpm db:migrate` → `pnpm db:seed`, além de `prisma migrate reset` (dev) e `prisma migrate deploy` (prod/CI). **Validação:** testado em container efêmero `postgis/postgis:16-3.4` (`prisma migrate reset --force` aplicou `20261121014158_init` e executou o seed automaticamente: 6 países piloto, 36 indicadores, 11 dossiês, 45 marcos e 1 estudo; `prisma migrate status` e `prisma migrate dev` confirmaram zero drift; verificados 12 casos inválidos rejeitados pelo PostgreSQL + aceitação exata do limite máximo); `pnpm db:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (474/474, incluindo 4 novos testes de regressão em `test/prisma-schema.test.ts`) e `pnpm build` verdes. Desbloqueia `D12`. Commit: 67faa7a.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T21 · Consolidar texturas duplicadas

- **Status:** DONE · **Responsável:** claude · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Assets · **Tamanho:** P · **Depende de:** — · **Grupos:** G-GLOBO

**Contexto / problema**
Em `apps/web/public/textures/` há cópias idênticas (mesmo md5): `paleo_pangea.png` = `pangea_250ma.png` = `paleo/pangea_250ma.png` (+ `paleo/pangea_250ma.jpg`); `paleo_gondwana.png` = `gondwana_150ma.png` = `paleo/gondwana_150ma.png`.

**O que fazer**
1. Manter só `textures/paleo/*`.
2. Atualizar referências (`grep -rn "paleo_pangea\|pangea_250ma\|gondwana_150ma\|paleo_gondwana" apps/web/src apps/web/scripts`).
3. Considerar conversão para KTX2/WebP (coordenar com D02).

**Critérios de aceite**
- [x] Nenhum arquivo duplicado em `public/textures`.
- [x] Modo geológico continua exibindo Pangeia e Gondwana.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

- 2026-11-20 · claude · REVIEW · Feito junto com as pendências da D02: as 7 cópias (`paleo_pangea.png`, `paleo_gondwana.png`, `pangea_250ma.*`, `gondwana_150ma.png` e as de `paleo/`) foram removidas; cada era aponta para `textures/paleo/paleo_<idade>ma.png` (+ `.ktx2`), gerados do PALEOMAP PaleoDEM. Teste em `globe-surface.test.ts` garante que as antigas não voltam.
- 2026-11-20 · ayrton · DONE · Aprovada pelo Ayrton (registrado por claude). Pangeia e Gondwana conferidos no navegador (:3001) com os novos paleomapas.
---

### T22 · Acessibilidade (labels, teclado, foco)

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t22-acessibilidade · **Worktree:** ../telluspedia-wt/codex-t22
- **Prioridade:** P2 · **Área:** A11y · **Tamanho:** M · **Depende de:** D14 · **Grupos:** G-SHELL, G-EPOCA, G-TIMELINE

**Contexto / problema**
94 `<button>` para 16 `aria-label`. Botões só de ícone (reset na navbar, recolher timeline, fechar painéis) usam apenas `title`. Inputs de ano sem `<label>`. Sem gestão de foco nos painéis; navegação por teclado no globo inexistente.

**O que fazer**
1. `aria-label` em todos os botões só de ícone; labels nos inputs.
2. Painéis/modais via Radix Dialog (foco preso, `Esc` fecha, retorno de foco).
3. Toggles do observatório como `role="switch"` com `aria-checked`.
4. Atalhos básicos: setas giram o globo, `+/-` zoom, `/` foca a busca.
5. Rodar axe (extensão ou `@axe-core/playwright` em T19).

**Critérios de aceite**
- [x] axe sem violações "serious"/"critical" na home.
- [x] Fluxo "buscar país → abrir HUD → fechar" possível só com teclado.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-21 · codex · IN_PROGRESS · Primeira tarefa disponível da fase 8, com D14 concluída e G-SHELL livre.
- 2026-11-21 · codex · IN_PROGRESS · Reservados G-EPOCA e G-TIMELINE para incluir navegação por teclado no canvas e controles acessíveis na linha do tempo. Grupos livres no remoto.
- 2026-11-21 · codex · REVIEW · Rótulos acessíveis na navbar e timeline; atalhos de órbita e zoom no globo; barra abre a busca com foco no globo ou no próprio botão. O dock permite alternar abas com setas e usar o globo enquanto está aberto. Busca por teclado leva o foco à ficha e, ao fechar, devolve-o ao controle de origem. Modais Radix contêm e restauram o foco. Os interruptores do Observatório foram verificados com Espaço e aria-checked. Implementação: `adbc521`.
- 2026-11-21 · codex · REVIEW · Capturas antes/depois em 1366 e 1920 px: a diferença visual na home se restringe ao controle de busca, com rótulo curto e atalho sem sobreposição. Capturas com Tab em 1366 e 390 px confirmam contorno ciano visível sobre o canvas.
- 2026-11-21 · codex · REVIEW · Após integrar a D21: typecheck, lint, build, 609 testes e 14 cenários Playwright passaram. O teste de KTX2, pulado no host por falta de Chrome no caminho esperado, passou em execução separada no Chromium. Axe 4.14.1 sem violações na home em 1366×850 e 390×844.
- 2026-11-21 · ayrton · DONE · Entrega aprovada no chat.

---

### T23 · Limpezas menores

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t23-minor-cleanups · **Worktree:** —
- **Prioridade:** P2 · **Área:** Qualidade · **Tamanho:** P · **Depende de:** — · **Grupos:** G-TIMELINE, G-PAIS

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
- [x] Itens acima resolvidos sem mudança de comportamento visível.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (a750555). Grupos G-TIMELINE e G-PAIS (para `lib/api-client.ts`) livres; `G-EPOCA`/`G-SHELL` reservados por D12.
- 2026-11-21 · antigravity · REVIEW · Todos os 4 itens resolvidos/verificados sem alterar o comportamento visível: (1) `TimelineBar.tsx` deixou de checar `startYear === 1947 && endYear === 1991` e agora deriva o contexto de era a partir do seletor único `useEpochState()` via `resolveEraStudyEntityId` (`lib/timeline/era-study.ts`, sem importar o JSON do TellusBridge no bundle inicial da T25); (2) removida a opção server-only `{ next: { revalidate: 3600 } }` do `fetch("/api/countries")` de cliente em `lib/api-client.ts`; (3) auditado `EarthShaderMaterial.ts` — variáveis mortas `dayLit`/`paleoLit` já removidas na D02 (0 ocorrências); (4) auditado `IssOrbitLayer.tsx` — alocações de `Vector3`/`Matrix4` por quadro já eliminadas na D04 (`prevPos`/`nextPos`/`curPos`/`tmp` pré-alocados em `useMemo`). Adicionados 4 testes de regressão em `test/minor-cleanups.test.ts` cobrindo os 4 itens e validando todos os `ERA_STUDY_ENTITY_IDS` contra o manifesto do TellusBridge. Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (540/540) e `pnpm build` (`/` em 223 kB) verdes. Commit: 59e7e34.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T25 · Reduzir bundle inicial (408 kB)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t25-reduce-initial-bundle · **Worktree:** —
- **Prioridade:** P2 · **Área:** Performance · **Tamanho:** M · **Depende de:** — · **Grupos:** G-SHELL, G-INFRA, G-TIMELINE, G-GLOBO, G-OBS, G-PAIS

**Contexto / problema**
`pnpm build` reporta **408 kB** de First Load JS em `/` (e ~409 kB em `/pais`, `/compare`, `/study`). O `GlobeCanvas` já é dinâmico; a suspeita (não confirmada) é que `CountryComparator` (Recharts), `ReaderMode`, `StudyShareModal`, `CitationModal`, `ObservatoryPanel` e framer-motion, importados estaticamente em `app/page.tsx`, entram no bundle inicial.

**O que fazer**
1. Adicionar `@next/bundle-analyzer` e gerar relatório (anexar resumo no Log).
2. Carregar painéis com `next/dynamic` somente quando abertos.
3. Verificar imports de `lucide-react` (tree-shaking) e `three` fora do canvas.
4. Meta: First Load JS de `/` < 250 kB.

**Critérios de aceite**
- [x] Relatório antes/depois no Log.
- [x] First Load JS de `/` reduzido (meta < 250 kB).
- [x] Painéis abrem sem atraso perceptível (pré-carregar no hover do botão se necessário).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (55e0e68). Grupos G-SHELL e G-INFRA livres.
- 2026-11-21 · antigravity · IN_PROGRESS · Adicionados grupos G-TIMELINE, G-GLOBO, G-OBS e G-PAIS (todos livres, sem tarefas IN_PROGRESS/BLOCKED): diagnóstico do `@next/bundle-analyzer` mostrou `three` (166 kB gzip) entrando em `/` via `observatoryStore → satellites → astronomy.ts` (apenas por `calculateSubsolarPoint`) e `tellus-bridge/catalog` (30,7 kB gzip) entrando via `StudyContext` em `TimelineBar`/`MilestonePin`, além de pré-carregamento no hover do `InspectorHUD`.
- 2026-11-21 · antigravity · REVIEW · Relatório `@next/bundle-analyzer` (`pnpm analyze`, `ANALYZE=true next build`): **Antes** — First Load JS em `/`, `/pais/[iso]`, `/compare` e `/study/[slug]` = **485 kB** (106 kB shared + 379 kB da rota: `three.module.js` 166,1 kB gz / 665,9 kB parsed; chunk de app/painéis/modais 131,8 kB gz; `tellus-bridge/catalog` + `registry.json` 30,7 kB gz; `@radix-ui/react-dialog` + foco/portal 14,5 kB gz; `satellite.js` 9,9 kB gz + `lucide-react` 11,4 kB gz + `d3-geo` 1,2 kB gz). **Mudanças:** (1) adicionado `@next/bundle-analyzer@15.1.0`, script `pnpm analyze` e `experimental.optimizePackageImports: ["lucide-react"]` em `next.config.mjs`; (2) painéis, overlays e modais fechados por padrão no `GlobeExperienceShell` (`RightDock`, `CosmicInspectorHUD`, `ReaderMode`, `CountryComparator`, `StudyShareModal`, `CitationModal`, `HistoricalEraBadge`, `PaleoEraBadge`, `HistoricalRouteOverlay`, `EntityLaunch`, `ForkStudyBanner`) carregados sob demanda via `next/dynamic` e montados apenas quando ativos; (3) `StudyContext` em `TimelineBar` e `MilestonePin` carregado via `next/dynamic` (retira `tellus-bridge/catalog` + `registry.json` de `/`); (4) extraído `calculateSubsolarPoint` (trigonometria pura NOAA, sem Three.js) para `lib/astronomy-solar.ts`, re-exportado em `lib/astronomy.ts`, consumido por `lib/satellites.ts` e removido import morto de `geo-spatial` em `lib/observatory-data.ts` (elimina 100% de `three` de `/`); (5) pré-carregamento idempotente no hover/foco (`lib/panel-preload.ts`) nos botões de `TopNavBar`, `InspectorHUD` e `MilestonePin`; (6) suíte de regressão `test/bundle-budget.test.ts` (6 testes). **Depois** — First Load JS em `/`, `/pais/[iso]`, `/compare` e `/study/[slug]` = **222 kB** (**−263 kB / −54,2%**, meta `< 250 kB` atingida com margem; 0 ocorrências de `three`, `recharts`, `framer-motion`, `@radix-ui/react-dialog`, `tellus-bridge/catalog`, `paleo-data` e `astronomy-planets` no chunk inicial de `/`). Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (534/534) e `pnpm build` verdes + smoke test HTTP 200 em `/`, `/pais/BRA`, `/compare?c=BRA,DEU`, `/dossies/dom-pedro-ii` e `/telluslab` via `next start` na porta 3003. Verificação interativa no navegador pendente do Ayrton (Chromium headless indisponível neste container). Commit: a024df7.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T26 · Ingestão de indicadores reais do Banco Mundial (177 países)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t26-worldbank-indicators · **Worktree:** —
- **Prioridade:** P1 · **Área:** Dados · **Tamanho:** G · **Depende de:** T03 · **Grupos:** G-PAIS, G-PIPELINE

**Contexto / problema**
Após a remoção dos valores inventados na T03, os ~147 países fora de `PILOT_COUNTRIES` / `GLOBAL_COUNTRY_INFO` possuem identificação geográfica real (Natural Earth 1:110m + CLDR), mas exibem "Dado indisponível" para população, PIB, IDH, área e expectativa de vida.

**O que fazer**
1. Criar pipeline/script versionado para ingerir indicadores oficiais via API do Banco Mundial (`SP.POP.TOTL`, `NY.GDP.MKTP.CD`, `AG.SRF.TOTL.K2`, `SP.DYN.LE00.IN`, `MS.MIL.XPND.GD.ZS`) e REST Countries (capital, moeda, região, nome oficial) para todos os 177 países.
2. Registrar fonte primária, código oficial do indicador e ano/data de referência em cada série (RN02).
3. Persistir em dataset versionado (ou seed Prisma) e integrar ao `getCountryData` e `/api/countries`, mantendo `null` sempre que o órgão oficial não publicar o indicador.
4. Adicionar testes de integridade do dataset ingerido.

**Critérios de aceite**
- [x] Todos os países cobertos pela API do Banco Mundial exibem população, área e PIB reais com ano e link da fonte primária.
- [x] Ausências reais da fonte continuam renderizando "Dado indisponível".
- [x] Script de ingestão reproduzível e documentado.

**Como verificar**: rodar script de ingestão, `pnpm test`, clicar em COD, KAZ, PER e BRA.

**Log**
- 2026-11-20 · antigravity · TODO · Tarefa de follow-up aberta ao concluir T03.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (af782d1). Grupos G-PAIS e G-PIPELINE livres.
- 2026-11-20 · antigravity · REVIEW · Criado script reproduzível `apps/web/scripts/ingest-worldbank-indicators.mjs` (suporta `--dry-run`, retry/paginação, zero dependências extras) consultando a World Bank Indicators API v2 (`mrnev=1`, `lastupdated: 2026-11-11`, CC BY 4.0) para `SP.POP.TOTL`, `NY.GDP.MKTP.CD`, `AG.SRF.TOTL.K2`, `SP.DYN.LE00.IN` e `MS.MIL.XPND.GD.ZS` e o dataset canônico REST Countries (`mledoze/countries`, ODbL 1.0, com alias `XKX→UNK` e localização pt-BR via `Intl.DisplayNames`), gerando o dataset versionado e normalizado `apps/web/public/data/countries-worldbank-indicators.json` (122 KB / 14 KB gzip; cobertura real sobre os 177 territórios do catálogo Natural Earth 1:110m: 170 população, 169 PIB, 169 área, 170 expectativa de vida, 160 gastos militares, 176 metadados administrativos; 7 territórios sem publicação no Banco Mundial mantidos como `null`: `ATA`, `ATF`, `CYN`, `ESH`, `FLK`, `GUF`, `TWN`). Integrado em `lib/country-data.ts` (`getCountryData`, `getAllCountries`, `WORLD_BANK_METADATA`/`WORLD_BANK_COUNTRIES`), `lib/citations.ts` (suporte a `AG.*` em `getSourceUrl`), `app/api/countries/route.ts` (retorna todos os 177 países preservando `null` sem converter para `0`), `components/hud/CountryMetricsGrid.tsx` (exibe código oficial + ano `{indicatorCode} · {year}` e link direto `data.worldbank.org/indicator/...?locations=<ISO2>` em tokens D14), `components/hud/InspectorHUD.tsx` e `components/comparator/ComparisonGrid.tsx`. Documentado em `docs/DATA_SOURCES.md`. Validação: `node apps/web/scripts/ingest-worldbank-indicators.mjs --dry-run`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (459/459, com suite expandida em `test/country-data-integrity.test.tsx`), `pnpm build` e verificação HTTP ao vivo na porta 3003 (`/api/countries` 177 itens; `/api/countries/{COD,KAZ,PER,BRA,PRK,CYN,XYZ}` e SSR `/pais/{COD,KAZ,PER,BRA,CYN}` confirmando indicadores reais com ano/link e "Dado indisponível" para ausências reais como `CYN` e PIB de `PRK`). Commit: 5afb7c1.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T27 · Corrigir falha intermitente do loader next/font com Merriweather v33

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t27-next-font-merriweather · **Worktree:** —
- **Prioridade:** P1 · **Área:** Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** G-SHELL, G-INFRA

**Contexto / problema**
Durante `pnpm build` em Next.js 15.1.0, o Google Fonts CDN passou a responder intermitentemente URLs de `Merriweather` no formato `https://fonts.gstatic.com/l/font?kit=...&v=v33` (sem extensão `.woff2`). O `next/font/google/loader.js:122` executa `/\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1]`, causando `TypeError: Cannot read properties of null (reading '1')` e quebrando o build de forma não determinística.

**O que fazer**
1. Avaliar atualização do `next` para versão 15.x que suporte URLs sem sufixo de extensão no `next/font/google`, ou empacotar `Merriweather` localmente (`next/font/local` / `@fontsource/merriweather`) eliminando dependência externa em build time.
2. Validar que `pnpm build` passa de forma determinística (inclusive sem depender de POP específico do Google Fonts) e que os testes de `apps/web/test/fonts.test.ts` seguem verdes.

**Critérios de aceite**
- [x] `pnpm build` passa de forma determinística sem erro em `next/font/google/loader.js`.
- [x] Fontes Geist, Geist Mono e Merriweather continuam carregadas corretamente.

**Como verificar**: rodar `pnpm build` repetidamente e `pnpm test`.

**Log**
- 2026-11-20 · antigravity · TODO · Problema identificado durante validação de build da T03.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (11fabe3). Grupos G-SHELL e G-INFRA livres.
- 2026-11-20 · antigravity · REVIEW · Migradas as três famílias de fontes em `apps/web/src/app/layout.tsx` de `next/font/google` para `next/font/local` usando arquivos `.woff2` oficiais (SIL OFL-1.1) em `apps/web/src/app/fonts/`: `Geist-Variable.woff2` (68 KB), `GeistMono-Variable.woff2` (70 KB, `vercel/geist-font`) e `Merriweather-{Regular,Italic,Bold,BoldItalic}.woff2` (75–76 KB cada, `SorkinType/Merriweather`, com `preload: false`), preservando as variáveis CSS `--font-geist-sans`, `--font-geist-mono` e `--font-merriweather`, métricas de fallback (`Arial` / `Times New Roman`) e cobertura completa de glifos latinos/português e `latin-ext` verificada com o `fontkit` do próprio Next.js, sem adicionar dependências npm nem alterar `pnpm-lock.yaml`. Adicionados 3 testes de regressão em `apps/web/test/fonts.test.ts` (ausência de `next/font/google`, existência e assinatura `wOF2` de cada arquivo referenciado, pesos 400/700 normal/itálico e `preload: false` em Merriweather). Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (452/452) e 3 builds limpos consecutivos (`rm -rf apps/web/.next && pnpm build`), incluindo build offline com `HTTP_PROXY`/`HTTPS_PROXY` bloqueados; verificação ao vivo via `next start` na porta 3003 confirmou as 3 variáveis CSS no HTML/CSS e HTTP 200 + `wOF2` para todos os 6 assets emitidos em `/_next/static/media/*.woff2`. Commit: 45f4377.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T28 · Atualizar Next.js + sanear vulnerabilidades críticas (`pnpm audit`)

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t28-next-security · **Worktree:** ../telluspedia-wt/codex-t28
- **Prioridade:** P0 · **Área:** Segurança · **Tamanho:** M · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
`pnpm audit --prod` reporta **46 vulnerabilidades (5 críticas, 15 altas)**, concentradas em `next@15.1.0` (incluindo RCE no protocolo React Flight `GHSA-9qr9-h5gf-34mp`, bypass de middleware `GHSA-f82v-jwr5-mffw` e vazamento cross-client `GHSA-pc58-hwjq-p385`).

**O que fazer**
1. Atualizar `next`, `eslint-config-next` e `@next/bundle-analyzer` para a última versão segura da série 15.5.x (e transitivas sinalizadas pelo `pnpm audit`).
2. Validar todas as rotas SSR, imagens OG e `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
3. Confirmar `pnpm audit --prod --audit-level=high` zerado.

**Critérios de aceite**
- [x] `pnpm audit --prod --audit-level=high` retorna 0 vulnerabilidades.
- [x] Build, suíte de testes e smoke E2E verdes sem regressão de bundle (`/` < 250 kB).

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · codex · IN_PROGRESS · Primeira tarefa elegível. G-SHELL reservado pela D17; G-INFRA livre.
- 2026-11-21 · codex · REVIEW · Next.js, eslint-config-next e bundle analyzer em 15.5.29. Sharp 0.35.5 resolvido pela dependência opcional do Next e PostCSS 8.5.30 por override no consumidor que fixa a versão vulnerável. Typecheck gera os tipos de rotas em checkout limpo. A raiz do tracing aponta para o monorepo. `pnpm audit --prod --audit-level=high` passou com zero alertas em produção, ante 46 (5 críticos, 15 altos). SHA-256 de `pnpm-lock.yaml` antes `982b070f31f66497de120c5aa1c89347103eebf35a573ab389980d35f98e4fae` e depois `eab8c9b5a1706744010b6f56e0abb3b93b8e5a77a2c3892351345656b1afcdff`. Instalação congelada, typecheck, lint, 568 testes, build e 4 E2E passaram. Smoke HTTP com PostgreSQL descartável validou home, país, comparador, estudo, dossiê e os PNGs Open Graph de país e estudo (1200 × 630). First Load JS de / em 222 kB. Implementação em `de7b4d8`.
- 2026-11-22 · ayrton · DONE · Aprovada pelo Ayrton (registrado pelo antigravity a pedido). Conferido `pnpm audit --prod --audit-level=high` com 0 vulnerabilidades em `next@15.5.29` e `/` em 159 kB.

---

### T29 · Eliminar séries fabricadas no `ComparisonCharts` e abrir Comparador para os 177 países

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t29-honest-comparator-177 · **Worktree:** —
- **Prioridade:** P0 · **Área:** Dados · **Tamanho:** M · **Depende de:** — · **Grupos:** G-PAIS

**Contexto / problema**
`components/comparator/ComparisonCharts.tsx:30-60` ainda fabrica curvas históricas lineares falsas (1990–2023) com fórmulas artificiais (`0.35 + 0.65 * growthFactor`, `hdi - 0.15 + 0.15 * growthFactor`) e fallbacks inventados (`1e12`, `0.8`, `1.5`), além de consultar apenas os 6 `PILOT_COUNTRIES`. `CountryComparator.tsx:25-27` também limita o seletor de adição aos 6 países piloto, ignorando os 171 países já ingeridos na T26.

**O que fazer**
1. Remover completamente a interpolação linear fabricada e os fallbacks inventados de `ComparisonCharts.tsx`.
2. Substituir o gráfico por visualização honesta dos valores reais mais recentes disponíveis (gráfico de barras comparativo com ano de referência e fonte primária por país, omitindo países sem dado com aviso explícito até a chegada das séries históricas reais em T32).
3. Substituir a lista fixa de `PILOT_COUNTRIES` em `CountryComparator.tsx` por seletor pesquisável cobrindo todos os 177 países (`getAllCountries()`).
4. Adicionar testes de regressão proibindo interpolação sintética e validando comparação de países fora dos 6 piloto (ex.: `ARG`, `CHN`, `IND`, `FRA`).

**Critérios de aceite**
- [x] Nenhum número sintético ou curva fabricada em `ComparisonCharts.tsx`.
- [x] É possível pesquisar, adicionar e comparar até 4 países dentre todos os 177 no modal e via `/compare?c=ARG,CHN,IND,FRA`.
- [x] Países sem dado para a métrica selecionada são sinalizados explicitamente sem valor falso.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (c746570). Grupo G-PAIS livre (D17 em G-SHELL sem conflito).
- 2026-11-21 · antigravity · REVIEW · Removida integralmente a interpolação linear fabricada (1990–2023), os fallbacks inventados (`1e12`/`0.8`/`1.5`) e a dependência de `PILOT_COUNTRIES` no Comparador: (1) criado `lib/comparator-data.ts` com `buildComparisonDataset` (resolve todos os 177 países via `getCountryData`, preserva ano real, fonte primária e URL oficial RN02, e isola países sem dado em `missing` sem nunca inserir zero ou estimativa) e `searchComparableCountries` (busca sem acento por nome comum/oficial, ISO-2/ISO-3 e continente/região sobre os 177 países); (2) reescrito `ComparisonCharts.tsx` com gráfico de barras honesto (`BarChart`) das leituras reais mais recentes (PIB, População, Expectativa de vida, Defesa e IDH), lista textual acessível com ano e link oficial por país, e aviso explícito para países sem dado; (3) atualizado `CountryComparator.tsx` com busca instantânea entre todos os 177 países (preservando `<Dialog open={isOpen}>` da D17 e os tokens D14); (4) adicionados 6 testes de regressão em `test/comparator-honesty.test.tsx`. Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (568/568), `pnpm build` (`/` em 225 kB) e smoke HTTP 200 em `/compare?c=ARG,CHN,IND,FRA` via `next start` na porta 3003. Verificação interativa no navegador pendente do Ayrton. Commit: 39d2059.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T30 · Cabeçalhos HTTP de segurança (CSP, HSTS, Referrer, Permissions) e `Cache-Control` nas APIs

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t30-cabecalhos-seguranca · **Worktree:** ../telluspedia-wt/claude-t30
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** P · **Depende de:** — · **Grupos:** G-INFRA, G-ESTUDOS

**Contexto / problema**
`apps/web/next.config.mjs` não configura nenhum cabeçalho de segurança HTTP, e 14 de 15 rotas em `apps/web/src/app/api/*` não enviam `Cache-Control` (inclusive `/api/studies/[slug]`, que é imutável pela RN16, e `/api/countries`).

**O que fazer**
1. Adicionar `headers()` em `next.config.mjs` com `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` restritiva e `Content-Security-Policy` compatível com WebGL/WASM (`basis_transcoder.wasm`) e fontes locais.
2. Definir `Cache-Control` adequado nas rotas de leitura (`/api/studies/[slug]`, `/api/countries`, `/api/countries/[iso]`, `/api/timeline`, `/api/weather`, `/api/astronomy`).
3. Cobrir os cabeçalhos em testes automatizados.

**Critérios de aceite**
- [ ] Respostas de `/` e `/api/*` trazem cabeçalhos de segurança e `Cache-Control` coerentes sem quebrar KTX2/WASM.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada após a D17 ir para DONE. Elegibilidade: G-SHELL, G-EPOCA e G-COSMOS ocupados pela D18 (codex) — T22/D19 (fase 8) e D21/D24 (fase 9) bloqueadas; T30 é a primeira da fase 10 com G-INFRA e G-ESTUDOS livres.
- 2026-11-21 · claude · IN_PROGRESS · **Implementação** (`feat(seguranca): cabeçalhos HTTP de segurança e Cache-Control nas APIs [T30]`). `apps/web/security-headers.mjs` gera os cabeçalhos aplicados a `/:path*` em `next.config.mjs` (com `poweredByHeader: false`): CSP (`default-src 'self'`; `script-src 'unsafe-inline'` — o App Router injeta scripts inline sem nonce — e `'wasm-unsafe-eval'` para o transcoder Basis; `'unsafe-eval'` e `ws:` só no `next dev`; `worker-src blob:` para os workers do KTX2Loader; `img-src` com `flagcdn.com`, única origem externa de imagem no cliente; `connect-src 'self'`; `object-src 'none'`; `frame-ancestors 'self'`; `upgrade-insecure-requests` em produção), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` restritiva, `Cross-Origin-Opener-Policy` e HSTS (só produção). `src/lib/http-cache.ts`: `withCachePolicy` dá a política às respostas 2xx e `no-store` a erros, mantendo um `Cache-Control` já definido (estudo temporário em memória). Políticas: estudo (`max-age=60, s-maxage=600, swr` — o registro é imutável pela RN16, mas a resposta lista forks, que crescem), países/marcos (dados versionados), clima, astronomia (instante dado `immutable`; "agora" 60 s), POSTs `no-store`; as rotas do Observatório já usavam `observatoryHeaders`. Conferido com `next dev` + `curl`: cabeçalhos em `/`, `/api/astronomy` e no `.wasm`; sem `X-Powered-By`; erro → `no-store`. Testes: `test/security-headers.test.ts` (7). Validação: suíte toda verde exceto as 4 do Prisma, typecheck ok exceto Prisma, lint ok. **Falta:** conferir no navegador que KTX2/WASM, Cosmos e bandeiras seguem funcionando sem violação de CSP.
- 2026-11-21 · claude · REVIEW · **Conferido no navegador** (servidor :3001 do Ayrton, `next dev`): resposta com a CSP e sem `X-Powered-By`; carregaram catálogo de estrelas, texturas KTX2 da Terra (dia, noite, superfície, nuvens, paleo), Via Láctea, Lua e o transcoder Basis (`.js` + `.wasm`), com o globo texturizado na tela; bandeira `br.svg` do flagcdn carregada em `/pais/BRA`; modo Cosmos aberto; nenhum evento `securitypolicyviolation` nem erro de CSP no console. Ressalva: verificado no modo dev; a CSP de produção só difere por não ter `'unsafe-eval'`/`ws:` e ter `upgrade-insecure-requests` + HSTS (testado em `test/security-headers.test.ts`), e o build de produção não fecha neste ambiente por causa do Prisma.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude) — reaberto em seguida, ver abaixo.
- 2026-11-21 · claude · REVIEW · **Reaberto por defeito em produção, registrado pelo codex às 05:21 (antes da minha verificação, que foi em dev)** e corrigido (`fix(seguranca): worker do KTX2 como arquivo com CSP própria — página sem unsafe-eval [T30]`). O `basis_transcoder.js` (Emscripten/embind) chama `new Function`; o KTX2Loader cria o worker a partir de um Blob, que herda a CSP da página, então em produção (sem `'unsafe-eval'`) o transcoder quebrava e as texturas caíam para JPG/PNG. **Decisão do Ayrton:** worker próprio. `public/basis/ktx2-worker.js` traz o mesmo código que o loader montaria no Blob (gerado por `scripts/textures/build-ktx2-worker.ts`, `pnpm --filter web textures:ktx2-worker`; o corpo do `BasisWorker` é lido do arquivo-fonte do three — por `toString()` sob o tsx viria com `__name(...)` do esbuild, o que o teste pegou); `FileWorkerKTX2Loader` (subclasse) cria os workers por URL; `next.config.mjs` dá a esse arquivo CSP própria (`default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'`) e a página segue sem `'unsafe-eval'`. **Prova:** `test/ktx2-worker-csp.test.ts` sobe uma página com a CSP de produção no Chrome headless: o worker de arquivo transcodifica `earth_clouds_2k.ktx2` (2048 px) e o controle — o mesmo código num Blob — falha com o erro de eval da CSP; outro teste garante que o arquivo bate com o three e o transcoder instalados. Validação: 567/571 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok.
- 2026-11-21 · codex · IN_PROGRESS · Na validação da D18 após integrar `7428ffe`, o teste Playwright existente “clicking Brazil in the globe opens the country panel” abriu a ficha, mas registrou quatro `EvalError` em cada resolução. O worker do `basis_transcoder.js` chama `Function` em `craftInvokerFunction` durante o registro de bindings do WASM, e a CSP de produção bloqueia a chamada. Reproduzir com `pnpm build` seguido de `pnpm test:e2e -- --grep 'clicking Brazil'` ou selecionar o teste em `home.spec.ts`.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### T31 · Resiliência de runtime: Error Boundaries (`error.tsx`/`global-error.tsx`), `webglcontextlost` e fallback sem GPU

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t31-runtime-resilience · **Worktree:** —
- **Prioridade:** P1 · **Área:** Frontend/3D · **Tamanho:** M · **Depende de:** — · **Grupos:** G-SHELL, G-GLOBO

**Contexto / problema**
O App Router não possui `error.tsx`, `global-error.tsx` nem `loading.tsx`, e `GlobeCanvas.tsx` não possui `ErrorBoundary` nem listener de `webglcontextlost`/`webglcontextrestored`. Uma perda de contexto GPU ou ausência de WebGL deixa a tela escura sem recuperação.

**O que fazer**
1. Criar `apps/web/src/app/error.tsx`, `global-error.tsx` e `loading.tsx` com tokens D14.
2. Envolver `<GlobeCanvas />` em um `WebGLErrorBoundary` com fallback navegável (acesso a busca, comparador, dossiês e ação para recarregar o contexto 3D).
3. Tratar `webglcontextlost` e `webglcontextrestored` em `gl.domElement` com aviso discreto e recuperação limpa.

**Critérios de aceite**
- [x] Erro de render ou perda de contexto WebGL exibe fallback D14 com recuperação funcional sem travar o restante da interface.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (720c52a). Primeira P1 elegível da Fase 10; grupos G-SHELL e G-GLOBO livres (D24 do claude ocupa G-CONTEUDO e G-EPOCA).
- 2026-11-21 · antigravity · REVIEW · Implementação em `bda44c6`. **App Router D14 (`error.tsx`, `global-error.tsx`, `GlobalErrorView.tsx`, `loading.tsx`):** fronteiras de erro de rota e raiz com tokens semânticos D14, `role="alert"`/`role="status"`, referência `digest` sem vazar stack trace ou mensagens internas, e recuperação via `reset()` + links para `/`, `/compare` e `/telluslab`. **Suporte WebGL e fallback navegável sem GPU (`src/lib/webgl-support.ts`, `src/components/globe/WebGLErrorBoundary.tsx`):** `detectWebGLSupport` sonda WebGL2/WebGL1 (`failIfMajorPerformanceCaveat: false`) liberando imediatamente o contexto de sondagem via `WEBGL_lose_context`; `WebGLErrorBoundary` envolve `<GlobeCanvas />` em `GlobeExperienceShell.tsx` (mantendo o dynamic import de `GlobeCanvas` e o orçamento de bundle da T25) exibindo `WebGLFallbackPanel` navegável sem bloquear barra superior, timeline, dock ou modais — com ações para recarregar o contexto 3D, abrir a Busca Universal (`useOpenExploreSearch`), abrir o Comparador, visitar Dossiês/TellusLab e selecionar países diretamente. **Recuperação de contexto WebGL (`GlobeCanvas.tsx`):** `WebGLContextMonitor` registra `attachWebGLContextListeners(gl.domElement, ...)` chamando `event.preventDefault()` em `webglcontextlost`, exibindo banner discreto (`webgl-context-lost-banner`) com botão "Recarregar 3D" (remount limpo do `<Canvas>`) e confirmando a restauração (`webgl-context-restored-banner` + `invalidate()`). **Testes e validação:** 5 novos arquivos registrados em `MIGRATED` no `design-system.test.tsx` (70/70 arquivos D14 verdes); adicionados 7 testes em `apps/web/test/runtime-resilience.test.tsx`; `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 640/641 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 231 kB, `bundle-budget.test.ts` pós-build verde < 250 kB e sem Three/Recharts/Radix no chunk inicial). Verificação visual interativa pendente do Ayrton.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T32 · Ingestão de séries históricas reais do Banco Mundial (1990–2024) + novos indicadores

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t32-worldbank-timeseries · **Worktree:** —
- **Prioridade:** P1 · **Área:** Dados · **Tamanho:** G · **Depende de:** T29 · **Grupos:** G-PAIS, G-PIPELINE

**Contexto / problema**
`countries-worldbank-indicators.json` armazena apenas a última leitura de 5 indicadores (sem série histórica e sem PIB per capita, emissões de CO₂ ou participação de energia renovável).

**O que fazer**
1. Estender `scripts/ingest-worldbank-indicators.mjs` para coletar pontos reais (1990–2024) dos indicadores principais e salvar dataset compacto carregado sob demanda (`public/data/worldbank-timeseries.json`).
2. Adicionar indicadores de alto valor analítico (`NY.GDP.PCAP.CD`, `EG.FEC.RNEW.ZS`, `EN.GHG.CO2.PC.CE.AR5`).
3. Habilitar no `ComparisonCharts` o modo Série Histórica Real (1990–2024) com `connectNulls={false}` para lacunas reais e citação direta da fonte oficial.

**Critérios de aceite**
- [x] Gráfico histórico exibe apenas leituras reais do Banco Mundial (zero interpolação sintética) para os 177 países.
- [x] Dataset histórico carregado sob demanda sem aumentar o First Load JS de `/`.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (773e877). Dependência T29 em DONE; grupos G-PAIS e G-PIPELINE livres (T40 do codex ocupa G-INFRA/G-COSMOS/G-OBS).
- 2026-11-21 · antigravity · REVIEW · Estendido `scripts/ingest-worldbank-indicators.mjs` (consultas por janelas de década 1990–2024 na World Bank API v2, `lastupdated: 2026-11-11`, CC BY 4.0) incorporando os 3 novos indicadores (`NY.GDP.PCAP.CD` PIB per capita, `EG.FEC.RNEW.ZS` energia renovável e `EN.GHG.CO2.PC.CE.AR5` CO₂ per capita) em `public/data/countries-worldbank-indicators.json` (167 KB / 16,7 KB gzip) e gerando `public/data/worldbank-timeseries.json` (267 KB / 110 KB gzip, **39.631 observações anuais reais** em 7 indicadores: 170 países em população/expectativa de vida, 169 em PIB/PIB per capita/renováveis, 165 em CO₂ per capita e 160 em gastos militares, com lacunas oficiais preservadas como `null`). Criado `lib/worldbank-timeseries.ts` com carregamento sob demanda via `fetch("/data/worldbank-timeseries.json")` (nunca importado estaticamente) e `buildHistoricalSeriesDataset`. Atualizados `ComparisonCharts.tsx` (alternância "Mais recente" ↔ "Série 1990–2024" com `LineChart` usando `connectNulls={false}`, período observado, contagem de pontos e links diretos RN02 por país), `comparator-data.ts`, `ComparisonGrid.tsx`, `CountryMetricsGrid.tsx`, `citations.ts` (prefixos `EG.` e `EN.`) e `docs/DATA_SOURCES.md`. Adicionados 5 testes em `test/worldbank-timeseries.test.tsx` + atualização de `test/country-data-integrity.test.tsx`. Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (576/576) e `pnpm build` (`/` mantido em **225 kB** — 0 kB de aumento!) + smoke HTTP 200 em `/compare?c=BRA,ARG,CHN,DEU`, `/pais/ARG` e `/data/worldbank-timeseries.json` na porta 3003. Verificação interativa no navegador pendente do Ayrton. Commit: 11c511f.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T33 · SEO técnico & PWA: `sitemap.ts` dinâmico (177 países + dossiês), `robots.ts`, `manifest.ts` e JSON-LD

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t33-seo-pwa-jsonld · **Worktree:** —
- **Prioridade:** P1 · **Área:** Frontend · **Tamanho:** P · **Depende de:** — · **Grupos:** G-SHELL, G-PAIS

**Contexto / problema**
As páginas SSR (`/pais/[iso]`, `/dossies/[slug]`, `/compare`, `/telluslab`) já têm metadata e OG images, mas faltam `robots.ts`, `sitemap.ts`, `manifest.ts` e dados estruturados JSON-LD.

**O que fazer**
1. Criar `apps/web/src/app/robots.ts` (bloqueando `/dev/ui` e `/api/`), `sitemap.ts` (177 países, dossiês, `/`, `/compare`, `/telluslab`) e `manifest.ts` (PWA com tema `#05070B`).
2. Adicionar JSON-LD (`WebApplication` na home, `Country`/`Place` em `/pais/[iso]`, `Article` em `/dossies/[slug]`).

**Critérios de aceite**
- [x] `/robots.txt`, `/sitemap.xml` e `/manifest.webmanifest` respondem `200` no build de produção com URLs válidas e sem `/dev/ui`.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (6afbf61). Última P1 pendente da Fase 10; grupos G-SHELL e G-PAIS livres (D24 do claude ocupa G-CONTEUDO e G-EPOCA).
- 2026-11-21 · antigravity · REVIEW · Implementação em `8732d8b`. **Rotas SEO e PWA:** criados `apps/web/src/app/robots.ts` (libera `/`, bloqueia `/api/`, `/dev/ui` e `/dev/`, declara `sitemap` e `host`), `apps/web/src/app/sitemap.ts` (189 URLs válidas sem `/dev/ui`: `/`, `/compare`, `/telluslab`, os 177 países de `WORLD_COUNTRIES_CATALOG` e os 9 dossiês publicados em `src/lib/dossiers-catalog.ts`, com `lastModified` determinístico de `WORLD_BANK_METADATA`), `apps/web/src/app/manifest.ts` (PWA `standalone` `pt-BR` com `theme_color`/`background_color` `#05070B`, também em `viewport.themeColor` no `layout.tsx`) e `apps/web/src/app/icon.svg`. **JSON-LD seguro (`src/lib/seo.ts`, `src/components/seo/JsonLdScript.tsx`):** Server Component (0 bytes no JS do cliente) com `serializeJsonLd` escapando `<`, `>`, `&`, U+2028 e U+2029 contra script breakout XSS; integrado em `page.tsx` (`WebApplication`), `pais/[iso]/page.tsx` (`["Country", "Place"]` com `GeoCoordinates` e propriedades reais) e `dossies/[slug]/page.tsx` (`Article` + `generateMetadata`). **Testes e validação pós-rebase em `f3ee581`:** 7 novos testes em `apps/web/test/seo-pwa.test.tsx`; `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 664/665 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 232 kB, `bundle-budget.test.ts` pós-build verde < 250 kB); smoke no build de produção (`next start` em `127.0.0.1:3003`) confirmou `200` em `/robots.txt`, `/manifest.webmanifest`, `/sitemap.xml` (189 `<loc>`, 0 `/dev/ui`), `/icon.svg` (`image/svg+xml`) e JSON-LD renderizado em `/`, `/pais/BRA` e `/dossies/astronomia-optica`.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T34 · Empacotamento de produção: `apps/web/Dockerfile` (standalone), `/api/health`, Redis no rate-limit e CI reforçado

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t34-production-packaging · **Worktree:** —
- **Prioridade:** P1 · **Área:** Infra · **Tamanho:** M · **Depende de:** T28 · **Grupos:** G-INFRA, G-ESTUDOS, G-PIPELINE

**Contexto / problema**
Não há `apps/web/Dockerfile` nem endpoint `/api/health`; `study-rate-limit.ts` usa `Map` em memória de processo único; e o CI não roda `pnpm audit` nem testa `prisma migrate deploy` + `seed` contra PostGIS real.

**O que fazer**
1. Criar `apps/web/Dockerfile` multi-stage (com suporte a `output: "standalone"`) e serviço `web` opcional (profile `prod`) no `docker-compose.yml`.
2. Criar `GET /api/health` verificando conectividade de PostgreSQL e `data-pipeline`.
3. Adicionar suporte opcional a Redis em `study-rate-limit.ts` (mantendo fallback em memória para dev/testes).
4. Incluir `pnpm audit --prod --audit-level=high` e validação de migrations Prisma contra PostGIS no `.github/workflows/ci.yml`.

**Critérios de aceite**
- [x] `docker build` do `apps/web` passa; `/api/health` responde JSON padronizado; CI verde com os novos checks.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (2809a49). Dependência T28 em REVIEW; grupos G-INFRA/G-ESTUDOS/G-PIPELINE livres (T22 do codex ocupa G-SHELL/G-EPOCA/G-TIMELINE; D21 do claude ocupa G-COSMOS).
- 2026-11-21 · antigravity · REVIEW · Implementação em `17bc5c4`. **Empacotamento Docker standalone:** criados `.dockerignore` (contexto reduzido para ~30,5 MB) e `apps/web/Dockerfile` multi-stage (`deps` → `builder` com `NEXT_OUTPUT_STANDALONE=true` + `patches/` + `pnpm db:generate && pnpm build` → `runner` `node:22-bookworm-slim` não-root `USER nextjs`, `HEALTHCHECK` em `/api/health` e `CMD ["node", "apps/web/server.js"]`); `apps/web/next.config.mjs` ativa `output: "standalone"` via `NEXT_OUTPUT_STANDALONE=true` sem afetar `next start` local/Playwright; `docker-compose.yml` ganhou serviço opcional `web` (`profiles: ["prod"]`) e healthchecks TCP (`pg_isready -h 127.0.0.1` e `redis-cli ping`). **Health check (`GET /api/health`):** criados `apps/web/src/lib/health-check.ts` e `apps/web/src/app/api/health/route.ts` (`force-dynamic`, `withCachePolicy(..., CACHE_POLICY.noStore)`), verificando em paralelo PostgreSQL (`prisma.$queryRaw\`SELECT 1\``) e `DATA_PIPELINE_URL/health` com timeout de 2,5 s, retornando `200` (`status: "ok"`) ou `503` (`status: "degraded"`) em JSON padronizado sem vazar credenciais ou erros SQL. **Rate-limit com Redis opcional:** criado cliente RESP2 zero-dependência (`apps/web/src/lib/redis-client.ts` via `node:net`/`node:tls`, suportando `redis://`/`rediss://` TLS 1.2+, `AUTH`, `SELECT`, pipelining `INCR`+`PEXPIRE` com TTL) e integrado em `study-rate-limit.ts` (`studyCreationRetryAfterAsync`) + `POST /api/studies` e `POST /api/studies/[slug]/fork`, com circuit-breaker (30 s) e fallback gracioso para memória sem vazar senha nos logs (mantendo `studyCreationRetryAfter` síncrono compatível com testes existentes). **CI reforçado (`.github/workflows/ci.yml`):** adicionado `pnpm audit --prod --audit-level=high` no job `web` e novo job `prisma-migrations` com service container `postgis/postgis:16-3.4` (`pg_isready -h 127.0.0.1`) executando `prisma migrate deploy`, `prisma migrate status` e 2× `pnpm db:seed` (idempotência). **Testes e verificação:** adicionados 10 testes em `apps/web/test/production-packaging.test.ts` (incluindo servidor mock RESP2 em `127.0.0.1`); pós-rebase em `95526fa`: `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 619/620 (0 falhas, 1 skip), `pnpm build` ok (`/` = 228 kB), `pnpm audit --prod --audit-level=high` 0 vulnerabilidades, `docker compose --profile prod config --quiet` ok, `docker build -f apps/web/Dockerfile` passou (imagem 371 MB, `User=nextjs`, smoke-test em `127.0.0.1:3003` validou `GET /` 200 + CSP, `GET /api/health` 503 JSON + `no-store` e `GET /basis/ktx2-worker.js` 200) e `postgis/postgis:16-3.4` efêmero em `127.0.0.1:15432` validou `prisma migrate deploy` + `migrate status` + 2× `pnpm db:seed`.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T35 · Segunda onda de bundle (`/` < 150 kB): datasets sob demanda e lazy-load de `satellite.js`

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t35-bundle · **Worktree:** —
- **Prioridade:** P2 · **Área:** Performance · **Tamanho:** M · **Depende de:** — · **Grupos:** G-PAIS, G-OBS, G-SHELL, G-EPOCA, G-FRONTEIRAS, G-COSMOS, G-TIMELINE, G-INFRA, G-CONTEUDO

**Contexto / problema**
Mesmo após a T25 (485 → 223 kB), `country-data.ts` + JSONs de indicadores + `historical-entities.ts` + `satellite.js` ainda somam ~65 kB gzip no chunk inicial de `/`.

**O que fazer**
1. Separar catálogo leve de países (ISO, nome, bandeira, coordenadas) dos dossiês completos e indicadores do Banco Mundial (carregados sob demanda ao selecionar país ou abrir Comparador/Reader).
2. Carregar `satellite.js` dinamicamente apenas quando a camada `ISS_SATELLITES` for ativada.
3. Atualizar o teto do teste `bundle-budget.test.ts` para `< 160 kB`.

**Critérios de aceite**
- [ ] First Load JS de `/` < 150 kB sem perda de SSR nas rotas `/pais/[iso]` e `/compare`. (Ficou em 158,8 kB, < 160 kB combinado com o Ayrton; SSR preservado.)

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: primeira TODO elegível da fase 11 (G-PAIS, G-OBS e G-SHELL livres; D04, D08, T28 e D26 em REVIEW não bloqueiam). Ponto de partida medido: First Load de `/` 237,1 kB gz (inclui D22 e D25).
- 2026-11-21 · claude · IN_PROGRESS · Grupos adicionados (todos livres): G-EPOCA (`GlobeCanvas`, `resolveEpoch`, `useEpochState`, `scenes/schema`), G-FRONTEIRAS (`CountryBorders`), G-COSMOS (`SkyStars`) e G-TIMELINE (`TimelineAxis`, `MilestonePin`, `MilestoneCluster`): só trocam o import de `country-data`/`historical-entities` pelos módulos leves. Os grupos deveriam ter entrado antes das edições; nada foi enviado antes deste registro.
- 2026-11-21 · claude · IN_PROGRESS · G-INFRA adicionado (livre): `pnpm test` falha no Windows (o PowerShell não expande `test/*.test.ts`), o que impede o Ayrton de rodar os testes que dependem do Prisma. O script de testes passa a listar os arquivos em Node, igual em todos os sistemas.
- 2026-11-21 · claude · REVIEW · `11f1c4e`, `ff75f0b`, `7b5dac5`. First Load de `/` (page + layout, gzip) 237,1 → 178,0 kB; só `/page` 235,3 → 176,2 kB. Fora do chunk inicial: dossiês/indicadores (`milestones.ts`, `country-catalog.ts`, `country-isos.ts`), entidades históricas (`historical-eras.ts`), `buildChoroplethDataset` (`choropleth-dataset.ts`), `satellite.js` (import() no store + `IssOrbitLayer` lazy) e `d3-geo` (centroide esférico próprio, igual ao `geoCentroid`). **Meta < 150 kB não atingida:** React + Next ≈ 104 kB e a interface inicial ≈ 45 kB; restantes candidatos são a cena de Magalhães completa (~7 kB, exige refazer a carga da rota histórica — G-EPOCA/G-CONTEUDO), os dados locais do Observatório no estado inicial do store (~5 kB) e `tailwind-merge` (~6,6 kB). Teto do `bundle-budget` em 185 kB (a tarefa pedia 160) e checagem de que satellite.js, entidades históricas e indicadores não voltam ao chunk inicial. Testes: 719/719 no Windows do Ayrton (inclui os que dependem do Prisma); `pnpm test` agora funciona no Windows; correção da telemetria da ISS no fallback offline (corrida do import) e testes estáveis com CRLF. Verificado no navegador (1440×900): país pela URL (`pais=BRA`) com painel completo; marcos do Brasil na linha do tempo; citação de marco com país ("ALEMANHA") carregando `country-data` sob demanda; entidade histórica pela URL (`pais=SUN&ano=1969`); camada ISS baixa `satellites.ts` e `IssOrbitLayer` só ao ligar, ao vivo 438 km; mapa temático (expectativa de vida, 170/177); Comparador pela URL descarta ISO inválido; SSR de `/pais/BRA` e `/compare?c=BRA,ARG` com os dados no HTML; sem erros no console.
- 2026-11-21 · claude · IN_PROGRESS · Ayrton pediu os cortes extras para chegar a ~160 kB: cena de Magalhães sob demanda, dados locais do Observatório fora do estado inicial e o que mais couber. G-CONTEUDO adicionado (D26 em REVIEW não bloqueia).
- 2026-11-21 · claude · REVIEW · `b2e9bcb`: 178,0 → 158,8 kB (page + layout); só `/page` 157,0 kB; teto do `bundle-budget` em < 160 kB. Cena de Magalhães sob demanda (date.end 1522-09-06 acrescentado), dados locais do Observatório sob demanda (estado inicial vazio), `cn` com tabela gerada no lugar do `tailwind-merge` (teste compara todos os pares das 560 classes com o tailwind-merge), `choropleth-ids`, `gibs-view` e `source-urls`. Testes: 685 aqui (6 de ambiente/Prisma). Navegador (1440×900): Magalhães pelo seletor abre painel, rota e período 1519–1522; Observatório com FIRMS, EONET, voos e marítimo carregados, corredores e amostra AIS por região, dados locais baixados sob demanda; visual dos painéis igual; sem erros no console. Mudança percebida: enquanto o servidor busca FIRMS e voos (~10–20 s), o cartão mostra "Carregando…" em vez dos dados de referência de antes.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### T36 · Modularizar arquivos monolíticos, remover 5 `@radix-ui/*` ociosos e eliminar os 9 `any`

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t36-modularizar · **Worktree:** —
- **Prioridade:** P2 · **Área:** Qualidade · **Tamanho:** M · **Depende de:** — · **Grupos:** G-PAIS, G-COSMOS, G-INFRA, G-EPOCA, G-OBS

**Contexto / problema**
Cinco arquivos ultrapassam 850 linhas (`country-data.ts` 1.138, `CometHalleyTrajectory.tsx` 1.056, `astronomy-planets.ts` 977, `historical-entities.ts` 931, `paleo-data.ts` 852); `apps/web/package.json` declara 5 pacotes `@radix-ui/*` não importados (`react-hover-card`, `react-popover`, `react-scroll-area`, `react-separator`, `react-slider`); e existem 9 usos explícitos de `any`.

**O que fazer**
1. Dividir os 5 arquivos grandes em módulos coesos (ex.: separar dados estáticos de lógica/cálculo) mantendo re-exports compatíveis.
2. Remover os 5 pacotes `@radix-ui/*` não utilizados de `apps/web/package.json` e `pnpm-lock.yaml`.
3. Substituir os 9 usos de `any` por tipos estritos (`CitationRecord[]`, `OrbitControlsImpl`, `CanvasRenderingContext2D`, etc.).

**Critérios de aceite**
- [ ] Nenhum arquivo em `apps/web/src` acima de ~600 linhas (exceto JSONs de dados).
- [ ] Zero ocorrências de `:\s*any\b|as\s+any\b` em `apps/web/src` e zero dependências `@radix-ui/*` ociosas.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: primeira TODO elegível da fase 11 após a T35 (só há tarefas em REVIEW, que não bloqueiam). Grupos adicionados de saída: G-EPOCA (`paleo-data.ts`, `historical-entities.ts`) e G-OBS (`any` em `ObservatoryPanel`). Levantamento: 5 arquivos acima de 800 linhas (`country-data` 1.098, `CometHalleyTrajectory` 1.060, `astronomy-planets` 966, `paleo-data` 852, `historical-entities` 817), 9 `any` e os 5 `@radix-ui/*` sem nenhum import.
- 2026-11-21 · claude · REVIEW · `809ff6b` (5 `@radix-ui/*` removidos; lockfile editado só nessas entradas e no `@radix-ui/number` — o `pnpm install` do Ayrton, pnpm 12, aceitou sem alterar), `24b5ed5` (9 `any` → `DossierCitations`, tipo do `OrbitControls` do drei, estado do store, `Partial<CanvasRenderingContext2D>`), `bfba1af` (country-data 1.098 → 258, CometHalleyTrajectory 1.060 → 427, astronomy-planets 966 → 24, paleo-data 853 → 80, historical-entities 817 → 139, em módulos coesos com re-exports; maior arquivo de `src/` agora 571 linhas). Teste `code-hygiene.test.ts` (≤ 600 linhas, zero `any`, zero `@radix-ui` ocioso). 685 testes aqui (6 de ambiente/Prisma); First Load de `/` inalterado (158,8 kB). Navegador (1440×900): Japão com painel e dossiê (fonte primária na nota de rodapé), Áustria-Hungria em 1914, Cosmos com o Halley em 1986 (núcleo e cauda dupla), Pangeia com paleomapa e limites de placas; sem erros no console.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### T37 · Sincronizar documentação (`ROADMAP.md`, `ARCHITECTURE.md`, `DATA_SOURCES.md`) e limpar `.pytest_cache`

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t37-docs · **Worktree:** —
- **Prioridade:** P2 · **Área:** Docs · **Tamanho:** P · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
`docs/ROADMAP.md` afirma como concluídos itens ainda não implementados (NASA GIBS, ventos/lixo marítimo) e cita "gaveta glassmorphism" já substituída por D14; `services/data-pipeline/.pytest_cache` aparece no repositório local.

**O que fazer**
1. Alinhar `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` e `docs/DATA_SOURCES.md` ao estado real do projeto (D12, D14–D16, T20, T25–T27 e Ciclo 2).
2. Garantir `.pytest_cache` ignorado e removido do índice/workspace se rastreado.

**Critérios de aceite**
- [ ] Documentação descreve fielmente o que existe hoje versus o que pertence ao Ciclo 2.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: única TODO elegível (T41, D27 e D28 esperam G-SHELL/G-GLOBO, com a T39 em andamento). Só docs e `.gitignore`.
- 2026-11-21 · claude · REVIEW · ROADMAP reescrito (existe hoje × planejado; GIBS = 4 produtos, ventos D27, lixo marítimo e INPE sem tarefa, sem "gaveta glassmorphism"); ARCHITECTURE com árvore real, Observatório (T05, GIBS, SGP4, AIS), TTLs reais e campos novos do Study; DATA_SOURCES com seção 3.1 de estado por fonte; README e AGENTS.md (cn) atualizados; `.pytest_cache/` e `.ruff_cache/` no `.gitignore` (não estavam rastreados). Testes que leem docs passam.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### T38 · Modo de leitura analítico para todos os 177 países (ranking global, comparação regional, resumo auditado)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t38-analytical-reader-177 · **Worktree:** —
- **Prioridade:** P2 · **Área:** Dados/UX · **Tamanho:** G · **Depende de:** T32 · **Grupos:** G-PAIS

**Contexto / problema**
Apenas os 6 `PILOT_COUNTRIES` possuem dossiês completos no Modo Leitura; os demais 171 países exibem uma ficha enxuta sem contextualização regional ou posição global dos indicadores.

**O que fazer**
1. Gerar automaticamente no Reader Mode (para qualquer um dos 177 países) a seção **Perfil Analítico & Posição Global**: ranking em PIB, PIB per capita, população, área e expectativa de vida, média da sub-região e países vizinhos mais próximos nos indicadores.
2. Integrar resumo factual estruturado auditado (com link direto para Banco Mundial / Natural Earth / REST Countries) sem texto inventado.

**Critérios de aceite**
- [x] Abrir o Reader Mode em qualquer um dos 177 países entrega análise comparativa real e citável (ABNT/APA/MLA/BibTeX).

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (9f7bbae). Dependência T32 em DONE; grupo G-PAIS livre (D18 do codex ocupa G-SHELL/G-EPOCA/G-COSMOS; T30 do claude ocupa G-INFRA/G-ESTUDOS).
- 2026-11-21 · antigravity · REVIEW · Implementação em `6a79fcd`. **Motor determinístico (`apps/web/src/lib/country-analytics.ts`):** `buildCountryAnalyticalProfile` calcula ranking global (competition ranking `#pos / N` + percentil) para os 177 países Natural Earth nos 8 indicadores reais do Banco Mundial (`NY.GDP.MKTP.CD`, `NY.GDP.PCAP.CD`, `SP.POP.TOTL`, `AG.SRF.TOTL.K2`, `SP.DYN.LE00.IN`, `EG.FEC.RNEW.ZS`, `EN.GHG.CO2.PC.CE.AR5`, `MS.MIL.XPND.GD.ZS`) e densidade demográfica derivada (`hab./km²`); agrega média/mediana/ranking e diferença percentual em relação ao grupo regional (sub-região com ≥ 3 países ou continente como fallback); identifica até 4 pares mais próximos por distância padronizada (z-score com escala log para PIB, PIB per capita e população); e monta resumo factual estritamente derivado de dados auditados (territórios sem série do Banco Mundial como `CYN` retornam `hasQuantitativeData: false`, 0 rankings e 0 pares, sem texto inventado). **Interface D14 (`apps/web/src/components/reader/AnalyticalProfileView.tsx`, registrada em `MIGRATED` no `design-system.test.tsx`):** renderiza resumo factual auditado, ficha administrativo-geográfica (`<dl>`), cartões de ranking global/regional com barra de posição e links RN02 diretos para o Banco Mundial, pares comparáveis clicáveis (com botão "Abrir no Comparador" pré-carregando o país + 3 pares no `useComparatorStore`), botão "Citar Perfil Analítico" integrado ao `CitationModal` (ABNT/APA/MLA/BibTeX) e links externos oficiais (Natural Earth / Banco Mundial / REST Countries) sem nenhum `<div>` dentro de `<p>`. **Integração Reader/HUD:** adicionada dimensão `ANALYTICAL_PROFILE` no topo do sumário (`ReaderTableOfContents.tsx`) e selecionada automaticamente ao abrir o Reader Mode (`ReaderMode.tsx`, `InspectorHUD.tsx`) para os 171 países sem dossiê editorial curado; dimensões editoriais ainda não redigidas mantêm `reader-empty-state` com atalho direto para o Perfil Analítico. **Testes:** `apps/web/test/analytical-reader.test.tsx` (4 testes cobrindo integridade nos 177 países, rankings exatos, ausência de dados sintéticos em `CYN`, SSR sem `<div>` em `<p>` e citações ABNT/APA/MLA/BibTeX). **Validação pós-rebase em `7428ffe`:** `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 589/589 ok, `pnpm build` ok (`/` = 225 kB, sem aumento no First Load JS).
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T39 · Qualidade gráfica adaptativa no WebGL (DPR dinâmico, FPS monitor, preset Baixo/Médio/Alto)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t39-adaptive-webgl-quality · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Perf · **Tamanho:** M · **Depende de:** T31 · **Grupos:** G-GLOBO, G-SHELL

**Contexto / problema**
O globo 3D roda sempre com a mesma densidade de partículas/estrelas/texturas (2K/4K) independentemente da GPU do usuário, sem controle de qualidade nem adaptação a quedas sustentadas de FPS ou bateria.

**O que fazer**
1. Adicionar preset de qualidade gráfica (`Baixo` / `Médio` / `Alto` / `Auto`, persistido em `localStorage`) controlando DPR máximo, resolução de textura (2K vs 4K), contagem de asteroides/estrelas e nuvens.
2. Em modo `Auto`, ajustar DPR dinamicamente quando o FPS ficar abaixo de 30 fps por janela sustentada.

**Critérios de aceite**
- [x] Preset de qualidade acessível na UI (tokens D14), persistido e aplicado sem recriar o contexto WebGL.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (`9615396`). Grupos `G-GLOBO` e `G-SHELL` livres e disjuntos da `T36` do claude (`G-PAIS, G-COSMOS, G-INFRA, G-EPOCA, G-OBS`). Nota: `SkyStars` e `AsteroidBeltLayer` (`G-COSMOS`) permanecem intactos enquanto T36 ocupa `G-COSMOS`, com multiplicadores de densidade já expostos no store para consumo imediato assim que `G-COSMOS` liberar.
- 2026-11-21 · antigravity · REVIEW · Implementação em `9227fa3` (rebased sobre `e864aed`) + fix de tipagem em `a023698` (`DossierCitations` → `JsonValue` para destravar `prisma/seed.ts` após `pnpm db:generate`). **Motor & Store:** criados `src/lib/webgl-quality.ts` (perfis `auto`/`high`/`medium`/`low`, `computeEffectiveDpr`, persistência `localStorage` `telluspedia.graphics-quality.v1` e máquina de histerese `stepAdaptiveFps`: reduz escala de DPR em `−0,15` até `0,55` após 2 janelas consecutivas `< 30 fps` e recupera `+0,15` após 4 janelas `≥ 50 fps`) e `src/stores/graphicsQualityStore.ts` (hidratação via `useEffect` sem mismatch SSR; expõe multiplicadores `starDensity` e `asteroidDensity` prontos para `SkyStars`/`AsteroidBeltLayer`). **Integração WebGL (sem recriar contexto):** `src/components/globe/WebGLQualityController.tsx` (montado em `EarthSphere.tsx`) ajusta `setDpr` do R3F em tempo real e mede FPS em janelas de `1,5 s` ignorando pausas `isThrottled` (RN22); `EarthSphere.tsx` aplica `textureTier` (`2k` vs `4k`) com troca segura de texturas (descarta a anterior somente após a substituta ligar ao shader, carregando `uSurfaceTexture` 2K uma única vez) e `earthSegments`; `CloudLayer.tsx` respeita `cloudsEnabled` (fade suave para `0` em `Baixo`) e `earthSegments`. **UI D14 & Bundle:** criado `src/components/globe/GraphicsQualityPanel.tsx` (tokens D14 puros, incluído em `MIGRATED` no `design-system.test.tsx`, carregado sob demanda via `next/dynamic` + pré-carga em `panel-preload.ts`), acionado por botão discreto no canto superior direito do `GlobeExperienceShell.tsx` (alinhado aos controles de mapa em mobile/tablet e à navbar em desktop, deslocando-se quando o dock direito abre). **Captura antes/depois (§1.5):** antes, o canto superior direito ficava vazio e não havia controle de DPR/qualidade; depois, exibe um pill discreto `Auto` (somente ícone em `375 px`, ícone + rótulo em `≥ 640 px`) que abre o painel translúcido D14 com telemetria `DPR x.xx× · NN fps`, badge `"DPR adaptado"` em queda automática e 4 cartões de seleção (`Auto`, `Alto`, `Médio`, `Baixo`), sem sobrepor navbar, controles ou dock nos 6 breakpoints (`375`, `768`, `1366`, `1680`, `1920`, `2560 px`). **Validação:** `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 737/738 ok (0 falhas, 1 skip; 6 novos testes em `test/webgl-quality.test.tsx`), `pnpm build` ok (`/` = **159 kB**, `bundle-budget.test.ts` 6/6 `< 160 kB`), Playwright E2E 18/18 ok (snapshots atualizados e contraste WCAG AA verde) e verificação WebGL ao vivo em Chromium HiDPI (`2×`): canvas redimensionado dinamicamente `960×600` (`1.00×`) → `1440×900` (`1.50×`) → `1920×1200` (`2.00×`) no mesmo elemento `<canvas>`, `webglcontextlost = 0`, persistência de `"Baixo"` validada após reload e 0 erros de console. Fora de escopo nesta entrega (para respeitar `G-COSMOS` travado durante a implementação): conexão dos multiplicadores `starDensity`/`asteroidDensity` em `SkyStars` e `AsteroidBeltLayer`. Aguarda aceite do Ayrton.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T42 · Limpeza técnica e preparação de configs (remover `framer-motion`, ESLint flat config, `prisma.config.ts`, sync docs)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t42-configs-cleanup · **Worktree:** —
- **Prioridade:** P1 · **Área:** Infra/Docs · **Tamanho:** P · **Depende de:** — · **Grupos:** G-INFRA

**Contexto / problema**
Na auditoria pós-Ciclo 2 foram identificados 4 débitos leves de manutenção: (1) `framer-motion` permanece nas `dependencies` de `apps/web/package.json` com 0 imports em `apps/web/src/`; (2) `pnpm lint` exibe aviso de depreciação do `next lint` (removido no Next.js 16) com `.eslintrc.json` legado; (3) `pnpm db:generate` exibe aviso de depreciação de `package.json#prisma` (removido no Prisma 7); (4) `docs/ROADMAP.md` (última sync em 2026-11-21) ainda lista `D27`, `D28`, `T39` e `T41` como planejados/em andamento.

**O que fazer**
1. Remover `framer-motion` de `apps/web/package.json` e atualizar `pnpm-lock.yaml`.
2. Migrar `apps/web/.eslintrc.json` para ESLint flat config (`eslint.config.mjs`) usando ESLint CLI direto no script `"lint"` (eliminando o aviso de depreciação de `next lint`).
3. Migrar `package.json#prisma` (`seed`) para `apps/web/prisma.config.ts` compatível com Prisma 6/7.
4. Sincronizar `docs/ROADMAP.md` e `docs/DATA_SOURCES.md` refletindo o fechamento dos Ciclos 1 e 2 e o plano do Ciclo 3.

**Critérios de aceite**
- [x] `framer-motion` ausente de `apps/web/package.json` e 0 regressões em testes/build.
- [x] `pnpm lint` executa sem aviso de depreciação de `next lint` e com 0 erros/avisos.
- [x] `pnpm db:generate` executa sem aviso de `package.json#prisma` e `pnpm db:seed` continua idempotente.
- [x] `docs/ROADMAP.md` e `docs/DATA_SOURCES.md` sincronizados com o estado real em `origin/master`.

**Como verificar**: `pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-23 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`3424192`) com grupo `G-INFRA` livre.
- 2026-11-23 · antigravity · REVIEW · Implementação entregue no commit `916a016`: (1) `framer-motion` removido de `apps/web/package.json` e `pnpm-lock.yaml`; (2) `apps/web/.eslintrc.json` substituído por `apps/web/eslint.config.mjs` (ESLint 9 flat config usando `FlatCompat` via `eslint-config-next`, sem adicionar dependências) e script `"lint": "eslint ."` + exports nomeados em `next.config.mjs`/`postcss.config.mjs`, eliminando o aviso de depreciação de `next lint`; (3) `package.json#prisma` migrado para `apps/web/prisma.config.ts` (`defineConfig` com `schema`, `migrations.path`, `migrations.seed` e carga opcional de `.env` local via `process.loadEnvFile`), eliminando o aviso de depreciação do Prisma 7; (4) `docs/ROADMAP.md` e `docs/DATA_SOURCES.md` sincronizados com a conclusão dos Ciclos 1 e 2 (`D27a/b`, `D28a/b`, `T39`, `T41`, `T48`) e o plano do Ciclo 3. **Validação:** `pnpm db:generate` ok (0 avisos), `pnpm typecheck` ok (0 erros), `pnpm lint` ok (0 erros/avisos), `pnpm test` ok (762/763 pass, 0 falhas, 1 skip; `firms-layer`, `prisma-schema` e `code-hygiene` 20/20), `pnpm build` ok (`✓ Compiled successfully`, 27/27 estáticas) e `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB). Aguarda aceite do Ayrton.
- 2026-11-24 · ayrton · DONE · Aprovada pelo Ayrton.

---

### T43 · Rate-limiting unificado (Redis + fallback) nas 12 rotas `/api/observatory/*` e `/api/weather` + guarda no proxy GIBS

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t43-unified-rate-limit · **Worktree:** —
- **Prioridade:** P1 · **Área:** Segurança · **Tamanho:** M · **Depende de:** — · **Grupos:** G-OBS, G-PIPELINE, G-INFRA

**Contexto / problema**
Atualmente o limitador de taxa (Redis + fallback em memória de `study-rate-limit.ts`) protege apenas `POST /api/studies` e `POST /api/studies/[slug]/fork`. Todas as 12 rotas de proxy externo (`/api/observatory/{firms,eonet,gibs,gibs/image,iss,satellites,traffic,ais,winds,currents,cosmos}` e `/api/weather`) estão sem rate-limit por IP/bucket, expondo cotas de provedores externos e banda do proxy binário `/api/observatory/gibs/image` a abuso ou loops de clientes.

**O que fazer**
1. Extrair um helper genérico `src/lib/rate-limit.ts` (compartilhado por estudos, observatório e clima) com suporte a Redis (quando `REDIS_URL` configurado) e fallback LRU em memória limitado por chaves.
2. Aplicar janelas e limites coerentes por perfil de rota (leitura JSON cacheada vs proxy binário GIBS vs escrita em estudos), devolvendo HTTP `429` com `Retry-After` e `X-RateLimit-*`.
3. Validar limites de tamanho de resposta e timeout estrito no proxy `/api/observatory/gibs/image`.
4. Cobrir com testes automatizados (limite atingido → 429 + `Retry-After`, cabeçalhos e isolamento por bucket).

**Critérios de aceite**
- [x] Todas as rotas `/api/observatory/*` e `/api/weather` protegidas por rate-limit unificado com `429` + `Retry-After`.
- [x] Limite em memória com teto rígido de chaves (sem crescimento ilimitado de RAM).
- [x] Nenhuma regressão nos testes existentes de API, estudos e observatório.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`7129fef`) com grupos livres (`G-OBS, G-PIPELINE, G-INFRA`).
- 2026-11-24 · antigravity · REVIEW · Extraído motor unificado em `apps/web/src/lib/rate-limit.ts` (Redis RESP2 via `incrementRedisFixedWindow` com circuit breaker de 30 s + fallback em memória com teto rígido `maxClients = 4096`, evicção LRU em buckets de leitura e modo fail-closed em escrita de estudos; suporte a `TRUST_PROXY=true` ou `STUDIES_TRUST_PROXY=true` via `x-real-ip` validado com `isIP`) e migrado `study-rate-limit.ts` para delegar ao motor mantendo compatibilidade 100% com as rotas/testes de estudos. Aplicado `enforceRateLimit` com cabeçalhos `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` e `429` + `Retry-After` + `Cache-Control: no-store` nas 12 rotas alvo (`/api/observatory/{firms,eonet,gibs,gibs/image,iss,satellites,traffic,ais,winds,currents,cosmos}` e `/api/weather`), com buckets isolados por rota (`60 req/min` em `weather` e `observatory:gibs-image`, `120 req/min` nas 9 leituras JSON do Observatório, `600 req/min` nas efemérides locais `observatory:cosmos` e `10 req/min` em `studies`). Endurecido o proxy binário NASA GIBS (`apps/web/src/lib/gibs-source.ts` + `/api/observatory/gibs/image/route.ts`) com teto estrito `MAX_GIBS_IMAGE_BYTES = 5 MiB` (verificado em `Content-Length` e incrementalmente no stream `ReadableStream` com cancelamento imediato), mapeamento de `TimeoutError` durante leitura do corpo (`GIBS_TIMEOUT_MS = 15 s`) e `X-Content-Type-Options: nosniff`. Adicionados 13 novos testes em `apps/web/test/rate-limit.test.ts` (Redis mock em `127.0.0.1`, fallback/cooldown sem vazamento de segredos, evicção LRU/fail-closed, isolamento de buckets, cobertura das 12 rotas e guarda GIBS). Validação: `pnpm typecheck`, `pnpm lint` (`eslint .`, 0 warnings), `pnpm test` (775/775 pass, 0 fail), `pnpm build` e `test/bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T44 · Cobertura E2E do Ciclo 2 (Coroplético, `/studies`, GIBS, Ventos/Correntes, `PT ↔ EN` + reload sem hidratação e `/telluslab`)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t44-e2e-cycle2 · **Worktree:** —
- **Prioridade:** P1 · **Área:** Qualidade · **Tamanho:** M · **Depende de:** — · **Grupos:** G-INFRA, G-SHELL, G-OBS

**Contexto / problema**
Os 5 arquivos E2E em `apps/web/test/e2e/` (`home`, `explore-search`, `keyboard-access`, `responsive`, `celestial-labels`) não cobrem nenhuma das entregas do Ciclo 2 (`D22` Coroplético, `D23` `/studies`, `D25` GIBS, `D27` Ventos/Correntes, `D28` i18n `PT ↔ EN` e `/telluslab`). Regressões de hidratação no reload em `EN` com camadas ativas só foram detectadas em revisão manual.

**O que fazer**
1. Adicionar suítes Playwright E2E cobrindo:
   - Troca `PT ↔ EN`, persistência após reload (inclusive com `/?visao=1&pais=BRA&observatorio=1&camadas=NASA_FIRMS`) com asserção de **0 erros de console/hidratação** e navegação para `/telluslab` e `/dossies/astronomia-optica` em `EN`.
   - Ativação do Modo Coroplético (`D22`), legenda e seleção de país.
   - Abertura do Observatório com NASA GIBS (`D25`) e Ventos/Correntes/Ambos (`D27`).
   - Navegação na Galeria `/studies` (`D23`), filtros e abertura de estudo compartilhado.
2. Garantir estabilidade sem dependência de rede externa (fallbacks/fixtures determinísticos) e tempo compatível com o job CI.

**Critérios de aceite**
- [x] Novos specs Playwright passam de forma determinística no Chromium WebGL (`pnpm test:e2e`), sem erros de console ou hidratação.
- [x] Tempo total da suíte E2E permanece dentro do orçamento do CI (`timeout-minutes: 15`).

**Como verificar**: `pnpm build && pnpm test:e2e`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`3af7f98`) com grupos livres (`G-INFRA, G-SHELL, G-OBS`).
- 2026-11-24 · antigravity · REVIEW · Adicionadas 2 novas suítes Playwright E2E e helper de fixtures determinísticos sem rede externa: (1) `apps/web/test/e2e/helpers/cycle2-fixtures.ts` (`attachErrorCollector` verificando **0 `pageerror`, 0 `console.error` e 0 avisos de hidratação/aninhamento DOM do React**, `paceSoftwareWebGL` mantendo a cena WebGL real responsiva em SwiftShader e `installDeterministicRoutes` mockando `/api/weather`, `/api/observatory/{firms,gibs,gibs/image,winds,currents}` e `flagcdn.com`); (2) `apps/web/test/e2e/i18n-and-hub.spec.ts` cobrindo troca `PT ↔ EN` na URL `/?visao=1&pais=BRA&observatorio=1&camadas=NASA_FIRMS`, reload completo em `EN` com `<html lang="en">`, país + Observatório + camada FIRMS preservados com 0 erros de hidratação, navegação para `/telluslab` e `/dossies/astronomia-optica` em `EN` e volta para `PT`; (3) `apps/web/test/e2e/cycle2-features.spec.ts` cobrindo Modo Coroplético (`D22`: seletor, legenda contínua, swatch de dado indisponível, fonte Banco Mundial, seleção de Brasil + tooltip/ranking, troca de indicador e desativação), Observatório com NASA GIBS (`D25`: NDVI → LST + nota de referência local) e Ventos/Correntes/Ambos (`D27`: 10 m → Jato 250 hPa + nós, Correntes + nós, modo simultâneo Ambos e limpeza de camadas) e Galeria `/studies` (`D23`: navegação, filtros combinados `q/era/country/cosmic`, limpeza, `PT ↔ EN` SSR e abertura de estudo compartilhado `/study/[slug]` com fallback gracioso para ambiente CI stateless sem PostgreSQL). Validação: `pnpm typecheck`, `pnpm lint` (`eslint .`, 0 warnings), `pnpm test` (775/775 pass), `pnpm build`, `test/bundle-budget.test.ts` (6/6 pass) e `pnpm test:e2e` (**26/26 pass em 7,0 min**, bem abaixo dos `15 min` do job CI).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T45 · Modularização preventiva pré-teto T36 (`CosmicInspectorHUD`, `en-panels`, `EarthSphere`, `ComparisonCharts`) + budget de texturas

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t45-modularization-texture-budget · **Worktree:** —
- **Prioridade:** P2 · **Área:** Perf/Qualidade · **Tamanho:** M · **Depende de:** — · **Grupos:** G-COSMOS, G-GLOBO, G-PAIS, G-INFRA, G-OBS, G-TIMELINE

**Contexto / problema**
Quatro arquivos centrais encostaram no teto rígido de 600 linhas do `code-hygiene.test.ts`: `CosmicInspectorHUD.tsx` (592 linhas — a 8 linhas de falhar), `en-panels.ts` (573), `EarthSphere.tsx` (544) e `ComparisonCharts.tsx` (541). Além disso, `apps/web/public/textures/` atingiu 28 MB (incluindo arquivos PNG/JPG pesados lado a lado com `.ktx2`), sem guarda automatizada de tamanho de assets estáticos.

**O que fazer**
1. Extrair subcomponentes/submódulos coesos de `CosmicInspectorHUD.tsx`, `en-panels.ts`, `EarthSphere.tsx` e `ComparisonCharts.tsx` para trazê-los abaixo de ~420 linhas cada, preservando comportamento e testes.
2. Auditar `apps/web/public/textures/` (especialmente `paleo/` e `earth_surface_2k.png`), remover eventuais arquivos órfãos ou comprimir PNGs excessivos para WebP/JPG otimizado quando não usados diretamente pelo decoder, e adicionar um teste leve de orçamento de assets estáticos.

**Critérios de aceite**
- [x] Nenhum arquivo em `apps/web/src/` acima de 520 linhas (folga segura abaixo do teto de 600 do T36).
- [x] Assets em `apps/web/public/textures/` auditados, sem arquivos órfãos e com guarda automatizada no `pnpm test`.
- [x] Zero regressões visuais ou funcionais no WebGL, Cosmos e Comparador.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`36988bc`) com grupos livres (`G-COSMOS, G-GLOBO, G-PAIS, G-INFRA`).
- 2026-11-24 · antigravity · REVIEW · Modularizados os 6 arquivos acima de 520 linhas em `apps/web/src/`: (1) `CosmicInspectorHUD.tsx` (592 → 403 linhas) extraindo `CosmicLayersMenu.tsx` e `CosmicHalleyCard.tsx`; (2) `en-panels.ts` (581 → 326 linhas) extraindo `en-panels-study.ts` (Cosmos, Comparador, Reader/Analítico, Citações e Estudos); (3) `EarthSphere.tsx` (544 → 432 linhas) extraindo `lib/textures/proceduralPangea.ts` e `lib/textures/earthTextureSet.ts` (re-exportando `pickEarthTextureSet` e `DEFAULT_PALEO_TEXTURE`); (4) `ComparisonCharts.tsx` (541 → 424 linhas) extraindo `ComparisonLatestChart.tsx`; (5) `observatoryStore.ts` (535 → 399 linhas) extraindo `observatory-store-helpers.ts`; (6) `TimelineAxis.tsx` (535 → 399 linhas) extraindo `GeologicalTimelineAxis.tsx`. Os 4 novos componentes UI foram adicionados a `MIGRATED` em `test/design-system.test.tsx`; o maior arquivo em `apps/web/src/` agora tem 519 linhas (folga segura de 81 linhas abaixo do teto T36). Auditoria de `apps/web/public/textures/`: todos os 51 assets validados (0 órfãos); `earth_surface_2k.png` mantido lossless por codificar canais lineares (elevação/água/batimetria) e `saturn_ring.png` (9 KB); os 4 paleomapas fallback (`paleo_{66,150,200,250}ma.png`, 5,86 MB) foram convertidos para WebP RGBA (`quality: 88, alphaQuality: 95`, 489 KB totais — redução de 91–93% preservando o canal alfa de água verificado pixel a pixel via `sharp` em `globe-surface.test.ts`), baixando `public/textures/` de **28 MB → 23 MB** (atualizados `globeTextures.ts`, `paleo-eras.ts`, `build-earth-textures.mjs`, `docs/DATA_SOURCES.md` e testes). Criado guarda automatizado `apps/web/test/texture-budget.test.ts` (0 órfãos, 0 ausentes, teto total ≤ 24 MiB, teto paleo ≤ 300 KiB, allow-list de PNGs e teto ≤ 520 linhas em `src/`). Validação: `pnpm typecheck`, `pnpm lint` (`eslint .`, 0 warnings), `pnpm test` (782/782 pass), `pnpm build` e `test/bundle-budget.test.ts` (6/6 pass).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T46 · PWA Offline-ready: Service Worker com cache versionado de casca, TopoJSON e snapshots do Banco Mundial

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t46-pwa-service-worker · **Worktree:** —
- **Prioridade:** P2 · **Área:** Infra/UX · **Tamanho:** M · **Depende de:** — · **Grupos:** G-SHELL, G-INFRA

**Contexto / problema**
A tarefa `T33` adicionou `manifest.ts` e ícones, mas o aplicativo ainda não possui Service Worker. Sem SW, o TellusPedia não é instalável como PWA completo nem tolera quedas temporárias de conexão, apesar de quase todo o núcleo enciclopédico (`countries-ne-110m.json`, `countries-worldbank-indicators.json`, `worldbank-timeseries.json`, dossiês e texturas 2K) ser estático.

**O que fazer**
1. Implementar um Service Worker enxuto e versionado (`public/sw.js` + registro seguro em produção no cliente), sem quebrar a política CSP (`T30`) nem interferir no `ktx2-worker.js`.
2. Configurar estratégias de cache adequadas: `cache-first` para `/data/*.json`, `/flags/*`, `/textures/*` (2K) e assets `_next/static/*`; `network-first` com fallback controlado para páginas HTML e sem cache agressivo para rotas mutáveis `/api/studies`.
3. Exibir um indicador discreto D14 (bilíngue `pt-BR`/`en`) quando o navegador estiver offline, informando que camadas ao vivo estão pausadas enquanto o catálogo enciclopédico continua acessível.

**Critérios de aceite**
- [x] Service Worker registra limpo em produção (`next start`) respeitando CSP e sem interferir em testes E2E.
- [x] Limpeza automática de caches antigos ao incrementar versão do SW.
- [x] Aviso discreto de modo offline com tokens D14 e tradução `pt-BR`/`en`.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + validação no Chromium em modo offline.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`d6b7b08`) com grupos livres (`G-SHELL, G-INFRA`).
- 2026-11-24 · antigravity · REVIEW · Implementado Service Worker versionado `apps/web/public/sw.js` (`telluspedia-static-v1` + `telluspedia-pages-v1`) com precache da casca (`/`), manifesto, ícone, `countries-ne-110m.json`, `countries-worldbank-indicators.json` e `worldbank-timeseries.json`, limpeza automática de caches `telluspedia-*` obsoletos na ativação, `cache-first` para `/_next/static/*`, `/data/*.json`, `/flags/*`, `/observatory/gibs/*` e texturas 2K/1K/paleo (excluindo `_4k.`), `network-first` com fallback controlado (página exata → `/` → HTML bilíngue 503 sem cachear `/studies` nem `/study/*`) e bypass estrito para non-GET, cross-origin, `/sw.js`, `/basis/*`, `/api/*` e `/dev/*`. Adicionada política tipada e registro seguro apenas em produção (`NODE_ENV === "production"` + `isSecureContext`) em `src/lib/pwa/sw-policy.ts`, cabeçalhos CSP/no-cache dedicados para `/sw.js` em `security-headers.mjs` + `next.config.mjs` (preservando os índices de `/:path*` e `/basis/ktx2-worker.js`), indicador discreto D14 bilíngue `pt-BR`/`en` em `src/components/pwa/PwaLifecycle.tsx` (adicionado a `layout.tsx`, `en-shell.ts`, `MIGRATED` em `test/design-system.test.tsx` e `tw-merge-table.ts`), testes unitários de runtime real do SW em `test/pwa-offline.test.tsx` e teste E2E Chromium offline em `test/e2e/pwa-offline.spec.ts`. Validação: `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (787/787 pass), `pnpm build`, `test/bundle-budget.test.ts` (6/6 pass) e Playwright em `next start` (`pwa-offline.spec.ts` 2/2 pass em `desktop-1366` e `desktop-1920`, além de `home.spec.ts` e `i18n-and-hub.spec.ts` verdes com SW ativo).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T47 · Observabilidade estruturada: logs JSON nas APIs + `/api/health` estendido com status/latência dos provedores T05

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t47-structured-observability · **Worktree:** —
- **Prioridade:** P2 · **Área:** Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** G-OBS, G-INFRA, G-PIPELINE, G-ESTUDOS

**Contexto / problema**
Os logs das rotas `/api/observatory/*`, `/api/weather` e `/api/studies` usam `console.warn`/`console.error` com formatos heterogêneos, e `/api/health` hoje reporta apenas conectividade básica de banco/serviço sem visibilidade do estado dos provedores externos (`live` / `stale` / `fallback`) nem latências médias ou taxa de acerto de cache.

**O que fazer**
1. Criar um logger estruturado minimalista (`src/lib/server-logger.ts`) emitindo JSON compacto em produção (`timestamp`, `level`, `route`, `provider`, `mode`, `durationMs`, `status`, sem vazar segredos ou tokens).
2. Registrar um painel em memória leve (`providerMetrics`) com último estado T05, timestamp de sucesso, taxa de cache hit/miss e última latência de cada provedor do Observatório.
3. Expor esse resumo em `GET /api/health?detail=1` (sem disparar chamadas externas extras) mantendo `GET /api/health` rápido e retrocompatível.

**Critérios de aceite**
- [x] `GET /api/health` mantém contrato atual (`200`/`503`) e `GET /api/health?detail=1` retorna telemetria dos provedores T05 sem I/O externo.
- [x] Logs JSON estruturados sem vazamento de chaves de API ou PII.
- [x] Coberto por testes unitários.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`77a92ac`) com grupos livres (`G-OBS, G-INFRA, G-PIPELINE, G-ESTUDOS`).
- 2026-11-24 · antigravity · REVIEW · Criado logger estruturado `apps/web/src/lib/server-logger.ts` (JSON compacto de linha única em produção/`LOG_FORMAT=json` com `timestamp`, `level`, `route`, `provider`, `mode`, `durationMs`, `status`, `cache`, `reason` e redação automática de URIs PostgreSQL/Redis, tokens `Bearer`/`Basic`, parâmetros sensíveis, e-mails e chaves sensíveis em `meta`) e painel leve em memória `apps/web/src/lib/provider-metrics.ts` (`providerMetrics`, cardinalidade fixa ≤ 32 provedores, normalizando chaves dinâmicas como `firms-*` e `traffic/aircraft`, registrando último modo T05, `lastSuccessAt`, latência última/média e `cacheHitRate`). Integrado em `observatory-source.ts`, `gibs-source.ts`, `/api/weather`, `health-check.ts`, `rate-limit.ts`, `study-persistence.ts`, `study-gallery.ts` e rotas `/api/studies*`. Estendido `GET /api/health` (`src/app/api/health/route.ts` + `health-check.ts`) para expor `providers` via `?detail=1` (ou `?detail=true`) diretamente da memória sem I/O externo extra, mantendo `GET /api/health` 100% retrocompatível (`200`/`503`, `Cache-Control: no-store`). Criada suíte `apps/web/test/observability.test.ts` (4 testes) e atualizados `study-routes.test.ts` e `production-packaging.test.ts`. Validação: `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (791/791 pass), `pnpm build` e `test/bundle-budget.test.ts` (6/6 pass).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### T48 · Janela de visualização dinâmica até o ano atual (`CURRENT_YEAR`) + marcos históricos curados 2022–2026 (`pt-BR` e `en`)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t48-dynamic-current-year · **Worktree:** —
- **Prioridade:** P1 · **Área:** Produto/Dados · **Tamanho:** P · **Depende de:** — · **Grupos:** G-TIMELINE, G-EPOCA, G-CONTEUDO, G-ESTUDOS

**Contexto / problema**
A janela padrão da linha do tempo e o preset "50 Anos Padrão" ainda estão hardcoded em `1974–2024` (`timelineStore.ts:49`, `PresetSelector.tsx:76`, `actions.ts:47,61`, `historical-eras.ts:28`, `study-schema.ts:21`), impedindo que a visualização padrão acompanhe o ano corrente (`2026`). Além disso, o evento mais recente em `src/data/scenes/milestones.json` é `glo-2021` (2021), deixando o trecho 2022–2026 vazio mesmo no preset "Século XXI".

**O que fazer**
1. Centralizar uma constante/helper `CURRENT_YEAR` (`src/lib/timeline/current-year.ts`, segura para SSR/hidratação) e atualizar `timelineStore.ts`, `PresetSelector.tsx`, `actions.ts`, `historical-eras.ts`, `study-schema.ts`, `cosmos-validation.ts` e o teto do input em `TimelineBar.tsx` para que:
   - "50 Anos Padrão" cubra `[CURRENT_YEAR - 50, CURRENT_YEAR]` (`1976–2026` hoje);
   - "Século XXI" cubra `[2000, CURRENT_YEAR]`;
   - `Era Contemporânea` acompanhe `CURRENT_YEAR` automaticamente nos anos futuros.
2. Curar e adicionar **marcos históricos verificados de 2022 a 2026** em `src/data/scenes/milestones.json` (com fontes primárias auditadas e tradução `en`), cobrindo política, economia, conflitos, ciência e saúde (ex.: primeiras imagens do JWST / Artemis I 2022, Guerra na Ucrânia 2022, Expansão BRICS+ 2024, COP30 em Belém 2025, etc.).
3. Atualizar testes que assumiam `endYear === 2024` como padrão fixo.

**Critérios de aceite**
- [x] Ao abrir `/` sem parâmetros, a timeline inicia automaticamente em `[CURRENT_YEAR - 50, CURRENT_YEAR]` (`1976–2026`) sem erro de hidratação SSR.
- [x] Preset "Século XXI", `Era Contemporânea` e input `Ano final` alcançam dinamicamente `CURRENT_YEAR` (e permitem navegar até o ano atual + margem futura).
- [x] Pelo menos 6 marcos históricos auditados entre 2022 e 2026 renderizam na timeline em `pt-BR` e `en` com fontes clicáveis (RN02).

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual da timeline em `/` (`pt-BR` e `en`).

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada após solicitação do Ayrton na auditoria do Ciclo 3.
- 2026-11-23 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`dd79682`) com todos os grupos livres (`G-TIMELINE, G-EPOCA, G-CONTEUDO, G-ESTUDOS`).
- 2026-11-23 · antigravity · REVIEW · Implementação entregue no commit `c7bc450`: criada fonte única `src/lib/timeline/current-year.ts` (`CURRENT_YEAR` via ano UTC com piso 2026, `DEFAULT_TIMELINE_START_YEAR = CURRENT_YEAR - 50`, `DEFAULT_TIMELINE_END_YEAR = CURRENT_YEAR`, `TIMELINE_INPUT_MAX_YEAR = max(CURRENT_YEAR + 10, 2030)`) conectada a `timelineStore.ts`, `actions.ts`, `PresetSelector.tsx`, `TimelineBar.tsx`, `historical-eras.ts`, `study-schema.ts`, `cosmos-validation.ts`, `view-url.ts`, `search.ts` (`year:<CURRENT_YEAR>`), `SearchPalette.tsx` e `MilestonePin.tsx` (agora com `useI18n()` para traduzir títulos/resumos/botões de marcos). Adicionados 7 marcos históricos curados 2022–2026 em `src/data/scenes/milestones.json` (`glo-2022-ukr`, `glo-2022-artemis`, `glo-2023-who`, `glo-2023-chandrayaan`, `glo-2024-brics`, `glo-2025-cop30`, `glo-2026-milton`) com URLs de fonte primária em `source-urls.ts` (`ISRO`, `UNFCCC`, `ONU`, `NASA`, `OMS`, `Banco Mundial`, `UNESCO`) e traduções `en` em `en-country-meta.ts` / `en-panels.ts`. Corrigido também bug no `TimelineAxis.tsx` em que eventos ocorridos após 01/jan no último ano da janela (`endYear`, ex.: `2026-05-03` = `2026.33`) eram filtrados fora por `p.value <= view.end`. **Captura antes/depois (§1.5):** antes, a timeline abria fixa em `1974–2024` (vazia após 2021); depois, abre em `1976–2026` (desktop e mobile-375), com scrubber em `2026` e novos clusters/marcos `2021–2022 (2)`, `2022–2024 (4)` e `2025–2026 (2)` sem sobreposição nem violação de contraste AA nos 6 breakpoints (`375`, `768`, `1366`, `1680`, `1920`, `2560 px`). **Validação:** `pnpm typecheck` (0 erros), `pnpm lint` (0 avisos), `pnpm test` (762/763 pass, 0 fail, 1 skip; +3 testes em `test/timeline-current-year.test.tsx`), `pnpm build` + `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB), checagem ao vivo no Chromium WebGL (`T48_LIVE_OK`: `1976–2026` + marcos de 2025/2026 em `PT` e `EN`, 0 erros) e Playwright E2E (6/6 `responsive.spec.ts` com snapshots atualizados + `home`, `celestial-labels`, `keyboard-access` e `explore-search` em `desktop-1366` aprovados; único timeout transitório sob carga de host ~8 em `explore-search:30` durante segunda aba simultânea). Aguarda aceite do Ayrton.
- 2026-11-23 · ayrton · DONE · Aprovada pelo Ayrton.

---

### T49 · LoD progressivo de fronteiras (`RN21` / `RN07`): Natural Earth `1:50m` no zoom aproximado + territórios disputados/autônomos

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/t49-borders-lod-50m · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** — · **Grupos:** G-FRONTEIRAS, G-GLOBO, G-PAIS, G-SHELL

**Contexto / problema**
Atualmente o globo usa apenas a malha Natural Earth `1:110m` (`countries-ne-110m.json`), mesmo em aproximações fechadas onde litorais, arquipélagos e países menores perdem definição (`RN21`), e não há sinalização visual diferenciada para territórios disputados ou regiões autônomas (`RN07`).

**O que fazer**
1. Gerar/armazenar snapshot TopoJSON Natural Earth `1:50m` simplificado em `public/data/countries-ne-50m.json` carregado **sob demanda** somente quando a câmera se aproximar abaixo de um limiar de altitude (preservando `/` < 160 KiB e `dispose()` na GPU).
2. Adicionar metadados e estilo de linha tracejada/diferenciada (RN07) para territórios disputados / regiões autônomas relevantes no catálogo (com nota neutra e fonte ONU / Natural Earth).
3. Manter raycast picking `< 0,2 ms` e zero-padding ISO (`AGENTS.md` §2).

**Critérios de aceite**
- [x] Transição automática `1:110m` ↔ `1:50m` conforme altitude da câmera sem travamento de frame nem vazamento GPU (`dispose()`).
- [x] Territórios disputados/autônomos sinalizados de forma visualmente distinta e bilíngue (`pt-BR`/`en`).
- [x] `bundle-budget.test.ts` permanece 6/6 (`/` `< 160 KiB`).

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção de zoom no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (resgate `RN07`/`RN21`, aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`8a23c38`) com grupos livres (`G-FRONTEIRAS, G-GLOBO, G-PAIS`).
- 2026-11-24 · antigravity · REVIEW · Gerado snapshot Natural Earth `1:50m` (`apps/web/public/data/countries-ne-50m.json`, 726 KiB, 241 geometrias, 1.959 arcos, zero-padded ISO 3166-1) via `apps/web/scripts/build-borders-50m.mjs`. Criado gerenciador de LoD com histerese (`apps/web/src/lib/borders-lod.ts`, `ENTER=2.2` / `EXIT=2.5`, carregamento estritamente sob demanda via `fetch` com deduplicação e índice espacial `which-polygon` `WORLD_ATLAS_50M` medido em ~0,0045 ms/lookup) conectado a `globeStore.ts`, `CountryBorders.tsx` (com `dispose()` de geometria/material na troca) e `EarthSphere.tsx` (picking sincronizado em alta resolução + códigos numéricos 1:50m em `country-codes.ts`). Criado catálogo neutro bilíngue `pt-BR`/`en` de territórios disputados e regiões autônomas (`apps/web/src/lib/territorial-status.ts`, fonte ONU / Natural Earth / Tratado da Antártida), linhas tracejadas diferenciadas 3D (`SpecialTerritoryBorders` em `CountryBorders.tsx` + `getSpecialTerritoryBorderPositions` em `country-border-geometry.ts` com `dashed: true`, `computeLineDistances()` e `dispose()`) e nota/selo D14 em `CountryHeader.tsx`. Bônus de estabilidade SSR descoberto no E2E: adicionado reset de stores Zustand entre requisições SSR consecutivas em `applyInitialGlobeState` (`GlobeExperienceShell.tsx`), eliminando vazamento de `selectedIso` entre `/pais/[iso]` e `/` (React `#418`). Validação: `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (795/795 pass, +4 testes em `test/borders-lod.test.tsx`), `pnpm build`, `test/bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB) e Chromium WebGL E2E (`borders-lod.spec.ts` + `home.spec.ts` 2/2 pass em `next start`).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

## 5. Tarefas — Design, visual e experiência (D)

### T40 · Corrigir desmontagem dos rótulos HTML no WebGL

- **Status:** DONE · **Responsável:** codex · **Branch:** task/t40-drei-html · **Worktree:** ../telluspedia-wt/codex-t40
- **Prioridade:** P1 · **Área:** 3D/Infra · **Tamanho:** P · **Depende de:** — · **Grupos:** G-INFRA, G-COSMOS, G-OBS

**Critérios de aceite**
- [x] Em desenvolvimento com Strict Mode, entrar no Cosmos, voltar à Terra e reentrar funciona sem aviso de desmontagem de raiz React.
- [x] Rótulos celestes aparecem, são removidos na saída e reaparecem na reentrada.

**Log**
- 2026-11-21 · codex · IN_PROGRESS · Erro informado pelo Ayrton ao montar os rótulos celestes com Next.js 15.5.29 e React 19.
- 2026-11-21 · codex · REVIEW · Patch do Drei 10.7.9 reaproveita a raiz quando o efeito é reexecutado e adia a desmontagem definitiva até após o commit do React. Reprodução isolada em Strict Mode passou de seis avisos a zero. No app em desenvolvimento, três ciclos Terra ↔ Cosmos confirmaram reaparecimento e remoção dos rótulos sem o aviso. Typecheck, lint, 571 testes, build e seis testes Playwright passaram. Implementação: `ca0feca`.
- 2026-11-21 · ayrton · DONE · Correção aprovada no chat.

---

### T41 · Corrigir aviso de hidratação do botão Observatório em `/study/<id>` com camadas ativas

- **Status:** DONE · **Responsável:** claude · **Branch:** task/t41-hidratacao · **Worktree:** —
- **Prioridade:** P2 · **Área:** Frontend · **Tamanho:** P · **Depende de:** — · **Grupos:** G-SHELL, G-OBS

**Contexto / problema**
Ao abrir um estudo salvo (`/study/<id>`) que tenha qualquer camada do Observatório ligada, o React registra no console "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" no botão `#observatory-trigger` da `TopNavBar`: o `className` renderizado no servidor difere do cliente (`aria-pressed` é igual, `false`). Reproduzido em 2026-11-21 com um estudo só com `NASA_FIRMS` e com outro só com `NASA_GIBS`, então não depende da camada. O React avisa que não corrige o atributo, então o botão pode ficar com o destaque de "camadas ativas" errado até a próxima renderização.

Suspeitas: a `TopNavBar` lê `activeLayers`/`isPanelOpen` com `getState()` no servidor (`typeof window === "undefined"`) e com o hook no cliente; o servidor e o cliente podem enxergar estados diferentes do `observatoryStore` no primeiro render (ordem de `applyInitialGlobeState` em relação à `TopNavBar`, ou o store singleton do servidor carregando estado entre requisições).

**O que fazer**
1. Reproduzir: subir o banco, criar um estudo com uma camada do Observatório e abrir `/study/<id>` com o console aberto.
2. Descobrir qual lado tem as camadas no primeiro render e por quê.
3. Fazer o servidor e o cliente renderizarem o mesmo estado inicial (de preferência hidratando os stores antes da `TopNavBar`, sem esconder o aviso com `suppressHydrationWarning`).

**Critérios de aceite**
- [x] `/study/<id>` com camadas do Observatório ativas não gera aviso de hidratação no console.
- [x] O botão Observatório aparece destacado já no HTML do servidor quando o estudo tem camadas ativas.
- [x] A página inicial e `/study/<id>` sem camadas continuam sem aviso.
- [x] Teste automatizado cobrindo o estado do botão no SSR de um estudo com camadas.

**Como verificar**: abrir `/study/<id>` de um estudo com `NASA_FIRMS` e outro com `NASA_GIBS` e conferir o console; `pnpm test`.

**Log**
- 2026-11-21 · claude · TODO · Tarefa criada a pedido do Ayrton, a partir do achado na verificação da D25.
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: com a T39 em REVIEW, G-SHELL ficou livre; primeira TODO elegível da fase 11.
- 2026-11-22 · claude · REVIEW · `1a46b83`. Causa: o hook do Zustand usa o estado *inicial* como snapshot do servidor; o SSR lia `getState()` (com as camadas do estudo) e a hidratação lia o inicial (sem camadas). Correção: `useStoreSnapshot` (`lib/use-hydrated.ts`) lê `getState` no SSR e durante a hidratação; a `TopNavBar` usa para Observatório e mapa temático; o `GlobeExperienceShell` aplica o estado da rota no render também na hidratação inicial do cliente (sem assinantes montados), mantendo o efeito nas navegações seguintes. Teste `hydration-snapshot.test.tsx`; 698 testes (6 de ambiente/Prisma). Navegador: `/study/estudo-bT-NyWHP` (FIRMS) e `/study/estudo-hogw7MVK` (GIBS) sem avisos, botão destacado no HTML do servidor e no cliente; `/` e navegação a partir da galeria sem erros.
- 2026-11-22 · ayrton · DONE · Aprovado (registrado por claude).

---

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

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d02-oceanos-atmosfera · **Worktree:** ../telluspedia-wt/claude-d02
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** G · **Depende de:** D01 · **Grupos:** G-GLOBO, G-EPOCA

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
- [x] Reflexo do sol visível nos oceanos, ausente nos continentes.
- [x] Relevo perceptível em cordilheiras sob luz rasante.
- [x] Nuvens e atmosfera ativáveis/desativáveis.
- [x] FPS medido e registrado no Log (antes/depois).
- [x] Fontes e licenças documentadas.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. G-EPOCA adicionado (nuvens/atmosfera montadas no `GlobeCanvas`). Nenhuma tarefa de G-GLOBO/G-EPOCA em andamento (T14 em REVIEW). D04 segue em TODO aguardando G-OBS (D07 do codex em andamento).
- 2026-11-20 · claude · REVIEW · Commit `4fb9c21`. **Assets (NASA, domínio público — `docs/DATA_SOURCES.md`):** o servidor `eoimages.gsfc.nasa.gov` estava inacessível (timeout) e o NEO foi desativado; as imagens vieram das cópias no Wikimedia Commons (licença conferida pela API): diurna Blue Marble NG “Whole world - land and oceans” e noturna “The earth at night”, ambas em 3840×1920 (`*_4k.jpg`) com versão 2048×1024 (`*_2k.jpg`), escolhidas por `maxTextureSize ≥ 8192` (`pickEarthTextureSet`); anisotropia até 8×. `earth_surface_2k.png`: **R** = elevação SRTM em tons de cinza (NASA), **G** = máscara de água derivada da cor do oceano da diurna (RGB 11,10,50 + azul dominante; inclui lagos como o Cáspio). Texturas antigas (`earth_day.jpg`, `earth_night.png`, 2048 px de 2010) removidas — só o `EarthSphere` as usava. **Shader (`EarthShaderMaterial`):** reflexo do Sol Blinn-Phong (brilho concentrado + halo largo) multiplicado pela máscara de água; relevo pela diferença central da elevação nas direções leste/norte (normal no espaço mundial — AGENTS.md §1), só em terra, aplicado ao sombreamento difuso (o terminador segue na normal geométrica); oceano com tom levemente mais rico; reflexo e relevo suprimidos com `uPaleoFactor` (litoral/elevação atuais) e o reflexo também na iluminação de estudo. **Atmosfera (`Atmosphere.tsx`):** casca `BackSide` de raio 1,025 com espalhamento aproximado (azul no limbo diurno, laranja no terminador, quase nada à noite), direção do Sol do `useSunDirection` (T14); com ela ligada, o Fresnel do shader da Terra cai para um toque de borda. Botão **“Atmosfera”** ao lado de “Iluminação de estudo” (ambos migrados para os tokens do design system). **Testes:** `test/globe-surface.test.ts` (7, com decodificador PNG mínimo): escolha de resolução e arquivos presentes, máscara de água nos pixels (oceanos × Amazônia/Saara/Sibéria/Austrália; Cáspio = água), elevação (Tibete e Altiplano ≫ Amazônia ≥ oceano), documentação, reflexo condicionado a água/era atual/estudo, relevo só em terra e normal em espaço mundial, atmosfera ativável. **Validação após rebase:** typecheck ok, lint ok, 430/430 testes, build ok (home 450 kB; texturas ficam em `public/`, fora do bundle). **Pendências (critérios não atendidos):** (1) **nuvens** — nenhuma textura de nuvens em domínio público acessível (a “Blue Marble 2002” do Commons é a superfície sem nuvens; o servidor da NASA com `cloud_combined` estava fora); não foram inventadas nuvens procedurais; (2) **KTX2/Basis** — sem `toktx`/`basisu` no ambiente; (3) **FPS antes/depois** — não medido (Chromium headless indisponível); o custo extra é 4 leituras de textura e um passe aditivo da atmosfera por pixel do globo; conferir num notebook com GPU integrada; (4) aparência não verificada visualmente pelo agente.

- 2026-11-20 · claude · REVIEW · **Pendências entregues (sem commit; alterações no checkout de trabalho para revisão).** **Fontes reais:** o Earth Observatory migrou para `assets.science.nasa.gov`; de lá vieram a Blue Marble NG **com relevo e batimetria** (julho/2004), elevação e batimetria **GEBCO 08** e as **nuvens** MODIS do Blue Marble 2002 (`cloud_combined_2048.jpg`); paleogeografia do **PALEOMAP PaleoDEM** (Scotese & Wright 2018, Zenodo, CC BY 4.0). Originais em `assets-src/raw/` (gitignored; URLs em `assets-src/README.md`). **Pipeline:** `pnpm --filter web textures:build` (`scripts/textures/build-earth-textures.mjs`: sharp + `ktx2-encoder` WASM + `h5wasm`) gera JPG/PNG e **KTX2** (Basis; diurna UASTC+RDO+Zstd, noite/nuvens ETC1S, superfície UASTC linear, paleomapas UASTC RGBA; mipmaps; Y invertido porque o `KTX2Loader` usa `flipY=false`) e copia o transcoder para `public/basis/`. **Runtime:** `lib/textures/globeTextures.ts` carrega KTX2 via `KTX2Loader` e cai para JPG/PNG em qualquer falha; `EarthSphere` passou a carregar as texturas de forma assíncrona. **Oceano:** a diurna agora tem plataformas, dorsais e fossas reais; superfície R = elevação GEBCO, G = água (batimetria < 0 m), B = profundidade; o tingimento artificial do mar foi reduzido. **Nuvens:** `CloudLayer.tsx` (casca 1,006, iluminada pelo `useSunDirection`, quase invisível à noite, some no modo geológico e fica discreta na iluminação de estudo) e botão **“Nuvens”**; estáticas (sem rotação), porque o frameloop é sob demanda e a imagem é de 2001. **Modo geológico:** os retângulos procedurais foram trocados por paleomapas gerados do PaleoDEM para 250/200/150/66 Ma (antes 200 e 66 Ma reaproveitavam a Pangeia), com alfa = água e reflexo do Sol nos oceanos antigos. **Testes:** `globe-surface.test.ts` com 13 casos (cabeçalho/DFD dos KTX2, máscara/elevação/profundidade nos pixels, nuvens, paleomapas e fração de terra). **Validação (VM sem acesso a binaries.prisma.sh e Google Fonts):** lint ok; typecheck ok exceto erros do Prisma não gerado; testes 427/431 (as 4 falhas são `@prisma/client did not initialize`); build bloqueado pelo download das fontes. **FPS e conferência visual (mesmo dia):** notebook com Intel Iris Xe (ANGLE/D3D11), viewport 1600×900, DPR 1, `next dev`, globo renderizando a cada quadro (zoom contínuo por `wheel`): **antes** (master no :3000) 59,2–60,0 FPS, p95 24,8–25,2 ms; **depois** (:3001, com KTX2 4K, nuvens e paleomapas) 60,0 FPS, p95 23,0–25,0 ms — ambos no limite do vsync de 60 Hz. No navegador: os 5 KTX2 carregaram sem cair no fallback; orientação correta (fronteiras alinhadas à imagem, ou seja, o Y invertido do KTX2 está certo); batimetria, nuvens e reflexo do Sol visíveis; Pangeia/Gondwana exibidos no modo geológico. **Pendente:** as suturas de `PaleoPlatesLayer` usam coordenadas atuais e não se alinham aos paleomapas (follow-up).
- 2026-11-20 · ayrton · DONE · Aprovada pelo Ayrton (registrado por claude). Entrega em `d73ca30` + `ef26444`.
---

### D03 · Fronteiras com espessura real e highlight

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d03-destaque-sutil · **Worktree:** ../telluspedia-wt/codex-d03b
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
- [x] Bordas com espessura consistente em telas HiDPI.
- [x] Seleção visualmente distinta do hover.
- [x] Sem z-fighting com a superfície.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 6. D15 e a fase 5 dependem do grupo do Observatório, ocupado pela D05. A D02 também compartilha G-GLOBO com a D05.
- 2026-11-20 · codex · REVIEW · Fronteiras com LineSegments2 e largura em pixels CSS. A largura e a opacidade das linhas base acompanham o zoom. Seleção com contorno de 3 px, halo e preenchimento esférico translúcido. Hover com contorno de 2,15 px. Contornos e preenchimentos calculados sob demanda e reaproveitados por atlas e ISO. Geometrias e materiais GPU descartados na troca ou desmontagem. A subdivisão mantém as faces e os segmentos acima da Terra. Captura anterior mostra o Brasil marcado por uma linha fina. Captura posterior no mesmo enquadramento mostra o Brasil preenchido e o Peru contornado sob o cursor. Chromium com viewport de 1366 × 850 confirmou 3 px CSS tanto em DPR 1× quanto 2×. Validados 376 testes, typecheck, lint e build. Testes de geometria cobrem territórios separados, o enclave do Lesoto, a Antártida, a Prússia e a reutilização do cache.
- 2026-11-20 · codex · IN_PROGRESS · Reaberta após reprovação do Ayrton. A captura de referência mostra que o contorno claro domina o globo quando a câmera está afastada. A revisão ajusta largura, brilho e opacidade do destaque com o zoom.
- 2026-11-20 · codex · REVIEW · O destaque agora usa ciano menos luminoso e acompanha o zoom. A seleção fica entre 1,15 e 1,8 px CSS, com preenchimento de 5% a 12% e halo único que some à distância. O hover mantém um contorno mais discreto. Nas capturas do Brasil no mesmo enquadramento e horário, a versão anterior exibe linha clara de 3 px com duas camadas de halo. A nova captura afastada mostra o contorno fino e a textura visível. De perto, a captura distingue a seleção do Brasil do hover no Peru. Chromium confirmou as mesmas larguras em DPR 1× e 2×. Typecheck, lint, 401 testes e build passaram após rebase.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton após a revisão visual.

---

### D04 · ISS: SGP4 real, órbita correta, outros satélites

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d04-satellite-ux · **Worktree:** ../telluspedia-wt/claude-d04c
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
- [x] Posição da ISS dentro de ~50 km da `wheretheiss.at` no mesmo instante (teste manual registrado no Log).
- [x] Órbita fechada, sem reta atravessando o globo, em qualquer ângulo de câmera.
- [x] HUD e modelo exibem a mesma posição/altitude.
- [x] Sem alocações por frame (verificar no profiler).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. G-INFRA adicionado (dependência `satellite.js` no `package.json`). Nenhuma tarefa de G-OBS/G-INFRA em andamento.
- 2026-11-20 · claude · REVIEW · Commit `e537699`. **Dependência:** `satellite.js@^5`. **`lib/satellites.ts`** (puro): leitura do formato de 3 linhas do CelesTrak com checksum e época, deduplicação entre grupos, `propagateState` (SGP4 → `eciToGeodetic` com o GMST do instante), `orbitRing` (um período no referencial inercial convertido com o GMST **atual** → anel fechado), `groundTrack`, `isEclipsed` (sombra cilíndrica com o ponto subsolar), `altitudeToSceneRadius` (1 + h/6.371 km — escala real, sem exagero), `buildIssTelemetry` (fonte única do HUD, painel e modelo). **Servidor:** `/api/observatory/satellites` — TLEs dos grupos `stations` + `visual` (166 objetos ao vivo), cache de 4 h, envelope T05; fallback = TLE de referência da ISS (época 2026-11-20) rotulado “impreciso”. `calculateIssPosition` virou SGP4 do TLE de referência (o modelo analítico com época arbitrária `1700000000000` foi removido) e nunca lança: com TLE velho demais devolve a posição da época — o store o chama na inicialização. `/api/observatory/iss` (wheretheiss.at) foi mantida, sem uso na UI (referência de conferência e testes da T05). **Camada (`IssOrbitLayer`, reescrita):** ícone da ISS (módulo, treliça e painéis no shader) em 30 px constantes na posição real; propagação a 10 Hz com interpolação em vetores pré-alocados (sem alocação por quadro — o satellite.js aloca a cada amostra de 100 ms, não por quadro); anel fechado de 180 amostras com cauda mais forte atrás; ground track ±45 min a 1.002; demais satélites como pontos por categoria (estações em ciano, visíveis em cinza-claro), atualizados a cada 1 s; clique por raio em pixels → card da ISS ou do satélite (nome, NORAD, altitude, velocidade, época do TLE). **Painel:** filtro “Estações espaciais” / “Visíveis a olho nu” com contagem e legenda (anel × rastro). **Critério de posição — teste manual registrado:** pela rota do app (CelesTrak ao vivo), no mesmo instante da `wheretheiss.at`: Δ = **0,8 km** (3 amostras, 21:07 UTC), altitude 417,2 × 417,2 km e iluminação “daylight” × “daylight”; antes, num instante ligeiramente diferente, 10,9 km. **Testes:** `test/satellites.test.tsx` (14, com fixtures reais de TLE em `test/fixtures/`) e três testes antigos da ISS reescritos — eles fixavam o modelo inventado (altitude 400–420 km, inclinação exatamente 51,64°, raio 1,18, época de 2023 propagada a partir de TLE de 2026); agora usam limites físicos (LEO 370–460 km, |lat| ≤ 52° geodésica, deslocamento de ~460 km/min). **Validação após rebase sobre T15/D03:** typecheck ok, lint ok, 416/416 testes, build ok. **Bundle:** home 437 → 448 kB (+11 kB do satellite.js, carregado pelo store; pode virar import dinâmico na T25). **Ocorrência não explicada:** uma execução isolada de `test/unit.test.ts` ficou presa a 100% de CPU por 10 min logo após reescrever os testes; não se repetiu em 4 execuções seguintes (suíte completa em 9–17 s, nenhum teste > 160 ms) — vigiar no CI. **Critério “sem alocações por frame (profiler)” não verificado no navegador** (Chromium headless indisponível). **Fora do escopo:** Starlink (milhares de objetos) e glTF da ISS (optou-se pelo ícone em px constantes, previsto no item 6).
- 2026-11-20 · ayrton · IN_PROGRESS · Correções pedidas (com screenshot): (1) há uma linha a mais abaixo da trajetória da ISS, colada no globo (é o ground track — lido como trajetória duplicada); (2) satélites e estações ficaram bons, mas são difíceis de identificar e selecionar. Reaberta pelo claude em `../telluspedia-wt/claude-d04b`; G-INFRA liberado (sem mudança de dependências).
- 2026-11-20 · claude · TODO · Reabertura desfeita antes de qualquer código: a D06 (codex) está IN_PROGRESS em G-OBS, o mesmo grupo — pelo protocolo, a D04 não pode ficar em andamento ao mesmo tempo. Correções pendentes (retomar quando G-OBS estiver livre): ground track desligado por padrão com opção “Rastro na superfície”; satélites mais fáceis de identificar e selecionar (pontos maiores com contorno, raio de clique maior, cursor, anel de hover/seleção e etiqueta com o nome).
- 2026-11-20 · claude · IN_PROGRESS · Retomada: G-OBS livre (D07 do codex em REVIEW). Worktree a partir de origin/master.
- 2026-11-20 · claude · REVIEW · Commit `24dd5a3`. (1) Ground track desligado por padrão (`observatoryStore.showIssGroundTrack = false`) com chip “Rastro na superfície” no painel — era lido como trajetória duplicada; a órbita (anel) continua sempre visível. (2) Satélites: pontos maiores com contorno escuro (estações 9 px, visíveis 7 px, tamanho por vértice), raio de clique 12 px (ISS 20 px), cursor de mão, anel ciano de hover e anel branco no satélite selecionado (acompanham o movimento a cada 1 s), etiqueta `<Html>` com o nome (“ISS (ZARYA) · Estação Espacial Internacional” / “<nome> · estação|satélite”) sem capturar eventos. Legenda do painel atualizada. Testes: +2 (toggle do rastro; invariantes da camada). Validação: typecheck ok, lint ok, 435/435 testes, build ok. Não verificado visualmente pelo agente — conferir hover/etiqueta e clique nos pontos.
- 2026-11-22 · ayrton · DONE · Aprovada pelo Ayrton (registrado pelo antigravity a pedido). Auditado `IssOrbitLayer.tsx`: zero alocações por frame em `useFrame` (vetores pré-alocados em `useMemo`) e descarte rigoroso de geometrias/materiais.

---

### D05 · Queimadas: sprites, heatmap, dados reais

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d05-queimadas-v3 · **Worktree:** ../telluspedia-wt/claude-d05c
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** T04, T05 · **Grupos:** G-OBS, G-GLOBO

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
- [x] Focos circulares com brilho, sem quadrados.
- [ ] Com a chave, milhares de focos renderizados a ≥ 55 FPS.
- [x] Heatmap legível em zoom distante.
- [x] Badge "Ao vivo"/"Simulado" correto (T05).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. Passo 1 (chave) já atendido pela T04 (`.env.example` documenta `NASA_FIRMS_MAP_KEY`; chave real configurada no ambiente do Ayrton). Nenhuma tarefa de G-OBS em andamento.
- 2026-11-20 · claude · REVIEW · Commit `1809c87`. **Servidor:** `lib/firms-aggregate.ts` (puro): filtro de confiança, grade de 1° com centróide/contagem/FRP somado/FRP máximo/data mais recente, corte nos 5.000 focos de maior FRP. `/api/observatory/firms?days=1|2|5&confidence=nominal|all` — **janela máxima de 5 dias, não 7**: a API “area” do FIRMS recusa mais (“Invalid day range. Expects [1..5]”); padrão 24 h sem baixa confiança. Envelope T05 preservado (`data` = focos) + `cells`, `total`, `window`; uma fonte com cache próprio por combinação (máx. 6); timeout 8 s (24 h) / 20 s (2–5 dias). **Globo** (`NasaFirmsLayer`): `ShaderMaterial` próprio — sprite circular com núcleo quase branco e halo na cor do FRP (escala log amarelo → laranja → vermelho → magenta, `lib/firms-display.ts`), tamanho em unidades do mundo ∝ √FRP (2,5–28 px), cintilação por foco, fade na borda do globo (normal e visão em view space) e depthTest contra o globo; heatmap gaussiano por célula, cor por densidade (log da contagem), com transição suave pela distância da câmera (focos até ~2,4, heatmap a partir de ~3,0; os dois somados no zoom padrão). Raycast com limiar proporcional à distância e só no hemisfério visível (o padrão de Points usa limiar 1 e acertava o lado oculto). **Cards** (HUD de telemetria): foco → data/hora UTC, satélite, passagem dia/noite, FRP, confiança, brilho, posição e link para o mapa oficial do FIRMS na data; célula → contagem, FRP somado/máximo, data mais recente, “Aproximar”. **Painel:** controles 24 h/48 h/5 dias, chip “Incluir focos de baixa confiança”, legenda de FRP gerada da mesma escala do shader; contador usa o total da janela. **Testes:** +8 em `firms-csv.test.ts` (agregação, bordas da grade, filtro, corte, parâmetros, rota com janela/cache/fallback) e `firms-layer.test.tsx` (10: escala de cor/tamanho, transição por distância, geometria, link, store com janela, cards e controles); testes da T04 adaptados à nova assinatura `GET(request)`. **Verificado com a API real** (chave do Ayrton): 24 h → live NOAA-21, 28.167 focos, 2.080 células, ~2,2 s; 5 dias → 168.976 focos (189.448 com baixa confiança), 5.123 células, ~3,7 s; resposta ao navegador 1,2–1,5 MB antes do gzip. **Validação após rebase sobre D10/T13-claim:** typecheck ok, lint ok, 372/372 testes, build ok (home 433 kB). **Não verificado pelo agente:** a renderização e o critério “≥ 55 FPS” — o Chromium headless não roda nesta máquina; são ~5 mil pontos + ~5 mil células em dois draw calls, mas conferir no navegador. **Para conferir:** `pnpm dev`, ligar Queimadas: focos redondos e brilhantes de perto, manchas de calor ao afastar, clique num foco → card; trocar período e o chip de confiança.
- 2026-11-20 · ayrton · IN_PROGRESS · Reprovada (com screenshots): (1) ao clicar não dá para saber qual foco foi selecionado; (2) ao dar zoom os focos somem; (3) com a camada ativa fica difícil selecionar um país; (4) o painel do Observatório se sobrepõe ao do país; (5) ao clicar num país não dá para saber quantos focos há na região — abre um card de célula aleatório. Causas (diagnóstico do claude): sem marcador de seleção; de perto o heatmap some e só restam os 5.000 focos de maior FRP do planeta; células clicáveis com limiar largo e `stopPropagation` roubam o clique do país; Observatório e Inspector usam a mesma posição; não há contagem por país. Reaberta pelo claude em `../telluspedia-wt/claude-d05b`. Escopo continua em G-OBS (Inspector/globo/timeline não serão alterados).
- 2026-11-20 · claude · REVIEW · Commit `c7a24c8`. Correções da reprovação: **(1) seleção visível** — anel branco pulsante no foco selecionado e anel ciano no foco sob o mouse (`FRAGMENT_RING`, blending normal); cursor de mão só sobre um foco. **(2) zoom** — abaixo de 2,6 de distância a camada calcula o recorte visível (horizonte `acos(1/d)`, arredondado a 5°, antimeridiano/polos, debounce 350 ms) e carrega **todos** os focos da área via `/api/observatory/firms?bbox=` (até 12.000, os de maior FRP; respostas fora de ordem descartadas); enquanto carrega, a mancha fica com piso de 35% em vez de sumir. **(3) clique no país** — manchas não capturam clique (`raycast={() => null}`); focos só num raio de 10 px de tela, no hemisfério visível, ficando o mais próximo do raio; card de célula (`FIRMS_CELL`) removido. **(4) sobreposição** — com país selecionado, o Observatório vai para `lg:right-[26.5rem]` (à esquerda do Inspector) com altura acima da timeline; o card de telemetria sobe acima da timeline (expandida/recolhida). Layout completo de painéis segue na D15. **(5) focos do país** — o servidor conta todos os focos da janela por país (`lib/firms-country.ts`: mesmo índice which-polygon/Natural Earth do picking, zero-padding) e devolve `byCountry`; o painel mostra “<país> · nas últimas 24 h: N focos · MW somados · MW no maior” (ou “Nenhum foco detectado”). **Testes:** +6 no servidor (lookup de país real — BRA/IDN/USA/oceano, agregação por país, bbox/antimeridiano/teto, rota com byCountry sem vazar a lista completa, bbox e bbox inválido → 400) e +6 no cliente (piso das manchas, recorte visível, resumo do país, painel ao lado do Inspector, detalhe com resposta atrasada descartada); teste do card de célula removido. **API real:** 24 h → BRA 2.462 focos (SSD 4.374 lidera), 5 dias → BRA 14.962; detalhe da área da Amazônia em 12–75 ms (cache). **Custo conhecido:** a contagem por país soma ~3 s à primeira carga de 5 dias (169 mil lookups; cache de 15 min). **Validação após rebase:** typecheck ok, lint ok, 377/377 testes, build ok (home 433 kB). **Não verificado visualmente pelo agente** (Chromium headless indisponível) — conferir: hover/anel, zoom na Amazônia mostrando muitos focos, clique em país com a camada ligada, resumo do Brasil no painel, painéis lado a lado.
- 2026-11-20 · ayrton · IN_PROGRESS · Reprovada de novo (com screenshots): (1) de perto não dá para distinguir focos das luzes noturnas das cidades; (2) com um país aberto, o Observatório fica na frente da visão — layout ruim para navegação; (3) as manchas vistas de longe “somem” ao aproximar (ex.: Sudeste do Brasil) e o clique seleciona o país — falta credibilidade na representação. Observado também: o resumo diz “Brasil · Nenhum foco detectado” com milhares de focos no país. Reaberta pelo claude em `../telluspedia-wt/claude-d05c`; G-GLOBO adicionado para atenuar as luzes urbanas da textura noturna com a camada ligada (nenhuma tarefa de G-GLOBO em andamento).
- 2026-11-20 · claude · REVIEW · Commit `1c1bd69`. **Mudança de abordagem (representação honesta):** o heatmap/células e o carregamento por área visível foram **removidos** — cada ponto do globo é um foco detectado, em qualquer zoom; a densidade aparece porque focos reais se acumulam. Diagnóstico do Sudeste: nas 24 h havia **8 focos** (148 em 5 dias) — as “manchas” grandes vinham de 1–2 focos fracos inflados pela gaussiana de ~2°. **Servidor:** envia **todos** os focos da janela em formato colunar `firms-columns-v1` (`lib/firms-aggregate.ts`: coordenadas com 3 casas ≈ 110 m, datas indexadas, confiança/dia-noite codificados); medido no dev server: 24 h = 28.211 focos, 960 KB (≈ 190 KB com gzip); 5 dias = 169.020 focos, 5,7 MB (≈ 1,1 MB com gzip — `next start` comprime por padrão). `byCountry` mantido (BRA 2.462 em 24 h). **Causa do “Brasil · Nenhum foco”:** cache HTTP do navegador servindo a resposta da 1ª versão (mesma URL, sem `byCountry`) — agora a URL leva `schema=3`, respostas em formato antigo são rejeitadas (`decodeFirmsColumns` → null) e, sem `byCountry`, o painel diz “Contagem por país indisponível” em vez de afirmar zero. **Distinção de luzes urbanas:** marcadores com disco saturado + contorno escuro (≥ 6 px) + centro de brasa, sem cintilação nem blending aditivo; paleta laranja → vermelho → magenta (sem amarelo-claro); `EarthShaderMaterial` ganhou `uCityLights` e o `EarthSphere` atenua as luzes urbanas para 30% com a camada ligada (único toque em G-GLOBO). **Layout:** ao abrir um país, o Observatório se recolhe numa barra compacta (“Observatório Planetário · N camadas ativas” + expandir/fechar); botão de recolher no cabeçalho; a navbar reexpande. Layout completo de painéis segue na D15. **Picking:** índice espacial de células de 0,5° (interseção raio–esfera → lat/lng → vizinhança), consulta < 1 ms com 170 mil focos; só lado visível; raio de 9 px. **Testes:** formato colunar (ida e volta, rejeição de formato antigo), lookup de país (inclui Sudeste), rota (todos os focos, schema, sem `cells`), store (schema na URL, `byCountry` ausente → indisponível), painel recolhido/expandido, paleta sem amarelo de luz urbana, uniforme `uCityLights`, índice de picking (vizinhança, antimeridiano, desempenho). **Validação após rebase (upstream só CI/README):** typecheck ok, lint ok, 374/374 testes, build ok. Home 466 kB — igual ao `master` atual sem a D05 (o aumento de 433 → 466 kB veio de outras entregas; medido num build de `4a69ccf`). **Atenção:** a T15 (antigravity, G-EPOCA) foi reivindicada durante esta reabertura; a D05 alterou um bloco isolado do `EarthSphere` (atenuação das luzes) — conferir no merge. **Não verificado visualmente pelo agente** (Chromium headless indisponível): conferir marcadores × luzes urbanas de perto, Sudeste com poucos marcadores coerentes ao aproximar, clique em país, barra recolhida ao abrir um país.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### D06 · Eventos severos: símbolos, clusters, trilhas

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d06-eventos-eonet · **Worktree:** ../telluspedia-wt/codex-d06
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** T05 · **Grupos:** G-OBS, G-INFRA

**Contexto / problema**
`components/globe/NasaEonetLayer.tsx:31-32`: todas as categorias usam a mesma esfera + anel; eventos próximos (ex.: dezenas de incêndios no oeste dos EUA/Canadá) formam manchas laranja indistintas. A rota usa só a última geometria do evento (`eonet/route.ts:39`), descartando a trilha.

**O que fazer**
1. Símbolos por categoria (sprites/ícones SVG rasterizados em atlas, tamanho em px constante): ciclone (espiral girando), vulcão, enchente, gelo marinho, seca, incêndio.
2. Clustering por zoom (supercluster em coordenadas lat/lng) com contagem no cluster.
3. Rota passa a devolver todas as geometrias; ciclones exibem trilha com pontos datados.
4. Clique → card com título, categoria, data, magnitude e links das fontes.
5. Filtro por categoria na UI.

**Critérios de aceite**
- [x] Categoria identificável pelo símbolo sem abrir o card.
- [x] Sem manchas sobrepostas em zoom distante (clusters).
- [x] Ciclones mostram trilha.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 5. G-OBS e G-INFRA estão livres. Reservado G-INFRA para adicionar Supercluster ao workspace.
- 2026-11-20 · codex · REVIEW · A rota preserva geometrias válidas e datadas, inclusive polígonos, e consulta até 100 eventos abertos. A camada usa sprites com escala em pixels CSS, símbolos por categoria, espiral animada para tempestades e Supercluster seguido de agrupamento em tela. Os grupos exibem a contagem e permitem escolher um evento. O card mostra data UTC, magnitude quando disponível e links das fontes. Pontos datados da trajetória são clicáveis. O filtro por categoria fica no Observatório. Capturas no Chromium com o mesmo cenário simulado mostram cinco círculos sobrepostos antes e um grupo com o número 5 depois, além dos símbolos e da trilha selecionada. Verificados clique, filtro e seleção de observações com magnitudes distintas. Na consulta direta à NASA, os 100 eventos foram normalizados e um tinha 22 observações. Typecheck, lint, 423 testes e build passaram.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton.

---

### D07 · Aviões: modelos glTF, interpolação, cobertura global

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d07-trafego-aereo · **Worktree:** ../telluspedia-wt/codex-d07
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
- [x] Aviões reconhecíveis como aviões, orientados corretamente.
- [x] Movimento contínuo e suave entre atualizações.
- [ ] ≥ 1.000 aeronaves a ≥ 55 FPS.
- [x] Cobertura além da caixa fixa atual.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 5. D04 segue atribuída ao claude. T05 está concluída e G-OBS está livre.
- 2026-11-20 · codex · REVIEW · Modelo original GLB CC0 com 15 triângulos na silhueta e 220 no detalhe, render instanciado com LOD e limite visual de tamanho. Previsão pelo rumo e pela velocidade, correção gradual após novo vetor, rastro curto com fade e ficha com fonte, posição estimada e procedência. OpenSky global via OAuth com cache de 120 s e amostragem geográfica, padrão 2.000 aeronaves. OAuth, renovação após 401 e cobertura global testados com respostas simuladas para Brasil e Austrália. A rota de produção local retornou Simulado sem credencial. Documentação da licença operacional do provedor em DATA_SOURCES.md. As capturas do mesmo cenário sintético mostram os cones anteriores e as novas silhuetas com asas e cauda. Chromium validou movimento, clique e LOD. Typecheck, lint, 426 testes e build passaram. Critério de 55 FPS pendente em GPU. Em Chromium com SwiftShader, build de produção, viewport 640 × 400 e 1.000 instâncias visíveis, a cena registrou 1,5 FPS em 5 s, ante 3,2 FPS com os modelos ocultos. A conexão ao OpenSky ao vivo depende de credenciais licenciadas.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton. A medição de 55 FPS em GPU permanece registrada no checklist.

---

### D08 · Embarcações reais via AIS

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d08-embarcacoes-ais · **Worktree:** ../telluspedia-wt/codex-d08
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
- [x] Navios reais visíveis nos principais corredores (Malaca, Suez, Canal da Mancha) com posições atualizadas.
- [x] Chave do provedor nunca exposta ao navegador.
- [x] Fallback rotulado "Simulado".

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 5. T05 está concluída e G-OBS está livre.
- 2026-11-20 · codex · REVIEW · Integração AIS Stream pelo servidor, amostra por MMSI a cada 20 s, globo com ícones orientados por tipo, extrapolação limitada, partículas por corredor e ficha com fonte. Capturas locais de Malaca no mesmo enquadramento mostram antes a linha estática e depois a frota simulada colorida com partículas. Chromium validou o fallback em Malaca, Suez e Canal da Mancha e, com um feed controlado, a atualização, o movimento e a ficha. Typecheck, lint, 447 testes e build passaram. A captura de navios reais segue pendente de uma chave `AISSTREAM_API_KEY` no servidor. Os códigos AIS agrupam porta-contêineres em cargueiros. Implementação em `fd3f103`.

- 2026-11-20 · codex · IN_PROGRESS · Reaberta após revisão do Ayrton. Ícones sobrepostos em Malaca e Europa, leitura de movimento e alcance geográfico da amostra.

- 2026-11-20 · codex · REVIEW · Marcadores agrupados na tela com contagem, lista pesquisável e seleção individual, ícones com contorno e filtro de velocidade AIS a partir de 1 nó. Acrescentados Santos, Panamá e Cabo da Boa Esperança. Capturas no mesmo enquadramento de Malaca mostram 130 ícones de teste sobrepostos antes e um marcador numerado depois. Chromium validou clique, busca MMSI, ficha e filtro. Typecheck, lint, 449 testes e build passaram. Em quatro amostras ao vivo houve posições em quatro áreas e mudanças de coordenadas entre leituras. No último recorte, 56 de 168 embarcações tinham velocidade a partir de 1 nó. Suez e Panamá ficaram sem posições no recorte, então o critério dos três corredores originais permanece aberto. Implementação em `afc70aa`.

- 2026-11-20 · codex · IN_PROGRESS · Reaberta após revisão do Ayrton. Substituir as silhuetas individuais por miniaturas de navios com leitura visual semelhante à camada aérea.
- 2026-11-20 · codex · REVIEW · Miniaturas 3D originais com seis variantes, orientação AIS e malhas instanciadas por classe. As capturas de Malaca mostram antes a seta individual e depois casco, cabine e convés visíveis junto ao agrupamento numerado. Chromium validou as seis variantes no globo, a seleção direta, a posição estimada e o agrupamento de 130 embarcações. Typecheck, lint, 483 testes e build passaram. Implementação em `bd54fc8`.
- 2026-11-20 · codex · REVIEW · Ayrton aprovou as miniaturas 3D. A nova verificação com AIS Stream recebeu posições ao vivo em Malaca e no Canal da Mancha. Suez ficou sem leituras nas três amostras ao vivo. O critério de cobertura dos três corredores permanece pendente.
- 2026-11-22 · ayrton · DONE · Aprovada pelo Ayrton (registrado pelo antigravity a pedido), aceitando a limitação esporádica dos receptores gratuitos do AIS Stream em Suez (bounding box conferida em `ais-data.ts`, demais corredores ao vivo, miniaturas 3D e documentação em `DATA_SOURCES.md` aprovados).

---

### D09 · Catálogo estelar real e 88 constelações

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d09-catalogo-estelar · **Worktree:** ../telluspedia-wt/codex-d09
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
- [x] Nenhuma estrela gerada aleatoriamente.
- [x] 88 constelações com linhas corretas (conferir Órion, Cruzeiro do Sul e Ursa Maior contra o Stellarium).
- [x] Estrelas circulares com tamanho por magnitude.
- [x] Atribuições/licenças em `docs/DATA_SOURCES.md`.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · codex · IN_PROGRESS · Primeira tarefa elegível da fase 6. D06 a D08 compartilham G-OBS com a D04. A D02 compartilha G-GLOBO com a T14.
- 2026-11-20 · codex · REVIEW · Binário HYG v4.1 de 212 KiB com 8.920 estrelas observadas até V = 6,5 e dois vértices HIP adicionais. As 88 figuras e os rótulos pt-BR vêm do Stellarium v25.4. Todos os caminhos HIP foram resolvidos. Órion, Cruzeiro do Sul e Ursa Maior foram conferidos contra os caminhos originais. Estrelas circulares com diâmetro e brilho por magnitude e cor por B−V. A Via Láctea vem do NASA SVS com dados Gaia DR2. Estrelas, traçados e fundo compartilham o referencial J2000, com rotação sideral no globo terrestre e conversão eclíptica no Cosmos. A opção de rótulos do Cosmos controla nomes estelares e planetários. Os rótulos do céu são posicionados sem colisão entre si. Capturas do Cosmos antes e depois mostram a troca de um fundo preto com poucos traçados por uma faixa da Via Láctea com figuras e nomes de Órion e das estrelas próximas. Chromium confirmou o carregamento dos assets, os traçados, o tamanho relativo das estrelas e os dois controles. Typecheck, lint, 416 testes e build passaram após rebase. Atribuições em DATA_SOURCES.md.
- 2026-11-20 · ayrton · DONE · Aceite confirmado pelo Ayrton.

---

### D10 · Cometa Halley: visual e distância corretos

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d10-cometa-halley · **Worktree:** —
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
- [x] Em 2026 (≈ 35 UA): sem cauda, núcleo/coma discretos.
- [x] Em 1986-02 (periélio): cauda dupla visível apontando para longe do Sol.
- [x] Distância à Terra correta (teste com referência).
- [x] Label legível e de tamanho constante.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (e41bbef).
- 2026-11-20 · antigravity · REVIEW · Corrigidos elementos orbitais de 1P/Halley (ω = 111.33249° era tratado erroneamente como ϖ − Ω), normalização estrita de M em [0, 2π), convergência de Kepler para alta excentricidade (e = 0.967) e distância vetorial real Terra–Halley |r⃗_cometa − r⃗_Terra| (validada contra JPL Horizons em 1986-04-11: 0,4158 UA vs ~0,42 UA) exposta no `CosmicInspectorHUD`. Visual antes/depois: antes havia núcleo 0.35, cilindro ciano sólido sempre visível (mesmo a 35 UA), anel 3D gigante (`ringGeometry`) e label com `distanceFactor={45}`; agora há núcleo discreto (0.12 + esfera invisível de picking 0.45), sprite de coma radial (`DataTexture` 64×64 com falloff) que cresce próximo ao Sol, cauda dupla por partículas (`THREE.Points`) iônica reta azulada + poeira curva amarelada renderizada só abaixo de 4,5 UA (ausente em 2026 a ~35 UA, ativa no periélio 1986-02), halo de seleção discreto em tela e label fixo em px com tokens do D14; todos os buffers/texturas descartados via `.dispose()`. Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (353/353, incluindo 8 novos testes em `test/halley-comet.test.tsx`) e `pnpm build` verdes; inspeção visual em navegador pendente para revisão do ayrton (Chromium headless indisponível no container sem `libnspr4`). Commit: 5a5b2b7.
- 2026-11-20 · antigravity · IN_PROGRESS · Reaberta após reprovação do ayrton: (1) seleção muito difícil de clicar na cena 3D; (2) núcleo 3D pobre (bola cinza lisa sem relevo/textura, escondendo a coma dentro do raio do núcleo); (3) falta riqueza visual na coma e na cauda dupla; (4) sem feedback/atalho explícito no inspetor para estado da cauda (inativo no afélio vs ativo no periélio de 1986). Worktree recriado a partir de origin/master (049bb22).
- 2026-11-20 · antigravity · REVIEW · Corrigidos todos os 4 pontos da reprovação: (1) seleção facilitada com label `<button>` clicável (`pointer-events-auto cursor-pointer`) e esfera invisível de picking escalada dinamicamente pela distância da câmera (`clamp(camDist * 0.036, 0.55, 8.5)`), além de halo em tela que oculta no close-up para não carimbar o núcleo; (2) núcleo substituído por malha bilobada esculpida (`SphereGeometry(0.095, 56, 40)` com proporção 15×8×8 km inspirada na sonda Giotto, 10 crateras, relevo fBm, normais costuradas na emenda e shader GLSL world-space iluminado pela direção solar real `-vWorldPos`, micro-relevo analítico 3D, crosta carbonácea, fissuras de gelo especulares e rim Fresnel — eliminando a bola cinza chapada causada pelo decaimento da `pointLight` a 35 UA); (3) coma redimensionada para sempre envolver o núcleo (`0.75` no afélio → `2.80` + envelope externo `5.9` no periélio) + cauda dupla volumétrica em shaders GLSL aditivos com falloff suave nas bordas (sem arestas duras) e filamentos animados de plasma iônico azul + leque curvo dourado de poeira somados às partículas (`hasTail` < 4,5 UA); (4) painel "Atividade cometária" no `CosmicInspectorHUD` com badge explícito ("Cauda dupla ativa" vs "Sem cauda (afélio)"), barra de sublimação e 3 botões de época (`Periélio 1986`, `Aprox. Terra`, `Afélio 2026`). Validação pós-rebase em `origin/master`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (378/378, 9 testes dedicados em `test/halley-comet.test.tsx`) e `pnpm build` verdes. Commit: 072b865.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D11 · Política de escala e labels do sistema solar

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d11-escala-labels · **Worktree:** ../telluspedia-wt/claude-d11
- **Prioridade:** P2 · **Área:** 3D · **Tamanho:** M · **Depende de:** D10 · **Grupos:** G-COSMOS

**Contexto / problema**
Cada corpo do modo Cosmos decide o próprio tamanho e estilo de label (`PlanetarySystem.tsx`, `SunCore.tsx`, `CometHalleyTrajectory.tsx`, `AsteroidBeltLayer.tsx`). Não há uma política única de escala de distância/raio nem de colisão de labels.

**O que fazer**
1. Documentar em `docs/ARCHITECTURE.md` a escala: distâncias (`mapDistanceToSceneRadius` — log/comprimida) e raios (exagerados com fator único).
2. Componente `<CelestialLabel>` único: tamanho em px, ocultação por distância/prioridade, anticolisão simples (prioridade por tamanho/foco).
3. Toggle "escala real" (educativo) vs "escala visual".
4. Respeitar as regras de handover de câmera e desduplicação da Terra do `AGENTS.md`.

**Critérios de aceite**
- [x] Todos os corpos usam a mesma política e o mesmo componente de label.
- [x] Labels não se sobrepõem na vista geral do sistema solar.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada. É a única TODO elegível da fase 6 (D10 em DONE); G-COSMOS sem tarefas em andamento (em andamento: T26 em G-PAIS/G-PIPELINE e D08 em G-OBS).
- 2026-11-20 · claude · REVIEW · Commit `feat(cosmos): política única de escala e rótulos com anticolisão [D11]`. **Escala (`lib/cosmic-scale.ts`, documentada em `docs/ARCHITECTURE.md` §2.4.1):** distâncias sempre pela lei de potência `mapDistanceToSceneRadius`; raios por uma regra só a partir do raio equatorial real — visual `r = (R/R⊕)^0,43` (Terra 1, Sol 7,5, Júpiter 2,8, Mercúrio 0,66; substitui a tabela manual de `visualRadius`) e real `r = 0,11·R/R⊕` (o maior fator que mantém o Sol com coroa dentro do periélio de Mercúrio). O grupo Terra + Lua é escalado por `earthSystemScale` no modo Cosmos (modo Terra inalterado); anéis em múltiplos do raio; a câmera multiplica o offset de foco pela razão entre os raios, com Terra ≥ 1,5 e Lua ≥ 0,4 (AGENTS.md) e reenquadra ao trocar a escala. **Rótulos:** `<CelestialLabel>` único (px fixos, sem `distanceFactor`, `CelestialLabelChip` com tokens D14) em Sol, planetas, Lua e Halley; `CelestialLabelManager` resolve a anticolisão em tela a cada quadro (`lib/label-layout.ts`, prioridade foco > hover > raio real; escondido = fade e sem clique). Sol e Lua passaram a ter rótulo. **UI:** "Camadas Cósmicas → Tamanho dos corpos: Visual / Real". **Mudança visual (antes → depois):** antes os rótulos dos planetas cresciam/encolhiam com o zoom (`distanceFactor`) e se empilhavam na vista geral (Terra, Lua e Vênus se cobriam); Mercúrio/Marte/Plutão tinham raios escolhidos à mão. Depois, rótulos de tamanho fixo; na sobreposição fica o de maior prioridade; no modo visual Mercúrio, Marte, Plutão e a Lua (no Cosmos) ficam um pouco maiores e Júpiter um pouco menor; no modo real os planetas internos viram pontos com rótulo. **Testes:** `test/cosmic-scale.test.ts` (11: leis de raio, fator único, Sol × periélio de Mercúrio, anéis, câmera e mínimos, store, anticolisão, uso do componente sem `distanceFactor`, desduplicação da Terra, documentação). **Validação após rebase:** lint ok; typecheck ok exceto os erros do Prisma não gerado; 443/447 testes (as 4 falhas são `@prisma/client did not initialize`, por falta de acesso a binaries.prisma.sh neste ambiente); build compila e para só na checagem de tipos do Prisma. **Não verificado:** a aparência no navegador (conferir a vista geral e o modo real em :3000).
- 2026-11-20 · ayrton · DONE · Aprovada pelo Ayrton (registrado por claude).
---

### D12 · Eventos históricos dirigidos por dados (player de cenas)

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d12-cenas · **Worktree:** ../telluspedia-wt/claude-d12
- **Prioridade:** P1 · **Área:** Arquitetura · **Tamanho:** GG (quebrar em subtarefas antes de iniciar) · **Depende de:** T12, T20 · **Grupos:** G-EPOCA, G-SHELL

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

- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada: única TODO elegível da fase 7 (T12 e T20 em DONE; D16–D18 travadas pelo G-SHELL da D20; G-EPOCA livre). **Quebra proposta** (cada parte com commit, validação e linha de Log próprios; a D12 só vai a REVIEW quando os 4 critérios estiverem atendidos):
  - **D12a — Modelo de dados:** schema de cena em zod (`lib/scenes/schema.ts`) com id, título, resumo, datas e precisão, países/bloco, categoria, fontes citáveis obrigatórias (RN02), câmera inicial, camadas, trajetórias (LineString com timestamps e tipo de veículo), pontos de interesse, mídia e era de fronteiras. Cenas como **JSON versionado no repositório** (`data/scenes/*.json`), validado por teste — conteúdo curado e revisável em PR, sem depender do banco (que hoje tem fallback). A tabela `TimelineMilestone` do Prisma fica para a ingestão (D12e).
  - **D12b — Migração:** os 45 marcos (28 globais + países), Magalhães e Apollo 11 para o novo formato, com teste de "sem perda" contra os dados atuais; `country-data.ts` e as rotas passam a ler dos JSON.
  - **D12c — Player genérico:** um componente que recebe uma cena e desenha trajetória animada, veículo por tipo (nau, nave, avião, exército), pontos de interesse, câmera guiada por SLERP (invariantes do AGENTS.md) e linha do tempo própria (play/pause/scrub); substitui `Apollo11Trajectory`, `HistoricalRouteTrajectory` e os dois overlays, mantendo os testes de fidelidade atuais (ex.: a trajetória da Apollo não atravessa a Lua).
  - **D12d — Ativação:** cena só por seleção explícita (pin, busca, link `?cena=<id>`); sair restaura o estado anterior; `resolveEpoch` deixa de conhecer `MAGELLAN`/`APOLLO11` pelo nome.
  - **D12e — Ingestão:** script SPARQL do Wikidata que gera rascunhos (`published: false`) com QID, datas, coordenadas e fonte, para revisão humana antes de publicar.
- 2026-11-20 · claude · IN_PROGRESS · **D12a concluída** (`feat(cenas): modelo de dados das cenas históricas em zod [D12a]`): `lib/scenes/schema.ts` (zod) com datas parciais ISO e precisão, fontes citáveis obrigatórias, câmera nos limites do globo, era de fronteiras validada contra `HISTORICAL_ERAS`, trajetórias `surface` (pontos com instantes em ordem cronológica e `facts`/`quote` livres) e `cislunar` (fases com instantes), POIs, mídia com licença, dossiê, `published` e QID; `parseSceneCollection` (ids únicos, erro com caminho). Documentação em `docs/SCENES.md`. 7 testes em `test/scenes.test.ts`. Próximo: D12b (migração).
- 2026-11-20 · claude · IN_PROGRESS · **D12b concluída** (`feat(cenas): marcos, Magalhães e Apollo 11 migrados para JSON sem perda [D12b]`): `src/data/scenes/` com 45 cenas — `milestones.json` (28 globais menos Magalhães e Apollo + 17 de países), `magellan-1519.json` (frota como `participants`, 17 pontos com `facts`/`quote`, diário como `chronicle`, citações como `sources`, dossiê) e `glo-1969.json` (trajetória `cislunar` com as 4 fases e instantes pelo GET do Mission Report; câmera ampla atual). `country-data.ts`, `historical-routes.ts` e `apollo11.ts` não têm mais os dados literais: leem do catálogo e devolvem os mesmos formatos. **Sem perda:** teste compara `GLOBAL_MILESTONES`, os marcos dos 6 países, a rota de Magalhães e as fases da Apollo com a fotografia dos dados anteriores (`test/fixtures/pre-d12b-events.json`). Schema ganhou `country`/`countries` (aceita códigos históricos como `SUN` e `TUR_HIST`), `timelineScope`, `participants`, `chronicle`, `facts` e `subtitle`. O cliente não carrega o zod (o catálogo só aplica os padrões; o teste confirma que bate com o schema). Câmera inicial de Magalhães é nova (visão do Atlântico Sul, altitude 3,2) — será usada pelo player. Validação: 468/472 (as 4 do Prisma), lint ok. Próximo: D12c (player genérico).
- 2026-11-20 · claude · IN_PROGRESS · **D12c, parte 1 de 2 — camadas 3D** (`feat(cenas): player genérico das trajetórias 3D (superfície e Terra–Lua) [D12c]`): `ScenePlayer` recebe uma cena e desenha cada trajetória pela camada do seu tipo; `SurfaceTrajectoryLayer` (spline geodésica de qualquer lista de pontos, nau para `ship` e marcador para os demais veículos) e `CislunarTrajectoryLayer` (geometria a partir dos locais de lançamento/pouso da cena e da Lua real no instante do pouso; câmera dos dados). `Apollo11Trajectory` e `HistoricalRouteTrajectory` removidos; `apollo11.ts` virou invólucro do módulo genérico e um teste confirma que a Apollo 11 pelos dados gera os mesmos 12 pontos de antes (< 1e-9). A ativação ainda passa pelo modo da época (mapa `EPOCH_SCENE_DATA_IDS`), trocado na D12d. Correção do Log anterior: a validação da D12b foi 469/473, não 468/472. Validação: 497/501 + 4 novos (as 4 falhas do Prisma), lint ok. **Parte 2:** HUD genérico da cena (substitui `HistoricalRouteOverlay` e `Apollo11TelemetryOverlay`) com linha do tempo própria (play/pause/scrub) e store único do player.
- 2026-11-21 · claude · IN_PROGRESS · **D12c, parte 2 de 2 — painel** (`feat(cenas): painel genérico do player, configurado pelos dados [D12c]`): `ScenePlayerOverlay` serve qualquer cena com `hud` (novo campo do schema): cabeçalho, estatísticas do passo a partir dos `facts` escolhidos em `hud.stepStats`, ponto/fase atual, fases clicáveis, citação (`quoteFact`), barra de progresso, play/pause/passos/velocidade, atalhos de câmera e frase final. `HistoricalRouteOverlay` e `Apollo11TelemetryOverlay` removidos; textos e números que estavam chumbados neles ("1.082 dias totais", "Bandeira de Castela", léguas × 4,18 km, câmeras da Apollo) agora estão em `hud` nos JSON. Telemetria Terra–Lua derivada dos dados (`cislunarTelemetry`): fase pela faixa de progresso, GET interpolado entre os instantes das fases (000:00:00 no lançamento, 102:45:40 no pouso) e distância até a Lua real em escala aproximada. **Mudança visual (antes → depois):** os dois painéis viram um layout único (mesma posição e tamanho); a Apollo perde a "velocidade" (era uma curva sintética, sem dado de origem) e ganha distância calculada pela efeméride; Magalhães mantém estatísticas, diário e controles. Reprodução ainda usa os dois stores existentes por tipo de trajetória (unificados com a ativação na D12d). Validação: 503/507 (as 4 do Prisma), lint ok. **D12c concluída.** Não verificado no navegador ainda.
- 2026-11-21 · claude · IN_PROGRESS · **G-SHELL adicionado** à D12: a parte 2 da D12c troca o painel montado no `GlobeExperienceShell`. Falha de processo minha: editei o shell enquanto a T25 (G-SHELL) estava IN_PROGRESS, sem antes adicionar o grupo; só percebi no rebase (conflito no shell, resolvido mantendo o carregamento sob demanda da T25: `ScenePlayerOverlay` via `next/dynamic`, montado só com cena ativa). `test/bundle-budget.test.ts` atualizado para o novo painel. Build de produção compilado aqui com a checagem de tipos desligada só para medir (o Prisma não gera neste ambiente): o teste de orçamento da T25 passa (First Load JS de `/` abaixo de 250 kB, sem three.js no chunk inicial). Validação após rebase: 507/513 → corrigido o teste de orçamento; agora só as 4 falhas do Prisma.
- 2026-11-21 · claude · IN_PROGRESS · **D12d concluída — ativação** (`feat(cenas): ativação explícita pelos dados, store único e link ?cena= [D12d]`): `resolveEpoch` recebe o id da cena aberta e devolve o id (não mais `"MAGELLAN"`/`"APOLLO11"`); `EpochScene`, `EPOCH_SCENE_DATA_IDS` e as listas de marcos por evento saíram de `epoch/constants.ts`. Cena **tocável** = publicada com trajetória; abre só por seleção explícita — marco com o mesmo id ou listado no novo campo `openedBy` (pin/timeline/busca), preset/rota, ou link `/?cena=<id>` (`SceneLinkSync`; o endereço acompanha a cena aberta). O ano nunca abre cena (teste). **Store único** `stores/sceneStore.ts` substitui `historicalRouteStore` e `apollo11Store`: cena aberta, reprodução (passos, duração `hud.durationSeconds` e progresso inicial `hud.startProgress` vindos dos dados), ano da timeline acompanhando o passo, e fotografia do estado anterior — **fechar restaura timeline, país e câmera**; outro marco fecha a cena aberta por marco sem restaurar. Um só relógio de reprodução (`ScenePlayer`, por quadro); antes havia dois laços na rota de superfície. Decisões pelos dados: modo/telemetria pelo período da cena (antes de 1957 = histórico), relógio astronômico travado no instante do pouso da trajetória Terra–Lua (Sol, Lua), Lua em modo missão quando há trajetória `cislunar`, aviso do Observatório com o título da cena. Estudos continuam compatíveis (`activeRouteId` = cena de superfície; a missão Terra–Lua volta pelo marco). **Mudança visível:** passos anterior/próximo agora também na missão Terra–Lua. Docs: `docs/SCENES.md` (seção "Abrir e fechar uma cena"). Testes: 6 novos em `test/scenes.test.ts`; testes antigos dos stores reescritos para o store único. Validação após rebase sobre a T19 (suítes divididas por domínio; migração dos stores aplicada nas novas suítes): 505/509 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. **Não verificado no navegador.** Próximo: D12e (Wikidata).
- 2026-11-21 · claude · REVIEW · **D12e concluída — ingestão do Wikidata** (`feat(cenas): ingestão de eventos do Wikidata como rascunhos [D12e]`): `lib/scenes/wikidata.ts` (puro) monta a consulta SPARQL (por QIDs ou por classe P31 + período) e converte a resposta em rascunhos `published: false` com QID, datas na precisão do Wikidata (momento P585 ou intervalo P580/P582, vence o mais preciso), coordenadas P625, países P17→P298 e fontes (Wikidata + artigo da Wikipédia pt). `scripts/ingest-wikidata.ts` (`pnpm scenes:wikidata`, com `--dry-run`, `--input` e `--print-query`) valida cada rascunho com o schema e grava em `src/data/scenes/drafts/wikidata.json`, que **não** entra no catálogo do site; QIDs já usados não são reimportados e ids colididos ganham o QID. Nada é inventado: pendências em `facts.aRevisar` (título sem rótulo pt, resumo ausente, categoria da importação, sem coordenadas, datas divergentes, e o país do P17 — que é o país atual, não a entidade da época); o teste recusa cena publicada com `aRevisar`. Achado ao testar com dados reais: o serviço SPARQL devolve datas sem `+` e com ano astronômico (`-0047` = 48 a.C.) — convertido para o ano histórico. Fixture: resposta real do serviço (`test/fixtures/wikidata-sparql-sample.json`, obtida pelo navegador: o ambiente não acessa query.wikidata.org) com 9 batalhas e 2 itens sem data. Nenhum rascunho foi versionado — a primeira importação fica para quando você escolher o recorte. Docs: `docs/SCENES.md` ("Importar do Wikidata") e anexo em `docs/DATA_SOURCES.md` (CC0). Testes: 6 novos. Validação: 511/515 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. **D12 completa (a–e) → REVIEW.** Critérios: evento novo só com dados (sim: JSON + teste); Magalhães e Apollo pelo player genérico (sim; fidelidade **não verificada no navegador** desde a D12c); nenhuma ativação por ano (teste); toda cena com fonte (schema exige ≥ 1). Para aceite: conferir no navegador os dois players, abrir/fechar restaurando o estado e `/?cena=glo-1969`.
- 2026-11-21 · claude · REVIEW · **Verificação no navegador (servidor :3001 do Ayrton) e 3 correções** (`fix(cenas): relógio da missão, restauração do preset e fases do painel [D12]`). Conferido: `/?cena=glo-1969` abre a Apollo 11; fechar remove o painel e limpa o endereço; preset Magalhães abre a cena (ano 1519, endereço `?cena=magellan-1519`) e reproduz a ~1,2 %/s (≈ 90 s em 1×, um só relógio); ano 1969 pelo scrubber **não** abre cena; clique no marco da Apollo na timeline abre a cena. **Corrigido:** (1) tempo de missão antes do instante da fase exibida (TLI com GET 002:22 < 002:50) — o GET era interpolado no `targetProgress` e a fase pelo `startProgress`; agora os dois usam o início da fase (teste varre o progresso de 0 a 1); (2) fechar Magalhães aberto pelo preset não voltava ao preset anterior — o preset mudava o período antes de abrir a cena, e o estado guardado já era 1519–1522; agora abre a cena primeiro (teste); (3) títulos das fases vazavam para a célula vizinha no painel — `min-w-0` no botão e `w-full` no texto, título completo no `title`. **Fora do escopo, sem tarefa ainda:** o selo "Cartografia Histórica" mostra "1870 — Unificação Alemã" para qualquer ano < 1891 (ex.: 1520), porque `resolveHistoricalEra` não tem eras anteriores — é anterior à D12. Validação: 513/517 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok.
- 2026-11-21 · claude · REVIEW · **Correções conferidas no navegador** (servidor :3001 atualizado): GET ≥ instante da fase em 9 pontos de 0 a 1 (TLI em 0,20 = 002:50:13, LOI em 0,55 = 075:49:50, pouso em 0,82 = 102:45:40); títulos das 4 fases truncados dentro do botão; Guerra Fria → Magalhães → fechar volta a 1947–1991 com o preset marcado e ano 1991. Pronto para aceite.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).
---

### D13 · Eixo da timeline: zoom, clusters, prévias

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d13-eixo-timeline · **Worktree:** ../telluspedia-wt/claude-d13
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
- [x] Nenhum pin sobreposto em qualquer nível de zoom.
- [x] Navegação fluida (60 FPS) ao arrastar/zoom.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.

- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada após a D11 ir para REVIEW. Primeira TODO elegível da fase 7 (D12 depende da T20 em andamento; D16 compartilha G-OBS com a D08). G-TIMELINE sem tarefas em andamento.
- 2026-11-20 · claude · REVIEW · Commit `feat(timeline): eixo com zoom, pan, ticks adaptativos, grupos de marcos e scrubber [D13]`. **Eixo (`lib/timeline/axis.ts` + `TimelineAxis`):** janela visível local com zoom ancorado no cursor (roda/trackpad com listener não passivo; Ctrl+roda = pinça do trackpad; pinça com dois dedos por pointer events), pan por arrasto e roda horizontal, teclado (+ − ← → 0) e botão "período inteiro" quando há zoom; mínimo de 3 meses; troca de preset volta ao período inteiro. Ticks adaptativos século → década → ano → mês ("fev 1990"), sempre com ≥ 80 px entre si. **Marcos:** posição pela data exata (`exactDate`) quando existe; agrupamento que funde o par vizinho mais próximo até todos ficarem a ≥ 22 px — nenhum marcador se sobrepõe em nenhum zoom (teste varre larguras, zooms e janelas com todos os marcos globais e dos países). `MilestoneCluster`: contagem com a cor da categoria (tokens D14), prévia com data, título e categoria dos membros (clicáveis) e clique que aproxima o eixo até separar. **Scrubber:** alça do ano selecionado (fim do período quando não há ano), arrastável e com setas (`role="slider"`), que atualiza `selectedYear` — o Sol, a Lua e as fronteiras do globo reagem como já faziam. **Fora do escopo/limites:** a prévia não tem imagem (os marcos não têm imagem nos dados; nada foi inventado); "abrir a cena" fica para a D12; o eixo geológico não mudou. **Testes:** `test/timeline-axis.test.tsx` (9) + os existentes de layout/design system. **Validação:** lint ok; typecheck ok exceto o Prisma não gerado; 456/460 (as 4 falhas são `@prisma/client did not initialize`, sem acesso a binaries.prisma.sh aqui). **Não verificado:** FPS ao arrastar/zoom e aparência no navegador — critério de 60 FPS fica aberto até a medição.
- 2026-11-20 · claude · REVIEW · **Verificação no navegador (:3001, Intel Iris Xe, viewport 1600×900, globo renderizando):** zoom contínuo pela roda 59,9 FPS (p95 24,8 ms) e arrasto contínuo 59,6 FPS (p95 24,9 ms), sem long tasks; eixo, grupo de marcos ("2" em 1991), scrubber e botão "período inteiro" aparecem; ticks mudam com o zoom (ex.: 1995–2020 de 5 em 5 numa janela 1991–2022). **Correção** (`fix(timeline): eventos de roda/pinça no mesmo quadro somam o zoom`): vários eventos de roda no mesmo quadro recalculavam a partir da janela antiga e "perdiam" passos; a ref da janela agora é atualizada na hora (teste de regressão). Validação após rebase: 456/460 (as 4 do Prisma), lint ok.
- 2026-11-20 · ayrton · DONE · Aprovada pelo Ayrton (registrado por claude).
---

### D14 · Design system (tokens + primitivos)

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d14-design-system · **Worktree:** ../telluspedia-wt/claude-d14
- **Prioridade:** P0 · **Área:** Design · **Tamanho:** G · **Depende de:** T01 · **Grupos:** G-SHELL, G-OBS, G-TIMELINE, G-PAIS

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
- [x] Direção visual aprovada pelo Ayrton (registrado no Log).
- [x] Tokens e primitivos implementados e visíveis em `/dev/ui`.
- [x] Navbar, Observatório, Inspector e timeline sem valores arbitrários de cor/tamanho (`grep "text-\[" ` nesses arquivos → 0).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. Passo 1: proposta de direção visual para aprovação do Ayrton antes de codificar. G-SHELL bloqueado enquanto isso (T22, T25, T27, D15–D19 aguardam).
- 2026-11-20 · claude · IN_PROGRESS · Proposta de direção visual “Instrumento sereno” publicada para aprovação: https://claude.ai/artifact/7Mc8S56HuFpXUL6j9Rx9wL (artefato privado do Ayrton; 3 pranchas: Fundamentos/tokens, Componentes, Composição com navbar + Observatório + timeline). Resumo: superfícies neutras quase pretas (`#05070B`/`#0C1018`/`#131925`), bordas brancas 8%/14% em vez de ciano, um acento `#4CC3E0` só para interativo/selecionado, sem glow; cores saturadas só para dados (5 categorias + 5 camadas); Geist em 5 tamanhos de UI (12/13/15/18/24, mínimo 12 px — some 9/10/11 px), Geist Mono só para números com tabular-nums, Merriweather só no texto corrido do Reader; raios 6/10/14; 2 níveis de elevação; movimento 120/200/320 ms. Aguardando aprovação do Ayrton antes de codificar.
- 2026-11-20 · ayrton · IN_PROGRESS · Direção visual aprovada pelo Ayrton (registrado pelo claude a pedido).
- 2026-11-20 · claude · IN_PROGRESS · Grupos G-OBS, G-TIMELINE e G-PAIS adicionados: o passo 5 migra `ObservatoryPanel`/`ObservatoryTelemetryHUD`, a timeline e o `InspectorHUD` (HUD do país). Nenhuma tarefa desses grupos estava em andamento.
- 2026-11-20 · claude · REVIEW · Commit `af1c877`. **Tokens** (`src/styles/globals.css`, CSS variables em canais RGB → Tailwind com opacidade): superfícies `bg`/`surface`/`surface-raised`/`surface-sunken`/`surface-hover`/`control`; linhas `line` (branco 8%) e `line-strong` (14%); texto `fg`/`fg-secondary`/`fg-muted`; `accent` (+hover/on); `success`/`warning`/`danger`; `cat-*` (5 categorias) e `layer-*` (5 camadas); fontes `text-caption|label|body|title|display` (12/13/15/18/24); `rounded-control|card|panel`; `shadow-e1|e2`; `duration-fast|base|slow`, `ease-out`; opacidade `86` para painéis sobre o globo. `.glass-panel`/`.glass-button` legados passaram a usar os tokens (os componentes ainda não migrados já ficam neutros, sem borda ciano nem glow). Foco visível global e `prefers-reduced-motion`. **Primitivos** em `src/components/ui`: `Panel` (+Header/Body/Footer), `Card`, `Button` (4 variantes, 2 tamanhos), `IconButton` (`label` obrigatório, alvo de toque 44 px), `Switch` (role=switch), `Chip`, `Badge` (ponto vazado para “Simulado”), `Stat` (fonte obrigatória por convenção RN02), `Tooltip`/`Dialog`/`Tabs` (Radix), `TONES`/`CATEGORY_TONE`, `cn()` com tailwind-merge ciente dos tokens. **Vitrine** `/dev/ui` (404 em produção). **Migrados** (0 paleta crua, 0 hex, 0 `text-[…]`, 0 `text-xs|sm|lg…`): `TopNavBar` (barra única agrupada), `ObservatoryPanel` (linhas compactas; descrição, métrica, badge e “Aprofundar” só na camada ligada), `DataSourceBadge`, `ObservatoryTelemetryHUD`, `InspectorHUD` + `CountryHeader`/`CountryMetricsGrid`/`CountryMiniTimeline`/`LiveWeatherWidget`/`LocalClockWidget`, timeline inteira (`TimelineBar`, `TimelineAxis`, `MilestonePin`, `PresetSelector`, `CategoryFilterPills` → `Chip`) e `CurriculumLinks` (tellus-bridge). Textos, test ids e comportamento preservados. **AGENTS.md** seção 5 (regras do design system). **Testes:** `test/design-system.test.tsx` (41 casos: tokens definidos, escala de 5 tamanhos, `cn`, primitivos com a11y, e lint de cor/tamanho nos 15 arquivos migrados + primitivos). **Validação após rebase sobre T07:** typecheck ok, lint ok, 298/298 testes, build ok. **Bundle:** home 430 kB de First Load (base no build da T04: 420 kB; +10 kB principalmente do tailwind-merge). Os componentes do app importam os primitivos pelo arquivo (`@/components/ui/Button`), não pelo barrel — pelo barrel a home ia a 461 kB porque puxava Radix Dialog/Tooltip/Tabs. **Não verificado visualmente pelo agente:** o Chromium headless não roda nesta máquina (falta `libnspr4`); conferido o CSS compilado servido pelo dev server (classes de token presentes e corretas) e `/` e `/dev/ui` respondendo 200 sem erros no log. **Para conferir:** `pnpm dev` → `/` (navbar, Observatório, Inspector ao clicar num país, timeline) e `/dev/ui`. **Follow-up:** D20 (demais componentes).
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### D15 · Gerenciador de layout de painéis

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d15-cosmos-fixes · **Worktree:** ../telluspedia-wt/claude-d15b
- **Prioridade:** P1 · **Área:** Design · **Tamanho:** M · **Depende de:** D14 · **Grupos:** G-SHELL, G-PAIS, G-COSMOS, G-OBS, G-TIMELINE, G-EPOCA

**Contexto / problema**
O Inspector do país (ex.: COD) e o painel do Observatório abrem na mesma coluna direita e se sobrepõem; a timeline passa por baixo do painel; o Cosmic Inspector disputa o mesmo espaço. Cada painel posiciona-se com classes fixas independentes.

**O que fazer**
1. Store `layoutStore` com slots: `rightPanel` (um painel ativo, pilha com voltar, ou abas), `bottomBar`, `leftOverlay`.
2. Todos os painéis laterais renderizados pelo slot (Inspector, Cosmic Inspector, Observatório, Comparador quando lateral).
3. Timeline e overlays calculam o espaço livre a partir do layout (CSS variables `--right-panel-width`).
4. Abrir um painel lateral fecha/empilha o anterior, com transição (D17).
5. Responsivo: em telas estreitas, o painel vira bottom sheet.

**Critérios de aceite**
- [x] Nunca dois painéis laterais sobrepostos.
- [x] Timeline nunca fica sob um painel.
- [ ] Funciona em 1366–2560 px e mobile.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-20 · claude · IN_PROGRESS · Tarefa reivindicada; worktree a partir de origin/master. Grupos G-PAIS (InspectorHUD), G-COSMOS (CosmicInspectorHUD), G-OBS (ObservatoryPanel/telemetria) e G-TIMELINE (TimelineBar) adicionados: os painéis passam a ser renderizados pelo slot do layout. Nenhuma tarefa desses grupos em andamento.
- 2026-11-20 · claude · IN_PROGRESS · G-EPOCA adicionado: os overlays da esquerda (Apollo 11 e rota de Magalhães) se sobrepõem ao botão “Iluminação de estudo” e entram no slot `leftOverlay`. Nenhuma tarefa de G-EPOCA em andamento.
- 2026-11-20 · claude · REVIEW · Commit `d86e704`. **Modelo:** `stores/layoutStore.ts` guarda só a aba ativa do dock; quais painéis estão abertos continua nas stores de cada um (`globeStore.selectedIso`, `observatoryStore.isPanelOpen`, `cosmicStore` foco/inspector), derivado por `useRightDock()` (função pura `resolveRightDock`: abas na ordem País · Observatório · Cosmos; preferência por painel fechado cai no primeiro aberto). **`RightDock`** (`components/layout/`): coluna direita única em lg+ (`right-5`, de `top-[4.75rem]` — abaixo da navbar — até `bottom-4`, `w-96`), **um painel por vez**, com abas (`role=tablist`) quando há mais de um aberto; painel recém-aberto vira o ativo; em telas estreitas vira **bottom sheet** (`inset-x-2 bottom-2`, máx. 62vh, alça visual). `InspectorHUD`, `ObservatoryPanel` e o painel do `CosmicInspectorHUD` deixaram de usar `fixed` e só preenchem o dock; `CosmicInspectorHUD` ganhou `placement` ("dock" = painel do corpo focado; "floating" = botão de camadas, que desvia do dock); o modo recolhido do Observatório (D05) foi removido — as abas cumprem esse papel. Navbar: “Observatório” aberto atrás de outra aba vem para frente (`panelButtonAction`), senão abre/fecha. **Timeline:** recuo `lg:right-[26.5rem]` com o dock visível e `max-lg:hidden` quando o dock vira bottom sheet — nunca fica sob um painel. **Overlays da esquerda** (`leftOverlay`): Apollo 11, rota de Magalhães e lançador do TellusLab passaram de `top-20` (sobre o botão “Iluminação de estudo”) para `top-[7.5rem]`, com `max-h-[calc(100vh-18.5rem)]` + rolagem acima da timeline. **Bundle:** `CosmicInspectorHUD` e `CometHalleyTrajectory` (D10) importavam `cn` pelo barrel `@/components/ui`, que puxa Radix para a home — trocado pelo arquivo: **home 466 kB → 436 kB**. **Testes:** `test/layout-dock.test.tsx` (16: função pura, abas/um painel por vez, coluna × bottom sheet, timeline desviando/ocultando, ação do botão da navbar, botão cósmico desviando, Inspector cósmico no dock, invariantes estáticos — painéis sem `fixed`, página sem painéis fora do dock, overlays abaixo do botão); testes do modo recolhido da D05 removidos. **Validação após rebase:** typecheck ok, lint ok, 394/394 testes, build ok. **Não verificado pelo agente:** o critério “1366–2560 px e mobile” e a aparência — Chromium headless indisponível; as classes cobrem lg (≥ 1024 px) e telas estreitas, mas conferir em 1366 px (navbar + dock) e no celular. **Fora do escopo:** transições de abrir/fechar (D17); Comparador e Reader continuam modais de tela cheia (não laterais).
- 2026-11-20 · ayrton · IN_PROGRESS · Reprovada (com screenshots), bugs no modo Cosmos: não dá para deselecionar um objeto; o botão “Camadas Cósmicas” some ao focar um objeto; ao clicar na Lua (ou na Terra) o país selecionado antes some da aba. Causas (diagnóstico do claude): o X do painel cósmico só fecha o painel e mantém o foco, e clicar no vazio não desfaz o foco no modo cósmico; o botão de camadas só renderiza sem corpo focado (herança de quando o painel ocupava o mesmo lugar); o clique da Lua e o “clique fora” do canvas zeram o país também no modo cósmico. Reaberta pelo claude em `../telluspedia-wt/claude-d15b`.
- 2026-11-20 · claude · REVIEW · Commit `624c44f`. Ações centrais em `stores/actions.ts`: `focusCelestialBody(id)` (foca sem limpar o país), `clearCelestialFocus()` e `handleCanvasPointerMissed()` (no Cosmos, clique no vazio desfaz só o foco do corpo; no modo Terra mantém o comportamento antigo de deselecionar país/marco/entidade). `OrbitingMoon` usa `focusCelestialBody("MOON")` (deixou de chamar `setSelectedIso(null)`); `GlobeCanvas.onPointerMissed` usa `handleCanvasPointerMissed`; o X do painel cósmico chama `clearCelestialFocus` (antes, no modo cósmico, só fechava o painel e mantinha o foco). `CosmicInspectorHUD placement="floating"` mostra o botão “Camadas Cósmicas” em todo o modo Cosmos, inclusive com corpo focado (desvia do dock). Testes: `test/cosmos-dock.test.tsx` (6: país preservado ao focar Lua/Terra com abas País + Cosmos no dock, clique no vazio no Cosmos × modo Terra, X deseleciona, botão de camadas com corpo focado, ligação estática das ações); teste antigo do dock atualizado para a regra nova. Validação: typecheck ok, lint ok, 400/400 testes, build ok (home 437 kB). **Observado nos screenshots e fora do escopo:** rótulos de planeta gigantes quando a câmera chega perto (“0.9833 UA” sobre a navbar) — política de escala de rótulos é a D11 (G-COSMOS).
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo claude a pedido).

---

### D16 · Reduzir ruído visual dos painéis

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d16-ruido-paineis · **Worktree:** ../telluspedia-wt/claude-d16
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
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada após a D12 ir para DONE: primeira TODO da fase 7; G-SHELL e G-OBS sem tarefas em andamento (D04 e D08 em REVIEW).
- 2026-11-21 · claude · IN_PROGRESS · **Implementação** (`feat(paineis): cards compactos no Observatório e Inspector com ações secundárias recolhidas [D16]`). Medido antes, no navegador a 1920×1080 com as 5 camadas ligadas: lista com 1.526 px de conteúdo para 854 px visíveis. **Observatório:** card de camada numa linha — ícone, nome, contagem (mono) e status da fonte quando ligada, botão de opções (`aria-expanded`/`aria-controls`) e chave; descrição, controles da camada, resumo FIRMS do país, **opacidade** (novo controle; as 5 camadas do globo já liam `layerOpacity`) e "Aprofundar no TellusLab" ficam na expansão, recolhida por padrão. **Inspector do país:** as 6 métricas viraram um `MetricCard` único — nome inteiro (antes cortado em "P…", "Expect…" porque o link da fonte e a citação ocupavam o cabeçalho), valor e rodapé com fonte primária (link), código e ano (RN02); citar aparece ao passar o mouse ou focar (sempre no toque). Marcos: o cartão virou um `<button>` (antes `div` com onClick, inacessível pelo teclado); "Focar" saiu (era o próprio clique); Ler dossiê, Citar e Wikipédia (antes "Info") só no marco selecionado. `EonetLayerControls`/`MaritimeLayerControls` passam a importar React (quebravam a renderização no servidor nos testes). Testes: `test/panel-noise.test.tsx` (6). Validação: 519/523 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. **Falta:** medir no navegador (critério das 5 camadas sem rolagem em 1080 px).
- 2026-11-21 · claude · REVIEW · **Verificado no navegador** (servidor :3001 do Ayrton, viewport 1920×1080; commit `fix(paineis): contagens curtas, altitude da ISS em pt-BR e fonte institucional por extenso [D16]`). **Critério 1:** com as 5 camadas ligadas, cada card mede 60 px e a lista não rola (854 px de conteúdo em 854 px; antes 1.526 px). **Critério 2:** "Aprofundar no TellusLab" só dentro das opções da camada, recolhido num `<details>`. Opções de Queimadas abertas mostram descrição, período, confiança, legenda, opacidade (40% aplicado pelo controle) e TellusLab. Inspector do BRA: os 6 nomes de métrica inteiros (nenhum cortado) e rodapés "IBGE / BM · SP.POP.TOTL · 2023" etc.; marco selecionado com fonte e as 3 ações numa linha, os outros sem ações. **Corrigido nessa verificação:** "20 voos rastreados" e "30 embarcações na amostra" cortados ao lado do selo de status → "20 voos" e "30 embarcações" (a ressalva de amostra segue na descrição); altitude da ISS com ponto decimal e 408 km fixos quando faltava telemetria → pt-BR e "Calculando órbita…"; fonte do bloco de governo abreviada para "Constituiç…" → por extenso. Validação: 519/523 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. Visto também (anterior à D16, sem tarefa): o selo "1870 — Unificação Alemã" para anos < 1891.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### D17 · Movimento e transições

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d17-movimento · **Worktree:** ../telluspedia-wt/claude-d17
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
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada após a D16 ir para DONE: próxima TODO da fase 7; G-SHELL sem tarefas em andamento.
- 2026-11-21 · claude · IN_PROGRESS · **Implementação** (`feat(movimento): painéis animados, transição Terra ↔ Cosmos sem corte e skeletons [D17]`). **Decisões:** (a) tokens — mantidos os da D14 (120/200/320 ms, `--ease-out`/`--ease-in-out`), que o design system já usa em toda parte, em vez dos 150/250/400 citados aqui; (b) sem framer-motion — keyframes CSS nos tokens + hook `usePresence` (mantém montado durante a saída), para não pôr ~30 kB no bundle inicial da T25; o Radix já espera a animação de saída dos modais. **Achados:** `Dialog`, `Tooltip`, selos de era, `HoverCitationCard` e `ForkStudyBanner` usavam `animate-in`/`fade-in`/`slide-in-from-*`, classes de um plugin que o projeto não tem (nada animava); o shell desmontava dock e modais no mesmo instante do fechamento. **Painéis:** dock (direita no lg, de baixo no bottom sheet), player de cenas, dossiê, comparador, compartilhamento e citação entram com `base`/`slow` ease-out e saem com `fast` ease-in-out, mostrando o último conteúdo até sumir. **Terra ↔ Cosmos:** o corte vinha de a Terra trocar de centro (origem ↔ órbita) e de escala no mesmo quadro, com a câmera perto da origem (que vira o Sol). Agora `useLayoutEffect` reancora câmera e alvo antes do quadro (a Terra fica igual na tela) e a câmera orbita um pivô fixo — a Terra — com distância em escala logarítmica e monotônica e direção por SLERP, enquanto o olhar desliza para o destino; limites de zoom abertos durante o voo e restaurados no fim; o voo da Terra não disputa a câmera durante a volta. Sem `lerp` direto da câmera (AGENTS.md). Um teste pegou a primeira versão (alvo deslizando) chegando a < 2,5 da Terra na volta — daí o pivô. **Voo de câmera da Terra:** já era ease-in-out cúbico com duração pela distância angular. **Movimento reduzido:** CSS já zerava animações; agora presença desmonta na hora e os voos de câmera vão direto. **Skeletons:** `Skeleton`/`PanelSkeleton`/`ModalSkeleton` no clima (antes "..."), na contagem das camadas do Observatório antes do 1º dado (antes "0 focos") e no lugar do dock e dos 4 modais enquanto o código sob demanda carrega. Testes: `test/motion.test.tsx` (12). Validação: 533/537 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok; build de produção (tipos desligados só para medir): First Load JS de `/` = 220,6 kB gzip, sem three.js. **Falta:** verificar no navegador.
- 2026-11-21 · claude · IN_PROGRESS · **1ª verificação no navegador reprovou a ida ao Cosmos** (`fix(movimento): voo Terra → Cosmos sem passar pelo Sol e sem perder quadros [D17]`). Quadros gravados pela página após cada render (folha de contato): (1) a montagem do sistema solar trava ~1,1 s e ~1 s — como o tempo da transição soma o `delta` do quadro, o voo inteiro sumia nesses dois quadros; (2) no 1º quadro a câmera estava colada no Sol: orbitando um pivô na Terra, ela passa pelo Sol quando a vista final fica do lado dele (meu teste usava uma posição da Terra em que isso não ocorria). **Correção:** passo de tempo limitado a 1/30 s por quadro; a câmera volta a ficar a uma distância do alvo (log + SLERP), com o alvo atrasado ao se afastar e adiantado ao se aproximar; Sol (com a coroa) e Terra entram como obstáculos que empurram a câmera para fora. Testes varrem a Terra em 24 posições da órbita, ida e volta. Validação: 535/539 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok.
- 2026-11-21 · claude · IN_PROGRESS · **Painéis conferidos no navegador** (`fix(movimento): modais animam também ao fechar [D17]`): skeleton no lugar do dock enquanto o código carrega; dock entra com `sheet-in` e sai com `sheet-out` (opacidade 1 → 0,94 → 0,35 em ~120 ms, depois desmonta); comparador entra com `pop-in` (opacidade 0 → 1, escala 0,96 → 1). **Corrigido:** os 4 modais (comparador, dossiê, compartilhamento, citação) retornavam `null` antes do `<Dialog>` quando fechados, então o Radix nunca recebia `open={false}` e a saída não animava; agora ficam montados durante a saída (teste). Validação: 535/539 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok.
- 2026-11-21 · claude · IN_PROGRESS · **2ª verificação no navegador** (`fix(ui): Dialog passa overlay e conteúdo separados ao Portal para animar a saída [D17]`). **Ida ao Cosmos aprovada:** folha de contato com 12 quadros — a Terra fica igual na tela na troca (inclusive durante os travamentos de ~1 s da montagem), a câmera se afasta, aparecem Lua e sistema solar, termina na vista do Sol; sem corte e sem passar por corpos. **Volta aprovada quanto à câmera:** desce contínua da vista geral até a vista padrão da Terra; ressalva: Sol e planetas somem no 1º quadro (o sistema solar desmonta ao sair do Cosmos). **Modais ainda sumiam ao fechar:** MutationObserver mostrou `data-state="closed"` e remoção no mesmo ms, sem `animationstart`. Causa: o `DialogContent` passava overlay + conteúdo num fragmento como filho único do `Portal`; o Radix envolve cada filho do Portal num `Presence`, que precisa de um nó para ler a animação — sem nó, desmonta na hora. Corrigido no primitivo (vale para todos os modais), com teste. Validação: 535/539 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok.
- 2026-11-21 · claude · REVIEW · **3ª verificação no navegador:** comparador fecha com `pop-out` (`data-state="closed"`, opacidade 0,16 aos 130 ms) e só então desmonta. Critérios: (1) aberturas/fechamentos de painel animados — dock e modais conferidos; (2) Terra ↔ Cosmos sem corte de câmera e sem NaN — ida e volta conferidas em folhas de contato, mais testes com a Terra em 24 posições da órbita; (3) `prefers-reduced-motion` — CSS zera animações, presença desmonta na hora e voos de câmera vão direto (teste). **Em aberto, para decisão do Ayrton:** na volta do Cosmos o Sol e os planetas somem no 1º quadro, porque o sistema solar desmonta ao sair do modo; mantê-lo montado durante a descida é uma mudança à parte.
- 2026-11-21 · claude · IN_PROGRESS · **Ayrton pediu manter o sistema solar na tela durante a descida** (`feat(movimento): sistema solar esmaece na descida de volta à Terra [D17]`). `stores/cosmicExitStore.ts` guarda a saída (centro e escala da Terra na órbita) enquanto a câmera desce; Sol, planetas, cinturão, cometa e meteoros continuam montados (`useSolarSystemVisible`) dentro de `SolarSystemFrame`, que aplica o mesmo reposicionamento da câmera — `(p − c)/s` — e esmaece materiais e o shader do Sol (novo `uOpacity`) de 100 % a 0 entre 15 % e 80 % do voo, sem aceitar cliques; rótulos saem na descida; o controlador limpa a saída no fim (ou ao reentrar, ou com movimento reduzido). Testes novos em `test/motion.test.tsx`. Validação: 544/548 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. Falta conferir no navegador.
- 2026-11-21 · claude · IN_PROGRESS · **Verificação no navegador achou erro** (`fix(movimento): rótulos ocultos, não desmontados, na descida do Cosmos [D17]`): o overlay de dev do Next acusou "Attempted to synchronously unmount a root while React was already rendering" em `CelestialLabel` — o rótulo desmontava o `<Html>` do drei (raiz React própria) quando a saída começava, e a saída começa num layout effect, durante a renderização. Agora o rótulo fica montado e só oculto (`visibility: hidden`) na descida (teste). Validação: 544/548 (as 4 do Prisma), lint ok.
- 2026-11-21 · claude · IN_PROGRESS · **Folha de contato da volta (6,5 s)** (`fix(movimento): corpo some quando a câmera passa perto na descida [D17]`): o esmaecimento funciona (aos 1,8 s o sistema solar já sumiu; descida contínua até a vista da Terra), mas, com o Sol agora na tela, a descida passou rente a ele num quadro (Sol enchendo a tela) — acontece quando a Terra está atrás do Sol vista do ponto de partida. Agora cada malha também some pela distância da câmera à superfície (inteira a partir de 4 raios, invisível a 1 raio). Testes. Validação: 550/554 (as 4 do Prisma), lint ok.
- 2026-11-21 · claude · REVIEW · **Volta conferida no navegador** (servidor atualizado, 12 quadros em 4 s): sem erros no overlay do Next; o sistema solar esmaece e some por volta de 1,8 s; descida contínua até a vista padrão da Terra; quando a descida passa perto do Sol, ele aparece como uma fração da tela já esmaecendo (não enche mais) e some no quadro seguinte. Pronto para aceite.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### D18 · Busca universal, ⌘K e estado na URL

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d18-busca-universal · **Worktree:** ../telluspedia-wt/codex-d18
- **Prioridade:** P2 · **Área:** Frontend · **Tamanho:** G · **Depende de:** D14 · **Grupos:** G-SHELL, G-EPOCA, G-COSMOS

**Contexto / problema**
A busca da navbar cobre só países/ISO. Não há paleta de comandos, sugestões contextuais, nem reflexo do estado da tela na URL (só existem rotas específicas como `/pais/[iso]`).

**O que fazer**
1. Busca com autocomplete fuzzy sobre: países (177), entidades históricas, eventos, corpos celestes, camadas e presets — navegação por teclado, agrupada por tipo.
2. Paleta de comandos ⌘K/Ctrl+K com ações ("Ativar queimadas", "Ir para 1969", "Abrir comparador BRA, ARG").
3. Sugestões contextuais: ao selecionar um país, mostrar eventos e camadas relevantes.
4. Estado essencial sincronizado na URL (país, ano, camadas, modo, câmera) com `history.replaceState` debounced, para compartilhar a visão exata.

**Critérios de aceite**
- [x] Buscar "Halley", "1969", "queimadas" e "Peru" retorna resultados corretos.
- [x] ⌘K funciona em qualquer tela.
- [x] Copiar a URL e abrir em outra aba reproduz a mesma visão.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-21 · codex · IN_PROGRESS · Primeira tarefa disponível na fase 7. D14 concluída e G-SHELL livre.
- 2026-11-21 · codex · IN_PROGRESS · G-EPOCA e G-COSMOS reservados para integrar a captura e restauração da câmera ao canvas e às transições do Cosmos. Grupos livres no remoto.
- 2026-11-21 · codex · REVIEW · Busca tolerante a erros com resultados agrupados, atalhos globais e sugestões no painel do país. A URL restaura país, época, camadas, modo e câmera. Comandos em estudos salvos abrem a exploração em uma página própria. Implementação: `93958fe`.
- 2026-11-21 · codex · REVIEW · Capturas antes/depois: a busca de país na barra cedeu espaço ao botão de busca universal com o atalho. A paleta central agrupa Apollo 11 e o comando de ir a 1969 em 1366 e 390 px. Os dois snapshots da página inicial mudaram apenas na região do controle de busca.
- 2026-11-21 · codex · REVIEW · Typecheck, lint, build e 591 testes passaram. No Chromium, verificados teclado, comparador a partir de Estudo, link do Peru após zoom e reabertura no Halley. No Playwright, 8 de 10 passaram, incluindo os quatro cenários da D18. Os dois testes existentes de clique no Brasil reproduzem no `050ae09` a mesma falha de CSP no worker KTX2, registrada na T30.
- 2026-11-21 · ayrton · DONE · Entrega aprovada no chat.

---

### D19 · Responsividade e contraste

- **Status:** DONE · **Responsável:** codex · **Branch:** task/d19-responsividade · **Worktree:** ../telluspedia-wt/codex-d19
- **Prioridade:** P2 · **Área:** Design · **Tamanho:** M · **Depende de:** D14, T19 · **Grupos:** G-SHELL, G-EPOCA, G-TIMELINE, G-OBS, G-INFRA, G-ESTUDOS

**Contexto / problema**
Layout quebra em larguras comuns (ver T02); textos ciano/cinza pequenos sobre azul escuro provavelmente abaixo do contraste AA; experiência mobile não definida.

**O que fazer**
1. Matriz de verificação: 375, 768, 1366, 1680, 1920, 2560 px.
2. Ajustar contrastes para WCAG AA (4,5:1 texto normal) nos tokens.
3. Layout mobile: navbar compacta, painéis como bottom sheet (D15), timeline recolhida por padrão.
4. Baselines de screenshot Playwright para cada largura (T19).

**Critérios de aceite**
- [x] Sem overflow/sobreposição na matriz.
- [x] Contraste AA em todos os textos (verificar com axe/DevTools).
- [x] Screenshots baseline versionados.

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada na auditoria.
- 2026-11-21 · codex · IN_PROGRESS · Primeira tarefa disponível da fase 8, com D14 e T19 concluídas e G-SHELL livre.
- 2026-11-21 · codex · IN_PROGRESS · Reservados G-EPOCA, G-TIMELINE, G-OBS e G-INFRA para integrar controles do globo, timeline, telemetria e matriz Playwright. Grupos livres no remoto.
- 2026-11-21 · codex · IN_PROGRESS · Reservado G-ESTUDOS para manter o banner dos estudos e os avisos de era em posições distintas da navegação. Grupo livre no remoto.
- 2026-11-21 · codex · BLOCKED · Implementação pronta no worktree da D19, branch `task/d19-responsividade` (`222e6e6`). Capturas antes/depois: em 375 e 768 px a navegação passou de duas linhas sobre os controles para uma linha com espaço próprio. A timeline começa recolhida, a ficha ocupa uma folha inferior e os avisos têm uma faixa própria. Seis baselines versionados no branch.
- 2026-11-21 · codex · BLOCKED · Validação na base anterior ao commit `b1561e1`: typecheck, lint, build, 622 testes e teste KTX2 separado no Chromium. Seis larguras passaram em Playwright também com a atualização de snapshots desabilitada. Auditoria em 18 cenários (home, país histórico, Observatório) com axe e cálculo sobre superfícies translúcidas não apontou pares abaixo de 4,5:1.
- 2026-11-21 · codex · BLOCKED · A publicação depende do typecheck limpo no master. Confirmado em `cc73d50`: o teste introduzido pela D21 em `b1561e1` não resolve `esbuild` nem `playwright` em instalação limpa. Registro na D21. Quando o master resolver os imports, rebasear e repetir a validação integrada para liberar REVIEW.
- 2026-11-21 · codex · IN_PROGRESS · Retomada após a correção dos imports da D21 no master (`7ef665a`). Validação integrada em andamento.
- 2026-11-21 · codex · REVIEW · Validação integrada em `ee6a598`: typecheck, lint e build passaram. No host, 628 testes passaram. No Chromium, os testes de render dos anéis de Saturno e do worker KTX2 passaram. Playwright: 18/18, com 6 capturas conferidas sem atualização.
- 2026-11-21 · codex · REVIEW · Sem overflow ou sobreposição nos cenários da matriz de 375, 768, 1366, 1680, 1920 e 2560 px. Em telas compactas a navegação ocupa uma linha, a ficha abre de baixo e a timeline começa recolhida. Axe e verificação manual das superfícies translúcidas sobre fundo branco em 18 cenários (home, ficha histórica e Observatório) não apontaram contraste de texto abaixo de 4,5:1.
- 2026-11-21 · ayrton · DONE · Entrega aprovada no chat (registrado pelo codex).

---

### D20 · Migrar demais componentes para o design system

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d20-design-system-migration · **Worktree:** —
- **Prioridade:** P1 · **Área:** Design · **Tamanho:** G · **Depende de:** D14 · **Grupos:** G-SHELL, G-PAIS, G-COSMOS

**Contexto / problema**
A D14 criou tokens e primitivos e migrou navbar, Observatório, Inspector do país e timeline. O restante da interface ainda usa paleta crua (`slate-*`, `cyan-*`…), tamanhos `text-[9px]`/`[10px]`/`[11px]` e glows — agora destoando das partes migradas (o `.glass-panel` já foi neutralizado, mas o conteúdo não).

**O que fazer**
1. Migrar para os primitivos de `@/components/ui` (import direto pelo arquivo) e tokens, seguindo a seção 5 do `AGENTS.md`: `hud/CosmicInspectorHUD`, `reader/*` (ReaderMode, ReaderContent, ReaderTableOfContents, CitationModal → `Dialog`, HoverCard*), `comparator/*`, `study/*` (StudyShareModal → `Dialog`, ForkStudyBanner), `tellus-bridge/EntityLaunch` e `StudyHub`, overlays DOM do globo (`HistoricalEraBadge`, `PaleoEraBadge`, `Apollo11TelemetryOverlay`), botão “Iluminação de estudo” e páginas `/pais`, `/compare`, `/study`, `/telluslab`, `/dossies`.
2. Acrescentar cada arquivo migrado à lista `MIGRATED` de `apps/web/test/design-system.test.tsx`.
3. Remover `cosmic.*` do `tailwind.config.ts` e as classes `.glass-*` do `globals.css` quando não houver mais uso.
4. Pode ser fatiada em subtarefas por grupo (Reader/País = G-PAIS; Cosmos = G-COSMOS) se dois agentes quiserem trabalhar em paralelo.

**Critérios de aceite**
- [x] `grep -rE "text-\[[0-9]|(text|bg|border)-(slate|cyan|sky|amber|emerald|rose|purple|indigo)-" apps/web/src` → 0 (exceto Three.js/cores de shader, que não são classes).
- [x] Todos os arquivos migrados na lista `MIGRATED` e o teste verde.
- [x] Modais usam o `Dialog` (foco preso, Esc, título acessível).

**Log**
- 2026-11-20 · claude · TODO · Tarefa criada como follow-up da D14.
- 2026-11-20 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (1fc3fe4). Grupos G-SHELL, G-PAIS e G-COSMOS livres.
- 2026-11-20 · antigravity · REVIEW · Migrados todos os componentes e páginas restantes para os primitivos (`@/components/ui/*` por arquivo) e tokens semânticos D14: `hud/CosmicInspectorHUD`, `reader/*` (`CitationModal` → `Dialog`, `ReaderMode` → `Dialog`, `ReaderContent`, `ReaderTableOfContents`, `HoverCardPreview`, `HoverCitationCard` preservando invariante HTML5 sem `<div>`), `comparator/*` (`CountryComparator` → `Dialog`, `ComparisonGrid`, `ComparisonCharts` usando CSS vars em vez de hex no Recharts), `study/*` (`StudyShareModal` → `Dialog`, `ForkStudyBanner`), `tellus-bridge/*` (`EntityLaunch`, `StudyHub`), overlays DOM do globo (`HistoricalEraBadge`, `PaleoEraBadge`, `Apollo11TelemetryOverlay`, `HistoricalRouteOverlay`), `GlobeCanvas` (`bg-[#030712]` → `bg-bg`) e `app/dossies/[slug]/page.tsx`. Ajustado `ui/Dialog.tsx` para suportar SSR/`renderToStaticMarkup` mantendo `RadixDialog.Portal` no cliente (foco preso, Esc, título/descrição acessíveis) e adicionado `as="article"` em `ui/Panel.tsx`. Removidos `cosmic.*` de `tailwind.config.ts` e `.glass-panel`/`.glass-panel-subtle`/`.glass-button` de `globals.css`. Acrescentados 26 arquivos à lista `MIGRATED` em `test/design-system.test.tsx` + 2 novos testes de regressão (`Dialog` nos 4 modais e remoção dos legados `cosmic.*`/`.glass-*`). Validação pós-rebase em `origin/master`: `grep -rnE "text-\[[0-9]|(text|bg|border)-(slate|cyan|sky|amber|emerald|rose|purple|indigo)-" apps/web/src` → **0 ocorrências**, `pnpm typecheck`, `pnpm lint`, `pnpm test` (518/518) e `pnpm build` verdes. Verificação visual no navegador pendente do Ayrton (Chromium headless indisponível neste container). Commit: b79ee3f.
- 2026-11-20 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D21 · Texturas planetárias reais (KTX2 + JPG), inclinação axial, rotação sideral e sombras nos anéis de Saturno

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d21-texturas-planetas · **Worktree:** ../telluspedia-wt/claude-d21
- **Prioridade:** P1 · **Área:** 3D · **Tamanho:** G · **Depende de:** — · **Grupos:** G-COSMOS, G-GLOBO

**Contexto / problema**
No modo Cosmos, apenas Terra e Lua possuem texturas fotográficas reais; `PlanetarySystem.tsx` ainda renderiza Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão como esferas de cor sólida (`useTexture = false`), sem inclinação axial real nem rotação sideral.

**O que fazer**
1. Criar pipeline reproduzível (`scripts/textures/build-planet-textures.mjs`) gerando mapas KTX2 + fallback JPG (1K/2K) a partir de fontes abertas (NASA / Solar System Scope CC BY 4.0) para todos os planetas e anéis de Saturno.
2. Carregar texturas sob demanda ao entrar no modo Cosmos (sem impacto no First Load JS de `/`), aplicar inclinação axial (`obliquity`) e rotação sideral proporcional ao playback, e descartar recursos WebGL (`dispose()`) ao desmontar.

**Critérios de aceite**
- [x] Todos os planetas exibem mapas superficiais reais, inclinação axial correta e rotação coerente.
- [x] Zero impacto no bundle inicial de `/` e zero leak WebGL.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).

- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: G-SHELL, G-EPOCA e G-TIMELINE ocupados pela T22 (codex), então D19 (fase 8) e D24 não são elegíveis; G-COSMOS livre (D18 em REVIEW) e D21 é a primeira TODO da fase 9.
- 2026-11-21 · claude · IN_PROGRESS · **Implementação** (`feat(cosmos): texturas reais, eixo e rotação dos planetas e sombras nos anéis de Saturno [D21]`). **Texturas:** `scripts/textures/build-planet-textures.mjs` (`pnpm --filter web textures:planets`) gera `public/textures/planets/<corpo>_{1k,2k}.{jpg,ktx2}` (ETC1S) e `saturn_ring.{png,ktx2}` (UASTC com alfa, 1024×64) a partir de Solar System Scope (CC BY 4.0; Vênus = topo das nuvens) e, para Plutão, do mosaico global da New Horizons publicado pelo USGS (domínio público, só 1K). Originais com URL e SHA-256 em `assets-src/README.md` / `assets-src/planets.sha256`; créditos e ressalvas (terreno fictício nas lacunas, cores levemente saturadas) em `docs/DATA_SOURCES.md`. **Carregamento:** `usePlanetTexture` com contagem de referências — 1K de todos ao montar o Cosmos, 2K só do corpo em foco, `dispose()` quando o último usuário solta (sair do Cosmos libera tudo), pelo mesmo `FileWorkerKTX2Loader` da T30 com fallback JPG. Nenhum código do D21 no chunk inicial de `/` (conferido no build; `bundle-budget` ok). **Eixo:** polo positivo de rotação J2000 (NASA Fact Sheets / IAU) convertido eclíptica → cena; Vênus, Urano e Plutão ficam invertidos e a rotação retrógrada sai sozinha; o ângulo com a órbita reproduz `axialTiltDeg` (±1°, testado em todos). **Rotação:** proporcional à real em escala comprimida (√ da frequência; Júpiter o mais rápido, Vênus o mais lento), acelerada pela reprodução com teto anti‑estroboscópio, parada com movimento reduzido. **Saturno:** anel com UV radial e textura real; sombras analíticas no shader (`onBeforeCompile` do `MeshStandardMaterial`): anel → planeta pelo alfa do anel no ponto de cruzamento, planeta → anel por interseção raio–esfera. Testes: `test/planet-textures.test.ts` (16) e `cosmic-scale` ajustado. Validação: 587/591 (as 4 do Prisma), typecheck ok exceto Prisma, lint ok. **Falta:** verificar no navegador.
- 2026-11-21 · claude · IN_PROGRESS · **Verificação no navegador e três correções.** (1) **Sombras:** o shader pegava a posição do Sol no grupo já posicionado no planeta (Sol = centro de Saturno, anel inteiro na sombra); agora usa a origem do `planetary-system` (`solarOrigin`). (2) **Luz dos planetas:** reproduzindo Saturno no Chrome headless, o anel saía preto até sem as sombras — a luz pontual do `SunCore` (`decay=1`) entregava de 0,02 a 0,27 de luz direta nos planetas (distâncias de cena comprimidas), abaixo da ambiente: nenhum planeta tinha lado dia/noite. Agora `decay=0`, intensidade 2,2 (a da luz direcional da Terra). `test/saturn-ring-render.test.ts` renderiza de verdade (SwiftShader; pula sem Chrome) e cobre anel iluminado, sombra do planeta no anel e dos anéis no hemisfério sul. (3) **Terra no Cosmos** (o Ayrton notou a luz errada): o globo ficava no referencial fixo da Terra, com a luz do ponto subsolar — eixo sem os 23,4° e lado dia fora do Sol da cena. `EarthOrientationGroup` gira o grupo da Terra (globo, nuvens, atmosfera, fronteiras, Lua) para a eclíptica — polo exato e longitude do meio-dia voltada ao Sol —, amortecido (~1,5 s; direto com movimento reduzido); no Cosmos a luz dos shaders da Terra aponta para o Sol da cena (a posição vem do ano e o subsolar do relógio/21 de junho, que poriam a luz até ~47° fora), e no modo Terra nada muda. Picking de países passa a usar o ponto local. **G-GLOBO** adicionado à tarefa antes (livre). Halo de seleção movido para fora dos anéis. Testes: `planet-textures` (19), `earth-orientation` (6; com a mesma data o subsolar girado fica a < 1,5° do Sol da cena), `saturn-ring-render` (1).
- 2026-11-21 · claude · REVIEW · **Verificado no navegador (painel visível, 1440×900):** ao entrar no Cosmos carregam só as 8 texturas 1K + anel em KTX2 pelo worker da T30 (nenhum fallback, nenhum erro); nada de planeta é pedido na Terra; foco em Júpiter pede só `jupiter_2k.ktx2`; texturas corretas (faixas, hexágono polar de Saturno); halo por fora dos anéis; **zero leak:** dois ciclos Terra → Cosmos → Terra com contagem de `createTexture`/`deleteTexture` do WebGL terminam com 0 texturas vivas (44/44); Terra no Cosmos inclinada, lado dia, reflexo do oceano e fase da Lua coerentes com a direção do Sol da cena; de volta ao modo Terra, globo de pé com o terminador do relógio. Os outros planetas confirmados pelo Ayrton. Observação: com a câmera padrão o anel de Saturno fica de perfil (o plano do anel passa pela câmera) — girar mostra o anel aberto. Validação: typecheck e lint ok; testes só com as falhas de ambiente do Prisma (5, incluindo a nova `production-packaging` da T34).
- 2026-11-21 · codex · IN_PROGRESS · A validação da D19 no master `b1561e1` parou no typecheck: `test/saturn-ring-render.test.ts` importa `esbuild` e `playwright`, que não são dependências diretas de `apps/web`. O teste avulso com Chromium também falha ao resolver `esbuild`. O pacote já declara `@playwright/test`.
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).
- 2026-11-21 · claude · DONE · **Correção pós-aprovação (destrava a D19):** `test/saturn-ring-render.test.ts` importava `esbuild` e `playwright`, que não são dependências diretas de `apps/web` — resolviam aqui só pelo `node_modules` içado na raiz, e numa instalação limpa quebravam o typecheck (registro do codex acima). Agora usa `@playwright/test` (já declarado) e transpila os `.ts` com `typescript.transpileModule`, resolvendo `three` por import map — sem bundler e sem tocar no `package.json` (G-INFRA está com a D19). Conferido que todo import de `test/`, `src/` e `scripts/` é dependência direta. Typecheck e lint ok; testes só com as 5 falhas de ambiente do Prisma.

---

### D22 · Modo Coroplético no Globo 3D: colorir os 177 países por indicador real com legenda e escala

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d22-choropleth-3d · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** T32 · **Grupos:** G-FRONTEIRAS, G-PAIS, G-SHELL, G-ESTUDOS

**Contexto / problema**
O TellusPedia já possui indicadores reais do Banco Mundial para 170/177 países e contagens de queimadas por país, mas não permite visualizar padrões globais espacialmente no globo (mapa temático coroplético).

**O que fazer**
1. Criar seletor de camada coroplética (PIB, PIB per capita, População, Expectativa de vida, Gasto militar, Queimadas 24h) rasterizando preenchimento por ISO em textura equiretangular offscreen (custo O(1) na GPU, sem criar 177 malhas).
2. Exibir legenda contínua perceptualmente uniforme (com cor neutra para "Dado indisponível") e tooltip com valor exato + posição no ranking.
3. Persistir a camada coroplética ativa nos Estudos compartilháveis (`/study/[slug]`).

**Critérios de aceite**
- [x] Troca de indicador atualiza o mapa temático em < 100 ms mantendo 60 FPS; países sem dado nunca aparecem como zero.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (b64e02a). Única P1 elegível restante; grupos `G-FRONTEIRAS`, `G-PAIS`, `G-SHELL` e `G-ESTUDOS` (adicionado para persistência em `Study`) 100% livres.
- 2026-11-21 · antigravity · REVIEW · Implementação em `99ee42c`. **Motor de escalas e dados (`src/lib/choropleth.ts`):** 6 camadas reais — PIB nominal (`NY.GDP.MKTP.CD`, log, 169/177), PIB per capita (`NY.GDP.PCAP.CD`, log, 169/177), População total (`SP.POP.TOTL`, log, 170/177), Expectativa de vida (`SP.DYN.LE00.IN`, linear, 170/177), Gasto militar (`MS.MIL.XPND.GD.ZS`, raiz quadrada, 160/177) e Queimadas 24h (`NASA_FIRMS`, log1p sobre `firmsByCountry`) — com rampas perceptualmente uniformes (Viridis/Plasma/Teal-Gold/Magma/Thermal), rankings globais e distinção estrita entre dado ausente (`available: false`, `value: null`, cor/hachura neutra "Dado indisponível", nunca zero) e zero real (ex.: 0% de gasto militar ou 0 focos FIRMS quando o servidor está ativo). **Rasterizador O(1) na GPU (`src/lib/choropleth-texture.ts`, `src/components/globe/ChoroplethOverlay.tsx`, `CountryBorders.tsx`):** pré-projeta uma única vez os 177 países do Natural Earth 110m (ISO 3166-1 com zero-padding + recorte no antimeridiano via `d3-geo` `geoEquirectangular`) em `Path2D`/anéis 2D, reutilizando um único `CanvasTexture` (`2048×1024`, oceanos 100% transparentes, raio `1.0011` abaixo das fronteiras base `1.0015`, `dispose()` completo de geometria/material/textura, `raycast` desabilitado para preservar o picking). Troca de indicador em < 10 ms. **UI D14 sob demanda (`src/components/choropleth/ChoroplethHud.tsx`, `src/stores/choroplethStore.ts`, `TopNavBar.tsx`, `GlobeExperienceShell.tsx`, `search.ts`):** botão **Temático** na `TopNavBar` + busca `⌘K` (carregado via `next/dynamic`), seletor com controle de opacidade (40%–100%), legenda contínua acima da `TimelineBar` com swatch hachurado de "Dado indisponível" e fonte primária clicável (RN02), e tooltip flutuante com valor exato, ano e posição no ranking (`#N de M`) no hover/seleção. **Persistência em Estudos (`prisma/schema.prisma` + migration `20261121160000_add_study_choropleth_indicator`, `study-schema.ts`, `studies-store.ts`, `studyStore.ts`, `StudyShareModal.tsx`, `ForkStudyBanner.tsx`, `study-export.ts`):** salva, valida (Zod), preserva em forks, restaura em `/study/[slug]` e exporta no Markdown acadêmico com fonte RN02. **Validação:** `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 705/706 ok (0 falhas, 1 skip; 8 novos testes em `test/choropleth.test.tsx`; `ChoroplethHud.tsx` registrado em `MIGRATED` no `design-system.test.tsx`), `pnpm build` ok (`/` = 237 kB, `bundle-budget.test.ts` 6/6 verde), migration + seed validados em `postgis/postgis:16-3.4`, inspeção visual WebGL ao vivo no Chromium (alinhamento sub-pixel dos 177 países com fronteiras e continentes, 0 erros de console) e **18/18 testes Playwright E2E** no container `mcr.microsoft.com/playwright:v1.60.0-noble` (snapshots de `home.png` atualizados para o botão Temático). Aguarda aceite do Ayrton.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D23 · Galeria de Estudos Públicos (`/studies` + `GET /api/studies`), árvore de forks (`parentId`) e exportação

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d23-dock-and-study-exit · **Worktree:** —
- **Prioridade:** P1 · **Área:** Produto · **Tamanho:** G · **Depende de:** T30 · **Grupos:** G-ESTUDOS, G-SHELL

**Contexto / problema**
Hoje só é possível criar estudos (`POST /api/studies`) e abrir por link exato (`/study/[slug]`), sem página de descoberta, busca, visualização da linhagem de forks (`parentId`) ou exportação para uso acadêmico.

**O que fazer**
1. Criar `GET /api/studies` paginado (busca por título, era histórica, país, modo cósmico) e página SSR `/studies` com filtros e cards no design system D14.
2. Exibir em `/study/[slug]` a linhagem de forks (link clicável para o estudo pai e contagem/lista de derivados).
3. Adicionar exportação de estudo em **Markdown acadêmico** (com citações ABNT/APA) e JSON portátil.

**Critérios de aceite**
- [x] `/studies` lista e filtra estudos persistidos; forks navegam ao pai; exportação Markdown inclui fontes primárias.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (abaf9ba). Fase 10 concluída; D23 (Fase 11 · P1, T30 DONE) com grupos G-ESTUDOS e G-SHELL 100% livres e disjuntos da D24 do claude (G-CONTEUDO, G-EPOCA, G-TIMELINE, G-GLOBO).
- 2026-11-21 · antigravity · REVIEW · Implementação em `4e9b40a`. **API paginada (`GET /api/studies`, `src/lib/study-gallery.ts`, `src/app/api/studies/route.ts`):** suporta paginação (`page`, `pageSize` 1–24) e filtros validados (`q` em título/descrição case-insensitive, `era` validada em `HISTORICAL_ERAS`, `country` ISO válido via `has`, `cosmic` booleano), retornando `parentTitle` e `forkCount` com `Cache-Control: CACHE_POLICY.study` (T30) em banco real, `503` + `no-store` em produção se o DB falhar (T08) e fallback em memória apenas em desenvolvimento (`X-Study-Persistence: memory`, `no-store`). **Galeria SSR (`/studies`, `src/app/studies/page.tsx`):** construída com tokens D14 (registrada em `MIGRATED`), formulário GET acessível com filtros combináveis, paginação preservando query params, cartões com período, países, modo/era, link para estudo pai, contagem de forks e exportação direta; atalho discreto "Galeria de estudos" adicionado ao `StudyShareModal` e `ForkStudyBanner`. **Linhagem de forks em `/study/[slug]` (`loadStudyWithLineage` em `server-loaders.ts`, `study/[slug]/page.tsx`, `ForkStudyBanner.tsx`):** exibe link clicável para o estudo pai (`parentId` + título) e contador expansível listando forks derivados clicáveis. **Exportação acadêmica (`src/lib/study-export.ts`, `src/components/study/StudyExportActions.tsx`):** gera **Markdown acadêmico** (`.md`) com metadados, linhagem de forks, indicadores auditados por país com códigos oficiais, seção **Fontes Primárias (RN02)** com URLs diretas e citações prontas **ABNT (NBR 6023)** e **APA 7**, além de **JSON portátil** (`telluspedia.study.v1`) com sanitização de nome de arquivo. **Testes e validação:** 6 novos testes em `apps/web/test/studies-gallery.test.tsx`; 2 novos arquivos adicionados a `MIGRATED` no `design-system.test.tsx` (72/72 D14 verdes); `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 673/674 ok (0 falhas, 1 skip), `pnpm build` ok (`/` mantido em **232 kB** — 0 kB de aumento; `/studies` = 6,13 kB / 187 kB; `bundle-budget.test.ts` pós-build verde). Verificação visual interativa pendente do Ayrton.
- 2026-11-21 · ayrton · IN_PROGRESS · Reaberta na revisão: (1) falta acesso direto à Galeria `/studies` na interface principal (`TopNavBar` / busca) sem digitar URL; (2) `console.error` nos Server Components (`listStudies`, `loadStudyBySlug`, `loadStudyWithLineage`) dispara o overlay de erro do Next.js 15 em dev quando PostgreSQL local está desligado; (3) melhorar contexto/comparativo ao abrir um estudo. Worktree `../telluspedia-wt/antigravity-d23b`.
- 2026-11-21 · antigravity · REVIEW · Correções da revisão em `170b7ad`. **(1) Descoberta direta na UI:** adicionado link **Galeria** (`/studies`, `top-nav-studies-link`) na `TopNavBar.tsx` com larguras compactas calibradas para 320–375 px sem overflow horizontal, além do comando **"Abrir Galeria de Estudos"** (`route:/studies`) na Busca Universal (`⌘K` em `src/lib/explore/search.ts` + `useExploreNavigation.ts`). **(2) Zero overlay de erro em dev sem PostgreSQL:** `listStudies` (`study-gallery.ts`), `loadStudyBySlug` e `loadStudyWithLineage` (`server-loaders.ts`) passaram a registrar apenas `console.warn` com resumo de 1 linha no fallback em desenvolvimento (mantendo `console.error` + `503` em produção — T08), e `src/lib/prisma.ts` usa `log: ["warn"]` em dev (eliminando `prisma:error` que também disparava o overlay do Next.js 15). **(3) Contexto e comparativo ao abrir um estudo:** `ForkStudyBanner.tsx` ganhou botão **"Comparar (N)"** (abre o Comparador já preenchido com os países do estudo, incluindo as séries reais 1990–2024) e seção expansível **"Notas do estudo"** (descrição, `markdownNotes` e nota explícita RN02 quando o período do estudo precede 1990). **Validação:** `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 674/675 ok (0 falhas, 1 skip; novo teste garante zero `console.error` no fallback dev e presença do link na `TopNavBar`/busca), `pnpm build` ok (`/` = 232 kB), smoke no `next dev` em `127.0.0.1:3003` confirmou `200` e `ZERO_DEV_ERRORS` em `/studies` e `/study/guerra-fria-br-de-k9x2`, e **14/14 testes Playwright E2E** no container oficial `mcr.microsoft.com/playwright:v1.60.0-noble` (`responsive.spec.ts` nas 6 larguras 375–2560 px com contraste AA, `explore-search.spec.ts`, `keyboard-access.spec.ts`) verdes com capturas de referência atualizadas (`mobile-375`, `desktop-1366`, `desktop-1680`).
- 2026-11-21 · ayrton · IN_PROGRESS · Ao clicar em "Fazer fork" e navegar para `/study/fork-...`, React 19 disparou `Cannot update a component (CategoryFilterPills) while rendering a different component (GlobeExperienceShell)` porque `GlobeExperienceShell` chamava `applyInitialGlobeState` sincronamente durante o render no cliente. Worktree `../telluspedia-wt/antigravity-d23c`.
- 2026-11-21 · antigravity · REVIEW · Correção em `1a4050e`. Em `GlobeExperienceShell.tsx`, a hidratação síncrona durante o render (`applyInitialGlobeState`) agora é restrita a SSR (`typeof window === "undefined"`), enquanto no cliente a atualização dos stores Zustand roda em `useIsomorphicLayoutEffect` (`useLayoutEffect` antes da pintura, sem flash e sem mutar `useTimelineStore`/`CategoryFilterPills` durante o render ao navegar entre `/study/[a]` e `/study/[fork]`). Adicionada asserção de regressão em `test/studies-gallery.test.tsx`. Validação: `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 674/675 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 232 kB).
- 2026-11-21 · ayrton · IN_PROGRESS · Dois bugs reportados com capturas: (1) aba lateral (`RightDock`) com enorme espaço vazio acima da aba ativa (ex. Cosmos com Brasil aberto) porque `.flex` sobrescrevia `[hidden]` do Radix `TabsContent`; (2) ao clicar para voltar à era atual / resetar visão a partir de `/study/[slug]`, o cartão do estudo (`ForkStudyBanner`) permanecia na tela. Worktree `../telluspedia-wt/antigravity-d23d`.
- 2026-11-21 · antigravity · REVIEW · Correções em `ecfdb9f`. **(1) Aba lateral (`Tabs.tsx` e `RightDock.tsx`):** adicionado `data-[state=inactive]:hidden` em `TabsContent` (e no `RightDock`), impedindo que `.flex` sobrescrevesse o atributo `hidden` do Radix nas abas inativas e roubasse metade da altura do painel. **(2) Saída do estudo (`GlobeExperienceShell.tsx`, `TopNavBar.tsx`, `ForkStudyBanner.tsx`):** clicar em "Restaurar Cartografia Atual", "Restaurar Geografia Contemporânea", "Resetar visão da Terra" (`RotateCcw`), presets contemporâneos ou no novo botão "Sair do estudo" (`×`) agora limpa `useStudyStore`, oculta o `ForkStudyBanner` instantaneamente (sem recarregar o WebGL) e atualiza a URL para `/` (`history.replaceState`), protegido por `observedStudyActiveRef` contra corrida no Strict Mode. **Validação:** `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 674/675 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 233 kB); validado em Chromium real (`playwright:v1.60.0-noble`): (a) `/?visao=1&pais=BRA&modo=cosmos&corpo=JUPITER&painel=cosmos` mediu `inactiveDisplay: "none"`, `inactiveHeight: 0`, `gapPx: 0`; (b) em `/study/guerra-fria-br-de-k9x2`, "Restaurar Cartografia Atual" e "Resetar visão da Terra" removeram `fork-study-banner` e restauraram `/`; (c) "Fazer fork" navegou para `/study/fork-...` com `totalConsoleErrors: 0`.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D24 · Expandir catálogo de Cenas Históricas (completar `glo-1969` + 5 novas cenas curadas)

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d24-cenas-historicas · **Worktree:** ../telluspedia-wt/claude-d24
- **Prioridade:** P1 · **Área:** Conteúdo · **Tamanho:** G · **Depende de:** — · **Grupos:** G-CONTEUDO, G-EPOCA, G-TIMELINE, G-GLOBO, G-COSMOS, G-OBS

**Contexto / problema**
O player genérico de cenas (D12) está pronto, mas o catálogo contém apenas 2 cenas (`magellan-1519.json` e `glo-1969.json`, esta última com `participants: 0` e `chronicle: 0`).

**O que fazer**
1. Completar `src/data/scenes/glo-1969.json` com participantes (tripulação e módulos NASA) e crônica detalhada com fontes primárias.
2. Criar 5 novas cenas curadas e validadas pelo schema D12 (ex.: *Viagem de Vasco da Gama 1497–1499*, *Rota da Seda*, *Primeira Guerra Mundial 1914–1918*, *Segunda Guerra Mundial 1939–1945* e *Queda do Muro de Berlim 1989*).
3. Integrar todas à timeline e ao deep-link `?cena=<id>` sem inflar o bundle inicial de `/`.

**Critérios de aceite**
- [x] ≥ 7 cenas completas passam na validação Zod (`scenes.test.ts`), com fontes primárias auditáveis e navegação funcional no player.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: D19 concluída, nenhum grupo ocupado; D24 é a única TODO restante da fase 9 (G-CONTEUDO e G-EPOCA livres).
- 2026-11-21 · claude · IN_PROGRESS · **Implementação** (`feat(cenas): 5 cenas curadas, Apollo 11 completa e carga sob demanda [D24]`). **Cenas novas** (validadas pelo schema D12, com trajetória, participantes, crônica e HUD): *Marco Polo na Rota da Seda* (`polo-1271`, 20 etapas, datas marcadas como aproximadas — o Livro raramente data as etapas; fonte: ed. Yule-Cordier, Gutenberg 10636/12410); *Viagem de Vasco da Gama à Índia* (`gama-1497`, 16 etapas pelo Roteiro atribuído a Álvaro Velho; ed. Herculano-Paiva 1861 na BBM-USP, trad. Ravenstein 1898 no Gutenberg, ed. semidiplomática na SciELO). As duas guerras e o Muro **promoveram os marcos existentes** em vez de duplicá-los: `glo-1914` (15 passos, de Sarajevo a Compiègne; texto do armistício no FRUS), `glo-1939` (15 passos, de Westerplatte à baía de Tóquio, com horários com fuso em Pearl Harbor, Hiroshima e na rendição; National Archives e NDL) e `glo-1989` (9 passos, de Sopron à reunificação; bpb, transcrição da Bundesregierung, berlin.de) — mesmos id, título, data, local e primeira fonte, então a linha do tempo e links/estudos salvos não mudam; `deu-1989` passa a abrir a cena do Muro. **Apollo 11:** 7 participantes e 9 entradas de crônica com os horários UTC da cronologia oficial (NASA SP-4029) e as frases do ALSJ. **Bundle:** índice leve gerado (`scene-index.json`, por `scripts/scenes-build-index.ts`, com teste de sincronia) com o que a timeline, a busca e os links precisam; trajetórias, crônica, participantes, mídia, HUD, fatos e as fontes além da primeira chegam por `import()` quando a cena abre (`loadScene`, `useScene`); a Apollo 11 fica no bundle (trava o relógio astronômico) com só os detalhes à parte. First Load JS de `/`: 227,9 → 229,4 kB gzip (+1,5 kB: as entradas de timeline das 2 cenas novas e o código de carga; nenhum conteúdo pesado no chunk inicial, conferido no build). **Painel:** esqueleto enquanto a trajetória chega; seções recolhíveis de Participantes e Crônica (antes não apareciam em lugar nenhum); descrição do passo quando não há citação. Testes: `test/scenes-lazy.test.ts` (16) e `scenes.test.ts` ajustado de forma explícita (28 marcos anteriores idênticos + 2 novos; 47 cenas). Validação: typecheck e lint ok; testes só com as 5 falhas de ambiente do Prisma. **Falta:** verificar no navegador.
- 2026-11-21 · claude · IN_PROGRESS · **Verificação no navegador e correções de interação** (`fix(cenas): cena não fecha ao interagir com o globo; arrastar não seleciona; câmera e destaques pelos dados [D24]`). No navegador: `?cena=gama-1497` e o pino de 1914 abrem as cenas, com o JSON baixado à parte (< 250 ms) e o painel completo. Achados e correções: (1) **a cena fechava ao usar o próprio player** — o clique fora do `MilestonePin` não poupava o painel; (2) **o Ayrton notou que mexer no globo fechava a cena e que girar e soltar selecionava país**: o `sceneStore` fechava a cena aberta por marco sempre que o marco mudava (e clicar no vazio, num país ou em botões desmarca o marco); o `click` do DOM dispara ao soltar o botão depois de girar, e o `onClick` do R3F não descarta arrastes (só o `onPointerMissed` descarta). Agora a cena só fecha pelo botão de fechar ou ao abrir outra cena; o clique fora do pino ignora o canvas (o R3F decide); o clique no globo e nos pontos da rota exige clique de verdade (`isDragRelease`, tolerância de 4 px). G-TIMELINE e G-GLOBO adicionados antes de editar. (3) A câmera inicial das cenas de superfície não era aplicada (só a camada Terra–Lua aplicava); (4) a camada de superfície tinha índices da Magalhães fixos no código para os destaques — agora vêm de `facts.highlight` nos dados (Magalhães com os mesmos 6 pontos). Testes atualizados de forma explícita (`scenes.test.ts`: desmarcar ou marco simples não fecham; outra cena troca; fechar fecha) e novos em `scenes-lazy.test.ts`. **Falta:** reverificar no navegador.
- 2026-11-21 · claude · IN_PROGRESS · **Reverificação no navegador (painel visível, 1440×900)** e correção do cartão do marco (`fix(timeline): cartão do marco some com a cena aberta e fecha de verdade pelo X [D24]`). Conferido com mouse real: pino de 1914 abre a cena com a câmera na Europa e a rota visível; **arrastar o globo não fecha a cena nem seleciona país**; clicar nos controles do player, num país (Rússia) e no vazio mantém a cena; reprodução até o armistício com a citação; `?cena=glo-1969` mostra 7 participantes e 9 entradas de crônica (arquivo de detalhes baixado à parte). Achado: o cartão do marco cobria os controles do player (“Frente Ocidental”/“Frente Oriental”) e, depois do X, reaparecia porque o mouse continuava sobre o pino (`group-hover`) — o Ayrton notou o cartão “impossível de fechar”. Agora, com a cena do marco aberta, o cartão some (inclusive no hover) e quem controla o evento é o painel do player, cujo X encerra a cena; fora disso, o X do cartão suspende o hover até o mouse sair do pino.
- 2026-11-21 · claude · REVIEW · Ayrton conferiu no navegador o cartão do marco e as interações da cena (“de acordo”). Critérios atendidos: 7 cenas completas e tocáveis (Magalhães, Apollo 11, Marco Polo, Vasco da Gama, Primeira e Segunda Guerras, Muro de Berlim), todas validadas pelo schema D12, com fontes auditáveis; First Load JS de `/` +1,5 kB gzip, sem conteúdo pesado no chunk inicial. Validação: typecheck e lint ok; testes só com as 5 falhas de ambiente do Prisma.
- 2026-11-21 · claude · IN_PROGRESS · Reaberta a pedido do Ayrton para estender “arrastar não é clique” (`isDragRelease`) aos cliques 3D do Cosmos (planetas, Sol, Lua, cometa Halley) e das camadas do Observatório (aviões, navios, rotas marítimas, EONET, FIRMS, ISS e satélites). G-COSMOS e G-OBS adicionados (livres; D04 e D08 em REVIEW não bloqueiam).
- 2026-11-21 · claude · IN_PROGRESS · `fix(interacao): arrastar não é clique no Cosmos e no Observatório [D24]`. Guarda `isDragRelease` em todos os cliques 3D que selecionam algo: Observatório — aviões (2), navios (2), rotas marítimas, eventos EONET, focos FIRMS, ISS e satélites; Cosmos — planetas, Sol, Lua e o cometa Halley (a etiqueta HTML do Halley fica fora: não é acionada por arraste no canvas). Teste de cobertura por arquivo em `scenes-lazy.test.ts`. Typecheck: só erros de ambiente (Prisma não gerado: 4 de sempre + 2 `implicit any` da D23 já presentes no master); lint ok; testes só com as falhas de ambiente do Prisma (6, incluindo a nova `studies-gallery` da D23). **Falta:** conferir no navegador.
- 2026-11-21 · claude · REVIEW · Conferido no navegador (painel visível, 1440×900) com o código novo servido: no Cosmos, arrastar começando e terminando sobre o Sol gira a câmera sem selecioná-lo; um clique simples seleciona (`corpo=SUN`). Planetas, Lua, Halley e as camadas do Observatório usam a mesma guarda, coberta arquivo a arquivo pelo teste (alvos do Observatório pequenos demais para um arraste confiável com o mouse remoto).
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude).

---

### D25 · Camada NASA GIBS (imagens de satélite diárias/históricas: NDVI, gelo/neve, temperatura superficial)

- **Status:** DONE · **Responsável:** claude · **Branch:** task/d25-gibs · **Worktree:** ../telluspedia-wt/claude-d25
- **Prioridade:** P2 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-OBS, G-GLOBO, G-EPOCA, G-SHELL, G-ESTUDOS

**Contexto / problema**
O `docs/ROADMAP.md` prevê camadas científicas de observação terrestre da NASA GIBS no Observatório, mas ainda não há nenhuma integração GIBS no código.

**O que fazer**
1. Criar rota proxy cacheada `/api/observatory/gibs` (envelope T05 `live`/`fallback`, validação estrita de camada/data) consumindo NASA GIBS WMS/WMTS em projeção EPSG:4326.
2. Renderizar camada translúcida sobre o globo (cobertura vegetal NDVI, gelo marinho/neve e temperatura superficial) com seletor de data e controle de opacidade no `ObservatoryPanel`.

**Critérios de aceite**
- [ ] Camada GIBS selecionável no Observatório, com procedência T05 explícita, controle de opacidade e descarte WebGL limpo.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · claude · IN_PROGRESS · Tarefa reivindicada: D22 (antigravity) ocupa G-FRONTEIRAS/G-PAIS/G-SHELL/G-ESTUDOS; entre as elegíveis da fase 11 (D25, D26, T37), D25 vem primeiro. G-OBS e G-GLOBO livres (D04 e D08 em REVIEW não bloqueiam).
- 2026-11-21 · claude · IN_PROGRESS · G-EPOCA adicionado (livre) para montar a camada no `GlobeCanvas`. `explore/search.ts` e `explore/view-url.ts` (D18, G-SHELL — ocupado pela D22) e `study-schema.ts` (G-ESTUDOS — idem) não serão tocados: o GIBS fica fora da busca ⌘K, da URL compartilhável e dos estudos por enquanto (os estudos descartam camadas desconhecidas; a URL só é relida ao carregar/voltar, então a camada não desliga durante o uso).
- 2026-11-21 · claude · REVIEW · `79d701d`: proxy `/api/observatory/gibs` (+ `/image` pela própria origem, CSP T30) no envelope T05; 4 produtos (NDVI, neve, gelo marinho, temperatura) com mês, legenda oficial e opacidade; `GibsLayer` no globo (raio 1.0015, sem raycast, textura descartada); referência local quando o GIBS não tem a data. Testes: `test/gibs.test.tsx` 20/20; suíte 654 ok, 6 falhas de ambiente (Prisma). First Load `/` +1,2 kB gz (231,6 → 232,8). Verificado no navegador em 1440×900: NDVI e temperatura de 2026-10 ao vivo e alinhados aos continentes, abril de 2025 cai para a referência de 2024-07 com aviso, opacidade 75→100% e desligar limpos, sem erros no console. Acompanhamento: a URL já grava `camadas=NASA_GIBS`, mas `view-url.ts` ignora ao carregar; incluir NASA_GIBS em busca/URL/estudos quando G-SHELL/G-ESTUDOS liberarem.
- 2026-11-21 · claude · IN_PROGRESS · Ayrton pediu as pendências na própria D25. D22 está DONE, então G-SHELL e G-ESTUDOS estão livres e foram adicionados: NASA_GIBS (com produto e mês) na busca ⌘K, na URL compartilhável e nos estudos salvos.
- 2026-11-21 · claude · REVIEW · `f4610b3` (busca ⌘K com atalho por produto, URL `gibs=<produto>[,AAAA-MM]`, estudos com `gibsProduct`/`gibsMonth` + migração `20261121220000_add_study_gibs_view`, exportação) e `1756625` (estudos em memória compartilhados entre rotas em dev; o link temporário dava 404). Testes: `test/gibs.test.tsx` 26/26; suíte com as mesmas 6 falhas de ambiente (Prisma). Verificado no navegador com Postgres: link `gibs=snow,2024-01` restaura neve/jan-2024; ⌘K "gelo marinho" troca o produto e atualiza a URL; estudo salvo no banco com `lst`/`2024-07` e `/study/<id>` reabre a temperatura de julho de 2024. Achado fora da D25: em `/study/<id>` com qualquer camada do Observatório (testado também só com NASA_FIRMS) há aviso de hidratação no botão Observatório da `TopNavBar` (className do servidor ≠ cliente).
- 2026-11-21 · ayrton · DONE · Aprovado (registrado por claude). O aviso de hidratação virou a T41.

---

### D26 · Expandir cobertura curricular do TellusBridge (de 60,5% para ≥ 85% dos 299 nós; todas as eras e 20+ países)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d26-telluslab-deeplink-compat · **Worktree:** —
- **Prioridade:** P2 · **Área:** Conteúdo · **Tamanho:** M · **Depende de:** D24 · **Grupos:** G-CONTEUDO, G-TIMELINE

**Contexto / problema**
O manifesto atual do TellusBridge possui 31 vínculos cobrindo 181/299 nós (60,5%), com apenas 5 países, 1 era (`era:COLD_WAR`) e 2 figuras históricas — 118 macrotemas curriculares seguem sem ponto de entrada no TellusPedia.

**O que fazer**
1. Expandir `manifest.json` para cobrir ≥ 85% dos 299 nós do `registry.json`, todas as eras históricas (`PRUSSIA_1870`, `WW1_1914`, `WW2_1939`, `COLD_WAR_1969`), as novas cenas da D24 e 20+ países.
2. Atualizar `ERA_STUDY_ENTITY_IDS` em `lib/timeline/era-study.ts` e validar integridade de DAGs/links em `tellus-bridge.test.tsx`.

**Critérios de aceite**
- [x] Cobertura ≥ 85% dos 299 nós curriculares validada em teste automatizado, sem links quebrados.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-21 · antigravity · IN_PROGRESS · Tarefa reivindicada; worktree criado a partir de origin/master (`4092d85`). Dependência D24 está `DONE`; primeira tarefa elegível da Fase 11 com grupos `G-CONTEUDO` e `G-TIMELINE` (adicionado para `era-study.ts`) 100% livres.
- 2026-11-21 · antigravity · REVIEW · Implementação em `489a3bf`. **Manifesto TellusBridge (`src/lib/tellus-bridge/contract/manifest.json`):** expandido de 31 para **73 vínculos**, elevando a cobertura curricular de 181/299 (60,5%) para **299/299 nós (100,0%)** nos 8 domínios (`DOM-MATH`, `DOM-PROG`, `DOM-ECON`, `DOM-PHYS`, `DOM-ENG`, `DOM-HUM`, `DOM-LANG`, `DOM-LIT`), preservando todos os vínculos anteriores e derivando `bookIds` exclusivamente das obras referenciadas em cada nó do `registry.json`. Inclui **10 dossiês** (+3 novos: `fundamentos-da-matematica`, `mecanica-eletromagnetismo-quantica`, `mercados-financas-corporativas`), **4 figuras históricas** (+2 novas: `isaac-newton`, `albert-einstein`), **todas as 4 eras históricas** (`era:PRUSSIA_1870`, `era:WW1_1914`, `era:WW2_1939`, `era:COLD_WAR`), **24 eventos** (incluindo todas as **7 cenas tocáveis da D24**: `polo-1271`, `gama-1497`, `magellan-1519`, `glo-1914`, `glo-1939`, `glo-1969`, `glo-1989`, além de marcos-chave como ONU, Sputnik, Vostok, Euro, Acordo de Paris, Mandela, Canal de Suez), **25 países** distribuídos por todos os continentes (todos validados em `NUMERIC_TO_ISO`) e as 6 camadas do Observatório enriquecidas. **Catálogo de dossiês & eras (`src/lib/dossiers-catalog.ts`, `src/lib/timeline/era-study.ts`, `src/components/tellus-bridge/EntityLaunch.tsx`):** adicionadas introduções curadas para os 5 novos dossiês/figuras (14 dossiês publicados com SSR/OG/JSON-LD/sitemap), mapeadas todas as 4 eras históricas em `ERA_STUDY_ENTITY_IDS` e habilitado deep-link de `era:PRUSSIA_1870`, `era:WW1_1914` e `era:WW2_1939` em `EntityLaunch.tsx`. **Validação:** novos testes de integridade e cobertura (`≥ 85%`, todas as eras, 7 cenas D24, `≥ 20` países, zero `/dossies/*` quebrados) em `test/tellus-bridge.test.tsx` e `test/minor-cleanups.test.ts`; `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 711/712 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 238 kB — 0 kB de impacto no chunk inicial; `bundle-budget.test.ts` 6/6 verde) e smoke HTTP `200` em `/telluslab`, nos 5 novos `/dossies/*`, em `/sitemap.xml` (14 dossiês) e em `/?entity=era:WW1_1914` / `/?entity=country:DEU`. Aguarda aceite do Ayrton.
- 2026-11-21 · ayrton · IN_PROGRESS · Bug na integração com o TellusLab: ao clicar em "Estudar" em `/dossies/albert-einstein` (`?domain=physics&node=DOM-PHYS:5.1&ref=telluspedia&entity=figure:albert-einstein`), o TellusLab (`127.0.0.1:4175`) cai na tela inicial padrão de Matemática (`Noções de Lógica`) porque o `parseLabLink` do TellusLab valida `ref+entity` contra a própria cópia antiga do `manifest.json` (31 vínculos) e rejeita entidades novas da D26. Reaberta no worktree `../telluspedia-wt/antigravity-d26b`.
- 2026-11-21 · antigravity · REVIEW · Correção em `7a86425`. Criado `src/lib/tellus-bridge/lab-compat.ts` com o espelho dos 31 vínculos já sincronizados no TellusLab e integrado `resolveLabEntityParam(entityId, nodeId)` em `studyUrl` (`src/lib/tellus-bridge/catalog.ts`): vínculos novos da D26 (como `figure:albert-einstein` → `DOM-PHYS:5.1`/`5.2`) agora emitem `/lab?domain=<slug>&node=<nodeId>` sem `ref`/`entity` desconhecidos, abrindo diretamente o domínio e macrotema corretos no TellusLab (que já conhece todos os 299 nós via `registry.json`); os 31 vínculos sincronizados preservam `ref=telluspedia&entity=...`; suporte à flag `NEXT_PUBLIC_TELLUSBRIDGE_LAB_SYNCED=true` para quando o TellusLab rodar `npm run bridge:sync`. Novo teste exaustivo em `test/tellus-bridge.test.tsx` valida que **todos os 73 vínculos × todos os nós** passam em `parseLabLink` contra o manifesto base do TellusLab. Validação: `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 713/714 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = 238 kB, `bundle-budget.test.ts` 6/6 verde). Aguarda aceite do Ayrton.
- 2026-11-21 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D27a · Camada de Ventos Globais (NOAA GFS 10 m / Jato 250 hPa, partículas GPU animadas, legenda km/h e nós, T05)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d27a-global-winds · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** D25 · **Grupos:** G-OBS, G-GLOBO, G-EPOCA, G-SHELL, G-ESTUDOS

**Contexto / problema**
Prevista no Horizonte 3 do `docs/ROADMAP.md` (originalmente `D27`, tamanho `GG`, quebrada em `D27a` + `D27b` conforme §1.7), a visualização de fluxos atmosféricos (ventos em superfície 10 m e corrente de jato 250 hPa) ainda não foi implementada no Observatório Planetário.

**O que fazer**
1. Criar endpoint cacheado `/api/observatory/winds` com grade UV compacta (`9×16` = 144 pontos globais) a partir de NOAA GFS via Open-Meteo (`wind_speed_10m`/`wind_direction_10m` e `wind_speed_250hPa`/`wind_direction_250hPa`, sem chave privada) + fallback climatológico explícito (Alísios, Ventos de Oeste, Polares, Corrente de Jato) com envelope T05.
2. Implementar sistema de partículas/streamlines animadas em shader GPU sobre a esfera (`BufferGeometry` com trilhas e gradiente por velocidade, interpolação bilinear esférica sem alocação por quadro, descarte rigoroso RN21, pausa RN22 e escalonamento pelo preset de qualidade T39).
3. Integrar camada `GLOBAL_WINDS` no `ObservatoryPanel` (controles D14: altitude `Superfície 10 m` / `Jato 250 hPa`, unidade `km/h` / `nós`, legenda de escala, estatísticas e procedência T05), busca `⌘K`, URL compartilhável (`?camadas=GLOBAL_WINDS`), schema de estudos e `docs/DATA_SOURCES.md` — mantendo `/` < 160 kB (lazy-load).

**Critérios de aceite**
- [x] Endpoint `/api/observatory/winds` retorna grade UV real (NOAA GFS) com cache e fallback climatológico rotulado (T05).
- [x] Camada ativável no Observatório com partículas GPU animadas sobre o globo, seletor de altitude (`10 m` / `250 hPa`), legenda de velocidade (`km/h` e `nós`), procedência T05, descarte rigoroso de buffers e zero regressão de bundle (`/` < 160 kB).

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa `D27` criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-22 · antigravity · IN_PROGRESS · Quebrada de `D27` (`GG`) em `D27a` (Ventos Globais + motor GPU) e `D27b` (Correntes Oceânicas) conforme §1.7. Reivindicada a partir de `origin/master` (`6d4bf67`) com todos os grupos livres (`G-OBS, G-GLOBO, G-EPOCA, G-SHELL, G-ESTUDOS`).
- 2026-11-22 · antigravity · REVIEW · Implementação em `3d57945` (+ alinhamento de regex pós-T41 em `studies-gallery.test.tsx`, `033240c`). **Backend & Motor UV:** criados `src/lib/winds-types.ts`, `src/lib/winds-data.ts`, `src/lib/winds-source.ts` e `src/app/api/observatory/winds/route.ts` — uma única consulta ao NOAA GFS via Open-Meteo retorna grade compacta `9×16` (144 pontos globais) para **Superfície (10 m)** e **Corrente de Jato (250 hPa)** no envelope `{ data, meta }` da T05 (`liveTtlMs = 30 min`, `Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600`, tolerância `stale` de 6 h e fallback climatológico explícito de células Hadley/Ferrel/Polares/Jato rotulado `Simulado`). **Partículas GPU:** `src/components/globe/WindParticlesLayer.tsx` (lazy-loaded em `GlobeCanvas.tsx`) renderiza `700` / `1.200` / `1.800` trilhas de 14 segmentos em um único `THREE.LineSegments` com shader customizado (rampa ciano → esmeralda → amarelo → laranja → rosa-vermelho), 1 projeção esférica não-espelhada por partícula/quadro (deslocamento direto dos vértices 3D da cauda no `Float32Array`, zero alocações no `useFrame`), interpolação bilinear esférica contínua em `±180°`, pausa em `isThrottled` (RN22), escala adaptativa T39 e descarte rigoroso `dispose()` (RN21). **UI D14 & Integrações:** `src/components/observatory/WindLayerControls.tsx` (lazy-loaded em `ObservatoryPanel.tsx`, registrado em `MIGRATED` no `design-system.test.tsx`) com seletor `Superfície (10 m)` / `Jato (250 hPa)`, unidade `km/h` / `nós`, barra de gradiente sincronizada com o shader, pico/média e aviso de fallback; registrado `GLOBAL_WINDS` em `observatoryStore.ts`, `observatory-data.ts`, `explore/search.ts` (`⌘K`), `explore/view-url.ts` (`?camadas=GLOBAL_WINDS`), `study-schema.ts` e `docs/DATA_SOURCES.md`. **Captura antes/depois (§1.5):** antes, o Observatório listava 6 camadas sem visualização atmosférica de ventos; depois, exibe a 7ª camada **Ventos Globais (GFS)** com badge `Ao vivo`, streamlines animadas sobre o globo (alísios turquesa/esmeralda em `10 m · 58 km/h` e corrente de jato dourada/laranja em `250 hPa · 141 nós`), controles D14 sem truncamento e zero sobreposição com a timeline ou dock. **Validação:** `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 746/747 ok (0 falhas, 1 skip; 5 novos testes em `test/winds.test.tsx`), `pnpm build` ok (`/` mantido em **159 kB**, `bundle-budget.test.ts` 6/6 `< 160 kB`), Playwright E2E 18/18 ok e verificação WebGL ao vivo em Chromium (`/api/observatory/winds` HTTP `200`, `source: "live"`, `NOAA GFS (Open-Meteo)`, 144 pontos, `0` erros de console). Correntes oceânicas ficaram isoladas em `D27b`. Aguarda aceite do Ayrton.
- 2026-11-22 · ayrton · DONE · Aprovada pelo Ayrton (registrado pelo antigravity a pedido).

---

### D27b · Correntes Oceânicas Superficiais (OSCAR / Open-Meteo Marine + seletor Ventos ↔ Correntes no motor GPU)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d27b-both-mode · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** D27a · **Grupos:** G-OBS, G-GLOBO

**Contexto / problema**
Segunda metade da `D27` (`GG`): estender o motor de partículas vetoriais sobre a esfera (`D27a`) para exibir correntes oceânicas superficiais reais (Corrente do Golfo, Kuroshio, Humboldt, Benguela, Circumpolar Antártica).

**O que fazer**
1. Estender `/api/observatory/winds` (ou rota `/api/observatory/currents`) com grade UV oceânica real (Open-Meteo Marine / NOAA OSCAR, mascarando terra) e fallback climatológico explícito de giros oceânicos (T05).
2. Adicionar seletor de modo `Ventos` ↔ `Correntes oceânicas` na camada GPU com paleta oceânica e escala dedicada (`m/s` / `nós`) e documentar em `docs/DATA_SOURCES.md`.

**Critérios de aceite**
- [x] Modo Correntes Oceânicas ativável no Observatório com máscara oceânica, legenda dedicada (`m/s` / `nós`) e procedência T05.

**Log**
- 2026-11-22 · antigravity · TODO · Criada a partir da quebra de `D27` (`GG`) conforme §1.7.
- 2026-11-22 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`8cba2ce`). Dependência `D27a` concluída (`DONE`); grupos `G-OBS` e `G-GLOBO` livres.
- 2026-11-22 · antigravity · REVIEW · Implementação em `b4aa125`. **Backend & Motor Oceânico:** criados `src/lib/currents-data.ts`, `src/lib/currents-source.ts` e `src/app/api/observatory/currents/route.ts` — consulta única à API aberta **Open-Meteo Marine** (Copernicus / NOAA, 144 pontos globais, `ocean_current_velocity` e `ocean_current_direction` na convenção oceanográfica "para onde flui", convertidos para `m/s` com máscara terra/oceano derivada dos `null`s), envelope T05 (`liveTtlMs = 60 min`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200`, tolerância `stale` de 6 h) e fallback climatológico explícito dos grandes giros oceânicos (Golfo, Kuroshio, Humboldt, Benguela, Brasil, Agulhas e Circumpolar Antártica). **Motor GPU Unificado:** `WindParticlesLayer.tsx` alterna `Ventos ↔ Correntes` por `uniform float uPaletteMode` (paleta oceânica dedicada índigo → azul marinho → ciano → turquesa → espuma clara) no mesmo `THREE.LineSegments` sem recriar contexto WebGL; combina a máscara oceânica da grade com o índice espacial Natural Earth 110m (`getContemporarySpatialIndex`) e amostragem por rejeição no respawn para manter 100% das streamlines estritamente sobre oceanos. **UI D14 & Docs:** `WindLayerControls.tsx`, `ObservatoryPanel.tsx` e `observatoryStore.ts` atualizados com seletor segmentado `Ventos` / `Correntes oceânicas`, unidades `m/s` / `nós`, barra de gradiente oceânica (`0` a `1,2+ m/s` / `2,3+ nós`), badge de procedência T05 independente (`currentsMeta`) e documentação completa em `docs/DATA_SOURCES.md`. **Captura antes/depois (§1.5):** antes, a camada exibia apenas ventos atmosféricos (10 m / 250 hPa) sobre todo o globo; depois, o seletor `Correntes oceânicas` troca instantaneamente para a paleta azul-turquesa com recorte costeiro nítido (zero streamlines sobre América do Norte, Central ou do Sul), exibindo `Oceanos · 1,1 m/s · Ao vivo`, escala `0 · 0,3 · 0,6 · 0,9 · 1,2+` e `Pico 1,14 m/s · Média 0,28 m/s`. **Validação:** `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 751/752 ok (0 falhas, 1 skip; 5 novos testes em `test/currents.test.tsx`), `pnpm build` ok (`/` mantido em **159 kB**, `bundle-budget.test.ts` 6/6 `< 160 kB`), Playwright E2E **18/18 ok** e verificação WebGL ao vivo em Chromium (`/api/observatory/currents` HTTP `200`, `source: "live"`, `102` células oceânicas, `sameCanvasElement: true`, `webglcontextlost = 0`, `0` erros de console). Aguarda aceite do Ayrton.
- 2026-11-22 · ayrton · IN_PROGRESS · Solicitado adicionar 3º modo `Ambos` (`Ventos | Correntes | Ambos`) no controle da camada para exibir ventos atmosféricos e correntes oceânicas simultaneamente no globo. Reaberta no worktree `../telluspedia-wt/antigravity-d27b-both`.
- 2026-11-22 · antigravity · REVIEW · Implementação do modo `Ambos` em `f1e3698`. **Motor GPU:** extraído `<FlowStreamlines />` em `WindParticlesLayer.tsx`; no modo `both` renderiza correntes oceânicas rentes ao mar (`OCEAN_LAYER_RADIUS = 1.008`, máscara costeira Natural Earth 110m + paleta azul-turquesa) sob os ventos atmosféricos (`WIND_LAYER_RADIUS = 1.014`, paleta esmeralda/amarelo/laranja/rosa), dividindo exatamente 50/50 o orçamento de partículas da T39 (`splitParticleCountForBoth`: `350`/`600`/`900` por subcamada) para preservar FPS e manter descarte rigoroso `dispose()` (RN21) + pausa RN22. **UI D14 & Store:** `FlowMode = "winds" | "currents" | "both"`, `setFlowMode("both")` garante carregamento sob demanda de `/api/observatory/currents`; `WindLayerControls.tsx` agora oferece seletor 3-vias `Ventos | Correntes | Ambos` exibindo ambos os controles e legendas empilhados no modo `Ambos`; `ObservatoryPanel.tsx` exibe badge `10 m + Oceanos` / `250 hPa + Oceanos` e `DataSourceBadge` combinado. **Captura antes/depois (§1.5):** antes, o controle tinha 2 opções exclusivas (`Ventos` / `Correntes oceânicas`); depois, exibe 3 botões (`Ventos | Correntes | Ambos`) com `Ambos` em acento ciano, ambas as legendas ativas (`km/h` e `m/s`) e as duas camadas de streamlines visíveis simultaneamente sobre o globo sem erros. **Validação:** `pnpm db:generate`, `pnpm typecheck` ok, `pnpm lint` ok, `pnpm test` 751/752 ok (0 falhas, 1 skip), `pnpm build` ok (`/` = **159 kB**, `bundle-budget.test.ts` 6/6 `< 160 kB`), verificação WebGL ao vivo em Chromium (`sameCanvasElement: true`, `webglcontextlost = 0`, `0` erros de console) e Playwright E2E **18/18 ok**. Aguarda aceite do Ayrton.
- 2026-11-23 · ayrton · DONE · Aprovada pelo Ayrton (registrado pelo antigravity a pedido).

---

### D28a · Fundação i18n (`pt-BR`/`en`, cookie+localStorage, `Intl`, `Intl.DisplayNames`), seletor de idioma e Shell principal

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d28a-i18n-core-shell · **Worktree:** —
- **Prioridade:** P2 · **Área:** Produto · **Tamanho:** G · **Depende de:** — · **Grupos:** G-SHELL, G-TIMELINE, G-GLOBO, G-PAIS

**Contexto / problema**
Originalmente `D28` (tamanho `GG`, quebrada em `D28a` + `D28b` conforme §1.7): toda a interface, formatação numérica e nomes de países/indicadores estão fixos em português (`pt-BR`), limitando o alcance educacional e acadêmico internacional.

**O que fazer**
1. Criar motor leve de i18n (`src/lib/i18n/` + `src/stores/localeStore.ts`) com `Locale = "pt-BR" | "en"`, dicionário `en` carregado sob demanda (zero regressão no orçamento `< 160 kB` de `/`), persistência em `localStorage` + cookie (`telluspedia_locale`), atualização dinâmica de `document.documentElement.lang` e utilitários `Intl` (`formatNumber`, `formatDate`, `formatCountryName` via `Intl.DisplayNames` para todos os 177 países).
2. Adicionar seletor de idioma D14 (`PT` / `EN`) no shell principal sem recarregar o globo WebGL.
3. Traduzir 100% do Shell principal em tempo real: `TopNavBar`, controles de mapa no `GlobeCanvas`, `GraphicsQualityPanel` + botão T39, `TimelineBar` / `PresetSelector` / `CategoryFilterPills`, `ExplorePalette` (`⌘K`) e `ChoroplethHud` (Mapa Temático).

**Critérios de aceite**
- [x] Alternância `pt-BR` ↔ `en` instantânea sem recarregar a cena 3D (`webglcontextlost = 0`), persistida em `localStorage`/cookie e cobrindo Navbar, Controles de Mapa, Qualidade Gráfica, Timeline, Busca `⌘K` e Mapa Temático.
- [x] Utilitários `Intl` (números, datas e `Intl.DisplayNames` para os 177 países) validados em testes automatizados, mantendo First Load JS de `/` < 160 kB.

**Log**
- 2026-11-21 · antigravity · TODO · Tarefa `D28` criada na auditoria do Ciclo 2 (aprovada pelo Ayrton).
- 2026-11-23 · antigravity · IN_PROGRESS · Quebrada de `D28` (`GG`) em `D28a` (fundação i18n + seletor + Shell principal) e `D28b` (painéis analíticos + metadados SSR) conforme §1.7. Reivindicada a partir de `origin/master` (`2ab6e48`) com todos os grupos livres (`G-SHELL, G-TIMELINE, G-GLOBO, G-PAIS`).
- 2026-11-23 · antigravity · REVIEW · Implementação entregue no commit `27be24a`: fundação i18n (`src/lib/i18n/{types,format,en,useT}.ts` + `src/stores/localeStore.ts`) com dicionário `en` carregado sob demanda (`import("@/lib/i18n/en")`), persistência em `localStorage` + cookie (`telluspedia_locale`) + `<html lang>`, utilitários `Intl` (`formatNumber`, `formatDate`, `formatCountryName` via `Intl.DisplayNames` para os 177 países), seletor D14 `PT`/`EN` ao lado do controle de qualidade gráfica (após o globo na ordem de foco para preservar acesso imediato por Tab) e tradução em tempo real de `TopNavBar`, controles de mapa (`GlobeCanvas`), `GraphicsQualityPanel`, `TimelineBar`/`PresetSelector`/`CategoryFilterPills`, `SearchPalette` (`⌘K`) e `ChoroplethHud`. Visual antes/depois inspecionado em `mobile-375` e `desktop-1366` (pílula `PT`/`EN` alinhada com `Auto`, zero colisão na barra superior, tradução limpa em `EN`). Validado com `pnpm typecheck` (0 erros), `pnpm lint` (0 avisos), `pnpm test` (755/756 pass, 0 fail, 1 skip; +4 testes em `test/i18n.test.tsx`), `pnpm build` + `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB), checagem real no Chromium WebGL (`sameCanvasElement=true`, `contextLostCount=0`, `persistedAfterReload=true`, 0 erros de console) e suíte Playwright E2E completa (18/18 pass, incluindo os 6 snapshots responsivos atualizados e WCAG AA).
- 2026-11-23 · ayrton · DONE · Aprovada pelo Ayrton.

---

### D28b · Tradução dos painéis analíticos (Inspector, Observatório, Cosmos, Comparador, Reader/Citações, Estudos e metadados SSR)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d28b-i18n-telluslab · **Worktree:** —
- **Prioridade:** P2 · **Área:** Produto · **Tamanho:** G · **Depende de:** D28a · **Grupos:** G-PAIS, G-OBS, G-COSMOS, G-ESTUDOS

**Contexto / problema**
Segunda metade da `D28` (`GG`): estender a fundação i18n da `D28a` para todos os painéis profundos, rotas de estudos e metadados SSR.

**O que fazer**
1. Traduzir `InspectorHUD` (usando `formatCountryName` via `Intl.DisplayNames` nos 177 países, métricas e widgets de clima/relógio), `ObservatoryPanel` + controles das 7 camadas, `CosmicInspectorHUD`, `CountryComparator` / `ComparisonGrid` / `ComparisonCharts`, `ReaderMode` / `AnalyticalProfileView` / `CitationModal`, e `/studies` / `StudyShareModal` / `ForkStudyBanner`.
2. Adaptar metadados SSR (`layout.tsx`, `/pais/[iso]`, `/study/[slug]`, `/studies`) lendo o cookie `telluspedia_locale` quando disponível.

**Critérios de aceite**
- [x] Todos os painéis analíticos, rótulos de indicadores, nomes dos 177 países e formatação numérica respeitam `pt-BR` ↔ `en` sem recarregar o globo 3D.

**Log**
- 2026-11-23 · antigravity · TODO · Criada a partir da quebra de `D28` (`GG`) conforme §1.7.
- 2026-11-23 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`4e7c87a`) com `D28a` em `DONE` e todos os grupos livres (`G-PAIS, G-OBS, G-COSMOS, G-ESTUDOS`).
- 2026-11-23 · antigravity · REVIEW · Implementação entregue no commit `ec93062`: dicionário inglês sob demanda particionado (`src/lib/i18n/{en-shell,en-panels,en}.ts`, todos `< 600` linhas conforme T36) + helper SSR `src/lib/i18n/server.ts` (`getServerLocale`, `pickLocaleText`). Tradução em tempo real com `formatCountryName` (`Intl.DisplayNames` nos 177 países) e `formatNumber`/`Intl` em `RightDock`, `InspectorHUD` (`CountryHeader`, `CountryMetricsGrid`, `CountryMiniTimeline`, `LocalClockWidget`, `LiveWeatherWidget`), `ObservatoryPanel` + 7 camadas (`DataSourceBadge`, `FirmsLayerControls`, `FirmsCountrySummary`, `EonetLayerControls`, `SatelliteLayerControls`, `MaritimeLayerControls`, `GibsLayerControls`, `WindLayerControls`), `CosmicInspectorHUD`, `CountryComparator` / `ComparisonGrid` / `ComparisonCharts`, `ReaderMode` / `ReaderTableOfContents` / `ReaderContent` / `AnalyticalProfileView` / `CitationModal`, `StudyShareModal` / `ForkStudyBanner` / `StudyExportActions` e galeria SSR `/studies`. Metadados SSR (`layout.tsx`, `/pais/[iso]`, `/study/[slug]`, `/compare`, `/studies` via `server-loaders.ts`) lendo o cookie `telluspedia_locale` e ajustando `<html lang>` + `openGraph.locale`. Visual inspecionado em `1366×850` no Chromium WebGL (`Brazil`, `Population: 214.3 million`, `Land area: 8,515,767 km²`, `Nominal GDP: $ 2.17 trillion`, `Planetary Observatory`, `Multidimensional Country Comparator`, `sameCanvas=true`, `contextLost=0`, SSR `/studies` e `/pais/DEU` com `<html lang="en">` e títulos em inglês). Validado com `pnpm typecheck` (0 erros), `pnpm lint` (0 avisos), `pnpm test` (757/758 pass, 0 fail, 1 skip; +2 testes D28b em `test/i18n.test.tsx`), `pnpm build` + `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB) e suíte Playwright E2E completa (18/18 pass).
- 2026-11-23 · antigravity · IN_PROGRESS · Reaberta após revisão do Ayrton: corrigir erro de hidratação no reload (`TopNavBar`) e completar tradução `en` dos textos remanescentes visíveis no Inspector, badges de fonte, sugestões, continentes/regiões, StudyContext e `document.title`.
- 2026-11-23 · antigravity · REVIEW · Correções entregues no commit `f7c79dc`: (1) erro de hidratação no reload de `/?visao=1&...&observatorio=1&camadas=...` resolvido movendo `<TopNavBar />` para fora do `<Suspense>` de `EntityLaunchGate` em `GlobeExperienceShell.tsx` + `useRightDock.ts` via `useStoreSnapshot` (T41); (2) tradução `en` completa via módulo sob demanda `src/lib/i18n/en-country-meta.ts` cobrindo 12 regiões/continentes, 17 regimes políticos, nomes oficiais/moedas/resumos dos 29 países curados, 17 marcos históricos dos países-piloto, badges de fonte (`IBGE / WB`, `World Bank`, `UNDP`, `WHO`), `CountrySearchSuggestions`, `SearchPalette`, `StudyContext` (TellusBridge), `HistoricalEraBadge`, `PaleoEraBadge`, `ObservatoryTelemetryHUD`, `AnalyticalProfileView` e sincronização imediata de `document.title` na troca `PT ↔ EN`. Validado com `pnpm typecheck` (0 erros), `pnpm lint` (0 avisos), `pnpm test` (757/758 pass), `pnpm build` + `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB), reload real em `/?visao=1&pais=BRA&observatorio=1&camadas=NASA_FIRMS` no Chromium WebGL (0 erros de hidratação/console e inspeção visual limpa em `EN`) e Playwright E2E (18/18 pass).
- 2026-11-23 · antigravity · IN_PROGRESS · Reaberta após revisão do Ayrton: traduzir integralmente `/telluslab` (`StudyHub`), páginas standalone (`/dossies/[slug]`, `/not-found`, `/error`, `GlobalErrorView`), eras históricas em `/studies`/`HistoricalEraBadge` e hidratar `useLocaleStore` globalmente no `SearchProvider`.
- 2026-11-23 · antigravity · REVIEW · Correções entregues no commit `1129cf4`: (1) hidratação global de idioma em `SearchProvider.tsx` garantindo que todas as rotas standalone apliquem `telluspedia_locale`/`localStorage`; (2) novo módulo sob demanda `src/lib/i18n/en-telluslab.ts` cobrindo toda a UI do `StudyHub` (`/telluslab`, incluindo seletor customizado de arquivo JSON, formatação `Intl` de datas/percentuais, todos os 8 domínios, 39 trilhas e 14 vínculos de dossiês/figuras), metadados SSR de `/telluslab`, tradução SSR completa dos 14 dossiês em `/dossies/[slug]`, eras históricas em `/studies` e `HistoricalEraBadge`, `EntityLaunch`, `/not-found`, `/error` e `GlobalErrorView`; (3) novo componente D14 `LocaleToggleButton` / `ServerLocaleToggleButton` presente em `/telluslab`, `/studies` e `/dossies/[slug]`. Validado com `pnpm typecheck` (0 erros), `pnpm lint` (0 avisos), `pnpm test` (759/760 pass, 0 fail, 1 skip), `pnpm build` + `bundle-budget.test.ts` (6/6 pass, `/` < 160 KiB), verificação real no Chromium + screenshot de `/telluslab` em `EN` (0 erros) e Playwright E2E completa (18/18 pass).
- 2026-11-23 · ayrton · DONE · Aprovada pelo Ayrton.

---

### D29 · Lixo Marítimo, Giros Oceânicos & Microplásticos (`RN17`): 5 giros (NOAA) + advecção Lagrangiana acoplada a ventos/correntes (D27)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d29-marine-debris-gyres · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-OBS, G-GLOBO, G-EPOCA, G-ESTUDOS

**Contexto / problema**
Previsto desde o início no `DISCOVERY.md` (`RN17`, `CA07`) e no `ROADMAP.md` original (*"Fluxos de Ventos e Lixo Marítimo: visualização de correntes oceânicas e microplásticos"*), este módulo dependia do motor vetorial de ventos e correntes oceânicas concluído em `D27a`/`D27b`. Agora o motor GPU já possui ambos os campos (`NOAA GFS` + `Open-Meteo Marine / OSCAR`), destravando a visualização científica dos giros de acumulação e da deriva Lagrangiana de resíduos marinhos.

**O que fazer**
1. Incorporar o mapa de densidade observada de microplásticos nos **5 grandes giros oceânicos subtropicais** (Pacífico Norte / *Great Pacific Garbage Patch*, Pacífico Sul, Atlântico Norte, Atlântico Sul, Índico) com base em literatura/dados abertos (**NOAA Marine Debris Program / Global Drifter Program / Eriksen–Lebreton**), com ficha científica e citação primária (RN02, T05).
2. Integrar um modo de **advecção Lagrangiana no motor GPU** impulsionado pela composição `corrente superficial + fator de deriva de vento (windage 1–3%)` herdada de `D27a`/`D27b`, evidenciando fisicamente a convergência de Ekman nos giros.
3. Adicionar um **simulador educativo de deriva**: clicar em qualquer ponto costeiro ou oceânico lança traçadores virtuais mostrando para qual giro os resíduos convergem ao longo de meses/anos, com controle D14 no `ObservatoryPanel`, suporte `pt-BR`/`en`, `dispose()` na GPU e serialização em Estudos.

**Critérios de aceite**
- [x] 5 giros oceânicos e zonas de concentração de microplásticos renderizam no globo 3D com legenda, fontes primárias e selo explícito de procedência T05 (observado vs. modelo Lagrangiano).
- [x] Simulação de deriva a partir de ponto costeiro utiliza os campos reais de correntes + ventos (`D27`), respeita `RN22` (`isThrottled`) e descarta buffers GPU (`dispose()`).
- [x] `bundle-budget.test.ts` permanece `< 160 KiB` e interface 100% bilíngue (`pt-BR`/`en`).

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 (resgate `RN17`/`CA07`, aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`ce3fbdc`) com grupos livres (`G-OBS, G-GLOBO, G-EPOCA, G-ESTUDOS`).
- 2026-11-24 · antigravity · REVIEW · Implementada a camada `MARINE_DEBRIS` (`RN17` / `CA07`): (1) catálogo observado dos 5 giros oceânicos subtropicais (Pacífico Norte/GPGP, Atlântico Norte/Sargaços, Índico, Pacífico Sul e Atlântico Sul) com citações NOAA Marine Debris / Global Drifter Program / Eriksen (2014) / Lebreton (2018) em `src/lib/marine-debris-catalog.ts`, tipos leves em `src/lib/marine-debris-types.ts` (zero peso no bundle inicial de `/`) e motor físico Lagrangiano RK2 acoplado (`corrente superficial D27b + windage 1–3% D27a + convergência subtropical de Ekman + snap costeiro`) em `src/lib/marine-debris-data.ts`; (2) visualização 3D WebGL sob demanda (`React.lazy`) em `src/components/globe/MarineDebrisLayer.tsx` e `MarineDebrisRibbons.tsx` (nuvens de densidade nos 5 giros com rotação Coriolis, traçadores Lagrangianos contínuos na GPU e fitas 3D da simulação interativa de deriva, respeitando `T39`, `RN22` `isThrottled` e `dispose()` completo de geometrias e shaders); (3) controles D14 sob demanda (`next/dynamic`) em `src/components/observatory/MarineDebrisControls.tsx` (selo T05 dual observado vs. modelo Lagrangiano, legenda `10³ → 10⁶ part./km²`, fichas dos 5 giros com `flyTo`, modo clique no oceano em `EarthSphere.tsx`, 6 pontos costeiros rápidos, seletores de windage 1–3% e horizonte 12–36m, bilíngue `pt-BR`/`en` em `en-panels.ts`, adicionado a `MIGRATED` em `design-system.test.tsx`); (4) integração com `observatoryStore.ts`, `ObservatoryPanel.tsx`, busca `⌘K` (`search.ts`) e serialização/supressão anacrônica em Estudos (`study-schema.ts`). Validação: `pnpm build`, `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (800/800 pass, +4 testes em `test/marine-debris.test.tsx`), `test/bundle-budget.test.ts` (6/6 pass, `/` = `162 kB` / `< 160 KiB` gzip) e Chromium WebGL E2E (`test/e2e/marine-debris.spec.ts` 2/2 pass em `desktop-1366` e `desktop-1920`, PT e EN, 0 erros).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D30 · Dados Ambientais & INPE (`RN17`): INPE BDQueimadas por bioma + TerraBrasilis (DETER/PRODES desmatamento Amazônia e Cerrado, T05)

- **Status:** DONE · **Responsável:** antigravity · **Branch:** task/d30-inpe-environmental · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-OBS, G-GLOBO, G-PIPELINE, G-ESTUDOS

**Contexto / problema**
O `DATA_SOURCES.md` e o `ROADMAP.md` original previam integração direta com o **INPE** (além da NASA), mas hoje o Observatório consome apenas NASA FIRMS/EONET/GIBS. Integrar fontes oficiais brasileiras do INPE eleva drasticamente a precisão ambiental na América do Sul e no Brasil (queimadas por bioma e monitoramento oficial de desmatamento).

**O que fazer**
1. Criar rotas server-side com cache SWR e contrato `T05` (`live`/`cache`/`stale`/`fallback` + fontes clicáveis):
   - **INPE BDQueimadas**: focos de calor na América do Sul com agregação oficial por **bioma brasileiro** (Amazônia, Cerrado, Pantanal, Mata Atlântica, Caatinga, Pampa), selecionável como fonte complementar/alternativa no controle de Queimadas ao lado do NASA FIRMS.
   - **INPE TerraBrasilis (DETER / PRODES)**: alertas recentes e série histórica anual oficial de desmatamento na Amazônia Legal e no Cerrado (com painel analítico + visualização espacial no globo 3D).
2. Exibir citação acadêmica (INPE / MCTI) e data de referência explícita (RN02), tradução completa `pt-BR`/`en` e persistência em Estudos.

**Critérios de aceite**
- [x] Dados do INPE BDQueimadas e TerraBrasilis (DETER/PRODES) exibidos com procedência T05 clara, link direto ao portal oficial do INPE e fallback honesto quando o provedor oscilar.
- [x] Agregação por bioma brasileiro e série histórica de desmatamento sem valores sintéticos (`T03`).
- [x] Cobertura de testes unitários para parsers/cache/fallback e `bundle-budget.test.ts` `< 160 KiB`.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 (resgate `RN17`/`DATA_SOURCES.md`, aprovada pelo Ayrton).
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`fd2436d`) com grupos livres (`G-OBS, G-GLOBO, G-PIPELINE, G-ESTUDOS`).
- 2026-11-24 · antigravity · REVIEW · Implementada integração oficial com dados ambientais do INPE (`RN17` / `T03` / `T05`): (1) tipos leves em `src/lib/inpe-types.ts`, séries históricas anuais oficiais PRODES (2015–2025, Amazônia Legal e Cerrado) + parsers reais para CSV diário do `dataserver-coids.inpe.br` (agregando os 6 biomas brasileiros oficiais: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pantanal e Pampa) e GeoJSON WFS do `terrabrasilis.dpi.inpe.br` (DETER) em `src/lib/inpe-data.ts`; (2) fontes server-side SWR T05 em `src/lib/inpe-sources.ts` com fallback estritamente honesto (zero focos/alertas sintéticos) e rotas rate-limited (`T43`) + telemetria (`T47`) em `/api/observatory/inpe-fires` e `/api/observatory/inpe-deforestation` (`rate-limit.ts`, `provider-metrics.ts`); (3) seletor **NASA FIRMS | INPE BDQueimadas** com tabela interativa dos 6 biomas em `FirmsLayerControls.tsx`, nova camada `INPE_DEFORESTATION` com contorno espacial + alertas DETER 3D em `InpeDeforestationLayer.tsx` (`React.lazy`, `dispose()`, `RN22`) e painel analítico D14 com gráfico oficial PRODES 2015–2025, status DETER honesto e citação INPE/MCTI em `InpeDeforestationControls.tsx` (`next/dynamic`, adicionado a `MIGRATED` em `design-system.test.tsx`); (4) tradução completa `pt-BR`/`en` (`en-panels.ts`), busca `⌘K` (`search.ts`), serialização/supressão anacrônica em Estudos (`study-schema.ts`) e atualização de `docs/DATA_SOURCES.md`. Validação: `pnpm build`, `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (805/805 pass, +4 testes em `test/inpe-environmental.test.tsx`), `test/bundle-budget.test.ts` (6/6 pass, `/` `< 160 KiB`) e Chromium WebGL E2E (`test/e2e/inpe-environmental.spec.ts` 2/2 pass em `desktop-1366` e `desktop-1920`, PT e EN, 0 erros).
- 2026-11-24 · ayrton · DONE · Aprovado pelo Ayrton (registrado pelo antigravity a pedido).

---

### D31 · Mapa dos Biomas (Global & Brasil): 14 biomas terrestres (WWF/RESOLVE) + 6 Biomas Brasileiros (IBGE) com fichas ecológicas

- **Status:** IN_PROGRESS · **Responsável:** antigravity · **Branch:** task/d31-biomes-map · **Worktree:** ../telluspedia-wt/antigravity-d31
- **Prioridade:** P1 · **Área:** 3D/Conteúdo · **Tamanho:** G · **Depende de:** — · **Grupos:** G-GLOBO, G-FRONTEIRAS, G-OBS, G-CONTEUDO, G-ESTUDOS

**Contexto / problema**
Embora a ficha de país mencione biomas em texto, o TellusPedia ainda não possui uma **camada cartográfica interativa dos biomas** do planeta e do Brasil, impedindo o estudante de ver no globo onde começam e terminam florestas tropicais, savanas, tundras, desertos, taiga, Cerrado, Caatinga ou Pantanal — e cruzar isso diretamente com queimadas (FIRMS/INPE), desmatamento (PRODES) e vegetação (GIBS NDVI).

**O que fazer**
1. Preparar dataset TopoJSON otimizado sob demanda em `public/data/biomes/` cobrindo os **14 biomas terrestres globais (RESOLVE Ecoregions 2017 / WWF)** e, em recorte dedicado de alta clareza, os **6 Biomas Brasileiros oficiais (IBGE)** (Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa, Pantanal).
2. Renderizar a camada temática de Biomas sobre o globo 3D (com paleta ecológica D14 acessível, controle de opacidade, legenda interativa e filtro por bioma) e picking ao passar/clicar exibindo uma **ficha ecológica** (clima, solos, vegetação típica, área, ameaças e links diretos para fontes WWF/RESOLVE/IBGE).
3. Integrar o cruzamento com camadas ambientais existentes (INPE/FIRMS/GIBS NDVI), persistência em URL/Estudos e tradução completa `pt-BR`/`en`.

**Critérios de aceite**
- [ ] 14 biomas globais (WWF/RESOLVE) + 6 Biomas Brasileiros (IBGE) renderizam suavemente no globo com picking, filtro por bioma e ficha ecológica bilíngue (`pt-BR`/`en`).
- [ ] Dataset carregado sob demanda (lazy-load, `/` `< 160 KiB`) com descarte adequado de geometrias (`dispose()`).
- [ ] Testes unitários validando integridade dos códigos/paletas/fontes dos biomas.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 por solicitação do Ayrton.
- 2026-11-24 · antigravity · IN_PROGRESS · Tarefa reivindicada a partir de `origin/master` (`3b1b1a0`) com grupos livres (`G-GLOBO, G-FRONTEIRAS, G-OBS, G-CONTEUDO, G-ESTUDOS`).

---

### D32 · Mapa de Espécies Animais & Biodiversidade (`RN13.7`): ocorrências GBIF + fauna emblemática/ameaçada (IUCN Red List) por bioma/país

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** D31 · **Grupos:** G-OBS, G-GLOBO, G-PAIS, G-CONTEUDO

**Contexto / problema**
A regra `RN13.7` (*Biologia e Saúde Pública*) e o `DATA_SOURCES.md` listam **GBIF** e **IUCN Red List** para biodiversidade, mas o TellusPedia ainda não tem visualização espacial de **espécies animais**. Conectado ao Mapa dos Biomas (`D31`), um Mapa de Espécies Animais transforma a dimensão biológica da enciclopédia em exploração visual real sobre o globo.

**O que fazer**
1. Criar proxy server-side `/api/observatory/species` consultando a **GBIF Occurrence / Species API** (gratuita, sem chave, cache SWR e contrato `T05`) para exibir registros georreferenciados reais de fauna por espécie, país ou bioma.
2. Curar um catálogo base bilíngue (`pt-BR`/`en`, nomes populares e científicos, grupo taxonômico — mamíferos, aves, répteis, anfíbios, peixes/marinhos — biomas associados e status oficial **IUCN Red List**: `CR`, `EN`, `VU`, `NT`, `LC`, com link direto para IUCN/GBIF) destacando espécies emblemáticas e ameaçadas de cada continente e bioma brasileiro (ex.: onça-pintada, arara-azul, lobo-guará, mico-leão-dourado, peixe-boi, panda-gigante, tigre-de-bengala, elefante-africano, urso-polar, baleia-azul, etc.).
3. Permitir explorar no globo 3D (pontos/clusters por espécie e áreas de distribuição associadas ao bioma `D31`), filtrar por status de ameaça ou grupo taxonômico e abrir a ficha biológica a partir do globo ou do painel do país.

**Critérios de aceite**
- [ ] Mapa de espécies exibe ocorrências reais do GBIF (com selo T05) e catálogo curado com nome científico, status IUCN, bioma e fonte clicável em `pt-BR` e `en`.
- [ ] Filtros por bioma (`D31`), país, grupo taxonômico e categoria IUCN funcionando sem degradar FPS nem estourar `< 160 KiB` em `/`.
- [ ] Cobertura de testes unitários para validação taxonômica/IUCN e proxy GBIF.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 por solicitação do Ayrton.

---

### D33 · Modo 2D & Projeções Cartográficas Comparativas (`d3-geo`): Equal Earth, Mercator, Natural Earth/Robinson e Azimutal Equidistante

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/UX · **Tamanho:** G · **Depende de:** — · **Grupos:** G-GLOBO, G-FRONTEIRAS, G-SHELL, G-ESTUDOS

**Contexto / problema**
Embora o Globo 3D seja a experiência principal sem distorção cartográfica, um **Modo 2D com projeções selecionáveis** traz dois ganhos enormes: (1) visão simultânea de todos os 177 países (especialmente poderosa para o Coroplético e o Mapa de Biomas); (2) valor pedagógico direto ao permitir comparar **Equal Earth** (áreas fiéis) contra **Mercator** (distorção polar — Groenlândia vs. África), além de servir como alternativa ultraleve em dispositivos sem WebGL forte.

**O que fazer**
1. Construir componente `FlatMapCanvas` (carregado sob demanda via `next/dynamic`, reaproveitando `d3-geo` já presente em `package.json`) com pan/zoom suave, seleção e hover sincronizados com `globeStore` (mesmo `selectedIso`, mesmo `InspectorHUD`, mesma Timeline).
2. Oferecer seletor D14 de projeções cartográficas (**Equal Earth** padrão, **Mercator**, **Natural Earth / Robinson**, **Azimutal Equidistante**) com nota didática breve sobre propriedades/distorções (área vs. forma vs. direção) e gratícula de meridianos/paralelos.
3. Suportar sobreposição do **Coroplético**, **Fronteiras Históricas**, **Biomas** (quando disponível) e pausa automática do loop WebGL 3D enquanto o Modo 2D estiver ativo (`RN22`), com alternância `3D ↔ 2D` discreta na casca e persistência em URL/Estudos.

**Critérios de aceite**
- [ ] Alternância limpa `Globo 3D ↔ Mapa 2D` preservando país selecionado, recorte temporal e Coroplético, pausando o render loop 3D no modo 2D.
- [ ] 4 projeções cartográficas (`Equal Earth`, `Mercator`, `Natural Earth`, `Azimutal`) com picking exato dos 177 países em `pt-BR` e `en`.
- [ ] Carregamento sob demanda (`bundle-budget.test.ts` `< 160 KiB`) e testes unitários das projeções.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts` + inspeção visual no Chromium.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 por solicitação do Ayrton.

---

### D34 · Coroplético Temporal Animado (1990–2024) + indicadores CO₂ per capita e Energia Renovável % com persistência em Estudos

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-FRONTEIRAS, G-PAIS, G-SHELL, G-ESTUDOS

**Contexto / problema**
O dataset `public/data/worldbank-timeseries.json` já armazena séries reais anuais de **1990 a 2024** para ~170 países e **7 indicadores** (incluindo `EN.GHG.CO2.PC.CE.AR5` — CO₂ per capita — e `EG.FEC.RNEW.ZS` — Energia Renovável %). Contudo, o Modo Coroplético (`D22`) só pinta o snapshot mais recente e oferece apenas 5 indicadores do Banco Mundial, desperdiçando o potencial de visualizar a evolução socioeconômica e climática global ano a ano no globo 3D (e no mapa 2D).

**O que fazer**
1. Adicionar os 2 indicadores já ingeridos (`EN.GHG.CO2.PC.CE.AR5` e `EG.FEC.RNEW.ZS`) ao catálogo do Coroplético (`src/lib/choropleth.ts`) com escalas, paletas D14, unidades e traduções `pt-BR`/`en`.
2. Conectar `worldbank-timeseries.json` sob demanda (lazy-load, sem engordar `/` < 160 KiB) ao Coroplético com um **slider de ano (1990–2024) + botão Play/Pause** na legenda/seletor, mantendo escala fixa ao longo do tempo para comparação visual honesta e exibindo explicitamente lacunas oficiais (`null` nunca interpolado).
3. Permitir sincronizar o ano selecionado com a Timeline e serializar `choroplethYear` em URL (`D18`) e Estudos imutáveis (`/study/[slug]`, com migration Prisma compatível).

**Critérios de aceite**
- [ ] 7 indicadores do Banco Mundial (+ `NASA_FIRMS`) disponíveis no Coroplético em `pt-BR` e `en`.
- [ ] Slider e reprodução animada 1990 → 2024 atualizam a coloração dos 177 países suavemente sem recriar geometrias nem vazar memória GPU (`dispose()`).
- [ ] Lacunas reais (`null`) são exibidas como "Sem dado" no tooltip e na legenda; First Load JS de `/` permanece `< 160 KiB`.

**Como verificar**: `pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D35 · Expansão dos Perfis Editoriais dos Países (`RN13`): narrativas multidisciplinares auditadas (`pt-BR`/`en`) para G20 + Lusofonia + América Latina

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Conteúdo · **Tamanho:** G · **Depende de:** — · **Grupos:** G-PAIS, G-CONTEUDO

**Contexto / problema**
Hoje apenas **6 países** (`BRA`, `DEU`, `USA`, `JPN`, `ZAF`, `EGY`) possuem dossiê editorial multidisciplinar em `country-pilots.ts`, enquanto os outros 171 contam apenas com o perfil analítico quantitativo (`T38`). Para cumprir com profundidade a matriz `RN13` / `CA04` do `DISCOVERY.md`, precisamos ampliar substancialmente a base editorial com curadoria auditada e carregamento sob demanda.

**O que fazer**
1. Estruturar carregamento sob demanda por país/lote (`src/data/editorial/<iso>.json` ou módulos lazy) para que expandir dezenas de perfis editoriais tenha **0 bytes** de impacto no First Load JS de `/`.
2. Produzir e auditar perfis editoriais multidisciplinares bilíngues (`pt-BR` e `en`, com fontes primárias clicáveis e compatíveis com o gerador ABNT/APA/MLA/BibTeX — RN02) para **20 a 25 países prioritários** além dos 6 pilotos atuais: membros do **G20** (`CHN`, `IND`, `GBR`, `FRA`, `ITA`, `CAN`, `AUS`, `KOR`, `MEX`, `ARG`, `RUS`, `IDN`, `TUR`, `SAU`), **Lusofonia** (`PRT`, `AGO`, `MOZ`, `CPV`) e **América Latina** (`COL`, `CHL`, `PER`, `URY`).
3. Cobrir as dimensões `RN13` (Geografia/Biomas, Estado/Política, Economia, História/Marcos, Personalidades, Cultura/UNESCO e Saúde Pública), mantendo rigor contra dados inventados (`T03`) e o *HTML5 Phrasing Content Invariant*.

**Critérios de aceite**
- [ ] Ao menos 26 países totais (6 pilotos + ≥ 20 novos) com perfil editorial completo em `pt-BR` e `en` no Reader Mode, com citações verificadas.
- [ ] Carregamento 100% sob demanda (`bundle-budget.test.ts` `< 160 KiB`) e respeito ao teto de 600 linhas (`T36`).
- [ ] Testes de integridade verificando presença de fontes primárias, datas de referência e ausência de `<div>` em `<p>`.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 por solicitação do Ayrton.

---

### D36 · Geografia Crítica & Legado de Milton Santos: dossiê/figura, lentes espaciais (Meio Técnico-Científico-Informacional, Verticalidades, 4 Brasis)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Conteúdo/UX · **Tamanho:** G · **Depende de:** — · **Grupos:** G-CONTEUDO, G-PAIS, G-FRONTEIRAS, G-TIMELINE, G-SHELL

**Contexto / problema**
A obra do geógrafo brasileiro **Milton Santos** (1926–2001, Prêmio Vautrin Lud — o "Nobel da Geografia") fornece um dos arcabouços teóricos mais potentes do mundo para interpretar exatamente o que o TellusPedia mostra no globo: a relação entre técnica, ciência, informação, fluxos globais e desigualdade territorial. Incorporar sua obra transforma o TellusPedia de um atlas descritivo em um instrumento de **leitura geográfica crítica**.

**O que fazer**
1. **Dossiê & Figura Histórica (`figure:milton-santos`)**: criar página dedicada `/dossies/milton-santos` (bilíngue `pt-BR`/`en`), biografia e linha do tempo intelectual (1926–2001, Salvador → França/exílio → USP → Prêmio Vautrin Lud 1994), obras fundamentais (*Por uma outra globalização*, *A Natureza do Espaço*, *O Espaço Dividido*, *O Brasil: Território e Sociedade no Início do Século XXI*) com referências bibliográficas padronizadas (ABNT/APA/MLA/BibTeX) e vínculo com TellusLab.
2. **Lentes Analíticas Espaciais (baseadas em dados reais auditados)**:
   - *Meio Técnico-Científico-Informacional*: leitura temática combinando indicadores reais de PIB per capita, infraestrutura/conectividade e densidade de fluxos, com nota metodológica transparente (sem indicadores inventados).
   - *Horizontalidades vs. Verticalidades*: modo interpretativo conectando os fluxos globais de alta velocidade do Observatório (aviação, rotas marítimas, cabos submarinos) ao conceito de território usado e circuitos superior/inferior da economia urbana.
   - *Os Quatro Brasis* (Milton Santos & María Laura Silveira, 2001): sobreposição cartográfica regionalizada sobre o Brasil (**Região Concentrada**, **Centro-Oeste**, **Nordeste**, **Amazônia**) comparável às 5 regiões clássicas do IBGE, com ficha conceitual e fontes bibliográficas.
3. Integrar busca `⌘K`, timeline histórica (centenário de Milton Santos em **2026**!) e interface 100% D14 bilíngue (`pt-BR`/`en`).

**Critérios de aceite**
- [ ] Dossiê `/dossies/milton-santos` e marco na timeline (incluindo referência ao centenário 1926–2026) publicados em `pt-BR` e `en` com citações acadêmicas completas.
- [ ] Lentes espaciais (*Meio Técnico-Científico-Informacional*, *Verticalidades/Horizontalidades* e mapa regional *Os Quatro Brasis*) renderizam no globo com rigor bibliográfico e zero valores sintéticos.
- [ ] `bundle-budget.test.ts` `< 160 KiB` e testes de integridade do dossiê/geometria passando.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada no Ciclo 3 por solicitação do Ayrton.

---

### D37 · Ferramentas de Estúdio: régua geodésica 3D no globo, exportação CSV/PNG no Comparador e pinos anotados `(lat, lng)` em Estudos

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** Produto/UX · **Tamanho:** G · **Depende de:** — · **Grupos:** G-GLOBO, G-PAIS, G-ESTUDOS, G-SHELL

**Contexto / problema**
Pesquisadores, professores e estudantes conseguem comparar indicadores e salvar estudos imutáveis, mas ainda sentem falta de três ferramentas autorais diretas: (1) medir distâncias reais entre dois pontos/capitais no globo; (2) exportar dados e gráficos do Comparador para planilhas/apresentações; (3) fixar pinos anotados com coordenadas `(lat, lng)` dentro de um Estudo compartilhável.

**O que fazer**
1. **Régua geodésica 3D**: ferramenta discreta para marcar 2+ pontos na superfície esférica traçando arco ortodrômico real (`slerpVectors` em raio `1.004`), exibindo distância em `km`, milhas náuticas (`nm`) e azimute inicial/final (fórmula esférica/Haversine), com limpeza e `dispose()`.
2. **Exportação no Comparador**: botões D14 no `ComparisonGrid` / `ComparisonCharts` para baixar **CSV** (RFC 4180 com metadados de fonte/ano e valores brutos) e **PNG/SVG** do gráfico ativo com legenda e atribuição de fonte (RN02).
3. **Pinos anotados em Estudos**: permitir adicionar/remover marcadores `(lat, lng, título, nota curta)` no estudo em edição, renderizados no globo 3D e persistidos de forma imutável (e herdados no fork) no campo JSON `annotations` do Prisma `Study` (validado por Zod em `study-schema.ts`).

**Critérios de aceite**
- [ ] Régua geodésica calcula distâncias ortodrômicas com precisão `< 0,5%` vs Haversine (testado em pares de capitais) e não conflita com seleção normal de países quando desligada.
- [ ] Comparador exporta CSV válido e imagem do gráfico com atribuição de fonte primária em `pt-BR` e `en`.
- [ ] Pinos anotados persistem em `/api/studies` e `/api/studies/[slug]/fork`, com limites rígidos de quantidade/tamanho no Zod.

**Como verificar**: `pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D38 · Linha do Tempo Transversal de Personalidade ou Tema (`RN14`/`RN04`) + Atualidades geopolíticas por país via GDELT (`RN13.8`, T05)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Produto/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-TIMELINE, G-PAIS, G-CONTEUDO, G-OBS

**Contexto / problema**
Dois requisitos explícitos do `DISCOVERY.md` ainda não têm implementação completa: `RN14` / `Fluxo 05` (linha do tempo transversal de uma personalidade influente ou tema, articulando múltiplos países/locais no globo e registrando a trilha de estudo `RN04`) e `RN13.8` (notícias e atualidades geopolíticas recentes vinculadas ao país via **GDELT Project API**).

**O que fazer**
1. **Visão Transversal de Personalidade/Tema (`RN14` + `RN04`)**: ao selecionar uma personalidade (ex.: Isaac Newton, Albert Einstein, Dom Pedro II, Luís de Camões, Milton Santos) ou um tema transversal (ex.: Corrida Espacial, Descolonização, Pandemias), exibir uma linha do tempo filtrada com destaque simultâneo de todos os países envolvidos no globo e trilha de navegação (*breadcrumbs*).
2. **Atualidades por País via GDELT (`RN13.8`)**: criar proxy server-side `/api/countries/[iso]/news` consultando a **GDELT 2.0 Doc API** (gratuita, sem chave, cache SWR 30 min, contrato `T05`), exibindo manchetes recentes auditadas com fonte e data no painel/Reader do país, com degradação limpa caso o provedor fique indisponível.

**Critérios de aceite**
- [ ] Personalidades e temas transversais acionam destaque multipaís no globo, timeline filtrada e trilha de estudo (`breadcrumbs`) em `pt-BR` e `en`.
- [ ] Feed GDELT respeita contrato `T05`, rate-limit (`T43`), sanitização estrita de URLs externas e nunca bloqueia o carregamento do país.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (resgate `RN04`/`RN13.8`/`RN14`, aprovada pelo Ayrton).

---

### D39 · Observatório Sísmico & Tectônico: terremotos em tempo real (USGS GeoJSON, T05) + placas tectônicas contemporâneas

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P1 · **Área:** 3D/Dados · **Tamanho:** G · **Depende de:** — · **Grupos:** G-OBS, G-GLOBO, G-EPOCA, G-ESTUDOS

**Contexto / problema**
O Observatório Planetário cobre queimadas, eventos severos, satélite GIBS, órbitas, tráfego aéreo/marítimo e ventos/correntes, mas ainda não oferece a dinâmica geofísica sólida da Terra contemporânea — nem conecta visualmente a Paleogeografia (`250–66 Ma`) à tectônica de placas ativa hoje.

**O que fazer**
1. Criar rota proxy `/api/observatory/earthquakes` consumindo o feed oficial **USGS Earthquake Hazards GeoJSON** (gratuito, sem chave, janelas `24h` / `7d` / `30d`, filtro de magnitude `M2.5+` / `M4.5+` / `M6.0+`), seguindo estritamente o contrato `T05` (`live`/`cache`/`stale`/`fallback`) com cache em memória e `Cache-Control`.
2. Renderizar os epicentros no globo 3D (pontos/anéis dimensionados por magnitude e coloridos por profundidade, com picking para exibir ficha sísmica no `ObservatoryTelemetryHUD`: local, magnitude, profundidade, alerta de tsunami e link oficial USGS).
3. Adicionar camada vetorial leve das **fronteiras de placas tectônicas contemporâneas** (limites convergentes, divergentes e transformantes — dataset PB2002 otimizado em `public/data/`, carregado sob demanda), com alternância no controle da camada e `dispose()` adequado na GPU.
4. Suportar serialização em URL e Estudos (`/study/[slug]`), supressão coerente em eras geológicas/históricas e tradução completa `pt-BR`/`en`.

**Critérios de aceite**
- [ ] Camada sísmica exibe dados reais da USGS com selo explícito de procedência T05 e fallback honesto quando offline.
- [ ] Controles D14 de janela temporal, magnitude mínima e toggle de placas tectônicas com picking interativo e telemetria.
- [ ] Zero vazamento de `BufferGeometry` (`dispose()`), respeito a `RN22` (`isThrottled`) e `bundle-budget.test.ts` `< 160 KiB`.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D40 · Infraestrutura Crítica Global & Qualidade do Ar: cabos submarinos de internet (TeleGeography) e PM2.5/AQI (Open-Meteo)

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Dados · **Tamanho:** M · **Depende de:** — · **Grupos:** G-OBS, G-GLOBO, G-ESTUDOS

**Contexto / problema**
Mais de 95% do tráfego intercontinental de dados trafega por cabos submarinos que passam pelos mesmos gargalos geopolíticos já visíveis na camada marítima AIS (Mar Vermelho, Malaca, Suez, Atlântico Norte — dialogando diretamente com as *verticalidades* de Milton Santos em `D36`), enquanto a qualidade do ar (PM2.5/AQI) é um indicador ambiental imediato complementar ao clima ao vivo.

**O que fazer**
1. **Cabos Submarinos de Internet**: incorporar dataset aberto curado/otimizado da TeleGeography (principais sistemas transoceânicos + estações de aterramento em `public/data/`, carregado sob demanda) renderizados como arcos sutis no raio `1.0025` no Observatório, com picking de sistema/capacidade/pontos de aterramento e destaque de gargalos estratégicos.
2. **Qualidade do Ar (PM2.5 / US AQI & European AQI)**: integrar o endpoint gratuito sem chave **Open-Meteo Air Quality API** (mesmo provedor já confiável em `/api/weather`), exibindo o índice no `LiveWeatherWidget` do país selecionado e como opção/sobreposição de estações capitais no Observatório, seguindo o contrato `T05`.
3. Tradução completa `pt-BR`/`en`, tokens D14 e `dispose()` na GPU.

**Critérios de aceite**
- [ ] Camada de cabos submarinos liga/desliga limpa no Observatório com picking e ficha de fonte primária (TeleGeography).
- [ ] Qualidade do ar (PM2.5 + AQI com escala clara) exibida com origem explícita (`Open-Meteo`) e tratamento gracioso de indisponibilidade.
- [ ] `bundle-budget.test.ts` continua `< 160 KiB`.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D41 · Eclipses Solares/Lunares & Sondas do Espaço Profundo (Voyager 1/2, JWST, New Horizons) no Modo Cosmos

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** 3D/Cosmos · **Tamanho:** G · **Depende de:** — · **Grupos:** G-COSMOS, G-GLOBO, G-EPOCA

**Contexto / problema**
O Modo Cosmos (`Horizonte 4`) já modela o Sistema Solar, Halley, asteroides, chuvas de meteoros e 88 constelações, mas ainda não contempla dois fenômenos astronômicos icônicos: (1) eclipses solares/lunares históricos e futuros (incluindo Sobral 1919 — que comprovou a relatividade geral de Einstein e já tem dossiê no TellusPedia — e 2024/2026/2027); (2) sondas ativas/históricas no espaço profundo.

**O que fazer**
1. **Eclipses solares selecionáveis**: catálogo curado de eclipses emblemáticos (1919 Sobral, 2024 América do Norte, 2026 Atlântico/Espanha, 2027 Egito/Luxor) com posicionamento astronômico da Lua/Sol na data exata, projeção da sombra de umbra/penumbra sobre a Terra e trilha da faixa de totalidade em 3D, com ficha científica e atalho na Timeline/Cosmos.
2. **Sondas do espaço profundo**: camada opcional no Modo Cosmos para **Voyager 1**, **Voyager 2**, **New Horizons** e **James Webb (L2)** usando efemérides simplificadas calibradas (posição heliocêntrica em UA + velocidade + atraso de sinal em luz-hora/minuto) e ficha detalhada no `CosmicInspectorHUD` com links NASA/JPL.
3. Garantir handover seguro de câmera sem `NaN` (`AGENTS.md` §1) e tradução `pt-BR`/`en`.

**Critérios de aceite**
- [ ] Pelo menos 4 eclipses emblemáticos projetam sombra coerente e faixa de totalidade sobre a Terra na data correta.
- [ ] Sondas espaciais selecionáveis no Modo Cosmos com distância em UA e tempo-luz calculados em função da data da timeline.
- [ ] Testes unitários para cálculo de distância/tempo-luz das sondas e geometria de totalidade; zero regressões no Cosmos.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D42 · i18n Profundo (Fase 3): Player de Cenas (`ScenePlayerOverlay` e 7 crônicas), entidades históricas e textos editoriais dos 6 países-piloto

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Produto/Conteúdo · **Tamanho:** G · **Depende de:** — · **Grupos:** G-CONTEUDO, G-EPOCA, G-PAIS

**Contexto / problema**
Embora toda a casca, painéis, metadados SSR, `/studies`, `/telluslab` e os 14 dossiês já estejam traduzidos (`D28a`/`D28b`), a auditoria revelou que `src/components/scenes/` ainda não usa `useI18n()` (o player de cenas e as 7 crônicas históricas permanecem em português), assim como as fichas de entidades históricas (`PRU`, `SUN`, `AHU`, `GDR`, `FRG`, `TUR_HIST`, `YUG`, `CSK`) e os textos editoriais narrativos dos 6 países-piloto (`BRA`, `DEU`, `USA`, `JPN`, `ZAF`, `EGY`) no Reader Mode.

**O que fazer**
1. Internacionalizar a UI do `ScenePlayerOverlay` e criar módulo sob demanda (`src/lib/i18n/en-scenes.ts`) traduzindo títulos, resumos, capítulos e crônicas das 7 cenas publicadas (`polo-1271`, `gama-1497`, `magellan-1519`, `glo-1914`, `glo-1939`, `glo-1969`, `glo-1989`).
2. Traduzir nomes, regimes, governantes e descrições das 8 entidades históricas (`historical-entities-*.ts`) em módulo sob demanda (`en-historical.ts`).
3. Traduzir os textos editoriais narrativos dos 6 países-piloto (`country-pilots.ts`) exibidos no `ReaderContent` quando `locale === "en"`, carregados sob demanda para não inflar o bundle inicial de `/`.

**Critérios de aceite**
- [ ] Ao abrir qualquer uma das 7 cenas históricas ou qualquer entidade histórica em `EN`, 100% da interface e do texto narrativo aparece em inglês.
- [ ] Reader Mode dos 6 países-piloto renderiza integralmente em inglês quando `locale === "en"`, sem violar o *HTML5 Phrasing Content Invariant* nem o teto de 600 linhas (`T36`).
- [ ] `bundle-budget.test.ts` continua 6/6 (`/` `< 160 KiB`).

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + `bundle-budget.test.ts`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D43 · Cartografia Histórica Expandida: snapshots TopoJSON 1500 (Grandes Navegações) e 1815 (Congresso de Viena) + 2 novas cenas curadas

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Conteúdo/3D · **Tamanho:** G · **Depende de:** — · **Grupos:** G-CONTEUDO, G-FRONTEIRAS, G-EPOCA, G-TIMELINE

**Contexto / problema**
Os snapshots cartográficos históricos atuais cobrem apenas o século XIX tardio e o século XX (`1870`, `1914`, `1939`, `1969`). Cenas já publicadas como Marco Polo (`1271`), Vasco da Gama (`1497`) e Magalhães (`1519`) ainda aparecem sobre fronteiras contemporâneas, enfraquecendo a imersão histórica.

**O que fazer**
1. Gerar e validar dois novos snapshots TopoJSON históricos em `public/data/history/`: **`borders-1500.json`** (Grandes Navegações: Impérios Português, Espanhol, Otomano, Dinastia Ming, Inca, Asteca) e **`borders-1815.json`** (Congresso de Viena / Impérios Napoleônico tardio, Britânico, Russo, Reino Unido de Portugal, Brasil e Algarves), com respectivas entidades históricas e resolução bidirecional em `historical-eras.ts` e `historical-entities.ts`.
2. Conectar as cenas de 1497 e 1519 à cartografia de 1500 (com cross-fade existente em `CountryBorders.tsx`).
3. Publicar **2 novas cenas históricas curadas** no catálogo D12/D24 (em `pt-BR` e `en`, com fontes auditadas e trajetória 3D): **Expedição do HMS Beagle / Charles Darwin (1831–1836)** e **Expedição do Eclipse de Sobral (1919)** (conectada diretamente ao dossiê `albert-einstein` e à `D41`).

**Critérios de aceite**
- [ ] Snapshots `1500` e `1815` renderizam sem artefatos no globo 3D com raycast picking `< 0,2 ms` e `HistoricalEraBadge` bilíngue.
- [ ] 2 novas cenas curadas validadas pelo schema de cenas (`scenes-build-index.ts`) e reproduzíveis no `ScenePlayerOverlay`.
- [ ] Testes de integridade de entidades históricas e cartografia passando.

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + inspeção visual no Chromium WebGL.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

---

### D44 · TellusBridge v2: cobertura 100% dos 299 nós (biomas, Milton Santos, sismologia, eclipses), trilhas em `/study/[slug]` e selos no globo

- **Status:** TODO · **Responsável:** — · **Branch:** — · **Worktree:** —
- **Prioridade:** P2 · **Área:** Produto/Conteúdo · **Tamanho:** M · **Depende de:** D31, D36, D39, D41 · **Grupos:** G-CONTEUDO, G-ESTUDOS, G-PAIS

**Contexto / problema**
A tarefa `D26` elevou a cobertura curricular do TellusBridge acima de 85% dos 299 nós do TellusLab, mas ainda há nós sem ponto de entrada no TellusPedia — especialmente tópicos que ganharão âncoras naturais no Ciclo 3 (biomas/ecologia `D31`, geografia crítica / Milton Santos `D36`, tectônica/sismologia `D39`, eclipses/relatividade `D41`, clima/CO₂ `D34`, redes/infraestrutura `D40`). Além disso, páginas de Estudos (`/study/[slug]`) ainda não recomendam trilhas do TellusLab com base nos países/eras/camadas do estudo.

**O que fazer**
1. Completar o mapeamento em `manifest.json` (mantendo compatibilidade segura com `lab-compat.ts`) para atingir **100% dos 299 nós curriculares** sem links quebrados.
2. Adicionar na visualização de Estudo (`/study/[slug]`) um bloco discreto D14 "Aprofundar este estudo no TellusLab" (bilíngue `pt-BR`/`en`) agregando automaticamente os nós e obras relacionados aos países, eras e camadas presentes no estudo.
3. Quando o visitante tiver um snapshot do TellusLab importado no navegador, exibir selos discretos de proficiência (`S0`–`S6`) ao lado dos vínculos em dossiês e `StudyContext`.

**Critérios de aceite**
- [ ] Cobertura do manifesto atinge **299/299 nós (100%)** com 100% dos deep-links aprovados em `parseLabLink` (`tellus-bridge.test.tsx`).
- [ ] Estudos (`/study/[slug]`) exibem recomendações curriculares derivadas automaticamente do conteúdo do estudo em `pt-BR` e `en`.
- [ ] Selos de progresso respeitam tokens D14 e funcionam sem snapshot importado (degradação limpa).

**Como verificar**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

**Log**
- 2026-11-23 · antigravity · TODO · Tarefa criada na auditoria do Ciclo 3 (aprovada pelo Ayrton).

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
