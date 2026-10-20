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
- **RN13 — Matriz Enciclopédica Multidisciplinar por País/Região**: O dossiê de cada território organiza seu conteúdo nas seguintes 8 dimensões:
  1. *Geografia Física e Humana*: Área, relevo, hidrografia, biomas, clima, demografia, idiomas e fronteiras.
  2. *Estado, Governo, Política e Defesa*: Forma e sistema de governo, constituição vigente, divisão de poderes, histórico de governantes/chefes de Estado, partidos, relações exteriores e poderio militar.
  3. *Economia e Indicadores Sociais*: PIB, renda per capita, IDH, moeda, matriz produtiva e blocos econômicos.
  4. *História e Linha do Tempo*: Periodização histórica, marcos fundacionais, revoluções, tratados e mudanças de regime.
  5. *Personalidades e Figuras Importantes*: Biografias conectadas à linha do tempo (líderes políticos, cientistas, pensadores, artistas, figuras militares).
  6. *Cultura, Humanidades e Sociedade*: Arte, Filosofia, Sociologia, Antropologia, Cultura, Culinária e Esportes.
  7. *Biologia e Saúde Pública*: Biodiversidade local e dados históricos/atuais de Saúde (impacto e evolução da COVID-19, endemias, epidemias históricas e saúde populacional).
  8. *Notícias e Atualidades*: Fatos jornalísticos recentes vinculados ao país.
- **RN14 — Linha do Tempo Transversal de Tema ou Personalidade Influente**: Ao selecionar um tema de interesse ou uma pessoa influente (ex.: Donald Trump, chefes de Estado, cientistas), o sistema deve agregar e exibir toda a linha do tempo transversal daquela entidade, conectando locais no globo, relevo, contexto político, acontecimentos históricos e notícias associadas.
- **RN15 — Comparador Configurável de Países (Até 4 Países)**:
  - O usuário pode selecionar simultaneamente até 4 países para estudo comparativo lado a lado.
  - Os eixos de comparação são configuráveis pelo usuário, permitindo escolher quais categorias cruzar (dados militares, políticos, econômicos, geográficos, saúde, demográficos ou culturais) dentro do mesmo recorte temporal.
- **RN16 — Estudo Personalizado e Compartilhamento Imutável (Fork de Estudo)**:
  - O usuário pode configurar para seu estudo uma combinação de: (a) período na timeline, (b) países selecionados e (c) assuntos de interesse, gerando um painel interativo consolidado (*insight/estudo*).
  - O sistema gera um link único compartilhável que leva exatamente a esse conjunto de dados agregado pelo criador.
  - Qualquer pessoa que acessar o link poderá interagir com o estudo e terá a opção de editar para si (gerando um novo link/cópia própria com `parentId`), mas nunca poderá alterar ou sobrescrever o link original do usuário criador.

### 4.5. Observatório Planetário (NASA), Tráfego Global, Céu e Cosmos
- **RN17 — Camadas Geofísicas e Ambientais (NASA e Agências Governamentais)**: Integração de bases de dados da NASA e agências governamentais para renderizar relevos específicos, dados meteorológicos, fluxos de ventos, dados da natureza, monitoramento de queimadas, situações climáticas severas e fluxo/concentração de lixo marítimo.
- **RN18 — Lua, Estação Espacial, Satélites e Tráfego Aéreo/Marítimo**: Renderização da Lua orbitando a Terra, bem como da Estação Espacial Internacional (ISS) e de satélites artificiais em órbita. Adição de camadas de visualização de aeronaves sobrevoando o globo e rotas marítimas nos oceanos.
- **RN19 — Abóbada Celeste e Constelações por Data**: O sistema deve exibir no céu ao redor do globo as constelações exatas visíveis na data selecionada pelo usuário na linha do tempo; caso nenhuma data histórica esteja selecionada, exibe-se o céu correspondente ao dia atual.
- **RN20 — Expansão para o Sistema Solar e Cosmos**: A arquitetura visual deve permitir expandir o zoom além da órbita terrestre e lunar para visualizar o Sistema Solar e o Cosmos (outros planetas, estrelas, meteoros e corpos celestes).

### 4.6. Diretrizes de Qualidade e Comportamento do Sistema (Requisitos Não-Funcionais)
- **RN21 — Performance Gráfica (LoD) e Carregamento Progressivo**: A geometria do globo e das fronteiras deve utilizar níveis de detalhe (*Level of Detail*) conforme o zoom e carregamento sob demanda (*lazy loading*) de texturas densas, malhas históricas e artigos longos, garantindo fluidez (60 FPS em desktop / 30+ FPS em mobile) e tempo de inicialização rápido na tela inicial.
- **RN22 — Economia de Recursos no Modo de Leitura Profunda**: Quando o usuário expandir a Camada 2 (Modo Leitura de artigos longos) e o globo 3D ficar oculto ou em segundo plano, o motor gráfico deve reduzir ou pausar sua taxa de atualização (*render loop throttling*) para evitar consumo excessivo de GPU/bateria durante sessões prolongadas de estudo.
- **RN23 — Segregação de Cache por Volatilidade de Dados**: Dados imutáveis (mapas históricos, paleogeografia, eventos passados consolidados), dados semi-estáticos (indicadores anuais de governo/economia) e dados altamente voláteis (clima, notícias, posição da ISS/voos) devem possuir políticas distintas de atualização e armazenamento em cache.

