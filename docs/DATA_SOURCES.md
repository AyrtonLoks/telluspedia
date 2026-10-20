# Documentação de Discovery — Mapeamento de Fontes de Dados e Insumos Oficiais do TellusPedia

## 1. Contexto
A documentação do TellusPedia estabeleceu que todo o acervo da plataforma será alimentado, tratado e controlado de forma centralizada pelo próprio sistema a partir da integração de fontes abertas, científicas e governamentais (**RN01**). Como o escopo do produto abrange desde dossiês multidisciplinares (Política, Economia, Militar, História, Saúde, Arte, Filosofia, Sociologia, Antropologia, Biologia, Culinária e Esportes) até paleogeografia (Pangeia), cartografia histórica (ex.: Prússia $\rightarrow$ Alemanha), trajetórias físicas 3D, telemetria orbital/ambiental da NASA e astronomia (**RN06 a RN20**), este documento cataloga e padroniza as fontes oficiais primárias de cada regra de negócio.

---

## 2. Dor do Negócio
1. **Heterogeneidade de Fontes e Formatos**: Sem um catálogo oficial de insumos mapeado por domínio, há o risco de utilizar bases inconsistentes, sem licença de uso aberto ou sem cobertura temporal suficiente para sustentar a linha do tempo deslizável de 50 anos e as eras históricas/geológicas (**RN10, RN11**).
2. **Risco de Quebra de Rastreabilidade Acadêmica**: A ausência de padronização das fontes primárias inviabiliza a exigência de exibir a origem e a data de referência de cada indicador, bem como a geração automatizada de citações bibliográficas nos padrões **ABNT NBR 6023**, **APA 7**, **MLA 9** e **BibTeX** (**RN02**).
3. **Conflito de Volatilidade entre Camadas**: Misturar fontes de dados estáticos (como fronteiras históricas e biografias consolidadas) com fontes de alta frequência (como clima, queimadas, posição da ISS e notícias) sem definir a origem de cada insumo compromete a política de segregação de cache (**RN23**).

---

## 3. Objetivo
Mapear, classificar e documentar todas as APIs públicas, repositórios científicos, bases governamentais e catálogos cartográficos/astronômicos que servem como fontes primárias para cada Regra de Negócio (**RN01 a RN23**) e para os 4 Horizontes de Entrega do TellusPedia.

---

## 4. Mapeamento de Fontes por Domínio

### 4.1. Base Enciclopédica, Grafo de Conhecimento e Citações (RN01 a RN05)
- **RN-FONTE-01 — Núcleo Enciclopédico e Hover Preview**:
  - **Wikimedia / Wikipedia REST API**: Fornecimento dos textos enciclopédicos base para o Modo Leitura (**RN03 - Camada 2**) e dos resumos estruturados instantâneos (*page summaries*) para os cards flutuantes de Hover Preview (**RN04**).
  - **Wikidata Query Service (SPARQL) & Wikibase API**: Alimentação do grafo de conhecimento (**RN04**), conectando países, chefes de Estado, tratados, guerras e figuras históricas através de identificadores únicos globais (**QID**), permitindo destacar no globo 3D todos os países envolvidos em um evento transnacional.
- **RN-FONTE-02 — Metadados Bibliográficos e Citações Acadêmicas (ABNT, APA, MLA, BibTeX)**:
  - **Crossref API, OpenAlex & Wikimedia Citoid**: Extração estruturada de metadados de fontes primárias (autores, título, ano, periódico, DOI/ISBN) vinculados aos verbetes e indicadores para exportação automática de referências nos formatos ABNT NBR 6023, APA, MLA e BibTeX (**RN02**).

### 4.2. Globo 3D Base, Fronteiras Contemporâneas, Clima e Hora (RN06 a RN08)
- **RN-FONTE-03 — Malha Geopolítica Contemporânea e Níveis de Detalhe (LoD)**:
  - **Natural Earth Data (Escalas 1:110m, 1:50m e 1:10m)**: Polígonos vetoriais de Estados-Nação soberanos, territórios disputados e regiões autônomas (**RN07**), já divididos em três níveis de resolução para atender ao requisito de performance gráfica e carregamento progressivo conforme o zoom (**RN21**).
  - **ISO 3166-1 / UN M49 & REST Countries**: Padronização de códigos de países (alpha-3, alpha-2, numérico), bandeiras oficiais em formato vetorial SVG, capitais e moedas para o Inspector HUD (**RN03 - Camada 1**).
