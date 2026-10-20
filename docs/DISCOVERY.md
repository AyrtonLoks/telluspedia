# Documentação de Discovery de Negócio — TellusPedia

## 1. Contexto

O acesso ao conhecimento sobre a história humana, a geopolítica, as ciências naturais e o próprio planeta Terra encontra-se fragmentado em ferramentas isoladas na web:

- **Enciclopédias tradicionais (ex.: Wikipédia)**: Possuem alta profundidade textual e hiperlinks, mas são espacialmente cegas e temporalmente dispersas (o estudante perde a noção de vizinhança geográfica, relevo e simultaneidade histórica entre países).
- **Mapas e globos virtuais (ex.: Google Earth)**: Focam em navegação geográfica e satélite contemporânea estática, sem profundidade historiográfica, política ou evolução paleogeográfica (como a Pangeia e a mutação de fronteiras históricas).
- **Portais de dados e agências científicas (ex.: Banco Mundial, IBGE, NASA)**: Apresentam indicadores socioeconômicos ou dados geofísicos/ambientais isolados de seu contexto histórico e social.
- **Portais jornalísticos**: Cobrem apenas o recorte imediato (notícias diárias), desconectado das raízes históricas de cada nação.

O **TellusPedia** propõe unificar essas vertentes em uma **Enciclopédia Geopolítica, Histórica e Observatório Planetário/Cósmico**, cuja interface inicial (*landing page*) é um **Globo Terrestre 3D interativo e evolutivo**, sincronizado a uma **Linha do Tempo deslizável e editável** — inspirada em uma barra cronológica horizontal segmentada por anos com marcadores de eventos distribuídos acima e abaixo do eixo central — e a um **ambiente de leitura acadêmica aprofundada**.

---

## 2. Dor do Negócio / Problema do Usuário

1. **Isolamento Hipertextual ("Buraco de Minhoca" de Abas)**: Para estudar um país, um conflito ou uma personalidade na Wikipédia, o usuário precisa abrir dezenas de abas para consultar quem são as figuras históricas, quais são os países fronteiriços, o que ocorria naquela época e quais os indicadores locais, perdendo o fio condutor do estudo.
2. **Ausência de Visão Sincrônica e Diacrônica Integrada**: Não há ferramenta de estudo que permita visualizar, no mesmo ambiente, tanto a progressão histórica interna de um território ao longo dos séculos (eixo diacrônico) quanto o estado do mundo, das fronteiras e do céu naquele exato momento (eixo sincrônico).
3. **Desconexão entre Fato Histórico e Espaço Físico 3D**: Eventos com deslocamento físico — como a missão Apollo 11 até a Lua, marchas de exércitos em guerras ou rotas de acidentes aéreos — são estudados apenas em texto estático, sem representação tridimensional de suas trajetórias sobre o globo ou no espaço.
4. **Falta de Cruzamento Multidisciplinar e Ambiental**: Dificuldade em cruzar dados políticos, econômicos e militares com manifestações humanas (arte, filosofia, sociologia, antropologia, culinária, esportes), saúde pública (pandemias como a COVID-19) e fenômenos físicos/ambientais do planeta (dados da NASA sobre ventos, queimadas, clima e lixo marítimo).
5. **Impossibilidade de Empacotar e Compartilhar Recortes de Estudo**: Estudantes e pesquisadores não conseguem configurar um recorte específico (período de tempo + países + temas), gerar um insight visual interativo e compartilhá-lo por link com garantia de que terceiros possam explorá-lo e adaptá-lo para si sem alterar o estudo original.

---

## 3. Objetivo

Construir o **TellusPedia**, uma plataforma web enciclopédica voltada para pesquisa, informação e estudo — alimentada e controlada pelo próprio sistema via integração e curadoria de fontes oficiais (API da Wikipédia/Wikidata, IBGE, Banco Mundial, OMS, NASA, agências governamentais e portais de notícias) — onde o usuário interage de imediato com um **Globo 3D dinâmico** (com iluminação solar, Lua em órbita, constelações e mutação histórica/paleogeográfica de fronteiras) acoplado a uma **Linha do Tempo deslizável**, permitindo explorar dossiês multidisciplinares, ler artigos aprofundados com citações acadêmicas, rastrear a linha do tempo completa de personalidades/temas, comparar até 4 países e compartilhar links de estudos personalizados.

