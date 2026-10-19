# Roadmap de Engenharia — TellusPedia

Todas as funcionalidades do TellusPedia são organizadas em **4 Horizontes Evolutivos** para assegurar excelência técnica, performance e rigor científico.

```mermaid
timeline
    title Roadmap Evolutivo do TellusPedia
    section Horizonte 1 (Concluído)
        Core Enciclopédico : Globo 3D R3F
                           : Terminador Solar (NOAA) & Lua
                           : Timeline Deslizável 50 Anos
                           : Inspector HUD (Camada 1)
                           : Modo Leitura & Citações (Camada 2)
                           : Comparador (Até 4 Países)
                           : Estudos Imutáveis & Forks
    section Horizonte 2 (Próximo)
        Cartografia Histórica : Mutação de Fronteiras (CShapes / OHM)
                              : Paleogeografia & Pangeia (GPlates)
                              : Trajetórias 3D (Apollo 11, Guerras)
    section Horizonte 3
        Observatório Planetário : Camadas NASA GIBS & FIRMS
                               : Rastreamento ISS & Satélites
                               : Tráfego Aéreo & Rotas Marítimas
    section Horizonte 4
        Expansão Cósmica : Sistema Solar 3D
                        : Exploração de Planetas & Órbitas
                        : Navegação pelo Cosmos & Constelações
```

---

## Detalhamento dos Horizontes

### Horizonte 1 — Core Enciclopédico, Globo Base & Estudos *(Status: Concluído)*
- **Globo 3D Base**: Renderização com shader solar dia/noite calculado por efemérides NOAA, Lua em órbita, constelações IAU por data e fronteiras TopoJSON com picking instantâneo (<0.2ms).
- **Linha do Tempo (50 Anos Padrão)**: Barra horizontal deslizável com nós alternados acima e abaixo do eixo, filtros temáticos (Política, Economia, Guerra, Ciência & Cultura, Saúde) e sincronização bidirecional com a luz solar e a câmera do globo.
- **Camada 1 (Inspector HUD)**: Ficha técnica padronizada, relógio do fuso horário local (tzdb) e clima ao vivo via Open-Meteo em gaveta glassmorphism.
- **Camada 2 (Modo Leitura Profunda)**: Dossiê multidisciplinar completo com sumário fixo navegável, notas de rodapé, hover preview de verbetes e gerador de citações formatadas em **ABNT NBR 6023**, **APA 7**, **MLA 9** e **BibTeX (.bib)**.
- **Comparador Configurável (Até 4 Países)**: Destaque visual quádruplo no globo, colunas equiparadas e gráficos de séries temporais com Recharts.
- **Estudos Imutáveis e Forks Compartilháveis (RN16)**: Links `/study/[slug]` permanentes no PostgreSQL com suporte nativo a bifurcações rastreáveis (`parentId`).

---

### Horizonte 2 — Cartografia Histórica, Paleogeografia e Trajetórias 3D *(Próximo Passo)*
- **Mutação Dinâmica de Fronteiras**: Integração das malhas vetoriais históricas do **CShapes 2.0** (1886–presente) e **OpenHistoricalMap**, adaptando o mapa político às eras selecionadas na timeline (ex.: território da Prússia evoluindo para a Alemanha, Império Romano, URSS).
- **Paleogeografia (Pangeia)**: Modelos cinemáticos de placas tectônicas do **GPlates Web Service** e **PALEOMAP Project** para reconstituição da deriva continental em eras geológicas antigas.
- **Trajetórias Físicas 3D**:
  - *Missões Espaciais*: Visualização da rota da Terra à Lua na missão **Apollo 11** com telemetria oficial do **NASA SPICE Toolkit**.
  - *Trajetórias Terrestres e Aéreas*: Marchas militares históricas e rotas de aviação com reconstituição 3D.

---

### Horizonte 3 — Observatório Planetário (NASA) & Tráfego Global
- **Camadas Científicas da NASA**:
  - **NASA GIBS**: Mais de 1.000 camadas de imagens de satélite atualizadas diariamente (neve/gelo, relevo, cobertura vegetal).
  - **NASA FIRMS & INPE BDQueimadas**: Monitoramento global de focos ativos de queimadas em tempo quase real.
  - **NASA EONET**: Rastreamento de eventos severos (tempestades, vulcões, secas).
  - **Fluxos de Ventos e Lixo Marítimo**: Visualização de correntes oceânicas e microplásticos.
- **Telemetria de Tráfego Global e Órbita**:
  - Rastreamento em tempo real da **Estação Espacial Internacional (ISS)** e satélites artificiais via **CelesTrak (TLE)**.
  - Camada de aeronaves sobrevoando o globo via **OpenSky Network (ADS-B)**.
  - Principais rotas marítimas comerciais via dados agregados de AIS (**Global Fishing Watch**).

---

### Horizonte 4 — Expansão Cósmica
- **Navegação além da Órbita Terrestre**: Zoom contínuo expandindo para a visualização do **Sistema Solar**.
- **Modelagem de Corpos Celestes**: Planetas, luas, asteroides, cometas e meteoros com efemérides de alta precisão do **NASA JPL Horizons API** e **Minor Planet Center (MPC)**.
