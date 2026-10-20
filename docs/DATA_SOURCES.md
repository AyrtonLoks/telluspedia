# Documentação de Discovery — Mapeamento de Fontes de Dados e Insumos Oficiais do TellusPedia

## 1. Contexto

A documentação do TellusPedia estabeleceu que todo o acervo da plataforma será alimentado, tratado e controlado de forma centralizada pelo próprio sistema a partir da integração de fontes abertas, científicas e governamentais (**RN01**). Como o escopo do produto abrange desde dossiês multidisciplinares (Política, Economia, Militar, História, Saúde, Arte, Filosofia, Sociologia, Antropologia, Biologia, Culinária e Esportes) até paleogeografia (Pangeia), cartografia histórica (ex.: Prússia $\rightarrow$ Alemanha), trajetórias físicas 3D, telemetria orbital/ambiental da NASA e astronomia (**RN06 a RN20**), torna-se indispensável mapear exatamente quais bases oficiais alimentarão cada regra de negócio.

---

## 2. Dor do Negócio

1. **Heterogeneidade de Fontes e Formatos**: Sem um catálogo oficial de insumos mapeado por domínio, há o risco de utilizar bases inconsistentes, sem licença de uso aberto ou sem cobertura temporal suficiente para sustentar a linha do tempo deslizável de 50 anos e as eras históricas/geológicas (**RN10, RN11**).
2. **Risco de Quebra de Rastreabilidade Acadêmica**: A ausência de padronização das fontes primárias inviabiliza a exigência de exibir a origem e a data de referência de cada indicador, bem como a geração automatizada de citações bibliográficas nos padrões **ABNT NBR 6023**, **APA 7** e **MLA 9** (**RN02**).
3. **Conflito de Volatilidade entre Camadas**: Misturar fontes de dados estáticos (como fronteiras históricas e biografias consolidadas) com fontes de alta frequência (como clima, queimadas, posição da ISS e notícias) sem definir a origem de cada insumo compromete a política de segregação de cache (**RN23**).

---

## 3. Objetivo

Mapear, classificar e documentar todas as APIs públicas, repositórios científicos, bases governamentais e catálogos cartográficos/astronômicos que servirão como fontes primárias para cada Regra de Negócio (**RN01 a RN23**) e para os 4 Horizontes de Entrega do TellusPedia.

---

## 4. Regras de Negócio (Mapeamento de Fontes por Domínio do TellusPedia)

### 4.1. Fontes para Base Enciclopédica, Grafo de Conhecimento e Citações (RN01 a RN05)

- **RN-FONTE-01 — Núcleo Enciclopédico e Pré-visualização de Verbetes (Hover Preview)**:
  - **Wikimedia / Wikipedia REST API**: Fornecimento dos textos enciclopédicos base para o Modo Leitura (**RN03 - Camada 2**) e dos resumos estruturados instantâneos (*page summaries*) para os cards flutuantes de Hover Preview (**RN04**).
  - **Wikidata Query Service (SPARQL) & Wikibase API**: Alimentação do grafo de conhecimento (**RN04**), conectando países, chefes de Estado, tratados, guerras e figuras históricas através de identificadores únicos globais (**QID**), permitindo destacar no globo 3D todos os países envolvidos em um evento transnacional.
- **RN-FONTE-02 — Metadados Bibliográficos e Citações Acadêmicas (ABNT, APA, MLA)**:
  - **Crossref API, OpenAlex & Wikimedia Citoid**: Extração estruturada de metadados de fontes primárias (autores, título, ano, periódico, DOI/ISBN) vinculados aos verbetes e indicadores para exportação automática de referências nos formatos **ABNT**, **APA** e **MLA** (**RN02**).

### 4.2. Fontes para Globo 3D Base, Fronteiras Contemporâneas, Clima e Hora (RN06 a RN08)

- **RN-FONTE-03 — Malha Geopolítica Contemporânea e Níveis de Detalhe (LoD)**:
  - **Natural Earth Data (Escalas 1:110m, 1:50m e 1:10m)**: Polígonos vetoriais de Estados-Nação soberanos, territórios disputados e regiões autônomas (**RN07**), já divididos em três níveis de resolução para atender ao requisito de performance gráfica e carregamento progressivo conforme o zoom (**RN21**).
  - **ISO 3166-1 / UN M49 & REST Countries**: Padronização de códigos de países, bandeiras oficiais em formato vetorial, capitais e moedas para o Inspector HUD (**RN03 - Camada 1**).