---

## 4. Regras de Negócio (RN)

### 4.1. Governança de Conteúdo, Rigor Acadêmico e Experiência de Estudo (Base Enciclopédica)

- **RN01 — Curadoria Centralizada pelo Sistema**: O acervo base da plataforma será alimentado, tratado e controlado exclusivamente pelo sistema e seus administradores (via pipelines de ingestão e tratamento de dados da Wikipédia/Wikidata, IBGE, Banco Mundial, NASA, OMS e portais de notícias), sem edição aberta por usuários anônimos nos verbetes oficiais.
- **RN02 — Rastreabilidade Temporal e Gerador de Citações Acadêmicas**:
  - Todo indicador quantitativo ou político (ex.: PIB, população, IDH, chefe de Estado vigente) deve exibir explicitamente a fonte primária e a data de referência.
  - Todo verbete histórico, biográfico ou temático deve conter referências bibliográficas/fontes primárias e uma ferramenta para exportar a citação formatada (**ABNT**, **APA**, **MLA** e **BibTeX**) para uso em trabalhos escolares e acadêmicos.
- **RN03 — Arquitetura de Interface em Duas Camadas de Densidade**:
  - **Camada 1 — Visão Espacial / Resumo Rápido (Inspector HUD)**: Ao clicar em um país no globo, abre-se um painel lateral com a Ficha Técnica Padronizada (*Country Infobox*), hora local, clima atual, resumo executivo e linha do tempo compacta, mantendo o globo 3D visível e interativo em segundo plano.
  - **Camada 2 — Modo Leitura / Estudo Aprofundado**: O usuário pode expandir qualquer seção ou dossiê para uma visão de leitura imersiva, tipograficamente otimizada para estudo longo, contando com sumário lateral fixo navegável (*Table of Contents*), notas de rodapé clicáveis e tempo estimado de leitura.
- **RN04 — Grafo de Conhecimento, Link Preview e Trilha de Estudo**:
  - **Pré-visualização de Verbetes (Hover Preview)**: Ao passar o cursor sobre um link interno (uma figura histórica, um tratado, um conceito político ou outro país), exibe-se um card flutuante com o resumo do verbete (estilo Wikipédia) para que o estudante não perca o foco da leitura principal.
  - **Conexões Espaciais no Globo**: Links internos para eventos transnacionais (ex.: tratados, alianças militares, guerras) permitem acionar o destaque visual simultâneo no globo 3D de todos os países envolvidos e realizar a transição suave de câmera entre eles, registrando a trilha de estudo (*breadcrumbs*) percorrida pelo usuário.
- **RN05 — Endereçamento Semântico Direto (SEO e Links de Pesquisa)**: Todo país, período histórico, evento ou personalidade deve possuir uma URL semântica própria e indexável (ex.: `/pais/alemanha/historia`), permitindo acesso direto via motores de busca (Google) ou salvamento de favoritos de estudo.

### 4.2. Globo 3D, Seleção Espacial e Contexto em Tempo Real

- **RN06 — Acesso Imediato (Zero-Click to Explore) e Manipulação 3D**: O globo 3D é exibido imediatamente na tela inicial com rotação em 3 eixos, inércia de movimento, zoom progressivo, botão de realinhamento ao eixo norte e animação suave de aproximação (*fly-to*) ao selecionar um país via clique ou barra de busca.
- **RN07 — Unidade Geopolítica e Destaque Visual Persistente**:
  - A seleção contempla Estados-Nação soberanos (padrão ISO 3166-1), territórios disputados ou regiões autônomas (com sinalização visual diferenciada) e formações estatais históricas.
  - Ao passar o cursor (*hover*), exibe-se realce de fronteira com nome e bandeira; ao clicar, o país/região permanece com destaque visual ativo no globo para que o usuário saiba claramente qual seleção está inspecionando.
