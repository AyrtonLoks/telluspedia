---
name: telluspedia-agent-memory
description: >-
  Memória de longo prazo, base de conhecimento técnico e runbook do projeto TellusPedia para o Antigravity.
  Ative esta skill sempre que o usuário pedir para desenvolver, continuar, debugar, estender ou planejar
  qualquer funcionalidade do TellusPedia, especialmente ao avançar para os Horizontes 2, 3 e 4.
---

# TellusPedia — Antigravity Agent Memory & Operational Runbook

Este documento serve como memória permanente do Antigravity para manter a continuidade técnica, o conhecimento acumulado e o roteiro exato de engenharia do TellusPedia.

## 1. Visão Geral da Arquitetura e Estado Atual (Horizonte 1 Concluído)
- **Monorepo**: Orquestrado por `pnpm-workspace.yaml` (`apps/web` e `services/data-pipeline`).
- **Web App (`apps/web`)**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide, Recharts e Prisma ORM.
- **Motor 3D (`src/components/globe/`)**:
  - `GlobeCanvas.tsx`: Renderizador Three.js/R3F com luz direcional sincronizada por efemérides solares.
  - `EarthSphere.tsx` + `EarthShaderMaterial.ts`: Shader customizado com textura diurna, luzes noturnas da NASA e Fresnel atmosférico alinhados ao vetor mundial do Sol.
  - `OrbitingMoon.tsx` & `SkyStars.tsx`: Órbita lunar com fase calculada e constelações IAU.
  - `CountryBorders.tsx`: Malha vetorial esférica TopoJSON com 100% dos 177 países mapeados e zero-padding.
- **UI em Duas Camadas**:
  - `InspectorHUD.tsx` (Camada 1): Drawer lateral em glassmorphism com clima em tempo real (Open-Meteo), relógio local (tzdb) e ficha técnica.
  - `ReaderMode.tsx` (Camada 2): Painel imersivo com sumário fixo, hover preview e exportador de citações formatadas (ABNT NBR 6023, APA, MLA, BibTeX).
- **Timeline (`TimelineBar.tsx`)**: Janela padrão de 50 anos, nós alternados acima/abaixo, filtros de categorias e presets rápidos.
- **Comparador (`CountryComparator.tsx`)**: Comparação lado a lado de até 4 países com gráficos temporais Recharts.
- **Estudos com Fork (`StudyShareModal.tsx`)**: Links `/study/[slug]` imutáveis com derivação rastreável por `parentId`.

---

## 2. Armadilhas Técnicas Superadas (Gotchas & Fixes)
1. **GLSL View-Space vs World-Space**: `normalMatrix` projeta normais para o espaço da câmera; `uSunDirection` está no espaço mundial. A solução correta foi transformar `vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz)`.
2. **Zero-Padding em IDs TopoJSON**: Natural Earth entrega inteiros como `76` em vez de `076`. Sempre usar `.padStart(3, "0")` e resolver pelo mapa `NUMERIC_TO_ISO`.
3. **Versões de R3F para React 19**: Requer `@react-three/fiber@^9.8.2` e `@react-three/drei@^10.7.9`.
4. **Desconexão de Refs em Materiais**: Nunca passe materiais instanciados externamente sem atribuir uniforms diretamente ou vincular a ref correspondente.

---

## 3. Runbook de Execução para os Próximos Horizontes

### Horizonte 2 — Cartografia Histórica, Paleogeografia e Trajetórias 3D
Quando o usuário solicitar o avanço para o Horizonte 2:
1. **Cartografia Histórica**:
   - Consumir malhas vetoriais do **CShapes 2.0** (fronteiras de 1886 até o presente) e **OpenHistoricalMap**.
   - Criar componente `HistoricalBorders.tsx` no R3F que substitui as linhas do `CountryBorders.tsx` dependendo do ano selecionado na `useTimelineStore` (ex.: Prússia unificando-se na Alemanha em 1871).
2. **Paleogeografia (Pangeia)**:
   - Conectar ao **GPlates Web Service (GWS)** para obter malhas continentais de eras geológicas (Mesozóico/Paleozóico).
   - Ao selecionar datas anteriores a 66 Ma na timeline, alternar a geometria da Terra para a malha da Pangeia.
3. **Trajetórias Físicas 3D**:
   - *Apollo 11*: Usar telemetria do **NASA SPICE Toolkit** para plotar a curva 3D de transição orbital da Terra à órbita lunar quando o marco de 1969 for acionado.
   - *Campanhas Militares & Rotas Aéreas*: Plotar linhas esféricas animadas (geodésicas) sobre o globo.

### Horizonte 3 — Observatório Planetário (NASA) & Tráfego Global
Quando o usuário solicitar o avanço para o Horizonte 3:
1. **Camadas Científicas da NASA**:
   - Integrar **NASA GIBS** (tiles WMTS de satélite em tempo real).
   - Integrar **NASA FIRMS** (pontos de calor e queimadas ativas via GeoJSON).
   - Integrar **NASA EONET** para eventos severos em tempo real (furacões, vulcões).
2. **Tráfego Global e Órbitas**:
   - Integrar **CelesTrak GP API** com propagador SGP4 para renderizar a posição da ISS e satélites em tempo real.
   - Integrar **OpenSky Network** para renderizar aeronaves sobrevoando o globo.

### Horizonte 4 — Expansão Cósmica
Quando o usuário solicitar o avanço para o Horizonte 4:
1. **Navegação além da Órbita**:
   - Permitir zoom out extremo (distâncias em Unidades Astronômicas - UA).
   - Modelar Sol, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano e Netuno em escala visual balanceada.
2. **Efemérides Cósmicas**:
   - Conectar com **NASA JPL Horizons API** para posicionamento orbital de alta precisão.