- **RN-FONTE-04 — Iluminação Solar (Dia/Noite), Fuso Horário e Clima Atual**:
  - **Algoritmo de Efemérides Solares (NOAA Solar Position) / NASA JPL Horizons**: Cálculo em tempo real do ponto subsolar para renderizar a face iluminada e a face noturna do globo (**RN08**).
  - **IANA Time Zone Database (tzdb)**: Determinação exata do fuso horário e hora local de cada país ou região selecionada (**RN08**).
  - **Open-Meteo API & NOAA Global Forecast System (GFS)**: Dados meteorológicos e climáticos em tempo real para o país selecionado no Inspector HUD (**RN08**).

### 4.3. Fontes para Linha do Tempo, Mapas Históricos, Paleogeografia e Trajetórias 3D (RN09 a RN12)

- **RN-FONTE-05 — Periodização Histórica e Marcos da Linha do Tempo (Range Padrão de 50 Anos)**:
  - **PeriodO (Gazetteer of Historical Periods) & Wikidata Temporal Entities**: Definição canônica de eras e períodos históricos por região, alimentando a barra de linha do tempo deslizável de 50 anos com seus marcos (*milestones*) distribuídos acima e abaixo do eixo e categorizados por filtros temáticos (**RN10**).
- **RN-FONTE-06 — Paleogeografia (Pangeia) e Deriva Continental**:
  - **GPlates Web Service (GWS) & PALEOMAP Project**: Modelos cinemáticos de placas tectônicas e malhas paleogeográficas que reconstroem a configuração física dos continentes em eras geológicas antigas, permitindo renderizar a Pangeia e sua fragmentação (**RN11 - item 1**).
- **RN-FONTE-07 — Cartografia Histórica e Evolução de Fronteiras (ex.: Prússia $\rightarrow$ Alemanha)**:
  - **CShapes 2.0 Dataset (ETH Zürich)**: Polígonos GIS históricos com resolução diária mapeando fronteiras e capitais de Estados independentes e territórios dependentes (1886–presente).
  - **OpenHistoricalMap (OHM) & Clio-Infra / Euratlas**: Malhas vetoriais históricas para períodos anteriores ao século XIX (Império Romano, reinos medievais, unificação da Prússia em Alemanha, ascensão e queda de impérios), garantindo a mutação do mapa conforme a data na timeline (**RN11 - item 2**).
- **RN-FONTE-08 — Reconstrução Espacial 3D de Acontecimentos Físicos**:
  - **NASA SPICE Toolkit Archives & JPL Horizons**: Dados oficiais de telemetria e efemérides históricas de missões espaciais para renderizar a órbita e a trajetória completa do foguete entre a Terra e a Lua no marco da missão Apollo 11 (**RN12 - item 1**).
  - **OpenHistoricalMap, Wikidata Geoshapes & Aviation Safety Network (ASN) / NTSB**: Coordenadas de deslocamento para reconstruir marchas de exércitos em conflitos militares, expedições históricas e trajetórias de aeronaves envolvidas em acidentes históricos (**RN12 - item 2**).

### 4.4. Fontes para a Matriz Multidisciplinar, Personalidades e Comparador de até 4 Países (RN13 a RN16)