- **RN08 — Iluminação Solar (Terminador Dia/Noite), Clima e Fuso Horário**:
  - O globo deve renderizar continuamente a incidência da luz solar em tempo real, mantendo a face voltada para o Sol iluminada e a face oposta levemente escurecida (noite).
  - A seleção de um país deve exibir em tempo real sua hora local (fuso horário) e seus dados climáticos/meteorológicos atuais.

### 4.3. Linha do Tempo, Mapas Históricos, Paleogeografia e Trajetórias 3D

- **RN09 — Eixo Sincrônico (Presente) vs. Eixo Diacrônico (Histórico)**: A plataforma separa claramente os dados vigentes do país (governo atual, indicadores atuais e notícias) de sua evolução histórica ao longo das eras.
- **RN10 — Controle de Linha do Tempo Deslizável, Editável e Filtrável (Padrão: 50 Anos)**:
  - A linha do tempo será uma barra horizontal deslizável segmentada por anos/períodos, apresentando marcos (*milestones*) com ponteiros indicadores distribuídos acima e abaixo do eixo temporal.
  - O intervalo (*range*) padrão selecionado na abertura será de 50 anos, permitindo ao usuário editar livremente a janela temporal (desde dias/anos específicos até séculos ou eras geológicas).
  - **Filtro Temático da Timeline**: O estudante pode filtrar os marcos exibidos na barra cronológica por categoria (ex.: ver apenas eventos de Política/Regimes, Economia, Conflitos/Militar, Ciência & Cultura ou Saúde).
- **RN11 — Adaptação Paleogeográfica e Cartografia Histórica no Globo**:
  - O globo 3D deve adaptar sua estrutura continental e suas fronteiras políticas em sincronia com a era selecionada na linha do tempo:
    - *Escala Geológica/Paleogeográfica*: Mudança na conformação dos continentes em eras antigas (ex.: Pangeia e deriva continental).
    - *Escala Histórica/Geopolítica*: Exibição de mapas de formações estatais e fronteiras históricas de acordo com o período selecionado (ex.: território da Prússia e sua posterior evolução para a Alemanha, Império Romano, URSS, etc.).
- **RN12 — Reconstrução Espacial 3D de Acontecimentos Físicos**:
  - Eventos históricos que envolvem deslocamento físico no espaço ou na superfície terrestre devem exibir animações/trajetórias 3D sobre o globo ou na órbita:
    - *Eventos Espaciais*: No marco do pouso na Lua (Apollo 11), por exemplo, o sistema deve exibir a interação entre a Terra e a Lua com a órbita e a trajetória completa do foguete.
    - *Eventos Terrestres, Aéreos e Marítimos*: Representação física no mapa de marchas de exércitos em guerras, grandes expedições e trajetórias de aeronaves envolvidas em acidentes históricos.

### 4.4. Taxonomia Multidisciplinar, Pesquisa Transversal, Comparação e Compartilhamento

- **RN13 — Matriz Enciclopédica Multidisciplinar por País/Região**: O dossiê de cada território deve organizar seu conteúdo nas seguintes dimensões:
  1. *Geografia Física e Humana*: Área, relevo, hidrografia, biomas, clima, demografia, idiomas e fronteiras.
  2. *Estado, Governo, Política e Defesa*: Forma e sistema de governo, constituição vigente, divisão de poderes, histórico de governantes/chefes de Estado, partidos, relações exteriores e poderio militar.
  3. *Economia e Indicadores Sociais*: PIB, renda per capita, IDH, moeda, matriz produtiva e blocos econômicos.
  4. *História e Linha do Tempo*: Periodização histórica, marcos fundacionais, revoluções, tratados e mudanças de regime.
  5. *Personalidades e Figuras Importantes*: Biografias conectadas à linha do tempo (líderes políticos, cientistas, pensadores, artistas, figuras militares).
  6. *Cultura, Humanidades e Sociedade*: Arte, Filosofia, Sociologia, Antropologia, Cultura, Culinária e Esportes.
  7. *Biologia e Saúde Pública*: Biodiversidade local e dados históricos/atuais de Saúde (como impacto e evolução da pandemia da COVID-19, endemias, epidemias históricas e saúde populacional).
  8. *Notícias e Atualidades*: Fatos jornalísticos recentes vinculados ao país.
