/**
 * Catálogo das eras geológicas e das placas tectônicas da Pangeia (T36). `paleo-data.ts` re-exporta
 * este arquivo. Fontes: ver o cabeçalho de `paleo-data.ts`.
 */
export type PaleoEraId =
  | "pangaea-250ma"
  | "breakup-200ma"
  | "gondwana-150ma"
  | "cretaceous-66ma"
  | "PANGEA_250MA"
  | "BREAKUP_200MA"
  | "GONDWANA_150MA"
  | "KPG_66MA";

export type GeologicalEraCode =
  | "PANGEA_250MA"
  | "BREAKUP_200MA"
  | "GONDWANA_150MA"
  | "KPG_66MA";

export interface PaleoIndicator {
  name: string;
  value: string;
  unit?: string;
  sourcePrimary: string;
}

export interface PaleoCitation {
  authors: string;
  title: string;
  publication: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface TectonicPlateDefinition {
  id: string;
  name: string;
  movementRateMmPerYear: number;
  type: "continental" | "oceanic" | "rifting" | "suture";
  description: string;
  coordinatesApprox?: [number, number][];
}

export interface PaleoEraDefinition {
  id: "PANGEA_250MA" | "BREAKUP_200MA" | "GONDWANA_150MA" | "KPG_66MA" | string;
  eraId: "pangaea-250ma" | "breakup-200ma" | "gondwana-150ma" | "cretaceous-66ma" | string;
  code: GeologicalEraCode;
  name: string;
  period: "PERMIAN_TRIASSIC" | "TRIASSIC_JURASSIC" | "JURASSIC" | "CRETACEOUS";
  periodLabel: string;
  ageMa: number;
  minMa: number;
  maxMa: number;
  description: string;
  landmassAreaKm2: number;
  oceanName: string;
  climate: string;
  dominantLife: string;
  co2PpmEstimate: number;
  averageGlobalTempC: number;
  seaLevelDiffMeters: number;
  textureUrl: string;
  platesDataUrl: string;
  badgeLabel: string;
  events: string[];
  indicators: PaleoIndicator[];
  citations: PaleoCitation[];
  dossierMarkdown: string;
}

// Backward-compatible alias for plan document
export type GeologicalEra = PaleoEraDefinition;

export const PANGEA_DEFINITION: PaleoEraDefinition = {
  id: "PANGEA_250MA",
  eraId: "pangaea-250ma",
  code: "PANGEA_250MA",
  name: "Pangeia — Supercontinente Permo-Triássico",
  period: "PERMIAN_TRIASSIC",
  periodLabel: "Permiano Tardio ao Triássico Inicial (~252 – 247 Ma)",
  ageMa: 250,
  minMa: 225,
  maxMa: 300,
  description:
    "A conformação unificada de quase todas as massas terrestres emersas do planeta em um único supercontinente contíguo em forma de 'C', estendendo-se do polo norte ao polo sul, circundado pelo vasto superoceano Panthalassa e acolhendo o Mar de Tétis em sua enseada oriental.",
  landmassAreaKm2: 152000000,
  oceanName: "Superoceano Panthalassa e Mar de Tétis",
  climate:
    "Hiperárido nas vastas bacias continentais interiores, sujeito a temperaturas extremas superiores a 45 °C e megamonções sazonais violentas nas bordas do Oceano Tétis.",
  dominantLife:
    "Sinapsídeos therapsídeos (sobrevivência de Lystrosaurus), primeiros ancestrais dos arcossauros, coníferas primitivas e ausência temporária de recifes de corais pós-extinção P-Tr.",
  co2PpmEstimate: 2400,
  averageGlobalTempC: 28.0,
  seaLevelDiffMeters: -30,
  textureUrl: "/textures/paleo/paleo_250ma.webp",
  platesDataUrl: "/data/paleo/pangea-plates-250ma.json",
  badgeLabel: "🌋 Paleogeografia: Pangeia (250 Ma — Permiano/Triássico)",
  events: [
    "Extinção em Massa Permo-Triássica (~251.9 Ma): A maior catástrofe biológica da Terra, eliminando ~95% das espécies marinhas e ~70% dos vertebrados terrestres.",
    "Amálgama continental final ao longo da Orogenia Uraliana e da cadeia central dos Apalaches-Variscos.",
    "Isolamento continental extremo gerando o maior cinturão desértico contínuo da história planetária.",
    "Proliferação ecológica do Lystrosaurus, que chegou a representar mais de 90% dos vertebrados terrestres na base do Triássico.",
  ],
  indicators: [
    {
      name: "Área Continental Contínua",
      value: "152.000.000 km² (~98% das terras emersas)",
      sourcePrimary: "Scotese / PALEOMAP Project (2021)",
    },
    {
      name: "Concentração de CO₂ Atmosférico",
      value: "2.400 ppm (6x superior ao pré-industrial)",
      sourcePrimary: "Foster et al., Nature Communications (2017)",
    },
    {
      name: "Temperatura Média Global",
      value: "28,0 °C (+13,5 °C em relação ao contemporâneo)",
      sourcePrimary: "Scotese et al., Earth-Science Reviews (2021)",
    },
    {
      name: "Superfície do Oceano Panthalassa",
      value: "358.000.000 km² (70% do globo terrestre)",
      sourcePrimary: "GPlates Paleooceanic Model (2022)",
    },
  ],
  citations: [
    {
      authors: "Scotese, C. R.",
      title:
        "An Atlas of Phanerozoic Paleogeographic Maps: The Seas Come In and the Seas Go Out",
      publication: "Annual Review of Earth and Planetary Sciences, 49, 669-718",
      year: 2021,
      doi: "10.1146/annurev-earth-081320-012832",
    },
    {
      authors: "Stampfli, G. M., & Borel, G. D.",
      title:
        "A plate tectonic model for the Paleozoic and Mesozoic constrained by dynamic plate boundaries and restored synthetic oceanic isochrons",
      publication: "Earth and Planetary Science Letters, 196(1-2), 17-33",
      year: 2002,
      doi: "10.1016/S0012-821X(01)00588-X",
    },
    {
      authors: "Erwin, D. H.",
      title: "Extinction: How Life on Earth Nearly Ended 250 Million Years Ago",
      publication: "Princeton University Press",
      year: 2006,
    },
  ],
  dossierMarkdown: `## A Terra há 250 Milhões de Anos: O Supercontinente Pangeia

### 1. Geografia e Geodinâmica Global
Há 250 milhões de anos, na transição crítica entre o período Permiano Superior e o Triássico Inicial, todas as massas continentais terrestres estavam congregadas em uma única superestrutura geológica denominada **Pangeia** (*do grego: Toda a Terra*).

O supercontinente formava um colossal arco em forma de 'C' centralizado no equador, estendendo-se desde as latitudes polares austrais (região que viria a ser a Antártica e Austrália) até as calotas boreais (norte da Sibéria). Ao redor da Pangeia estendia-se o **Panthalassa**, um oceano global sem precedentes cobrindo mais de 70% da superfície terrestre, enquanto na sua curvatura leste repousava o **Mar de Tétis**, um golfo tropical quente e raso.

### 2. O Clima da Megahiperaridez
Devido à colossal extensão contínua de terra emersa (mais de 150 milhões de km²), o interior da Pangeia era completamente inacessível para as massas de ar oceânicas úmidas. Isso originou condições de aridez hiperbólica:
- **Flutuações Térmicas Diárias**: Diferenças superiores a 35 °C entre o dia e a noite.
- **Megamonções**: Ventos sazonais tempestuosos de intensidade inigualável no registro geológico moderno, soprando do Tétis em direção ao coração da Pangeia.
- **Ausência de Calotas Polares Permanentes**: O planeta operava em regime de superestufa (*Super-greenhouse*).

### 3. A Grande Mortandade Permo-Triássica
A era de 250 Ma coincide com os ecos imediatos da **Extinção em Massa Permo-Triássica (P-Tr)**, provocada pelas erupções catastróficas dos Trapps Siberianos. Mais de 90% da biodiversidade planetária pereceu sob chuvas ácidas sulfúricas, anóxia oceânica e aquecimento descontrolado. No vácuo ecológico que se seguiu, o sinapsídeo *Lystrosaurus* sobreviveu e proliferou de forma avassaladora, pavimentando o caminho para a posterior ascensão dos arcossauros e dos primeiros dinossauros.`,
};

export const BREAKUP_DEFINITION: PaleoEraDefinition = {
  id: "BREAKUP_200MA",
  eraId: "breakup-200ma",
  code: "BREAKUP_200MA",
  name: "Fragmentação da Pangeia — Abertura do Atlântico Central",
  period: "TRIASSIC_JURASSIC",
  periodLabel: "Limite Triássico-Jurássico (~201.3 Ma)",
  ageMa: 200,
  minMa: 175,
  maxMa: 225,
  description:
    "O início da desagregação do supercontinente impulsionado pela gigantesca Província Magmática do Atlântico Central (CAMP), fraturando a união entre a América do Norte e o noroeste da África e dando origem às primeiras bacias oceânicas do proto-Atlântico.",
  landmassAreaKm2: 149000000,
  oceanName: "Proto-Atlântico Central, Panthalassa e Mar de Tétis",
  climate:
    "Hiperaquecimento global súbito induzido pela emissão maciça de CO₂ e SO₂ magmáticos basálticos, seguido de episódios de chuva ácida e acidificação dos oceanos superficiais.",
  dominantLife:
    "Eliminação dos arcossauros não-dinos e grandes sinapsídeos basais; radiação explosiva dos primeiros dinossauros jurássicos, pterossauros basais e primeiras linhagens de mamíferos verdadeiros.",
  co2PpmEstimate: 2000,
  averageGlobalTempC: 24.5,
  seaLevelDiffMeters: 15,
  textureUrl: "/textures/paleo/paleo_200ma.webp",
  platesDataUrl: "/data/paleo/pangea-plates-250ma.json",
  badgeLabel: "🌋 Paleogeografia: Fragmentação (200 Ma — Triássico/Jurássico)",
  events: [
    "Extinção em Massa Triássico-Jurássica (~201.3 Ma): Colapso ecológico que extinguiu cerca de 76% das espécies e eliminou a concorrência dos répteis crurotarsos.",
    "Ativação da CAMP (Central Atlantic Magmatic Province): Erupção de mais de 2 milhões de km³ de basalto cobrindo 11 milhões de km².",
    "Formação dos primeiros vales de rift continentais entre a Euramérica e o Gondwana.",
    "Início da hegemonia terrestre dos dinossauros no início do período Jurássico.",
  ],
  indicators: [
    {
      name: "Área da Província Magmática (CAMP)",
      value: "11.000.000 km² de derrames de basalto",
      sourcePrimary: "Marzoli et al., Science (1999)",
    },
    {
      name: "Concentração de CO₂ Atmosférico",
      value: "2.000 ppm",
      sourcePrimary: "Blackburn et al., Science (2013)",
    },
    {
      name: "Extinção de Famílias Marinhas",
      value: "34% de todas as famílias eliminadas",
      sourcePrimary: "Sepkoski Phanerozoic Compendium (2002)",
    },
    {
      name: "Nível Relativo do Mar",
      value: "+15 m em relação à Pangeia unificada",
      sourcePrimary: "Haq et al., Science (1987)",
    },
  ],
  citations: [
    {
      authors: "Marzoli, A., et al.",
      title:
        "Extensive 200-million-year-old continental flood basalts of the Central Atlantic Magmatic Province",
      publication: "Science, 284(5414), 616-618",
      year: 1999,
      doi: "10.1126/science.284.5414.616",
    },
    {
      authors: "Blackburn, T. J., et al.",
      title:
        "Zircon U-Pb geochronology links the end-Triassic extinction with the Central Atlantic Magmatic Province",
      publication: "Science, 340(6135), 941-945",
      year: 2013,
      doi: "10.1126/science.1234204",
    },
  ],
  dossierMarkdown: `## A Terra há 200 Milhões de Anos: A Fragmentação da Pangeia

### 1. O Rifting Continental e a Província CAMP
Há 200 milhões de anos, as forças de convecção do manto terrestre culminaram no acúmulo de calor sob a gigantesca placa continental da Pangeia. Essa pluma mantélica desencadeou o vulcanismo da **Província Magmática do Atlântico Central (CAMP)** — um dos maiores eventos vulcânicos continentais de todos os tempos.

A crosta terrestre começou a se romper ao longo de uma fratura colateral de milhares de quilômetros, separando a América do Norte do noroeste africano e iniciando a abertura do proto-Atlântico Central.

### 2. A Extinção do Fim do Triássico
As erupções basálticas liberaram quantidades descomunais de dióxido de carbono e dióxido de enxofre na atmosfera em pulsos curtos de dezenas de milhares de anos. A rápida oscilação entre invernos vulcânicos e subsequente superaquecimento estufa devastou ecossistemas terrestres e marinhos:
- Colapso dos répteis predadores crurotarsos e dos fitossauros.
- Eliminação definitiva dos conodontes marinhos.
- Liberação integral de nichos para os primeiros dinossauros carnívoros e herbívoros velozes.`,
};

export const GONDWANA_DEFINITION: PaleoEraDefinition = {
  id: "GONDWANA_150MA",
  eraId: "gondwana-150ma",
  code: "GONDWANA_150MA",
  name: "Gondwana & Laurásia — Jurássico Tardio",
  period: "JURASSIC",
  periodLabel: "Jurássico Superior (Kimmeridgiano - Titoniano, ~152 – 145 Ma)",
  ageMa: 150,
  minMa: 100,
  maxMa: 175,
  description:
    "A divisão definitiva do mundo em dois supercontinentes hemisféricos: Laurásia ao norte (América do Norte e Eurásia) e Gondwana ao sul (América do Sul, África, Antártica, Austrália e Índia), separados pela passagem circum-equatorial do Mar de Tétis.",
  landmassAreaKm2: 144000000,
  oceanName: "Mar de Tétis, Atlântico Central incipiente e Paleopacífico",
  climate:
    "Clima globalmente úmido e quente sem calotas polares; florestas temperadas e subtropicais estendendo-se até além do paralelo 70°; transgressões marinhas inundando as bacias continentais europeias e norte-americanas.",
  dominantLife:
    "Apogeu do gigantismo dos saurópodes (Brachiosaurus, Diplodocus), predadores carnívoros terópodes (Allosaurus), primeiros pássaros primitivos (Archaeopteryx) e vastas florestas de coníferas e cicadáceas.",
  co2PpmEstimate: 1600,
  averageGlobalTempC: 22.0,
  seaLevelDiffMeters: 60,
  textureUrl: "/textures/paleo/paleo_150ma.webp",
  platesDataUrl: "/data/paleo/pangea-plates-250ma.json",
  badgeLabel: "🌋 Paleogeografia: Gondwana & Laurásia (150 Ma — Jurássico)",
  events: [
    "Separação física completa entre a Laurásia e o supercontinente austral Gondwana.",
    "Circulação oceânica circum-equatorial através do canal de Tétis regulando as correntes marítimas do planeta.",
    "Deposição dos folhelhos betuminosos ricos em matéria orgânica que deram origem a grandes reservatórios petrolíferos contemporâneos.",
    "Transgressão marinha que transformou a Europa em um arquipélago tropical de ilhas e recifes de corais jurássicos.",
  ],
  indicators: [
    {
      name: "Nível Médio Global dos Oceanos",
      value: "+60 m acima do nível contemporâneo",
      sourcePrimary: "Miller et al., Science (2005)",
    },
    {
      name: "Área Terrestre de Gondwana",
      value: "79.000.000 km²",
      sourcePrimary: "GPlates Continental Reconstruction (2016)",
    },
    {
      name: "Área Terrestre de Laurásia",
      value: "65.000.000 km²",
      sourcePrimary: "GPlates Continental Reconstruction (2016)",
    },
    {
      name: "Concentração de CO₂ Atmosférico",
      value: "1.600 ppm (4x o nível pré-industrial)",
      sourcePrimary: "Berner GEOCARB III (2004)",
    },
  ],
  citations: [
    {
      authors: "Seton, M., et al.",
      title: "Global continental and ocean basin reconstructions since 200 Ma",
      publication: "Earth-Science Reviews, 113(3-4), 212-270",
      year: 2012,
      doi: "10.1016/j.earscirev.2012.03.002",
    },
    {
      authors: "Müller, R. D., et al.",
      title:
        "Ocean basin evolution and global-scale plate reorganization events since Pangea breakup",
      publication: "Annual Review of Earth and Planetary Sciences, 44, 107-138",
      year: 2016,
      doi: "10.1146/annurev-earth-060115-012211",
    },
  ],
  dossierMarkdown: `## A Terra há 150 Milhões de Anos: O Apogeu do Jurássico

### 1. A Bipolaridade Laurásia-Gondwana
No final do Jurássico, a Pangeia deixara de existir como entidade contígua. A abertura contínua do Atlântico Central conectou o Mar de Tétis ao Paleopacífico, criando uma via marítima equatorial que transportava águas tropicais mornas ao redor do globo.

A **Laurásia** reunia o escudo canadense, a Groenlândia e grandes blocos da Eurásia, enquanto o **Gondwana** mantinha ainda unidos a América do Sul e a África, além do imenso bloco oriental (Índia, Madagascar, Antártica e Austrália).

### 2. O Mundo Estufa e a Fauna Gigante
Sem gelo permanente nos polos e com mares interiores rasos e aquecidos (*Epicontinental Seas*), os gradientes térmicos eram extraordinariamente suaves entre o equador e as altas latitudes.
- **Bioma de Savana e Floresta Aberta**: Abundância de samambaias arbóreas, araucárias e ginkgofitas.
- **Saurópodes Gigantescos**: Adaptações corporais extremas para digestão de vegetação fibrosa de dossel elevado (*Diplodocus*, *Brachiosaurus*, *Apatosaurus*).
- **A Gênese do Petróleo Moderno**: A sedimentação contínua de fitoplâncton em bacias anóxicas do Tétis e Atlântico incipiente formou os maiores campos petrolíferos do Golfo do México e Oriente Médio.`,
};

export const KPG_DEFINITION: PaleoEraDefinition = {
  id: "KPG_66MA",
  eraId: "cretaceous-66ma",
  code: "KPG_66MA",
  name: "Cretáceo Tardio — Extinção K-Pg & Impacto de Chicxulub",
  period: "CRETACEOUS",
  periodLabel: "Maastrichtiano Terminal (~66.0 Ma)",
  ageMa: 66,
  minMa: 0.3,
  maxMa: 100,
  description:
    "A configuração paleogeográfica do encerramento da Era Mesozoica: o Atlântico Sul e Norte em estágio avançado de abertura, a Índia navegando isolada no Oceano Índico e o impacto devastador do bólido de Chicxulub na Península de Iucatã.",
  landmassAreaKm2: 141000000,
  oceanName: "Oceano Atlântico Expandido, Mar de Tétis Remanescente e Proto-Índico",
  climate:
    "Regime de superestufa inicial com oceanos de nível elevado (+120 m), subitamente colapsado pelo inverno nuclear/de impacto induzido pelo asteroide e vulcanismo das Trapps de Deccan.",
  dominantLife:
    "Tiranossaurídeos e ceratopsianos na América do Norte, titanossauros na América do Sul, mosassauros e plesiossauros nos oceanos; seguido pela extinção em massa de 75% das espécies e radiação dos mamíferos.",
  co2PpmEstimate: 1200,
  averageGlobalTempC: 20.0,
  seaLevelDiffMeters: 120,
  textureUrl: "/textures/paleo/paleo_66ma.webp",
  platesDataUrl: "/data/paleo/pangea-plates-250ma.json",
  badgeLabel: "☄️ Paleogeografia: Cretáceo K-Pg (66 Ma — Extinção em Massa)",
  events: [
    "Impacto do Asteroide de Chicxulub (~66.04 Ma): liberação energética de ~10²⁴ Joules gerando megatsunamis, incêndios florestais globais e escuridão prolongada.",
    "Erupções das Trapps de Deccan (Índia): mais de 1 milhão de km³ de lavas basálticas acidificando e desestabilizando o clima cretácico.",
    "Extinção em Massa K-Pg: eliminação integral dos dinossauros não-avianos, pterossauros, amonites e répteis marinhos gigantes.",
    "Deriva acelerada da Placa Indiana a mais de 18 cm/ano em rota de colisão contra o sul da Eurásia.",
  ],
  indicators: [
    {
      name: "Energia do Bólido de Chicxulub",
      value: "4,2 × 10²³ Joules (~100 milhões de megatons de TNT)",
      sourcePrimary: "Schulte et al., Science (2010)",
    },
    {
      name: "Nível Médio dos Oceanos",
      value: "+120 m acima do presente (ápice da via marítima interior)",
      sourcePrimary: "Miller et al., Science (2005)",
    },
    {
      name: "Taxa de Extinção de Espécies Globais",
      value: "76% de todas as espécies do planeta extintas",
      sourcePrimary: "Alvarez et al., Science (1980)",
    },
    {
      name: "Velocidade de Deriva da Placa Indiana",
      value: "18 a 20 cm por ano",
      sourcePrimary: "Patriat & Achache, Nature (1984)",
    },
  ],
  citations: [
    {
      authors: "Alvarez, L. W., Alvarez, W., Asaro, F., & Michel, H. V.",
      title: "Extraterrestrial cause for the Cretaceous-Tertiary extinction",
      publication: "Science, 208(4448), 1095-1108",
      year: 1980,
      doi: "10.1126/science.208.4448.1095",
    },
    {
      authors: "Schulte, P., et al.",
      title:
        "The Chicxulub asteroid impact and mass extinction at the Cretaceous-Paleogene boundary",
      publication: "Science, 327(5970), 1214-1218",
      year: 2010,
      doi: "10.1126/science.1177265",
    },
  ],
  dossierMarkdown: `## A Terra há 66 Milhões de Anos: O Fim dos Dinossauros

### 1. A Quase-Conformação dos Continentes
Há 66 milhões de anos, a paleogeografia começava a se assemelhar aos contornos do mapa moderno, embora com diferenças dramáticas:
- **América do Sul e África**: O Oceano Atlântico Sul já media centenas de quilômetros de largura, separando irreversivelmente as duas massas continentais.
- **Via Marítima Interior Ocidental**: Um mar interior raso cortava a América do Norte do Golfo do México ao Ártico, dividindo o continente em Laramidia e Appalachia.
- **A Índia Insular**: A Placa Indiana comportava-se como um continente-ilha ultra-rápido, movendo-se a velocidades tectônicas récordes através do Oceano Índico.

### 2. O Evento de Extinção K-Pg
No final do andar Maastrichtiano, um asteroide condrito carbonáceo com cerca de 10 a 14 quilômetros de diâmetro colidiu com a crosta carbonática rasa de Chicxulub, na Península de Iucatã.
- **Chuva de Ejecta e Incêndios Globais**: Partículas incandescentes reentraram na atmosfera, aquecendo a superfície a centenas de graus Celsius e incendiando florestas em escala planetária.
- **Inverno de Impacto**: Poeira e sulfatos em suspensão bloquearam a luz solar por anos, cessando a fotossíntese vegetal e marinha.
- **A Ascensão dos Mamíferos**: O desaparecimento dos dinossauros abriu caminho para a radiação dos mamíferos placentários sobreviventes, que herdaram os continentes no Cenozóico.`,
};

export const PALEO_ERAS: Record<string, PaleoEraDefinition> = {
  "pangaea-250ma": PANGEA_DEFINITION,
  "pangea-250ma": PANGEA_DEFINITION,
  "breakup-200ma": BREAKUP_DEFINITION,
  "gondwana-150ma": GONDWANA_DEFINITION,
  "cretaceous-66ma": KPG_DEFINITION,
  "kpg-66ma": KPG_DEFINITION,
  PANGEA_250MA: PANGEA_DEFINITION,
  PANGAEA_250MA: PANGEA_DEFINITION,
  BREAKUP_200MA: BREAKUP_DEFINITION,
  GONDWANA_150MA: GONDWANA_DEFINITION,
  KPG_66MA: KPG_DEFINITION,
  CRETACEOUS_66MA: KPG_DEFINITION,
};

export const GEOLOGICAL_ERAS: Record<string, PaleoEraDefinition> = PALEO_ERAS;

/**
 * Placas Tectônicas e Fraturas Continentais da Pangeia (~250 Ma)
 */
export const PANGAEA_TECTONIC_PLATES: TectonicPlateDefinition[] = [
  {
    id: "gondwana-shield",
    name: "Cráton Principal do Gondwana",
    movementRateMmPerYear: 25,
    type: "continental",
    description:
      "A porção meridional da Pangeia unindo a América do Sul, África, Península Arábica, Índia, Madagascar, Antártica e Austrália.",
  },
  {
    id: "laurasia-core",
    name: "Escudo Laurentiano-Báltico",
    movementRateMmPerYear: 20,
    type: "continental",
    description:
      "A porção setentrional da Pangeia consolidada pela fusão da América do Norte, Groenlândia e Báltica.",
  },
  {
    id: "siberian-craton",
    name: "Cráton Siberiano & Cazaquistânia",
    movementRateMmPerYear: 18,
    type: "continental",
    description:
      "Massa continental oriental fundida à Báltica através da orogenia dos Montes Urais no final do Carbonífero e Permiano.",
  },
  {
    id: "panthalassa-oceanic",
    name: "Litosfera Oceânica de Panthalassa",
    movementRateMmPerYear: 85,
    type: "oceanic",
    description:
      "Placas oceânicas primordiais do superoceano que cobria mais de dois terços da Terra, subduzindo sob as bordas ativas da Pangeia.",
  },
  {
    id: "central-atlantic-rift-zone",
    name: "Zona de Rifteamento do Atlântico Central",
    movementRateMmPerYear: 15,
    type: "rifting",
    description:
      "Fratura crustal precursora da Província Magmática CAMP, onde viria a romper a junção entre a costa leste americana e o noroeste africano.",
  },
  {
    id: "ural-suture",
    name: "Sutura Orogênica dos Urais",
    movementRateMmPerYear: 5,
    type: "suture",
    description:
      "Linha de colisão continental paleozóica entre a Europa e a Sibéria, formando a cadeia contínua de montanhas dos Urais.",
  },
  {
    id: "central-pangean-mountain-belt",
    name: "Cinturão Orogênico Central da Pangeia",
    movementRateMmPerYear: 8,
    type: "suture",
    description:
      "Cadeia montanhosa de porte himalaico (Apalaches Centrais e Orogenia Varisca) que cortava a Pangeia de leste a oeste ao longo do equador.",
  },
];