| Dimensão do TellusPedia | Fontes Primárias, APIs e Catálogos Oficiais | Regras Atendidas |
| :--- | :--- | :--- |
| **1. Geografia Física e Humana** | IBGE API (API de Países e Agregados), Natural Earth Physical, WorldPop e FAO AQUASTAT (hidrografia, relevo, biomas e demografia). | RN13.1, RN15 |
| **2. Estado, Governo, Política e Defesa** | V-Dem Dataset (*Varieties of Democracy*) (regimes políticos e divisão de poderes), SIPRI Databases (gastos militares, arsenais e defesa), Correlates of War (COW) e Wikidata Gov. | RN13.2, RN15 |
| **3. Economia e Indicadores Sociais** | World Bank Indicators API (Banco Mundial), IBGE API, IMF Data API (FMI) e UNDP Human Development Data (IDH/PNUD). | RN13.3, RN15 |
| **4. História e Linha do Tempo** | Wikidata Historical Events, Seshat: Global History Databank e PeriodO. | RN10, RN13.4 |
| **5. Personalidades e Figuras Importantes** | MIT Pantheon Dataset (base global de figuras históricas classificadas por área e impacto), Wikidata Biographies e VIAF. | RN13.5, RN14 |
| **6. Cultura, Humanidades e Sociedade (Arte, Filosofia, Sociologia, Antropologia, Culinária, Esportes)** | UNESCO World Heritage & Intangible Cultural Heritage APIs (patrimônio cultural e culinária), Europeana / Met Museum Open Access API (Arte), Stanford Encyclopedia of Philosophy / PhilPapers (Filosofia), D-PLACE (Antropologia e Sociedade) e Olympedia / Wikidata Sports. | RN13.6, RN15 |
| **7. Biologia e Saúde Pública (incluindo COVID-19)** | WHO Global Health Observatory (GHO) OData API (OMS), WHO COVID-19 Dashboard / Our World in Data (OWID) (séries históricas completas da pandemia de COVID-19 e endemias) e GBIF / IUCN Red List API (Biologia e biodiversidade por país). | RN13.7, RN15 |
| **8. Notícias e Atualidades** | GDELT Project API (*Global Database of Events, Language, and Tone*) (eventos jornalísticos geolocalizados globalmente) e feeds estruturados de agências públicas (Agência Brasil, UN News). | RN13.8, RN14 |

- **RN-FONTE-09 — Linha do Tempo Transversal de Personalidade ou Tema (RN14)**:
  - Cruzamento automatizado entre o **Wikidata Entity Graph** (cargos políticos, obras, eventos históricos e locais georreferenciados vinculados à pessoa/tema) e o **GDELT Knowledge Graph** (notícias contemporâneas envolvendo a entidade, como no exemplo de Donald Trump).

### 4.5. Fontes para Observatório Planetário (NASA), Órbitas, Tráfego e Cosmos (RN17 a RN20)

- **RN-FONTE-10 — Camadas Geofísicas, Queimadas, Ventos e Lixo Marítimo (RN17)**:
  - **NASA GIBS (Global Imagery Browse Services — WMTS/WMS)**: Mais de 1.000 camadas de imagens de satélite atualizadas diariamente para relevo, cobertura vegetal, neve/gelo e anomalias climáticas, com histórico de quase 30 anos.
  - **NASA FIRMS (Fire Information for Resource Management System — sensores MODIS e VIIRS) & INPE BDQueimadas**: Dados globais de focos ativos de queimadas e anomalias térmicas em tempo quase real.
  - **NASA EONET (Earth Observatory Natural Event Tracker)**: API oficial da NASA para rastreamento geolocalizado de eventos naturais severos (tempestades, vulcões, inundações, secas e incêndios florestais).
  - **NOAA GFS & NASA Earthdata / OSCAR**: Malhas vetoriais globais de fluxos de ventos atmosféricos e correntes oceânicas.
  - **NOAA Marine Debris Program, Global Drifter Program (GDP) & NASA CYGNSS**: Conjuntos de dados científicos sobre acúmulo de microplásticos, giros oceânicos e fluxo de lixo marítimo (**RN17**).
- **RN-FONTE-11 — Lua, ISS, Satélites Artificiais e Tráfego Aéreo/Marítimo (RN18)**:
  - **CelesTrak GP API & Space-Track.org**: Catálogos oficiais de elementos orbitais (*Two-Line Elements* - TLE / OMM) para posicionamento em tempo real da Estação Espacial Internacional (ISS) e satélites artificiais.
  - **OpenSky Network API**: Dados abertos de recepção ADS-B para visualização de aeronaves sobrevoando o globo.
  - **Global Fishing Watch, NOAA MarineCadastre & OpenSeaMap**: Dados históricos e agregados de AIS (*Automatic Identification System*) para traçado das principais rotas marítimas comerciais nos oceanos.