- **RN14 — Linha do Tempo Transversal de Tema ou Personalidade Influente**:
  - Ao selecionar um tema de interesse ou uma pessoa influente (ex.: Donald Trump, chefes de Estado, cientistas), o sistema deve agregar e exibir toda a linha do tempo transversal daquela entidade, conectando locais no globo, relevo, contexto político, acontecimentos históricos e notícias associadas.
- **RN15 — Comparador Configurável de Países (Até 4 Países)**:
  - O usuário pode selecionar simultaneamente até 4 países para estudo comparativo lado a lado.
  - Os eixos de comparação são configuráveis pelo usuário, permitindo escolher quais categorias cruzar (dados militares, políticos, econômicos, geográficos, saúde, demográficos ou culturais) dentro do mesmo recorte temporal.
- **RN16 — Estudo Personalizado e Compartilhamento Imutável (Fork de Estudo)**:
  - O usuário pode configurar para seu estudo uma combinação de: (a) período na timeline, (b) países selecionados e (c) assuntos de interesse, gerando um painel interativo consolidado (*insight/estudo*).
  - O sistema gera um link único compartilhável que leva exatamente a esse conjunto de dados agregado pelo criador.
  - Qualquer pessoa que acessar o link poderá interagir com o estudo e terá a opção de editar para si (gerando um novo link/cópia própria), mas nunca poderá alterar ou sobrescrever o link original do usuário criador.

### 4.5. Observatório Planetário (NASA), Tráfego Global, Céu e Cosmos

- **RN17 — Camadas Geofísicas e Ambientais (NASA e Agências Governamentais)**:
  - Integração de bases de dados da NASA e agências governamentais para renderizar relevos específicos, dados meteorológicos, fluxos de ventos, dados da natureza, monitoramento de queimadas, situações climáticas severas e fluxo/concentração de lixo marítimo.
- **RN18 — Lua, Estação Espacial, Satélites e Tráfego Aéreo/Marítimo**:
  - Renderização da Lua orbitando a Terra, bem como da Estação Espacial Internacional (ISS) e de satélites artificiais em órbita.
  - Adição de camadas de visualização de aeronaves sobrevoando o globo e rotas marítimas nos oceanos.
- **RN19 — Abóbada Celeste e Constelações por Data**:
  - O sistema deve exibir no céu ao redor do globo as constelações exatas visíveis na data selecionada pelo usuário na linha do tempo; caso nenhuma data histórica esteja selecionada, exibe-se o céu correspondente ao dia atual.
- **RN20 — Expansão para o Sistema Solar e Cosmos**:
  - A arquitetura visual deve permitir expandir o zoom além da órbita terrestre e lunar para visualizar o Sistema Solar e o Cosmos (outros planetas, estrelas, meteoros e corpos celestes).

### 4.6. Diretrizes de Qualidade e Comportamento do Sistema (Requisitos Não-Funcionais)

- **RN21 — Performance Gráfica (LoD) e Carregamento Progressivo**: A geometria do globo e das fronteiras deve utilizar níveis de detalhe (*Level of Detail*) conforme o zoom e carregamento sob demanda (*lazy loading*) de texturas densas, malhas históricas e artigos longos, garantindo fluidez (60 FPS em desktop / 30+ FPS em mobile) e tempo de inicialização rápido na tela inicial.
- **RN22 — Economia de Recursos no Modo de Leitura Profunda**: Quando o usuário expandir a Camada 2 (Modo Leitura de artigos longos) e o globo 3D ficar oculto ou em segundo plano, o motor gráfico deve reduzir ou pausar sua taxa de atualização (*render loop throttling*) para evitar consumo excessivo de GPU/bateria durante sessões prolongadas de estudo.
- **RN23 — Segregação de Cache por Volatilidade de Dados**: Dados imutáveis (mapas históricos, paleogeografia, eventos passados consolidados), dados semi-estáticos (indicadores anuais de governo/economia) e dados altamente voláteis (clima, notícias, posição da ISS/voos) devem possuir políticas distintas de atualização e armazenamento em cache.