- **RN-FONTE-04 — Iluminação Solar (Dia/Noite), Fuso Horário e Clima Atual**:
  - **Algoritmo de Efemérides Solares (NOAA Solar Position) / NASA JPL Horizons**: Cálculo contínuo do ponto subsolar (latitude e longitude) para renderizar a face iluminada e a face noturna do globo via shaders GLSL (**RN08**).
  - **IANA Time Zone Database (tzdb)**: Determinação exata do fuso horário e hora local de cada país ou região selecionada (**RN08**).
  - **Open-Meteo API & NOAA Global Forecast System (GFS)**: Dados meteorológicos e climáticos em tempo real para o país selecionado no Inspector HUD (**RN08**).

### 4.3. Linha do Tempo, Mapas Históricos, Paleogeografia e Trajetórias 3D (RN09 a RN12)
- **RN-FONTE-05 — Periodização Histórica e Marcos da Linha do Tempo (50 Anos Padrão)**:
  - **PeriodO (Gazetteer of Historical Periods) & Wikidata Temporal Entities**: Definição canônica de eras e períodos históricos por região, alimentando a barra de linha do tempo deslizável de 50 anos com marcos distribuídos acima e abaixo do eixo (**RN10**).
- **RN-FONTE-06 — Paleogeografia (Pangeia) e Deriva Continental**:
  - **GPlates Web Service (GWS) & PALEOMAP Project**: Modelos cinemáticos de placas tectônicas e malhas paleogeográficas que reconstroem a configuração física dos continentes em eras geológicas antigas, permitindo renderizar a Pangeia e sua fragmentação (**RN11 - item 1**).
- **RN-FONTE-07 — Cartografia Histórica e Evolução de Fronteiras (ex.: Prússia $\rightarrow$ Alemanha)**:
  - **CShapes 2.0 Dataset (ETH Zürich)**: Polígonos GIS históricos com resolução diária mapeando fronteiras e capitais de Estados independentes e dependentes (1886–presente).
  - **OpenHistoricalMap (OHM) & Clio-Infra / Euratlas**: Malhas vetoriais históricas para períodos anteriores ao século XIX (Império Romano, reinos medievais, unificação da Prússia em Alemanha) (**RN11 - item 2**).
- **RN-FONTE-08 — Reconstrução Espacial 3D de Acontecimentos Físicos**:
  - **NASA SPICE Toolkit Archives & JPL Horizons**: Dados oficiais de telemetria e efemérides históricas de missões espaciais para renderizar a órbita e trajetória do foguete entre a Terra e a Lua na missão Apollo 11 (**RN12 - item 1**).
  - **OpenHistoricalMap, Wikidata Geoshapes & Aviation Safety Network (ASN) / NTSB**: Coordenadas de deslocamento para reconstruir marchas de exércitos, grandes expedições e trajetórias de aeronaves em acidentes históricos (**RN12 - item 2**).

### 4.4. Matriz Multidisciplinar, Personalidades e Comparador (RN13 a RN16)

| Dimensão Multidisciplinar | Fontes Primárias, APIs e Catálogos Oficiais | Regras Atendidas |
| :--- | :--- | :--- |
| **1. Geografia Física e Humana** | IBGE API (API de Países e Agregados), Natural Earth Physical, WorldPop e FAO AQUASTAT (hidrografia, relevo, biomas e demografia). | RN13.1, RN15 |
| **2. Estado, Governo, Política e Defesa** | V-Dem Dataset (*Varieties of Democracy*), SIPRI Databases (gastos militares e defesa), Correlates of War (COW) e Wikidata Gov. | RN13.2, RN15 |
| **3. Economia e Indicadores Sociais** | World Bank Indicators API (Banco Mundial), IBGE API, IMF Data API (FMI) e UNDP Human Development Data (IDH/PNUD). | RN13.3, RN15 |
| **4. História e Linha do Tempo** | Wikidata Historical Events, Seshat: Global History Databank e PeriodO. | RN10, RN13.4 |
| **5. Personalidades e Figuras Importantes** | MIT Pantheon Dataset (base global de figuras históricas por área e impacto), Wikidata Biographies e VIAF. | RN13.5, RN14 |
| **6. Cultura, Humanidades e Sociedade** | UNESCO World Heritage & Intangible Cultural Heritage APIs, Europeana / Met Museum Open Access API (Arte), Stanford Encyclopedia of Philosophy / PhilPapers (Filosofia), D-PLACE (Antropologia) e Olympedia / Wikidata Sports. | RN13.6, RN15 |
| **7. Biologia e Saúde Pública (incluindo COVID-19)** | WHO Global Health Observatory (GHO) OData API, Our World in Data / WHO COVID-19 Dashboard (séries históricas da pandemia e endemias) e GBIF / IUCN Red List API (biodiversidade). | RN13.7, RN15 |
| **8. Notícias e Atualidades** | GDELT Project API (*Global Database of Events, Language, and Tone*) e feeds estruturados de agências públicas (Agência Brasil, UN News). | RN13.8, RN14 |