- **RN-FONTE-12 — Abóbada Celeste, Constelações por Data e Expansão Cósmica (RN19, RN20)**:
  - **HYG Star Database (Hipparcos, Yale Bright Star & Gliese Catalogs) + Limites Oficiais da IAU (União Astronômica Internacional)**: Coordenadas estelares e vetores de movimento próprio para renderizar as constelações exatas no céu no dia selecionado na timeline ou na data atual (**RN19**).
  - **NASA JPL Horizons API & Minor Planet Center (MPC)**: Efemérides de alta precisão para a órbita da Lua, planetas do Sistema Solar, asteroides, cometas e meteoros na visão expandida do Cosmos (**RN18, RN20**).

---

## 5. Fluxos Macro de Ingestão e Governança de Dados

- **Fluxo 01 — Ingestão de Dados Imutáveis e Consolidados (Ciclo Longo / CDN)**:
  Coleta e normalização dos conjuntos de dados de paleogeografia (GPlates), fronteiras históricas (CShapes 2.0 / OHM), fronteiras atuais (Natural Earth), catálogos estelares (HYG/IAU) e trajetórias históricas (NASA SPICE) $\rightarrow$ Validação pelo administrador (**RN01**) $\rightarrow$ Publicação com cache de longa duração (**RN23**).
- **Fluxo 02 — Sincronização de Indicadores Socioeconômicos, Políticos, Culturais e de Saúde (Ciclo Periódico)**:
  Ingestão programada das APIs do Banco Mundial, IBGE, OMS (WHO GHO OData API), SIPRI, V-Dem, UNESCO e Wikidata/Wikipédia $\rightarrow$ Registro obrigatório da data de referência e metadados para citação ABNT/APA/MLA (**RN02**) $\rightarrow$ Disponibilização para os dossiês de países (**RN13**), comparador de até 4 países (**RN15**) e linhas do tempo de personalidades (**RN14**).
- **Fluxo 03 — Consumo de Telemetria Planetária, Ambiental e Orbital (Ciclo Curto / Tempo Quase Real)**:
  Consumo sob demanda e cache de curta duração (**RN23**) das camadas de queimadas (NASA FIRMS), imagens orbitais (NASA GIBS), eventos severos (NASA EONET), ventos/clima (NOAA / Open-Meteo), órbitas (CelesTrak / JPL Horizons), tráfego aéreo (OpenSky) e notícias (GDELT).

---

## 6. Critérios de Aceite / Sucesso

- **CA-FONTE-01 (Cobertura Integral de Regras)**: 100% das Regras de Negócio do Discovery v2.0 (**RN01 a RN23**) possuem pelo menos uma fonte primária oficial, pública e gratuita mapeada.
- **CA-FONTE-02 (Padronização de Chaves de Cruzamento)**: Todas as fontes de países e indicadores utilizam ou são convertidas para o código padrão **ISO 3166-1 alpha-3** (para Estados contemporâneos) ou identificadores **Wikidata QID / COW Code** (para Estados históricos como a Prússia e personalidades), garantindo o funcionamento do comparador de até 4 países (**RN15**) e dos recortes compartilháveis (**RN16**).
- **CA-FONTE-03 (Conformidade de Licenciamento e Citação)**: Todas as fontes selecionadas permitem uso educacional/enciclopédico mediante atribuição de autoria, alimentando automaticamente o módulo de referências e citações **ABNT**, **APA** e **MLA** (**RN02**).

---

## 7. Restrições e Premissas

- **Restrição de Chamadas Diretas do Navegador (Proxy e Curadoria Server-Side)**: APIs governamentais e científicas como a WHO GHO OData API (OMS) e a NASA JPL Horizons API não permitem chamadas diretas via navegador do usuário final (por bloqueio de CORS ou limites de rate limit). Portanto, a premissa de negócio estabelece que o TellusPedia realizará a ingestão, o tratamento e o cache em sua própria camada de dados controlada pelo sistema (**RN01, RN23**).
- **Premissa de Atribuição Obrigatória (NASA, OMS, IBGE, Wikidata)**: Conforme as políticas de dados abertos da NASA (Earthdata / GIBS / FIRMS) e da OMS, a interface do TellusPedia exibirá os créditos institucionais das agências sempre que suas respectivas camadas visuais ou séries históricas estiverem ativas na tela (**RN02, RN17**).