---

## 5. Fluxos Macro

- **Fluxo 01 — Acesso Imediato e Observatório Planetário/Celeste**:
  Usuário acessa o TellusPedia $\rightarrow$ Visualiza de imediato o Globo 3D com iluminação solar em tempo real (dia/noite), Lua em órbita, ISS/satélites e as constelações do dia atual $\rightarrow$ Pode ativar camadas científicas da NASA (ventos, queimadas, lixo marítimo) ou camadas de rotas aéreas e marítimas.
- **Fluxo 02 — Navegação na Linha do Tempo, Mapas Históricos e Pangeia**:
  Usuário manipula a barra de linha do tempo deslizável (com range padrão de 50 anos ou intervalo customizado) e aplica filtros temáticos $\rightarrow$ Ao deslocar o tempo para eras passadas ou geológicas, o globo adapta suas fronteiras políticas (ex.: Prússia $\rightarrow$ Alemanha) ou continentes (ex.: Pangeia) e atualiza as constelações do céu para a data escolhida.
- **Fluxo 03 — Seleção de País e Exploração em Duas Camadas (Inspector + Modo Leitura)**:
  Usuário clica em um país (ou pesquisa na busca global) $\rightarrow$ Câmera executa *fly-to* e mantém o território em destaque visual ativo $\rightarrow$ Abre o Inspector HUD (Camada 1) com hora local, clima atual, Country Infobox e linha do tempo resumida $\rightarrow$ Usuário clica para aprofundar um tema e abre o Modo Leitura (Camada 2) com texto completo sobre Política, História, Geografia, Saúde/COVID-19, Arte, Filosofia, Sociologia, Antropologia, Biologia, Culinária, Esportes e Notícias, usando link preview e gerador de citação ABNT/APA.
- **Fluxo 04 — Reprodução 3D de Acontecimentos Históricos Físicos**:
  Usuário seleciona um marco histórico espacial ou territorial na barra da timeline (ex.: Pouso na Lua ou campanha militar) $\rightarrow$ O globo renderiza a interação física 3D (trajetória e órbita do foguete entre a Terra e a Lua, marchas de exércitos ou rota da aeronave).
- **Fluxo 05 — Dossiê Cronológico de Personalidade ou Tema**:
  Usuário seleciona uma personalidade influente (ex.: Donald Trump) ou tema específico $\rightarrow$ O sistema reúne e exibe toda a linha do tempo transversal daquela entidade, articulando locais no globo, relevo, decisões políticas, fatos históricos e notícias.
- **Fluxo 06 — Comparação Configurável (Até 4 Países)**:
  Usuário aciona o modo de comparação $\rightarrow$ Seleciona até 4 países e define quais dimensões comparar (militar, política, econômica, saúde, cultura, etc.) $\rightarrow$ Visualiza os dados e linhas do tempo equiparados lado a lado.
- **Fluxo 07 — Criação e Compartilhamento de Estudo (Fork Imutável)**:
  Usuário configura um recorte de estudo (período na timeline + países + assuntos de interesse) $\rightarrow$ Gera e compartilha o link único $\rightarrow$ Destinatário abre o link, visualiza exatamente o estudo montado e, caso queira modificar filtros ou adicionar anotações, utiliza a opção "Editar para mim", criando um novo link derivado sem alterar o original.
- **Fluxo 08 — Expansão para o Sistema Solar e Cosmos**:
  Usuário afasta o nível de zoom além da órbita da Terra/Lua (ou alterna para a visão cósmica) $\rightarrow$ Navega pela visualização do Sistema Solar, outros planetas, estrelas e meteoros.

---

## 6. Critérios de Aceite / Sucesso

