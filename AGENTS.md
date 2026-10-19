# TellusPedia — Antigravity Engineering Invariants & Guardrails

Esta regra contextual aplica-se a todas as interações e edições no projeto TellusPedia.

## 1. Gráficos 3D & Shaders (Three.js / React Three Fiber)
- **GLSL World-Space Normal Invariant**: Todo shader que calcule incidência solar (terminador dia/noite ou Fresnel) DEVE calcular o vetor normal no espaço mundial:
  ```glsl
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  ```
  NUNCA use `normalMatrix * normal` (espaço de câmera) com `uSunDirection` (espaço mundial), pois causará rotação e distorção indesejadas do terminador solar com a órbita da câmera.
- **Sincronização com a Linha do Tempo**: A posição solar (`uSunDirection`) e a luz direcional no `GlobeCanvas` devem sempre subscrever reativamente a `selectedYear` e `selectedMilestoneId` do `useTimelineStore` para garantir precisão astronômica histórica (ex.: Apollo 11 em 1969).
- **Render Loop Throttling (RN22)**: Quando `isReaderOpen === true`, o loop de renderização do Three.js deve ser reduzido ou pausado sob demanda para poupar ciclos de GPU e bateria durante a leitura aprofundada de dossiês.

## 2. TopoJSON & Resolução Geográfica
- **Zero-Padding Obrigatório**: Códigos numéricos de países do TopoJSON Natural Earth DEVEM ser normalizados via `String(geom.id).padStart(3, "0")` para bater com o padrão ISO 3166-1 (ex.: `076` para Brasil, `032` para Argentina, `036` para Austrália).
- **Picking Instantâneo**: A detecção de países sob o cursor DEVE utilizar a projeção matemática Lat/Long por raycast na esfera unitária com lookup em memória via `which-polygon` / `d3-geo` (<0.2ms). Nunca crie 177 malhas 3D separadas com colisores individuais na GPU.

## 3. Persistência & Imutabilidade (RN16)
- **Estudos São Imutáveis**: Registros em `/study/[slug]` são estritamente somente-leitura. Qualquer alteração ou personalização feita pelo visitante deve acionar o endpoint de fork (`/api/studies/[slug]/fork`), criando um novo registro com `parentId`.
- **Rastreabilidade e Citações (RN02)**: Todo indicador deve exibir a fonte primária e a data de referência. Mantenha os geradores de citações compatíveis com ABNT NBR 6023, APA 7, MLA 9 e BibTeX (.bib).