---

## 5. Fluxos Macro

1. **Fluxo 01 — Acesso Imediato e Observatório Planetário/Celeste**: Usuário acessa o TellusPedia $\rightarrow$ Visualiza de imediato o Globo 3D com iluminação solar em tempo real (dia/noite), Lua em órbita, ISS/satélites e constelações do dia atual $\rightarrow$ Ativa camadas científicas.
2. **Fluxo 02 — Navegação na Linha do Tempo e Mapas Históricos**: Usuário manipula a timeline (range de 50 anos ou personalizado) $\rightarrow$ Ao deslocar o tempo para eras passadas, o globo adapta suas fronteiras ou continentes e atualiza o céu.
3. **Fluxo 03 — Seleção de País e Exploração em Duas Camadas**: Usuário clica no país $\rightarrow$ Animação *fly-to* e destaque visual $\rightarrow$ Abre Inspector HUD (Camada 1) com clima, hora local e infobox $\rightarrow$ Abre Modo Leitura (Camada 2) com dossiê completo, link preview e citação ABNT/APA.
4. **Fluxo 04 — Reprodução 3D de Acontecimentos Físicos**: Usuário seleciona marco espacial ou territorial (ex.: Apollo 11) $\rightarrow$ Renderização de trajetórias 3D físicas na órbita ou superfície.
5. **Fluxo 05 — Dossiê Cronológico de Personalidade ou Tema**: Seleciona personalidade influente $\rightarrow$ Exibe timeline transversal articulando locais no globo e acontecimentos.
6. **Fluxo 06 — Comparação Configurável (Até 4 Países)**: Usuário seleciona até 4 países $\rightarrow$ Visualiza dados equiparados lado a lado em colunas e gráficos Recharts.
7. **Fluxo 07 — Criação e Compartilhamento de Estudo (Fork Imutável)**: Usuário monta estudo $\rightarrow$ Gera link único imutável $\rightarrow$ Destinatário abre e pode clicar em "Fazer Fork para Mim", criando derivação com `parentId`.
8. **Fluxo 08 — Expansão para o Sistema Solar e Cosmos**: Zoom afasta além da Terra/Lua $\rightarrow$ Navegação cósmica.

---

## 6. Critérios de Aceite / Sucesso

| Código | Área de Aceite | Critério de Aceite Detalhado |
| :--- | :--- | :--- |
| **CA01** | Globo e Seleção | Renderização fluida do Globo 3D na página inicial com terminador solar (dia/noite), transição fly-to, destaque visual persistente do país selecionado e exibição de hora local e clima atual. |
| **CA02** | Linha do Tempo e Cartografia | Linha do tempo deslizável operando com janela padrão de 50 anos, edição livre de intervalo, marcadores de eventos distribuídos ao longo do eixo, filtros temáticos e adaptação do globo. |
| **CA03** | Experiência Enciclopédica | Funcionamento das duas camadas de leitura (Infobox rápida + Modo Leitura profunda com sumário fixo), pré-visualização de links internos (hover preview), URLs semânticas diretas, rastreabilidade de fontes e exportação de citações (ABNT/APA/MLA/BibTeX). |
| **CA04** | Cobertura Multidisciplinar | Exibição estruturada das dimensões de Política/Governo, Geografia, Economia, Militar, História, Figuras Importantes, Saúde (COVID-19), Arte, Filosofia, Sociologia, Antropologia, Biologia, Culinária, Esportes e Notícias. |
| **CA05** | Trajetórias 3D e Personalidades | Renderização de trajetórias físicas para marcos históricos e geração da linha do tempo transversal de personalidades/temas. |
| **CA06** | Comparação e Compartilhamento | Comparador para até 4 países simultâneos com filtros configuráveis e geração de link compartilhável de estudo que preserva imutabilidade do original e suporta forks. |
| **CA07** | Observatório Planetário | Exibição da Lua em órbita, constelações correspondentes à data selecionada (ou dia atual) e suporte à expansão para camadas científicas da NASA e Cosmos. |

---

## 7. Status de Implementação dos Horizontes Evolutivos

1. **Horizonte 1 — Core Enciclopédico, Globo Base & Estudos** *(Concluído)*:
   - Atende **RN01 a RN08**, **RN13**, **RN15**, **RN16**, **RN21 a RN23** (Critérios CA01, CA03, CA04, CA06).
2. **Horizonte 2 — Cartografia Histórica, Paleogeografia e Trajetórias 3D** *(Concluído)*:
   - Atende **RN09 a RN12**, **RN16** (Critérios CA02, CA05, CA06).
3. **Horizonte 3 — Observatório Planetário (NASA) & Tráfego Global** *(Concluído)*:
   - Atende **RN17**, **RN18**, **RN09/10** (supressão temporal), **RN16** (estudos com camadas científicas ativas), **RN21** e **RN23** (Critérios CA06, CA07).
4. **Horizonte 4 — Expansão Cósmica** *(Próximo)*:
   - Expandir a navegação para além da órbita da Terra e Lua, modelando os corpos celestes do Sistema Solar e Cosmos (**RN19**, **RN20**).
