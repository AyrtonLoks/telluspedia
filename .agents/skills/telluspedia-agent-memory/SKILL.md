---
name: telluspedia-agent-memory
description: >-
  Memória de longo prazo, base de conhecimento técnico e runbook do projeto TellusPedia para o Antigravity.
  Ative esta skill sempre que o usuário pedir para desenvolver, continuar, debugar, estender ou planejar
  qualquer funcionalidade do TellusPedia, especialmente ao avançar para os Horizontes 2, 3 e 4.
---

# TellusPedia — Antigravity Agent Memory & Operational Runbook

Este documento serve como memória permanente do Antigravity para manter a continuidade técnica, o conhecimento acumulado e o roteiro exato de engenharia do TellusPedia.

## 1. Visão Geral da Arquitetura e Estado Atual (Horizonte 1 Concluído & Refinado)
- **Monorepo**: Orquestrado por `pnpm-workspace.yaml` (`apps/web` e `services/data-pipeline`).
- **Web App (`apps/web`)**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide, Recharts e Prisma ORM.
- **Motor 3D (`src/components/globe/`)**:
  - `GlobeCanvas.tsx`: Renderizador Three.js/R3F com iluminação diurna/noturna e luz direcional sincronizada por efemérides solares da NOAA.
  - `EarthSphere.tsx` + `EarthShaderMaterial.ts`: Shader customizado com texturas diurnas e noturnas da NASA (`earth_day.jpg`, `earth_night.png`), anel de crepúsculo atenuado e Fresnel atmosférico em espaço mundial.
  - `OrbitingMoon.tsx` & `SkyStars.tsx`: Órbita lunar com textura (`moon.jpg`), acoplamento de marés (tidal locking) estrito e constelações IAU com bypass de raycasting (`raycast={() => null}`).
  - `CountryBorders.tsx`: Malha vetorial esférica TopoJSON com 100% dos 177 países mapeados, zero-padding e suporte a iluminação de blocos multinacionais (`blocIsos`).
  - `CameraFlyToController.tsx`: Transição de câmera em grande círculo via `slerpVectors` com preservação de altitude segura ($\ge 1.5$) e isolamento de deltas inerciais do `OrbitControls`.
- **UI em Duas Camadas**:
  - `InspectorHUD.tsx` (Camada 1): Drawer lateral em glassmorphism com clima em tempo real (Open-Meteo), relógio local com suporte a fusos IANA mundiais (`ISO3_TO_TIMEZONE`), ficha técnica, fontes clicáveis e expansão vertical dinâmica ao recolher a timeline.
  - `ReaderMode.tsx` (Camada 2): Painel imersivo com sumário fixo, hover previews com hit-box contínua, notas de rodapé com hover cards de citação e exportador para ABNT NBR 6023, APA 7, MLA 9 e BibTeX (.bib).
- **Timeline (`TimelineBar.tsx` & `MilestonePin.tsx`)**: Janela padrão de 50 anos com presets (incluindo Guerras Mundiais e Guerra Fria), nós com abertura para cima (`bottom-7` / `bottom-24`), deseleção via toggle / Escape / clique no oceano e links diretos para globo, dossiê e fontes.
- **Comparador (`CountryComparator.tsx`)**: Comparação lado a lado de até 4 países com gráficos temporais Recharts e citação das fontes primárias.
- **Estudos com Fork (`StudyShareModal.tsx`)**: Links `/study/[slug]` imutáveis com derivação rastreável por `parentId`.

---