| Código | Área de Aceite | Critério de Aceite / Sucesso Detalhado |
| :--- | :--- | :--- |
| **CA01** | Globo e Seleção | Renderização fluida do Globo 3D na página inicial com terminador solar (dia/noite), transição fly-to, destaque visual persistente do país selecionado e exibição de hora local e clima atual. |
| **CA02** | Linha do Tempo e Cartografia | Linha do tempo deslizável operando com janela padrão de 50 anos, edição livre de intervalo, marcadores de eventos distribuídos ao longo do eixo, filtros temáticos e adaptação efetiva do globo para fronteiras históricas (ex.: Prússia $\rightarrow$ Alemanha) e eras geológicas (ex.: Pangeia). |
| **CA03** | Experiência Enciclopédica | Funcionamento das duas camadas de leitura (Infobox rápida + Modo Leitura profunda com sumário fixo), pré-visualização de links internos (hover preview), URLs semânticas diretas, rastreabilidade de fontes e exportação de citações (ABNT/APA/MLA). |
| **CA04** | Cobertura Multidisciplinar | Exibição estruturada das dimensões de Política/Governo, Geografia, Economia, Militar, História, Figuras Importantes, Saúde (incluindo pandemias/COVID-19), Arte, Filosofia, Sociologia, Antropologia, Biologia, Culinária, Esportes e Notícias. |
| **CA05** | Trajetórias 3D e Personalidades | Renderização de trajetórias físicas para marcos históricos selecionados (ex.: órbita/trajetória Terra-Lua no pouso lunar, marchas militares, rotas aéreas) e geração da linha do tempo completa ao selecionar uma personalidade influente ou tema. |
| **CA06** | Comparação e Compartilhamento | Comparador funcionando para até 4 países simultâneos com filtros configuráveis e geração de link compartilhável de estudo que preserva a imutabilidade do link original (permitindo fork/edição em cópia separada para quem acessa). |
| **CA07** | Observatório Planetário | Exibição da Lua em órbita, ISS, satélites, constelações correspondentes à data selecionada (ou dia atual), rotas aéreas/marítimas e camadas de dados científicos da NASA (relevo, ventos, queimadas, clima e lixo marítimo), além da estrutura para expansão ao Sistema Solar/Cosmos. |

---

## 7. Restrições e Premissas

### 7.1. Roadmap Incremental de Entrega (4 Horizontes)

Todas as funcionalidades descritas fazem parte do escopo oficial do TellusPedia, sendo organizadas em 4 horizontes evolutivos para garantir qualidade de engenharia:

- **Horizonte 1 — Core Enciclopédico, Globo Base & Estudos**: Globo 3D com luz solar (dia/noite), Lua em órbita, constelações por data, seleção destacada (clima/hora), linha do tempo deslizável (range padrão 50 anos) com filtros, Camadas 1 e 2 de leitura (Infobox + Modo Leitura com link preview e citação ABNT/APA), acervo multidisciplinar completo (Política, História, Saúde/COVID-19, Artes, Filosofia, Ciências, etc.), timeline transversal por personalidade/tema, comparador de até 4 países e link compartilhável de estudo (fork imutável).
- **Horizonte 2 — Cartografia Histórica, Paleogeografia e Trajetórias 3D**: Mutação dinâmica das fronteiras no globo por período histórico (ex.: Prússia $\rightarrow$ Alemanha), formações paleogeográficas (Pangeia) e reconstrução 3D de trajetórias de acontecimentos (missão lunar Terra-Lua, marchas de exércitos, rotas de aviação histórica).
- **Horizonte 3 — Observatório Planetário (NASA) & Tráfego Global**: Integração das camadas de dados científicos da NASA/agências (fluxos de ventos, queimadas, anomalias climáticas, lixo marítimo, relevos avançados) e rastreamento de ISS, satélites artificiais, aeronaves e rotas marítimas.
- **Horizonte 4 — Expansão Cósmica**: Navegação expandida para visualização do Sistema Solar e do Cosmos (planetas, estrelas e meteoros).

### 7.2. Governança e Fontes de Dados

- **Restrição de Governança Editorial**: A curadoria de dados enciclopédicos permanece centralizada no sistema/administrador; usuários finais criam e compartilham recortes/estudos personalizados sem alterar a base oficial de dados.
- **Premissa de Fontes Externas**: A atualização dos dados dinâmicos e científicos baseia-se no consumo e processamento de APIs e datasets públicos (Wikidata/Wikipédia, Banco Mundial, IBGE, OMS, NASA Open Data, NOAA e serviços de efemérides astronômicas/orbitais).

