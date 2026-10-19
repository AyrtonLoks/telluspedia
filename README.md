# 🌍 TellusPedia

> **Enciclopédia Geopolítica, Histórica e Observatório Planetário/Cósmico em Tempo Real**

O **TellusPedia** unifica enciclopédias acadêmicas tradicionais, globos 3D espaciais, dados geofísicos da NASA e indicadores socioeconômicos globais em uma única experiência contínua e interativa. A plataforma combina um **Globo Terrestre 3D** acoplado a uma **Linha do Tempo deslizável de 50 anos**, uma interface de leitura em duas densidades (**Inspector HUD** e **Modo Leitura Profunda** com citações acadêmicas **ABNT/APA/MLA/BibTeX**), um **Comparador de até 4 países** e um sistema de **Estudos Imutáveis com suporte a Forks**.

---

## 📑 Índice da Documentação Oficial

Toda a documentação técnica, científica e de negócios do projeto está centralizada no diretório [`docs/`](./docs/):

- 📜 [**Discovery de Negócio (`docs/DISCOVERY.md`)**](./docs/DISCOVERY.md): Contexto, dores resolvidas, 23 Regras de Negócio (**RN01 a RN23**), fluxos macro e critérios de aceite (**CA01 a CA07**).
- 🏗️ [**Arquitetura Técnica (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md): Diagramas de fluxo, arquitetura do Frontend (Next.js 15, R3F, shaders GLSL, picking <0.2ms), Clean Architecture do Backend Python (FastAPI), política de cache no Redis por volatilidade (**RN23**) e modelo relacional Prisma/PostGIS.
- 🔬 [**Mapeamento de Fontes Oficiais (`docs/DATA_SOURCES.md`)**](./docs/DATA_SOURCES.md): Catálogo detalhado das APIs públicas, repositórios científicos e agências governamentais (NASA, OMS, Banco Mundial, IBGE, Wikidata, PeriodO, NOAA, Open-Meteo).
- 🚀 [**Roadmap de Engenharia (`docs/ROADMAP.md`)**](./docs/ROADMAP.md): Evolução do sistema dividida em **4 Horizontes** (do Core Enciclopédico até a Cartografia Histórica, Observatório NASA e Expansão Cósmica).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Frontend Web** | Next.js 15 (App Router, Turbopack, SSR, SEO), React 19, TypeScript. |
| **Motor Gráfico 3D** | Three.js, React Three Fiber (R3F), Drei, shaders customizados GLSL em espaço mundial. |
| **Design System & UI** | Tailwind CSS, Radix UI Primitives, Lucide Icons, Glassmorphism (*Cosmic Academic*). |
| **Estado & Sincronização** | Zustand com stores desacopladas (`globeStore`, `timelineStore`, `studyStore`). |
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

### 2. Iniciar a Infraestrutura (PostgreSQL, Redis e FastAPI)
```bash
# Sobe os containers em background
pnpm docker:up
```

### 3. Rodar as Migrações e Carregar o Seed Inicial
```bash
# Executa migrações do Prisma e popula os países piloto e geometrias
pnpm db:migrate
pnpm db:seed
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
# Inicia a aplicação web em http://localhost:3000
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para interagir com o globo 3D e a plataforma.

---

## 🧪 Testes Automatizados e Qualidade de Código

O projeto conta com **148 testes unitários automatizados distribuídos em 22 suítes**, cobrindo 100% das regras matemáticas, geoespaciais, cartografia histórica, paleogeografia, efemérides translunares, telemetria naval e formatação acadêmica:

```bash
# Executar a suíte de testes unitários (148 testes / 22 suítes passando)
pnpm test

# Executar linting do código (0 erros / 0 warnings)
pnpm lint

# Checagem estrita de tipos TypeScript
pnpm --filter web exec tsc --noEmit

# Compilação de produção do Next.js
pnpm build
```

---

## 🏛️ Cartografia Histórica, Paleogeografia & Trajetórias 3D (Horizonte 2 Concluído)

O TellusPedia inclui suporte nativo a reconstituição histórica, paleogeográfica e espacial:
- **Paleogeografia & Deriva Continental (RN11)**: Escala geológica em Milhões de Anos (Ma) cobrindo **Pangeia (~250 Ma)**, fragmentação (~200 Ma), **Gondwana & Laurásia (~150 Ma)** e **Cretáceo K-Pg (~66 Ma)** com blend procedural no shader Three.js (`uPaleoTexture`, `uPaleoFactor`), linhas de fratura tectônica e **supressão física automática de luzes elétricas urbanas** (`cityLightFactor -> 0`).
- **Circum-navegação de Magalhães-Elcano (1519–1522) (RN12)**: Reconstrução tridimensional geodésica no raio $1.004$ com a *Nau Victoria* navegando em base ortonormal, rastro de esteira (*wake effect*), waypoints históricos e HUD de telemetria naval com extratos do diário de Antonio Pigafetta.
- **Snapshots TopoJSON Históricos**: Mapas mundiais autênticos dos anos **1870**, **1914**, **1939** e **1969** com interpolação de opacidade (*cross-fade*) no Three.js e descarte seguro de buffers de memória GPU.
- **Entidades Históricas Extintas**: Reconstituição de fronteiras e fichas de nações do passado (Reino da Prússia, União Soviética, Império Austro-Húngaro, Alemanha Oriental/RDA, Alemanha Ocidental/RFA, Império Otomano, Iugoslávia e Tchecoslováquia) com continuidade temporal bidirecional para as nações contemporâneas.
- **Picking Espacial (<0.2ms)**: Raycasting interativo na esfera unitária que se adapta em tempo de execução ao mapa histórico ativo.
- **Trajetória 3D da Missão Apollo 11 (1969)**: Reconstrução tridimensional do voo translunar da Terra até o Mar da Tranquilidade na Lua com curva de Catmull-Rom, animação da nave (CSM Columbia / LM Eagle) e HUD de telemetria científica (velocidade, distância e tempo de missão decorrido GET).
- **Badges de Era Contextuais**: Indicadores flutuantes no globo (`HistoricalEraBadge`, `PaleoEraBadge`) com proteção contra colisões e restauração imediata para 2024.
- **Estudos Históricos com Fork Imutável**: Preservação do estado da cartografia histórica, era geológica (`geologicalMa`) e rotas ativas (`activeRouteId`) em links compartilháveis `/study/[slug]`.

---

## 📐 Estrutura do Monorepo

```
telluspedia/
├── apps/
│   └── web/                               # Aplicação Web Next.js 15 + Three.js/R3F
│       ├── prisma/                        # Schema Prisma e seed de dados
│       ├── src/
│       │   ├── app/                       # Rotas da aplicação (/, /pais/[iso], /study/[slug], /compare)
│       │   ├── components/                # Globe 3D, Inspector HUD, Reader Mode, Timeline
│       │   ├── stores/                    # Zustand Stores desacopladas
│       │   └── lib/                       # Efemérides solares, índice espacial e citações
│       └── test/                          # Testes unitários com Node TAP runner
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
- **NASA** (Earthdata, GIBS, FIRMS, JPL Horizons)
- **Organização Mundial da Saúde (OMS)**
- **Banco Mundial** (World Development Indicators)
- **Natural Earth Data** e **Wikidata / Wikimedia Foundation**