## 2. Armadilhas Técnicas Superadas (Gotchas & Fixes)
1. **GLSL View-Space vs World-Space**: `normalMatrix` projeta normais para o espaço da câmera; `uSunDirection` está no espaço mundial. A solução correta foi transformar `vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz)`.
2. **Zero-Padding em IDs TopoJSON**: Natural Earth entrega inteiros como `76` em vez de `076`. Sempre usar `.padStart(3, "0")` e resolver pelo mapa `NUMERIC_TO_ISO`.
3. **Versões de R3F para React 19**: Requer `@react-three/fiber@^9.8.2` e `@react-three/drei@^10.7.9`.
4. **Desconexão de Refs em Materiais**: Nunca passe materiais instanciados externamente sem atribuir uniforms diretamente ou vincular a ref correspondente.
5. **Espelhamento Cartográfico Three.js (Gotcha de Sin/Cos)**: O desdobramento UV equirretangular de texturas Three.js e coordenadas esféricas requer `x = -R*sin(phi)*cos(theta)` e `z = R*sin(phi)*sin(theta)`. Trocar senos e cossenos produz uma reflexão diagonal que espelha os continentes horizontalmente (ex.: Brasil com a costa atlântica virada para o oeste).
6. **Congelamento por NaN no OrbitControls (LERP vs SLERP)**: A interpolação linear clássica entre polos ou hemisférios distantes passa por `(0,0,0)`. O Three.js gera `NaN` na conversão de raio nulo para coordenadas esféricas (`atan2(0,0)`), corrompendo permanentemente o estado de rotação do `OrbitControls`. A solução é o Great-Circle SLERP (`slerpVectors`) com altitude mínima estrita de 1.5 e reset de deltas residuais inerciais (`_sphericalDelta`, `_scale`, `_panOffset`).
7. **Iluminação Solar & Equação do Tempo (NOAA)**: O cálculo da longitude subsolar requer `subsolarLng = -15.0 * (hourUtc - 12.0 + eqtime / 60.0)`. Inverter o sinal ou o offset projeta meio-dia solar para a calada da noite. O anel crepuscular (`sunsetRing`) deve utilizar gradiente suave (`0.08` a `0.28`), sem ruído procedural de blocos.
8. **Zonas Mortas de Hover e Popover Bridges**: Popovers acionados por hover que usem margem CSS (`mt-2` ou `bottom-full mb-2`) sofrem queda imediata de cursor ao cruzar os 8px de gap. A solução obrigatória é usar container de padding (`pt-1.5`), ponte de hit area invisível, temporizador de debounce (250ms) e suporte a clique para fixar (*pin on click*).
9. **Descarte de Memória GPU (BufferGeometry Dispose)**: A recalibração frequente de linhas e malhas de fronteira no Three.js sem invocar `geometry.dispose()` vaza buffers VRAM na GPU. Sempre incluir hook de limpeza com `.dispose()`.
10. **Invariante de Conteúdo de Fraseamento HTML5 no React (Hydration Error)**: Qualquer badge, popup de citação ou preview embutido dentro de parágrafos de texto (`<p>`) DEVE utilizar tags `<span>` (estilizadas via `flex`, `block`, `inline-flex` no Tailwind). Tags `<div>` dentro de `<p>` violam a especificação HTML5, forçam o fechamento prematuro do parágrafo no DOM e causam erro fatal de hidratação no React 19 (`validateDOMNesting`). Listas markdown (`- `) devem ser particionadas em blocos irmãos `<ul>` e `<li>`.
11. **Reset Reativo de Dimensão na Leitura Profunda**: Ao alternar países no globo ou abrir o Reader Mode, o estado `activeDimension` da store de leitura deve sempre ser redefinido para `"GEOGRAPHY"` para garantir que o visitante inicie pela visão panorâmica do novo território.

---

## 3. Runbook de Execução para os Próximos Horizontes

### Horizonte 2 — Cartografia Histórica, Paleogeografia e Trajetórias 3D (Concluído)
- **Cartografia Histórica (Concluído)**:
  - 4 Snapshots TopoJSON (`borders-1870.json`, `borders-1914.json`, `borders-1939.json`, `borders-1969.json`) com cross-fade de opacidade no R3F (`CountryBorders.tsx`) e cache de requisições in-flight (`historical-topology.ts`).
  - Entidades históricas canônicas (`PRU`, `SUN`, `AHU`, `GDR`, `FRG`, `TUR_HIST`, `YUG`, `CSK`) com bandeiras SVG autênticas, indicadores, governantes e continuidade temporal bidirecional (`resolveHistoricalEntity`).
  - Raycasting pontual instantâneo (<0.2ms) no Three.js conectado à malha da era ativa (`EarthSphere.tsx`).
  - Badge flutuante contextual com reposicionamento adaptativo (`HistoricalEraBadge.tsx`) e botão de restauração para 2024.
- **Paleogeografia & Deriva Continental (RN11) (Concluído)**:
  - Eras geológicas canônicas em Milhões de Anos (Ma): Pangeia (~250 Ma), Fragmentação (~200 Ma), Gondwana & Laurásia (~150 Ma) e Cretáceo K-Pg (~66 Ma).
  - Texturas equirretangulares fotorrealistas de alta resolução (2048x1024) com relevo fractal harmônico, batimetria profunda para o superoceano Panthalassa, plataformas rasas tropicais de carbonato no Mar de Tétis, desertos interiores Permianos e orogenia Apalachiana-Varisca/Uraliana (`scripts/generate-paleo-textures.ts`).
  - Shaders `EarthShaderMaterial.ts` com `uPaleoTexture` e `uPaleoFactor` com blend e supressão física automática de luzes de cidades (`cityLightFactor -> 0`).
  - Placas tectônicas e suturas autênticas da Pangeia (`PaleoPlatesLayer.tsx`) na altitude $1.002$ com iluminação geotérmica tênue e sutil (`#d97706`).
  - Eixo geológico dedicado com separação estrita vertical na Timeline (`TimelineAxis.tsx`): nós de eras acima da linha central e rótulos de Ma abaixo, eliminando colisões.
  - Badge de era geológica (`PaleoEraBadge.tsx`) e presets responsivos no `PresetSelector.tsx`.