---

## 8. Anexo — Mapeamento de Fontes de Dados e APIs Oficiais

### 8.1. Fontes para Base Enciclopédica, Grafo de Conhecimento e Citações (RN01 a RN05)
- **Núcleo Enciclopédico e Hover Preview**: Wikimedia / Wikipedia REST API e Wikidata Query Service (SPARQL) & Wikibase API.
- **Metadados Bibliográficos e Citações (ABNT, APA, MLA)**: Crossref API, OpenAlex & Wikimedia Citoid.

### 8.2. Fontes para Globo 3D Base, Fronteiras Contemporâneas, Clima e Hora (RN06 a RN08)
- **Malha Geopolítica Contemporânea (LoD)**: Natural Earth Data (Escalas 1:110m, 1:50m e 1:10m) e REST Countries / ISO 3166-1.
- **Iluminação Solar, Fuso Horário e Clima**: Algoritmo NOAA Solar Position / NASA JPL Horizons, IANA Time Zone Database (tzdb) e Open-Meteo API / NOAA GFS.

### 8.3. Fontes para Linha do Tempo, Mapas Históricos, Paleogeografia e Trajetórias 3D (RN09 a RN12)
- **Periodização Histórica**: PeriodO (Gazetteer of Historical Periods) & Wikidata Temporal Entities.
- **Paleogeografia (Pangeia)**: GPlates Web Service (GWS) & PALEOMAP Project.
- **Cartografia Histórica e Fronteiras**: CShapes 2.0 Dataset (ETH Zürich), OpenHistoricalMap (OHM) & Clio-Infra / Euratlas.
- **Reconstrução Espacial 3D**: NASA SPICE Toolkit Archives & JPL Horizons (missão Apollo 11), Aviation Safety Network e OpenHistoricalMap.

### 8.4. Fontes para a Matriz Multidisciplinar, Personalidades e Comparador (RN13 a RN16)
- **Geografia**: IBGE API, Natural Earth Physical, WorldPop e FAO AQUASTAT.
- **Governo, Política e Defesa**: V-Dem Dataset, SIPRI Databases e Correlates of War.
- **Economia e Sociais**: World Bank Indicators API, IBGE, IMF Data API e UNDP Human Development Data.
- **História e Timeline**: Wikidata Historical Events, Seshat e PeriodO.
- **Personalidades**: MIT Pantheon Dataset, Wikidata Biographies e VIAF.
- **Cultura, Humanidades e Sociedade (Arte, Filosofia, Sociologia, Antropologia, Culinária, Esportes)**: UNESCO World Heritage & Intangible Cultural Heritage APIs, Europeana / Met Museum Open Access API, Stanford Encyclopedia of Philosophy / PhilPapers, D-PLACE e Olympedia / Wikidata Sports.
- **Biologia e Saúde Pública (incluindo COVID-19)**: WHO Global Health Observatory (GHO) OData API, Our World in Data / WHO COVID-19 Dashboard e GBIF / IUCN Red List API.
- **Notícias e Atualidades**: GDELT Project API (Global Database of Events, Language, and Tone) e agências oficiais.
- **Timeline Transversal de Personalidade/Tema**: Wikidata Entity Graph & GDELT Knowledge Graph.

### 8.5. Fontes para Observatório Planetário (NASA), Tráfego Global, Céu e Cosmos (RN17 a RN20)
- **Camadas Geofísicas, Queimadas, Ventos e Lixo Marítimo**: NASA GIBS (WMTS/WMS), NASA FIRMS (MODIS/VIIRS) & INPE BDQueimadas, NASA EONET, NOAA GFS & NASA Earthdata, e NOAA Marine Debris Program / Global Drifter Program.
- **Lua, ISS, Satélites e Tráfego Aéreo/Marítimo**: CelesTrak GP API & Space-Track.org (TLE/OMM), OpenSky Network API, e Global Fishing Watch / OpenSeaMap.
- **Abóbada Celeste, Constelações e Cosmos**: HYG Star Database + Limites Oficiais da IAU (União Astronômica Internacional), NASA JPL Horizons API & Minor Planet Center (MPC).
