# 🌍 TellusPedia

[![CI](https://github.com/AyrtonLoks/telluspedia/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/AyrtonLoks/telluspedia/actions/workflows/ci.yml)

> **Enciclopédia Geopolítica, Histórica e Observatório Planetário/Cósmico em Tempo Real**

O **TellusPedia** unifica enciclopédias acadêmicas tradicionais, globos 3D espaciais, dados geofísicos da NASA e indicadores socioeconômicos globais em uma única experiência contínua e interativa. A plataforma combina um **Globo Terrestre 3D** acoplado a uma **Linha do Tempo deslizável de 50 anos**, uma interface de leitura em duas densidades (**Inspector HUD** e **Modo Leitura Profunda** com citações acadêmicas **ABNT/APA/MLA/BibTeX**), um **Comparador de até 4 países** e um sistema de **Estudos Imutáveis com suporte a Forks**.

---

## 📑 Índice da Documentação Oficial

Toda a documentação técnica, científica e de negócios do projeto está centralizada no diretório [`docs/`](./docs/):

- 📜 [**Discovery de Negócio (`docs/DISCOVERY.md`)**](./docs/DISCOVERY.md): Contexto, dores resolvidas, 23 Regras de Negócio (**RN01 a RN23**), fluxos macro e critérios de aceite (**CA01 a CA07**).
- 🏗️ [**Arquitetura Técnica (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md): Diagramas de fluxo, arquitetura do Frontend (Next.js 15, R3F, shaders GLSL, picking <0.2ms), Clean Architecture do Backend Python (FastAPI), política de cache no Redis por volatilidade (**RN23**) e modelo relacional Prisma/PostGIS.
- 🔬 [**Mapeamento de Fontes Oficiais (`docs/DATA_SOURCES.md`)**](./docs/DATA_SOURCES.md): Catálogo detalhado das APIs públicas, repositórios científicos e agências governamentais (NASA, OMS, Banco Mundial, IBGE, Wikidata, PeriodO, NOAA, Open-Meteo).
- 🚀 [**Roadmap de Engenharia (`docs/ROADMAP.md`)**](./docs/ROADMAP.md): Evolução do sistema dividida em **4 Horizontes** (do Core Enciclopédico até a Cartografia Histórica, Observatório NASA e Expansão Cósmica do Sistema Solar — todos concluídos).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Frontend Web** | Next.js 15 (App Router, Turbopack, SSR, SEO), React 19, TypeScript. |
| **Motor Gráfico 3D** | Three.js, React Three Fiber (R3F), Drei, shaders customizados GLSL em espaço mundial. |
| **Design System & UI** | Tailwind CSS com tokens próprios (D14 — “Instrumento sereno”), primitivos em `components/ui` sobre Radix UI (Dialog, Tabs, Tooltip), Lucide Icons. |
| **Estado & Sincronização** | Zustand com stores desacopladas (globo, linha do tempo, cenas, cosmos, observatório, estudos, layout) e estado compartilhável na URL. |
| **Visualização de Dados** | Recharts (gráficos temporais comparativos do Banco Mundial) e `d3-geo` / `which-polygon` (picking espacial). |
| **Backend de Dados** | Python 3.12, FastAPI, Clean Architecture, Pydantic, algoritmos astronômicos NOAA. |
| **Banco de Dados & ORM** | PostgreSQL 16 com extensão PostGIS, Prisma ORM. |
| **Camada de Cache** | Redis 7 (cache de clima Open-Meteo de 15min e dados voláteis). |
| **Infraestrutura** | Docker Compose para orquestração de microsserviços e persistência. |

---

## ⚡ Início Rápido (Quickstart)

### Pré-requisitos
- **Node.js** v20+ ou v22+
- **pnpm** v9+ ou v12+
- **Docker** e **Docker Compose**

### 1. Clonar o Repositório e Instalar Dependências
```bash
# Instalar todas as dependências do monorepo
pnpm install
```

### 2. Configurar Variáveis de Ambiente e Iniciar a Infraestrutura (PostgreSQL, Redis e FastAPI)
```bash
# Copie o exemplo de variáveis de ambiente do app web (inclui DATABASE_URL do Docker Compose)
cp apps/web/.env.example apps/web/.env

# Sobe os containers (PostGIS 16, Redis 7 e FastAPI) em background
pnpm docker:up
```

### 3. Rodar as Migrações Prisma e Carregar o Seed Inicial
O fluxo completo de banco de dados em ambiente limpo é **`pnpm docker:up` → `pnpm db:migrate` → `pnpm db:seed`**:

```bash
# Aplica as migrations versionadas em apps/web/prisma/migrations/ e gera o Prisma Client
pnpm db:migrate

# Popula países piloto, indicadores, dossiês, marcos históricos e estudo de referência
pnpm db:seed
```

> **Reset completo (desenvolvimento):** `pnpm --filter web prisma migrate reset` recria o banco do zero, reaplica todas as migrations versionadas e executa o seed automaticamente. Em produção/CI, utilize `pnpm --filter web prisma migrate deploy`.

### 4. Iniciar o Servidor de Desenvolvimento
```bash
# Inicia a aplicação web em http://localhost:3000
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para interagir com o globo 3D e a plataforma.

---

## 🧪 Testes Automatizados e Qualidade de Código

O projeto conta com **180 testes unitários automatizados distribuídos em 24 suítes**, cobrindo 100% das regras matemáticas, geoespaciais, cartografia histórica, paleogeografia, telemetria orbital da NASA, tráfego aéreo/marítimo, expansão cósmica do Sistema Solar e formatação acadêmica:

```bash
# Executar os testes por domínio e os testes dos handlers de API
pnpm test

# Executar linting do código (0 erros / 0 warnings)
pnpm lint

# Checagem estrita de tipos TypeScript
pnpm --filter web exec tsc --noEmit

# Compilação de produção do Next.js
pnpm build
```

---

### Smoke e regressão visual

A suíte Playwright usa o build de produção e abre a porta 3002. Ela verifica a seleção de país no globo, a fonte carregada e a timeline em larguras de 1366 e 1920 px. As capturas abrangem os controles da interface com o canvas oculto para estabilizar a comparação.

```bash
pnpm --filter web exec playwright install --with-deps chromium
pnpm build
pnpm test:e2e
```

Os baselines Linux estão em `apps/web/test/e2e/snapshots/`. Para uma alteração visual intencional, gere as capturas no Chromium do projeto em Linux com `pnpm test:e2e --update-snapshots`.

## 🪐 Expansão Cósmica & Sistema Solar 3D (Horizonte 4 Concluído)

O TellusPedia expande a fronteira do conhecimento da Terra para a imensidão do Sistema Solar e da abóbada celeste:
- **Efemérides Keplerianas Analíticas Standish (1992)/NASA JPL**: Resolução contínua da Equação de Kepler por Newton-Raphson com convergência $< 10^{-10}$ a 60 FPS na Linha do Tempo, cobrindo todos os 8 planetas do Sistema Solar + Plutão (`apps/web/src/lib/astronomy-planets.ts`).
- **Mapeamento Didático de Escala Balanceada**: Transformação power-law $R_{\text{scene}} = 28 \cdot r^{0.55}$ preservando a ordem radial dos corpos celestes sem colisões visuais ou z-fighting no frustum da câmera.
- **Sol Central Emissivo (`SunCore`)**: Shader GLSL customizado de corona pulsante acoplada ao tempo (`uTime`) com `pointLight` central gerando iluminação física realista sobre os planetas.
- **Planetas e Anéis PBR (`PlanetarySystem`)**: Malhas tridimensionais texturizadas, anéis translúcidos de Saturno e Urano e curvas orbitais fechadas (`generateOrbitalPathPoints`).
- **Desduplicação da Terra no Modo Cósmico**: A Terra utiliza a malha texturizada com shader dia/noite e Fresnel do globo fotorrealista (`EarthSphere`), sem esferas genéricas duplicadas.
- **Cinturão de Asteroides Instanciado (`AsteroidBeltLayer`)**: Mais de 3.000 asteroides individuais entre Marte e Júpiter renderizados via `THREE.InstancedMesh` com matrizes de rotação e tamanhos heterogêneos.
- **Cometa 1P/Halley & Chuvas de Meteoros (`CometHalleyTrajectory`, `MeteorShowersLayer`)**: Órbita excêntrica ($e = 0.967$) com cauda iônica/poeira orientada antipodalmente ao Sol e intensidade $1/r^2$; chuvas sazonais de meteoros (Perseidas e Geminídeas) com feixes luminosos convergentes.
- **Abóbada Celeste HYG & 88 Constelações (`SkyStars`, `hyg-star-data`)**: Catálogo HYG v4.1 até magnitude $V \le 6.5$ em coordenadas equatoriais J2000 no raio $R = 900$, cor pelo índice $B-V$ e as 88 constelações com as linhas modernas do Stellarium.
- **HUD de Inspeção Cósmica (`CosmicInspectorHUD`)**: Painel lateral do design system com dados astrofísicos (raio, massa, gravidade, período orbital, atmosfera), cálculo dinâmico de distâncias Terra/Sol em UA e km, fases lunares via `getLunarPhase`, missões espaciais históricas e referências acadêmicas com links diretos.
- **Seleção Interativa da Terra e da Lua**:
  - *Terra no Modo Cosmos*: Clique ou seleção foca a Terra com ficha planetária e botão contextual "Explorar Superfície / Países".
  - *Lua em Ambos os Modos*: Seleção interativa na órbita terrestre e no modo cósmico com cálculo de posição mundial `currentMoonWorldPos`, anel luminoso e botões contextuais "Voltar à Terra" / "Focar na Terra".
  - *Transição Suave de Câmera*: Reancoramento do vetor `controls.target` em `CosmicCameraController` sem causar divisão por zero ou injeção de `NaN` no `OrbitControls`.
- **Controles de Reprodução Orbital**: Seletor de velocidade ($1\times, 30\times, 365\times$) integrado à `TimelineBar` para simulação contínua do movimento planetário.
- **Persistência de Estudos Cósmicos (RN16)**: Suporte completo a compartilhamento e fork imutável de recortes espaciais com `isCosmicMode`, `focusedCelestialBody` e `activeCosmicLayers` serializados no Prisma e na store do estudo.

---

## 🛰️ Observatório Planetário (NASA) & Tráfego Global (Horizonte 3 Concluído)

O TellusPedia integra telemetria em tempo quase real e camadas científicas das principais agências espaciais e de navegação mundial:
- **Queimadas e Anomalias Térmicas (NASA FIRMS - RN17)**: Focos ativos das últimas 24h via sensores MODIS e VIIRS renderizados em nuvem de pontos `THREE.Points` a $R = 1.0025$ com buffers `Float32Array` mapeando intensidade térmica (*FRP*), mantendo 60 FPS estáveis na GPU.
- **Eventos Severos Globais (NASA EONET - RN17)**: Monitoramento geolocalizado de ciclones tropicais, erupções vulcânicas, inundações e tempestades severas em marcadores 3D a $R = 1.006$ com anéis pulsantes e *raycast picking*.
- **Imagens de Satélite (NASA GIBS)**: Quatro produtos mensais — vegetação (NDVI), neve, gelo marinho e temperatura da superfície — com seletor de mês, legenda oficial e opacidade, servidos pelo próprio TellusPedia (D25).
- **Estação Espacial Internacional (ISS) & Satélites (RN18)**: Posição real por SGP4 a partir dos TLEs do CelesTrak (`satellite.js`, carregado só quando a camada é ligada), órbita, rastro na superfície e satélites visíveis a olho nu (D04).
- **Tráfego Aéreo Global (OpenSky Network ADS-B - RN18)**: Amostra global de até 2.000 aeronaves com modelos glTF orientados pelo rumo e interpolação entre leituras (D07).
- **Tráfego Marítimo (AIS - RN18)**: Embarcações reais do AIS Stream em seis corredores estratégicos (Malaca, Suez, Canal da Mancha, Santos, Panamá e Cabo da Boa Esperança) sobre a malha fixa de rotas comerciais (D08).
- **Procedência explícita (T05)**: Cada camada mostra se o dado é ao vivo, calculado ou simulado; com a fonte fora do ar, o servidor devolve o último dado válido ou a referência local, sempre rotulada.
- **Painel do Observatório (`ObservatoryPanel`)**: Cards compactos por camada, com alternadores, contagens, procedência e opções recolhidas (opacidade, filtros, legenda).
- **HUD de Telemetria Científica (`ObservatoryTelemetryHUD`)**: Card flutuante com contadores de telemetria atualizados a cada 1 segundo (coordenadas, altitude, velocidade, iluminação orbital dia/noite) e botão interativo para focar a câmera na ISS.
- **Supressão Automática de Anacronismos (RN09 & RN10)**: Ao navegar na Linha do Tempo para antes de 1957 ou eras paleogeográficas, a telemetria moderna é suprimida do globo e o painel alerta que o recorte histórico pertence ao passado.
- **Persistência de Estudos com Camadas Ativas (RN16)**: O modelo Prisma `Study` serializa `activeObservatoryLayers String[]`, permitindo compartilhar e fazer *fork* imutável de recortes científicos pelo link `/study/[slug]`.

---

## 🏛️ Cartografia Histórica, Paleogeografia & Trajetórias 3D (Horizonte 2 Concluído)

O TellusPedia inclui suporte nativo a reconstituição histórica, paleogeográfica e espacial:
- **Paleogeografia & Deriva Continental (RN11)**: Escala geológica em Milhões de Anos (Ma) cobrindo **Pangeia (~250 Ma)**, fragmentação (~200 Ma), **Gondwana & Laurásia (~150 Ma)** e **Cretáceo K-Pg (~66 Ma)** com blend procedural no shader Three.js (`uPaleoTexture`, `uPaleoFactor`), linhas de fratura tectônica e **supressão física automática de luzes elétricas urbanas** (`cityLightFactor -> 0`).
- **Player de Cenas Históricas (D12, D24)**: Cenas descritas em JSON (`src/data/scenes/`) com trajetória de superfície ou cislunar e um painel genérico — Magalhães–Elcano (1519–1522, com o diário de Pigafetta), Apollo 11 (1969), Marco Polo (1271), Vasco da Gama (1497), 1914, 1939 e a queda do Muro de Berlim (1989). As cenas grandes carregam sob demanda.
- **Snapshots TopoJSON Históricos**: Mapas mundiais autênticos dos anos **1870**, **1914**, **1939** e **1969** com interpolação de opacidade (*cross-fade*) no Three.js e descarte seguro de buffers de memória GPU.
- **Entidades Históricas Extintas**: Reconstituição de fronteiras e fichas de nações do passado (Reino da Prússia, União Soviética, Império Austro-Húngaro, Alemanha Oriental/RDA, Alemanha Ocidental/RFA, Império Otomano, Iugoslávia e Tchecoslováquia) com continuidade temporal bidirecional para as nações contemporâneas.
- **Picking Espacial (<0.2ms)**: Raycasting interativo na esfera unitária que se adapta em tempo de execução ao mapa histórico ativo.
- **Badges de Era Contextuais**: Indicadores flutuantes no globo (`HistoricalEraBadge`, `PaleoEraBadge`) com proteção contra colisões e restauração imediata para 2024.
- **Estudos Históricos com Fork Imutável**: Preservação do estado da cartografia histórica, era geológica (`geologicalMa`) e rotas ativas (`activeRouteId`) em links compartilháveis `/study/[slug]`.

---

## 📐 Estrutura do Monorepo

```
telluspedia/
├── apps/
│   └── web/                               # Aplicação Web Next.js 15 + Three.js/R3F
│       ├── prisma/                        # Schema Prisma, migrations versionadas e seed de dados
│       ├── src/
│       │   ├── app/                       # Rotas (/, /pais/[iso], /compare, /study/[slug], /studies, /dossies) e APIs (/api/*)
│       │   ├── components/                # Globe 3D, Sistema Solar, HUDs, Reader Mode, Timeline
│       │   ├── stores/                    # Stores Zustand (globo, linha do tempo, cenas, cosmos, observatório, estudos, layout)
│       │   ├── data/scenes/               # Cenas históricas em JSON
│       │   └── lib/                       # Domínio: épocas, países, entidades históricas, efemérides, Observatório, estudos
│       └── test/                          # Testes unitários (node:test + tsx, `pnpm test`) e e2e/ (Playwright)
├── services/
│   └── data-pipeline/                     # Microsserviço Python FastAPI
│       ├── app/                           # Endpoints de efemérides NOAA e clima
│       ├── tests/                         # Testes automatizados do FastAPI
│       └── Dockerfile                     # Imagem de produção
├── docs/                                  # Documentação completa de Discovery, Arquitetura e Fontes
├── docker-compose.yml                     # Orquestração do PostGIS, Redis e FastAPI
├── package.json                           # Scripts do monorepo
└── pnpm-workspace.yaml                    # Configuração de workspaces
```

---

## 📜 Licença e Atribuição

Este projeto é desenvolvido para fins educacionais, científicos e de pesquisa acadêmica aberta.
Os dados e camadas geofísicas utilizam serviços públicos com atribuição institucional obrigatória:
- **NASA** (Earthdata, GIBS, FIRMS, EONET) e efemérides Standish/JPL
- **CelesTrak**, **OpenSky Network** e **AIS Stream** (telemetria orbital, aérea e marítima)
- **Organização Mundial da Saúde (OMS)**
- **Banco Mundial** (World Development Indicators)
- **Natural Earth Data** e **Wikidata / Wikimedia Foundation**
