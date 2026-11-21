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
  - **OpenSky Network API**. Amostra global de vetores ADS-B. Ver [tráfego aéreo](#tráfego-aéreo-d07).
  - **AIS Stream**. Posições e informações de viagem transmitidas por estações de bordo. Ver [tráfego marítimo](#tráfego-marítimo-d08).
  - **Global Fishing Watch, NOAA MarineCadastre & OpenSeaMap**: Dados históricos e agregados de AIS (*Automatic Identification System*) para traçado das principais rotas marítimas comerciais nos oceanos.
- **RN-FONTE-12 — Abóbada Celeste, Constelações por Data e Expansão Cósmica (RN19, RN20)**:
  - **Abóbada celeste J2000**. As estrelas do HYG, os traçados do Stellarium e a Via Láctea compartilham o mesmo referencial. Ver [catálogo estelar e Via Láctea](#catálogo-estelar-e-via-láctea-d09).
  - **NASA JPL Horizons API & Minor Planet Center (MPC)**: Efemérides de alta precisão para a órbita da Lua, planetas do Sistema Solar, asteroides, cometas e meteoros na visão expandida do Cosmos (**RN18, RN20**).


#### Tráfego aéreo (D07)

- **Telemetria ADS-B**. OpenSky Network, Matthias Schäfer et al., *Bringing Up OpenSky: A Large-scale ADS-B Sensor Network for Research*, IPSN 2014, p. 83–94. O país exibido corresponde ao endereço ICAO do transponder. [Documentação REST](https://openskynetwork.github.io/opensky-api/rest.html) · [Publicação](https://s3.opensky-network.org/website-public-files/publications/ipsn2014.pdf)
- **Configuração do provedor**. O servidor aceita `OPENSKY_CLIENT_ID` e `OPENSKY_CLIENT_SECRET` para OAuth 2.0. A operação contínua requer licença escrita do OpenSky. A consulta global tem cache de 120 s e retorna uma amostra por células geográficas. `OPENSKY_AIRCRAFT_LIMIT` ajusta o limite entre 1 e 4.000 aeronaves, com padrão de 2.000. A frota local aparece como **Simulado** quando usada. [Termos do OpenSky](https://opensky-network.org/about/terms-of-use)
- **Modelo 3D**. Modelo original genérico do TellusPedia com 220 triângulos no detalhe e 15 na silhueta distante. Nariz em +Z, asas no eixo X e dorso em +Y. A escala visual é adaptativa. As posições entre amostras usam rumo e velocidade em uma esfera terrestre; o rastro usa posições amostradas no cliente. Gere o GLB com `python3 apps/web/scripts/build-aircraft-model.py`. A geometria e o GLB são disponibilizados sob [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

#### Tráfego marítimo (D08)

- **Fonte e condições de uso**. AIS Stream distribui mensagens recebidas por estações AIS. A documentação proíbe WebSocket direto no navegador e orienta repassar apenas os campos necessários por um servidor. O TellusPedia publica amostras normalizadas sem arquivar mensagens brutas. A cobertura depende dos receptores e da atividade local. A documentação informa limites de três conexões por conta e por IP, inscrição em até três segundos e limitação de banda para conexões sem compressão. Consulte as condições do serviço na conta do provedor antes de ampliar o uso. [Documentação do AIS Stream](https://aisstream.io/documentation)
- **Configuração**. Defina `AISSTREAM_API_KEY` somente no ambiente do servidor Node.js 22+, com saída WSS para `stream.aisstream.io`. Uma conexão por processo é compartilhada por requisições e fecha após 90 segundos sem consultas. A integração usa WebSocket nativo sem compactação e áreas pequenas para controlar volume. Em infraestrutura com múltiplas réplicas, mantenha o número de conexões dentro do limite da conta e do IP. Processos efêmeros limitam o acúmulo de posições.
- **Cobertura e atualização**. Malaca, Canal de Suez, Canal da Mancha, Santos, Canal do Panamá e Cabo da Boa Esperança. A amostra reflete somente as posições recebidas nessas áreas. O endpoint `/api/observatory/ais` cacheia por 15 segundos e o globo consulta a cada 20 segundos. O servidor mantém até 6.000 registros em memória, descarta posições com mais de cinco minutos e intercala até 600 posições recentes entre regiões. A espessura e as partículas ilustram o número de estações observadas na área de cada corredor. Ícones próximos na tela são agrupados e o número indica quantos membros podem ser consultados no grupo. O filtro de movimento usa velocidade AIS sobre o solo de pelo menos 1 nó. Velocidades ausentes não entram no filtro. [Áreas de fundeio do Porto de Santos](https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/areas-de-fundeio/)
- **Modelos 3D**. Miniaturas genéricas originais em `vessel-model.ts`, com malhas instanciadas por classe e cores por face para leitura diurna e noturna. A proa usa a orientação AIS, com curso como alternativa em movimento. Sem orientação disponível, o modelo usa uma pose de referência. A geometria representa a classe, com escala ajustada para leitura no globo.
- **Procedência**. Os campos de nome, destino, velocidade e tipo vêm das transmissões disponíveis. Bandeiras são inferidas por uma tabela parcial dos códigos MID da UIT. Os códigos AIS 70–79 identificam cargueiros em geral. O ícone específico de porta-contêineres é usado onde essa classificação é conhecida, como na demonstração. A posição do ícone pode ser estimada por até 60 segundos a partir do curso e da velocidade. Quando o fluxo cai, a última amostra fica disponível por até um minuto com aviso de desatualização. Sem leitura aproveitável, a camada exibe uma frota fictícia identificada como **Simulado**. [Tabela MID da UIT](https://www.itu.int/gladapp/Allocation/MIDs)

#### Catálogo estelar e Via Láctea (D09)

- **HYG v4.1**. David Nash / Astronomy Nexus, com dados de Hipparcos, Yale Bright Star e Gliese. A adaptação converte ascensão reta de horas para graus e empacota 8.920 registros observados até V = 6,5. Dois registros HIP adicionais dão suporte aos traçados. O índice B−V ausente é sinalizado no arquivo e recebe uma cor neutra na apresentação. [CSV original, revisão c7f7f88](https://github.com/astronexus/HYG-Database/blob/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/hygdata_v41.csv) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Constelações modernas do Stellarium v25.4**. Equipe do Stellarium e tradutores pt-BR. A adaptação preserva os caminhos HIP das 88 regiões da IAU e incorpora seus nomes em português do Brasil. Os traçados são as figuras da cultura celeste Modern (IAU) do Stellarium. [Traçados](https://github.com/Stellarium/stellarium/blob/v25.4/skycultures/modern/index.json) · [Nomes pt-BR](https://github.com/Stellarium/stellarium/blob/v25.4/po/stellarium-skycultures/pt_BR.po) · [CC BY-SA 4.0 para os dados](https://github.com/Stellarium/stellarium/blob/v25.4/skycultures/modern/description.md#license)
- **Fundo da Via Láctea**. NASA/Goddard Space Flight Center Scientific Visualization Studio, visualização de Ernie Wright, com dados Gaia DR2 de ESA/Gaia/DPAC. JPEG de 1024 × 512 do fundo sem estrelas brilhantes, mantido intacto e atenuado na renderização. [Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/) · [Termos de reutilização do NASA SVS](https://svs.gsfc.nasa.gov/help/#frequently-asked-questions)

O céu usa +X para ascensão reta de 0 h, +Y para o polo norte celeste e −Z para ascensão reta de 6 h. No globo terrestre, a longitude celeste acompanha `α − GMST` na data astronômica ativa. No Cosmos, o céu converte do equador para a eclíptica J2000 pela obliquidade média de 23,4392911°. As posições do catálogo são fixas na época J2000.

Regenere os dados com Python 3 a partir dos três arquivos vinculados acima.

```sh
python3 apps/web/scripts/build-star-catalog.py hygdata_v41.csv index.json pt_BR.po
```

O binário `HYG1` contém uma contagem total e uma de estrelas visíveis em uint32 little-endian. Cada registro tem 24 bytes com HIP, ascensão reta, declinação, magnitude V, índice B−V e deslocamento na tabela de nomes UTF-8. Os arquivos adaptados do HYG e do Stellarium são distribuídos sob CC BY-SA 4.0.

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

---

## Anexo — Texturas do globo (D02, revisado em 2026-11-20)

Arquivos em `apps/web/public/textures/`, gerados por `apps/web/scripts/textures/build-earth-textures.mjs`
(`pnpm --filter web textures:build`) a partir dos originais em `assets-src/raw/` (fora do git; URLs em
`assets-src/README.md`). As imagens da NASA vêm do novo acervo do Earth Observatory em
`assets.science.nasa.gov` (o antigo `eoimages.gsfc.nasa.gov` saiu do ar).

Cada textura existe em **KTX2** (Basis Universal, com mipmaps; carregada pelo `KTX2Loader`) e em
**JPG/PNG** de fallback, usado quando o navegador não transcodifica o KTX2. Os KTX2 são gravados com o
eixo Y invertido porque o `KTX2Loader` usa `flipY = false`.

| Arquivo | Origem | Licença | Processamento |
|---|---|---|---|
| `earth_day_4k.jpg`/`.ktx2`, `earth_day_2k.jpg`/`.ktx2` | NASA Earth Observatory — Blue Marble Next Generation **com relevo e batimetria**, julho de 2004 (`world.topo.bathy.200407.3x5400x2700.jpg`, [página](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/)) | Domínio público (NASA) | 5400×2700 → 4096×2048 e 2048×1024 (Lanczos); JPEG q88; KTX2 UASTC + RDO + Zstandard, sRGB |
| `earth_night_4k.jpg`/`.ktx2`, `earth_night_2k.jpg`/`.ktx2` | NASA Earth Observatory — “The earth at night” (Suomi NPP VIIRS) ([Commons](https://commons.wikimedia.org/wiki/File:The_earth_at_night.jpg)) | Domínio público (NASA) | JPG de 3840 px mantido; KTX2 ETC1S 4096×2048 e 2048×1024, sRGB |
| `earth_surface_2k.png`/`.ktx2` — canal R | NASA/BMNG — elevação GEBCO 08 em tons de cinza (`gebco_08_rev_elev_5400x2700.jpg`, [página](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/)) | Domínio público (NASA); dados GEBCO | 2048×1024; altura relativa em terra (0 = nível do mar) para o relevo no shader |
| `earth_surface_2k.png`/`.ktx2` — canal G | NASA/BMNG — batimetria GEBCO 08 (`gebco_08_rev_bath_5400x2700.jpg`) | Idem | Máscara de água = batimetria abaixo de 0 m, calculada em 5400 px e reduzida (borda suave); inclui mares interiores como o Cáspio |
| `earth_surface_2k.png`/`.ktx2` — canal B | Idem | Idem | Profundidade relativa (0 = raso, 255 = fossa); zero em terra. KTX2 UASTC linear |
| `earth_clouds_2k.jpg`/`.ktx2` | NASA Earth Observatory — Blue Marble 2002, camada de nuvens (`cloud_combined_2048.jpg`, MODIS/Terra, composição de dois dias + infravermelho nos polos; [página](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/)) | Domínio público (NASA) | Tons de cinza; KTX2 ETC1S. Imagem estática de 2001 — **não** é a nebulosidade atual |
| `paleo/paleo_250ma.png`, `paleo_200ma.png`, `paleo_150ma.png`, `paleo_66ma.png` (+ `.ktx2`) | **PALEOMAP PaleoDEMs** — Scotese, C. R.; Wright, N. (2018). *PALEOMAP Paleodigital Elevation Models (PaleoDEMS) for the Phanerozoic*. Zenodo. [doi:10.5281/zenodo.5460860](https://doi.org/10.5281/zenodo.5460860) — mapas 49 (250 Ma), 43 (200 Ma), 33 (150 Ma) e 16 (65 Ma, usado para o K-Pg de 66 Ma), grade de 1° | **CC BY 4.0** (atribuição obrigatória: Scotese & Wright, 2018) | Elevação/batimetria reamostrada por bicúbica para 2048×1024; cor hipsométrica (oceano na mesma escala de azuis da Blue Marble com batimetria; terra ocre no Permo-Triássico árido, verde no Jurássico/Cretáceo); sombreamento de relevo; **alfa = água** (reflexo do Sol no modo geológico). A cor da vegetação é uma convenção visual, não um dado do PaleoDEM |

**Escolha de resolução:** 4096 px quando `maxTextureSize ≥ 8192`, senão 2048 px (`pickEarthTextureSet` em `EarthSphere.tsx`).

**Limitações conhecidas:** as nuvens são de 2048 px (a versão de 8192 px do Blue Marble não está no novo acervo da NASA); o KTX2 diurno de 4K tem ~6 MB (UASTC, para preservar o degradê do oceano) contra ~1,4 MB do JPG, em troca de ~4× menos memória de vídeo e sem decodificação na thread principal; as suturas de `PaleoPlatesLayer` (`pangea-plates-250ma.json`) usam coordenadas atuais e não se alinham aos paleomapas reconstruídos.

---

## Anexo — Indicadores do Banco Mundial e Metadados de Países (T26, 2026-11-20)

Arquivo versionado em `apps/web/public/data/countries-worldbank-indicators.json`, gerado de forma determinística e reproduzível pelo script `apps/web/scripts/ingest-worldbank-indicators.mjs` para todos os **177 países/territórios** do catálogo Natural Earth 1:110m (`apps/web/public/data/countries-ne-110m.json`).

### Fontes primárias e licenças

| Série / Conjunto | Código Oficial | Fonte Primária | Licença |
|---|---|---|---|
| População Total | `SP.POP.TOTL` | World Bank Indicators API v2 ([WDI](https://data.worldbank.org/indicator/SP.POP.TOTL)) | CC BY 4.0 |
| PIB a Preços Correntes (USD) | `NY.GDP.MKTP.CD` | World Bank Indicators API v2 ([WDI](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD)) | CC BY 4.0 |
| Área de Superfície (km²) | `AG.SRF.TOTL.K2` | World Bank Indicators API v2 ([WDI](https://data.worldbank.org/indicator/AG.SRF.TOTL.K2)) | CC BY 4.0 |
| Expectativa de Vida ao Nascer (anos) | `SP.DYN.LE00.IN` | World Bank Indicators API v2 ([WDI](https://data.worldbank.org/indicator/SP.DYN.LE00.IN)) | CC BY 4.0 |
| Gastos Militares (% do PIB) | `MS.MIL.XPND.GD.ZS` | World Bank Indicators API v2 / SIPRI ([WDI](https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS)) | CC BY 4.0 |
| Nome oficial (pt-BR), capital, região e moeda | ISO 3166-1 alpha-3 | REST Countries / [`mledoze/countries`](https://github.com/mledoze/countries) | ODbL 1.0 |

### Como regenerar o dataset

```sh
node apps/web/scripts/ingest-worldbank-indicators.mjs
# Para validar cobertura sem sobrescrever o arquivo:
node apps/web/scripts/ingest-worldbank-indicators.mjs --dry-run
```

### Política de integridade e ausências reais (RN02 / T03)

- A consulta à API do Banco Mundial usa `mrnev=1` (*most recent non-empty value*), registrando o ano exato de cada leitura e a data de atualização (`lastupdated`) do conjunto de dados.
- **Nenhum valor é estimado ou inventado**: territórios sem publicação oficial no Banco Mundial (`ATA`, `ATF`, `CYN`, `ESH`, `FLK`, `GUF`, `TWN`) ou séries ausentes em países específicos (ex.: `NY.GDP.MKTP.CD` e `MS.MIL.XPND.GD.ZS` para `PRK`, `AG.SRF.TOTL.K2` para `XKX`) permanecem como `null` / omitidos e renderizam **"Dado indisponível"** na interface.
- Cobertura atual: **170/177** população, **169/177** PIB nominal, **169/177** área territorial, **170/177** expectativa de vida, **160/177** gastos militares e **176/177** metadados administrativos (somente `CYN` ausente em ambas as fontes).

## Anexo — Eventos da linha do tempo importados do Wikidata (D12e, 2026-11-21)

- **Fonte:** Wikidata Query Service (`https://query.wikidata.org/sparql`). Dados estruturados do
  Wikidata sob **CC0 1.0**; os artigos da Wikipédia citados como segunda fonte são CC BY-SA 4.0
  (só o link e o título são guardados, nenhum texto é copiado).
- **Propriedades lidas:** rótulo e descrição em português (rótulo em inglês como reserva), P585
  (momento), P580/P582 (início/fim) com `wikibase:timePrecision`, P625 (coordenadas), P17 → P298
  (país, ISO 3166-1 alfa-3) e o artigo da Wikipédia em português.
- **Como gerar:** `pnpm --filter web scenes:wikidata --class <QID> --from <ano> --to <ano> --category <CATEGORIA>`
  (ou `--qids Q1,Q2`); `--dry-run` mostra o resultado sem gravar; `--input` reprocessa uma resposta
  SPARQL salva. Saída: `apps/web/src/data/scenes/drafts/wikidata.json`, sempre `published: false`.
- **Integridade:** nada é inventado. O que falta ou é duvidoso fica em `facts.aRevisar` (título sem
  rótulo em português, resumo ausente, categoria definida na importação, coordenadas ausentes, datas
  divergentes, e o país do P17, que é o país atual do local e não a entidade da época). Datas a.C.:
  o serviço usa ano astronômico (`-0047` = 48 a.C.), convertido para o ano histórico do projeto.
- **Publicação:** só depois da revisão humana (docs/SCENES.md, "Importar do Wikidata").