- **Trajetórias Físicas 3D (RN12) (Concluído)**:
  - **Missão Apollo 11 (1969)**: Rota translunar Catmull-Rom 3D da Terra até o Mar da Tranquilidade na Lua com nave animada, folga orbital segura ($\ge 0.270$) e HUD de telemetria científica (`Apollo11TelemetryOverlay.tsx`).
  - **Circum-navegação de Magalhães-Elcano (1519–1522)**: Traçado geodésico no raio $1.004$ com a *Nau Victoria* animada em base ortonormal, rastro de esteira (*wake*), waypoints geográficos e HUD de telemetria naval (`HistoricalRouteOverlay.tsx`) com o diário de bordo de Antonio Pigafetta.
- **Persistência de Estudos com Fork Histórico e Geológico (RN16) (Concluído)**:
  - Serialização imutável de `historicalEra`, `isApollo11Active`, `geologicalMa` e `activeRouteId` em Prisma, API Next.js e Zustand stores com suporte a fork (`/study/[slug]`).
- **Suíte de Testes**: 148 testes unitários automatizados em 22 suítes com 100% de aprovação.

### Horizonte 3 — Observatório Planetário (NASA) & Tráfego Global (Concluído)
- **Camadas Científicas da NASA (Concluído)**:
  - **NASA FIRMS**: Focos de calor e queimadas ativas via `THREE.Points` (`NasaFirmsLayer.tsx`) na altitude $R=1.0025$ com buffers `Float32Array` de posição e cor (FRP) desacoplados da opacidade para máximo FPS.
  - **NASA EONET**: Marcadores de eventos severos interativos (`NasaEonetLayer.tsx`) com anéis pulsantes e raycast picking para ciclones, vulcões e tempestades.
  - **Proxies Server-Side com SWR/Cache em Memória (RN23)**: Rotas `/api/observatory/firms` e `/api/observatory/eonet` com TTL de 15 min e fallbacks de alta fidelidade integrados.
- **Tráfego Global e Órbitas (Concluído)**:
  - **ISS (Estação Espacial Internacional)**: Propagação orbital contínua a 60 FPS no `useFrame` via `calculateIssPosition(Date.now())` (`IssOrbitLayer.tsx`) em $R=1.18$ com malha 3D poligonal, painéis solares orientados pelo vetor tangente à órbita e linha orbital memoizada.
  - **Tráfego Aéreo Global**: Frotas de aeronaves comerciais via `THREE.InstancedMesh` (`AirTrafficLayer.tsx`) na altitude de cruzeiro $R=1.018$ orientadas por rumo (*heading*) em base ortonormal.
  - **Rotas Marítimas Comerciais**: Grandes estreitos geopolíticos e corredores mercantes em arcos geodésicos luminosos (`MaritimeRoutesLayer.tsx`) em $R=1.003$ com interpolação `slerpVectors`.
  - **Proxies Server-Side**: `/api/observatory/iss` (cache 60s) e `/api/observatory/traffic` (cache 120s) com deduplicação de requisições.
- **UI & Telemetria Científica (Concluído)**:
  - Botão dedicado na barra superior (`TopNavBar.tsx`) com indicador luminoso de camadas ativas.
  - Painel flutuante de camadas (`ObservatoryPanel.tsx`) com switches individuais, contadores de métricas globais e aviso de anacronismo em eras históricas.
  - Card flutuante de telemetria científica (`ObservatoryTelemetryHUD.tsx`) com ticker ao vivo para a ISS, eventos severos e aeronaves, com foco de câmera automático.
- **Sincronização Histórica e Persistência de Estudos (RN09, RN10, RN16) (Concluído)**:
  - Supressão automática de satélites e aviação contemporânea em épocas anteriores a 1957 e eras geológicas (`isContemporaryEpoch`).
  - Serialização imutável do campo `activeObservatoryLayers String[]` no Prisma `Study`, Zustand `studyStore.ts`, `studies-store.ts`, modal de compartilhamento e endpoints de fork (`/study/[slug]`).
- **Suíte de Testes**: 166 testes unitários automatizados em 23 suítes com 100% de aprovação e 0 erros de linter.

### Horizonte 4 — Expansão Cósmica
Quando o usuário solicitar o avanço para o Horizonte 4:
1. **Navegação além da Órbita**:
   - Permitir zoom out extremo (distâncias em Unidades Astronômicas - UA).
   - Modelar Sol, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano e Netuno em escala visual balanceada.
2. **Efemérides Cósmicas**:
   - Conectar com **NASA JPL Horizons API** para posicionamento orbital de alta precisão.
