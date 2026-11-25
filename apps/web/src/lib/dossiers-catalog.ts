import { entities } from "@/lib/tellus-bridge/catalog";

export interface PublishedDossier {
  slug: string;
  entityId: string;
  title: string;
  introduction: string;
}

export const DOSSIER_INTRODUCTIONS: Readonly<Record<string, string>> = {
  "astronomia-optica":
    "Observar o céu envolve duas escalas. A mecânica celeste descreve o movimento dos corpos e a óptica explica como o instrumento forma a imagem. Compare o efeito da abertura, da difração e das aberrações na leitura de uma observação astronômica.",
  "industria-energia-transporte":
    "A industrialização pode ser estudada pelas cadeias que convertem calor, movimento e eletricidade em trabalho. Relacione os ciclos a vapor à produção industrial e investigue como propulsão, transmissão e controle condicionam as alternativas atuais de transporte.",
  "sistemas-monetarios":
    "Uma decisão monetária afeta o crédito por meio das taxas de juros, dos balanços bancários e das expectativas. Compare esses canais com os mecanismos de uma crise financeira e examine como o prazo dos títulos altera a exposição às taxas.",
  computacao:
    "Da prova de um algoritmo à implantação de um sistema distribuído, o projeto depende de hipóteses sobre recursos e falhas. Compare o custo de operações, o efeito da replicação sobre os dados e o papel da inferência estatística em sistemas de IA.",
  "historia-e-filosofia":
    "Examine conceitos como soberania, emancipação e poder no contexto em que foram formulados. Compare as fontes primárias, o vocabulário de cada época e as interpretações posteriores antes de aproximar tradições filosóficas ou políticas.",
  literaturas:
    "Percorra formas como a epopeia, o romance realista e a poesia urbana em obras de língua portuguesa e francesa. A comparação pode começar pela voz narrativa, pela organização do tempo e pela relação entre oralidade e escrita.",
  idiomas:
    "Compare o registro formal e informal em inglês, o uso de fontes lexicográficas em português e as formas de leitura dos caracteres japoneses. Use exemplos em contexto para identificar falsos cognatos e interferências entre idiomas.",
  "dom-pedro-ii":
    "O Segundo Reinado oferece um recorte para estudar as relações entre a monarquia brasileira, a escravidão e a formação das instituições nacionais. O romance do período permite comparar projetos de identidade nacional e perspectivas narrativas sobre a sociedade imperial.",
  "luis-de-camoes":
    "Em Os Lusíadas, a viagem marítima dá estrutura a uma epopeia que combina memória histórica, tradição clássica e intervenção do narrador. Uma leitura próxima pode começar pela voz de quem narra e pelas mudanças entre registro histórico, mitológico e lírico.",
  "fundamentos-da-matematica":
    "Da lógica elementar e geometria euclidiana à álgebra linear, cálculo multivariável e análise real em espaços métricos, a matemática oferece a gramática estrutural das ciências quantitativas. Relacione construções geométricas clássicas às provas rigorosas de convergência e diferenciabilidade.",
  "mecanica-eletromagnetismo-quantica":
    "A física articula leis de conservação, campos eletromagnéticos, relatividade restrita e mecânica quântica em escalas que vão do núcleo atômico à dinâmica orbital. Compare o papel da simetria e dos princípios variacionais na formulação de modelos experimentais.",
  "mercados-financas-corporativas":
    "Demonstrações contábeis, custo de capital, precificação por não-arbitragem e gestão de carteiras conectam decisões corporativas ao risco sistêmico dos mercados globais. Examine como padrões contábeis (IFRS e US GAAP), derivativos e convexidade moldam a estabilidade financeira.",
  "isaac-newton":
    "Nos Principia e na Óptica, Isaac Newton unificou a mecânica terrestre e a gravitação celeste por meio do cálculo diferencial e integral. Investigue como as leis do movimento e as equações diferenciais ordinárias transformaram a previsão astronômica e a engenharia moderna.",
  "albert-einstein":
    "Dos artigos de 1905 sobre o efeito fotoelétrico e a relatividade especial à formulação da gravitação relativística, Albert Einstein redefiniu espaço, tempo, energia e radiação. Compare os postulados de invariância com os fundamentos experimentais da física quântica e nuclear.",
  "milton-santos":
    "Geógrafo brasileiro laureado com o Prêmio Vautrin Lud (1994), Milton Santos (1926–2001) construiu uma teoria crítica do espaço geográfico centrada no território usado, no meio técnico-científico-informacional, nas verticalidades e horizontalidades e na regionalização dos Quatro Brasis.",
};

export function getPublishedDossier(slug: string): PublishedDossier | null {
  if (!Object.hasOwn(DOSSIER_INTRODUCTIONS, slug)) return null;
  const link = entities.get(`dossier:${slug}`) ?? entities.get(`figure:${slug}`);
  if (!link) return null;
  return {
    slug,
    entityId: link.entityId,
    title: link.title,
    introduction: DOSSIER_INTRODUCTIONS[slug],
  };
}

export function getPublishedDossierSlugs(): string[] {
  return Object.keys(DOSSIER_INTRODUCTIONS).filter((slug) => getPublishedDossier(slug) !== null);
}