- **RN-FONTE-09 — Linha do Tempo Transversal de Personalidade ou Tema (RN14)**: Cruzamento automatizado entre o Wikidata Entity Graph (cargos, obras, eventos históricos) e o GDELT Knowledge Graph (notícias contemporâneas).

### 4.5. Observatório Planetário (NASA), Órbitas, Tráfego e Cosmos (RN17 a RN20)
- **RN-FONTE-10 — Camadas Geofísicas, Queimadas, Ventos e Lixo Marítimo (RN17)**:
  - **NASA GIBS (Global Imagery Browse Services — WMTS/WMS)**: Mais de 1.000 camadas de satélite diárias para relevo, cobertura vegetal, neve/gelo e anomalias climáticas.
  - **NASA FIRMS (MODIS e VIIRS) & INPE BDQueimadas**: Dados globais de focos ativos de queimadas e anomalias térmicas.
  - **NASA EONET (Earth Observatory Natural Event Tracker)**: Rastreamento geolocalizado de tempestades, vulcões, inundações, secas e incêndios florestais.
  - **NOAA GFS & NASA Earthdata / OSCAR**: Malhas globais de fluxos de ventos atmosféricos e correntes oceânicas.
  - **NOAA Marine Debris Program, Global Drifter Program (GDP) & NASA CYGNSS**: Acúmulo de microplásticos, giros oceânicos e fluxo de lixo marítimo.
- **RN-FONTE-11 — Lua, ISS, Satélites Artificiais e Tráfego Aéreo/Marítimo (RN18)**:
  - **CelesTrak GP API & Space-Track.org**: Elementos orbitais (TLE / OMM) para rastreamento da ISS e satélites artificiais.
  - **OpenSky Network API**: Dados abertos ADS-B para visualização de aeronaves em tempo quase real.
  - **Global Fishing Watch, NOAA MarineCadastre & OpenSeaMap**: Dados agregados AIS para rotas marítimas comerciais.
- **RN-FONTE-12 — Abóbada Celeste, Constelações por Data e Cosmos (RN19, RN20)**:
  - **HYG Star Database (v3) + Limites Oficiais da IAU (União Astronômica Internacional)**: Catálogo com 3.500+ estrelas ($V \le 5.5$) em coordenadas equatoriais J2000 (Ascensão Reta $\alpha$, Declinação $\delta$), índice de cor $B-V$ e magnitude visual aparente, integrado com as 88 constelações oficiais e asterismos padronizados (`hyg-star-data.ts`).
  - **Efemérides Keplerianas Standish (1992) & NASA JPL Horizons API**: Formulação analítica de elementos orbitais osculadores e taxas seculares com resolução contínua da Equação de Kepler a 60 FPS (`astronomy-planets.ts`), calibrada com o endpoint proxy `/api/observatory/cosmos` com cache em memória (SWR TTL 1h) para validação astronômica dos 8 planetas, Plutão, Cometa 1P/Halley e chuvas sazonais de meteoros.

---

## 5. Diretrizes de Ingestão, Governança e Caching (RN23)

### 5.1. Fluxos de Ingestão por Ciclo
1. **Dados Imutáveis e Consolidados (Ciclo Longo)**: Malhas de fronteiras (Natural Earth), paleogeografia (GPlates), cartografia histórica (CShapes), catálogos estelares (HYG/IAU) e telemetria histórica (Apollo 11). Cache permanente e headers HTTP imutáveis.
2. **Sincronização de Indicadores e Dossiês (Ciclo Periódico)**: Ingestão programada de APIs do Banco Mundial, IBGE, OMS (WHO GHO), SIPRI, V-Dem e Wikidata. Registro obrigatório da data de referência e metadados para citação ABNT/APA. Cache de 24h a 7 dias no Redis.
3. **Telemetria Planetária e Dados Voláteis (Ciclo Curto / Quase Real)**: Queimadas (NASA FIRMS), eventos severos (NASA EONET), clima (Open-Meteo), órbitas (CelesTrak / ISS), tráfego aéreo (OpenSky ADS-B) e rotas marinhas (AIS). Implementados via Route Handlers dedicados em `apps/web/src/app/api/observatory/...` com cache server-side em memória/SWR (TTL de 60s a 15 min), deduplicação de chamadas in-flight e conjuntos de fallback de alta fidelidade contra rate limits ou indisponibilidade externa.

### 5.2. Atribuição Institucional de Créditos
Conforme as políticas de dados abertos da NASA (Earthdata / GIBS / FIRMS), OMS, IBGE e Wikidata, a interface do TellusPedia exibe os créditos institucionais obrigatórios no rodapé e nos cards de citação sempre que uma camada ou indicador estiver ativo na tela (**RN02, RN17**).
